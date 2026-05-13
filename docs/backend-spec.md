---
status: Draft for review
date: 2026-05-12
project_branch: e2e-candidate-experience
design_branch: atilondiya/candidate-prep-adaptive-design
supersedes: extends — does not replace — the E2E Candidate Prep Design Spec (Confluence page 3882516685)
---

# Candidate Prep — Adaptive Voice Mock + Personalized Study Plan

## 1. Context

This design is an **extension** of the E2E Candidate Prep Design Spec (Confluence 3882516685). That spec ships a candidate-facing headless API surface (`/v2/candidate-prep/*`) on top of Eightfold's existing engines: matching graph, AI Interview voice pipeline (LiveKit + Agent v2 + ElevenLabs), `ScoreInterview`, PCS models. Zero new DB tables. Demo target 2026-05-14.

The original spec's mock interview is a **scripted 3-question voice mock**: the LLM generates 3 system-design questions at session start, the agent reads them in order, the call ends, transcript is segmented by markers and scored per question, a summary is returned.

This design upgrades that mock along two product axes (depth and personalization) without changing the headless contract or the persistence model:

- **In-call adaptivity (A + D merged)** — agent reacts to what the candidate said. Instead of reading 3 scripted questions, it asks a root question and then follow-ups whose content depends on the candidate's actual answer. Real-time, voice-only, no chat surface anywhere.
- **Personalized post-call output (B + C merged)** — instead of a generic paragraph, the candidate gets a study plan with personalized exemplars grounded in their resume, a one-line gap diagnosis per weak rubric dimension, a retry prompt, and curated study resources.

Everything else from the original spec — auth, tenant isolation, encoded IDs, `init_call()` flow, `ScoreInterview` integration, persistence into `interview_session` + `call_session` + `profile_feedback` + S3, queue allowlist hygiene, ICS, stage tracker, gap analysis, readiness — is **inherited unchanged**. This document only describes the deltas.

## 2. Goals and non-goals

### 2.1 Goals
- Real-time adaptive voice mock interview where the agent's follow-up questions are chosen based on the candidate's current answer.
- Personalized post-call output (exemplar, diagnosis, retry prompt, resources) grounded in resume + JD + transcript + scoring output.
- Graceful degradation: if the agent runtime cannot support real-time orchestration, fall back automatically to a scripted-but-branched mock with no candidate-visible failure.
- Zero new DB tables. All state maps onto existing models per original spec.
- Customer-facing v2 API contract is unchanged (no new candidate-facing endpoints).

### 2.2 Non-goals (inherited from original spec + extensions)
- Mock format variety beyond system design.
- Real PCS candidate session auth wiring (demo-mode token reused).
- Multi-attempt benchmarking, trend charts, withdraw flows.
- Real CMS for static prep content or study resources (hardcoded for hackathon).
- Frontend / UI design (covered separately).

## 3. Scope delta vs. original spec

| Layer | Original spec | This design adds |
|---|---|---|
| Question generation | One LLM call → flat list of 3 questions | One LLM call → **question tree**: 3 root questions × 2–3 pre-generated follow-up branches per root |
| In-call behavior | Agent reads Q1 → Q2 → Q3 sequentially | Agent reads root Q → emits per-turn webhook → backend classifies the answer, picks branch, returns next question → agent reads it. Loop until topic exhausted or turn budget hit, then advance root |
| Scoring | One `ScoreInterview` call per question slice | Same scoring; multi-turn answers under one root are concatenated into a single "answer on topic N" slice and scored as one unit |
| Post-call summary | Per-question rubric + strength/improvement/exemplar paragraphs | Adds `studyPlan` block: personalized exemplar grounded in resume, one-line diagnosis, retry prompt, hardcoded resource links — produced by one extra LLM call after scoring |
| Persistence | `interview_session.data_json.additional_input` holds 3 questions | Same field holds full tree + `cursor` tracking position. Cursor hot-copy in Redis during call, written back to DB at end-of-call |
| New endpoints | (none beyond original 9) | One internal webhook: `POST /internal/candidate-prep/turn-hook` (agent → backend, never exposed to customer) |
| Customer-facing v2 contract | 9 endpoints | Same 9 endpoints. Response shapes of `/mock/start`, `/mock/status`, `/mock/summary` extended in additive-only ways |

### 3.1 Explicit hackathon shortcuts
1. **Hardcoded study-plan resources** — static Python dict keyed by rubric dimension name. No CMS.
2. **Fixed branch arity** — always 2 pre-generated follow-ups per root (one for "shallow" path, one for "depth-needed" path). No dynamic tree depth.
3. **Hard turn budget** — 9 turns total per mock (3 roots × 3 turns each), enforced server-side. Hard cap independent of classifier output.
4. **Topic categories hardcoded** — three fixed rubric dimensions for system design v1 (Scaling, Consistency, Failure modes). LLM fills the questions within these categories, not the categories themselves.

## 4. Architecture overview

```
┌──────────────────────────┐                    ┌────────────────────────────┐
│ Interview Agent v2       │                    │ Headless backend           │
│ (in LiveKit room)        │                    │ (api_server, /internal/*)  │
│                          │                    │                            │
│ - Reads current question │                    │ - Owns question tree       │
│ - Listens for answer     │                    │ - Owns cursor              │
│ - Detects answer-complete│  per-turn webhook  │ - Haiku classifier         │
│   (VAD silence + EOU)    │ ─────────────────▶ │ - Picks branch             │
│ - Emits per-turn markers │                    │ - Returns next Q in resp.  │
│ - Reads next question    │ ◀───────────────── │                            │
│   from webhook response  │   next question    │                            │
└──────────────────────────┘                    └────────────────────────────┘
            │                                              │
            │ boot data read once                          │ writes cursor every turn
            │                                              ▼
            └──────────  interview_session.data_json  ─────┘
                         { tree, cursor, policy, status }
                         (Redis hot copy: mock:cursor:<call_session_id>)
```

### 4.1 Actors

| Actor | Role | Auth |
|---|---|---|
| Candidate's browser / customer UI | Calls `/v2/candidate-prep/*` to start mock and poll status. Joins LiveKit room with returned creds. | PCS session (demo-mode token for hackathon) |
| Interview Agent v2 | Joins LiveKit room as agent participant. Reads questions via ElevenLabs TTS. Listens for answers via STT. Fires `/internal/candidate-prep/turn-hook` between turns. | Shared-secret header (server-to-server) |
| Headless backend | Owns tree + cursor + classifier. Orchestrates between candidate and agent. | n/a (provides both auth surfaces) |
| Eightfold internals | Matching graph (gap analysis), `LiveKitWebInterviewService.init_call()`, `ScoreInterview`, transcript S3, `profile_feedback` | Internal — reused as-is per original spec |

### 4.2 Voice is the only modality

Everything is real-time voice inside the LiveKit room. No chat surface, no text input from the candidate, no UI prompts mid-call. The candidate hears one continuous voice conversation; classifier and webhook are invisible.

## 5. Real-time orchestration mechanism

### 5.1 Interaction loop (one root question)

1. **Session start** (`POST /v2/candidate-prep/mock/start`)
   - Compute / fetch gap analysis from matching graph.
   - One LLM call (Sonnet) generates the full **question tree**: 3 root questions + 2 pre-generated follow-ups per root, structured per §6.
   - Persist tree to `interview_session.data_json.additional_input.tree`.
   - Initialize cursor `{root_idx: 0, turn_idx: 0, current_node_id: "r0", history: []}` and write to Redis (`mock:cursor:<call_session_id>`, TTL 1h).
   - Boot agent with explicit instructions: read `tree[cursor.current_node_id].text`; on answer-complete, POST to `/internal/candidate-prep/turn-hook` with `{callSessionId, currentNodeId, turnIdx, partialTranscript}`; use the response's `nextQuestionText` as the next utterance; if `end: true`, emit `[INTERVIEW_END]` and end the call.
   - Call `LiveKitWebInterviewService.init_call()`, return `{callSessionId, roomName, token, serverUrl}` to candidate.

2. **Mid-call turn** (agent fires `POST /internal/candidate-prep/turn-hook`)
   - Load tree from `interview_session.data_json`, cursor from Redis.
   - Idempotency check: if `(currentNodeId, turnIdx)` already has a stored decision in `cursor.history`, return that decision unchanged.
   - Run Haiku classifier with `(node, partial_transcript, available_branch_labels)` → returns one label from a constrained vocabulary.
   - Resolve next node: `next_node_id = node.branches[label]`. If `null`, advance `root_idx`. If `root_idx >= 3`, return `end: true`.
   - Apply turn budget: if turns under this root exceed `policy.max_turns_per_root`, force-advance regardless of label.
   - Atomically update cursor in Redis. Append `(node_id, label, ts)` to `cursor.history`.
   - Return `{nextNodeId, nextQuestionText, end: false}`.

3. **Marker discipline** — agent emits `[SYSTEM_DESIGN_Q<root_idx>_TURN<turn_idx>_START/END]` around every utterance. This is **a refinement** of the original spec's `[SYSTEM_DESIGN_QN_START/END]` markers: more granular (per-turn rather than per-question) so the post-call segmenter can identify each turn within a root. Post-call scoring concatenates all turns under one root into a single "answer on topic N" slice and runs `ScoreInterview` once per root. Follow-ups don't get separate rubric scores; they are context for the root's score.

4. **Session end** — existing `/api/voice_agent/livekit-postcall-hook` fires. We register a new handler/subscriber on this hook to trigger scoring + enrichment (§7).

### 5.2 Latency budget (per turn)

| Step | Budget | Notes |
|---|---|---|
| VAD silence + EOU detection | 1.0–1.5s | Existing Agent v2 setting |
| Webhook round-trip to backend | ~50ms | Local; <100ms in prod |
| Cursor load from Redis | ~5ms | Hot cache |
| Haiku classifier call | 400–700ms | Short input, constrained output |
| Webhook response → agent | ~50ms | |
| ElevenLabs TTS first audio byte | 200–400ms | Streaming start |
| **Total perceived gap** | **~1.7–2.6s** | Reads as natural interviewer pacing |

### 5.3 Idempotency contract on the turn-hook

LiveKit and agent webhook retries are a real failure mode. The hook is keyed by `(callSessionId, currentNodeId, turnIdx)`:

- First call: classify, decide, persist decision in `cursor.history` + Redis, return next node.
- Retry with same key: skip classifier; return previously persisted decision verbatim.
- Out-of-order retry (`turnIdx + 1` arrives before `turnIdx` resolves): `409 Conflict`; agent retry policy handles it.

This eliminates "same question read twice" and "diverging cursor" failure modes.

### 5.4 Classifier-failure handling

A voice call cannot tolerate hard errors mid-conversation. If the classifier call fails or exceeds a 1500ms timeout:

- Pick a default branch deterministically: on a **root node**, use label `solid_needs_depth` (the depth-probe branch — most informative default); on a **followup node**, use the node's first non-null branch. If every branch on the node is `null`, advance `root_idx` (topic ends).
- Log + emit metric. Do not return an error to the agent.
- Candidate hears a plausible next question, unaware anything went wrong.

If the cursor is missing from Redis (rare; expired or evicted), rehydrate from `interview_session.data_json.cursor`. If neither exists, end the call gracefully with the agent's closing utterance and let post-call scoring run on whatever transcript exists.

## 6. Question tree + cursor data model

Tree generated at session start. Lives in `interview_session.data_json.additional_input`. Immutable after creation.

### 6.1 Tree shape

```json
{
  "tree": {
    "r0": {
      "type": "root",
      "topic": "Scaling tradeoffs",
      "text": "Design a URL shortener that handles 10K writes/sec and 100K reads/sec...",
      "rubric_dimensions": ["Identifies scaling tradeoffs", "Defines clear data model"],
      "branches": {
        "shallow":           "r0_b_shallow",
        "solid_needs_depth": "r0_b_depth",
        "strong_move_on":    null
      }
    },
    "r0_b_shallow": {
      "type": "followup",
      "parent": "r0",
      "intent": "Pull them out of hand-waving; ask for one concrete number.",
      "text": "...",
      "branches": {
        "improved":      "r0_b_depth",
        "still_shallow": null,
        "strong_move_on": null
      }
    },
    "r0_b_depth": { "type": "followup", "parent": "r0", "intent": "...", "text": "...", "branches": {...} },
    "r1": { "type": "root", ... },
    "r1_b_shallow": {...},
    "r1_b_depth": {...},
    "r2": { "type": "root", ... },
    "r2_b_shallow": {...},
    "r2_b_depth": {...}
  },
  "policy": {
    "max_turns_per_root": 3,
    "max_total_turns": 9,
    "vad_silence_ms": 1500
  }
}
```

### 6.2 Constrained classifier vocabulary

The classifier may emit only labels from a fixed vocabulary across all nodes:

| Label | Meaning |
|---|---|
| `shallow` | Missed core concept, hand-waved, generic answer |
| `solid_needs_depth` | Covered basics, missed tradeoffs |
| `strong_move_on` | Concept + tradeoff + concrete numbers |
| `improved` (followup only) | Recovered from a shallow first pass |
| `still_shallow` (followup only) | Did not recover |
| `solid` (followup only) | Adequately addressed the probe |

Each node's `branches` map declares which labels are valid at that node and where they route. A `null` branch means "topic complete; advance to next root."

### 6.3 Cursor shape

```json
{
  "cursor": {
    "current_node_id": "r0_b_depth",
    "root_idx": 0,
    "turn_idx": 2,
    "history": [
      {"node_id": "r0",         "label": "solid_needs_depth", "ts": "..."},
      {"node_id": "r0_b_shallow", "label": "improved",        "ts": "..."}
    ]
  }
}
```

`history` is consumed post-call to (a) pull correct transcript slices for per-root scoring and (b) tell the enricher which path was taken — e.g., "needed a hint on CAP after a shallow first pass" becomes a real signal in the study plan.

### 6.4 Storage

| State | Location | Lifecycle |
|---|---|---|
| Tree | `interview_session.data_json.additional_input.tree` | Written once at `/mock/start`. Immutable. |
| Cursor (hot) | Redis `mock:cursor:<call_session_id>`, TTL 1h | Updated atomically per turn. Source of truth during call. |
| Cursor (durable) | `interview_session.data_json.cursor` | One DB write at end-of-call (post-call hook). |
| Policy | `interview_session.data_json.additional_input.policy` | Written once. Agent reads at boot. |

### 6.5 Tree generator fallback

If the tree-gen LLM call fails or returns malformed JSON, the system uses a **static 3-question, no-branch tree** (3 roots, all branches `null`). The mock degrades to the original spec's flat behavior; the rest of the pipeline is unaffected. Logged + alerted; never silently silenced.

## 7. Post-call enrichment (B + C)

Runs after the existing `livekit-postcall-hook` fires. Two phases:

### 7.1 Phase A — Existing scoring (per original spec)

- Read cleaned transcript from S3 via `CallSession.get_transcript()`.
- Segment by `[SYSTEM_DESIGN_Q<root_idx>_*]` markers, concatenating all turns under each root.
- Invoke `ScoreInterview` once per root with `candidate_prep_system_design_template`.
- Persist rubric scores to `interview_session.data_json.scoring_features.criteria_scores`.
- Persist per-question feedback to `profile_feedback` (linked via `feedback_id`).

This phase is unchanged from the original spec, except that the slices are multi-turn concatenations instead of single-utterance answers.

### 7.2 Phase B — Enrichment LLM call

Inputs (all already on hand from phase A or session start):

| Input | Source |
|---|---|
| Per-root rubric scores | Just-written `scoring_features.criteria_scores` |
| Transcript with markers | S3 |
| Cursor history (path taken) | `cursor.history` |
| Resume highlights | `profile.skills` + cached snippets |
| JD requirements | `position.skills` |

One Sonnet call produces a structured JSON output:

```json
{
  "per_dimension": [
    {
      "dimension": "Discusses CAP / consistency",
      "rating": "weak",
      "diagnosis": "<1-line gap diagnosis>",
      "personalized_exemplar": "<2-3 sentence model answer framed in candidate's background>",
      "retry_prompt": "<single sharper question to re-attempt after study>"
    }
  ],
  "overall_summary": "<2-sentence coach headline>"
}
```

The prompt instructs Sonnet to produce an entry **only for dimensions rated `weak` or `partial`**. Strong dimensions don't need exemplars — the candidate already nailed them.

### 7.3 Hardcoded resource map

Static Python dict at `www/services/api/candidate_prep_resources.py`, keyed by exact rubric dimension name:

```python
RESOURCES = {
    "Discusses CAP / consistency": [
        {"title": "CAP Theorem in 5 Minutes", "url": "...", "minutes": 5, "type": "video"},
        {"title": "Jepsen: Consistency Models",  "url": "...", "minutes": 20, "type": "read"},
    ],
    # ... per dimension
}
```

Dimensions are stable across the rubric template; keying by dimension name (not topic) is reliable. Code joins LLM output with this map — LLM never generates URLs.

### 7.4 Persistence map

| Output field | Destination |
|---|---|
| `personalized_exemplar` | `profile_feedback` → existing "exemplar" field on per-question entry |
| `diagnosis` | `profile_feedback` → existing "improvement" field on per-question entry |
| `retry_prompt`, `resources`, `retry_available_at`, `overall_summary` | New sub-key `interview_session.data_json.study_plan` — no schema change |

### 7.5 Latency

| Step | Time |
|---|---|
| Phase A (scoring, 3 roots) | 6–9s |
| Phase B (Sonnet enrichment, 1 call) | 4–8s |
| Resource lookup + DB writes | <100ms |
| **Total post-call processing** | **~10–17s** |

Runs async after the call ends. Candidate-side experience is governed by `GET /mock/<id>/status` polling (existing endpoint, see §8): status transitions `in_progress → scoring → completed`.

## 8. API surface

### 8.1 Customer-facing endpoints — `/v2/candidate-prep/*`

All 9 endpoints from the original spec are preserved. Only three have response-shape changes — all additive (new fields, no removed or renamed fields).

| # | Method + Path | Change | Notes |
|---|---|---|---|
| 1 | `GET /applications` | Unchanged | |
| 2 | `GET /applications/<app_enc_id>` | Unchanged | |
| 3 | `GET /stage/<...>/content` | Unchanged | |
| 4 | `GET /gap-analysis` | Unchanged | Output feeds tree generation. |
| 5 | `POST /mock/start` | Internal behavior changed | Same I/O contract. Now generates tree, initializes cursor, sets policy. |
| 6 | `GET /mock/<id>/status` | Additive fields | Adds `status: "scoring"` value; adds optional `currentRootIdx`, `currentTurnIdx`. |
| 7 | `GET /mock/<id>/summary` | Additive field | Adds `studyPlan` block from §7. |
| 8 | `GET /readiness` | Unchanged | |
| 9 | `GET /stage/<...>/calendar.ics` | Unchanged | |

#### 8.1.1 Extended `/mock/summary` response

```json
{
  "questionCount": 3,
  "answeredCount": 3,
  "overallScore": 67,
  "perQuestion": [ /* unchanged from original spec */ ],
  "studyPlan": {
    "headline": "<overall_summary from enricher>",
    "items": [
      {
        "dimension": "Discusses CAP / consistency",
        "rating": "weak",
        "diagnosis": "<diagnosis>",
        "personalizedExemplar": "<personalized_exemplar>",
        "retryPrompt": "<retry_prompt>",
        "resources": [ {"title": "...", "url": "...", "minutes": 5, "type": "video"} ],
        "retryAvailableAt": "<ISO-8601 24h from completion>"
      }
    ]
  },
  "readinessBefore": 42,
  "readinessAfter": 67
}
```

### 8.2 Internal endpoint — `/internal/candidate-prep/turn-hook` (NEW)

Not part of the customer-facing v2 contract. Lives under `/internal/*` namespace. Called only by Agent v2 (server-to-server). Different auth model.

**Request:**
```json
{
  "callSessionId": "encoded_abc...",
  "currentNodeId": "r0",
  "turnIdx": 1,
  "partialTranscript": "...",
  "audioDurationSeconds": 87
}
```

**Response (continue):**
```json
{
  "nextNodeId": "r0_b_depth",
  "nextQuestionText": "...",
  "end": false,
  "policy": {
    "speakImmediately": true,
    "expectAnswerWithinSeconds": 180
  }
}
```

**Response (end):**
```json
{
  "nextNodeId": null,
  "nextQuestionText": "Thanks — that's all the questions I have. We'll wrap here.",
  "end": true
}
```

**Auth:** `X-Internal-Auth: <secret>` header matching env var. Same pattern as existing `/api/voice_agent/livekit-postcall-hook`.

**Error model:**

| Scenario | Status | Behavior |
|---|---|---|
| Classifier failure or timeout (>1500ms) | `200` with default branch (`solid_needs_depth`) | Soft fail. Candidate doesn't notice. |
| Tree missing or corrupt | `500` | Agent ends call with closer. |
| `callSessionId` not found / wrong status | `404` | Should not happen; logged for debugging. |
| Auth fails | `401` | Config bug; not a runtime path. |
| Out-of-order retry | `409 Conflict` | Agent retry policy. |

### 8.3 Hooks (existing, reused)

| Hook | Existing? | Change |
|---|---|---|
| `/api/voice_agent/interview-boot-data` | Existing | Agent reads tree + policy from `data_json.additional_input` natively. No endpoint change. |
| `/api/voice_agent/livekit-postcall-hook` | Existing | Register new handler/subscriber for candidate prep sessions → triggers §7 scoring + enrichment. |

## 9. Persistence delta

Inherits the original spec's "zero new tables" property. Specific additions to existing JSON fields:

| Field | Original spec used | This design also uses |
|---|---|---|
| `interview_session.data_json.additional_input` | `{questions: [...]}` (flat list) | `{tree: {...}, policy: {...}}` (tree + policy) |
| `interview_session.data_json.cursor` | (not used) | Cursor state at end-of-call. Hot copy in Redis during call. |
| `interview_session.data_json.scoring_features.criteria_scores` | Per-question scores | Same — but per-root, scoring concatenated multi-turn slice |
| `interview_session.data_json.study_plan` | (not used) | Retry prompt, resources, retry-available-at, overall summary |
| `profile_feedback` (existing FilledFeedbackForm) | Per-question rubric + paragraphs | Same fields; "exemplar" now personalized; "improvement" now one-line diagnosis |
| `mock:cursor:<call_session_id>` (Redis) | (not used) | Hot cursor during call, TTL 1h |
| Existing S3 transcript path | Raw + cleaned | Same — agent now emits richer per-turn markers |

No schema migrations. No new tables. No new Redis key namespaces beyond the one `mock:cursor:*` pattern.

## 10. Phase 1 spikes and fallback decision matrix

Two new spikes added to the original spec's day-1 work. Both must complete before any production code beyond scaffolding.

### 10.1 New spikes

| # | Spike | Time box | Pass criterion |
|---|---|---|---|
| S3 | Agent v2 can emit a per-turn signal when an answer completes | 1.5h | Either (a) agent fires HTTP hook with partial transcript, OR (b) agent state is subscribable via LiveKit data channel |
| S4 | Agent v2 can read its next question dynamically (not from a pre-loaded list) | 1.5h | Either (a) agent uses webhook response's `nextQuestionText` as next utterance, OR (b) agent re-reads `data_json.additional_input` after we update it |

### 10.2 Decision matrix

| S3 | S4 | Outcome | What ships |
|---|---|---|---|
| ✅ | ✅ | **Full Approach 2** — real-time classification, branched follow-ups, design as written | Adaptive voice mock |
| ✅ | ❌ | **Pre-loaded tree on rails** — hook still fires, classifier still picks branch, but agent picks node from pre-loaded tree using cursor as index | Adaptive voice mock, branches resolved by classifier-updated cursor |
| ❌ | ✅ | **Polling** — backend subscribes to LiveKit transcript stream, detects answer-complete server-side, writes next question to `additional_input`, agent picks up on next read tick. Adds ~1s latency. | Adaptive voice mock with slightly longer pauses |
| ❌ | ❌ | **Heuristic tree on rails (Approach 3)** — no mid-call LLM. Each tree node carries a keyword/length heuristic baked into boot data. Agent walks tree deterministically. Tree structure + post-call enrichment unchanged. | Scripted-but-branched voice mock — less smart but rock-solid |

### 10.3 Invariants across all outcomes

The following remain identical regardless of which decision branch fires:

- Tree data model (§6)
- Post-call enrichment B+C (§7)
- All 9 v2 endpoints (§8.1) — including response shapes
- Persistence model (§9)
- Candidate experience: real-time voice, no text, no UI mid-call

Only varying piece across outcomes: which agent-side mechanism picks the next node, and (in outcome ❌❌) whether endpoint #10 exists at all.

### 10.4 Go/no-go gate

At end of day on May 12: one-line written decision identifying which outcome (✅✅ / ✅❌ / ❌✅ / ❌❌) is confirmed, before Phase 2 build begins.

## 11. Risk register (additions to original spec's R1–R5)

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| R6 | S3 + S4 both fail → forced into Approach 3. Demo loses real-time adaptive feel. | Medium — still ships, less impressive | Low–Medium | Phase 1 first call. Full fallback design lives in this doc; no rewrite needed. |
| R7 | Classifier latency exceeds 1500ms budget → awkward dead air | Medium | Low | Haiku, short prompt, pre-warmed connection, default-branch fallback on timeout |
| R8 | Classifier picks wrong branch → mismatched follow-up | Low (weird, not broken) | Medium | Constrained 6-label vocabulary; spot-check on 5–10 manual answers during Phase 2 rehearsal |
| R9 | Webhook retries cause duplicate question utterance | Medium (user-visible) | Low | Idempotency key `(callSessionId, nodeId, turnIdx)` per §5.3 |
| R10 | Tree-gen LLM call fails / malformed JSON at session start | High (no questions) | Low | Static fallback tree per §6.5; mock degrades to flat-3 behavior |
| R11 | Cursor desync between Redis and `data_json` after crash | Low | Low | Redis authoritative during call; rehydrate from `data_json` on miss; one durable write at end-of-call |

## 12. Open items / deferred to implementation

The following are deliberately not specified at design level. Resolved during implementation:

- Exact prompt text for tree generator, classifier, enricher (shapes and constraints fixed; wording iterated)
- Specific model IDs and routing (Haiku for classifier, Sonnet for enricher confirmed; exact IDs at impl time)
- Specific Redis TTLs beyond the call-lifetime (`mock:cursor:*` TTL 1h is fixed; other TTLs at impl)
- Literal text of the 3 static fallback questions (shape fixed; content at impl time)
- Specific log lines, metric names, alert thresholds
- Exact `RESOURCES` content per dimension (shape fixed; curation at impl time)

## 13. Relationship to the original spec

| Original spec section | This design |
|---|---|
| §1 Context, §1.1 Headless-first | Inherited unchanged |
| §2 Goals / non-goals | Extended (§2 here) — does not contradict |
| §3 User experience | Stage tracker, hub, modal, gap radar, summary — all inherited. §3.5 (mock interview) is replaced by §4–§7 of this doc. |
| §4 System architecture | Inherited; this doc adds the orchestrator layer (§4 here) and internal hook (§8.2 here). |
| §5 Persistence | Inherited; §9 here lists field-level additions. |
| §6 API surface | Inherited 9 endpoints; §8 here documents the additive response changes + new internal endpoint #10. |
| §7 Service-layer reuse map | Inherited unchanged. Same reuse list. |
| §8 Implementation plan | This doc does not re-state ownership splits. Adaptive pieces (tree-gen LLM, turn-hook + classifier, enricher) are net-new work added on top of original Phase 1–3. |
| §9 Risks | Extended (§11 here adds R6–R11). |
| §10 Future work | Inherited unchanged. |
| §11 Appendix A (prior art) | Inherited unchanged. |
| §12 Appendix B (demo plan) | Inherited; step 5 ("mock interview") now demonstrates real-time adaptivity if outcome ✅✅ / ✅❌ / ❌✅, or scripted-branched flow if ❌❌. |

---

_End of design._

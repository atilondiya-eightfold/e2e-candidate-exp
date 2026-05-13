# Phase 1 Gate Decision — May 12 EOD

## Inputs
- S3 (agent per-turn signal): see `docs/candidate-prep/phase1-s3-agent-signal.md` — **PASS** (mechanism = (a) HTTP hook, requires change in external `livekit-agents` repo).
- S4 (agent dynamic next-question): see `docs/candidate-prep/phase1-s4-agent-dynamic-q.md` — **PASS** (mechanism = (b) mid-call mutation of `state.evaluation_criteria`, requires small code change).
- S1 (gap-list shape): see `scripts/spike_s1_gap_shape.py` results block — **PASS** (real-tenant run on `eightfolddemo-atilondiya.com` with profile_id=548567245 and career_hub role_id=38495866 returned 18 gap entries from `get_skill_boosts()` shaped as `(skill_str, gap_boost)` tuples). Phase 2 tree-gen MUST add a transform layer: tuple→dict + dedupe by `str_utils.norm_for_w2v(skill)` (the feed emits raw + w2v_norm + title_case_w2v of every skill). The original task brief's input `position_id=38495618` is a `TYPE_REQUISITION` ("Payroll Coordinator"); the feed's `role.get_role_for_id` filters on `TYPE_ROLE`, so a hiring requisition returns 0 role_objs and an empty gap list — Phase 2 must explicitly resolve hiring-position → associated career_hub role(s) (or thread role_id directly through tree-gen) and stop overloading position_id terminology in this design.
- S2 (LiveKit + custom short_code): see `docs/candidate-prep/phase1-s2-livekit.md` — **PASS with documented caveats** (real-tenant run, LiveKit creds resolved from Secrets Manager, signed JWT issued for room `999999999_eightfolddemo-atilondiya.com` on `wss://air-76v7fg9o.livekit.cloud`, carrying `roomConfig.agents[0].metadata` = Phase-0 fallback tree payload with roots `[r0,r1,r2]` + policy). Two real prerequisites surfaced: (1) `candidate_prep_mock_system_design` is **NOT** in `interview_library_config` for the dev tenant (14 short_codes present, none candidate_prep_*) — without it, `init_call()` crashes in `InterviewPromptFactory.create_prompt` with `ValueError: Interview config not found for ID:` before reaching the LiveKit call; (2) `InterviewPromptFactory` has no handler for the prep-mock type and Phase 2 must add one. Bidirectional audio (agent join + TTS + mic) was NOT browser-verified — the external `livekit-agents` worker was not running locally and there is no browser client in this CLI environment; a dev-UI smoke test against a real seeded room is still required before launch.
- Allowlist audit: see `docs/candidate-prep/phase1-allowlist-audit.md` — **23 sites identified** (2 PATCH allowlist, 0 PATCH exclude, 21 READ-ONLY). New `CustomInterview` subclass file `www/ai_interview/common/custom_interview/candidate_prep_mock.py` will encapsulate the queueing allowlist via `get_post_interview_ops()`; only the enum (`interview_session_types.py:230`) and the registry (`registry.py:15`) need explicit edits.

## Decision matrix (design spec §10.2)
| S3 | S4 | Outcome | Selected? |
|---|---|---|---|
| ✅ | ✅ | Full Approach 2 — real-time classification, branched follow-ups | ☑ |
| ✅ | ❌ | Pre-loaded tree on rails (cursor-as-index) | ☐ |
| ❌ | ✅ | Polling — backend subscribes to transcript stream, writes next Q | ☐ |
| ❌ | ❌ | Heuristic tree on rails (Approach 3) — no mid-call LLM | ☐ |

## Verdict
**Selected outcome: ✅✅ — Full Approach 2 (real-time classification, branched follow-ups).**

## Justification
S3 confirms agent → backend per-turn signaling is achievable: the existing post-call webhook
(`livekit_postcall_hook_api.py` + bearer-auth via `LiveKitAdapter`) is the precedent, and the
external `livekit-agents` repo's `AgentSession.conversation_item_added` event is the natural
attach point. S4 confirms the agent's next-utterance choice is steerable from backend state by
mutating `state.evaluation_criteria.topics[...].questions` before the interviewer node runs
(`nodes/interviewer_node.py:276-286` produces the utterance from this state). Both capabilities
require code changes — neither is available today — but each change is small, bounded, and has a
clear attach point, so we are not paying for an architectural rebuild. The ✅✅ verdict permits
the design's full real-time loop: turn-hook receives a turn → classifier picks the next node →
state mutation steers the interviewer LLM to ask it.

## Blockers identified
- **Cross-repo coordination (S3 path):** the per-turn HTTP emitter must ship in the external
  `livekit-agents` repo in lockstep with the vscode `/internal/candidate-prep/turn-hook`
  endpoint. Phase 2 must plan a synchronized two-repo release with non-atomic rollback.
- **S1 shape transform required (was: verification deferred):** real-tenant S1 run
  confirmed the feed surface returns `(skill_str, gap_boost_float)` tuples, NOT
  `{skill_name, gap_level}` dicts. Phase 2 tree-gen prompt MUST add a small pre-flight
  transform that (a) wraps tuples into dicts and (b) dedupes by
  `str_utils.norm_for_w2v(skill)` — the feed emits up to three forms per skill (raw +
  w2v_norm + title_case_w2v), so a naive consumer would see 3× inflated gap counts.
- **S1 position→role resolution required:** the feed's `recommend_for_entity_id` is a
  career_hub `Role.id` (filtered by `Position.TYPE_ROLE`), not a hiring `position_id`
  (`TYPE_REQUISITION`). Phase 2 must (a) resolve "current hiring position" → "associated
  career_hub role(s)" before invoking the feed, or (b) thread `role_id` directly through
  the tree-gen pipeline and drop the `position_id` overload in the design.
- **S2 prerequisite — seed `candidate_prep_mock_system_design` in interview_library_config:**
  the dev tenant has 14 short_codes, none candidate_prep_*. `init_call()` fails *before*
  reaching LiveKit (`InterviewPromptFactory.create_prompt` → `ValueError: Interview config
  not found for ID: candidate_prep_mock_system_design`) until this row exists. Phase 2 task:
  partitioned config write for the demo tenant(s), or — cleaner — add as a default in the
  partitioned config schema so all eightfolddemo-* tenants inherit it.
- **S2 prerequisite — register a prep-mock prompt handler in `InterviewPromptFactory`:**
  `voice_screening.prompt.interview_prompt_factory.create_prompt` maps short_code → prompt
  class. Phase 2 must add a `CandidatePrepMockSystemDesignPrompt` (or equivalent) that reads
  `data_json.additional_input` (the tree) rather than the screening feedback-form path.
- **S2 audio leg still requires a browser smoke test:** S2 verified the backend can issue a
  valid signed LiveKit JWT carrying the Phase-0 fallback tree in `roomConfig.agents[0]
  .metadata`. It did NOT verify agent participant join / TTS / mic — those depend on the
  external `livekit-agents` worker process and a live browser, neither available in the
  spike's CLI environment. Treat audio-flow as open until a dev-UI run against a seeded
  `candidate_prep_mock_system_design` room is logged.
- **Idempotency + ordering on the turn-hook:** the agent has no built-in circuit breaker; the
  endpoint must dedupe on `(call_session_id, item_id)` and order on `turn_index`, not arrival
  time. Latency budget: handler must return under 50ms or back-pressure the agent event loop.
- **Replay safety in state mutation (S4 path):** `MemorySaver` checkpointing can replay turns;
  injected questions must carry a stable `question_id` in `current_question.metadata` to avoid
  double-asking on replay.

## Phase 2 scope (what gets planned next)
Based on the ✅✅ outcome, Phase 2 will cover:
- **Tree-gen pipeline:** call `role_skill_gap_based_feed`, transform to gap-list shape, prompt
  LLM to emit the §6 tree JSON; persist into `interview_session.data_json.additional_input`.
- **Real-time turn classifier:** new service that takes the just-completed candidate turn +
  current cursor and returns `{next_node_id, mutation_payload}`. Lives behind a feature gate.
- **Turn-hook endpoint:** `POST /internal/candidate-prep/turn-hook` in vscode
  (`apps/voice_agent_app/api/livekit_turn_hook_api.py`), modeled on `livekit_postcall_hook_api.py`.
  Bearer auth via `CANDIDATE_PREP_INTERNAL_HOOK_SECRET` (reserved in Phase 0). Idempotent on
  `(call_session_id, item_id)`, ordered by `turn_index`.
- **Agent-side per-turn emitter (external repo):** attach a `conversation_item_added` handler
  in `livekit-agents/src/interview_x/` that POSTs to the turn-hook after each user turn.
- **State-mutation pre-node (external repo):** insert a `BaseNodeExecutor` before
  `NodeNames.INTERVIEWER_NODE` that, when the gate is on, calls the classifier and mutates
  `state.evaluation_criteria.topics[i].questions` to inject the chosen next question.
- **Post-call enricher:** §7 ScoreInterview per-root invocation against
  `candidate_prep_system_design_template` (Phase 0), join scoring output to `RESOURCES`
  (Phase 0), persist as study-plan artifact.
- **All 9 v2 endpoints (§8.1)** plus the new internal turn-hook endpoint (§8.2).
- **Persistence model (§9)** wiring for `data_json` extensions.
- **Allowlist patches:** add `CustomInterviewType.CANDIDATE_PREP_MOCK` enum value, register a
  new `CandidatePrepMockInterview(CustomInterview)` subclass with its own
  `get_post_interview_ops()`, and add the registry row in `registry.py:15`.
- **Integration tests** for the turn-hook contract (idempotency, ordering), tree-gen fallback
  (Phase 0 fallback tree triggered on LLM error), and post-call enrichment join correctness.

**Explicitly out of scope for Phase 2:**
- Coding-interview adaptive flow (only system-design template seeded in Phase 0).
- Multi-language / non-English candidate UX.
- Real-time mid-utterance interruption (we only act between turns, not during).
- Replacing the LLM with heuristic-only classification (that was the ❌❌ fork).

## Sign-off
Date: 2026-05-12
Owner: atilondiya@eightfold.ai

---

## 2026-05-13 — Non-mock APIs shipped

The seven non-mock-interview endpoints (§8.1, §8.2, §8.3, §8.4, §8.5, §8.9, §8.10)
shipped on branch `atilondiya/candidate-prep-adaptive-design`. Mock-interview
endpoints (§8.6, §8.7, §8.8) remain Phase 2 scope.

- **Spec:** docs/superpowers/specs/2026-05-12-candidate-prep-headless-apis-design.md
- **Plan:** docs/superpowers/plans/2026-05-12-candidate-prep-headless-apis.md
- **App:** `www/apps/candidate_prep_app/` (applications, prep_session, stage_content)
- **Services:** `www/services/api/candidate_prep_{session,stage_content,gap_analysis,readiness}.py`
- **Test suite:** 34 passing across 7 files (10 session + 4 stage_content + 5 gap + 5 readiness + 2 applications_api + 4 prep_session_api + 4 stage_content_api).
- **Route registration confirmed:** all seven routes return 302/400/405 (auth-gated) under the namespace-prefixed path `/api/candidate_prep/v1/candidate-prep/...`.

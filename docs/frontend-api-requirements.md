# Candidate Prep — Backend API Requirements (frontend POV)

**Status:** Requirements (proposed). Companion to `docs/api-contract.md` (v0
shipped) and `docs/backend-headless-apis-spec.md` (v0 implementation).
**Audience:** Eightfold backend engineers shipping the candidate-prep v2 surface.
**Author:** atilondiya@eightfold.ai · 2026-05-13

This doc enumerates everything the React app at `frontend/` needs from the
Eightfold v2 API to render every locked screen at full fidelity, without
fixture fallbacks. It's intentionally exhaustive — including the v0 endpoints
that already shipped — so the backend team has one place to look at the full
contract surface.

For each endpoint we mark:

- 🟢 **shipped** — in v0 (`docs/api-contract.md` §3)
- 🟡 **delta** — v0 endpoint, but needs additional fields to fully drive UI
- 🔴 **new** — not in v0; required for Phase 2 (mock interview) or richer hub
- 🟦 **mutation** — write endpoint (v0 has none beyond `POST /prep-session`)

Same conventions as v0 (response envelope `{data, errors, metadata?}`,
bearer-token auth with `sub`, 404 for cross-tenant access, opaque
`prep_session_id`, etc.) apply throughout.

---

## 0. TL;DR — surface count

| Bucket | Count | Endpoints |
|---|---|---|
| 🟢 v0 shipped | 7 | applications×2, prep-session, gap-analysis, readiness, stage-content, stage-calendar |
| 🟡 v0 with field deltas | 3 | gap-analysis (+study_topics, +role_expected), stage-content (+per-dimension grouping), applications (+stage_meta) |
| 🔴 new — hub / study plan polish | 2 | study-plan (per-dimension grouping), study-items/:id/complete |
| 🔴 new — mock interview (Phase 2) | 6 | mocks (create + list), mocks/:id (read), mocks/:id/feedback, mocks/:id/transcript, mocks/:id (discard) |
| 🔴 new — readiness components | 0 | covered by extending `readiness.components` |
| **Total** | **18** | |

---

## 1. Cross-cutting

### 1.1 Auth

Unchanged from v0 (§1 of `api-contract.md`). All endpoints accept the bearer
token minted via `jwt_bearer` with `sub=<candidate-email>`; backend resolves
`profile_id` server-side from the token. Frontend never sends `profileId` or
`groupId`. The BFF (`backend/app/api/routes/ef_proxy.py`) handles the token
mint via `TokenCache`.

### 1.2 Errors

Same envelope as v0. The frontend maps error codes to the five locked error
states in `docs/mockups/errors.html`:

| Code / shape | Surfaces to candidate as |
|---|---|
| `404` on `GET /applications/:id` or any prep-session lookup | "We hit a snag" generic 404 (`errors.html` #5) |
| `5xx` on `POST /prep-session/:id/regenerate-gap-analysis` | Gap report generation failed (#1) |
| `5xx` on `POST /mocks` | Mock meeting failed to start (#2) |
| Mock dropped before MIN_DURATION_SEC | Mock ended early (#3) — surfaced via `mocks/:id` poll |
| Browser `offline` event | Offline banner (#4) — client-side only |

Every error response should include a stable `reference` string we can render
in monospace for support tickets:

```json
{ "errors": [{ "message": "...", "reference": "req-7f3a2b9c" }] }
```

The frontend renders the `reference` value verbatim; never shows the
`message` field directly to candidates (it's for ops triage, not copy).

### 1.3 Idempotency for mutations

All write endpoints (mark-done, create-mock, discard-mock) must be
idempotent via either a natural key (`(profile_id, item_id)`) or an
explicit `Idempotency-Key` header. Mock create + study-item mark-done are
the two most likely retry sources.

### 1.4 Realtime vs. polling

The mock-interview lifecycle (`active` → `completed`) currently polls. If
the backend can offer SSE or webhook on `/mocks/:id`, we'll switch — but
polling at 3s is a fine v1.

---

## 2. Per-screen requirements

Each subsection lists every endpoint a screen calls. **Bold** endpoints are
on the critical path for that screen (page can't render without them).

### 2.1 Empty state (US-1.1 · mockup `empty-state-v2.html`)

| Endpoint | Status | Why |
|---|---|---|
| **`GET /applications/<id>`** | 🟡 delta | App card + 6-stage timeline. Today returns the stage list; needs the deltas in §3.1 below. |

That's it. The three prep cards are static; they only navigate.

### 2.2 Hub steady-state (US-2.1 · mockup `hub-meta.html`)

| Endpoint | Status | Used for |
|---|---|---|
| **`GET /applications/<id>`** | 🟡 delta | App card, timeline, "Technical screen with Aditi · Mon Apr 13 · 7:00 PM IST" (needs interviewer name + time) |
| **`GET /stage/<active_stage_id>/content`** | 🟡 delta | About-this-stage panel: 3 columns (What to expect / How it's evaluated / Have questions). Today returns single content blob; column structure described in §4.2. |
| **`GET /prep-session/<id>/gap-analysis`** | 🟡 delta | Gap-report tile: top 3 weak dimensions with severity bars |
| **`GET /prep-session/<id>/readiness`** | 🟢 | Readiness % tile |
| **`GET /mocks?limit=10`** | 🔴 new | Mock-history tile: sparkline + last score + delta-since-first |
| **`GET /study-plan?prepSessionId=<id>`** | 🔴 new | Study-plan tile: % done + minutes remaining + "Up next" title |
| `GET /stage/<active_stage_id>/calendar` | 🟢 | Lazy — only when "Add to calendar" is clicked |

The "Suggested next" card is derived client-side from the same data — no
new endpoint needed.

### 2.3 Gap report (US-2.3 · mockup `gap-report.html`)

| Endpoint | Status | Used for |
|---|---|---|
| **`GET /prep-session/<id>/gap-analysis`** | 🟡 delta | Severity counts + dimension list + **per-dimension study_topics chips** |
| `POST /prep-session/<id>/regenerate-gap-analysis` | 🔴 new | "Try again" CTA on the gap-failed error state |

The chip vocabulary (`study_topics: string[]`, length 2–3 per gap) is the
single most load-bearing field for the whole app — same chips appear on
gap report → mock feedback → study plan per spec §7.

### 2.4 Mock launch (US-3.1 · mockup `mock-launch.html`)

| Endpoint | Status | Used for |
|---|---|---|
| **`POST /mocks`** | 🔴 new | Create mock, return `mock_id` + meeting URL + ID + passcode |
| `POST /mocks/<id>/test-mic` | 🔴 new (optional) | Server-side mic-permission verification before joining; could be pure client-side |

### 2.5 Mock in-progress (US-3.3 · no mockup — lightweight)

| Endpoint | Status | Used for |
|---|---|---|
| **`GET /mocks/<id>`** | 🔴 new | Poll status: `scheduled` → `in_progress` → `completed` → `dropped` |
| `DELETE /mocks/<id>` | 🔴 new | Discard a dropped mock (US-7.3 path); idempotent |

### 2.6 Mock feedback (US-4.1, 4.2, 4.3 · mockup `mock-feedback.html`)

| Endpoint | Status | Used for |
|---|---|---|
| **`GET /mocks/<id>/feedback`** | 🔴 new | Mira summary + 4 dimension cards + readiness delta + transcript moments + per-dimension chips |
| `GET /prep-session/<id>/readiness` | 🟢 (refetch) | After feedback lands, readiness % refreshes |

### 2.7 Study plan (US-2.4 · mockup `study-plan.html`)

| Endpoint | Status | Used for |
|---|---|---|
| **`GET /study-plan?prepSessionId=<id>`** | 🔴 new | Up-next hero + per-dimension sections + per-resource completion state |
| **`POST /study-items/<itemId>/complete`** | 🔴 new 🟦 | Mark resource done — single click, no confirmation |
| `POST /study-items/<itemId>/uncomplete` | 🔴 new 🟦 | Toggle off (optional; can also be implemented as `DELETE`) |

### 2.8 Transcript (US-4.4 · simple text view)

| Endpoint | Status | Used for |
|---|---|---|
| **`GET /mocks/<id>/transcript`** | 🔴 new | Full text turns: agent / candidate, with optional highlight tags |

### 2.9 Error states (all locked in `errors.html`)

No new endpoints. Each error scenario is reachable via existing endpoints
returning their documented error codes. The frontend handles the visual
treatment.

---

## 3. Delta details on existing v0 endpoints

### 3.1 `GET /applications/<id>` — additions

Add a `current_stage_meta` block on each stage row:

```diff
 {
   "stage_id": "s3",
   "name": "Technical screen",
   "status": "scheduled",
   "stage_type": "tech_screen",
   "scheduled_at": 1744569000,
   "content_available": true,
+  "interviewer_name": "Aditi",
+  "duration_min": 60,
+  "estimated_duration_label": "30–60 min",
+  "focus_summary": "system design focus"
 }
```

Rationale: the hub's stage header reads
"Technical screen with Aditi · Mon Apr 13 · 7:00 PM IST" and
"12 days away · 30–60 min · system design focus" — none of that exists in v0.

The "12 days away" is derived client-side from `scheduled_at`, so no field
needed; but `interviewer_name`, `duration_min`, and `focus_summary` are
server-owned and must come from the stage record.

### 3.2 `GET /prep-session/<id>/gap-analysis` — additions

The single biggest delta. Add `study_topics` and `role_expected_level` per
gap, plus a top-level `dimensions[]` shape that groups gaps by capability
dimension (the radar/severity card unit).

```diff
 {
   "prep_session_id": "...",
+  "dimensions": [
+    {
+      "dimension_id": "consistency",
+      "name": "Consistency / CAP",
+      "severity": "high",
+      "rationale": "You've worked with eventually-consistent systems but haven't named tradeoffs explicitly in your projects.",
+      "study_topics": [
+        { "id": "quorum-reads", "label": "Quorum reads" },
+        { "id": "read-your-writes", "label": "Read-your-writes" },
+        { "id": "vector-clocks", "label": "Vector clocks" }
+      ],
+      "candidate_level": 0.2,
+      "role_expected_level": 0.9
+    }
+  ],
   "gaps": [...],
   "source": "role_feed",
   "computed_at": 1715000000,
   "cache_hit": false
 }
```

| Field | Required | Notes |
|---|---|---|
| `dimensions[].dimension_id` | ✅ | Stable id used to join with `mocks/feedback.dimensions[]` and `study_plan.sections[]` |
| `dimensions[].name` | ✅ | Display name. Drives the radar axis labels too. |
| `dimensions[].severity` | ✅ | `"high" \| "medium" \| "covered"`. Drives card color + chip color. |
| `dimensions[].rationale` | ✅ | One sentence "why this is a gap" — already promised by user-story US-2.3. |
| `dimensions[].study_topics[]` | ✅ | **Load-bearing** — same chips appear on feedback + study plan. 2–3 per dimension, max 30 chars each. |
| `dimensions[].candidate_level` | ⭕ | 0–1; for radar polygon. Optional if radar is dropped. |
| `dimensions[].role_expected_level` | ⭕ | 0–1; the reference polygon. Optional if radar is dropped. |

The flat `gaps[]` array stays for backward compat; new code reads
`dimensions[]`.

### 3.3 `GET /stage/<id>/content` — additions

The mockup splits stage content into three columns (What to expect / How
it's evaluated / Have questions). Today's single `description + what_to_expect[] + checklist[] + resources[]` shape collapses on the panel.

Either return the three-column structure explicitly:

```diff
+ "panel_columns": {
+   "what_to_expect":   "30–60 min voice call with one engineer...",
+   "how_evaluated":    "Four dimensions: scaling tradeoffs, data modeling,...",
+   "have_questions":   "Your recruiter is the right person. Reach via PCS..."
+ }
```

Or — preferred — keep the v0 fields and let the frontend layout them.
Today's `what_to_expect[]` already covers column 1; we just need columns 2
and 3 added (e.g. `how_evaluated: string[]`, `recruiter_contact_hint: string`).
Either approach is fine; pick what's easier server-side.

---

## 4. New endpoints — full contracts

### 4.1 Mock interview lifecycle (Phase 2)

#### 4.1.1 `POST /mocks` — Create a mock

**Body:**

```json
{
  "applicationId": 7,
  "focus_dimension_ids": ["consistency", "failure-modes"]
}
```

**Response `data`:**

```json
{
  "mock_id": "mock_abc123",
  "mock_number": 2,
  "title": "Mock #2 — Consistency & failure modes",
  "duration_sec": 1500,
  "status": "scheduled",
  "meeting": {
    "provider": "livekit",
    "url": "https://meet.livekit.io/?room=mock_abc123&token=...",
    "meeting_id": "91752070224",
    "passcode": "657517",
    "opens_in_new_tab": true
  },
  "focus": [
    { "dimension_id": "consistency", "label": "Consistency / CAP" },
    { "dimension_id": "failure-modes", "label": "Failure modes" }
  ],
  "review": [
    { "dimension_id": "scaling", "label": "Scaling tradeoffs (review)" }
  ],
  "expires_at": 1715600000
}
```

| Field | Required | Notes |
|---|---|---|
| `focus_dimension_ids` (request) | ⭕ | If omitted, server picks weakest gaps (fallback for US-1.3 "skip gap report"). |
| `meeting.opens_in_new_tab` | ✅ | Drives UI copy. |
| `expires_at` | ✅ | Meeting URL TTL; if a candidate hesitates and joins late, frontend re-creates. |

**Errors:**
- `409` if the candidate already has an `in_progress` mock; body must include the live `mock_id` so we can resume.
- `503` from upstream LiveKit init_call surfaces as US-7.2 mock-launch error.

#### 4.1.2 `GET /mocks?limit=N` — List candidate's mocks

For the hub's Mock History tile.

```json
[
  {
    "mock_id": "mock_abc123",
    "mock_number": 2,
    "title": "Consistency & failure modes",
    "completed_at": 1715000000,
    "duration_sec": 1440,
    "score": 62,
    "status": "completed"
  }
]
```

Sorted newest-first. Discarded mocks are NOT in this list (they were
deleted server-side).

#### 4.1.3 `GET /mocks/<id>` — Read mock status

Used by the in-progress page as a poll.

```json
{
  "mock_id": "mock_abc123",
  "status": "in_progress",
  "started_at": 1715000000,
  "elapsed_sec": 720,
  "min_viable_duration_sec": 480
}
```

| Field | Required | Notes |
|---|---|---|
| `status` | ✅ | `scheduled \| in_progress \| processing \| completed \| dropped \| discarded` |
| `min_viable_duration_sec` | ✅ | Drives the US-7.3 "dropped mid-call" decision: if `elapsed_sec >= min_viable_duration_sec` we can still score. |

#### 4.1.4 `GET /mocks/<id>/feedback` — Per-mock feedback

```json
{
  "mock_id": "mock_abc123",
  "mock_number": 2,
  "title": "Consistency & failure modes",
  "completed_at": 1715000000,
  "duration_sec": 1440,
  "score": 76,
  "delta_vs_previous": 14,
  "mira_summary": "Good session, Aarav. Your data modeling and scaling reasoning are sharp...",
  "dimensions": [
    {
      "dimension_id": "scaling",
      "name": "Scaling tradeoffs",
      "level": "solid",
      "comment": "You partitioned writes by hash and accepted regional ownership...",
      "study_topics": []
    },
    {
      "dimension_id": "consistency",
      "name": "CAP / consistency",
      "level": "partial",
      "comment": "You picked eventual consistency but didn't tie it to a failure mode...",
      "study_topics": [
        { "id": "quorum-reads", "label": "Quorum reads" },
        { "id": "read-your-writes", "label": "Read-your-writes" },
        { "id": "vector-clocks", "label": "Vector clocks" }
      ]
    }
  ],
  "moments": [
    {
      "id": "m1",
      "timestamp": "04:12",
      "level": "strong",
      "quote": "...so for writes I'd partition by hash of the short code...",
      "annotation": null
    },
    {
      "id": "m2",
      "timestamp": "11:34",
      "level": "weak",
      "quote": "...for consistency I think eventual works because...",
      "annotation": "(no concrete failure mode named)"
    }
  ]
}
```

| Field | Required | Notes |
|---|---|---|
| `dimensions[].level` | ✅ | `weak \| partial \| solid \| strong` — drives left-border color on cards |
| `dimensions[].study_topics[]` | ✅ on `weak` / `partial` | Same chip vocabulary as gap-analysis. Empty array on `solid` / `strong`. |
| `moments[].level` | ✅ | `strong \| weak` (no medium — these are the *moments that moved the score*). 2–4 items. |

#### 4.1.5 `GET /mocks/<id>/transcript` — Full transcript

```json
{
  "mock_id": "mock_abc123",
  "turns": [
    {
      "id": "t1",
      "speaker": "agent",
      "timestamp": "00:00",
      "text": "Hey Aarav, today I'd like to walk through...",
      "highlight": null
    },
    {
      "id": "t4",
      "speaker": "candidate",
      "timestamp": "04:12",
      "text": "...so for writes I'd partition by hash of the short code...",
      "highlight": "strong"
    }
  ]
}
```

`highlight` matches the moments from `feedback.moments[]` so the same
excerpts are styled consistently across the two views.

#### 4.1.6 `DELETE /mocks/<id>` — Discard a mock

Idempotent. Returns `204 No Content`. After deletion the mock is gone from
`GET /mocks` and any future feedback fetch returns `404`.

### 4.2 Study plan

#### 4.2.1 `GET /study-plan?prepSessionId=<id>` — Per-dimension grouped plan

```json
{
  "prep_session_id": "...",
  "total_remaining_min": 240,
  "completed_count": 3,
  "total_count": 7,
  "up_next": {
    "section_id": "consistency",
    "resource_id": "res_jepsen_consistency"
  },
  "sections": [
    {
      "dimension_id": "consistency",
      "name": "CAP / consistency",
      "severity": "high",
      "total_min": 125,
      "completed_count": 0,
      "total_count": 3,
      "completed": false,
      "study_topics": [
        { "id": "quorum-reads", "label": "Quorum reads" },
        { "id": "read-your-writes", "label": "Read-your-writes" },
        { "id": "vector-clocks", "label": "Vector clocks" }
      ],
      "resources": [
        {
          "id": "res_jepsen_consistency",
          "title": "Jepsen — Consistency Models",
          "type": "read",
          "duration_min": 20,
          "url": "https://jepsen.io/consistency",
          "publisher": "jepsen.io",
          "done": false
        }
      ]
    }
  ]
}
```

| Field | Notes |
|---|---|
| `up_next` | Highest-priority unfinished resource (highest-severity dimension, smallest minutes-remaining). Drives the hero card. Returns `null` when everything is done. |
| `sections[].dimension_id` | Joins back to gap-analysis dimensions. |
| `sections[].study_topics[]` | Same chip vocabulary, third place it appears. |
| `resources[].publisher` | Optional; shown in metadata line. |
| `resources[].done` | Server-tracked per `(profile_id, resource_id)`. |

#### 4.2.2 `POST /study-items/<itemId>/complete` 🟦

Mark a resource done. Idempotent on `(profile_id, item_id)`.

**Body:** empty.

**Response `data`:**

```json
{
  "item_id": "res_jepsen_consistency",
  "done": true,
  "completed_at": 1715000000,
  "study_plan": { /* full updated study-plan shape from §4.2.1 */ }
}
```

Embedding the updated plan saves a round-trip; the hub's study tile re-renders
from one response.

#### 4.2.3 `POST /study-items/<itemId>/uncomplete` 🟦 (optional)

Same shape as 4.2.2, with `done: false`. Used if we let the candidate toggle
a checkbox off — currently the mockup doesn't show that affordance but the
component supports it.

### 4.3 Regenerate gap analysis

#### 4.3.1 `POST /prep-session/<id>/regenerate-gap-analysis` 🟦

Used by the "Try again" button on the gap-failed error state (US-7.1).
Forces a Redis cache eviction + re-run.

**Body:** empty.

**Response `data`:** identical to §3.2 `GET /gap-analysis`.

**Errors:** same as the GET. Surface 5xx as US-7.1.

---

## 5. Field-level chip vocabulary contract

**Critical for the app's coherence.** The same `study_topics[]` field
appears in three responses and the frontend joins them by `id`:

| Endpoint | Field path | Visual treatment |
|---|---|---|
| `GET /gap-analysis` | `dimensions[].study_topics[]` | Read-only chips inside the dimension card |
| `GET /mocks/:id/feedback` | `dimensions[].study_topics[]` (weak/partial only) | Clickable chips → scroll to study-plan section |
| `GET /study-plan` | `sections[].study_topics[]` | Display-only header chips above the resources list |

**Backend rules:**
- A chip's `id` must be stable across all three endpoints for the same
  candidate + session (otherwise the join breaks).
- Chip labels are short (≤30 chars). Title Case. No trailing punctuation.
- Length is 2–3 chips per dimension.
- Chips on a `solid` or `strong` mock dimension are omitted (`[]`).

---

## 6. What v0 can keep deferring

These remain Phase 2+ explicitly and are not part of this requirements doc:

- **Reschedule / message recruiter** — deep-link to PCS instead.
- **Multi-application overview** — focus is one application.
- **Notifications / email reminders** — out of scope.
- **Mid-call audio errors** (mic permission, browser unsupported) — meeting
  client's job, not our React app.
- **Calendar integration beyond .ics download** — no Google Calendar /
  Outlook OAuth.
- **Audio playback of past mock transcripts** — text-only per spec §13.

---

## 7. Priority order for backend

If the backend team has to ship this in phases, this is the order that
unblocks the most frontend with the least work:

1. **`dimensions[]` on `/gap-analysis` + `study_topics[]`** — unblocks the
   chip vocabulary across 3 screens. Single response shape change.
2. **`GET /study-plan` + `POST /study-items/:id/complete`** — unblocks the
   study-plan page end-to-end.
3. **Application detail deltas** (`interviewer_name`, `duration_min`,
   `focus_summary` on stages) — unblocks the hub stage header.
4. **`/mocks` POST + GET + status poll + `DELETE` discard** — unblocks the
   mock launch + in-progress flow.
5. **`/mocks/:id/feedback` + `/mocks/:id/transcript`** — unblocks post-mock
   review.
6. **`GET /mocks` list endpoint** — unblocks the hub's Mock History tile.
7. **`/regenerate-gap-analysis`** — small, can ship anytime.

Items 1–3 are the v0.5 hub fully working on real data; items 4–6 are
Phase 2 mock interview; item 7 is cleanup.

---

## 8. References

- v0 contract: [`docs/api-contract.md`](./api-contract.md)
- v0 backend design: [`docs/backend-headless-apis-spec.md`](./backend-headless-apis-spec.md)
- React design spec: [`docs/specs/react-app-design.md`](./specs/react-app-design.md)
- User stories: [`docs/user-stories.md`](./user-stories.md)
- Mockups: [`docs/mockups/*.html`](./mockups/)
- Phase 1 / Phase 2 boundary: [`docs/phase1-gate-decision.md`](./phase1-gate-decision.md)
- Chip vocabulary rule: [`docs/specs/react-app-design.md`](./specs/react-app-design.md) §7

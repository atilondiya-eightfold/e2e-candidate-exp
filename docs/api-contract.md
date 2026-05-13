# Candidate Prep — Frontend API Contract

**Audience:** frontend engineers integrating the candidate-prep flow.
**Surface:** API Server v2 (`apiv2.<tenant>.ai`). Same auth, error model, and
rate-limiting as every other v2 endpoint (e.g. `careerhub/performance-feedback`).
**Source of truth:** `www/api_generator/configs/api_server_v2.json` (entity
`candidate_prep`) + `www/services/api/candidate_prep_api_manager.py`.

---

## 1. Auth

All requests authenticate with an OAuth 2.0 bearer token issued by API Server
v2. Two grant types exist; both produce a token that works identically against
the endpoints below.

### Token exchange


```http
POST https://apiv2.<tenant>.ai/oauth/v1/authenticate
Content-Type: application/json

{
  "grant_type": "jwt_bearer",
  "client_id": "<tenant-client-id>",
  "client_secret": "<tenant-client-secret>",
  "sub": "candidate@example.com"
}
```



Response:


```json
{ "access_token": "eyJ...", "token_type": "Bearer", "expires_in": 3600 }
```



- `jwt_bearer` returns a token scoped to the user identified by `sub`. Use this
  when your backend is calling on behalf of a specific candidate.
- `client_credentials` returns a token bound to the tenant's service account.
  Use this for service-to-service automation.

The token's `user_id` becomes `current_user.profile_id` server-side — that is
the value every endpoint uses to scope data. **Never send `profileId` or
`groupId` in a request; both are derived from the token.**

### Token usage


```http
GET https://apiv2.<tenant>.ai/api/v2/candidate_prep/applications
Authorization: Bearer <access_token>
```



### Provisioning

Tenant admins generate `client_id` / `client_secret` once via
**Integrations Console → API Server Config → Manage OAuth Credentials**. Both
grant types are gated by per-tenant feature gates (`client_credentials_oauth_gate`,
`jwt_bearer_oauth_gate`); confirm with the admin that the relevant gate is on
before integrating.

---

## 2. Common conventions

### Base URL


```
https://apiv2.<tenant>.ai/api/v2/candidate_prep
```



For `eightfolddemo-atilondiya.com` that is
`https://apiv2.eightfolddemo-atilondiya.ai/api/v2/candidate_prep` (resolve
the actual `apiv2.*` host with your account contact — staging vs. prod
domains differ).

### Response envelope

Every JSON response is wrapped by the v2 framework:


```json
{
  "data": { ... },          // or [...] for list endpoints
  "metadata": {              // optional, present on list responses
    "total_found": 4,
    "start_index": 0
  },
  "errors": []               // populated only on failure
}
```



The shapes documented in §3 are the `data` value — not the outer envelope.

### Errors

| HTTP | Meaning | Body shape |
|---|---|---|
| 400 | Validation failure (missing field, bad type) | `{ "errors": [{"message": "..."}] }` |
| 401 | Missing / invalid / expired bearer token | framework default |
| 403 | OAuth client lacks the `candidate_prep:READ` or `candidate_prep:WRITE` permission | framework default |
| 404 | Resource missing **or** not in the candidate's scope (cross-tenant access leaks as 404, never 403) | `{ "errors": [{"message": "..."}] }` |
| 429 | Rate-limited (per-tenant config) | framework default |
| 500 | Unexpected | framework default |

**404 is the safe default.** If you request an application id that exists but
belongs to a different candidate (or a different tenant), the response is 404
— never 403 — to avoid existence leaks.

### Pagination

List endpoints accept `?limit=N` (default 5, upper bound enforced by the v2
framework per `api_server_v2_config`). Response metadata includes
`total_found` and `start_index`.

### Prep session id

`prepSessionId` is an opaque HMAC-signed string the backend mints. Treat it
as a single token to round-trip into the gap-analysis and readiness endpoints
— do not try to parse it. Tampering fails verification and is rejected as
404 ("prep session not found").

The same `(profile_id, position_id)` pair always produces the same id
(idempotent). It carries no per-request state; safe to cache client-side.

---

## 3. Endpoints (v0)

### 3.1 `GET /applications` — List applications

Returns the calling candidate's active applications, each with a
pre-computed `prepSessionId` you can use immediately for gap-analysis /
readiness.

**Query params:** `?limit=N` (optional)

**Response `data` (array):**


```json
[
  {
    "application_id": 7,
    "position_id": 99,
    "position_title": "Software Engineer",
    "current_stage": {
      "name": "Phone Screen",
      "status": "scheduled"
    },
    "status": "active",
    "t_create": 1715000000,
    "prep_session_id": "djF8NDJ8OTl8YWJjZGVm..."
  }
]
```



| Field | Type | Notes |
|---|---|---|
| `application_id` | int | Stable primary key. Use for `GET /applications/<id>` and `POST /prep-session`. |
| `position_id` | int | Tenant-scoped position id. |
| `position_title` | string | Human-readable. |
| `current_stage` | object \| null | `{name, status}`. `null` if no stage tracker. |
| `status` | string | `active`, `closed`, etc. |
| `t_create` | int | Unix seconds. |
| `prep_session_id` | string | Use directly for §3.4 / §3.5 / §3.7. |

---

### 3.2 `GET /applications/<applicationId>` — Application detail

Stage tracker + currently-active stage + the prep session id.

**Path:** `applicationId: int`

**Response `data`:**


```json
{
  "application_id": 7,
  "position_id": 99,
  "stages": [
    {
      "stage_id": "s1",
      "name": "Phone Screen",
      "status": "scheduled",
      "stage_type": "phone_screen",
      "scheduled_at": 1715600000,
      "content_available": true
    },
    {
      "stage_id": "s2",
      "name": "Tech Screen",
      "status": "pending",
      "stage_type": "tech_screen",
      "scheduled_at": null,
      "content_available": true
    }
  ],
  "active_stage_id": "s1",
  "prep_session_id": "djF8NDJ8OTl8YWJjZGVm..."
}
```



| Field | Type | Notes |
|---|---|---|
| `stages[].stage_id` | string | Pass to §3.6 / §3.7. |
| `stages[].status` | string | `scheduled`, `active`, `in_progress`, `pending`, `completed`, … |
| `stages[].stage_type` | string \| null | Canonical type: `phone_screen`, `tech_screen`, `system_design`, `behavioral`, `onsite`, or null/unknown (renders as default content). |
| `stages[].scheduled_at` | int \| null | Unix seconds. `null` ⇒ no calendar download available. |
| `stages[].content_available` | bool | Always `true` (default content is served if the stage type is unknown). |
| `active_stage_id` | string \| null | First stage with status `scheduled`/`active`/`in_progress`; falls back to the first stage. |

**v1 delta:** see §8.1 for additional stage fields (`interviewer_name`,
`duration_min`, `estimated_duration_label`, `focus_summary`).

**Errors:** `404` if the application doesn't exist or isn't in scope.

---

### 3.3 `POST /prep-session` — Create / look up a prep session

Idempotent. Encodes a `prepSessionId` for an application you own. Same input
returns the same id; no server-side state is mutated.

**Body:**


```json
{ "applicationId": 7 }
```



**Response `data`:**


```json
{
  "prep_session_id": "djF8NDJ8OTl8YWJjZGVm...",
  "profile_id": 42,
  "position_id": 99
}
```



| Field | Type | Notes |
|---|---|---|
| `prep_session_id` | string | Use for §3.4 / §3.5. |
| `profile_id` | int | The token's resolved candidate id. Debug-only — don't render. |
| `position_id` | int | The application's position id. |

**Errors:**
- `400` if `applicationId` missing or non-integer.
- `404` if the application isn't in scope.

> **Note:** `GET /applications` already returns `prep_session_id` on every row,
> so most frontends never need to call this endpoint. Use it when you have
> only an `applicationId` (e.g. deep link) and need the session id before
> rendering.

---

### 3.4 `GET /prep-session/<prepSessionId>/gap-analysis` — Skill gaps

Hybrid analysis: tries the career-library role feed first (if the candidate's
target position maps to a role in the tenant's role library), then falls back
to a direct position-skills diff. Same response schema regardless of path.

Cached in Redis (1h TTL). `cache_hit: true` indicates a cache return.

**Path:** `prepSessionId: string`

**Response `data`:**


```json
{
  "prep_session_id": "djF8NDJ8OTl8YWJjZGVm...",
  "gaps": [
    { "skill_name": "Python", "gap_level": 1.0, "source": "role_feed" },
    { "skill_name": "Distributed Systems", "gap_level": 0.8, "source": "role_feed" }
  ],
  "source": "role_feed",
  "computed_at": 1715000000,
  "cache_hit": false
}
```



| Field | Type | Notes |
|---|---|---|
| `gaps[].skill_name` | string | Display as-is. Already deduped + normalised (no `python` + `Python` doubles). |
| `gaps[].gap_level` | float | `0.0 .. 1.0`. `1.0` = candidate is missing the skill entirely; lower values are calibrated against the role library. |
| `gaps[].source` | string | `"role_feed"` (library-calibrated) or `"position_skills"` (raw position diff). Show a badge if you want to surface "calibrated against career role library". |
| `source` | string | Top-level mirror of `gaps[].source` (always equal across all items in one response). |
| `computed_at` | int | Unix seconds. |
| `cache_hit` | bool | `true` ⇒ served from Redis; data may be up to 1h stale. |

**v1 delta:** see §8.2 for the new `dimensions[]` array with chip vocabulary
(`studyTopics[]`). New code should prefer `dimensions[]`; the flat `gaps[]`
list is preserved for legacy.

**Errors:** `404` if the session is tampered/expired or the candidate
no longer has an active application for `(profile_id, position_id)`. On `404`,
re-fetch `prepSessionId` via §3.1 or §3.3 and retry once.

---

### 3.5 `GET /prep-session/<prepSessionId>/readiness` — Readiness score

Blended score derived from gap severity (mock-interview component reserved
for Phase 2; today it returns `null` and gap severity carries the whole
score). Reuses the gap-analysis Redis cache, so calling §3.4 and §3.5
back-to-back is cheap.

**Path:** `prepSessionId: string`

**Response `data`:**


```json
{
  "prep_session_id": "djF8NDJ8OTl8YWJjZGVm...",
  "score": 72,
  "label": "high",
  "top_gaps": ["Python", "Distributed Systems", "Kubernetes"],
  "components": {
    "gap_severity": 0.72,
    "mock": null
  }
}
```



| Field | Type | Notes |
|---|---|---|
| `score` | int | `0..100`. |
| `label` | string | `"low"` (score < 40), `"moderate"` (40–69), `"high"` (≥ 70). |
| `top_gaps` | string[] | Top three skill names by `gap_level`, descending. Empty if no gaps. |
| `components.gap_severity` | float | `0.0..1.0`. Sigmoid on gap count, saturates around 12 gaps. |
| `components.mock` | float \| null | Always `null` today; will be `0..1` in Phase 2. |

**Errors:** same as §3.4.

---

### 3.6 `GET /stage/<stageId>/content` — Stage prep content

Static prep guidance per stage type (what to expect, checklist, resources).
Falls back to a `__default__` block for unknown stage types so the endpoint
never 404s on tenant-specific stage labels — render the default copy in that
case.

**Path:** `stageId: string` (must match a stage on one of the candidate's
applications)

**Response `data`:**


```json
{
  "stage_type": "phone_screen",
  "title": "Phone screen",
  "description": "An initial conversation, usually with a recruiter, …",
  "what_to_expect": [
    "20-40 minute call, often the recruiter (not the hiring manager).",
    "Open-ended questions about your motivation, current role, and timing.",
    "Discussion of compensation expectations and logistics."
  ],
  "checklist": [
    "Have a 60-second story of your background ready.",
    "Be specific about why this role / this company - not generic answers.",
    "Know your comp expectations before the call."
  ],
  "resources": [
    {
      "title": "How to ace the recruiter screen",
      "url": "https://www.themuse.com/advice/the-recruiter-phone-screen-how-to-ace-it",
      "minutes": 8,
      "type": "read"
    }
  ]
}
```



**Stage types currently shipped:** `phone_screen`, `tech_screen`,
`system_design`, `behavioral`, `onsite`, `__default__`.

| Field | Type | Notes |
|---|---|---|
| `stage_type` | string | One of the values above. `__default__` ⇒ render generic copy. |
| `title` | string | Display heading. |
| `description` | string | One paragraph. |
| `what_to_expect` | string[] | Bullets. |
| `checklist` | string[] | Bullets. |
| `resources[].type` | string | `"read"` | `"video"` | `"book"`. Drive icon choice off this. |
| `resources[].minutes` | int | Estimated time. |

**v1 delta:** see §8.3 for `how_evaluated[]` + `recruiter_contact_hint`
(the three-column About-this-stage panel).

**Errors:** `404` if `stageId` doesn't match any stage on the candidate's
applications.

---

### 3.7 `GET /stage/<stageId>/calendar` — Calendar (.ics)

Returns the iCalendar payload as a JSON-wrapped string (the v2 surface is
JSON-only). The frontend writes `data.ics` to a file named `data.filename`
and offers it as a download.

**Path:** `stageId: string`

**Response `data`:**


```json
{
  "stage_id": "s1",
  "filename": "stage-s1.ics",
  "ics": "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Eightfold//candidate-prep//EN\r\nBEGIN:VEVENT\r\nUID:stage-s1@candidate-prep\r\nDTSTAMP:20260513T053500Z\r\nDTSTART:20260513T140000Z\r\nDTEND:20260513T143000Z\r\nSUMMARY:Software Engineer - Phone Screen\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n"
}
```



**Download in browser:**


```js
const blob = new Blob([data.ics], { type: 'text/calendar;charset=utf-8' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = data.filename;
a.click();
URL.revokeObjectURL(url);
```



**Errors:**
- `404` if the stage has no `scheduled_at` (`{"errors":[{"message":"Stage <id> has no scheduled time"}]}`).
- `404` if the stage isn't on a candidate-owned application.

---

## 4. Recommended client flow


```
        ┌─────────────────────────────────────────────────────────────┐
        │ 1. Exchange creds → bearer token (cache until expires_in)   │
        └──────────────────────────────┬──────────────────────────────┘
                                       │
                                       ▼
        ┌─────────────────────────────────────────────────────────────┐
        │ 2. GET /applications                                        │
        │    Returns rows with embedded prep_session_id               │
        └──────────────────────────────┬──────────────────────────────┘
                                       │
            ┌──────────────────────────┼────────────────────────────┐
            ▼                          ▼                            ▼
  GET /applications/<id>     GET /prep-session/<id>/      GET /prep-session/<id>/
  Stage tracker              gap-analysis                 readiness
            │                          │                            │
            ▼                          ▼                            ▼
  For each stage:           gaps[] for skill UI         score + label + top_gaps
  GET /stage/<id>/content   (cached 1h)                 (reuses gap cache)
  GET /stage/<id>/calendar
  (if scheduled_at != null)
```



Most frontends only need **one round trip to `/applications`** to render the
list page; the per-row `prep_session_id` lets them fan out to gap-analysis,
readiness, and stage content in parallel without re-deriving anything.

---

## 5. Versioning & stability

| Field | Stability |
|---|---|
| Endpoint paths (`/applications`, `/prep-session/*`, `/stage/*`) | Stable. Breaking changes will ship a `/v3/candidate_prep/` namespace. |
| `prep_session_id` opacity | Stable. Format may change without notice; treat as opaque. |
| `prep_session_id` HMAC secret rotation | Rare. Old ids fail as `404` after rotation; treat any `404` on a previously-valid id as "re-fetch and retry once". |
| `gap_level` numeric calibration | May change between releases — relative ordering preserved, absolute values not load-bearing. Display as a 0–100% badge, not as a raw decimal. |
| Stage types | New types may be added. Always render the `__default__` block as a fallback rather than gating UI on a hardcoded enum. |
| `components.mock` slot | Will become non-null in Phase 2. Today: always `null`. Treat as optional. |

---

## 6. Known limitations (Phase 1 hackathon scope)

These are documented in
`docs/superpowers/specs/2026-05-12-candidate-prep-headless-apis-design.md`
and are not bugs:

- **`positionId` / `applicationId` are raw ints**, not `enc_id`-encoded.
  Future work will rename to `positionEncId` / `applicationEncId` and accept
  both forms during a deprecation window.
- **No write endpoints** beyond `POST /prep-session`, the new write surfaces
  in §8 (regenerate, study-item completion, mock lifecycle), and the
  stub-backed `POST /mocks`. Stage progression and feedback submission
  remain Phase 2.
- **Gap analysis cache is per-`(profile_id, position_id)`**, evicted only by
  TTL (1h). If the candidate updates their skills, the gap response stays
  stale for up to an hour.
- **Calendar endpoint requires `scheduled_at`** on the stage. Stages with
  status `scheduled` but no timestamp return `404` — design around this in
  the UI (hide the "Add to calendar" button when `scheduled_at` is `null`).

---

## 7. References

- Source: `www/services/api/candidate_prep_api_manager.py`
- Schemas: `www/external_objects/candidate_prep_schema.py`
- Config: `www/api_generator/configs/api_server_v2.json` → entity `candidate_prep`
- Spec: `docs/superpowers/specs/2026-05-12-candidate-prep-headless-apis-design.md`
- Plan: `docs/superpowers/plans/2026-05-12-candidate-prep-headless-apis.md`
- OAuth grants: PR #104846 (JWT Bearer)
- v2 manager pattern: PR #105384 (Performance Feedback)

---

## 8. v1 surface — additional endpoints + delta fields

This section enumerates the **v1 deltas** layered on the v0 surface described
above. Source of truth: `docs/frontend-api-requirements.md` (frontend
requirements) reconciled against `candidate_prep_api_manager.py` (server
implementation). v0 endpoints remain unchanged — clients written against v0
keep working; new fields are additive.

### 8.0 Endpoint inventory (v0 + v1)

| # | Method | Path | Section |
|---|---|---|---|
| 1 | GET    | `/applications` | §3.1 |
| 2 | GET    | `/applications/<applicationId>` | §3.2 + §8.1 (stage metadata delta) |
| 3 | POST   | `/prep-session` | §3.3 |
| 4 | GET    | `/prep-session/<id>/gap-analysis` | §3.4 + §8.2 (dimensions[] delta) |
| 5 | GET    | `/prep-session/<id>/readiness` | §3.5 |
| 6 | GET    | `/stage/<stageId>/content` | §3.6 + §8.3 (column delta) |
| 7 | GET    | `/stage/<stageId>/calendar` | §3.7 |
| 8 | POST   | `/prep-session/<id>/regenerate-gap-analysis` | §8.4 (new) |
| 9 | GET    | `/study-plan?prepSessionId=<id>` | §8.5 (new) |
| 10 | POST  | `/study-items/<itemId>/complete` | §8.6 (new) |
| 11 | POST  | `/study-items/<itemId>/uncomplete` | §8.7 (new) |
| 12 | GET   | `/mocks` | §8.8 (new) |
| 13 | POST  | `/mocks` | §8.9 (new) |
| 14 | GET   | `/mocks/<mockId>` | §8.10 (new) |
| 15 | DELETE | `/mocks/<mockId>` | §8.11 (new) |
| 16 | GET   | `/mocks/<mockId>/status` | §8.12 (new) |
| 17 | GET   | `/mocks/<mockId>/feedback` | §8.13 (new) |
| 18 | GET   | `/mocks/<mockId>/transcript` | §8.14 (new) |

**18 endpoints total.** Mock-interview lifecycle endpoints (§8.8 – §8.14) are
**stubbed today** — they return realistic deterministic responses and exercise
the full state machine (`scheduled → in_progress → completed`), but the
underlying mock-meeting + AI feedback are Phase 2. The wire contract will not
change when the real implementation lands.

### 8.0.1 Chip vocabulary join contract

`studyTopics[]` chips appear in three responses and the frontend joins them
by `id`:

| Endpoint | Field path | Treatment |
|---|---|---|
| `GET /prep-session/<id>/gap-analysis` | `dimensions[].studyTopics[]` | Read-only chips inside the dimension card |
| `GET /mocks/<id>/feedback` | `dimensions[].studyTopics[]` | Empty `[]` on `solid`/`strong`; otherwise clickable chips |
| `GET /study-plan` | `sections[].studyTopics[]` | Header chips above the resources list |

Server guarantees:

- Chip `id` is stable across all three endpoints for the same `(candidate, session)`.
- Chip `label` is ≤30 characters, Title Case, no trailing punctuation.
- Each dimension carries 2–3 chips with stable suffixes (`-fundamentals`, `-practice`, `-pitfalls`).
- `dimensionId` is stable across `gap-analysis`, `mocks/feedback`, and `study-plan`.

### 8.1 Delta: `GET /applications/<applicationId>` — stage metadata

Each row in `stages[]` now carries four additional fields:


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
+  "estimated_duration_label": "45-60 min",
+  "focus_summary": "system design focus"
 }
```



| Field | Type | Notes |
|---|---|---|
| `interviewer_name` | string \| null | Flows through unchanged when present on the source row; otherwise `null`. |
| `duration_min` | int | Scheduled duration. Per-stage-type defaults from `candidate_prep_stage_metadata` when missing on the row. |
| `estimated_duration_label` | string | Human range, e.g. `"45-60 min"`, `"half / full day"`. |
| `focus_summary` | string | Short label, e.g. `"system design focus"`, `"STAR stories + team fit"`. |

The "12 days away" countdown remains client-derived from `scheduled_at`.

### 8.2 Delta: `GET /prep-session/<id>/gap-analysis` — dimensions[]

The flat `gaps[]` list is preserved (legacy). A new `dimensions[]` array is
the preferred shape — driven by `candidate_prep_dimensions.derive_dimensions`,
deterministic from skill names so chip ids stay stable.


```diff
 {
   "prep_session_id": "...",
+  "dimensions": [
+    {
+      "dimension_id": "consistency",
+      "name": "Consistency",
+      "severity": "high",
+      "rationale": "Recent projects don't show depth in Consistency. This is one of the highest-impact gaps for this role.",
+      "study_topics": [
+        { "id": "consistency-fundamentals", "label": "Consistency fundamentals" },
+        { "id": "consistency-practice",     "label": "Consistency in practice" },
+        { "id": "consistency-pitfalls",     "label": "Common Consistency pitfalls" }
+      ],
+      "candidate_level": 0.0,
+      "role_expected_level": 1.0
+    }
+  ],
   "gaps": [...],
   "source": "role_feed",
   "computed_at": 1715000000,
   "cache_hit": false
 }
```



| Field | Notes |
|---|---|
| `dimensions[].dimension_id` | Joins with `mocks/feedback` and `study-plan`. |
| `dimensions[].severity` | `"high"` (gap_level ≥ 0.75), `"medium"` (≥ 0.4), `"covered"` otherwise. |
| `dimensions[].rationale` | One sentence; templated today. |
| `dimensions[].candidate_level` | `1 - gap_level`. |
| `dimensions[].role_expected_level` | Always `1.0` today. |

Capped at 8 dimensions per call so the radar polygon stays readable.

### 8.3 Delta: `GET /stage/<stageId>/content` — three-column copy

Two new fields support the mockup's three-column "About this stage" panel:


```diff
 {
   "stage_type": "phone_screen",
   "title": "Phone screen",
   "description": "...",
   "what_to_expect": ["..."],
   "checklist": ["..."],
   "resources": [...],
+  "how_evaluated": [
+    "Whether your background matches the role's seniority and scope.",
+    "Clarity on motivation: 'why now, why this team'."
+  ],
+  "recruiter_contact_hint": "Your recruiter runs this call. If you need to reschedule, ping them on the same thread they sent the invite from."
 }
```



| Field | Type | Notes |
|---|---|---|
| `how_evaluated` | string[] | Column 2 bullets. Per-stage-type copy; falls back to a generic two-bullet block on unknown types. |
| `recruiter_contact_hint` | string | Column 3 prose. Per-stage-type copy with a generic fallback. |

### 8.4 `POST /prep-session/<prepSessionId>/regenerate-gap-analysis`

Forces a Redis cache eviction + recompute. Body is empty (any payload is
ignored). Powers the "Try again" CTA on the gap-failed error state (US-7.1).

**Response `data`:** identical to §3.4 `GET /gap-analysis` (always
`cache_hit: false`, fresh `computed_at`).

### 8.5 `GET /study-plan?prepSessionId=<id>`

Per-dimension grouped plan, derived from the current gap analysis, enriched
with the candidate's resource-completion state.

**Query params:** `prepSessionId` (required).

**Response `data`:**


```json
{
  "prep_session_id": "...",
  "total_remaining_min": 240,
  "completed_count": 3,
  "total_count": 7,
  "up_next": {
    "section_id": "consistency",
    "resource_id": "res-aphyr-strong-eventual"
  },
  "sections": [
    {
      "dimension_id": "consistency",
      "name": "Consistency",
      "severity": "high",
      "total_min": 35,
      "completed_count": 0,
      "total_count": 2,
      "completed": false,
      "study_topics": [
        { "id": "consistency-fundamentals", "label": "Consistency fundamentals" },
        { "id": "consistency-practice",     "label": "Consistency in practice" },
        { "id": "consistency-pitfalls",     "label": "Common Consistency pitfalls" }
      ],
      "resources": [
        {
          "id": "res-jepsen-consistency",
          "title": "Jepsen - Consistency Models",
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
| `up_next` | Highest-severity dimension with an unfinished resource; smallest `duration_min` wins inside the dimension. `null` when everything is done. |
| `sections[].resources[].id` | Stable per-resource id. Pass to §8.6 / §8.7 to toggle completion. |
| `sections[].resources[].done` | Server-tracked per `(profile_id, position_id, resource_id)`. Redis TTL 30 days. |

If a dimension isn't in the server catalogue today, the section gets a
fallback two-resource pair (`res-<dimensionId>-overview`, `res-<dimensionId>-practice`)
so every dimension always has at least one actionable item.

### 8.6 `POST /study-items/<itemId>/complete`

Mark a study-plan resource done. Idempotent on `(profile_id, item_id)`.

**Body:** `{ "prepSessionId": "..." }` (required — scopes completion to the
right `(profile, position)` pair).

**Response `data`:**


```json
{
  "item_id": "res-jepsen-consistency",
  "done": true,
  "completed_at": 1715000000,
  "study_plan": { /* full refreshed plan from §8.5 */ }
}
```



Embedding the updated plan saves a roundtrip; the hub's study tile re-renders
from one response.

### 8.7 `POST /study-items/<itemId>/uncomplete`

Same shape as §8.6 with `done: false` and `completed_at: null`.

### 8.8 `GET /mocks?limit=N`

List the candidate's mocks (newest-first, discarded excluded).

**Response `data` (array):** see §8.10 shape for each row.

### 8.9 `POST /mocks`

Create a new mock interview against an owned application. Stubbed lifecycle
today: returns `status: "scheduled"`, auto-transitions to `in_progress` after
5s on read, and to `completed` after the planned duration (1500s) on read.

**Body:**


```json
{
  "applicationId": 7,
  "focusDimensionIds": ["consistency", "failure-modes"]
}
```



| Field | Required | Notes |
|---|---|---|
| `applicationId` | ✅ | Must be owned by the calling candidate. |
| `focusDimensionIds` | ⭕ | If omitted, server picks the top-two `severity: "high"` dimensions from current gap analysis (falls back to top-two of any severity). |

**Response `data`:** see §8.10.

**Errors:**
- `400` if `applicationId` is missing/non-int.
- `400` if every supplied `focusDimensionIds` value is unknown.
- `400` if gap analysis returned no dimensions (cannot pick focus).
- `404` if `applicationId` isn't in scope.

### 8.10 `GET /mocks/<mockId>`

Read one mock. The lifecycle auto-advances on read.

**Response `data`:**


```json
{
  "mock_id": "mock_abc123",
  "mock_number": 2,
  "title": "Mock #2 - Consistency & Scaling",
  "duration_sec": 1500,
  "status": "scheduled",
  "meeting": {
    "provider": "livekit",
    "url": "https://meet.livekit.io/?room=mock_abc123&token=stub",
    "meeting_id": "9abc123",
    "passcode": "657517",
    "opens_in_new_tab": true
  },
  "focus": [
    { "dimension_id": "consistency", "label": "Consistency" },
    { "dimension_id": "scaling",     "label": "Scaling" }
  ],
  "review": [
    { "dimension_id": "python", "label": "Python" }
  ],
  "expires_at": 1715600000,
  "completed_at": null,
  "score": null
}
```



| Field | Notes |
|---|---|
| `status` | `"scheduled" \| "in_progress" \| "processing" \| "completed" \| "dropped" \| "discarded"` |
| `meeting.opens_in_new_tab` | Always `true` today. |
| `expires_at` | Meeting URL TTL (currently 30 min from create). After expiry, recreate the mock. |
| `completed_at`, `score` | `null` until the mock reaches `completed`. |

### 8.11 `DELETE /mocks/<mockId>`

Discard a mock (used by the "dropped mid-call" US-7.3 path). Idempotent.

**Response `data`:** shape mirrors §8.12 status with `status: "discarded"`.

### 8.12 `GET /mocks/<mockId>/status`

Lightweight poll view. The in-progress page polls this every 3s.

**Response `data`:**


```json
{
  "mock_id": "mock_abc123",
  "status": "in_progress",
  "started_at": 1715000000,
  "elapsed_sec": 720,
  "min_viable_duration_sec": 480
}
```



| Field | Notes |
|---|---|
| `min_viable_duration_sec` | Below this, dropped mocks are unscoreable. Drives the US-7.3 "can we still score?" decision. |

### 8.13 `GET /mocks/<mockId>/feedback`

Per-mock feedback. **404 until status reaches `completed` or `dropped`.**

**Response `data`:**


```json
{
  "mock_id": "mock_abc123",
  "mock_number": 2,
  "title": "Mock #2 - Consistency & Scaling",
  "completed_at": 1715000000,
  "duration_sec": 1440,
  "score": 76,
  "delta_vs_previous": 14,
  "mira_summary": "Solid run on mock #2. You showed clear reasoning on Consistency...",
  "dimensions": [
    {
      "dimension_id": "consistency",
      "name": "Consistency",
      "level": "solid",
      "comment": "You handled Consistency confidently and named real trade-offs.",
      "study_topics": []
    },
    {
      "dimension_id": "scaling",
      "name": "Scaling",
      "level": "partial",
      "comment": "You scratched the surface on Scaling but stopped before naming concrete failure modes.",
      "study_topics": [
        { "id": "scaling-fundamentals", "label": "Scaling fundamentals" },
        { "id": "scaling-practice",     "label": "Scaling in practice" },
        { "id": "scaling-pitfalls",     "label": "Common Scaling pitfalls" }
      ]
    }
  ],
  "moments": [
    {
      "id": "mom-mock_abc123-strong",
      "timestamp": "04:12",
      "level": "strong",
      "quote": "...so for consistency, I'd partition by hash and accept regional ownership...",
      "annotation": null
    },
    {
      "id": "mom-mock_abc123-weak",
      "timestamp": "11:34",
      "level": "weak",
      "quote": "...for consistency I think eventual works because...",
      "annotation": "(no concrete failure mode named)"
    }
  ]
}
```



| Field | Notes |
|---|---|
| `dimensions[].level` | `"weak" \| "partial" \| "solid" \| "strong"` — drives left-border colour on cards. |
| `dimensions[].study_topics[]` | Empty on `solid`/`strong`. Same chip vocabulary as §8.2 and §8.5. |
| `moments[].level` | `"strong" \| "weak"` only (no medium — moments are score-movers). |
| `delta_vs_previous` | `score - previous_mock.score`; `0` for the first mock. |

### 8.14 `GET /mocks/<mockId>/transcript`

Full transcript. **404 until status reaches `completed` or `dropped`.**

**Response `data`:**


```json
{
  "mock_id": "mock_abc123",
  "turns": [
    {
      "id": "t1",
      "speaker": "agent",
      "timestamp": "00:00",
      "text": "Hey, today I'd like to walk through Consistency together.",
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


`highlight` values match the `moments[].level` from §8.13 so the same
excerpts can be styled consistently across feedback + transcript views.

---

## 9. Stub vs. real implementation

The following endpoints return realistic deterministic responses today but
will be replaced with production logic in Phase 2. **The wire contract will
not change.**

| Endpoint | Today (stub) | Phase 2 |
|---|---|---|
| `POST /mocks` | Returns a fake LiveKit URL + token; stores state in Redis | Real LiveKit room + token mint; persisted in MySQL |
| `GET /mocks/<id>` and `/status` | Lifecycle clock advances on read (5s scheduled → in_progress → 1500s → completed) | Driven by real meeting events |
| `GET /mocks/<id>/feedback` | Deterministic per-dimension feedback templated from `focus` dimensions; chips identical to gap-analysis | LLM-scored against rubric |
| `GET /mocks/<id>/transcript` | 6-turn hand-written transcript spliced with focus labels | Real STT transcript |
| Stage metadata defaults (`interviewer_name`, `duration_min` etc.) | Per-stage-type defaults table | Real ATS stage data when available |
| Gap dimension `rationale` | Templated sentence | LLM-generated from candidate skill history |

For all of the above the response **shape** is final — frontend code written
against the stub will not need to change when the production logic lands.

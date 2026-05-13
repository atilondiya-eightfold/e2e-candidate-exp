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

## 3. Endpoints

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
- **No write endpoints** beyond `POST /prep-session`. Stage progression,
  feedback submission, and mock-interview lifecycle endpoints are Phase 2.
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

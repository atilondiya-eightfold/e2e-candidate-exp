# Candidate Prep Headless APIs — Non-Mock Endpoints Design

**Date:** 2026-05-12
**Owner:** atilondiya@eightfold.ai
**Branch:** `atilondiya/candidate-prep-adaptive-design`
**Status:** Approved for implementation

## 1. Goal

Ship the seven non-mock-interview endpoints from the design plan §8.1 end-to-end so an external frontend can render the candidate-prep flow against real data on `eightfolddemo-atilondiya.com` (and any candidate-authenticated tenant) before the mock interview itself is built. Mock-interview endpoints (§8.6, §8.7, §8.8) are Phase 2 scope and not in this spec.

## 2. Scope

### In scope (this spec)

| ID | Method + Path | Purpose |
|---|---|---|
| 8.1 | `GET  /v1/candidate-prep/applications` | List candidate's active applications with stage state |
| 8.2 | `GET  /v1/candidate-prep/applications/{application_id}` | Stage tracker + active stage detail for one application |
| 8.3 | `GET  /v1/candidate-prep/stage/{stage_id}/content` | Static prep content for a stage type |
| 8.4 | `POST /v1/candidate-prep/prep-session` | Create (encode) a prep session id for `(profile_id, position_id)` |
| 8.5 | `GET  /v1/candidate-prep/prep-session/{id}/gap-analysis` | Skill gap list for the candidate against the position |
| 8.9 | `GET  /v1/candidate-prep/prep-session/{id}/readiness` | Blended readiness score derived from gap severity (mock slot reserved) |
| 8.10 | `GET  /v1/candidate-prep/stage/{stage_id}/calendar.ics` | iCalendar download for a scheduled stage |

### Out of scope

- §8.6/§8.7/§8.8 (mock interview endpoints) — Phase 2.
- Internal turn-hook endpoint — Phase 2.
- Multi-tenant stage-content overrides — P2 (CMS, design plan §19).
- Personalized reminders (§9) — P1.
- Feature gating — added later as a one-liner per endpoint when needed.

## 3. Architecture

A new Flask app + a parallel services layer. The API layer is thin (decorators, request validation, ownership guard, envelope); the services layer is pure Python computations that can be unit-tested without Flask.

```
www/apps/candidate_prep_app/
├── __init__.py                  # namespace registration
├── applications_api.py          # 8.1, 8.2
├── stage_content_api.py         # 8.3, 8.10
├── prep_session_api.py          # 8.4, 8.5, 8.9
└── tests/
    ├── test_applications_api.py
    ├── test_stage_content_api.py
    └── test_prep_session_api.py

www/services/api/
├── candidate_prep_stage_content.py    # NEW — hardcoded stage_type → content dict (hackathon config constant)
├── candidate_prep_session.py          # NEW — encode/decode session_id ↔ (profile_id, position_id), ownership guards
├── candidate_prep_gap_analysis.py     # NEW — hybrid role-feed→position-skills gap computation, transform, Redis cache
├── candidate_prep_readiness.py        # NEW — blendable score (gap_severity_component + mock_score_component=None)
└── tests/
    ├── test_candidate_prep_stage_content.py
    ├── test_candidate_prep_session.py
    ├── test_candidate_prep_gap_analysis.py
    └── test_candidate_prep_readiness.py
```

The three existing Phase 0 modules (`candidate_prep_fallback_tree.py`, `candidate_prep_resources.py`, `candidate_prep_feedback_template.py`) remain frozen.

## 4. Auth, tenant isolation, and the IDOR guard

Every endpoint uses Eightfold's canonical candidate-facing decorator stack (precedent: `www/apps/career_hub_app/offers_app/offers_api.py:50-51`):

```python
@login_required
@decorators.endpoint_mode(['candidate'])
@decorators.log_event(namespace='candidate_prep', event='<endpoint_name>')
```

`current_user.profile_id` is the source of truth for the candidate identity. `current_user.get_group_id()` is the source of truth for tenant. **The frontend passes no profile_id or group_id in any request body or URL.**

Two ownership guards live in `candidate_prep_session.py` and are the first call in every endpoint that touches a resource:

- `require_owned_application(application_id, current_user) -> ProfileApplication` — loads the row, raises `Forbidden` if `appl.profile_id != current_user.profile_id` or `appl.group_id != current_user.get_group_id()`, raises `NotFound` if missing.
- `require_owned_prep_session(prep_session_id, current_user) -> (profile_id, position_id)` — decodes (HMAC-verified), checks the decoded `profile_id == current_user.profile_id`, then verifies a matching `ProfileApplication` exists. Raises `Forbidden`/`NotFound` accordingly.

`prep_session_id` is opaque to the frontend: `base64url(profile_id + "|" + position_id + "|" + hmac_sha256(payload, secret)[:16])`. Secret is read from env var `CANDIDATE_PREP_SESSION_SIGNING_SECRET` (reserve in Phase-0 secret doc, default to dev-only constant if unset so local runs work). Tampering with the id fails the HMAC verify → 403.

## 5. Persistence model — ephemeral

There is no new database table. `prep_session_id` carries the full state needed to recompute any view; storage lives only in:

- **Existing `ProfileApplication`** — source of truth for application + stage state.
- **Existing `Position`** — source of skills for the position-skills gap fallback.
- **Existing `Role` (career_hub)** — source of skills + benchmarks for the role-feed gap path.
- **Redis** — caches expensive computations (gap analysis), TTL 1 hour. Key: `prep:gap:{profile_id}:{position_id}`. Eviction is implicit — frontend cannot invalidate; if a candidate updates skills the cache stays stale until TTL.

This choice is deliberate hackathon-scope per the project's design plan. Phase 2 can promote `prep_session` to a real DB row when there is mock-attempt history worth keeping. The endpoint contracts do not change in that promotion — only the encoder/decoder and the readiness blend.

## 6. Per-endpoint contracts

### 6.1 `GET /v1/candidate-prep/applications`

**Auth:** candidate. **Body:** none.

**Flow:**
1. `applications = profile_applications.get_my_applications(current_user)`
2. For each, project: `{application_id, position_id, position_title, group_id, current_stage: {name, status}, status, t_create, prep_session_id}`.
3. `prep_session_id = candidate_prep_session.encode(current_user.profile_id, position_id)`.

**Response:** `BaseResponse(status=200, data=[Application], error=None, metadata={"count": n})`.

### 6.2 `GET /v1/candidate-prep/applications/{application_id}`

**Auth:** candidate. **Path:** `application_id: int`.

**Flow:**
1. `appl = require_owned_application(application_id, current_user)`
2. Project to detailed shape with the stage list extracted from `appl.data_json` (existing stages-history shape — implementation will use the same projector that `apps/career_hub_app/career_hub_view.py` uses to build the candidate-facing application view; reuse rather than reimplement).

**Response:** `BaseResponse(status=200, data={application, stages: [{stage_id, name, status, scheduled_at: int|null, content_available: bool}], active_stage_id, prep_session_id})`.

### 6.3 `GET /v1/candidate-prep/stage/{stage_id}/content`

**Auth:** candidate. **Path:** `stage_id: str`.

**Flow:**
1. Resolve `stage_id` to its application and to the stage's canonical `stage_type` (string). Authorize via `require_owned_application(appl_id, current_user)`.
2. `content = candidate_prep_stage_content.get_content_for_stage_type(stage_type)`. Returns `None` for unknown types → `404 not_found`.

**Response:** `BaseResponse(status=200, data={stage_type, title, description, what_to_expect: [str], checklist: [str], resources: [{title, url, minutes, type}]})`.

`candidate_prep_stage_content.py` is a hardcoded dict keyed by canonical stage type names (`"phone_screen"`, `"tech_screen"`, `"onsite"`, `"behavioral"`, `"system_design"`, plus a `__default__`). Adding a new stage type means editing this dict and updating the snapshot test. This is the "config constant file" agreed with the owner.

### 6.4 `POST /v1/candidate-prep/prep-session`

**Auth:** candidate. **Body:** `{application_id: int}`.

**Flow:**
1. `appl = require_owned_application(application_id, current_user)`
2. `prep_session_id = candidate_prep_session.encode(current_user.profile_id, appl.position_id)`
3. No DB write.

**Response:** `BaseResponse(status=200, data={prep_session_id, profile_id, position_id})`. Idempotent — same input → same id.

### 6.5 `GET /v1/candidate-prep/prep-session/{id}/gap-analysis`

**Auth:** candidate. **Path:** `id: str` (encoded prep_session_id).

**Flow:**
1. `(profile_id, position_id) = require_owned_prep_session(id, current_user)`
2. Cache check `redis.get("prep:gap:{profile_id}:{position_id}")`. If hit, return cached.
3. `gaps = candidate_prep_gap_analysis.compute(profile_id, position_id, current_user)`:
   - **Hybrid C path A:** try `_resolve_role_for_position(position_id, group_id)`. Resolution rule: case-insensitive exact match on `position.title == role.title` within the tenant; if the position has a non-empty `position.job_code`, prefer a role whose `job_code` matches exactly. First match wins (deterministic by `role.id asc`). If exactly one role matches, call `_gap_from_role_feed(profile_id, role.id, current_user)` which uses `RoleSkillGapBasedSearchParams.get_skill_boosts()` and applies the tuple→dict + `str_utils.norm_for_w2v` dedupe transform from the S1 spike. Source = `"role_feed"`. If zero or multiple matches, fall through to path B (no fuzzy match; ambiguity defers to the universal path).
   - **Hybrid C path B (fallback):** if no role match, `_gap_from_position_skills(profile_id, position_id, current_user)` — load the `Position`, diff `position.skills` against `profile.skills` (use `profile.get_all_skills_from_profile`), emit one dict per missing skill with `gap_level=1.0`. Source = `"position_skills"`.
4. Cache write with TTL 3600s.

**Response:** `BaseResponse(status=200, data={prep_session_id, gaps: [{skill_name, gap_level, source}], source, computed_at, cache_hit: bool}, metadata={"gap_count": n})`.

Both paths share the same output schema. Frontend never sees the source distinction unless it wants to render a "calibrated against career role library" badge.

### 6.6 `GET /v1/candidate-prep/prep-session/{id}/readiness`

**Auth:** candidate. **Path:** `id: str`.

**Flow:**
1. `(profile_id, position_id) = require_owned_prep_session(id, current_user)`
2. Reuse `candidate_prep_gap_analysis.compute(...)` (hits the same Redis cache as 6.5).
3. `readiness = candidate_prep_readiness.compute(gaps=gaps, mock_results=None)`:
   - `gap_severity_component(gaps) -> float in [0, 1]` — sigmoid on `len(gaps)` with cap at 12 gaps. Weight: 1.0 today (carries the whole score).
   - `mock_score_component(mock_results) -> float in [0, 1] | None` — returns `None` today. Phase 2 plugs in actual mock-rubric blending here.
   - Final `score = round(100 * weighted_blend([(gap_severity_component, w_gap), (mock_score_component, w_mock)]))`. When `mock_score_component` is None, `w_mock` redistributes to `w_gap`.
   - Label: `score < 40 → "low"`, `40 ≤ score < 70 → "moderate"`, `score ≥ 70 → "high"`.
   - `top_gaps = gaps[:3]` by `gap_level desc`.

**Response:** `BaseResponse(status=200, data={prep_session_id, score: 0-100, label, top_gaps: [skill_name], components: {gap_severity: 0-1, mock: null}})`.

### 6.7 `GET /v1/candidate-prep/stage/{stage_id}/calendar.ics`

**Auth:** candidate. **Path:** `stage_id: str`.

**Flow:**
1. Resolve stage to its application, run `require_owned_application(appl_id, current_user)`.
2. Look up the linked `planned_event` for this stage via existing `www/planned_events_app/` helpers (the implementation plan will pick the exact accessor — there are a few, we want the one keyed by `(application_id, stage_id)`).
3. If no planned_event or no `start_time`, return `404 {"error": "no_scheduled_event"}`.
4. Otherwise build the ICS payload with `icalendar` library (already in deps; otherwise add) — `SUMMARY`, `DTSTART`, `DTEND`, `LOCATION` (if present), `DESCRIPTION` (stage_type + position_title), `UID` (`stage_id@<host>`).

**Response:** `200 text/calendar; charset=utf-8` body = ICS file, or `BaseResponse 404`.

## 7. Error contract

Uniform across all endpoints:

| Status | Body | When |
|---|---|---|
| 400 | `{error: "invalid_request", message}` | webargs validation failure |
| 401 | flask-login default redirect | no candidate session |
| 403 | `{error: "forbidden"}` | ownership guard fails (cross-candidate / cross-tenant) |
| 404 | `{error: "not_found"}` | resource doesn't exist or isn't in candidate's scope |
| 500 | `{error: "internal_error"}` + `log.exception` | unexpected exception |

The 403/404 distinction always errs toward `not_found` when in doubt — never confirm whether a resource exists outside the candidate's scope.

## 8. Testing

**Unit (services layer, no Flask):**
- `test_candidate_prep_session.py` — encode/decode round-trip, HMAC tamper detection, ownership guard rejects cross-profile + cross-tenant.
- `test_candidate_prep_gap_analysis.py` — both paths (role-feed mocked, position-skills direct), dedupe-by-norm verified, cache hit/miss paths via fakeredis.
- `test_candidate_prep_readiness.py` — gap_severity_component monotonicity, weight redistribution when mock=None, label thresholds, top_gaps ordering.
- `test_candidate_prep_stage_content.py` — snapshot test (forces explicit review when adding a stage type).

**API (Flask test client):**
- One file per `*_api.py`. Each tests happy path + IDOR (caller tries to fetch a session/application for a profile that isn't theirs → expect 403) + 404 (nonexistent id) + 400 (malformed body where applicable).

**Skipped:** load tests, BackstopJS, real-Redis integration (use `fakeredis` or mock the cache module).

## 9. Open items deferred from this spec

- **Stage entity wiring (6.2, 6.3, 6.7).** The exact accessor for "list of stages on a `ProfileApplication`" and "stage_id → planned_event" lookup will be pinned down in the implementation plan via codebase exploration — there are several candidates (`career_hub_view`'s projector, `apps/planned_events_app/planned_events_api.py`) and the implementer should follow the one with the least coupling.
- **HMAC secret rotation.** Out of scope this phase; rotating the env var invalidates all in-flight `prep_session_id`s. Frontend should treat 403 on a previously-valid id as "re-create the prep-session and retry once".
- **Rate limiting.** No per-endpoint limit added; relies on existing platform throttling. Gap analysis Redis cache absorbs accidental refresh storms.

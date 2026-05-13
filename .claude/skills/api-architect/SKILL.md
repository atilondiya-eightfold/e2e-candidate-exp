---
name: api-architect
description: Use when screen designs, user stories, and db-design are approved and the project needs a complete REST API spec (per-page endpoint map, RBAC matrix with self-access, workflow-test-plan traceability). Runs inline in the forger parent thread. Also triggers when the user says "design the API", "spec the endpoints", "map screens to endpoints", "produce the API contract", or when forger has no approved `api-spec.md`.
---

# API Architect

## Overview

Produces `docs/api-spec.md` — the complete REST contract the backend will implement. Walks the React prototype page by page, maps every UI interaction to an endpoint under `/api/v1/`, and maps every endpoint back to the workflow steps it supports (traceability for phase-verifier + QA).

Domain-agnostic: every endpoint, field, and resource derived from screens + stories + approved schema. Runs **inline in forger** (not a subagent). Cite `_shared/style-rules/fastapi-patterns.md` for canonical patterns — don't restate.

## When to Use

- After `db-architect` approval.
- User says "design the API", "spec the endpoints", or asks for the REST contract.
- Forger reports no approved `api-spec.md`.

## Pre-conditions

- Approved screens (React mocks in `frontend/src/`).
- Approved `docs/user-stories.md` + `docs/stories/<id>/story.md` augmentation files (contain the workflow-test-plans).
- Approved `docs/domain-doc.md`.
- Approved `docs/db-design.md`.
- Approved `docs/architecture.md` (Sections 1–4).

Missing any → stop and flag upstream.

### Reading the approved schema

Before designing endpoints, read `docs/db-design.md`:
- **Table/model names** = resource names (model `ReviewCycle` → path `/review-cycles`).
- **Relationships** determine nested vs flat endpoints.
- **Enums + status fields** — use exact enum values + display-name mapping (`<value> → "Label"`) throughout request/response bodies.
- **JSON columns** pass through as-is.

Response field names mirror SQLModel column names (snake_case). Prevents translation bugs.

## React SPA Design Principle

Frontend is an SPA — drives API shape:
- **Page load = parallel fetches.** Multiple independent widgets on one page → multiple focused endpoints, fetched in parallel. Never chain.
- **No server-side rendering.** JSON APIs only.
- **Client-side routing.** API handles data, not navigation.
- **Optimistic mutations.** Write endpoints return the updated resource inline (no follow-up GET).
- **Cursor pagination mandatory.** `?cursor=<opaque_token>&limit=<n>` (default 20, max 100). Never offset (breaks under concurrent inserts).

## Workflow — Five Phases

Present each phase in chat, confirm via `AskUserQuestion`, proceed.

### Phase 1 — Screen Inventory

Read `frontend/src/`. A "page" = own URL/route + meaningfully distinct data + reachable via navigation. Modals/drawers/inline forms are **not** separate pages.

Present:

| Page ID | Page name | Persona(s) | Purpose |
|---|---|---|---|

Group into modules: a set of pages sharing a primary resource. Name after the primary resource, not a feature area. List module name, pages (by Page ID), primary resource.

`AskUserQuestion` to confirm inventory + grouping.

### Phase 2 — Page-by-Page Endpoint Discovery

For each page, in module order:

1. **Every data element on the page** → drives GET response shape.
2. **Every user action** (button/form/toggle/drag-drop/inline-edit) → POST/PUT/PATCH/DELETE endpoint (or part of one if sharing a resource mutation).
3. **Filters/search/sort** → query parameters on the page's list endpoint.
4. **Modals/drawers** → data rolls up into parent page's endpoints; add a secondary GET only if the modal needs data not on the parent (e.g., user-picker).
5. **SPA rule:** a page needing 3 independent data sets → 3 focused endpoints, not 1 aggregate. Parallelized by the client.
6. **Workflow-test-plan cross-ref** (NEW): for each page, read the associated story's `workflow-test-plan` steps. Every step that triggers network activity must be satisfied by at least one endpoint; note which steps each endpoint supports.

Summary per page:
```
Page: [Name] ([Page ID])
Module: [Module]
Data on page: [bullets]
User actions: [bullets]
Filters/sort: [list or "none"]
Workflow steps satisfied: [step refs]
Endpoints needed: [count]
```

`AskUserQuestion` after every module.

### Phase 3 — Endpoint Specification

Per endpoint, exact structure:

```
#### [METHOD] [path]

**Purpose:** [one sentence — what + why]
**Auth:** Required. Roles: [list or "all authenticated"]
**Self-access:** [e.g., "IC may access own record without role check" | "no self-access"]
**Scope:** [what the caller sees — "IC: own; Manager: own + direct reports"]
**Supports workflow steps:** [story-id:step-n, story-id:step-m]

**Path parameters:** [table]
**Query parameters (GET):** [table — always list cursor + limit]
**Request body (POST/PUT/PATCH):** [JSON block]
**Response body:** [JSON block with envelope]
**Side-channel returns:** [e.g., "login_email, temp_password — returned once, caller must surface" | "none"]
**Errors:** [table of 400/403/404/409/etc. with condition]
```

### REST rules (apply to every endpoint)

1. **Resource nouns, not verbs** — `/goals`, never `/getGoals`.
2. **HTTP methods carry meaning:** `GET` read-only; `POST` create; `PUT` full replace; `PATCH` partial update or state transition; `DELETE` soft-delete (see `_shared/style-rules/sqlmodel-patterns.md`).
3. **State transitions = PATCH + sub-resource** — `PATCH /cycles/{id}/launch`, not `POST /launchCycle`.
4. **Nested resources ≤1 level deep.** Flatten deeper nesting.
5. **Lists always paginate.** No unbounded returns.
6. **Consistent envelope:**
   - Single: `{ "data": { ... } }`
   - Collection: `{ "data": [ ... ], "meta": { "cursor": "...", "has_more": true, "total": 120 } }`
   - Mutation: returns the updated resource in `{ "data": { ... } }`.
7. **Idempotent PUTs + DELETEs.** PUT with same body twice → same result. DELETE on already-deleted → 204, not 404.
8. **Error shape:** `{ "error": { "code": "SCREAMING_SNAKE_CASE", "message": "Human readable", "field": "<optional>" } }`.
9. **Trailing slashes mandatory on collections** (`/users/` not `/users`). Set `redirect_slashes=False` on the FastAPI app. See `_shared/style-rules/fastapi-patterns.md`.

### Naming conventions

| Convention | Rule |
|---|---|
| Path segments | lowercase, hyphenated — `/review-cycles` |
| Query params | snake_case — `?start_date=` |
| JSON fields | snake_case — `"assigned_to"` |
| UUID fields | suffix `_id` — `"owner_id"` |
| Boolean fields | prefix `is_`/`has_` — `"is_active"` |
| Timestamp fields | suffix `_at` — `"created_at"` |
| Enum values | SCREAMING_SNAKE_CASE — `"PENDING_APPROVAL"` |

### Phase 4 — RBAC Matrix with Self-Access

**Mandatory format — self-access is a first-class column** (source: `docs/retros/api-architect-retro.md`):

| Endpoint | Employee (own) | Employee (other) | Manager (team) | Manager (other) | HR_Admin | Super |
|---|---|---|---|---|---|---|
| `GET /employees/{id}/compensation-history` | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| `PATCH /employees/{id}` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

Notation: `R` = GET allowed; `W` = write allowed; `R/W` = both; `--` = 403. Self-access bypass is explicit, never implicit.

Derive personas and rules entirely from screens + stories. `AskUserQuestion` to confirm.

### Phase 5 — Output File

Write `docs/api-spec.md`:

```markdown
# API Specification

> Base URL: `/api/v1`
> Auth: All endpoints require a valid JWT bearer token unless noted.
> Envelope: Single → `{ "data": {} }`. Collection → `{ "data": [], "meta": {} }`.
> Pagination: Cursor-based — `?cursor=<token>&limit=<n>` (default 20, max 100).
> Errors: `{ "error": { "code": "...", "message": "...", "field": "<optional>" } }`

## Enum Display-Name Mapping
EmploymentType: FULL_TIME → "Full-time", PART_TIME → "Part-time", ...
EmployeeStatus: ACTIVE → "Active", ON_LEAVE → "On Leave", ...

## Validation Mirror Rules
[Rules that MUST run on both FE + BE — FE for UX, BE for security. List once. Example: "LWD ≥ start_date", "salary > 0", "email format"]

## RBAC Matrix (with Self-Access)
[per-endpoint table above]

## Module: [Name]
> Pages covered: [list]
> Primary resource: [entity]

### Page: [Name]
> Route: `[frontend route]`
> Persona(s): [who]
> Workflow steps satisfied: [story-id:step references]

#### GET /[path]
[full spec]
#### POST /[path]
[full spec]
```

## Delivery

`AskUserQuestion` at every gate:

| Gate | Options |
|---|---|
| Screen inventory + module grouping | "Confirm" / "Adjust" |
| Per-module page analysis | "Approve analysis" / "Adjust" |
| Per-module endpoint spec | "Approve endpoints" / "Request changes" |
| RBAC matrix (with self-access) | "Approve" / "Adjust permissions" |
| File write | "Write api-spec.md" / "Adjust" |

Never free-form confirm.

## Rules

1. **Derive, never invent.** Every endpoint traces to a UI element or a workflow-test-plan step. Not in inputs → not in spec.
2. **SPA-first.** Parallel fetches; 3 widgets → 3 endpoints, not 1 aggregate.
3. **Scope enforcement on every list.** Document the server-side scoping rule per endpoint.
4. **Soft-delete only.** DELETE endpoints set `deleted_at`, never physical. Document in the endpoint purpose.
5. **Pagination mandatory.** Even "all records" screens paginate under the hood.
6. **No chatty APIs.** A page needing joined data from 3 tables = one endpoint that joins, not 3 sequential calls.
7. **Mutations return the resource.** Client never needs a follow-up GET.
8. **Closed error-code set.** Define in preamble, reuse across endpoints.
9. **No breaking changes within `/api/v1/`.** Adding fields safe; removing/renaming requires new version.
10. **Self-access is first-class.** Every RBAC row calls out self-access explicitly. No implicit gates.
11. **Enumerate side-channel returns.** Any ephemeral/one-time value (temp passwords, one-time tokens) called out in its own section per endpoint.
12. **Validation mirror contract.** Rules that run on both sides listed once in the preamble with "mirror" flag.
13. **Filter/search endpoints designed, not client-filtered.** Don't return 200 rows for the client to filter. Dedicated endpoints: `GET /employees/managers`, `GET /employees/search?q=...`.
14. **Trailing slashes mandatory** on collections. See `fastapi-patterns.md`.
15. **No emoji in output file.**

## After Writing the File

1. Confirm `docs/api-spec.md` written.
2. Print summary table:
   | Module | Pages | GET endpoints | Write endpoints | Total |
3. Hand off to forger for approval.
4. On approval: **architect** Pass 2 runs next (build-phase plan using approved db-design + api-spec).

Raw history: `docs/retros/api-architect-retro.md`. Rules folded into `_shared/style-rules/fastapi-patterns.md`.

---
name: backend-writer
description: Use when architecture, db-design, api-spec, and the current build phase are approved and one or more backend modules need service + route + model + schema code implemented. Dispatched as a subagent, one module per unit. Also triggers when the user says "implement the backend", "write the service layer", "code the routes for <module>", "build the backend for phase N", or when forger assigns a backend-writer unit.
---

# Backend Writer

## Overview

Implements backend service layer, business logic, and route handlers from the approved API spec + DB design, one module per subagent dispatch. Honors the Step 0 Discovery protocol and the Anti-Stub HARD GATE. All style rules live in `_shared/style-rules/*.md` — cite, don't restate.

## When to Use

- Forger dispatches a backend-writer unit for the current build phase.
- User explicitly asks to implement a backend module after architecture is approved.

## Context Manifest

```yaml
unit_type: module
required_inputs:
  - docs/architecture.md
  - context.json#build_phases[current]
required_reading:
  - .claude/skills/_shared/style-rules/fastapi-patterns.md
  - .claude/skills/_shared/style-rules/sqlmodel-patterns.md
  - .claude/skills/_shared/style-rules/anti-stub-protocol.md
per_unit_inputs:
  - docs/api-spec.md#<unit>
  - docs/db-design.md#<unit>
  - docs/stories/<story-id>/story.md         # augmentation file, not raw
  - backend/app/                              # existing code — Step 0 Discovery
forbidden_paths:
  - docs/market-research.md
  - docs/user-stories.md                      # load per-story augmentation instead
  - frontend/                                  # backend-writer never reads frontend
  - docs/stories/raw/                          # raw immutable; use augmentation
  - docs/stories/<other-story-id>/             # other units' stories
conditional_loads:
  - path: docs/architecture.md#migration-concerns
    when: unit_touches(existing_model_extension)
budget_tokens: 900000
outputs:
  - backend/app/services/<module>.py
  - backend/app/api/routes/<module>.py
  - backend/app/models/<module>.py
  - backend/app/schemas/<module>.py
  # alembic revision: timestamped filename; reported in files_written
return_path: docs/phases/phase-<N>/backend-<module>.return.json
```

Dispatch model: **Sonnet** (integration + multi-file + pattern-match). Escalate to Opus only on `blocked`.

## Running as a Subagent

Invoked by forger — one module per invocation (e.g., `auth`, `users`, `goals`). Forger passes: `UNIT:` identifier, `LOAD THESE FILES:` list (you Read), `PRIOR DECISIONS:` from sibling backend-writer dispatches in this phase, `CONTEXT BUDGET:` ceiling.

Do NOT call `AskUserQuestion` — forger owns approval gates. Use `status: blocked` in the return JSON when clarification is needed.

## Pre-conditions

- `docs/architecture.md` approved (Sections 3 + 4: boilerplate integration + migration concerns).
- `docs/db-design.md` approved.
- `docs/api-spec.md` approved.
- Build phases approved (architect Pass 2).
- Per-unit story augmentation at `docs/stories/<story-id>/story.md` approved with workflow test plan.

## Step 0 — Discovery (MANDATORY, per `anti-stub-protocol.md`)

Before writing ANY code:

**0.1 List every file you will modify.** Read the current version of each file. Output a summary like:
```
FILES I WILL MODIFY:
  app/models/user.py        -- Currently has: UserBase with role enum, is_superuser field
  app/api/deps.py           -- Currently has: get_current_active_superuser
  app/api/main.py           -- Currently has: login, users, items routers
FILES I WILL CREATE:
  app/models/<module>.py    -- New model
  app/services/<module>.py  -- New service
```

**0.2 Trace code paths for modified models.** If extending an existing model (e.g., User), find every file that imports or uses it: creation sites (init_db, seed scripts, test fixtures, routes), query sites (deps, services), dependency sites (schemas, serializers, frontend types). Update all of them — not just the model.

**0.3 Read all approved design artifacts:**
- `docs/architecture.md` §3 + §4 — integration + migration concerns
- `docs/db-design.md` — source of truth for model definitions (never reinvent schema)
- `docs/api-spec.md` — source of truth for routes (match paths, methods, response shapes exactly)

## Code Structure

Per `_shared/style-rules/fastapi-patterns.md` — the canonical FastAPI layout:

```
backend/app/
├── api/
│   ├── main.py                 # router registration
│   ├── deps.py                 # SessionDep, CurrentUser, RBAC
│   └── routes/<module>.py      # route handlers
├── models/<module>.py          # SQLModel tables
├── schemas/<module>.py         # Pydantic request/response
├── services/<module>.py        # business logic
└── core/
    ├── config.py
    ├── security.py
    └── db.py
```

Import style + Field patterns mirror the boilerplate (`backend/app/models/user.py`).

## Workflow

1. **Step 0 Discovery** (above).
2. **Models** — create SQLModel classes per `docs/db-design.md`. Soft-delete + audit fields per `sqlmodel-patterns.md`. Enums with display-name mapping.
3. **Schemas** — Pydantic request/response shapes per `docs/api-spec.md`. Validation mirrors the frontend Zod schema (mirror flag in api-spec). See `fastapi-patterns.md`.
4. **Services** — business logic, RBAC enforcement with self-access bypass, soft-delete on mutation, side-channel fields populated (canEdit/canDelete/canAssign per `fastapi-patterns.md`).
5. **Routes** — handlers under `app/api/routes/<module>.py`. Trailing slashes on collections (`/users/`, not `/users`). `redirect_slashes=False` on the app. Scope enforcement on every list endpoint. Returns the updated resource on mutations (no follow-up GET).
6. **Register** router in `app/api/main.py`; register model in the relevant `__init__.py`.
7. **Seed** — add/extend `seed_phase_<N>()` in `backend/scripts/seed.py` with sample rows that cover the workflow-test-plan scenarios.
8. **Migration** — `alembic revision --autogenerate -m "phase <N>: <module>"`. Review the generated file: enum changes often miss (manually edit), FK ordering correct (parent first), `downgrade()` populated per `sqlmodel-patterns.md`.
9. **Lint + tests** — `bash scripts/lint.sh`, `bash scripts/test.sh`. Populate `evidence.build_output_tail` and `evidence.test_counts` in the return JSON.

## Anti-Stub Protocol (HARD GATE)

Per `_shared/style-rules/anti-stub-protocol.md`:
- **No placeholder routes.** Every endpoint is testable end-to-end against the real schema.
- **No mock data in production code paths.** Seeds belong in `backend/scripts/seed_*`, never in services or routes.
- **Validation mirrors the spec's mirror rules.** FE + BE both enforce.
- **Coverage gate:** every AC in the story's workflow test plan must be implementable via this module's code. Flag gaps in the completeness tracker slice.

A stub = any function returning hardcoded data in a path the UI or API calls. Zero tolerance.

## Rules

1. **Step 0 Discovery mandatory** — no code before inventory + path tracing + reading all 3 design artifacts.
2. **Derive from approved specs**, never reinvent. db-design is the SQLModel canon; api-spec is the route canon.
3. **Soft-delete only** — see `sqlmodel-patterns.md`. DELETE endpoints set `deleted_at`.
4. **Trailing slashes + `redirect_slashes=False`** — see `fastapi-patterns.md`. 307 redirects strip auth headers.
5. **Self-access bypass explicit** in RBAC. See `fastapi-patterns.md`.
6. **Side-channel response fields** (canEdit/canDelete/canAssign + temp-password-style one-shot returns) populated per api-spec. See `fastapi-patterns.md`.
7. **Enum display-name contract** — value + label in every response. See `fastapi-patterns.md` + `sqlmodel-patterns.md`.
8. **4-layer field exposure check** — new field visible at model, schema, route response, and workflow-test-plan expected state. Any missing layer = bug. See `fastapi-patterns.md`.
9. **Validation mirrors the FE Zod schema.** Rules flagged "mirror" in api-spec run both sides.
10. **Error envelope** `{ "error": { "code": "...", "message": "...", "field": "<optional>" } }`.
11. **Argon2 is a known bottleneck** — auth endpoints separated in perf tests. See `fastapi-patterns.md`.
12. **Migration rules** (B3/B5/B6) — reversible downgrade, enum changes manually edited, parent-before-child FK order. See `sqlmodel-patterns.md`.
13. **Pagination mandatory** — cursor-based `?cursor=&limit=`. Never offset.
14. **Boilerplate patterns honored** — import style, Field patterns match the existing boilerplate.
15. **No emoji in code or artifacts.**

## After Writing Code

1. Write all source files + register routes/models.
2. Write/extend `seed_phase_<N>()`.
3. `alembic revision --autogenerate`; inspect migration; populate `downgrade()`; hand-edit enum changes.
4. `bash scripts/lint.sh` + `bash scripts/test.sh`. Capture last ≤30 lines of each for `evidence.build_output_tail`.
5. Write `docs/phases/phase-<N>/backend-<module>.summary.md` (<300 words).
6. Write completeness-tracker slice at `docs/phases/phase-<N>/completeness-tracker-phase<N>-<module>.md`.
7. Write JSON return contract at `return_path` per `_shared/return-contract.md`:

```json
{
  "skill": "backend-writer",
  "unit": "<module>",
  "status": "done",
  "evidence": {
    "build_output_tail": "... last 30 lines of lint + test ...",
    "commands_run": ["bash scripts/lint.sh", "bash scripts/test.sh", "alembic upgrade head"],
    "test_counts": {"passed": 0, "failed": 0, "skipped": 0}
  },
  "files_written": ["backend/app/models/<module>.py", "..."],
  "files_modified": ["backend/app/api/main.py", "backend/scripts/seed.py"],
  "decisions": [
    { "scope": "<module>", "decision": "...", "rationale": "..." }
  ],
  "open_issues": []
}
```

Do NOT call `AskUserQuestion`.

## Downstream Consumers

- **`test-writer`** (post phase-verifier Stage 2) — reads this module's service + route code + story workflow-test-plan to generate unit/integration tests.
- **`phase-verifier`** Stage 1 — curls endpoints, scans OpenAPI doc against api-spec.
- **`quality-assurance`** — executes workflow-test-plan through preview against these endpoints.

Raw history + retros: `docs/retros/2026-04-corehr-v1.md`, `docs/retros/2026-04-20-retro-v2.md`. All rules folded into `_shared/style-rules/fastapi-patterns.md` + `sqlmodel-patterns.md` + `anti-stub-protocol.md`.

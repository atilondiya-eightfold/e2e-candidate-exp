---
name: architect
description: Use when screen designs from react-ux-designer are approved and the system needs a tech-stack decision, module breakdown, boilerplate integration notes, and build-phase plan. Runs in two passes (Pass 1 pre-DB/API, Pass 2 post-DB/API). Also triggers when the user says "design the system", "pick the tech stack", "plan the build phases", "define the modules", or when forger has no approved `architecture.md`.
---

# Architect

## Overview

Produces the system architecture foundation and, after database and API design are complete, the dependency-ordered build-phase plan. Runs inline in the forger parent thread in **two passes**.

- **Pass 1** (after screen designs approved): tech stack, module breakdown, boilerplate integration notes, migration concerns.
- **Pass 2** (after db-design and api-spec approved): build-phase plan referencing actual models, endpoints, and screens.

## When to Use

- After `react-ux-designer` produces approved screens — Pass 1.
- After both `db-architect` and `api-architect` produce approved artifacts — Pass 2.
- User explicitly requests architecture or phase planning.

## Pre-conditions

**Pass 1** (verify via forger):
- Domain doc approved
- MVP user stories approved
- Screen designs approved (React mock screens in `frontend/src/`)

**Pass 2** (verify via forger):
- Pass 1 approved
- `docs/db-design.md` approved
- `docs/api-spec.md` approved

If any missing, stop and flag the upstream artifact. Never proceed without approval.

## Pass 1 Workflow

### Section 1 — Tech Stack

Recommend the default Forge stack (aligned with the boilerplate). Adjust only if the domain doc captures a hard constraint.

| Layer | Default | Rationale |
|---|---|---|
| Frontend | Vite + React 19 + TypeScript | Aligned with `boilerplate/frontend` |
| Routing | TanStack Router (file-based) | Type-safe, code-split, convention-based |
| UI | ef-design-system (primary) + shadcn/Radix (fallback) + Tailwind CSS 4 | See `_shared/style-rules/ef-design-system.md` |
| State | TanStack Query + Zustand | Server + client state split; see `_shared/style-rules/react-patterns.md` |
| Backend | FastAPI (Python 3.10+) | Matches `boilerplate/backend` |
| ORM | SQLModel / SQLAlchemy | See `_shared/style-rules/sqlmodel-patterns.md` |
| Database | PostgreSQL | Relational, strong for reporting |
| Migrations | Alembic | Reversible; see sqlmodel-patterns |
| Auth | JWT (HS256) via PyJWT + Argon2 (pwdlib) | Per `_shared/style-rules/fastapi-patterns.md` |
| Background jobs | Celery + Redis (or ARQ) | Optional; add only if a story requires |
| File storage | S3-compatible | Optional |
| CI/CD | GitHub Actions | Standard |

### Section 2 — Module Breakdown

Derive module names from screens + stories — no fixed template. For each module document: route file (`backend/app/api/routes/<module>.py`), model file, service file, schema file, one-line purpose.

Present as a directory tree under `backend/app/`. See `_shared/style-rules/fastapi-patterns.md` for the FastAPI layout contract.

### Section 3 — Boilerplate Integration Notes

The project extends an existing boilerplate. Before writing this section, **read** (subagent will need these paths):
- `backend/app/models/user.py`, `backend/app/schemas/user.py`
- `backend/app/api/deps.py`, `backend/app/core/db.py`, `backend/app/core/security.py`
- `backend/app/api/main.py`, `backend/app/core/config.py`

For each module note: what exists, what is extended vs created new, and integration risks. Always document:
- **User Model**: current fields + enums, `init_db()` superuser, `is_superuser` behavior.
- **Auth/RBAC**: existing `get_current_active_superuser`, `OAuth2PasswordBearer` `tokenUrl`, how new role-based RBAC bridges `is_superuser`.
- **Migrations**: existing Alembic history, enum changes (autogenerate misses), FK ordering.
- **API Router**: registration in `app/api/main.py`.

### Section 4 — Migration Concerns

For each model that extends a boilerplate model, document what the current DB state is and what the migration must do. Flag: enum changes, new FKs to new tables (ordering), default changes, column renames or type changes. Reference `_shared/style-rules/sqlmodel-patterns.md` for migration rules.

### Delivery (Pass 1)

Use `AskUserQuestion` — never free-form "confirm":
- Tech stack: single-select (Approve / Customize / Different stack).
- Module scope: multi-select confirming in-scope modules.
- Boilerplate + migration review: single-select (Approve / Request changes / Discuss).

Order: show Section 1 → confirm → Section 2 → Section 3 + 4 together → write full doc.

Write `docs/architecture.md` (Sections 1–4). Hand off to **forger** for approval gate. Forger then proceeds to `db-architect`, then `api-architect`.

## Pass 2 Workflow

### Inputs

- `docs/architecture.md` (from Pass 1)
- `docs/db-design.md` (db-architect)
- `docs/api-spec.md` (api-architect)
- `docs/user-stories.md` + augmentation files under `docs/stories/<id>/story.md`
- Screen designs in `frontend/src/`

### Phase Design Rules

1. **Dependency order** — a phase can only reference models and APIs from its own phase or earlier.
2. **End-to-end slices** — each phase produces something demoable (a screen with real data).
3. **Foundation first** — auth, user management, base config in Phase 1.
4. **3–5 stories per phase.**
5. **Cross-cutting setup** — DB migrations, base models, shared middleware in Phase 1.
6. **Parallelizability** — flag which units within a phase are parallelizable (disjoint files / no shared migration / no shared frontend parent). Forger uses this to dispatch per `_shared/subagent-protocol.md`.

### Phase Plan Format

For each phase:

```markdown
### Phase N: [Name]
**Stories:** [IDs]
**DB Models:** [SQLModel classes from db-design.md]
**API Endpoints:** [Paths from api-spec.md]
**Frontend Screens:** [Screen/route names by persona]
**Depends on:** [Prior phase number, or "none"]
**Parallel units:** [List units that can run in parallel, per subagent-protocol rules]
**Verification focus:** [What phase-verifier checks this phase]
```

### Delivery (Pass 2)

Present phases one at a time with `AskUserQuestion`:
- Per phase: Approve / Adjust stories / Reorder.
- After all: Approve full plan / Revisit a specific phase.

## After Pass 2

1. Append the phase plan to `docs/architecture.md` as Section 5.
2. Write phase list to `context.json` under `build_phases[]`.
3. Set `current_build_phase` to 0 in `context.json`.
4. Hand off to **forger** for approval gate.
5. On approval, forger begins the phased build loop (Phase 1 `backend-writer` first).

## Rules

1. **Domain-agnostic.** Derive module, model, and endpoint names from screens + stories. No hardcoded domain entities in this skill.
2. **Incremental delivery.** Present work unit by unit; get feedback before proceeding.
3. **Research awareness.** Read `docs/market-research.md` before starting; reflect UX patterns in architecture choices.
4. **Enterprise depth.** Spec-level outputs, not summary-level. Think 5,000-person customer.
5. **No emoji in production artifacts.** Text labels and SVG icons only.
6. **Trailing slashes on routes.** `/users/` not `/users`. Set `redirect_slashes=False` on FastAPI. See `_shared/style-rules/fastapi-patterns.md`.
7. **Cite style-rules rather than restate.** If a rule lives in `_shared/style-rules/*.md`, reference it.

## After Completion

- `docs/architecture.md` written (Sections 1–4 after Pass 1; Section 5 after Pass 2).
- `context.json.build_phases[]` populated after Pass 2.
- User-approved via forger before any downstream skill proceeds.

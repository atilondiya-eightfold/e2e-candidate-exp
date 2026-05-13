# Candidate Prep

React app + FastAPI BFF that helps Eightfold candidates prep for their technical screens. The candidate reaches the app from a button on their PCS application page, gets a gap report against the role, can run an adaptive voice mock interview, and gets a personalized study plan based on their performance.

## Status

v0 scaffolding. The boilerplate is in place; screens, hooks, and BFF routes specific to candidate-prep are the next thing to build.

## Source of truth

- **Design spec:** `docs/specs/react-app-design.md`
- **User stories:** `docs/user-stories.md`
- **Visual mockups:** `docs/mockups/*.html` — open any in a browser (no server needed)
- **Backend spec** (the APIs we consume): `docs/backend-spec.md`
- **Provenance:** `PROVENANCE.md` records exactly which commits of `talent-forge` and `talent-forge-2` this repo was bootstrapped from.

## Stack

| Layer | Choice |
|---|---|
| Build | Vite 7 |
| Framework | React 19 + TypeScript 5.9 (strict) |
| Routing | TanStack Router (file-based) |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 |
| UI | shadcn/ui + Radix + Tailwind 4 |
| Forms | React Hook Form + Zod (wired by `ui-builder` skill) |
| Backend | FastAPI BFF proxy → Eightfold API v2 |
| Auth | Parent-signed `_eftf_session` cookie → BFF parses → mints per-user OAuth Bearer JWT |
| Deploy | Single Docker container (Render.com) |

## Dev quickstart

```bash
# 1. Backend
cd backend
uv sync
cp ../.env.example ../.env   # fill in real values
uv run uvicorn app.main:app --reload --port 8000

# 2. Frontend (new terminal)
cd frontend
pnpm install
pnpm dev   # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:8000` so frontend code calls relative paths.

## Building screens — the Claude workflow

We use the Forge skills (in `.claude/skills/`) to convert the locked HTML mockups into React.

1. Open the relevant mockup in `docs/mockups/`.
2. Invoke `react-ux-designer` — point it at the mockup file and the matching section of `docs/specs/react-app-design.md`. It produces an interactive React mock with shadcn components and mock data.
3. Review the React mock against the user stories in `docs/user-stories.md`.
4. Once approved, invoke `ui-builder` — it upgrades the mock in place with real API calls (TanStack Query hooks), React Hook Form + Zod validation, and tests.
5. Repeat per screen.

The orchestrator skill `forger` can drive the whole loop end-to-end.

## Conventions

- **Tone:** suggestive, never aggressive (NFR-2). Section headings use "Optional," "Suggested," "Recommended next." Never "you must," "required," "important."
- **Privacy:** prep data is never shared with interviewer or recruiter (NFR-1). Footer notes on hub and empty state state this explicitly.
- **Visual register:** Meta-style — white background, generous spacing, Meta-blue `#1877f2` for primary actions, pill buttons, soft tones in errors. `docs/mockups/empty-state-v2.html` is the canonical reference.
- **Copy strings:** centralize in one module from day one so a future i18n pass is a wrap, not a refactor (NFR-6).
- **No upstream sync:** this repo is a fork. `PROVENANCE.md` records where it came from; we don't pull from those sources again.

## Open work for the first dev session

1. Extend the BFF's `api-catalog.json` (or hand-write hooks) for the 9 Phase 2 candidate-prep v2 endpoints documented in `docs/backend-spec.md` §8.1.
2. Build the first screen — recommend starting with the **empty state** (`docs/mockups/empty-state-v2.html`) since it has no dependencies.
3. Wire the parent-cookie auth round-trip end-to-end using a dev tenant.

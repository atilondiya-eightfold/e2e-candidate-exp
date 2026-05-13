# Candidate Prep — Claude project conventions

This file is loaded automatically into every Claude Code session in this repo. Keep it short. Read it before doing anything.

## What this project is

A React app + FastAPI BFF that consumes Eightfold's candidate-prep v2 APIs and presents an adaptive interview-prep experience. Locked design + user stories + mockups all live under `docs/`.

## Source of truth — read these first

- `docs/specs/react-app-design.md` — the design spec
- `docs/user-stories.md` — acceptance criteria
- `docs/mockups/*.html` — the visual targets, open in a browser
- `docs/backend-spec.md` — the APIs we consume

## Project structure

- `frontend/` — React 19 + Vite + TanStack Router/Query + shadcn (from `talent-forge-2/headless-boilerplate`)
- `backend/` — FastAPI BFF proxy to Eightfold (from `talent-forge-2/headless-boilerplate`)
- `.claude/skills/` — Forge skills (from `talent-forge`). Use them. Don't reinvent.

## How to build a screen

1. Open the corresponding HTML mockup in `docs/mockups/`.
2. Invoke `react-ux-designer`, point it at the mockup + spec section. Output: interactive React mock with mock data.
3. Once approved, invoke `ui-builder`. Output: same screen with real API calls, forms, tests.
4. Never bypass this loop. Don't hand-write screens from scratch.

## Conventions

- **Tone:** suggestive, never aggressive. No "you must" / "required" / "important — do this now." Use "Optional," "Suggested," "Recommended next."
- **Privacy:** prep data is never shared with interviewer/recruiter. Surface this in UI footers on hub and empty state.
- **Visual register:** white bg, Meta-blue `#1877f2` accents, pill buttons, generous whitespace. `docs/mockups/empty-state-v2.html` is canonical.
- **Copy strings:** central module from day one (future i18n).
- **Errors:** soft tones (red/amber, never crimson), reference codes for support, no stack traces or HTTP codes shown to candidate, always two actions.

## What NOT to do

- Don't modify `.claude/skills/` files unless you're explicitly upgrading a skill — and even then, do it as a deliberate task, not as a side-effect of fixing something.
- Don't add new dependencies without checking what's already in `frontend/package.json`. shadcn covers most UI; Recharts + Nivo cover charts.
- Don't write a new state container. TanStack Query for server state, Zustand for client UI state, period.
- Don't expose Eightfold OAuth secrets in frontend code. They live in `.env`, never in browser context.

## Working with the existing boilerplate

The 40 pre-generated TanStack Query hooks under `frontend/src/features/eightfold-api/hooks/` cover Eightfold's general entity APIs. Our 9 Phase 2 candidate-prep endpoints are NOT in that catalog yet. Two paths to add them:
- (a) extend `api-catalog.json` and re-run `pnpm run gen:eightfold` (consistent with boilerplate pattern)
- (b) hand-write `useCandidatePrep*` hooks in `frontend/src/features/candidate-prep/hooks/`

We're deferring this decision to the first dev session — wait for the backend's api-catalog update before deciding.

## When in doubt

Read the spec. If the spec is silent, ask. Don't infer.

---
name: react-ux-designer
description: Use when approved user stories with workflow test plans exist and the project needs fully interactive React mock screens (production stack, mock data) for every persona — with PersonaSwitcher and StateDebugBar dev tooling. Runs as a one_shot subagent. Also triggers when the user says "design the screens", "build mock UI", "wireframe the flow", "mockup the screens", "show me the UI", or when forger has no approved screen set under `frontend/src/`.
---

# React UX Designer

## Overview

Designs complete interactive mock screens for every persona using the **production tech stack** — React 19 + TypeScript + ef-design-system + TanStack Router + Tailwind CSS 4 — with mock data and two dev-only toolbars (PersonaSwitcher, StateDebugBar). The components carry forward directly into production: `ui-builder` later swaps mock data for API hooks without a rebuild.

## When to Use

- After `story-writer` produces approved per-story augmentation files (including workflow test plans).
- Before `architect` Pass 1 — screen designs inform the data model and module structure.
- User says "design the screens" / "mockup the UI" / "show the flow" and no approved screens exist.

## Context Manifest

```yaml
unit_type: one_shot
required_inputs:
  - docs/domain-doc.md
  - docs/stories/**/story.md                 # all approved augmentation files (workflow test plans drive screen states)
  - docs/personas.md
  - frontend/                                 # existing boilerplate setup
required_reading:
  - .claude/skills/_shared/style-rules/ef-design-system.md
  - .claude/skills/_shared/style-rules/react-patterns.md
  - .claude/skills/_shared/style-rules/ui-fidelity-checklist.md
forbidden_paths:
  - docs/market-research.md                  # condensed in domain-doc
  - backend/                                 # designer never reads backend
  - docs/stories/raw/                        # use the approved augmentation, not raw
budget_tokens: 900000
outputs:
  - frontend/src/routes/
  - frontend/src/features/
  - frontend/src/components/dev/PersonaSwitcher.tsx
  - frontend/src/components/dev/StateDebugBar.tsx
  - frontend/src/mocks/data.ts
return_path: docs/react-ux-designer.return.json
```

Dispatch model: **Opus** (judgment-heavy: IA decisions, state machines, persona mapping, design-system interpretation). Forger owns the approval gate — do NOT call `AskUserQuestion` from this subagent. Return per `_shared/return-contract.md`.

## Pre-conditions

- Domain doc approved.
- All MVP stories approved with augmentation files (`docs/stories/<id>/story.md`).
- Personas confirmed.
- `frontend/` exists with boilerplate dependencies installed.

Missing any → return `needs_context`.

## Supporting Files (Read Before Building)

Detail docs for specific concerns — read the relevant one **before** building that kind of UI. Enforced rules, not suggestions.

| File | Covers |
|---|---|
| `information-architecture.md` | Top-nav default, persona scoping, eliminating redundant views |
| `component-selection.md` | Badge/pill colors, filter overflow, Sheet/Dialog rules, button hierarchy, card rules |
| `enterprise-patterns.md` | Action-oriented metrics, column pickers, inline editing, peer/multi-source data |
| `react-prototype-patterns.md` | Code patterns for AppShell, page components, ef-design-system, mock data, shared components |
| `responsive-design.md` | Required viewport tests (mobile/tablet/desktop), breakpoint reference |
| `localization.md` | Date/number/currency formatting; no hardcoded locale strings |

## Core Principle — Production Stack, Mock Data

Everything built with real stack. Only differences from production:

1. **Mock data** imported from `src/mocks/data.ts` instead of API calls.
2. **Dev tooling** (PersonaSwitcher + StateDebugBar) instead of real auth.
3. **No form validation** — placeholder forms without RHF/Zod yet (ui-builder adds).
4. **No business logic** — no optimistic updates, cache invalidation, retries.

Why React over HTML mocks: zero translation loss, real ef-design-system components consumed the production way from day one, code carries forward, instant Vite HMR preview, design-system compliance.

## Tech Stack (matches production exactly)

| Layer | Choice |
|---|---|
| UI | ef-design-system (primary) + shadcn/Radix fallback + Lucide icons + Material Symbols for StatCards (see `_shared/style-rules/ef-design-system.md`) |
| Framework | React 19, TypeScript 5.9 strict, Vite 7 |
| Routing | TanStack Router (file-based in `src/routes/`) |
| State | Zustand (client) + TanStack Query (later, post ui-builder) — see `_shared/style-rules/react-patterns.md` |
| Styling | Tailwind CSS 4 |

## Output Structure

```
frontend/src/
├── routes/                  # TanStack Router file-based routes
│   ├── __root.tsx           # AppShell + PersonaSwitcher + StateDebugBar
│   ├── login.tsx
│   └── <persona>/
│       ├── dashboard.tsx
│       └── <feature>/
├── features/                # feature modules (one per story cluster)
│   └── <feature>/
│       ├── components/
│       └── pages/
├── components/
│   ├── dev/                 # dev-only tooling
│   │   ├── PersonaSwitcher.tsx
│   │   └── StateDebugBar.tsx
│   └── shared/              # app-wide shared components
├── mocks/
│   └── data.ts              # all mock data, one source
└── store/                   # Zustand stores (currentPersona, appState flags)
```

## Dev Tooling Components

**`PersonaSwitcher`** — floating top-right. Lists every persona from `docs/personas.md`. Click → Zustand `currentPersona` updates; routes re-render with that persona's scope. Persists to `localStorage` with `:v1:persona` key (version-prefixed per `_shared/style-rules/react-patterns.md`). Writes MUST use `store.getState()` inside mutation callbacks — never closure capture (same ref).

**`StateDebugBar`** — floating bottom. Toggle pills for `appState` flags (empty, loading, error, populated, permission-denied). Clicking a pill sets the flag; pages read from the store to render the matching state. Persona sync atomic: both Zustand and localStorage written in the same handler.

Both components are rendered only when `import.meta.env.DEV` is true. Removal in the production build is the responsibility of **ui-builder** Phase 0 (see `_shared/style-rules/anti-stub-protocol.md`).

## Design Scope — Derive Everything from Stories

Every screen traces to at least one approved story. Use §3 Screen Inventory from each augmentation file. For each screen, build all states in the Workflow Test Plan:
- Empty
- Loading
- Populated (happy path)
- Error
- Permission-denied (if RBAC gates the screen)

Screens not in any story = not in the mock set.

## Mock Data

One source: `src/mocks/data.ts`. Structure:

```ts
export const personas = {/* from docs/personas.md */};
export const mockUsers = [/* enough variety to demo every persona view */];
export const mockByEntity = {/* per-story entities */};
```

Rules:
- Enum values = SCREAMING_SNAKE_CASE with display-name mapping (match eventual DB contract).
- Deterministic (fixed IDs, fixed timestamps) so screenshot diffs are stable for phase-verifier.
- Cover every state (empty arrays, error objects, permission-denied users).

## ef-design-system Rules (canonical)

**Read `_shared/style-rules/ef-design-system.md` in full before first component use.** Key rules cited here for awareness:

- **Badge/Pill**: default variant renders black on Tailwind 4. Always pass a semantic variant (`success | warning | error | info | neutral`). Never rely on defaults.
- **StatCard icons**: Material Symbols, not Lucide.
- **Button variant precedence**: `primary > secondary > ghost`. Every interactive button has an `onClick` or `type="submit"`. Orphan buttons (no handler, no type) fail the `ui-fidelity-checklist`.
- **Active states**: every interactive element must visually differ across hover / focus / active / disabled.
- **Tailwind 4 color classes**: use design-token variables, not raw utility classes for semantic color.

Raw history: `docs/retros/2026-04-corehr-v1.md` (+ `docs/retros/apex-perf-lessons.md` — the apex-perf learnings are folded into `ef-design-system.md`).

## Routing Convention

```
src/routes/
  __root.tsx                    # layout wrapper + dev tools + auth guard stub
  index.tsx                     # "/" landing (redirects by persona)
  login.tsx                     # auth screen (mock form)
  ic/
    dashboard.tsx               # IC home
    <feature>/
      index.tsx                 # list
      $id.tsx                   # detail
      new.tsx                   # create form
  manager/
    team.tsx
    <feature>/...
  admin/
    <feature>/...
```

Route params and navigation use TanStack Router's typed API — no `window.location` or manual path strings. See `_shared/style-rules/react-patterns.md`.

## Execution Order

1. Read all required inputs including every approved story augmentation.
2. Inventory personas → wire PersonaSwitcher + store.
3. Build AppShell + dev tools.
4. Build per-persona dashboards first (anchors the IA).
5. Build per-feature pages: list → detail → create/edit, one feature at a time.
6. For each page: populate all workflow-test-plan states (empty/loading/error/populated/permission-denied).
7. Populate `mocks/data.ts` incrementally as needed.
8. Smoke-check: `pnpm run dev` starts, every route renders at every persona × every state with no console errors.
9. Write the return JSON with evidence (routes built count, persona count, console scan clean).

## Interactive Delivery

Forger controls the approval gate. This subagent does not call `AskUserQuestion`. On completion, forger opens the browser preview and walks the user through per-persona scripted flows; user approves inline.

## Rules

1. **Derive, never invent.** Every screen/component traces to an approved story augmentation section.
2. **Workflow-test-plan drives state coverage.** If the plan enumerates 5 states for a screen, build all 5.
3. **ef-design-system first, shadcn as fallback.** See `ef-design-system.md`.
4. **Every button has a handler or type.** Orphans are a retro-documented bug class — zero tolerance.
5. **Zustand mutations use `getState()`.** Closure capture in mutation callbacks = stale reads. See `react-patterns.md`.
6. **`useState` initializer for async/expensive init.** Never `useState(promise)`. See `react-patterns.md`.
7. **localStorage keys versioned `:v1:`** — bump on schema change. See `react-patterns.md`.
8. **Persona sync atomic** — Zustand + localStorage written in the same handler.
9. **Active-state audit mandatory.** Every interactive element renders distinct hover/focus/active/disabled states.
10. **Mock data is deterministic.** Fixed IDs, fixed timestamps. Screenshot diffs must be stable.
11. **Dev tooling in `components/dev/`** gated on `import.meta.env.DEV`. ui-builder removes in Phase 0.
12. **Responsive tests required** — mobile/tablet/desktop per `responsive-design.md`.
13. **No emoji in production artifacts.** Text labels + SVG icons.
14. **Cite style-rules rather than restate.** `_shared/style-rules/*.md` is canon.

## After Completion

Return JSON (see `_shared/return-contract.md`):

```json
{
  "skill": "react-ux-designer",
  "unit": "one_shot",
  "status": "done",
  "evidence": {
    "commands_run": ["pnpm run dev (smoke)", "pnpm run build"],
    "routes_count": 42,
    "personas_count": 4,
    "features_count": 8,
    "console_errors_scan": "clean",
    "states_covered": ["empty", "loading", "error", "populated", "permission_denied"]
  },
  "files_written": ["frontend/src/routes/...", "frontend/src/features/...", "frontend/src/mocks/data.ts", "frontend/src/components/dev/PersonaSwitcher.tsx", "frontend/src/components/dev/StateDebugBar.tsx"],
  "decisions": [
    { "scope": "IA", "decision": "top-nav with persona-scoped route groups", "rationale": "..." }
  ]
}
```

## What Carries Forward to ui-builder

- Every component and route stays — `ui-builder` replaces mock data with TanStack Query, adds RHF/Zod validation, removes dev tooling in Phase 0, wires real auth.
- `mocks/data.ts` becomes the test fixture library for `test-writer`.
- Workflow test plan states (empty/loading/error/populated) become the Storybook-like coverage matrix for `phase-verifier` Stage 2/3.

Raw history + retros: `docs/retros/2026-04-corehr-v1.md`, `docs/retros/2026-04-20-retro-v2.md`, `docs/retros/apex-perf-lessons.md`. Canonical rules folded into `_shared/style-rules/ef-design-system.md` + `react-patterns.md` + `ui-fidelity-checklist.md`.

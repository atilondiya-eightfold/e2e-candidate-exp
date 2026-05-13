---
name: ui-builder
description: Use when react-ux-designer screens are approved, api-spec is approved, and one or more frontend feature clusters need upgrading from mock data to production (TanStack Query hooks, RHF+Zod validation, real JWT auth, dev-toolbar removal). Dispatched per feature cluster. Also triggers when the user says "wire up the APIs", "upgrade the mock UI", "connect to the backend", "make the UI production-ready", "add form validation", or when forger assigns a ui-builder unit.
---

# UI Builder

## Overview

Upgrades React mock screens (produced by react-ux-designer) to production by wiring TanStack Query API hooks, adding React Hook Form + Zod validation, replacing mock auth with real JWT, and removing dev tooling. One feature cluster (2–4 related screens) per subagent dispatch. Style rules live in `_shared/style-rules/*.md` — cite, don't restate.

## When to Use

- Forger dispatches a ui-builder unit for the current build phase.
- User asks to wire up APIs or make the UI production-ready.

## Context Manifest

```yaml
unit_type: feature_cluster
required_inputs:
  - docs/architecture.md
  - context.json#build_phases[current]
required_reading:
  - .claude/skills/_shared/style-rules/react-patterns.md
  - .claude/skills/_shared/style-rules/ef-design-system.md
  - .claude/skills/_shared/style-rules/anti-stub-protocol.md
per_unit_inputs:
  - docs/api-spec.md#<unit>
  - docs/stories/<story-id>/story.md           # augmentation files for cluster stories
  - frontend/src/features/<unit>/              # mock screens to upgrade
forbidden_paths:
  - docs/market-research.md
  - docs/user-stories.md                         # use per-story augmentation
  - backend/                                     # ui-builder never reads backend
  - docs/stories/raw/                            # raw immutable; use augmentation
  - docs/stories/<other-cluster-id>/             # other clusters' stories
conditional_loads: []
budget_tokens: 900000
outputs:
  - frontend/src/features/<unit>/api.ts
  - frontend/src/features/<unit>/index.ts        # barrel; concrete filenames reported in files_written
return_path: docs/phases/phase-<N>/ui-<unit>.return.json
```

Dispatch model: **Sonnet**. Escalate to Opus only on `blocked`.

## Running as a Subagent

Forger passes `UNIT:` (e.g., `goals`, `reviews`), `LOAD THESE FILES:` list, `PRIOR DECISIONS:` from sibling ui-builder dispatches this phase, `CONTEXT BUDGET:`. Do NOT call `AskUserQuestion` — use `status: blocked` to signal.

## Pre-conditions

- Approved react-ux-designer output under `frontend/src/features/<unit>/` with mock data.
- Approved `docs/api-spec.md` for the cluster's endpoints.
- Approved workflow test plans in each story's augmentation file.
- Backend-writer has produced routes for this cluster (phase-verifier Stage 1 PASS).

## Upgrade Phases — Three Passes

The upgrade is ordered; skipping a pass leaves the cluster broken.

### Phase 0 — API Layer Foundation + Dev-Toolbar Removal (MANDATORY FIRST)

Per `_shared/style-rules/anti-stub-protocol.md`: **dev-toolbar removal belongs in Phase 0, not Phase 2.**

1. Read the cluster's endpoints from `docs/api-spec.md`.
2. Generate `frontend/src/features/<unit>/api.ts` with:
   - TanStack Query hooks (`useQuery`, `useMutation`) per endpoint.
   - Axios instance configured with JWT bearer token from auth store.
   - Trailing slashes on every path (`"/api/v1/goals/"`). Verify: `grep -rn 'api\.' src/features/<unit>/ | grep '"/' | grep -v '/"'` returns nothing.
3. Remove PersonaSwitcher + StateDebugBar imports from cluster components.
4. Remove mock-data imports from cluster components; point at `api.ts` hooks instead.
5. Remove `:v1:persona` dev localStorage fallback reads — real auth drives `currentUser`.

### Phase 1 — Query + Mutation Wiring

1. Replace every mock-data usage with TanStack Query hooks.
2. Query retry: **never retry on 401/403** (infinite loop on auth failure). See `_shared/style-rules/react-patterns.md`.
3. Mutations return the updated resource — no follow-up GET. See `_shared/style-rules/fastapi-patterns.md`.
4. Optimistic update (where safe) — rollback on error.
5. Loading / error / empty states tied to the workflow test plan's expected states.

### Phase 2 — Forms + Validation + Unit Tests

1. React Hook Form + Zod schema per form. Zod schema mirrors the backend Pydantic shape (api-spec validation mirror contract).
2. Field-level errors from server errors: map `{ error: { field, message } }` to `setError(field, ...)`.
3. Disabled state on submit during pending; re-enable on settled.
4. Unit tests for non-trivial reducers / selectors / form helpers (Vitest + RTL). Keep E2E for test-writer (post Stage 2).

## Critical Conventions (cited from `_shared/style-rules/`)

From `react-patterns.md`:
- **Zustand in mutation callbacks via `store.getState()`.** Closure capture = stale reads.
- **`useState(() => init())` for async/expensive init.** Never `useState(promise)`.
- **TanStack Query no-retry on 401/403.**
- **localStorage keys versioned `:v1:`** — bump on schema change.
- **Persona sync atomic** — Zustand + localStorage in one handler.
- **`useNavigate` for programmatic routing**, never `window.location`.
- **4-layer field exposure check** — new field visible at DB model → SQLModel schema → API response → UI component. Missing any = bug.

From `ef-design-system.md`:
- **Badge/Pill semantic variant mandatory.** Default variant renders black on Tailwind 4.
- **StatCard icons = Material Symbols.**
- **Button variant precedence** primary > secondary > ghost; every button has `onClick` or `type="submit"`.
- **Active states** distinct across hover/focus/active/disabled.

From `anti-stub-protocol.md`:
- No placeholder UI paths — every screen has real data flow.
- Dev-toolbar removal is Phase 0, not Phase 2.

## Rules

1. **Trailing slashes mandatory** on every API path. Verify before return.
2. **Phase 0 removes dev tooling**, not Phase 2.
3. **No mock-data imports** in production builds after Phase 0.
4. **Zod mirrors Pydantic** — mirror-flag rules run on both sides.
5. **Retry rules: no retry on 401/403.** See `react-patterns.md`.
6. **4-layer field exposure check** before claiming done. See `react-patterns.md`.
7. **Zustand mutations use `getState()`.** See `react-patterns.md`.
8. **Badge/Pill semantic variants.** See `ef-design-system.md`.
9. **Every button has a handler or `type`.** Orphan buttons fail `ui-fidelity-checklist`.
10. **Workflow test plan drives state coverage** — empty/loading/error/populated/permission-denied per story.
11. **Preview smoke pass before return:** `pnpm run dev` up, cluster screens reachable, no console errors. Populate evidence.
12. **No emoji in code or artifacts.**

## After Writing Code

1. Write all source files.
2. `pnpm run lint` + `pnpm run build` + `pnpm run test:unit` for the cluster.
3. `preview_start`, `preview_click` through the cluster's happy-path workflow test plan, `preview_console_logs`, `preview_network` — populate evidence.
4. Write `docs/phases/phase-<N>/ui-<unit>.summary.md` (<300 words).
5. Write completeness-tracker slice at `docs/phases/phase-<N>/completeness-tracker-phase<N>-<unit>.md`.
6. Write return JSON at `return_path`:

```json
{
  "skill": "ui-builder",
  "unit": "<cluster>",
  "status": "done",
  "evidence": {
    "build_output_tail": "...",
    "commands_run": ["pnpm run lint", "pnpm run build", "pnpm run test:unit", "preview smoke"],
    "test_counts": {"passed": 0, "failed": 0, "skipped": 0},
    "screenshot_paths": ["<path-per-screen-state>"]
  },
  "files_written": ["frontend/src/features/<unit>/api.ts", "frontend/src/features/<unit>/..."],
  "files_modified": ["frontend/src/routes/..."],
  "decisions": [ {"scope": "<cluster>", "decision": "...", "rationale": "..."} ],
  "open_issues": []
}
```

Do NOT call `AskUserQuestion`.

## Downstream Consumers

- **`phase-verifier`** Stage 2/3 — executes the cluster's workflow test plan through preview.
- **`test-writer`** (post Stage 2) — generates E2E tests from the workflow test plan.
- **`quality-assurance`** — cross-persona regression via preview.

Raw history: `docs/retros/apex-perf-lessons.md`, `docs/retros/2026-04-corehr-v1.md`. Rules folded into `_shared/style-rules/react-patterns.md` + `ef-design-system.md` + `anti-stub-protocol.md`.

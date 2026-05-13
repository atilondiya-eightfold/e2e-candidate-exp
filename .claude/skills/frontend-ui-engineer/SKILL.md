---
name: frontend-ui-engineer
description: Use when the project needs greenfield React UI work (components, pages, dashboards, tables, forms, wizards, approval workflows) built directly in `frontend/` with ef-design-system primary + shadcn fallback + TanStack + Zustand + RHF/Zod + Tailwind 4 + TypeScript strict. Dispatched per feature cluster. Also triggers when the user says "build the UI", "create a component", "implement screens", "build a dashboard", "data table", "form", "wizard", "approval workflow", or any React UI request naming ef-design-system, shadcn, Tailwind, TanStack Query, Zustand, RHF, Zod, or Recharts.
---

# Frontend UI Engineer

## Overview

Senior-engineer role: builds React 19 + TypeScript frontends in `frontend/` with production conventions so every component, hook, and page is structurally identical across sessions. Greenfield companion to `ui-builder` (which upgrades existing mock screens). Style canons live in `_shared/style-rules/*.md` — cite, don't restate.

## When to Use

- Forger dispatches a frontend-ui-engineer unit for the current build phase.
- User asks to build UI components / pages / dashboards / forms / tables in `frontend/` from scratch.

## Context Manifest

```yaml
unit_type: feature_cluster
required_inputs:
  - docs/architecture.md
  - context.json#build_phases[current]
required_reading:
  - .claude/skills/_shared/style-rules/ef-design-system.md
  - .claude/skills/_shared/style-rules/react-patterns.md
  - .claude/skills/_shared/style-rules/ui-fidelity-checklist.md
  - .claude/skills/_shared/style-rules/anti-stub-protocol.md
per_unit_inputs:
  - docs/api-spec.md#<unit>
  - docs/stories/<story-id>/story.md
  - frontend/src/                              # existing structure
forbidden_paths:
  - docs/market-research.md
  - docs/user-stories.md
  - backend/
  - docs/stories/raw/
  - docs/stories/<other-cluster-id>/
budget_tokens: 900000
outputs:
  - frontend/src/features/<unit>/
  - frontend/src/routes/<unit>/
return_path: docs/phases/phase-<N>/frontend-ui-<unit>.return.json
```

Dispatch model: **Sonnet**.

## Where to Write Code

All code goes in **`frontend/`** at the repo root. Do not create a separate frontend tree. Boilerplate IS the project after `cp -R boilerplate/frontend frontend`.

The boilerplate already includes:
- `src/components/ef-design-system/` — 27 Eightfold components (**primary**)
- `src/components/ui/` — 55 shadcn/ui primitives (**secondary**)
- Vite 7, TanStack Router, Tailwind CSS 4, react-i18next, Zustand, RHF + Zod
- `tsconfig.json` with `@/` alias

Before writing, verify: `cd frontend && pnpm install && pnpm run build`.

## Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript strict (noUncheckedIndexedAccess) |
| Build | Vite 7 (Node 22.12+; `.nvmrc` = 22) |
| UI | ef-design-system (primary) + shadcn/ui (secondary) |
| Styling | Tailwind CSS 4 — design tokens, no raw hex |
| Data | TanStack Query v5 (server) + Zustand (UI-only client state) |
| Forms | React Hook Form + Zod — schema-first |
| Tables | ef-design-system DataTable |
| Charts | Recharts |
| Icons | Lucide (general) + Material Symbols (StatCards) |
| Routing | TanStack Router (file-based in `src/routes/`) |
| i18n | react-i18next |
| HTTP | axios single shared instance |

## Component Resolution (ef-design-system primary)

Decide per component. Check `src/components/ef-design-system/` first. Use shadcn only when ef-ds doesn't have it.

Critical rules from `_shared/style-rules/ef-design-system.md`:
- **Badge/Pill** — always pass a semantic variant (`success | warning | error | info | neutral`). Default renders black on Tailwind 4.
- **StatCard icons** — Material Symbols, not Lucide.
- **Button variant precedence** — primary > secondary > ghost. Every button has `onClick` or `type="submit"`.
- **Active states** distinct across hover/focus/active/disabled.

## Project Structure

```
frontend/src/
├── routes/<cluster>/        # TanStack Router file-based
├── features/<cluster>/      # feature modules
│   ├── api.ts               # TanStack Query hooks
│   ├── components/
│   └── pages/
├── components/shared/       # cross-cluster shared
├── store/                   # Zustand stores
├── lib/                     # utilities, axios, i18n
└── types/
```

## Build Sequence per Cluster

1. **Types** — Zod schema + inferred TS types. Mirrors Pydantic shape (api-spec mirror rules).
2. **API hooks** — `api.ts` with `useQuery`/`useMutation`. Trailing slashes on paths. No retry on 401/403. See `_shared/style-rules/react-patterns.md`.
3. **Components** — dumb + smart split. ef-design-system primary. Every button has handler.
4. **Pages** — route file imports feature components. Handles loading/error/empty/populated/permission-denied states per the story's workflow test plan.
5. **Routing** — TanStack Router file-based; programmatic navigation via `useNavigate()`, never `window.location`.
6. **Forms** — RHF + Zod schema per form. Server errors mapped via `setError`. Submit disabled during pending.
7. **Tests** — unit tests for non-trivial logic with Vitest + RTL. E2E deferred to test-writer (post Stage 2).

## The Axios Instance

Single shared instance in `lib/axios.ts` with:
- `baseURL: "/api/v1"`
- Request interceptor: JWT bearer from auth store.
- Response interceptor: 401 → clear auth + redirect to `/login`; 403 → no retry (rendered as "permission denied" state).

## TypeScript Conventions

- `strict: true`, `noUncheckedIndexedAccess: true`.
- No `any`. `unknown` + narrow.
- Explicit return types on exported functions.
- camelCase vars, PascalCase types + components, `useXxx` hooks, `${Component}Props` prop interfaces.

## TanStack Query Pattern

```ts
export const useGoal = (id: string) =>
  useQuery({
    queryKey: ['goal', id],
    queryFn: () => api.get<Goal>(`/goals/${id}/`).then((r) => r.data),
    retry: (failureCount, err) => {
      const status = (err as AxiosError)?.response?.status;
      if (status === 401 || status === 403) return false;   // see react-patterns.md
      return failureCount < 3;
    },
  });
```

Mutations use `queryClient.invalidateQueries` after success; optimistic updates roll back on error.

## Four Mandatory Data States

Every list/detail screen renders:
1. Loading (skeleton or spinner from ef-design-system)
2. Empty (illustration + call-to-action)
3. Error (message + retry)
4. Populated (happy path)

Plus permission-denied when the cluster is RBAC-gated (5th state).

## Form Pattern

RHF + Zod. Schema colocated with form. Submit disabled during pending. Server field errors mapped back.

## Accessibility Baseline

- Icon-only buttons have `aria-label`.
- Focus-visible rings on every interactive element.
- Form labels tied via `htmlFor`.
- Contrast ≥ 4.5:1 for body text.

## Pre-Completion Checklist

Before return:

- [ ] Every button has `onClick` or `type="submit"`.
- [ ] Badge/Pill variants semantic, never default.
- [ ] StatCard icons Material Symbols.
- [ ] `pnpm run lint` passes zero-warning.
- [ ] `pnpm run build` passes.
- [ ] `pnpm run test:unit` passes.
- [ ] `preview_start` + click-through the cluster's happy-path workflow test plan; `preview_console_logs` clean; `preview_network` scan clean.
- [ ] 4-layer field exposure check for every new field.
- [ ] localStorage keys version-prefixed `:v1:`.
- [ ] Zustand mutation callbacks use `getState()`.
- [ ] `useState` initializer for async/expensive init.
- [ ] Responsive tests passed (mobile/tablet/desktop per `react-ux-designer/responsive-design.md`).

## Rules

1. **ef-design-system first, shadcn fallback.** See `ef-design-system.md`.
2. **No raw hex values.** Use design tokens.
3. **TanStack Query no-retry on 401/403.** See `react-patterns.md`.
4. **Zustand mutations use `getState()`.** Closure capture = stale reads.
5. **`useState` initializer for async/expensive init**, not `useState(promise)`.
6. **TanStack Router `useNavigate()`**, never `window.location`.
7. **Trailing slashes on API paths** (`/goals/`).
8. **4-layer field exposure check** for every new field — model → schema → response → UI.
9. **localStorage keys versioned `:v1:`** — bump on schema change.
10. **Persona sync atomic** — Zustand + localStorage written in the same handler.
11. **Badge/Pill semantic variants** — never rely on defaults.
12. **StatCard icons Material Symbols.**
13. **Every button has `onClick` or `type="submit"`.**
14. **Active states distinct** across hover/focus/active/disabled.
15. **No emoji in code or artifacts.**

## After Writing Code

Same as ui-builder: lint + build + unit tests + preview smoke → evidence → completeness-tracker slice → summary → return JSON.

```json
{
  "skill": "frontend-ui-engineer",
  "unit": "<cluster>",
  "status": "done",
  "evidence": {
    "build_output_tail": "...",
    "commands_run": ["pnpm run lint", "pnpm run build", "pnpm run test:unit", "preview smoke"],
    "test_counts": {"passed": 0, "failed": 0, "skipped": 0},
    "screenshot_paths": ["..."]
  },
  "files_written": ["frontend/src/features/<unit>/..."],
  "decisions": [],
  "open_issues": []
}
```

Do NOT call `AskUserQuestion`.

Raw history: `docs/retros/apex-perf-lessons.md`, `docs/retros/2026-04-corehr-v1.md`, `docs/retros/2026-04-20-retro-v2.md`. All rules folded into `_shared/style-rules/ef-design-system.md` + `react-patterns.md` + `ui-fidelity-checklist.md` + `anti-stub-protocol.md`.

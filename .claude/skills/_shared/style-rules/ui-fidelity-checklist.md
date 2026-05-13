# UI Fidelity Checklist — 10-Point Screen Check

**Purpose:** the single canonical screen-quality scorecard used by phase-verifier and quality-assurance. A screen must score ≥90% AND pass every active-state probe to ship. Below 90% = phase FAILS.

---

## 1. Weighted Scorecard (100 Points)

| Category | Weight | Points | What It Covers |
|----------|--------|--------|----------------|
| **Layout** | 40 | 40 | Layout shell present, nav items, page title, grid structure, table columns, form sections, overall spacing |
| **Colors** | 20 | 20 | ef-design-system tokens used, no raw `bg-*-100` classes, badge variants semantic, status colors correct |
| **Typography** | 20 | 20 | Font family (Gilroy), sizes match tokens, weights correct, no raw i18n keys |
| **Interactive States** | 20 | 20 | Hover / focus-visible / active / disabled all distinct, buttons have handlers, loading/error/empty render |
| **TOTAL** | | **100** | |

Minimum pass: **≥90%**. Any BLOCKER-class failure auto-fails regardless of score.

## 2. The 10 Points

| # | Check | Weight | How to Verify |
|---|-------|--------|---------------|
| 1 | **Layout alignment** matches Figma / react-ux-designer output — shell (topnav or sidebar) present, page title + subtitle, grid/card structure, primary action button placement | 15 | Side-by-side screenshots; BLOCKER if shell missing |
| 2 | **Color palette** uses ef-design-system tokens; no Tailwind 4 palette utilities (`bg-blue-100`); badges use semantic variants (outline/secondary/destructive/ghost), never `default` for status | 10 | Grep `bg-\w+-\d+` and `Badge variant="default"` in routes |
| 3 | **Typography** — family (Gilroy via `--typography-*` vars), sizes from design tokens, weights correct, headings hierarchical, no raw i18n keys (`admin.dashboard.title`) visible | 10 | Inspect a heading and a body line per screen |
| 4 | **Icons** — StatCard uses Material Symbols names (underscore, not hyphen); no Lucide names in StatCard; icon-only buttons have `aria-label` | 5 | Grep StatCard `icon=` values; inspect text-looking icons |
| 5 | **Buttons** — every `<Button>` has `onClick` / `type="submit"` / `disabled` / wraps Link or DialogTrigger; action-verb buttons (Save, Submit, Export, Delete, Approve, Reject) call a real mutation or navigation | 10 | Handler-depth audit, see Rule 5 below |
| 6 | **Forms** — labels on every field, validation messages show on error, disabled states for submit-until-valid, required markers, field errors clear on change | 15 | Fill invalid, check inline errors; submit empty |
| 7 | **Spacing / padding** — Tailwind scale consistent, no cramped or overly spaced sections, card gaps match tokens | 5 | Visual compare vs prototype |
| 8 | **Shadows / borders** — ef-ds tokens only, rounded radii from `--radius-*`, card shadows not ad-hoc | 5 | Inspect card and modal |
| 9 | **Animations / transitions** — hover transitions present on buttons/rows, drawer/modal slide, no jarring flashes | 5 | Hover each interactive element |
| 10 | **Accessibility** — focus-visible ring on keyboard tab, icon-only buttons have `aria-label`, color contrast ≥ WCAG AA, live regions announce toast/errors | 20 | Tab through the screen; run axe or Lighthouse a11y |

## 3. Screen Inventory Check — Before Scoring

Before scoring ANY screen, enumerate every screen the phase promised to build:

1. Read `context.json` → `build_phases[N].frontend_screens`
2. For each expected screen: does the page file exist? Does a route exist? Is it reachable from nav?
3. Output the inventory table:

```
SCREEN INVENTORY — Phase N
| # | Expected Screen      | Page File | Route | Nav Link | Status  |
|---|---------------------|-----------|-------|----------|---------|
| 1 | CyclesListPage      | YES       | YES   | Sidebar  | OK      |
| 2 | CycleCreateWizard   | NO        | NO    | —        | MISSING |
```

Any `MISSING` = automatic phase FAIL. No scoring proceeds until the inventory is complete.

## 4. Critical Journey Mandate

Every phase declares ONE critical user journey (derived from the primary story's acceptance criteria). Example:

> Phase 2 IC journey: Login via /login → IC dashboard → click "Continue" on self-reflection → form renders template sections → fill text question → Save Draft → reload → draft persisted → Submit → status = Submitted.

If the critical journey cannot complete end-to-end through the UI, the phase FAILS regardless of all other checks passing. Run it FIRST in integration, before the 10-point sweep.

## 5. Active-State Audit — 4-Step Probe Per Screen

Every list screen passes ALL four probes before sign-off. Skipping this produced 5 of 35 false-positive gaps on COREHR-001..007.

1. **Apply a filter** → active-filter chips + Clear All + URL query-param sync
2. **Select a row** → bulk action bar appears with selection count, actions, Clear
3. **Filter to 0 rows** → "empty-filtered" state shown (distinct from "no data yet")
4. **Reload page** → state persists (localStorage versioned `:vN:` or URL)

For interactive elements: verify hover, focus-visible, active/selected, and disabled render as visually distinct states. Opacity for disabled is 0.3, not 0.5.

## 6. Clickability Audit — "Every Action Button Must Be Clicked"

onClick presence is not enough. The handler depth audit classifies every handler:

| Pattern | Verdict |
|---------|---------|
| `.mutate()` / `.mutateAsync()` from TanStack mutation | REAL |
| `navigate()` or `<Link>` | REAL |
| Opens dialog whose form submits to an API | REAL |
| Dialog with only a Close button / no API | STUB |
| Only calls `setState` with no API downstream | STUB |
| `console.log` / `alert` / empty `() => {}` | STUB |

Action-verb buttons (Save, Submit, Export, Send, Create, Delete, Approve, Reject) MUST be REAL. Any STUB = BLOCKED. Pure UI toggles (tabs, accordions) are acceptable as local state.

## 7. Runtime Evidence — No "Looks Good" Claims

A phase cannot pass on static review alone. Every screen ships with:

- **Screenshots** — prototype side-by-side with built app, both captured in the verification report
- **Console log scan** — `preview_console_logs` level=error returns zero unhandled errors
- **Network scan** — `preview_network` filter=failed returns zero 4xx/5xx responses
- **Error-text scan** — page body contains no "not found", "error", "404", "403", "500", "something went wrong", or "undefined"

Static review produces ~40% false positives on this codebase. Every bug candidate from static review MUST have a screenshot or curl/log before going into the fix queue.

## 8. Scoring Procedure

1. Generate screenshots: prototype + built app
2. Run the 10-point checklist; each item PASS (full weight) or FAIL (0)
3. Score = (points earned / applicable total) × 100 — skip N/A items and adjust denominator
4. Classify any failure: BLOCKER / CRITICAL / MINOR
   - **BLOCKER** — missing layout, page errors, form doesn't render, raw i18n keys, crash → auto-FAIL the screen
   - **CRITICAL** — wrong columns, missing button, wrong colors → 2+ on a screen = FAIL
   - **MINOR** — spacing, font-weight, border radius — noted, doesn't block
5. <90% or any BLOCKER → hand list to builder, re-score ALL screens after fixes (regressions happen)

## 9. Critical Bugs To Catch

Phase-verifier and QA specifically probe for these (each caused ≥1 v1 regression):

1. Trailing-slash 307 (browser 401 but curl works) — grep `api\.` for paths without `/`
2. Dev toolbar blocking real auth — grep `useDevToolbar` in `src/routes/`
3. Login redirect loop — clear `auth_user` keep `auth_token`, navigate /
4. Form data lost on reload — fill, save draft, reload, verify fields still populated
5. Buttons without handlers — grep `<Button` minus onClick/type/disabled/Link
6. Icons rendering as text ("USERS", "BAR-CHART") — visual inspect StatCards
7. Badge `variant="default"` on status labels — grep in routes
8. Tailwind palette utilities for status color — grep `bg-\w+-\d{3}`

## 10. What Never Counts as Pass

- Clicking a dead link and not investigating the result
- A "Create X" button that links to a non-existent route
- Approving a screen without opening the prototype HTML for comparison
- "Build passes" or "no TS errors" with no runtime walkthrough
- Any MISSING row in the screen-inventory table

---

*Source: COREHR v1 retro, apex-perf retro, Retro v2 (2026-04-20). Raw: docs/retros/*

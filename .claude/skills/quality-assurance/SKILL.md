---
name: quality-assurance
description: Use at three QA trigger points — pre-build test-plan review, post-backend audit, post-all-phases regression. Executes per-story workflow test plans through the browser preview with screenshot analysis and P0/P1/P2 triage. P0 bugs block the next phase. Harmonized with phase-verifier — same preview tool chain, different breadth (cross-persona integration, negative paths, permission boundaries). Also triggers when the user says "run QA", "QA check", "regression test", "test the product", "quality check", "cross-persona test", or "full QA".
---

# Quality Assurance

## Overview

Product-level QA. Unlike phase-verifier (per-phase gate), QA runs holistically across multiple phases, emphasizes cross-persona flows + negative paths + permission boundaries, and tests THROUGH THE UI (preview tool chain). Executes each story's workflow test plan, assigns P0/P1/P2 bugs, writes a QA report. P0 bugs block the next phase.

Harmonized with phase-verifier: QA references the same `_shared/style-rules/ui-fidelity-checklist.md` 10-point scorecard, doesn't restate it.

## When to Use

Three distinct trigger points:

1. **Pre-build — test-plan review.** After story-writer produces augmentation files, review the workflow test plans for coverage (every AC has a testable flow). One-shot dispatch.
2. **Post-backend audit.** After backend-writer units complete (pre-frontend). API-only sweep using curl against workflow-test-plan expected network calls. Stage-scoped dispatch.
3. **Post-all-phases regression.** After every phase is green. Full cross-persona preview walkthrough + negative paths + permission boundaries. One-shot dispatch.

Also user-triggered any time the user asks "run QA" / "regression test" / "quality check".

## Context Manifest

```yaml
unit_type: one_shot
required_inputs:
  - context.json
  - docs/stories/**/story.md                  # all approved augmentation files
required_reading:
  - .claude/skills/_shared/style-rules/ui-fidelity-checklist.md
  - .claude/skills/_shared/style-rules/anti-stub-protocol.md
  - .claude/skills/_shared/style-rules/react-patterns.md
  - .claude/skills/_shared/style-rules/fastapi-patterns.md
per_unit_inputs:
  - varies by trigger point (see below)
forbidden_paths:
  - docs/market-research.md
  - docs/stories/raw/
  - docs/phases/phase-<N-2>/                   # only last 1-2 phase summaries readable
budget_tokens: 900000
outputs:
  - docs/qa-test-plan.md                       # trigger 1 output
  - docs/qa-report-phase<N>.md                 # trigger 2 / 3 outputs
  - docs/qa-screenshots/                       # bug evidence
return_path: docs/phases/qa-<trigger>.return.json
```

Dispatch model: **Opus** for triage; **Sonnet** may be used for routine per-screen walkthrough passes where triage already happened.

## Pre-conditions (varies by trigger)

- Trigger 1 (test-plan review): at least one approved `docs/stories/<id>/story.md` with workflow test plan.
- Trigger 2 (post-backend audit): `phase-verifier` Stage 1 PASS for the current phase.
- Trigger 3 (post-all-phases): all phases green, `phase-verifier` Stage 3 PASS for each phase.

Missing → return `blocked`.

## Trigger 1 — Test-Plan Review (pre-build)

**Purpose:** catch coverage gaps before build starts. Writing tests for a buggy plan multiplies the bugs.

**Procedure per story augmentation:**
1. Read `docs/stories/<id>/story.md` including Workflow Test Plan.
2. Verify every AC (§4 Acceptance Criteria) has at least one flow (happy / edge / error) that exercises it.
3. Verify negative paths: every permission gate has a "wrong persona → 403" scenario.
4. Verify validation mirror cases: every validation rule from §7 has a "bad input → error" flow.
5. Verify cross-persona integration: if the story's data flows between personas, there's a flow testing the handoff.
6. Verify screen coverage: every screen in §3 has at least one flow visiting it.
7. Score coverage (% of ACs with flows). <100% = FAIL; return `blocked` with list of uncovered ACs → story-writer updates.

**Output:** `docs/qa-test-plan.md` — aggregated table of flows across all stories with traceability back to story ID, AC number, and persona.

## Trigger 2 — Post-Backend Audit (API-only sweep)

**Purpose:** catch backend-only bugs before frontend work begins.

**Procedure:**
1. Start backend, apply migrations, run seed.
2. For each endpoint in `docs/api-spec.md`:
   - Happy path: curl with valid auth → verify response shape matches spec.
   - Auth negative: no token → 401; wrong-persona token → 403 (unless self-access).
   - Validation negative: each validator in §7 → bad input → 400 with proper error envelope.
   - Side-channel: canEdit / canDelete / canAssign present and correct.
   - Enum display-name mapping: every enum field includes the display label.
   - Pagination: cursor + limit stable under concurrent writes.
   - Self-access bypass: documented endpoints accessible by the resource owner.
3. Cross-reference workflow-test-plan expected network calls against actual endpoint behavior.

**Output:** `docs/qa-report-phase<N>-api.md` with bugs classified P0/P1/P2.

## Trigger 3 — Post-All-Phases Regression (preview-first)

**Purpose:** full cross-persona regression before deploy-setup runs.

**Procedure:** (mirrors phase-verifier Stage 3 pattern but broader)

1. `preview_start` + backend running.
2. For each persona × each story:
   - Walk the happy path via preview tool chain.
   - Walk every edge case + error case.
   - Attempt negative paths (wrong persona accessing resource → 403 UI; ensure "permission denied" state renders, not a broken page).
3. Cross-persona flows (multi-step data handoffs):
   - IC creates → Manager reviews → Admin reports.
   - Ensure data reflects correctly across personas' views (e.g., IC's update appears in Manager's list).
4. Permission boundary tests:
   - Can IC see compensation data they're not authorized for? Assert 403 / hidden.
   - Can Manager edit another team's members? Assert 403.
   - Can Admin bypass enforcements? (Some should pass, some shouldn't — verify each policy.)
5. Data-leakage negatives:
   - Log out → back-button → protected page should 401-redirect to login, not flash protected content.
   - Expired token → re-fetch fails cleanly without retry-loops (see `react-patterns.md` 401/403 no-retry).
6. Performance smoke:
   - Dashboard load under 2s (browser DevTools network tab).
   - Large list pagination smooth (≥100 rows scroll).
7. Screenshot analysis loop per bug:
   - Screenshot → describe expected vs actual → classify P0/P1/P2 → file bug with evidence.

**Output:** `docs/qa-report-phase<N>.md`.

## P0 / P1 / P2 Triage

| Priority | Definition | Blocks phase? |
|---|---|---|
| **P0** | Broken happy path, auth bypass, data loss, crash, orphan-button, unreadable state, permission leak | **YES — phase cannot ship** |
| **P1** | Degraded experience, missing validation message, wrong variant, missing active state, performance regression, inconsistent persona view | Blocks unless waived with written rationale |
| **P2** | Cosmetic (spacing, color contrast within tolerance), non-critical copy, docs gap | Logged for next phase |

## Screenshot Analysis Loop

For each bug:
1. Capture screenshot at failure point (`preview_screenshot`).
2. Write expected vs actual — ground in workflow-test-plan "Expected UI State" text or react-ux-designer mockup.
3. Classify P0/P1/P2.
4. File bug entry with: description, screenshot path, expected text, actual behavior, affected persona(s), affected route(s), severity.

## QA Report Format

```markdown
# QA Report — Phase <N>
Run: <ISO8601>
Trigger: post-all-phases-regression
Stories covered: S-001, S-002, ...
Personas tested: IC, Manager, Admin

## Summary
- P0: 2 (blocking)
- P1: 5 (blocking unless waived)
- P2: 11 (next phase)

## P0 Bugs
1. <bug title> — <persona> — <route>
   - Description: ...
   - Expected: ...
   - Actual: ...
   - Evidence: docs/qa-screenshots/<path>
   - Affected: ...
2. ...

## P1 Bugs
...

## P2 Bugs
...

## Cross-Persona Findings
...

## Permission-Boundary Findings
...

## Performance Smoke
- Dashboard load: 1.2s ✓
- ...
```

## Rules

1. **Tests THROUGH the UI** — never just APIs. Preview tool chain mandatory.
2. **Preview-first** — screenshots + console + network evidence required.
3. **Workflow test plan is source of truth** — walk every step, assert every expected state.
4. **Cross-persona integration tested** — not just isolated persona flows.
5. **Negative paths explicit** — every permission gate has a "wrong persona" test.
6. **P0 blocks phase** — no exceptions.
7. **Reference `ui-fidelity-checklist.md`** — don't restate the 10-point scorecard.
8. **Data-leakage negatives** — back-button, expired token, stale auth state.
9. **Screenshot every bug** — no bug without evidence.
10. **Use `anti-stub-protocol.md` coverage-gate** — any AC lacking test is a coverage bug (P1).
11. **No emoji in reports.**

## After Completion

- Write QA report to `docs/qa-report-phase<N>.md` (or `qa-test-plan.md` for Trigger 1).
- Write return JSON at `return_path`:

```json
{
  "skill": "quality-assurance",
  "unit": "<trigger>",
  "status": "done | done_with_concerns | blocked",
  "evidence": {
    "commands_run": ["preview_start", "curl ...", "preview_click ..."],
    "screenshot_paths": ["docs/qa-screenshots/..."],
    "console_errors_scan": "...",
    "network_scan": "..."
  },
  "bugs_found": {
    "p0": [{"title": "...", "screenshot": "..."}],
    "p1": [...],
    "p2": [...]
  },
  "files_written": ["docs/qa-report-phase<N>.md"],
  "open_issues": []
}
```

## Downstream Consumers

- **Forger** reads `bugs_found.p0` — non-empty → phase FAILS, re-dispatch responsible units.
- **Next-phase builders** read `p2` bugs from prior phase summary as input to avoid repeat offenses.
- **deploy-setup** uses final regression QA report as go/no-go evidence.

Raw history + retros: `docs/retros/2026-04-corehr-v1.md`, `docs/retros/2026-04-20-retro-v2.md` (QA retro). Canonical rules: `_shared/style-rules/ui-fidelity-checklist.md` + `react-patterns.md` + `fastapi-patterns.md` + `anti-stub-protocol.md`.

---
name: phase-verifier
description: Use at the end of every build phase to verify backend, frontend, and full-stack integration across 4 stages (gate tests, backend-alone, frontend-alone, integrated). Stages 2 and 3 are preview-first and screenshot-based. Iron Law: no PASS without fresh evidence. Refuses to approve until everything works. Also triggers when the user says "verify phase", "check phase N", "does it work", "compare to prototype", "run verification", or when forger finishes a build phase.
---

# Phase Verifier

## Overview

Strict quality gate running at the end of every build phase. Four stages — 0 (automated gates), 1 (backend alone), 2 (frontend alone, preview-first), 3 (full-stack integrated, preview-first) — each dispatched as a separate subagent. Scores UI fidelity on the canonical 10-point checklist (`_shared/style-rules/ui-fidelity-checklist.md`). ≥90% required to pass.

Iron Law (from `_shared/subagent-protocol.md`): no PASS claim without fresh verification evidence. Evidence equals command output, screenshot paths, console log excerpts, network-scan results. Subjective judgments without artifacts are auto-rejected.

## When to Use

- Forger dispatches a phase-verifier stage subagent at a phase boundary.
- User asks to verify or compare phase output to prototype.

## Context Manifest

```yaml
unit_type: stage
required_inputs:
  - context.json#build_phases[current]
  - docs/completeness-tracker-phase<N>.md
required_reading:
  - .claude/skills/_shared/style-rules/ui-fidelity-checklist.md
  - .claude/skills/_shared/style-rules/react-patterns.md
  - .claude/skills/_shared/style-rules/fastapi-patterns.md
  - .claude/skills/_shared/subagent-protocol.md
  - .claude/skills/phase-verifier/reference/stage-procedures.md
per_unit_inputs:
  - stage-specific, see stage-procedures.md
forbidden_paths:
  - docs/market-research.md
  - docs/stories/raw/
  - docs/phases/phase-<N-1>/
budget_tokens: 900000
outputs:
  - docs/phases/phase-<N>/verify-stage-<K>.md
  - docs/phases/phase-<N>/screenshots/
  - docs/phases/phase-<N>-summary.md
return_path: docs/phases/phase-<N>/verify-stage-<K>.return.json
```

Dispatch model: Opus (judgment-heavy).

## Pre-conditions

- Build phase complete: all builder units returned done and passed two-phase review.
- Forger-merged tracker `docs/phases/phase-<N>-completeness.md` is 100% complete.
- For Stage 2/3: forger preview-first smoke gate passed.

If pre-conditions fail, return blocked immediately.

## Stage Overview

| Stage | Purpose | Tools |
|---|---|---|
| 0 — Gate tests | Automated: lint, type-check, unit tests, openapi contract match | scripts, openapi diff |
| 1 — Backend alone | Curl every endpoint, scan /docs against api-spec, run seed | curl, jq, alembic, seed.py |
| 2 — Frontend alone (preview-first) | Preview every screen at every state for every persona; score fidelity | preview_start, preview_click, preview_fill, preview_snapshot, preview_screenshot, preview_console_logs, preview_network |
| 3 — Full-stack integrated (preview-first) | Real backend + real frontend; execute every workflow-test-plan end-to-end; full E2E suite | same preview tools + pnpm run test:e2e + real API |

Stages 0 → 1 → 2 → 3 are strictly sequential. Each writes its own return JSON. Failure in any stage blocks the next.

Per-stage runbook: reference/stage-procedures.md.

## Stage 2 and 3 — Preview-First Verification

Both stages follow the same preview tool chain. Stage 2 uses mocked backend, Stage 3 uses real backend.

### Per-screen workflow

For each story in the current phase:

1. Read the Workflow Test Plan from `docs/stories/<story-id>/story.md`.
2. preview_start if not already running.
3. For each journey in the plan (happy + edge cases + error case):
   a. Reset auth or persona to the journey's Persona + Preconditions.
   b. For each numbered step: invoke the tool specified (preview_click, preview_fill, etc.).
   c. After each step: preview_snapshot + preview_screenshot → save to `docs/phases/phase-<N>/screenshots/<story>-<journey>-step<n>.png`.
   d. Compare the snapshot to the step's Expected UI State text. Flag mismatches.
   e. Compare the screenshot to the react-ux-designer output's equivalent screen. Score on the 10-point checklist.
4. preview_console_logs — any error or warning = P0 or P1 bug.
5. preview_network — status codes match expected; no unexpected calls.

### Fidelity Scoring

Weighted scorecard (from ui-fidelity-checklist.md): layout 40 / colors 20 / typography 20 / interactive states 20. Require ≥90% overall to PASS.

10 points:
1. Layout alignment to design
2. Color palette adherence (ef-design-system tokens)
3. Typography (family, size, weight)
4. Icons (Material Symbols for StatCards; Lucide otherwise)
5. Buttons (handler present, correct variant per ef-design-system.md)
6. Forms (labels, validation messages, disabled states)
7. Spacing (Tailwind scale)
8. Shadows and borders
9. Animations (transitions on interactive elements)
10. Accessibility (focus-visible, ARIA on icon buttons, contrast ≥ 4.5:1)

### Active-State Audit (mandatory)

For every interactive element on every screen, verify four visual states render distinctly:
- hover
- focus
- active
- disabled

Screenshot each state. Any missing or identical state is a P1 bug.

### Clickability Audit (mandatory)

Every button visible on every screen must be clicked at least once during the stage. Orphan buttons (no handler, no type attribute) are P0 bugs. See ui-fidelity-checklist.md button-handler mandate.

## Return Format (per stage)

```json
{
  "skill": "phase-verifier",
  "unit": "stage-<K>",
  "status": "done | done_with_concerns | blocked",
  "stage_result": "PASS | FAIL",
  "evidence": {
    "commands_run": ["preview_start", "bash scripts/lint.sh", "pytest"],
    "test_counts": {"passed": 0, "failed": 0, "skipped": 0},
    "screenshot_paths": ["docs/phases/phase-<N>/screenshots/..."],
    "console_errors_scan": "clean | <count> errors",
    "network_scan": "clean | <count> unexpected calls",
    "fidelity_score": 92,
    "build_output_tail": "..."
  },
  "bugs_found": [
    {"severity": "P0|P1|P2", "description": "...", "screenshot": "<path>", "expected": "...", "actual": "..."}
  ],
  "files_written": ["docs/phases/phase-<N>/verify-stage-<K>.md"],
  "open_issues": [],
  "next_stage": "<K+1> | none"
}
```

Any P0 bug sets stage_result to FAIL. Forger re-dispatches the responsible builder unit.

## Stage 3 Finale — Phase Summary

On Stage 3 PASS, write `docs/phases/phase-<N>-summary.md`:
- Phase goal + stories covered
- DB models created/modified
- Endpoints shipped
- Screens shipped (by persona)
- Test coverage stats (from test-writer coverage matrix)
- Notable decisions (from phase_decisions accumulator)
- Known open issues (P2+ from all stages)

Hard cap: 2000 words. Later phases load this summary, never raw phase artifacts.

## Handoff Card

On Stage 3 PASS, present a short handoff card via the return summary:

```
=== Phase <N> Handoff ===
URLs:
  Backend: http://localhost:8000 /docs
  Frontend: http://localhost:5173
Personas (from seed):
  IC:       ic@example.com / password123
  Manager:  manager@example.com / password123
  Admin:    admin@example.com / password123
Try these screens:
  /login → /dashboard → /goals → /goals/new
Full journey test plan: docs/stories/S-003/story.md Workflow section
```

## Rules

1. Iron Law: no PASS without fresh evidence. Evidence block MUST be populated. See _shared/subagent-protocol.md.
2. Stages strictly sequential. 0 → 1 → 2 → 3. No skipping. Failure blocks next stage.
3. Preview-first for Stage 2 and 3. Screenshots + console + network scans required; not "looks good" claims.
4. Fidelity ≥90% on ui-fidelity-checklist.md scorecard.
5. Active-state audit mandatory. 4 states per interactive element.
6. Clickability audit mandatory. Every button clicked at least once.
7. Orphan buttons = P0.
8. Console errors = P0 or P1 bugs; never ignored.
9. Network-scan catches unexpected calls.
10. Phase summary ≤2000 words on Stage 3 pass.
11. Workflow-test-plan is the source of truth for every screen's expected states.
12. No emoji in reports.

## After Completion

Leave dev server + backend running on PASS. Forger uses evidence + handoff card to present the gate question to the user.

Raw history + retros: docs/retros/2026-04-20-retro-v2.md. Canonical rules: _shared/style-rules/ui-fidelity-checklist.md, react-patterns.md, fastapi-patterns.md. Per-stage runbook: reference/stage-procedures.md.

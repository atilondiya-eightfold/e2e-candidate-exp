---
name: story-writer
description: Use when the user has raw stories (one file per story under `docs/stories/raw/<id>.md`) OR an approved domain doc and needs structured spec-level augmentation per story — 12-section breakdown, acceptance criteria, workflow test plan with expected UI states. Dispatched one story at a time (never batched). Also triggers when the user says "write the stories", "define the backlog", "create acceptance criteria", "produce workflow test plans", or when forger has no approved `docs/stories/<id>/story.md` for a raw story.
---

# Story Writer

## Overview

Produces one **augmentation file** per user story at `docs/stories/<id>/story.md` — the 12-section structured breakdown, acceptance criteria, UI inventory, validation expectations, and workflow test plan — from the corresponding raw story at `docs/stories/raw/<id>.md`.

**Core contract: raw stories are IMMUTABLE.** The raw file is the source of truth; this skill never edits it. The augmentation file references + excerpts the raw; it does not replace it. Every paragraph/bullet/example in the raw must map to at least one section of the augmentation (or be explicitly flagged out-of-scope with reason) — coverage-checklist is a HARD GATE.

**One story per subagent dispatch. Never batched.** Batching caused cross-story context dilution and dropped validation/edge-case details in prior runs. Each story gets a fresh context window (via forger's Task dispatch, Sonnet model) with narrow inputs.

## When to Use

- Raw story exists at `docs/stories/raw/<id>.md` with no approved augmentation at `docs/stories/<id>/story.md`.
- Forger dispatches this skill per-story as units during the stories phase.
- User explicitly says "augment story X", "create acceptance criteria for …", or "write the workflow test plan for …".

## Context Manifest

```yaml
unit_type: module
required_inputs:
  - docs/domain-doc.md
  - docs/market-research.md
  - context.json#build_phases[current]
per_unit_inputs:
  - docs/stories/raw/<story-id>.md           # THE SOURCE OF TRUTH — read carefully, never edit
  - docs/stories/index-prior-approved.md     # one-line summaries of prior approved stories (written by forger)
  - .claude/skills/story-writer/references/story-template.md
forbidden_paths:
  - boilerplate/**
  - frontend/**
  - backend/**
  - docs/phases/**
  - docs/stories/<other-story-id>/**         # other stories' full bodies — summaries only via index
  - docs/market-research.md                  # domain-doc is the condensed brief; market-research is too broad per-unit
conditional_loads:
  - path: docs/personas.md
    when: story introduces a new persona
budget_tokens: 900000
outputs:
  - docs/stories/<story-id>/story.md
  - docs/stories/<story-id>/coverage.md      # the HARD GATE audit — every raw paragraph mapped
return_path: docs/phases/phase-<N>/story-<story-id>.return.json
```

Default dispatch model: **Sonnet**. Escalate to Opus on `BLOCKED` only.

## Pre-conditions

- `docs/stories/raw/<story-id>.md` exists.
- `docs/domain-doc.md` approved.
- `docs/personas.md` exists if the story introduces a persona not yet in the domain doc.
- `docs/stories/index-prior-approved.md` exists (written by forger after each prior story is approved).

Missing → return `needs_context` with the specific file.

## Raw Story Immutability

The skill **never writes to** `docs/stories/raw/**`. It only reads.

- At dispatch start, compute `sha256(raw/<id>.md)` — record in the augmentation file frontmatter as `raw_source_sha`.
- At re-run, recompute hash. If the augmentation exists with a stale hash, forger refuses to proceed without explicit user approval (diff surfaces what changed in raw).
- Forger runs `git diff docs/stories/raw/` before each phase dispatch — non-empty = FAIL.

Coverage-checklist gate (below) guarantees no paragraph is silently dropped.

## Workflow

### Step 0 — Read the raw story in full

Read `docs/stories/raw/<story-id>.md` start to finish. Note every paragraph, bullet, example, edge case, and acceptance note. Write an internal inventory: numbered list of every discrete piece of content in the raw file. This inventory drives the coverage checklist.

Also read:
- `docs/domain-doc.md` (background)
- `docs/stories/index-prior-approved.md` (prior stories — summaries only, not full bodies)
- `references/story-template.md` (the 12-section contract)

### Step 1 — Fill the 12-section template

**Before writing, read `references/story-template.md`.** The template IS the structural contract between story-writer and downstream skills. Do not free-write — fill section by section.

Summary of the 12 sections (read the template file for full definitions):

**Hard sections (8) — verification fails if missing:**
1. **Story Header** — ID, persona, statement, priority, dependencies, research citation.
2. **User Journey** — numbered steps with fields, buttons, tables, data actions.
3. **Screen Inventory** — table: screen name, route, persona, purpose.
4. **Acceptance Criteria** — GIVEN/WHEN/THEN, each AC testable and traceable.
5. **UI Components Required** — explicit ef-design-system components per screen.
6. **API Touchpoints** — per step: HTTP method, path shape, request/response outline (spec-level, db-architect/api-architect will finalize).
7. **Validation Expectations** — per form field: required? min/max/length? format (email, UUID, etc.)? server-mirrored? Reference `_shared/style-rules/fastapi-patterns.md` validation mirror rule.
8. **Permissions** — who can read/write this story's data; self-access explicit.

**Soft sections (4):**
9. Edge Cases & Error States
10. Empty / Loading / Error UI States per screen
11. Dependencies & Assumptions
12. Out of Scope (this phase)

### Step 2 — Workflow Test Plan (SOURCE OF TRUTH for phase-verifier + QA)

Append a **Workflow Test Plan** section to the augmentation file. This becomes the source of truth for phase-verifier Stage 2/3 and quality-assurance preview-driven walkthroughs. Structure:

```markdown
## Workflow Test Plan

### Happy Path
**Persona:** [who runs this]
**Preconditions:** [data state, auth state]

| # | Action (preview tool) | Expected UI State | Expected Network |
|---|---|---|---|
| 1 | preview_click `Create goal` button | Modal opens, form fields empty, "Save" disabled | none |
| 2 | preview_fill `title` with "Ship v1" | "Save" enabled; no validation errors | none |
| 3 | preview_click `Save` | Modal closes; toast "Goal created"; row appears in list | POST /api/v1/goals/ 201 |
| ... | ... | ... | ... |

### Edge Case 1 — [name, e.g., "Empty title"]
[same table structure]

### Edge Case 2 — [name]
[same table structure]

### Error Case — [name, e.g., "Server 500 on save"]
[same table structure]
```

Minimum: **1 happy path + 2 edge cases + 1 error case.** More if the story warrants. Every step has a specific `preview_*` tool call and an expected UI state that can be screenshot-diffed.

### Step 3 — Coverage Checklist (HARD GATE)

Write `docs/stories/<story-id>/coverage.md`:

```markdown
# Coverage Audit — [Story ID]
Source: docs/stories/raw/<id>.md
raw_source_sha: <hash>

| Raw item (line / paragraph reference) | Maps to augmentation section(s) | Notes |
|---|---|---|
| "User can filter by status" (L14) | §2 User Journey step 3; §7 Validation (status enum); Workflow test happy-path step 4 | |
| "Bulk archive requires confirmation" (L22) | §9 Edge Case 1; Workflow test edge-case-1 | |
| "Integration with legacy CRM" (L31) | — | **OUT OF SCOPE this phase — Section 12.** Reason: legacy CRM not in domain-doc integrations list. Defer to Phase 3. |
| ... | ... | ... |
```

**Rule: every raw item must appear with a non-empty "Maps to" OR a non-empty "OUT OF SCOPE — Reason".** A blank row = gate FAIL. Return `blocked` with missing items listed.

### Step 4 — Augmentation file frontmatter

Every augmentation file starts with:

```yaml
---
story_id: <id>
raw_source: docs/stories/raw/<id>.md
raw_source_sha: <sha256-of-raw-at-dispatch>
augmented_at: <ISO8601>
augmented_by: story-writer
persona: <primary persona>
priority: P0 | P1 | P2
depends_on: [<story ids>]
phase: <build phase number>
coverage_audit: docs/stories/<id>/coverage.md
---
```

Forger checks `raw_source_sha` at every re-run. Stale hash = refuse to proceed.

### Step 5 — Update the cumulative index

Append to `docs/user-stories.md`:

```markdown
- **[<story-id>](stories/<id>/story.md)** — [persona] [one-line headline]. Priority: P0. Depends on: [ids]. Raw: stories/raw/<id>.md
```

Forger also maintains `docs/stories/index-prior-approved.md` (approved stories only, updated on approval).

## Return Contract

On success:

```json
{
  "skill": "story-writer",
  "unit": "<story-id>",
  "status": "done",
  "evidence": {
    "commands_run": [
      "sha256sum docs/stories/raw/<story-id>.md"
    ],
    "coverage_audit_complete": true,
    "coverage_rows_filled": 24,
    "coverage_rows_blank": 0,
    "workflow_test_plan_scenarios": 4
  },
  "files_written": [
    "docs/stories/<story-id>/story.md",
    "docs/stories/<story-id>/coverage.md"
  ],
  "files_modified": [
    "docs/user-stories.md"
  ],
  "decisions": [
    { "scope": "<story-id>", "decision": "...", "rationale": "..." }
  ],
  "open_issues": [],
  "return_path_schema": "_shared/return-contract.md"
}
```

`status: blocked` cases:
- Coverage audit has blank rows → list the raw items.
- Raw file references a persona not in `docs/personas.md` → request `needs_context`.
- Raw file implies an integration not in domain-doc → flag for out-of-scope decision.

## Rules

1. **Raw is immutable.** No writes to `docs/stories/raw/**`. Ever.
2. **One story per dispatch — no batching.** Batching drops details.
3. **Coverage checklist is a HARD GATE.** Every raw item maps to a section or is explicitly OOS. Blank row = blocked.
4. **Workflow test plan is required.** Minimum 1 happy + 2 edge + 1 error case. Each step has a specific `preview_*` tool call and expected UI state.
5. **Record `raw_source_sha` in frontmatter.** Drift gate — forger refuses to proceed on stale hash.
6. **Validation expectations explicit per field.** Required + min/max + format + mirror flag. See `_shared/style-rules/fastapi-patterns.md`.
7. **Permissions explicit with self-access.** Never implicit. See `fastapi-patterns.md` RBAC section.
8. **Enum values use SCREAMING_SNAKE_CASE.** Display-name mapping lives in `docs/db-design.md` once db-architect runs.
9. **Cite style-rules rather than restate.** `_shared/style-rules/*.md` are the canon.
10. **No emoji in output files.** Plain text markers only.

## After Completion

- `docs/stories/<id>/story.md` written with 12 sections + workflow test plan.
- `docs/stories/<id>/coverage.md` written, all rows filled.
- `docs/user-stories.md` appended with the index entry.
- Return JSON written to `return_path`.
- Forger gates approval with user; on approval, appends story to `docs/stories/index-prior-approved.md`.

## Downstream Consumers (who relies on this output)

- `react-ux-designer` — reads §3 Screen Inventory, §5 UI Components, §6 API Touchpoints to build mock screens.
- `architect` Pass 2 — reads all approved stories to compute build phases.
- `db-architect` — reads §6, §7 for tables + fields.
- `api-architect` — reads §6 + Workflow Test Plan for endpoint map + workflow traceability.
- `backend-writer` — reads §4 AC + §7 Validation for implementation.
- `frontend-ui-engineer` + `ui-builder` — reads §2, §3, §5, §10 for UI state machines.
- `phase-verifier` Stage 2/3 — **executes the Workflow Test Plan via preview tools**.
- `quality-assurance` — **executes the Workflow Test Plan + edge cases** via preview tools.
- `test-writer` — consumes Workflow Test Plan as AC→test mapping (runs POST Stage 2 only).

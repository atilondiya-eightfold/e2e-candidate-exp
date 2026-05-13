---
name: forger
description: Use when starting a new project, resuming an existing project, dispatching a build phase, checking what's been approved, or whenever a downstream skill needs shared pipeline context. Orchestrates all 15 Forge skills with approval gates at phase boundaries. Also triggers when the user says "start project", "resume", "dispatch phase N", "what has been approved", "pipeline status", "run the next skill", or "let's begin the build".
---

# Forger

## Overview

Orchestrator for the Forge pipeline. Maintains `context.json` (PM_CONTEXT), runs approval gates, dispatches subagents per each skill's Context Manifest, enforces the completeness tracker hard gate, and persists phase summaries. The only skill that calls the Task tool — no subagent nests.

## When to Use

- Start of every session on a `proj/*` branch.
- Beginning of a new phase.
- Any time a downstream skill needs approved inputs.
- User asks what's approved / where in the pipeline / to resume.

## Pipeline Overview

```
domain-researcher        # phase 0 — inline
  → story-writer         # per-story subagent dispatch (Sonnet)
    → react-ux-designer  # one-shot subagent (Opus)
      → architect Pass 1 # inline
        → db-architect   # inline
          → api-architect# inline
            → architect Pass 2 # inline (build phase plan)
              ↓
     ┌────────┴─────────────────────────────────────────┐
     │  PHASED BUILD LOOP (per build_phase in context.json) │
     │  ┌──────────────────────────────────────────────┐ │
     │  │ backend-writer   (per-module, Sonnet)        │ │
     │  │ ui-builder       (per-cluster, Sonnet)       │ │
     │  │ frontend-ui-engineer (per-cluster, Sonnet)   │ │
     │  │ perf-test-writer (one-shot, Haiku)           │ │
     │  │ ─── preview-first smoke gate ───             │ │
     │  │ phase-verifier   (per-stage, Opus)           │ │
     │  │ ─── Stage 2 pass → post-feature test dispatch ─ │
     │  │ test-writer      (per-module, Sonnet)        │ │
     │  │ quality-assurance(one_shot + stages, Opus)   │ │
     │  └──────────────────────────────────────────────┘ │
     └─────────────────────────────────────────────────┘
        → deploy-setup (one-shot after final phase, Sonnet)
```

Design-phase skills (`domain-researcher`, `architect`, `db-architect`, `api-architect`) run **inline** in the forger thread — small outputs, routine mid-run clarifying questions, no subagent benefit.

## PM_CONTEXT (`context.json`)

```jsonc
{
  "project": {"name": "...", "branch": "proj/<name>", "created_at": "ISO8601"},
  "approvals": {
    "domain_doc": {"approved": true, "at": "..."},
    "personas": {"approved": true, "at": "..."},
    "stories": {"approved_ids": ["S-001", "S-002"], "last_approved_at": "..."},
    "screens": {"approved": true, "at": "..."},
    "architecture_pass_1": {"approved": true, "at": "..."},
    "db_design": {"approved": true, "at": "..."},
    "api_spec": {"approved": true, "at": "..."},
    "architecture_pass_2": {"approved": true, "at": "..."},
    "phases": {"phase_1": "approved", "phase_2": "in_progress"}
  },
  "build_phases": [
    {
      "number": 1, "name": "Foundation",
      "stories": ["S-001", "S-002"],
      "db_models": ["User", "Session"],
      "api_endpoints": ["/api/v1/auth/login/", "/api/v1/users/"],
      "frontend_clusters": ["auth", "profile"],
      "parallel_units": [["backend-writer:user", "backend-writer:session"]],
      "status": "approved"
    }
  ],
  "current_build_phase": 2,
  "phase_decisions": [
    {"phase": 1, "scope": "users", "decision": "soft-delete via status", "rationale": "..."}
  ],
  "subagent_registry": { "<skill>": {"default_model": "sonnet"} }
}
```

Forger reads this at every turn. Subagents receive **narrow slices** in PRIOR DECISIONS — never the full blob.

## Branch-Based Project Tracking

New project kickoff (on `main`):

1. Ask project name → create `proj/<name>` branch.
2. `rm -rf frontend backend && cp -R boilerplate/frontend frontend && cp -R boilerplate/backend backend`
3. `mkdir -p docs designs/screens deploy docs/retros docs/stories/raw`
4. `cp frontend/.env.example frontend/.env`
5. Verify copy (standard Forge assertion).
6. Install deps (`(cd frontend && pnpm install)`, `(cd backend && uv sync)`).
7. Initialize `context.json`.

See `CLAUDE.md` for the canonical bootstrap steps — don't restate here.

## Approval Gates (phase boundaries only)

- Approval happens **per phase artifact**, not per subagent unit.
- Use `AskUserQuestion` at each gate: single-select `Approve` / `Adjust` / `Block with comment`.
- On `Approve`, set the `approvals.*` flag in `context.json` and unlock the next phase.
- Per-unit blockers are resolved forger-internally (retry / split / escalate model) without user intervention.

## Completeness Tracker Protocol (HARD GATE)

For every build phase:
1. Each subagent writes a **slice** of the tracker: `docs/phases/phase-<N>/completeness-tracker-phase<N>-<unit>.md`.
2. Forger merges slices at phase end into `docs/phases/phase-<N>-completeness.md`.
3. Any unmet cell → phase gate FAILS. Forger re-dispatches the responsible unit with the gap flagged.
4. Only a 100%-complete tracker allows the phase-verifier Stage 3 gate to pass.

Phase summary: after verification passes, forger writes `docs/phases/phase-<N>-summary.md` — **≤2000 words hard cap**. Later phases load this summary, never the raw phase artifacts.

## Subagent Invocation Protocol

For each dispatch:

1. Read the skill's `SKILL.md` Context Manifest.
2. Compute the unit list from `context.json`.
3. Decide **parallel vs sequential** per rules below. If parallel, dispatch ≤4 Task calls in one message.
4. Select **model** per rules below. Set the `model` parameter on the Task call.
5. Build the prompt from `_shared/prompts/implementer-brief.md` (or reviewer / verifier / test equivalent). Inline the Context Manifest + PRIOR DECISIONS slice + narrow task statement.
6. Parse the return JSON at `return_path`. Validate against `_shared/return-contract.md`.
7. On `done`: enter two-phase review. On `done_with_concerns`: read concerns, fix-first or proceed. On `needs_context`: provide missing files, re-dispatch same model. On `blocked`: escalate (stronger model / split unit / user).

## Two-Phase Review (for builder outputs)

When a builder (`backend-writer`, `ui-builder`, `frontend-ui-engineer`, `perf-test-writer`) returns `done`:

1. Dispatch **spec-reviewer** using `_shared/prompts/spec-reviewer-brief.md`. Compliance-only vs approved spec. Returns `PASS` / `FAIL_WITH_DELTAS`.
2. On `PASS`, dispatch **code-quality-reviewer** using `_shared/prompts/code-quality-reviewer-brief.md`. Style rules, edge cases, validation, security. Returns `PASS` / `FAIL_WITH_FINDINGS`.
3. On `FAIL`, re-dispatch builder with deltas/findings as concerns. **Order is mandatory** — never quality before compliance.

## Parallelization Decision

Dispatch units in parallel only when ALL hold (see `_shared/subagent-protocol.md`):

- **Disjoint files.** No shared service / migration / frontend component parent.
- **No shared state.** Neither unit reads the other's return.
- **Independent specs.** Unit A doesn't depend on a decision from B.
- **≤4 parallel workers.**

Always sequential: implementer → spec-reviewer → code-quality-reviewer (per unit); phase-verifier Stages 0 → 1 → 2 → 3; phase N before phase N+1.

Architect Pass 2 lists `parallel_units[]` per phase — forger honors it.

## Model Selection

Per `_shared/subagent-protocol.md` table:

| Task class | Model | Examples |
|---|---|---|
| Mechanical, ≤2 files, complete spec | **Haiku** | Seed scripts, Alembic migrations, test factories, k6 smoke |
| Integration, multi-file, pattern-match | **Sonnet** | backend-writer, ui-builder, frontend-ui-engineer, story-writer, test-writer |
| Judgment, design, cross-cutting | **Opus** | architect, phase-verifier, react-ux-designer, QA triage |

Escalate Haiku → Sonnet or Sonnet → Opus on `blocked`. Per-skill defaults in `.claude/skills/README.md`.

## Per-Skill Dispatch Notes

| Skill | Mode | Default model | Unit rule |
|---|---|---|---|
| `domain-researcher` | inline | — | Forger thread |
| `story-writer` | subagent | Sonnet | One unit per story — **never batched** |
| `react-ux-designer` | subagent | Opus | One-shot |
| `architect` | inline | — | Two passes, forger thread |
| `db-architect` | inline | — | Forger thread |
| `api-architect` | inline | — | Forger thread |
| `backend-writer` | subagent | Sonnet | Per module; parallel when disjoint |
| `ui-builder` | subagent | Sonnet | Per feature cluster |
| `frontend-ui-engineer` | subagent | Sonnet | Per feature cluster |
| `perf-test-writer` | subagent | Haiku | One-shot; Sonnet for breakpoint tuning |
| `test-writer` | subagent | Sonnet | **Per module, POST Stage 2 only** |
| `phase-verifier` | subagent | Opus | Per stage; strictly sequential |
| `quality-assurance` | subagent | Opus (triage) / Sonnet (walkthrough) | One-shot + stage variants |
| `deploy-setup` | subagent | Sonnet | One-shot after final phase |

## Story-Writer Workflow (per-story, raw-immutable)

1. **Raw immutability gate.** `git diff docs/stories/raw/` — non-empty → FAIL; surface diff, demand explanation.
2. **Compute unit list** = approved raw stories lacking augmentation.
3. For each story: fresh Sonnet subagent with `per_unit_inputs: docs/stories/raw/<id>.md`. No batching.
4. Subagent returns augmentation + `coverage.md`. Forger verifies `coverage_rows_blank == 0` before accepting.
5. On acceptance: append one-line summary to `docs/stories/index-prior-approved.md` (seed for later dispatches' PRIOR DECISIONS).
6. `raw_source_sha` drift guard — re-run with stale hash requires explicit user approval.

## Preview-First Smoke Gate

Between phase build completion and phase-verifier Stage 3:

1. `preview_start` — dev server reachable.
2. Smoke script: homepage 200 + one persona login via `preview_click`/`preview_fill` + `preview_console_logs` clean.
3. Gate fails → block Stage 3, re-dispatch the failing cluster.

Cheap pre-filter before spending Opus budget on full verification.

## Post-Feature Test Dispatch

After `phase-verifier` Stage 2 returns PASS (FE works standalone against the prototype):

1. Dispatch `test-writer` per module — narrow context (workflow-test-plan + API spec slice + backend + frontend entry paths).
2. `test-writer` never runs during build — kept unnecessary test-generation context out of parent.
3. After tests `done`, include in Stage 3 scope.

## Phase Lifecycle

```
1. Read current phase from context.json
2. Dispatch backend-writer units (parallel where disjoint)
3. Review cycles (spec → code-quality) per unit
4. Dispatch ui-builder + frontend-ui-engineer units (parallel where disjoint)
5. Review cycles per unit
6. Merge completeness tracker slices → phase-<N>-completeness.md
7. Preview-first smoke gate
8. phase-verifier Stage 0 → 1 → 2 (sequential)
9. On Stage 2 PASS → dispatch test-writer units (parallel where disjoint)
10. phase-verifier Stage 3 (new tests included)
11. On Stage 3 PASS → quality-assurance
12. On QA PASS → phase-<N>-summary.md (≤2000 words)
13. User approval via AskUserQuestion → approvals.phases[phase_N] = approved
14. Advance current_build_phase
```

## Rules

1. **Only forger calls Task.** Subagents never nest.
2. **Approval at phase boundaries, not per unit.**
3. **Completeness tracker is a HARD GATE.**
4. **Raw stories are immutable.** `git diff docs/stories/raw/` empty before every phase dispatch.
5. **Workflow test plan required** before phase build can start.
6. **Model selection per table**; escalate on `blocked`.
7. **Parallelize only when heuristics hold.**
8. **Two-phase review order** — spec compliance before code quality.
9. **Preview-first smoke gate** before Stage 3.
10. **Test-writer dispatch is POST Stage 2 only.**
11. **Phase summary ≤2000 words.**
12. **Narrow PRIOR DECISIONS** — never full `context.json`.
13. **Evidence requirement.** `done` without `evidence` → reject, re-dispatch.
14. **Forbidden paths enforced via manifest.**
15. **No emoji in artifact files.**

## Interactive Transitions

At every transition, short status card via `AskUserQuestion`:

> "Phase 2 backend + frontend complete. All 14 completeness-tracker rows filled. Preview smoke gate passed. Ready for phase-verifier?"

Options: `Proceed to verification` / `Review a specific unit first` / `Pause`.

## Retro History

Retros folded into `_shared/style-rules/` + documented above. Raw: `docs/retros/2026-04-20-retro-v2.md`. Canonical rules: `_shared/subagent-protocol.md`, `_shared/manifest-format.md`, `_shared/return-contract.md`, `_shared/style-rules/*.md`.

## References

- `.claude/skills/_shared/authoring-rules.md` — SKILL.md contract
- `.claude/skills/_shared/manifest-format.md` — Context Manifest spec
- `.claude/skills/_shared/return-contract.md` — return JSON schema
- `.claude/skills/_shared/subagent-protocol.md` — parallelization, model selection, evidence
- `.claude/skills/_shared/prompts/*.md` — dispatch brief templates
- `.claude/skills/_shared/style-rules/*.md` — canonical domain rules
- `CLAUDE.md` — project bootstrap, repo layout, frontend/backend stack

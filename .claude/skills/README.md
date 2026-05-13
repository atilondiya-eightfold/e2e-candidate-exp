# Forge Skill Registry

Dashboard for the 15-skill Forge pipeline. Reference this when:
- Debugging which skill should fire for a given user request.
- Deciding whether a skill is inline-in-forger or a Task subagent.
- Looking up each skill's default model + budget + unit type.
- Hunting drift — if a SKILL.md mismatches the row below, the row wins.

## Skills

| # | Skill | Mode | Unit type | Default model | Budget lines | Current lines | Last retro-fold | Notes |
|---|---|---|---|---|---|---|---|---|
| 0 | domain-researcher | inline | one_shot | — | 350 | — | 2026-04-21 | Entry point: market research + interview. No subagent |
| 1 | story-writer | subagent | module | Sonnet | 350 | — | 2026-04-21 | **One unit per story — never batched.** Raw immutable |
| 2 | react-ux-designer | subagent | one_shot | Opus | 350 | — | 2026-04-21 | Mock screens with PersonaSwitcher + StateDebugBar |
| 3 | architect | inline | one_shot | — | 350 | — | 2026-04-21 | Two passes: pre-DB/API + post-DB/API |
| 4 | db-architect | inline | one_shot | — | 350 | — | 2026-04-21 | Fewer tables by default; consolidation discipline |
| 5 | api-architect | inline | one_shot | — | 350 | — | 2026-04-21 | Self-access column mandatory in RBAC matrix |
| 6 | backend-writer | subagent | module | Sonnet | 450 | — | 2026-04-21 | Step 0 Discovery + anti-stub HARD GATE |
| 7 | ui-builder | subagent | feature_cluster | Sonnet | 450 | — | 2026-04-21 | Upgrade mock → production. Dev-toolbar removal in Phase 0 |
| 8 | frontend-ui-engineer | subagent | feature_cluster | Sonnet | 450 | — | 2026-04-21 | Greenfield React. ef-design-system primary |
| 9 | perf-test-writer | subagent | one_shot | Haiku | 450 | — | 2026-04-21 | Scaffolding Haiku; Sonnet for breakpoint tuning |
| 10 | test-writer | subagent | module | Sonnet | 450 | — | 2026-04-21 | **Runs POST phase-verifier Stage 2 only.** Narrow context |
| 11 | phase-verifier | subagent | stage | Opus | 450 | — | 2026-04-21 | 4 stages; Stage 2/3 preview-first + screenshot evidence |
| 12 | quality-assurance | subagent | one_shot | Opus (triage) / Sonnet (walkthrough) | 450 | — | 2026-04-21 | 3 trigger points; preview-first; P0 blocks phase |
| 13 | deploy-setup | subagent | one_shot | Sonnet | 450 | — | 2026-04-21 | Docker + CI/CD + launch checklist |
| 14 | forger | orchestrator | — | — | 500 | — | 2026-04-21 | Only skill that calls Task tool |

_(Current-lines column intentionally left blank — read via `wc -l .claude/skills/*/SKILL.md | sort -n` or `bash .claude/skills/_shared/check-skill-size.sh`.)_

## Pipeline Order

```
domain-researcher → story-writer (per-story) → react-ux-designer →
  architect Pass 1 → db-architect → api-architect → architect Pass 2 →
    [per build_phase loop]:
      backend-writer (per module, parallel where disjoint) →
      ui-builder + frontend-ui-engineer (per cluster, parallel where disjoint) →
      perf-test-writer →
      preview-first smoke gate →
      phase-verifier Stage 0 → 1 → 2 →
      test-writer (POST Stage 2, per module, parallel) →
      phase-verifier Stage 3 →
      quality-assurance →
      phase summary →
      user approval gate
→ deploy-setup (after final phase)
```

## Model-Selection Heuristics

Per `.claude/skills/_shared/subagent-protocol.md` table. Summary:
- **Haiku** — mechanical, ≤2 files, complete spec (seed scripts, migrations, factories, k6 smoke).
- **Sonnet** — integration, multi-file, pattern-match (backend-writer, ui-builder, frontend-ui-engineer, story-writer, test-writer).
- **Opus** — judgment, design, cross-cutting (architect, phase-verifier, react-ux-designer, QA triage).

Escalate Haiku → Sonnet or Sonnet → Opus when a unit returns `blocked` with insufficient reasoning.

## Parallelization Heuristics

Forger dispatches ≤4 parallel Task calls when ALL hold:
- Disjoint files.
- No shared state (neither unit reads the other's return).
- Independent specs.

Always sequential: implementer → spec-reviewer → code-quality-reviewer (per unit); phase-verifier stages; cross-phase.

## Shared Infrastructure (`_shared/`)

| File | Purpose |
|---|---|
| `authoring-rules.md` | SKILL.md contract (size, frontmatter, retro-fold rule) |
| `subagent-protocol.md` | Status values, evidence Iron Law, parallelization, model-selection |
| `manifest-format.md` | Context Manifest YAML spec |
| `return-contract.md` | Return JSON schema |
| `check-skill-size.sh` | Pre-commit lint |
| `style-rules/ef-design-system.md` | Badge/Pill variants, StatCard icons, Button mandate, active states |
| `style-rules/react-patterns.md` | Zustand getState, useState initializer, TanStack retry, 4-layer check, :vN: |
| `style-rules/fastapi-patterns.md` | Self-access bypass, side-channel fields, trailing slashes, enum display |
| `style-rules/sqlmodel-patterns.md` | Soft-delete + audit, FK cascading, migration rules |
| `style-rules/ui-fidelity-checklist.md` | 10-point scorecard (used by phase-verifier + QA) |
| `style-rules/anti-stub-protocol.md` | HARD GATE preventing mock/placeholder code in production paths |
| `prompts/implementer-brief.md` | Subagent dispatch preamble for builders |
| `prompts/spec-reviewer-brief.md` | Spec-compliance reviewer preamble |
| `prompts/code-quality-reviewer-brief.md` | Code-quality reviewer preamble |
| `prompts/verifier-brief.md` | phase-verifier / QA preamble |
| `prompts/test-subagent-brief.md` | test-writer (post Stage 2) preamble |

## Retro Archive

Raw retros preserved verbatim at `docs/retros/`:
- `apex-perf-lessons.md`
- `2026-04-corehr-v1.md`
- `2026-04-20-retro-v2.md`
- `db-architect-retro.md`
- `api-architect-retro.md`

All rules from these retros folded into `_shared/style-rules/*.md`. **No future retro appends** to SKILL.md — canonical rules are edited in place; raw retros archived under `docs/retros/YYYY-MM-DD-<project>.md`.

## Verification

```bash
bash .claude/skills/_shared/check-skill-size.sh     # must exit 0
grep -r "## Retro .* additions" .claude/skills/ | wc -l   # must be 0
grep -r "^@" .claude/skills/*/SKILL.md | wc -l           # must be 0
wc -l .claude/skills/*/SKILL.md | tail -1                # total target ≤5500
```

## Change Log (rebuild)

- **2026-04-21** — Complete rebuild. Retro-folding into `_shared/style-rules/`. New story-writer contract (immutable raw + per-story dispatch + coverage hard gate). test-writer moved POST Stage 2. Preview-first verification in phase-verifier Stage 2/3 + QA. Four-status return contract + evidence Iron Law. Raw retros archived under `docs/retros/`.

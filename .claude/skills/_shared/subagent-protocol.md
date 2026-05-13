# Subagent Protocol

The parent/child contract for every Forge skill that runs as a subagent. Adapted from obra/superpowers `subagent-driven-development` + `dispatching-parallel-agents`, and ECC's `dmux-workflows`.

Referenced by every subagent-mode skill. Extends `_shared/manifest-format.md` and `_shared/return-contract.md`.

## Status Values (Return Contract)

Every subagent returns one of four statuses:

| Status | Meaning | Parent action |
|---|---|---|
| `DONE` | Work complete; evidence attached; all rules honored | Proceed to spec-compliance review |
| `DONE_WITH_CONCERNS` | Work complete but subagent flags issues parent should weigh | Parent reads concerns, may fix before review or proceed |
| `NEEDS_CONTEXT` | Blocker resolvable by more context (missing file, unclear spec) | Parent provides context, re-dispatches same model |
| `BLOCKED` | Work cannot proceed (tooling broken, contradictory spec, out-of-scope) | Parent escalates: more-capable model, task split, or human |

Full schema in `_shared/return-contract.md`.

## Evidence Requirement (Iron Law)

**No `DONE` status without fresh verification evidence.**

Every `DONE` or `DONE_WITH_CONCERNS` return must populate `evidence`:
- Build / lint / test command output (last ≤30 lines).
- File paths changed.
- For verifier skills: screenshot paths, console-log excerpts, network-request counts.

Empty evidence = rejected, return status flipped to `BLOCKED`.

## Two-Phase Review (for builder outputs)

When forger receives a builder's `DONE` return:

1. **Spec-compliance review first** — did the output satisfy the approved API spec / schema / design? Uses `prompts/spec-reviewer-brief.md`.
2. **Code-quality review second** — style, error handling, edge cases. Uses `prompts/code-quality-reviewer-brief.md`.

**Order is mandatory.** Never quality before compliance (per superpowers — compliance failures invalidate quality review).

Review outcomes:
- Both pass → accept, update `context.json.phase_decisions[]`.
- Compliance fails → re-dispatch builder with explicit deltas.
- Quality fails → re-dispatch builder with concerns array; no new spec context needed.

## Parallelization Heuristics

Dispatch units in parallel **only when all hold:**

1. **Disjoint files.** Units touch non-overlapping paths. No shared service, no shared migration, no shared frontend component parent.
2. **No shared state.** Neither unit reads the other's return file.
3. **Independent specs.** Unit A's implementation doesn't depend on a decision made in unit B.
4. **≤4 parallel workers** at once. Beyond 4, returns are harder to merge and rate limits bite.

**Always sequential:**
- Implementer → spec-reviewer → code-quality-reviewer (for any one unit).
- Phase-verifier stages (0 → 1 → 2 → 3).
- Cross-phase: phase N must complete before phase N+1 dispatches.

## Model Selection

| Task class | Model | Why | Examples |
|---|---|---|---|
| Mechanical, ≤2 files, complete spec | Haiku | Fast, cheap, sufficient | Seed scripts, Alembic migrations, test factories, k6 smoke suite, README updates |
| Integration, multi-file, pattern-match | Sonnet | Balance of reasoning + speed | backend-writer module, ui-builder feature cluster, frontend-ui-engineer component set, test-writer per-module, story-writer per-story |
| Judgment, design, cross-cutting | Opus | Deep reasoning worth the cost | architect (both passes), phase-verifier, forger orchestration, react-ux-designer, QA triage |

Forger selects the model at dispatch time based on the unit's manifest + file count + unit_type. Per-skill default lives in `.claude/skills/README.md`; forger may override up (escalate on `BLOCKED`) or down (mechanical sub-unit inside a Sonnet skill).

## Forbidden Paths (default denials)

Every subagent manifest must declare `forbidden_paths`. Baseline denials for all units:

- `boilerplate/**` — template, never editable.
- `docs/phases/phase-<N-1>/**` — prior phase artifacts except that phase's summary.
- Other subagent's `return_path` files.
- `.claude/skills/**` — skills don't edit themselves during dispatch.

Unit-specific denials (backend unit can't read `frontend/**`, and vice versa) live in each skill's Context Manifest.

## Budget Tokens

Subagents run on fresh 1M-context models. Default `budget_tokens: 900000` in the manifest leaves ~100k headroom for output. Do **not** shrink the budget — the whole point of subagent dispatch is that the parent doesn't hold the subagent's content. Smaller budgets don't save parent tokens; they just invite false `BLOCKED: unit too large` returns.

Only override `budget_tokens` when:
- Running a Haiku subagent (smaller context window) — use `180000`.
- Diagnostic / debugging runs where the spec is known-small.

The parent pays for **the subagent's final return summary only** (≤200 words + evidence). Everything else stays inside the subagent.

## Dispatch Brief Template

Every Task tool invocation from forger includes:

1. Preamble from `prompts/implementer-brief.md` (or reviewer/verifier equivalent).
2. The unit's Context Manifest (inlined).
3. Explicit PRIOR DECISIONS (relevant `phase_decisions[]` entries) — not the full context.json.
4. The narrow task statement.
5. Required return format (status + evidence + files_changed + concerns[]).

See `prompts/implementer-brief.md` for the canonical template.

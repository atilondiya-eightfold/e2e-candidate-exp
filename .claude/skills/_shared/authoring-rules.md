# Skill Authoring Rules

The contract every skill in `.claude/skills/` obeys. Referenced from every SKILL.md rewrite.

Adapted from obra/superpowers `writing-skills`, anthropic/skills official pattern, and everything-claude-code (ECC). Diverges where the Forge pipeline needs it (subagent dispatch, phase orchestration).

## Purpose

Keep skills small, consistent, and trigger-correct — so Claude loads the right skill at the right time and reads its body instead of just the description.

## Frontmatter

Two fields only:

```yaml
---
name: skill-name
description: Use when <specific triggering conditions>. Also triggers when the user says "<phrase 1>", "<phrase 2>".
---
```

**Rules:**
- `name`: kebab-case, letters/numbers/hyphens only.
- `description`: ≤500 characters, third person, starts with "Use when". Describes **when to use**, not **what the skill does**.
- **Never summarize the workflow in the description.** Superpowers testing proved workflow-in-description causes Claude to follow the description and skip the body. Trigger language only.
- No `triggers:` field — trigger phrases live in the description ("Also triggers when the user says …").

## Size Budgets

Hard caps enforced by `_shared/check-skill-size.sh`:

| Skill class | SKILL.md max lines |
|---|---|
| Design-phase / inline (domain-researcher, story-writer, architect, db-architect, api-architect, react-ux-designer) | 350 |
| Builder / verifier (backend-writer, ui-builder, frontend-ui-engineer, perf-test-writer, test-writer, phase-verifier, quality-assurance, deploy-setup) | 450 |
| Orchestrator (forger) | 500 |

Content over budget must move to a sibling file, not be deleted.

## Progressive Disclosure

SKILL.md holds orchestration + judgment. Heavy content lives in siblings:

```
skills/<name>/
  SKILL.md              # required; orchestration + judgment
  reference/            # heavy prose (>100 lines) read on demand
  scripts/              # executables invoked by instruction
  prompts/              # subagent brief templates
```

**Reference syntax (critical):**
- Use `Read \`reference/foo.md\` when <trigger>` lines — Claude loads only when the trigger fires.
- **Never** `@reference/foo.md` — eagerly loads into context and defeats the budget.
- Cross-skill references: name the skill only (`see backend-writer`), not a path.

## Retro-Folding Rule

**Retros are edits, not appends.**

- When adding a lesson, edit the canonical section it applies to. Add an inline marker the first time: `[retro 2026-04-20]`.
- **No `## Retro — Lessons from <project>` or `## Retro vN additions` sections.** The `check-skill-size.sh` lint fails any file containing that pattern.
- Raw retro history lives in `docs/retros/YYYY-MM-DD-<project>.md` — never in the skill file.
- Canonical rules that multiple skills reference go in `_shared/style-rules/`, not inline.

## Code Examples

- One strong example per rule, not three mediocre.
- Complete and runnable. Comments explain **why**, not **what**.
- From real scenarios, not fill-in-the-blank templates.
- No multi-language duplication. Pick the right language for the rule.
- Never put code inside flowcharts.

## Required Sections (recommended order)

Not all skills need all of these; omit what doesn't apply.

1. **Overview** — 1–2 sentences: what this skill does, core principle.
2. **When to Use** — small bullet list or tiny flowchart. Symptoms, not workflow.
3. **Context Manifest** (for subagent skills only) — YAML block per `_shared/manifest-format.md`.
4. **Pre-conditions** — what must exist before this skill runs.
5. **Workflow** — the steps. Keep terse. Extract procedures >40 lines to `reference/`.
6. **Rules** — hard rules, numbered.
7. **After Completion** — the verification + return-contract block for subagent skills.

## Subagent Contract

Every skill that runs as a subagent must:

- Declare a Context Manifest YAML block at the top (see `_shared/manifest-format.md`).
- Declare `forbidden_paths` explicitly (don't inherit silent defaults).
- Declare `budget_tokens` consistent with unit_type.
- Return results per `_shared/return-contract.md` with one of the four status values (`DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, `BLOCKED`).
- Populate the `evidence` field — no completion claims without fresh verification output.

## Description Field — Trigger Checklist

Before shipping a skill, verify the description:
- Starts with "Use when".
- Third person throughout.
- Lists ≥3 concrete trigger phrases ("Also triggers when the user says …").
- Does **not** describe the workflow (no "first does X, then does Y").
- ≤500 characters.

A misfiring description = the skill never loads. This is load-bearing.

## Anti-Patterns

- ❌ `## Retro v3 additions (2026-05-xx)` appended to bottom.
- ❌ Workflow steps enumerated in `description:`.
- ❌ `@` prefix on reference file links.
- ❌ Duplicating style rules across skills instead of `_shared/style-rules/`.
- ❌ Code inside graphviz/mermaid flowcharts.
- ❌ "This skill also handles <unrelated thing>" — one purpose per skill.
- ❌ Generic placeholders: `helper1`, `step_a`, `TBD`.

## Lint

Run before commit:

```bash
bash .claude/skills/_shared/check-skill-size.sh
```

Fails on: size over budget, `## Retro .* additions` pattern, `@reference/` eager loads, missing frontmatter fields.

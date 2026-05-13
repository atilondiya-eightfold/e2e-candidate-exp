# Context Manifest Format

Every heavy skill (one that forger invokes as a subagent) declares a **Context Manifest** at the top of its `SKILL.md`. Forger parses this block when constructing the Task-tool prompt to decide exactly which files to point the subagent at, what the unit of work looks like, and what it must return.

The manifest is the contract between forger (the control plane) and the skill (the worker). It exists so that:

1. Forger can compute a unit list before spawning any subagent (e.g., "backend-writer for phase 1 will run 4 times, one per module").
2. Subagents receive only paths they need — no full artifact content is ever pasted into the prompt.
3. The manifest is enforceable: if a subagent discovers a missing file, it must return `status: blocked, blocked_reason: "manifest missing X"` — a loud failure, not silent drift.

---

## Manifest Location

Place the manifest immediately after the YAML frontmatter, in a fenced code block labelled `yaml`:

````markdown
---
name: backend-writer
description: ...
---

## Context Manifest

```yaml
unit_type: module
...
```

## [rest of skill content]
````

Forger parses the first ```yaml``` block after the frontmatter as the manifest.

---

## Field Reference

| Field | Required | Purpose |
|-------|----------|---------|
| `unit_type` | yes | One of: `module`, `feature_cluster`, `stage`, `batch`, `one_shot`. Determines how forger iterates. |
| `required_inputs` | yes | Paths loaded for every unit. Read once per subagent invocation. Literal paths only, except that `<N>` (current phase number) is permitted — forger substitutes it from `context.json#build_phases[current]` before dispatch. No `<unit>` or `<story-id>` here. |
| `per_unit_inputs` | for iterative unit types | Paths templated per unit (use `<unit>`, `<story-id>`, `<N>`, `<K>` placeholders). `<N>` = current build phase number; `<K>` = stage index within a `stage` unit-type skill (0-indexed). |
| `forbidden_paths` | yes | Hard deny-list. Files the subagent must NOT load even if referenced elsewhere. |
| `conditional_loads` | no | Paths loaded only when a trigger matches (e.g., "retro-lessons.md when unit touches auth"). |
| `budget_tokens` | no (default: 900000) | Soft ceiling for the subagent's working context. Leaves ~100k headroom under the 1M window for output + safety. Override only when a unit is unusually large or small. Subagents only return `blocked: unit too large` when they actually approach this ceiling — not before. |
| `outputs` | yes | Paths the subagent writes on success. Used for completeness checking. |
| `return_path` | yes | Where the subagent writes its JSON return contract file. Forger reads this after the Task call returns. |

---

## Example — `backend-writer`

```yaml
unit_type: module
required_inputs:
  - docs/architecture.md
  - context.json#build_phases[current]
per_unit_inputs:
  - docs/api-spec.md#<unit>
  - docs/db-design.md#<unit>
  - docs/stories/<story-id>.md
  - backend/app/                             # read existing code before writing (Step 0)
forbidden_paths:
  - docs/market-research.md
  - docs/user-stories.md                     # load per-story slice instead
  - frontend/                                # backend-writer never reads frontend code
conditional_loads:
  - path: docs/architecture.md#migration-concerns
    when: unit_touches(existing_model_extension)
budget_tokens: 900000
outputs:
  - backend/app/services/<module>.py
  - backend/app/api/routes/<module>.py
  - backend/app/models/<module>.py           # if new table
  - backend/app/schemas/<module>.py
return_path: docs/phases/phase-<N>/backend-<module>.return.json
```

## Example — `ui-builder` (feature cluster)

```yaml
unit_type: feature_cluster
required_inputs:
  - docs/architecture.md
  - context.json#build_phases[current]
per_unit_inputs:
  - docs/api-spec.md#<unit>
  - docs/stories/<story-ids-in-cluster>      # usually 1-3 stories
  - frontend/src/features/<unit>/            # the mock screens to upgrade
forbidden_paths:
  - docs/market-research.md
  - docs/user-stories.md                     # load per-cluster slice instead
  - backend/                                 # ui-builder never reads backend source
conditional_loads:
  - path: .claude/skills/ui-builder/references/retro-lessons.md
    when: unit_touches(auth|dev-toolbar|async-forms|trailing-slashes)
budget_tokens: 900000
outputs:
  - frontend/src/features/<unit>/api.ts
  - frontend/src/features/<unit>/components/*.tsx
  - frontend/src/features/<unit>/pages/*.tsx
return_path: docs/phases/phase-<N>/ui-<unit>.return.json
```

## Example — `phase-verifier` (stage)

```yaml
unit_type: stage
required_inputs:
  - context.json#build_phases[current]
  - docs/completeness-tracker-phase<N>.md    # merged tracker (forger pre-merges slices)
per_unit_inputs:
  # Stage 0: gate tests only
  # Stage 1: backend source + openapi.json
  # Stage 2: frontend source + screen inventory
  # Stage 3: everything + phase summary draft (the "fat stage")
  - stage-specific (see skill body)
forbidden_paths:
  - docs/market-research.md
  - docs/stories/                            # stage verifies against tracker, not raw stories
budget_tokens: 900000
outputs:
  - docs/phases/phase-<N>/verify-stage-<K>.md
  - docs/phases/phase-<N>-summary.md         # only Stage 3 writes this
return_path: docs/phases/phase-<N>/verify-stage-<K>.return.json
```

## Example — `react-ux-designer` (one-shot)

```yaml
unit_type: one_shot
required_inputs:
  - docs/domain-doc.md
  - docs/user-stories.md                     # acceptable here — one-shot has budget
  - docs/personas.md
  - frontend/                                # read boilerplate setup
forbidden_paths:
  - docs/market-research.md                  # summary already in domain-doc
  - backend/                                 # designer never reads backend source
budget_tokens: 900000                        # let it use the full window
outputs:
  - frontend/src/routes/
  - frontend/src/features/
  - frontend/src/components/dev/PersonaSwitcher.tsx
  - frontend/src/components/dev/StateDebugBar.tsx
return_path: docs/react-ux-designer.return.json
```

---

## Unit Type Semantics

| unit_type | Who decides the unit list? | Typical count |
|-----------|----------------------------|---------------|
| `module` | forger reads `build_phases[current].db_models` + `api_endpoints` and groups by module | 3–8 per phase |
| `feature_cluster` | forger reads `build_phases[current].frontend_screens` and groups related screens (2–4 per cluster) | 3–6 per phase |
| `stage` | fixed list declared in skill body (e.g., phase-verifier has stages 0/1/2/3) | 4–5 per phase |
| `batch` | forger splits the input into groups of N (e.g., 3–5 stories per batch for story-writer) | 4–12 total |
| `one_shot` | single invocation, no iteration | 1 |

---

## How Forger Uses the Manifest

1. **Before first Task call:** forger reads the skill's manifest, computes the unit list from `context.json`, and writes it to `context.json#current_skill_units[]`.
2. **For each unit:** forger builds a Task prompt from the fixed template (see `forger/SKILL.md#Subagent Invocation Protocol`), substituting `<unit>`, `<story-id>`, `<N>` placeholders.
3. **After Task returns:** forger reads `<return_path>` (the JSON file written by the subagent), validates against `return-contract.md`, and moves on.
4. **On `status: blocked`:** forger inspects `blocked_reason`. If "manifest missing X", this is a manifest bug — forger escalates to the user rather than retrying.

---

## Rules

1. **Paths only, never content.** Forger pastes file paths into the subagent prompt; the subagent uses Read to fetch content itself. This keeps the parent thread small.
2. **Forbidden paths are a hard deny-list.** The subagent prompt includes a `DO NOT READ:` section enumerating these paths.
3. **Conditional loads require a trigger.** The `when:` expression is prose evaluated by the subagent — not by forger. Subagent decides whether to load.
4. **Budget is advisory.** The subagent monitors its own context usage and returns `status: blocked, blocked_reason: "unit too large — suggest splitting"` if it will exceed budget.
5. **Outputs must be deterministic paths.** No `**/*.py` globs. This lets forger check for missing deliverables.

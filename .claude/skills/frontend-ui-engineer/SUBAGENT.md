# Frontend UI Engineer — Subagent Contract

This skill is invoked by **forger** as a Task-tool subagent. The manifest and return protocol are:

- Manifest format: `.claude/skills/_shared/manifest-format.md`
- Return contract: `.claude/skills/_shared/return-contract.md`

## Context Manifest

```yaml
unit_type: feature_cluster
required_inputs:
  - docs/architecture.md
  - context.json#build_phases[current]
per_unit_inputs:
  - docs/api-spec.md#<unit>
  - docs/stories/<story-ids-in-cluster>
  - frontend/src/features/<unit>/
forbidden_paths:
  - docs/market-research.md
  - docs/user-stories.md
  - backend/
conditional_loads:
  - path: .claude/skills/ui-builder/references/retro-lessons.md
    when: unit_touches(auth|dev-toolbar|async-forms|trailing-slashes)
budget_tokens: 900000
outputs:
  - frontend/src/features/<unit>/
return_path: docs/phases/phase-<N>/ui-<unit>.return.json
```

## Running as a Subagent

One **feature cluster** per invocation. Write:
- Source files under `frontend/src/features/<unit>/`
- Summary: `docs/phases/phase-<N>/ui-<unit>.summary.md` (<300 words)
- Tracker slice: `docs/phases/phase-<N>/completeness-tracker-phase<N>-<unit>.md`
- Return JSON: at `return_path`

Do NOT call AskUserQuestion. Use `status: blocked` in the return JSON if you need user clarification — forger will resolve and re-invoke.

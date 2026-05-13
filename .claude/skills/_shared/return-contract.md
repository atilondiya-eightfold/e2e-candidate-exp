# Subagent Return Contract

Every subagent spawned by forger via the Task tool returns structured JSON. The JSON is written to disk at the `return_path` declared in the skill's context manifest. Forger reads the JSON (not the prose summary) for control-flow decisions.

Markdown narrative returns get ignored in half of parent/child handoffs. JSON is mechanically checkable.

---

## Schema

```json
{
  "skill": "backend-writer",
  "unit": "goals",
  "status": "done | done_with_concerns | needs_context | blocked | error",
  "evidence": {
    "build_output_tail": "...last 30 lines of build/lint/test command output...",
    "commands_run": ["bash scripts/lint.sh", "pytest backend/tests/services/test_goal.py"],
    "test_counts": {"passed": 12, "failed": 0, "skipped": 0},
    "screenshot_paths": []
  },
  "files_written": [
    "backend/app/models/goal.py",
    "backend/app/services/goal.py",
    "backend/app/api/routes/goal.py"
  ],
  "files_modified": [
    "backend/app/api/main.py",
    "backend/scripts/seed.py"
  ],
  "artifact_paths": {
    "summary": "docs/phases/phase-1/backend-goals.summary.md"
  },
  "completeness_tracker_slice": "docs/phases/phase-1/completeness-tracker-phase1-goals.md",
  "completeness_tracker_rows_filled": 12,
  "decisions": [
    {
      "scope": "goals",
      "decision": "Use soft-delete via status=archived; no hard DELETE endpoint",
      "rationale": "api-spec only defines PATCH /goals/{id} with status field; no DELETE route"
    }
  ],
  "open_issues": [],
  "blocked_reason": null,
  "next_unit_hint": "reviews"
}
```

---

## Field Reference

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `skill` | string | yes | Name of the skill that ran (must match SKILL.md `name`). |
| `unit` | string | yes | Identifier for the unit of work (module name, feature cluster name, stage number, batch id, or `"one_shot"`). |
| `status` | enum | yes | `done` = complete + all rules honored, evidence attached; `done_with_concerns` = complete but flagging issues (populate `open_issues[]`); `needs_context` = blocker resolvable by more context (forger re-dispatches same model); `blocked` = cannot proceed without split / model escalation / human; `error` = unexpected failure, forger retries once then escalates. **Legacy value `complete` accepted as alias for `done` during transition.** |
| `evidence` | object | yes for `done`/`done_with_concerns` | Fresh verification output. Populate `build_output_tail` (≤30 lines), `commands_run`, `test_counts`, and `screenshot_paths` (for verifier skills). Iron Law: no `done` claim without this. |
| `files_written` | string[] | yes | Paths created by this unit. Empty for one-shot skills that write to a single file. |
| `files_modified` | string[] | yes | Paths changed by this unit (not newly created). |
| `artifact_paths.summary` | string | yes for `complete` | Path to a human-readable markdown summary (<300 words) that forger shows the user at the approval gate. |
| `completeness_tracker_slice` | string | yes for `complete` when applicable | Path to this unit's slice of the phase's completeness tracker. Forger merges slices at phase end. |
| `completeness_tracker_rows_filled` | integer | yes for `complete` when applicable | Row count in the slice. Used for arithmetic reconciliation at phase end. |
| `decisions` | object[] | optional | Decisions made during this unit that future units need to know about. Forger appends to `context.json.phase_decisions[]`. |
| `open_issues` | object[] | optional | Known-but-deferred issues. Each: `{severity, description, file, recommended_fix}`. Forger surfaces at approval gate. |
| `blocked_reason` | string\|null | yes when `status: blocked` | Human-readable reason. Examples: `"manifest missing docs/X.md"`, `"unit too large — suggest splitting into A, B, C"`, `"clarification needed: should we support Y?"`. |
| `next_unit_hint` | string | optional | Subagent's suggestion for the next unit. Non-binding; forger uses dependency order from context.json. |

---

## Summary Markdown Format

The file at `artifact_paths.summary` is what forger shows the user at the per-phase approval gate. Keep it short and structured:

```markdown
# Backend — goals module

## What was built
- Goal model (status enum: draft/active/archived/completed)
- CRUD service with RBAC (IC = own goals; Manager = direct reports)
- 5 endpoints: GET/POST/PATCH /goals/, GET/PATCH /goals/{id}, POST /goals/{id}/archive

## Decisions
- Soft-delete via status=archived (no DELETE endpoint)
- Progress field is 0-100 integer, not decimal (matches api-spec)

## Files
- Written: goal.py (model, service, route, schema)
- Modified: main.py (router), seed.py (seed_phase_1 adds 3 sample goals)

## Open issues
- None
```

Hard cap: **300 words.** Anything longer means you're rebuilding context in the summary — which defeats the purpose.

---

## Rules

1. **JSON is the source of truth.** Forger makes all control-flow decisions from the JSON. The summary markdown is for human review only.
2. **Write the JSON last.** After all files are on disk and the summary markdown is written, write the JSON — never before. A half-written JSON is a worst-case parser failure.
3. **One retry on malformed JSON.** If forger can't parse the return file, it re-invokes the subagent with a "RETURN CONTRACT REMINDER" block. Second failure = show raw to user.
4. **`blocked` / `needs_context` are control signals, not failures.** Use `needs_context` when forger can resolve by providing missing files or clarifications; use `blocked` when the unit must be split, escalated to a stronger model, or routed to human. Forger handles each differently — pick the right one.
5. **Never include raw artifact content in the JSON.** Paths only. Summary markdown can quote short snippets if essential, but even there — keep it tight.
6. **Decisions block is how cross-unit memory flows.** If your unit made a choice that affects a sibling unit (e.g., "used soft-delete pattern"), record it here. Forger passes it as PRIOR DECISIONS to the next subagent in the same phase.

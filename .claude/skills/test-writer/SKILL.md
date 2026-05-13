---
name: test-writer
description: Use ONLY after phase-verifier Stage 2 returns PASS — writes unit, integration, and E2E tests that codify already-verified behavior from each story's workflow test plan. Dispatched per module with narrow context. Never runs during backend-writer or ui-builder phases. Also triggers when the user says "write tests for <module>", "add test coverage", "codify the workflow test plan", "write acceptance tests", or when forger assigns a test-writer unit post Stage 2.
---

# Test Writer

## Overview

Writes automated tests (pytest unit + integration; Playwright E2E) **after** the feature is already working in preview (phase-verifier Stage 2 PASS). The job is to codify verified behavior, not to discover bugs. Consumes each story's Workflow Test Plan as the AC→test mapping — a lookup, not a generation.

Runs in a fresh subagent with narrow context to avoid bloating the build-phase parent thread. The biggest context-saving pivot in the rebuild.

## When to Use

- Forger dispatches a test-writer unit after phase-verifier Stage 2 has PASSED for the current phase.
- User explicitly requests tests for a specific module post-Stage-2.
- **Never runs during build phases.** If no Stage 2 PASS exists, return `blocked`.

## Context Manifest

```yaml
unit_type: module
required_inputs:
  - docs/api-spec.md#<unit>
  - docs/architecture.md
required_reading:
  - .claude/skills/_shared/style-rules/anti-stub-protocol.md
  - .claude/skills/test-writer/reference/test-patterns.md    # pytest + Playwright how-to
per_unit_inputs:
  - docs/stories/<story-id>/story.md                          # workflow test plan — source of truth
  - backend/app/services/<module>.py
  - backend/app/api/routes/<module>.py
  - backend/app/models/<module>.py
  - backend/app/schemas/<module>.py
  - frontend/src/features/<unit>/                             # entry paths only
forbidden_paths:
  - docs/market-research.md
  - docs/user-stories.md
  - docs/stories/raw/
  - docs/stories/<other-module>/
  - backend/app/services/<other-module>.py
  - backend/app/api/routes/<other-module>.py
  - frontend/src/features/<other-cluster>/
  - docs/phases/phase-<N-1>/                                  # only the prior summary is readable
budget_tokens: 900000
outputs:
  - backend/tests/services/test_<module>.py
  - backend/tests/api/test_<module>_api.py
  - frontend/e2e/<cluster>.spec.ts
return_path: docs/phases/phase-<N>/tests-<module>.return.json
```

Dispatch model: **Sonnet**.

## Pre-conditions (HARD GATE)

- `phase-verifier` Stage 2 for the current phase returned `PASS` (evidence in `docs/phases/phase-<N>/verify-stage-2.return.json`).
- `docs/stories/<story-id>/story.md` exists with a Workflow Test Plan (happy + ≥2 edge + 1 error case).
- `backend/app/services/<module>.py` + route + schema exist and lint clean.
- Frontend cluster at `frontend/src/features/<unit>/` exists and builds clean.

Missing any → return `blocked` or `needs_context`. **Never attempt to generate tests for code that doesn't exist.**

## What to Write

### Backend unit tests — `backend/tests/services/test_<module>.py`
- Pytest. One test per service-layer function × happy + edge + error.
- Use fixtures from `backend/tests/conftest.py` (read existing patterns first).
- Real PostgreSQL test DB; no mocks of the DB layer.
- Docstring names the AC covered: `"""AC §4-3: user cannot archive a goal they don't own (expects 403)."""`.

### Backend integration tests — `backend/tests/api/test_<module>_api.py`
- Pytest + FastAPI `TestClient`.
- Covers every endpoint in `docs/api-spec.md#<unit>`: happy + auth + RBAC + validation (mirror rules from api-spec).
- **Self-access bypass explicitly tested** (see `_shared/style-rules/fastapi-patterns.md`).
- Pagination cursor stability under concurrent writes.
- Side-channel response fields asserted (`canEdit`/`canDelete`/`canAssign`).

### Frontend E2E — `frontend/e2e/<cluster>.spec.ts`
- Playwright. One `describe` per story.
- Executes the Workflow Test Plan happy path + each edge case + error case, step by step.
- `loginViaUI` helper (never localStorage mock) — see `reference/test-patterns.md`.
- Page Object Model for any screen with ≥3 interactions.
- Asserts UI state after every interaction (visible elements, toast messages, list membership) — not just HTTP status.
- Screenshot on failure (Playwright default; confirm).

## AC → Test Coverage Matrix

Every test file opens with a matrix:

```
| Story AC | Workflow-test step | Test case |
|---|---|---|
| S-003 §4-1 | Happy-path step 3 | test_create_goal_success |
| S-003 §4-2 | Edge-case 1 step 2 | test_create_goal_empty_title_400 |
| S-003 §4-3 | Error-case step 1 | test_create_goal_server_500 |
```

Every AC in the Workflow Test Plan MUST have at least one test. Uncovered AC = return `blocked` with the list.

## Anti-Stub Discipline

Per `_shared/style-rules/anti-stub-protocol.md`:
- No placeholder tests (`def test_placeholder(): assert True`).
- No `@pytest.mark.skip` without a linked issue.
- No hardcoded response mocks where a real DB/API call works.
- If a test can't be meaningfully written (dependency on an unimplemented cron, etc.), flag as `open_issue` with severity — don't leave a fake green.

## Using the Workflow Test Plan (lookup, not generation)

The plan already enumerates persona + preconditions, each step (tool call + expected UI state + expected network), and edge/error cases. Translation:

- Preview `preview_click`/`preview_fill` → Playwright `page.click`/`page.fill`.
- "Expected UI state" → assertion set.
- "Expected network" → backend integration test (API side) + `page.waitForResponse` (E2E side).

Do NOT invent new scenarios. Incomplete plan → return `blocked`; story-writer updates, then re-dispatch.

## Rules

1. **Runs POST Stage 2 only.** Pre-condition gate is hard.
2. **Consume the Workflow Test Plan — don't invent.**
3. **Every AC has a test.** Coverage matrix mandatory.
4. **No stubbed tests.** See `anti-stub-protocol.md`.
5. **Real PostgreSQL for integration tests.** No DB mocks.
6. **`loginViaUI` in E2E** — never localStorage token injection.
7. **Self-access bypass explicitly tested** where api-spec marks it.
8. **Pagination cursor stability** tested under concurrent writes.
9. **Test docstrings name the AC.**
10. **Screenshots on failure** in E2E.
11. **No emoji in tests.**
12. **Extract reusable helpers** to `backend/tests/conftest.py` + `frontend/e2e/helpers/`.

## After Writing

1. `pytest backend/tests/services/test_<module>.py backend/tests/api/test_<module>_api.py` — must pass.
2. `pnpm run test:e2e -- --grep <cluster>` — must pass.
3. Populate evidence with test counts + last 30 lines.
4. Return JSON at `return_path`:

```json
{
  "skill": "test-writer",
  "unit": "<module>",
  "status": "done",
  "evidence": {
    "commands_run": ["pytest backend/tests/services/test_<module>.py", "pytest backend/tests/api/test_<module>_api.py", "pnpm run test:e2e -- --grep <cluster>"],
    "test_counts": {"passed": 0, "failed": 0, "skipped": 0},
    "build_output_tail": "..."
  },
  "files_written": ["backend/tests/services/test_<module>.py", "backend/tests/api/test_<module>_api.py", "frontend/e2e/<cluster>.spec.ts"],
  "files_modified": ["backend/tests/conftest.py", "frontend/e2e/helpers/login.ts"],
  "coverage_matrix": {
    "total_acs": 14,
    "covered": 14,
    "uncovered": []
  },
  "open_issues": []
}
```

Do NOT call `AskUserQuestion`.

## Downstream Consumers

- `phase-verifier` Stage 3 runs the full test suite as part of integration verification.
- `quality-assurance` uses test counts alongside preview-driven regression.
- CI pipeline (deploy-setup): unit + integration on PR; E2E on merge.

Deep how-to: `.claude/skills/test-writer/reference/test-patterns.md` (pytest fixtures, Playwright Page Object, `loginViaUI` helper, test naming conventions, coverage-matrix template).

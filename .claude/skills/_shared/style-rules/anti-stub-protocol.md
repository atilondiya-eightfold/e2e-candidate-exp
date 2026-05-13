# Anti-Stub Protocol — Hard Gate

**Purpose:** prevent mock, placeholder, or hardcoded-literal code from reaching a "done" declaration. This is a HARD GATE — handoff is blocked until every rule passes. A stub is any function that returns hardcoded data in a code path the UI or API actually calls.

---

## 1. Definition — What Counts as a Stub

Any of the following in a service method, route, or React component body is a STUB:

- `pass` as the only statement
- `...` (Ellipsis) as the only statement
- `return []`, `return {}`, `return None`, `return 0`, or any literal return NOT derived from a database query or real computation
- `# TODO`, `# FIXME`, `# PLACEHOLDER`, `# IMPLEMENT`
- Method body that is entirely pseudocode comments
- `raise NotImplementedError`
- Route handler returning hardcoded status strings (`self_assessment_status="NOT_STARTED"`) instead of querying the DB
- Frontend handler: `onClick={() => {}}`, `onClick={() => console.log("TODO")}`, or `onClick={() => setDialogOpen(true)}` where the dialog has only a Close button

## 2. No Placeholder Routes

Every endpoint must be testable end-to-end against the real schema. If a route exists in `app/api/routes/`, it must hit the DB, validate input, return a real resource, and be exercised by at least one seeded curl probe before handoff.

```bash
# For each endpoint, verify real data returns:
TOKEN=$(curl -s -X POST .../login/access-token -d "..." | jq -r .access_token)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/<endpoint>/
# Response must be non-empty and contain seeded records, not [] / {} / null
```

Output the endpoint verification table per phase:

```
ENDPOINT VERIFICATION — Phase N
| Endpoint                    | Method | Status | Data Content              | Verdict |
|-----------------------------|--------|--------|---------------------------|---------|
| /resources/                 | GET    | 200    | 3+ records with real data | REAL    |
| /resources/{id}/dashboard   | GET    | 200    | stats aggregated from DB  | REAL    |
```

## 3. No Mock Data in Production Code Paths

After API hooks exist, DELETE mock imports. Seed data lives separately in `backend/scripts/seed.py`; it is NEVER imported by route or service code.

```bash
grep -rn '@/mocks' frontend/src/routes/ frontend/src/features/
# Must be empty before handoff
```

Mock-to-production upgrade, per the ui-builder:

- **Phase 0**: API contract layer foundation — types, axios instance, QueryClient configured; dev toolbar REMOVED at this phase, not deferred
- **Phase 1**: wire real TanStack Query hooks screen by screen; delete mock imports as each screen migrates
- **Phase 2**: polish + test coverage

Dev toolbar removal belongs in Phase 0, NOT Phase 2. Leaving `DevToolbarProvider` in `__root.tsx` after real auth ships blocks role-based routing.

## 4. Step 0 — Discovery Before Writing

Before writing ANY module, the author MUST:

1. **Read the story** in `docs/user-stories.md` — every acceptance criterion
2. **Read the API spec** entries for that module
3. **Read the DB schema** for affected models
4. **Check prior-phase context** via forger — what's already built, what decisions were made
5. **List open questions** — ambiguities that need clarification BEFORE implementation starts

```
STEP 0 DISCOVERY — <module>
Files to read: <list>
Files to modify: <list>
Related services: <list>
Open questions: <list or "none">
```

Skipping Step 0 produces stubs-by-ignorance (implementing the wrong logic because the story wasn't read).

## 5. Mandatory Stub Scan — After Every File

Run after each service file, route file, or screen file written:

```bash
# Python stubs
grep -rEn "^\s*pass$|^\s*\.\.\.\s*$|raise NotImplementedError|# TODO|# FIXME|# PLACEHOLDER" \
  backend/app/services/ backend/app/api/routes/
# Must return empty

# Suspicious literal returns (review each)
grep -rEn 'return \[\]|return \{\}|="NOT_STARTED"|="PENDING"|="NOT_SHARED"' \
  backend/app/services/ backend/app/api/routes/
# Review each; literal only OK when derived from a DB query that returned zero rows

# Frontend stub handlers
grep -rEn 'onClick=\{\(\) => \{\}\}|onClick=\{\(\) => console\.' frontend/src/routes/ frontend/src/features/
# Must be empty
```

Any hit that is not a justified-and-documented empty-result path = BLOCKED.

## 6. Method Completeness Proof

Output a completeness line per method in the delivery summary:

```
METHOD COMPLETENESS — cycles.py
  get_direct_reports()       -> REAL (queries Employee table, joins SelfAssessment for status)
  launch_cycle()             -> REAL (validates DRAFT status, transitions to ACTIVE, emits audit)
  list_reminders()           -> STUB (returns empty list) — BLOCKED
```

Any STUB = handoff blocked. Pseudocode comments in the skill file are DESIGN GUIDANCE, not implementation; final code replaces every comment with working logic.

## 7. Validation Mirrors Frontend ↔ Backend

Every validation rule (LWD ≥ start_date, salary > 0, email format, char limit) runs on BOTH sides:

- Frontend: Zod schema via `zodResolver` in React Hook Form
- Backend: Pydantic `@model_validator` or field `Field(..., max_length=2000)`

The rule appears once in the story AC and is verified in both layers. A rule in only one layer is a bug — document the shared constant and reference it from both schemas.

## 8. Coverage Gate — One Automated Test Per AC

For every acceptance criterion on every story in the phase, at least ONE automated test exists:

- Unit test (React Testing Library / pytest) — ACs about logic, validation, rendering
- Integration test (pytest against real PG) — ACs about DB persistence, RBAC
- E2E test (Playwright) — ACs about critical user journeys, multi-step flows

```
AC TRACEABILITY — Phase N, Story STORY-X
| # | Acceptance Criterion                         | Test File                          | Status |
|---|----------------------------------------------|------------------------------------|--------|
| 1 | Auto-save on focus-out per question          | SelfAssessmentForm.test.tsx        | DONE   |
| 2 | Character limit 2000 chars, blocking at limit| cycle_validation_test.py           | DONE   |
| 3 | Submit requires all Required answered        | self_assessment_submit_e2e.spec.ts | DONE   |
```

"Covered by manual testing" is NEVER a valid status. An AC without an automated test = BLOCKED.

## 9. Runtime Verification Before Declaring Done

A module is not done because `pnpm run build` or `ruff check` passed. Before handoff:

1. Migrations run against a real PG: `alembic upgrade head`
2. Server starts + health check: `curl http://localhost:8000/api/v1/utils/health-check/`
3. Login as the target persona through `/login` (not localStorage injection)
4. Navigate to every new screen and click every new button
5. For every form: fill → save → reload → verify draft persisted
6. Browser console: zero errors; network: zero 4xx/5xx

A screen or endpoint is not done until a human can actually use it end-to-end.

## 10. Spec Drift Sweep

For every changed endpoint or model, verify `docs/api-spec.md` and `docs/db-design.md` names match implementation — path, status enum values, field names. Drift = phase FAILS. Update the spec in the same commit as the code change.

---

*Source: COREHR v1 retro, apex-perf retro, Retro v2 (2026-04-20). Raw: docs/retros/*

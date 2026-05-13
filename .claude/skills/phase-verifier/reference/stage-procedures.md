# Phase Verifier — Per-Stage Procedures

Per-stage runbooks extracted from `SKILL.md` to keep the body lean. Read the stage you are currently running.

---

## Stage 0 — Automated Gate Tests

Purpose: cheap pre-filter. If basic hygiene fails, don't spend Opus budget on Stages 1–3.

### Inputs
- `backend/` source
- `frontend/` source
- `docs/api-spec.md` (for OpenAPI contract match)

### Procedure
1. Backend lint: `cd backend && bash scripts/lint.sh` (mypy + ruff check + ruff format --check).
2. Backend type-check: already in lint script; confirm mypy clean.
3. Backend unit tests: `cd backend && bash scripts/test.sh` (pytest with coverage).
4. Frontend lint: `cd frontend && pnpm run lint` (zero-warning tolerance).
5. Frontend type-check: `cd frontend && tsc --noEmit`.
6. Frontend unit tests: `cd frontend && pnpm run test:unit:coverage`.
7. OpenAPI contract match:
   - Start backend: `fastapi run --reload app/main.py &` (wait for /docs to respond).
   - Fetch `http://localhost:8000/openapi.json`.
   - Compare endpoint set vs `docs/api-spec.md` — every spec endpoint present, no extra endpoints.
   - Compare response schemas field-by-field for each endpoint.

### Evidence
- Last 30 lines of each command's output.
- Test counts (passed / failed / skipped).
- OpenAPI diff summary (endpoints added / removed / changed).

### PASS criteria
- All lint passes zero-warning.
- All unit tests pass.
- OpenAPI matches api-spec (no added/removed endpoints; response shapes match).

### FAIL → list all failures, block Stage 1 dispatch, forger re-dispatches the responsible units.

---

## Stage 1 — Backend Alone

Purpose: confirm the backend works without the frontend.

### Inputs
- `backend/` source
- `docs/api-spec.md`
- `docs/db-design.md`
- `backend/scripts/seed.py`

### Procedure
1. Drop + recreate test DB (per conftest pattern).
2. `alembic upgrade head` — migration must apply cleanly.
3. `python backend/scripts/seed.py --phase <N>` — seed succeeds, rows appear.
4. For every endpoint in `docs/api-spec.md#<module>`:
   - curl the happy path with valid auth token. Expect documented 2xx response.
   - curl without auth. Expect 401.
   - curl with wrong role. Expect 403 (unless endpoint documents self-access bypass, then 200).
   - curl with invalid body (missing required / wrong type). Expect 400 with the documented error envelope.
   - For endpoints with filters: curl with each filter, verify response narrows appropriately.
   - For list endpoints: curl with `?cursor=` + `?limit=`. Verify pagination envelope (`data`, `meta.cursor`, `meta.has_more`).
5. Verify side-channel response fields present (canEdit, canDelete, canAssign).
6. Verify enum values include display-name mapping in responses.
7. Check trailing-slash behavior: curl `/api/v1/users` (no slash) should NOT 307. The app has `redirect_slashes=False`.
8. Check argon2 cost: hit `/api/v1/auth/login/` with correct creds, measure response time. Flag if >2s for documentation purposes.

### Evidence
- curl response bodies for each endpoint (at minimum: one happy, one auth fail, one RBAC fail, one validation fail).
- Seed script output.
- Alembic upgrade output.

### PASS criteria
- Every endpoint matches api-spec (path, method, auth, response shape, error envelope).
- Self-access works where documented.
- Pagination envelope correct.
- Trailing-slash behavior correct.
- No 500s on happy paths.

---

## Stage 2 — Frontend Alone (preview-first)

Purpose: confirm the frontend renders correctly against mocked data, matching the react-ux-designer output.

### Inputs
- `frontend/` source
- `docs/stories/<id>/story.md` for every story in the phase (workflow test plans)
- react-ux-designer output (the approved mock screens, same repo path)

### Procedure
1. `preview_start` — dev server via Vite HMR. Confirm reachable.
2. For each persona in `docs/personas.md`:
   a. Via PersonaSwitcher (dev tool), set currentPersona.
   b. Navigate every route the persona can access.
   c. Per-route: render every state (empty, loading, error, populated, permission-denied).
      - Use StateDebugBar to flip app-state flags.
      - `preview_snapshot` at each state.
      - `preview_screenshot` at each state → save to `docs/phases/phase-<N>/screenshots/<persona>-<route>-<state>.png`.
3. For each story, walk the Workflow Test Plan:
   - Happy path: step-by-step. After each step, snapshot + screenshot + compare to "Expected UI State".
   - Edge cases: same.
   - Error case: same.
4. Clickability audit: on each screen, identify every button. Click each. Any orphan (no effect, console warning "no handler") = P0 bug.
5. Active-state audit: for every interactive element, trigger hover + focus + active + disabled. Screenshot each. Any missing state = P1.
6. `preview_console_logs` — any error or warning recorded with severity.
7. `preview_network` — list all network activity. Flag unexpected calls (e.g., a dashboard doing 5 surprise GETs).
8. Fidelity scoring per `ui-fidelity-checklist.md`:
   - For each screen, score 10 points × weights.
   - If score < 90 overall → FAIL for that screen → overall stage FAIL.

### Evidence
- Screenshot paths (hundreds usually).
- `preview_console_logs` output (or "clean").
- `preview_network` summary table.
- Fidelity scorecard per screen.
- Clickability + active-state audit tables.

### PASS criteria
- Every workflow-test-plan journey completed without blocker.
- Fidelity score ≥ 90 on every screen.
- Zero console errors.
- Zero orphan buttons.
- Active-state audit passes.
- No unexpected network calls.

---

## Stage 3 — Full-Stack Integrated (preview-first)

Purpose: confirm everything works together, including real auth, real DB, real API, real validation.

### Inputs
- Same as Stage 1 + Stage 2.
- `test-writer` output (post Stage 2 dispatch) — Playwright E2E tests included in scope.

### Procedure
1. Start backend: `fastapi run --reload app/main.py &`. Wait for `/docs`.
2. Apply migrations: `alembic upgrade head`.
3. Seed: `python backend/scripts/seed.py --phase <N>`.
4. `preview_start` for frontend (hitting the real backend, not mocks).
5. Repeat Stage 2's per-screen + per-persona walkthrough, but now hitting real endpoints.
   - Verify network calls actually reach the backend (status codes in `preview_network`).
   - Verify side-channel fields populate with real data.
   - Verify enum display-name mapping matches backend values.
   - Verify validation mirror: FE Zod rules reject bad input before submit; BE Pydantic rejects if client bypasses.
6. Run the full E2E suite: `pnpm run test:e2e`.
   - All tests from `test-writer` output must pass.
   - Screenshots on failure (Playwright default) captured as evidence.
7. Run Stage 0's automated gates again to ensure the integration didn't regress anything: lint + unit tests.
8. Cross-persona integration tests (from test-writer):
   - IC creates, Manager reviews: verify data flows.
   - Admin changes settings, IC sees updated behavior.
9. Smoke-test auth flow: login → token stored → protected route reachable → logout → protected route 401.

### Evidence
- All Stage 2 evidence types (screenshots, console, network, fidelity scorecard).
- Playwright test-run output with last 30 lines.
- E2E screenshot artifacts.
- Cross-persona flow confirmations.

### PASS criteria
- All Stage 2 criteria hold with real backend.
- All E2E tests pass.
- Cross-persona flows work.
- Auth flow behaves correctly.
- No regressions in Stage 0 gates.

### On PASS:
- Leave backend + dev server running for user review.
- Write `docs/phases/phase-<N>-summary.md` (≤2000 words per SKILL.md rules).
- Return includes the Handoff Card in the summary.

---

## Common Pitfalls

- **Starting servers in the subagent's shell without backgrounding properly.** Use `run_in_background: true` via Bash tool or document stop commands.
- **Forgetting to wait for readiness.** Poll `curl http://localhost:8000/docs` until 200 before moving on.
- **Screenshot bloat.** Save only the diff-worthy snapshots, not one per tiny scroll.
- **Fidelity scoring subjectivity.** Always cite the specific checklist point + weight + reason. "This looks off" is not evidence.
- **Reporting preview_console_logs warnings as 'clean'.** Warnings count. A single React key warning on a list = P1 bug.
- **Skipping the active-state audit on tables and forms.** Every row hover, every input focus — audit them all.

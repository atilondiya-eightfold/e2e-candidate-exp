---
name: perf-test-writer
description: Use when backend-writer has produced approved endpoints and the project needs a k6 load/performance test suite (smoke + load + stress + spike + soak + breakpoint + auth-perf) with shared helpers and SLA thresholds. Runs as a one-shot subagent. Also triggers when the user says "add load tests", "performance test", "stress test the API", "benchmark login", "k6 tests", "capacity test", "spike test", "soak test", "auth throughput", or "how much load can it handle".
---

# Performance Test Writer

## Overview

Generates a complete k6 performance test suite — smoke, load, stress, spike, soak, breakpoint, auth-perf — with shared helpers, SLA thresholds, and realistic user-journey simulation derived from approved stories and endpoints. Scaffolding is mechanical (Haiku-friendly); auth-perf breakpoint tuning warrants Sonnet.

## When to Use

- After `backend-writer` has produced approved endpoints and phase-verifier Stage 1 has passed.
- User asks for load / perf / capacity / throughput tests.

## Context Manifest

```yaml
unit_type: one_shot
required_inputs:
  - docs/api-spec.md
  - docs/architecture.md
  - backend/app/api/routes/
  - docs/stories/**/story.md                 # workflow test plans — drive user-journey simulation
required_reading:
  - .claude/skills/_shared/style-rules/fastapi-patterns.md
forbidden_paths:
  - docs/market-research.md
  - frontend/
  - boilerplate/
  - backend/app/services/                    # routes + OpenAPI are enough
budget_tokens: 180000                        # Haiku default; raise to 900000 on Sonnet escalation
outputs:
  - backend/perf/
return_path: docs/perf-test-writer.return.json
```

Default dispatch model: **Haiku** (mechanical scaffolding). Escalate to Sonnet for breakpoint tuning, realistic mix-of-journeys design, or when unit returns `blocked`.

## Pre-conditions

- `backend-writer` outputs approved (all phase modules at least up to current phase).
- `phase-verifier` Stage 1 (backend alone) has passed for the current phase.
- `docs/api-spec.md` current with enum display-name mapping + RBAC matrix.

## Output Layout

```
backend/perf/
├── README.md
├── lib/
│   ├── config.js                 # env config, base URL, tokens
│   ├── auth.js                   # login helper (surfaces argon2 cost)
│   └── journeys.js               # persona-based user-journey functions
├── data/
│   └── fixtures.js               # deterministic fixture IDs (seeded by seed_phase_<N>)
├── scenarios/
│   ├── smoke.js                  # 1 VU, 1 min, sanity
│   ├── load.js                   # expected load, sustained
│   ├── stress.js                 # ramp past expected to find bottleneck
│   ├── spike.js                  # instant ramp-up
│   ├── soak.js                   # sustained 30–60 min for memory leaks
│   ├── breakpoint.js             # increases until SLA breached
│   └── auth-perf.js              # login throughput alone (argon2 bound)
└── thresholds/
    └── sla.js                    # p95/p99 targets by endpoint class
```

## Scenario Conventions

| Scenario | Stages | Purpose |
|---|---|---|
| Smoke | 1 VU, 60s | Catches trivial breakage pre-CI |
| Load | rampUp 2m → sustained 10m @ expected VUs → rampDown 1m | Confirms steady-state behavior at expected load |
| Stress | rampUp 3m → stages past expected (1.5x, 2x, 3x) | Surfaces where the system starts to degrade |
| Spike | instantaneous jump to 5× load for 1m, back to baseline | Tests elasticity |
| Soak | sustained 30–60m at expected load | Memory leaks, connection pool exhaustion |
| Breakpoint | incremental ramp until SLA breached | Finds the ceiling |
| Auth-perf | login endpoint alone, progressive VUs | Measures argon2-bound throughput (see `_shared/style-rules/fastapi-patterns.md` — argon2 known bottleneck) |

## SLA Thresholds (defaults; override via story requirements)

```js
// thresholds/sla.js
export const SLA = {
  READ: { p95: 200, p99: 500 },         // ms
  WRITE: { p95: 500, p99: 1200 },       // ms
  LOGIN: { p95: 1500, p99: 2500 },      // argon2-bound, explicit higher ceiling
  HTTP_ERROR_RATE: 0.01,                // 1% allowed non-2xx under stress
};
```

Per scenario `thresholds:` block in the k6 options fails the run on breach — CI picks it up.

## User-Journey Simulation

`lib/journeys.js` defines functions per persona derived from `docs/stories/**/story.md` workflow test plans:

- `icHappyPath()` — login → dashboard → list → detail → update → logout.
- `managerReview()` — login → team view → subordinate detail → approve.
- `adminConfig()` — login → admin screens → entity config.

Each journey uses fixture IDs from `data/fixtures.js`, seeded by `seed_phase_<N>()` in backend-writer output. Deterministic IDs keep runs reproducible.

`scenarios/load.js` composes journeys in realistic weights (e.g., 70% IC, 20% manager, 10% admin) reflecting the domain's traffic shape.

## Auth-Perf Treatment

Argon2 is CPU-bound; login is the most expensive endpoint and deserves its own scenario. `auth-perf.js` isolates login throughput and reports requests/sec achievable per worker. Document the argon2 `time_cost` + `memory_cost` settings under test in the scenario comments.

## Rules

1. **One-shot per project** — the whole suite is generated in a single dispatch. Re-run to refresh when endpoints change.
2. **Fixture IDs deterministic** — match `seed_phase_<N>()` output. Never create ad-hoc rows at test time.
3. **Thresholds in `thresholds:` blocks** — k6 fails the scenario on breach, CI-visible.
4. **Workflow-test-plan drives user journeys** — derive the weights and sequences from approved stories, not guesses.
5. **Auth-perf scenario isolates login** — argon2 cost reported explicitly. See `_shared/style-rules/fastapi-patterns.md`.
6. **Trailing slashes on all API paths** in k6 requests. See `fastapi-patterns.md`.
7. **Token lifecycle honored** — obtain token via `lib/auth.js`; reuse within a VU until expiry; re-login on 401. Never hammer `/login/` unless running `auth-perf`.
8. **No hardcoded secrets** — all via k6 env (`__ENV.BASE_URL`, `__ENV.LOGIN_EMAIL`, `__ENV.LOGIN_PASSWORD`).
9. **README documents how to run each scenario** + expected duration + expected output location.
10. **No emoji in artifacts.**

## After Writing

1. Write all files under `backend/perf/`.
2. Run `k6 run backend/perf/scenarios/smoke.js` against the local dev stack to confirm the suite executes end-to-end (do not run the long scenarios — just smoke).
3. Populate evidence with the smoke run's summary output.
4. Write return JSON at `return_path`:

```json
{
  "skill": "perf-test-writer",
  "unit": "one_shot",
  "status": "done",
  "evidence": {
    "commands_run": ["k6 run backend/perf/scenarios/smoke.js"],
    "test_counts": {"passed": 1, "failed": 0, "skipped": 0},
    "build_output_tail": "... k6 smoke output ..."
  },
  "files_written": ["backend/perf/README.md", "backend/perf/lib/*.js", "backend/perf/scenarios/*.js", "backend/perf/thresholds/sla.js"],
  "decisions": [
    {"scope": "perf", "decision": "load-scenario weights IC:70 Manager:20 Admin:10", "rationale": "derived from approved personas"}
  ]
}
```

Do NOT call `AskUserQuestion`. `status: blocked` if argon2 parameters or SLA targets are ambiguous — forger resolves.

## Downstream Consumers

- `phase-verifier` Stage 3 optionally includes `k6 run smoke.js` in the gate script.
- `quality-assurance` reads breakpoint numbers for the regression report.
- `deploy-setup` documents which scenarios run in CI vs on-demand.

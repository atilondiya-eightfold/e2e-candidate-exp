---
name: deploy-setup
description: Use after all build phases are approved and QA regression has passed — generates Docker setup, CI/CD pipeline (GitHub Actions), environment configuration, Alembic migration runner, and a pre-launch deployment checklist. Runs as a one-shot subagent. Also triggers when the user says "deploy this", "set up infrastructure", "create Dockerfile", "configure CI/CD", "prepare for launch", "dockerize", or "write deployment config".
---

# Deploy Setup

## Overview

Generates infrastructure and deploy artifacts for shipping the project: Docker (multi-stage), docker-compose for local parity, GitHub Actions CI/CD, environment configuration per tier (local/staging/production), Alembic migration runner, and a pre-launch checklist. Runs as a one-shot subagent at the end of the pipeline.

## When to Use

- After every build phase is approved and `quality-assurance` post-all-phases regression PASSED.
- User asks to deploy / dockerize / set up CI/CD / prepare launch.
- Forger dispatches after the final phase.

## Context Manifest

```yaml
unit_type: one_shot
required_inputs:
  - docs/architecture.md
  - docs/api-spec.md
  - docs/db-design.md
  - context.json
  - backend/pyproject.toml
  - frontend/package.json
required_reading:
  - .claude/skills/_shared/style-rules/fastapi-patterns.md
  - .claude/skills/_shared/style-rules/sqlmodel-patterns.md
forbidden_paths:
  - docs/market-research.md
  - docs/stories/raw/
  - docs/phases/phase-<N-1>/                    # only the latest summary
budget_tokens: 900000
outputs:
  - deploy/Dockerfile.backend
  - deploy/Dockerfile.frontend
  - deploy/docker-compose.yml
  - deploy/docker-compose.production.yml
  - deploy/.env.example
  - deploy/nginx.conf
  - .github/workflows/ci.yml
  - .github/workflows/deploy.yml
  - deploy/scripts/migrate.sh
  - deploy/scripts/healthcheck.sh
  - deploy/DEPLOY-CHECKLIST.md
  - deploy/README.md
return_path: docs/deploy-setup.return.json
```

Dispatch model: **Sonnet**.

## Pre-conditions

- All `phase-verifier` Stage 3 PASSED for every phase.
- `quality-assurance` post-all-phases regression: zero P0 bugs.
- `docs/api-spec.md` + `docs/db-design.md` + `docs/architecture.md` approved.

Missing → return `blocked`.

## Output Structure

```
deploy/
├── Dockerfile.backend          # multi-stage: builder + runtime
├── Dockerfile.frontend         # multi-stage: pnpm build + nginx serve
├── docker-compose.yml          # local dev parity
├── docker-compose.production.yml  # production override
├── .env.example                # all required vars documented
├── nginx.conf                  # frontend SPA routing fallback + API proxy
├── scripts/
│   ├── migrate.sh              # alembic upgrade head on container start
│   └── healthcheck.sh          # /docs reachable + DB connection
├── DEPLOY-CHECKLIST.md         # pre-launch go/no-go
└── README.md

.github/workflows/
├── ci.yml                      # on PR: lint + unit + integration + build
└── deploy.yml                  # on main push: build + push image + deploy
```

## Dockerfile Conventions

### Backend (`deploy/Dockerfile.backend`)

Multi-stage:
1. **builder**: `python:3.11-slim` → install uv → `uv sync` → compile.
2. **runtime**: `python:3.11-slim` → copy `.venv` + app → non-root user → `fastapi run`.

Healthcheck: `curl -f http://localhost:8000/docs || exit 1` (60s interval).

### Frontend (`deploy/Dockerfile.frontend`)

Multi-stage:
1. **builder**: `node:22-alpine` → `corepack enable` → `pnpm install --frozen-lockfile` → `pnpm run build`.
2. **runtime**: `nginx:alpine` → copy `dist/` → copy `nginx.conf`.

Healthcheck: `curl -f http://localhost/ || exit 1`.

## docker-compose.yml (local parity)

Services:
- `postgres` (16-alpine) — `POSTGRES_*` from `.env`, healthcheck pg_isready.
- `redis` (7-alpine) — only if backend uses Celery/ARQ (check for `celery` in `backend/pyproject.toml`).
- `backend` — depends_on postgres healthy; runs `migrate.sh` then `fastapi run --reload`.
- `frontend` — builds Vite dev server; proxies `/api/*` to backend.

`docker-compose.production.yml` overrides: remove reload, add restart policies, switch ports, remove dev volumes.

## Environment Configuration

`.env.example` documents every var with inline comments:

```env
# Backend — required
DATABASE_URL=postgresql://forge:forge@postgres:5432/forge
SECRET_KEY=<generate via `python -c "import secrets; print(secrets.token_urlsafe(32))"`>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Backend — optional
SENTRY_DSN=
CELERY_BROKER_URL=redis://redis:6379/0

# Frontend — Vite inlines at build
VITE_API_BASE_URL=/api/v1
```

Production secrets NEVER in `.env` — use the deploy platform's secret manager (GitHub Actions secrets, AWS Secrets Manager, GCP Secret Manager, etc.). Document the mapping in `README.md`.

## GitHub Actions Pipelines

### `ci.yml` (on pull_request)

Jobs:
1. **backend-lint**: `bash scripts/lint.sh` (mypy + ruff check + format check).
2. **backend-test**: `bash scripts/test.sh` — needs PostgreSQL service.
3. **frontend-lint**: `pnpm run lint` (zero warnings).
4. **frontend-type**: `tsc --noEmit`.
5. **frontend-test**: `pnpm run test:unit:coverage`.
6. **frontend-build**: `pnpm run build` (catches TS strict errors build-only).
7. **e2e** (on ready-for-review label): full Playwright suite against compose-up stack.

Parallel matrix where possible. Cache `uv` venv + `pnpm` store.

### `deploy.yml` (on push to main)

Jobs:
1. Re-run ci.yml.
2. Build + tag Docker images (`${REGISTRY}/${PROJECT}/backend:${SHA}` + `:frontend:${SHA}`).
3. Push to registry.
4. Deploy to target platform (parameterized — see Platform section).
5. Run migration: `deploy/scripts/migrate.sh` against production DB.
6. Smoke check: `deploy/scripts/healthcheck.sh`.
7. Rollback on failure: redeploy previous tag.

## Migration Runner (`deploy/scripts/migrate.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail
# Run at container start, before the web server binds
cd /app
alembic upgrade head
# If migrations include data changes, run the phase seed idempotently
python backend/scripts/seed.py --phase "${PHASE:-all}" --idempotent
```

Alembic migrations must be reversible (`downgrade()` populated per `_shared/style-rules/sqlmodel-patterns.md`).

## Healthcheck (`deploy/scripts/healthcheck.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail
# Liveness: backend responds + DB reachable
curl -fsS "http://${BACKEND_HOST:-localhost}:8000/docs" > /dev/null
python -c "from app.core.db import engine; engine.connect().close()"
echo "OK"
```

## Pre-Launch Checklist (`deploy/DEPLOY-CHECKLIST.md`)

```markdown
# Pre-Launch Checklist

## Infra
- [ ] Docker images built and pushed
- [ ] PostgreSQL provisioned (size per SLA; see perf-test-writer SLA results)
- [ ] Redis provisioned (if used)
- [ ] Domain + TLS certificates ready
- [ ] CDN / reverse proxy configured

## Secrets
- [ ] SECRET_KEY rotated from .env.example sentinel
- [ ] DATABASE_URL points to production DB
- [ ] All third-party API keys in secret manager (NOT in .env)
- [ ] SENTRY_DSN set (if using Sentry)

## Data
- [ ] Initial migration applied to empty DB: `alembic upgrade head`
- [ ] Production seed (admin user only; no test data): `seed.py --production`
- [ ] Backup strategy configured (daily snapshots, 30-day retention)

## Monitoring
- [ ] Healthcheck endpoint reachable from load balancer
- [ ] Logs aggregated (CloudWatch / Datadog / …)
- [ ] Error tracking active (Sentry)
- [ ] Alerts configured for 5xx spike + DB connection failures

## Verification
- [ ] `phase-verifier` Stage 3 PASSED for every phase
- [ ] `quality-assurance` post-all-phases: zero P0 bugs
- [ ] `perf-test-writer` smoke scenario passed against staging
- [ ] Auth flow smoke-tested on production URL

## Rollback Plan
- [ ] Previous image tag documented
- [ ] Rollback command tested in staging
- [ ] DB migration downgrade tested (`alembic downgrade -1`)
```

## Platform Notes

The skill is platform-agnostic by default. `deploy/README.md` documents three options with per-platform overrides:

1. **AWS ECS / Fargate** — ECR push + task-definition update.
2. **GCP Cloud Run** — gcloud deploy + Cloud SQL proxy.
3. **Render / Railway / Fly.io** — platform-specific CLI.

The user picks one via `AskUserQuestion` in forger, and this skill emits the matching pipeline.

## Rules

1. **Multi-stage Dockerfiles** — keep runtime images slim.
2. **Non-root user** in runtime stages.
3. **Healthchecks defined** for every service.
4. **Secrets never in .env** — `.env.example` is documentation, production uses secret manager.
5. **Migrations reversible** per `sqlmodel-patterns.md`.
6. **Trailing slashes honored** in nginx + reverse proxy — no 307 stripping of auth headers. See `fastapi-patterns.md`.
7. **CI fails on lint warnings** (zero-warning policy).
8. **Alembic upgrade runs before web server binds** — via migrate.sh on container start.
9. **Rollback tested in staging** before first production deploy.
10. **No emoji in artifacts.**

## After Completion

- Write all files.
- `cd deploy && docker compose up --build` locally to confirm stack comes up clean.
- Populate evidence with local stack logs.
- Write return JSON at `return_path`:

```json
{
  "skill": "deploy-setup",
  "unit": "one_shot",
  "status": "done",
  "evidence": {
    "commands_run": ["docker compose build", "docker compose up (smoke)"],
    "build_output_tail": "...",
    "services_up": ["postgres", "backend", "frontend"]
  },
  "files_written": ["deploy/Dockerfile.backend", "deploy/Dockerfile.frontend", "deploy/docker-compose.yml", ".github/workflows/ci.yml", ".github/workflows/deploy.yml", "deploy/DEPLOY-CHECKLIST.md", "..."],
  "decisions": [
    {"scope": "deploy", "decision": "multi-stage Dockerfiles, non-root runtime", "rationale": "slim images + security"}
  ]
}
```

Do NOT call `AskUserQuestion` — forger presents the platform choice.

## Downstream Consumers

- User deploys to the platform; monitors healthcheck + Sentry.
- Future phases: forger detects new stories post-launch and runs the pipeline again; deploy-setup re-runs to update CI/CD and images.

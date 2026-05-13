# CLAUDE.md

Guidance for Claude Code working in this directory.

## Overview

Headless FastAPI BFF for products on top of Eightfold's API v2. Proxies upstream and resolves the calling user's identity from a parent-signed `_eftf_session` cookie. **No database, no ORM, no migrations, no password auth.** Uses `uv` for Python dependency management.

## Commands

All commands run from `./backend/`. The app does not require any external services to boot.

```bash
uv sync                              # Install dependencies
source .venv/bin/activate            # Activate venv

# Development
fastapi run --reload app/main.py     # Dev server on :8000

# Linting & formatting
bash scripts/lint.sh                 # mypy + ruff check + ruff format --check
bash scripts/format.sh               # ruff autofix + format

# Tests (no DB required — all in-process)
bash scripts/test.sh                 # pytest with coverage
pytest tests/path/to/test_file.py    # Run a single test file
pytest tests/ -k "test_name"         # Filter by name
```

## Architecture

### Entry point & routing
`app/main.py` creates the FastAPI app, configures CORS + Sentry, and mounts:
- `api_router` under `settings.API_V1_STR` (`/api/v1`) — only the cookie-session route
- `ef_proxy.router` under `/api/v2` — catch-all forwarder to upstream Eightfold

When a built SPA is present at `STATIC_DIR`, `app/main.py` also mounts `/assets` and a `/{full_path:path}` SPA fallback.

### Configuration
`app/core/config.py` — Pydantic Settings loaded from `../.env`. Fields: `API_V1_STR`, `FRONTEND_HOST`, `ENVIRONMENT`, `EFTF_DEV_*`, `BACKEND_CORS_ORIGINS`, `PROJECT_NAME`, `SENTRY_DSN`, `STATIC_DIR`, `EF_API_BASE_URL`, `EF_OAUTH_TOKEN_URL`, `EF_OAUTH_CLIENT_ID`, `EF_OAUTH_CLIENT_SECRET`, `EF_OAUTH_TIMEOUT_S`. The `_enforce_oauth_creds` validator requires OAuth credentials in non-`local` environments.

### Auth
- **Inbound (frontend -> BFF):** `_eftf_session` cookie signed by the parent app, parsed by `app/core/security_tf_cookie.py` using a custom `itsdangerous` epoch offset to match the parent's serializer. Non-`production` environments fall back to `EFTF_DEV_EMAIL` when no cookie is present.
- **Outbound (BFF -> Eightfold):** Per-`sub` JWT Bearer tokens minted via OAuth client-credentials and cached in `app/clients/ef_oauth.py:TokenCache`. The proxy retries once on upstream 401 after invalidating the cached token.
- `app/api/deps.py` exposes `get_current_user_email` + `CurrentUserEmail` (the only dependency consumed by the proxy + auth route).

### Routes (`app/api/routes/`)
- `auth.py` — `GET /api/v1/auth/session` returns the cookie-derived `{email, group_id}`.
- `ef_proxy.py` — catch-all `api_route` over GET/POST/PUT/PATCH/DELETE that forwards to upstream EF with the minted Bearer token. Falls back to `app/services/mock_eightfold.py:mock_for(path, params)` when upstream is unreachable.

### Schemas / services
- `app/schemas/__init__.py` — empty package; add per-product schemas as needed.
- `app/services/mock_eightfold.py` — skeleton mock-fallback for upstream-unreachable paths. Add per-route stubs as your product needs them.

### Tests (`tests/`)
- `tests/conftest.py` — minimal: a module-scoped `client: TestClient` fixture only. No DB fixtures, no token fixtures.
- `tests/api/routes/test_auth.py` — cookie-session round-trip, dev fallback, invalid-cookie, legacy-epoch handling.
- `tests/api/routes/test_ef_proxy.py` — catch-all proxy behavior + 401 retry.
- `tests/api/test_deps_session_email.py` — `get_current_user_email` resolution order.
- `tests/clients/test_ef_oauth.py` — `TokenCache` mint, expiry, single-flight, invalidation.
- All tests in-process, no external dependencies.

### Adding new features
The headless deployment is intentionally narrow. Most new functionality should be:
1. A new route module in `app/api/routes/`, registered through `app/api/main.py`, OR
2. A new mock stub in `app/services/mock_eightfold.py:mock_for` for offline development.

If you find yourself reaching for a database, an ORM, or password auth, you're outside the scope of this template — that capability lives in `boilerplate/backend/` and warrants a separate project.

## Key conventions

- **Linting**: ruff (pycodestyle, pyflakes, isort, flake8-bugbear, comprehensions, pyupgrade) + mypy strict. Print statements disallowed (T201).
- **Python**: 3.10+, type hints required (mypy strict mode).
- **Direct dependencies**: `fastapi[standard]`, `pydantic`, `pydantic-settings`, `httpx`, `sentry-sdk[fastapi]`, `itsdangerous`. `jinja2`, `email-validator`, `python-multipart` are transitive via `fastapi[standard]`.
- **Out of scope**: SQLModel, Alembic, Postgres, pwdlib, emails, password reset, user CRUD.

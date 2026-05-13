# Backend — Headless BFF

Slim FastAPI proxy on top of Eightfold's API v2. No database, no ORM, no
migrations, no password auth. Resolves the calling user via a parent-signed
session cookie + mints per-user OAuth Bearer JWTs to upstream EF.

For full architecture + auth flow + env setup see the top-level
[README.md](../README.md).

## Prerequisites

- [uv](https://docs.astral.sh/uv/) (Python package manager)
- Python 3.10+

## Quick start

From `backend/`:

```bash
uv sync                              # install deps
source .venv/bin/activate
fastapi run --reload app/main.py     # dev server on :8000
```

Backend reads `<repo-root>/.env` (one level above `backend/`). Copy the
template first:

```bash
cp ../.env.example ../.env
```

In `local` mode the backend boots without any secrets — auth session falls
back to `EFTF_DEV_EMAIL` and upstream proxy returns 502 until you fill in
`EF_OAUTH_CLIENT_ID` + `EF_OAUTH_CLIENT_SECRET`.

## Commands

```bash
bash scripts/lint.sh        # mypy strict + ruff check + ruff format --check
bash scripts/format.sh      # ruff autofix + format
bash scripts/test.sh        # pytest with coverage
pytest tests/path/to/file   # single test file
pytest tests/ -k "name"     # filter by name
```

## Layout

- `app/main.py` — FastAPI entry, lifespan, CORS, SPA fallback
- `app/api/main.py` — `api_router` mount
- `app/api/routes/auth.py` — `GET /api/v1/auth/session`
- `app/api/routes/ef_proxy.py` — catch-all `/api/v2/*` proxy
- `app/api/deps.py` — `CurrentUserEmail` dependency
- `app/clients/ef_oauth.py` — per-`sub` JWT mint + cache
- `app/clients/eightfold.py` — upstream httpx client
- `app/core/config.py` — Pydantic Settings
- `app/core/security_tf_cookie.py` — `_eftf_session` cookie parser
- `app/services/mock_eightfold.py` — local-only fallback for offline dev
- `tests/` — pytest suite (in-process, no external deps)

## Production checklist

`ENVIRONMENT=staging` or `ENVIRONMENT=production` boot will fail unless:

- `TF_SESSION_SECRET` set (matches parent app's signer)
- `EF_OAUTH_CLIENT_ID` + `EF_OAUTH_CLIENT_SECRET` set
- `BACKEND_CORS_ORIGINS` includes the parent iframe origin

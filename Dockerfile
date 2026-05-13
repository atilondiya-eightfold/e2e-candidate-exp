# Multi-stage build: frontend (node) -> runtime (python + nginx + built SPA)
# Single image, two processes — nginx on :5173 serves the built SPA and
# reverse-proxies /api/* to FastAPI on :8010 inside the same container.

# ---------- Stage 1: build the frontend ----------
FROM node:22-alpine AS frontend-build

# Skip husky `prepare` (no .git in build context) and let pnpm itself run
# the lockfile install non-interactively.
ENV HUSKY=0 \
    CI=true

RUN corepack enable

WORKDIR /src

COPY frontend/package.json frontend/pnpm-lock.yaml ./
# pnpm version is pinned in package.json's `packageManager` field (10.33.0)
# because pnpm 11.x makes ignored-build-scripts a hard error. Native
# postinstalls for @swc/core, esbuild, msw aren't needed for `vite build`.
RUN pnpm install --frozen-lockfile

COPY frontend/ ./

# .env.production is committed; supplies VITE_* placeholders needed by
# the EF client's config validator. Real auth happens server-side in the BFF.
RUN pnpm run build


# ---------- Stage 2: python runtime + nginx ----------
FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

# nginx for the frontend tier; tini gives us proper PID-1 signal handling.
RUN apt-get update \
 && apt-get install -y --no-install-recommends nginx tini \
 && rm -rf /var/lib/apt/lists/*

# uv from the official image
COPY --from=ghcr.io/astral-sh/uv:0.9.26 /uv /uvx /bin/

WORKDIR /app

# Install Python deps first for better Docker layer caching
COPY backend/pyproject.toml backend/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project

# Copy backend source. No alembic.ini in this BFF — there's no DB.
COPY backend/app ./app

# Install the project itself
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen

# Built frontend goes where nginx reads from
COPY --from=frontend-build /src/dist /app/static

# nginx config + entrypoint
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/start.sh   /app/start.sh
RUN chmod +x /app/start.sh

# Frontend (nginx) on 5173, backend (FastAPI BFF) on 8010
EXPOSE 5173 8010

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/app/start.sh"]

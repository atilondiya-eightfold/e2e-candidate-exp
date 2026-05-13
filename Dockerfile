# Multi-stage build: frontend (node) -> runtime (python + built SPA)

# ---------- Stage 1: build the frontend ----------
FROM node:22-alpine AS frontend-build

RUN corepack enable

WORKDIR /src

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./

# .env.production is committed; supplies VITE_* placeholders needed by
# the EF client's config validator. Real auth happens server-side in the BFF.
RUN pnpm run build


# ---------- Stage 2: python runtime ----------
FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

# uv from the official image
COPY --from=ghcr.io/astral-sh/uv:0.9.26 /uv /uvx /bin/

WORKDIR /app

# Install deps first for better Docker layer caching
COPY backend/pyproject.toml backend/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project

# Copy backend source
COPY backend/app ./app
COPY backend/alembic.ini ./alembic.ini

# Install the project itself
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen

# Copy built frontend into the location main.py looks for it
COPY --from=frontend-build /src/dist /app/static

EXPOSE 8000

# Render injects $PORT at runtime; fall back to 8000 for local runs.
CMD ["sh", "-c", "fastapi run --host 0.0.0.0 --port ${PORT:-8000} app/main.py"]

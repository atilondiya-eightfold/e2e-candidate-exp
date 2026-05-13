#!/usr/bin/env bash
# Start frontend + backend in parallel for local dev.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "ERROR: .env missing. Copy .env.example -> .env and fill in real values." >&2
  exit 1
fi

trap 'kill 0' EXIT

(cd backend  && uv run uvicorn app.main:app --reload --port 8000) &
(cd frontend && pnpm dev) &

wait

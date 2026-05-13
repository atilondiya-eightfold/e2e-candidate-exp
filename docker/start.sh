#!/bin/bash
# Run nginx (frontend :5173) and FastAPI (BFF :8010) under a single PID
# namespace. If either dies, kill the other and exit so the container is
# replaced by the orchestrator instead of limping along with half a stack.

set -e

cleanup() {
  trap - INT TERM EXIT
  echo "[entrypoint] stopping all"
  kill 0 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo "[entrypoint] starting nginx on :5173"
# `daemon off` keeps nginx in the foreground so we can wait on its PID;
# without it the master forks and exits immediately, fooling the wait below.
nginx -c /etc/nginx/nginx.conf -g 'daemon off;' &
NGINX_PID=$!

echo "[entrypoint] starting fastapi on :8010"
fastapi run --host 0.0.0.0 --port 8010 app/main.py &
FASTAPI_PID=$!

# Wait on either; the trap above tears down the other.
wait -n "$NGINX_PID" "$FASTAPI_PID"
EXIT_CODE=$?
echo "[entrypoint] a process exited with $EXIT_CODE; shutting down the rest"
exit "$EXIT_CODE"

#!/usr/bin/env bash
# Run the Readify web app and backend processor together.
#
#   ./dev.sh               # backend on :8001, frontend on :3000
#   PORT=8002 ./dev.sh     # override the backend port
#
# Ctrl-C stops both processes.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_PORT="${WEB_PORT:-3000}"
# Default backend port. 8001 avoids clashing with an unrelated FastAPI
# service that squats on 8000 in this developer environment.
BACKEND_PORT="${PORT:-8001}"

cd "$ROOT"

if [ ! -d backend/venv ]; then
  echo "error: backend/venv not found — run:"
  echo "  python3 -m venv backend/venv && backend/venv/bin/pip install -r backend/requirements.txt"
  exit 1
fi

if [ ! -d web/node_modules ]; then
  echo "error: web/node_modules not found — run: cd web && npm install"
  exit 1
fi

echo "Starting Readify…"
echo "  Web:      http://localhost:${WEB_PORT}"
echo "  Backend:  http://localhost:${BACKEND_PORT}/health"
echo "  (Ctrl-C to stop both)"

BACKEND_PID=""
WEB_PID=""

cleanup() {
  trap - INT TERM EXIT
  if [ -n "$BACKEND_PID" ]; then kill "$BACKEND_PID" 2>/dev/null || true; fi
  if [ -n "$WEB_PID" ]; then kill "$WEB_PID" 2>/dev/null || true; fi
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

(
  cd backend
  exec ./venv/bin/uvicorn main:app --reload --port "$BACKEND_PORT"
) &
BACKEND_PID=$!

(
  cd web
  exec npm run dev -- --port "$WEB_PORT"
) &
WEB_PID=$!

wait
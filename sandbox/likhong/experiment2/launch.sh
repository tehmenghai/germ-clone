#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BACKEND_PORT=8099
FRONTEND_PORT=8098
LOG=/tmp/exp2-backend.log

echo "[exp2] Starting backend on port $BACKEND_PORT…"
setsid conda run --no-capture-output -n base python "$HERE/backend.py" \
  > "$LOG" 2>&1 &

# Wait for backend to become ready (up to 10 s)
for i in $(seq 1 20); do
  if curl -sf "http://localhost:$BACKEND_PORT/pdfs" > /dev/null 2>&1; then
    echo "[exp2] Backend ready."
    break
  fi
  sleep 0.5
done

echo "[exp2] Starting frontend server on http://localhost:$FRONTEND_PORT"
echo "[exp2] Backend log: $LOG"
echo "[exp2] Press Ctrl-C to stop the frontend server (backend continues in background)."
conda run --no-capture-output -n base \
  python -m http.server "$FRONTEND_PORT" --directory "$HERE/frontend"

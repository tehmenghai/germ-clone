#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BACKEND_PORT=8099
FRONTEND_PORT=8098
LOG=/tmp/exp2-backend.log

# Kill any processes already bound to our ports (previous run, zombie, etc.)
echo "[exp2] Clearing ports $BACKEND_PORT and $FRONTEND_PORT…"
for PORT in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  PIDS=$(ss -tlnp "sport = :$PORT" 2>/dev/null \
    | awk 'NR>1 && /LISTEN/{match($0,/pid=([0-9]+)/,m); if(m[1]) print m[1]}')
  if [ -n "$PIDS" ]; then
    echo "[exp2]   Killing PID(s) $PIDS on port $PORT"
    kill $PIDS 2>/dev/null || true
  fi
done
# Also kill any lingering backend.py processes (covers detached setsid sessions)
pkill -f "backend.py" 2>/dev/null || true
sleep 0.5

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

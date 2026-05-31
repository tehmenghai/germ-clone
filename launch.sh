#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/source/backend"
FRONTEND="$ROOT/source/frontend"
PID_FILE="$ROOT/.germ-clone.pid"

# --- helpers -----------------------------------------------------------------

# Kill a PID only if its cmdline matches the expected signature
kill_own() {
  local pid="$1" sig="$2"
  [[ -z "$pid" || "$pid" == "0" ]] && return 0
  if kill -0 "$pid" 2>/dev/null; then
    local cmdline
    cmdline=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)
    if echo "$cmdline" | grep -qE "$sig"; then
      kill "$pid" 2>/dev/null || true
      return 0
    fi
  fi
  return 1  # pid not ours
}

# Wait up to 3 s for a port to be released
wait_port_free() {
  local port="$1"
  for _ in 1 2 3; do
    ss -tln "( sport = :$port )" 2>/dev/null | grep -q ":$port" || return 0
    sleep 1
  done
  return 1  # still occupied
}

# Find first free port at or above the preferred one
free_port() {
  local port="$1"
  while ss -tln "( sport = :$port )" 2>/dev/null | grep -q ":$port"; do
    (( port++ ))
  done
  echo "$port"
}

# --- stop previous instance --------------------------------------------------

PREV_BACKEND_PID=0
PREV_FRONTEND_PID=0

if [[ -f "$PID_FILE" ]]; then
  read -r PREV_BACKEND_PID PREV_FRONTEND_PID < "$PID_FILE" 2>/dev/null || true
fi

if kill_own "$PREV_BACKEND_PID" "uvicorn.*app\.main"; then
  echo "--> Stopped previous backend (PID $PREV_BACKEND_PID)"
fi
if kill_own "$PREV_FRONTEND_PID" "next(\.js)?.*dev|node.*\.next"; then
  echo "--> Stopped previous frontend (PID $PREV_FRONTEND_PID)"
fi

# --- resolve ports -----------------------------------------------------------

PREFERRED_BACKEND=8007
PREFERRED_FRONTEND=3007

# Brief settle after kills
[[ "$PREV_BACKEND_PID"  != "0" ]] && wait_port_free "$PREFERRED_BACKEND"  || true
[[ "$PREV_FRONTEND_PID" != "0" ]] && wait_port_free "$PREFERRED_FRONTEND" || true

BACKEND_PORT=$(free_port "$PREFERRED_BACKEND")
FRONTEND_PORT=$(free_port "$PREFERRED_FRONTEND")

[[ "$BACKEND_PORT"  != "$PREFERRED_BACKEND"  ]] && echo "!  Port $PREFERRED_BACKEND in use by another process — using $BACKEND_PORT"
[[ "$FRONTEND_PORT" != "$PREFERRED_FRONTEND" ]] && echo "!  Port $PREFERRED_FRONTEND in use by another process — using $FRONTEND_PORT"

# --- start backend -----------------------------------------------------------

echo "==> germ//clone launcher"
echo "--> Starting backend  (port $BACKEND_PORT)"
cd "$BACKEND"
if [[ ! -d ".venv" ]]; then
  uv venv .venv
  uv pip install -r requirements.txt
fi
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload &
BACKEND_PID=$!
deactivate

# --- start frontend ----------------------------------------------------------

echo "--> Starting frontend (port $FRONTEND_PORT)"
cd "$FRONTEND"
if [[ ! -d "node_modules" ]]; then
  pnpm install
fi
NEXT_PUBLIC_API_URL="http://localhost:$BACKEND_PORT" PORT="$FRONTEND_PORT" pnpm dev &
FRONTEND_PID=$!

# --- persist PIDs ------------------------------------------------------------

echo "$BACKEND_PID $FRONTEND_PID" > "$PID_FILE"

echo ""
echo "==> Backend  PID $BACKEND_PID  →  http://localhost:$BACKEND_PORT"
echo "==> Frontend PID $FRONTEND_PID →  http://localhost:$FRONTEND_PORT"

wait

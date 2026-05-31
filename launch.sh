#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/source/backend"
FRONTEND="$ROOT/source/frontend"

echo "==> germ//clone launcher"

# Backend
echo "--> Starting backend (port 8007)"
cd "$BACKEND"
if [ ! -d ".venv" ]; then
  uv venv .venv
  uv pip install -r requirements.txt
fi
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8007 --reload &
BACKEND_PID=$!
deactivate

# Frontend
echo "--> Starting frontend (port 3007)"
cd "$FRONTEND"
if [ ! -d "node_modules" ]; then
  pnpm install
fi
pnpm dev -- --port 3007 &
FRONTEND_PID=$!

echo "==> Backend PID $BACKEND_PID | Frontend PID $FRONTEND_PID"
echo "==> Backend  http://localhost:8007"
echo "==> Frontend http://localhost:3007"

wait

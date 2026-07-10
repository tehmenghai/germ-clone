"""
Shared passphrase gate (ADR-0005). Reads env vars on import; exposes get/set hooks
mirroring llm/config.py's pattern so tests can flip state without touching the
process environment.

PASSPHRASE_REQUIRED=false (default, local dev) makes require_session() a no-op.
PASSPHRASE_REQUIRED=true (deploy) requires a session established via
POST /auth/passphrase before any gated route (see app/routes/session.py, main.py)
will respond.
"""
import os
import secrets
from pathlib import Path

from dotenv import load_dotenv
from fastapi import HTTPException, Request, status

load_dotenv(Path(__file__).parents[1] / ".env")

# Ephemeral fallback: a fresh key each process start is fine for this app's threat
# model (small study-team gate, not durable auth) — it just means existing sessions
# don't survive a restart, same as re-entering the passphrase after a deploy.
SESSION_SECRET_KEY: str = os.getenv("SESSION_SECRET_KEY") or secrets.token_urlsafe(32)

_state: dict[str, str | bool] = {
    "required": os.getenv("PASSPHRASE_REQUIRED", "false").strip().lower() == "true",
    "passphrase": os.getenv("APP_PASSPHRASE", ""),
}


def is_required() -> bool:
    return bool(_state["required"])


def set_required(required: bool) -> None:
    """Test hook — mirrors llm.config.set_backend's pattern."""
    _state["required"] = required


def verify(candidate: str) -> bool:
    expected = str(_state["passphrase"])
    if not expected:
        return False
    return secrets.compare_digest(candidate, expected)


def require_session(request: Request) -> None:
    """FastAPI dependency — gate a route behind an established passphrase session."""
    if not is_required():
        return
    if not request.session.get("authed"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "passphrase required")

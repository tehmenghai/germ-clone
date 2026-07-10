"""
POST /auth/passphrase — establish a session against the shared passphrase gate (ADR-0005).
GET  /auth/status      — whether a passphrase is currently required (frontend gate check).

Deliberately unauthenticated itself — this is the entry point that issues the session
other routes require via app.auth.require_session.
"""
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from app import auth

router = APIRouter(prefix="/auth", tags=["auth"])


class PassphraseRequest(BaseModel):
    passphrase: str


class StatusResponse(BaseModel):
    required: bool


@router.get("/status", response_model=StatusResponse)
async def get_status() -> StatusResponse:
    return StatusResponse(required=auth.is_required())


@router.post("/passphrase", status_code=status.HTTP_204_NO_CONTENT)
async def submit_passphrase(body: PassphraseRequest, request: Request) -> None:
    if not auth.is_required():
        return
    if not auth.verify(body.passphrase):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "incorrect passphrase")
    request.session["authed"] = True

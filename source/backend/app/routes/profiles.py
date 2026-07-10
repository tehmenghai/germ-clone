"""
GET/POST /profiles — in-memory stub for Phase 1.
Ben will wire real Neon persistence in Phase 2 when the user schema lands.
"""
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import require_session

router = APIRouter(prefix="/profiles", tags=["profiles"], dependencies=[Depends(require_session)])

_profiles: list[dict[str, str]] = [
    {"id": "00000000-0000-0000-0000-000000000001", "name": "Neo"},
    {"id": "00000000-0000-0000-0000-000000000002", "name": "Morpheus"},
    {"id": "00000000-0000-0000-0000-000000000003", "name": "Trinity"},
]


class ProfileResponse(BaseModel):
    id: str
    name: str


class ProfileRequest(BaseModel):
    name: str


@router.get("", response_model=list[ProfileResponse])
async def list_profiles() -> list[ProfileResponse]:
    return [ProfileResponse(**p) for p in _profiles]


@router.post("", response_model=ProfileResponse, status_code=201)
async def create_profile(body: ProfileRequest) -> ProfileResponse:
    profile = {"id": str(uuid.uuid4()), "name": body.name}
    _profiles.append(profile)
    return ProfileResponse(**profile)

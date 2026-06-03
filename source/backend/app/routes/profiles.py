"""
GET/POST /profiles — in-memory stub for Phase 1.
Ben will wire real Neon persistence in Phase 2 when the user schema lands.
"""
import uuid

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/profiles", tags=["profiles"])

_profiles: list[dict[str, str]] = []


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

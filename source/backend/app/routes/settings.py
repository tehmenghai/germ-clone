"""
GET/POST /settings/inference — reads and writes the active LLM backend.
"""
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from llm import config

router = APIRouter(prefix="/settings", tags=["settings"])


class InferenceResponse(BaseModel):
    backend: Literal["ollama", "cloud"]


class InferenceRequest(BaseModel):
    backend: Literal["ollama", "cloud"]


@router.get("/inference", response_model=InferenceResponse)
async def get_inference() -> InferenceResponse:
    return InferenceResponse(backend=config.get_backend())  # type: ignore[arg-type]


@router.post("/inference", response_model=InferenceResponse)
async def set_inference(body: InferenceRequest) -> InferenceResponse:
    config.set_backend(body.backend)
    return InferenceResponse(backend=config.get_backend())  # type: ignore[arg-type]

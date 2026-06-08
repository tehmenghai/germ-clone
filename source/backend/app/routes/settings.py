"""
GET/POST /settings/inference — reads and writes the active LLM backend.
GET/POST /settings/embedding — reads and writes the active embedding provider + model.
"""
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from llm import config, embedding_config

router = APIRouter(prefix="/settings", tags=["settings"])


BackendLiteral = Literal["ollama", "groq", "cerebras", "gemini", "openrouter", "cloud"]


class InferenceResponse(BaseModel):
    backend: BackendLiteral


class InferenceRequest(BaseModel):
    backend: BackendLiteral


class EmbeddingResponse(BaseModel):
    provider: Literal["ollama", "google"]
    model: str


class EmbeddingRequest(BaseModel):
    provider: Literal["ollama", "google"]
    model: str


@router.get("/inference", response_model=InferenceResponse)
async def get_inference() -> InferenceResponse:
    return InferenceResponse(backend=config.get_backend())  # type: ignore[arg-type]


@router.post("/inference", response_model=InferenceResponse)
async def set_inference(body: InferenceRequest) -> InferenceResponse:
    config.set_backend(body.backend)
    return InferenceResponse(backend=config.get_backend())  # type: ignore[arg-type]


@router.get("/embedding", response_model=EmbeddingResponse)
async def get_embedding() -> EmbeddingResponse:
    return EmbeddingResponse(
        provider=embedding_config.get_provider(),  # type: ignore[arg-type]
        model=embedding_config.get_model(),
    )


@router.post("/embedding", response_model=EmbeddingResponse)
async def set_embedding(body: EmbeddingRequest) -> EmbeddingResponse:
    try:
        embedding_config.set_embedding(body.provider, body.model)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return EmbeddingResponse(
        provider=embedding_config.get_provider(),  # type: ignore[arg-type]
        model=embedding_config.get_model(),
    )

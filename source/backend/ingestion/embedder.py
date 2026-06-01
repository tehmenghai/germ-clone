"""
nomic-embed-text embedder via Ollama (ADR-0004).

Ollama must be running locally with nomic-embed-text pulled:
    ollama pull nomic-embed-text

Embedding dimension: 768. Changing the model requires a schema migration
and full corpus re-index — do not change without flagging to the team.
"""

import os

import httpx
from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
EXPECTED_DIM = 768


async def embed_text(text: str, model: str = DEFAULT_MODEL) -> list[float]:
    """
    Embed a single text string using nomic-embed-text via Ollama.
    Returns a 768-dim float vector.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": model, "prompt": text},
        )
        resp.raise_for_status()
        vector = resp.json()["embedding"]

    if len(vector) != EXPECTED_DIM:
        raise ValueError(
            f"Embedding dimension mismatch: expected {EXPECTED_DIM}, got {len(vector)}. "
            f"Check that '{model}' is pulled in Ollama."
        )
    return vector


async def embed_batch(texts: list[str], model: str = DEFAULT_MODEL) -> list[list[float]]:
    """Embed a list of texts sequentially. Ollama does not support batch embedding natively."""
    return [await embed_text(t, model) for t in texts]

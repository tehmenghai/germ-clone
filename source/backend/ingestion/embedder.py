"""
Unified embedder — dispatches to Ollama (nomic-embed-text) or Google Gemini
based on the active embedding config (llm.embedding_config).

Provider is read at call time so API-toggled changes take effect immediately
without a server restart.

Embedding dimension: 768 for all supported models. Changing to a different
dimension requires a schema migration and full corpus re-index.
"""

import asyncio
import os

import httpx
from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
EXPECTED_DIM = 768


async def _embed_ollama(text: str, model: str) -> list[float]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": model, "prompt": text},
        )
        resp.raise_for_status()
        return resp.json()["embedding"]


async def _embed_google(text: str, model: str) -> list[float]:
    from ingestion.embed_google_BEN0601 import embed_document
    return await asyncio.to_thread(embed_document, text, model=model)


async def embed_text(text: str) -> list[float]:
    """
    Embed a single text string using the active provider and model.
    Provider and model are read from llm.embedding_config at call time.
    Returns a 768-dim float vector.
    """
    try:
        from llm import embedding_config
        provider = embedding_config.get_provider()
        model = embedding_config.get_model()
    except ImportError:
        # Standalone ingestion context — fall back to env vars
        provider = os.getenv("EMBEDDING_PROVIDER", "ollama")
        model = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")

    if provider == "google":
        vector = await _embed_google(text, model)
    else:
        vector = await _embed_ollama(text, model)

    if len(vector) != EXPECTED_DIM:
        raise ValueError(
            f"Embedding dimension mismatch: expected {EXPECTED_DIM}, got {len(vector)}. "
            f"Check that '{model}' is available for provider '{provider}'."
        )
    return vector


async def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed a list of texts sequentially."""
    return [await embed_text(t) for t in texts]

"""
Embedding provider/model configuration.
Reads env vars on import; exposes get/set functions for the embedding-toggle endpoint.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Resolve .env relative to this file so it loads correctly regardless of cwd
load_dotenv(Path(__file__).parents[1] / ".env")

VALID_PROVIDERS = {"ollama", "google"}

_state: dict[str, str] = {
    "provider": os.getenv("EMBEDDING_PROVIDER", "ollama"),
    "model": os.getenv("EMBEDDING_MODEL", "nomic-embed-text"),
}


def get_provider() -> str:
    return _state["provider"]


def get_model() -> str:
    return _state["model"]


def set_embedding(provider: str, model: str) -> None:
    if provider not in VALID_PROVIDERS:
        raise ValueError(f"provider must be one of {VALID_PROVIDERS}")
    if not model.strip():
        raise ValueError("model must be a non-empty string")
    _state["provider"] = provider
    _state["model"] = model

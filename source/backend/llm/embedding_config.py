"""
Embedding provider/model configuration.
Reads env vars on import; exposes get/set functions for the embedding-toggle endpoint.
"""
import os

from dotenv import load_dotenv

load_dotenv()

VALID_PROVIDERS = {"ollama", "google"}

_state: dict[str, str] = {
    "provider": os.getenv("EMBEDDING_PROVIDER", "google"),
    "model": os.getenv("EMBEDDING_MODEL", "gemini-embedding-2"),
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

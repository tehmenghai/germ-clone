"""
LLM provider configuration.
Reads env vars on import; exposes get/set_backend() for the inference-toggle endpoint.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parents[1] / ".env")

OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")

_state: dict[str, str] = {
    "backend": os.getenv("INFERENCE_BACKEND", "ollama"),
}

VALID_BACKENDS = {"ollama", "groq", "cerebras", "gemini", "openrouter", "cloud"}
# "cloud" is a legacy alias for "groq" — kept so existing .env values still work


def get_backend() -> str:
    return _state["backend"]


def set_backend(backend: str) -> None:
    if backend not in VALID_BACKENDS:
        raise ValueError(f"backend must be one of {VALID_BACKENDS}")
    _state["backend"] = backend

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
    # Independent of "backend" above: the eval backend grades every answer regardless of
    # which model the student's session is answering with, so a provider switch never
    # changes what score an answer gets (issue #39). Defaults to Ollama-local so eval
    # never needs a cloud API key.
    "eval_backend": os.getenv("EVAL_BACKEND", "ollama"),
}

VALID_BACKENDS = {"ollama", "groq", "cerebras", "gemini", "openrouter", "cloud"}
# "cloud" is a legacy alias for "groq" — kept so existing .env values still work


def get_backend() -> str:
    return _state["backend"]


def set_backend(backend: str) -> None:
    if backend not in VALID_BACKENDS:
        raise ValueError(f"backend must be one of {VALID_BACKENDS}")
    _state["backend"] = backend


def get_eval_backend() -> str:
    return _state["eval_backend"]


def set_eval_backend(backend: str) -> None:
    if backend not in VALID_BACKENDS:
        raise ValueError(f"backend must be one of {VALID_BACKENDS}")
    _state["eval_backend"] = backend

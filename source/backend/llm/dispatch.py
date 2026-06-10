"""
LiteLLM dispatch — routes completions to Ollama, Groq, Cerebras, Gemini, or OpenRouter.
Phase 1: stub (complete() is not called by the mock /ask route).
Phase 2: called by rag/nodes/*.py for every LLM step.
"""
import os
from collections.abc import AsyncGenerator
from typing import Any

import litellm

from llm import config

OLLAMA_MODEL      = "ollama/llama3.2"
GROQ_MODEL        = "groq/llama-3.1-8b-instant"
CEREBRAS_MODEL    = "cerebras/gpt-oss-120b"
GEMINI_MODEL      = "gemini/gemini-2.0-flash"
OPENROUTER_MODEL  = "openrouter/nvidia/nemotron-3-super-120b-a12b:free"


def _cloud_params(backend: str) -> dict[str, Any]:
    """Return model + api_key for the given cloud backend. Raises on missing key."""
    if backend in ("cloud", "groq"):
        key = os.getenv("GROQ_API_KEY", "")
        if not key:
            raise RuntimeError("GROQ_API_KEY not set")
        return {"model": GROQ_MODEL, "api_key": key}
    if backend == "cerebras":
        key = os.getenv("CEREBRAS_API_KEY", "")
        if not key:
            raise RuntimeError("CEREBRAS_API_KEY not set")
        return {"model": CEREBRAS_MODEL, "api_key": key}
    if backend == "gemini":
        key = os.getenv("GEMINI_API_KEY", "")
        if not key:
            raise RuntimeError("GEMINI_API_KEY not set")
        return {"model": GEMINI_MODEL, "api_key": key}
    if backend == "openrouter":
        key = os.getenv("OPENROUTER_API_KEY", "")
        if not key:
            raise RuntimeError("OPENROUTER_API_KEY not set")
        return {
            "model": OPENROUTER_MODEL,
            "api_key": key,
            "extra_headers": {
                "HTTP-Referer": "http://localhost:3007",
                "X-Title": "germ//clone",
            },
        }
    raise RuntimeError(f"Unknown cloud backend: {backend!r}")


async def complete(messages: list[dict[str, str]], **kwargs: Any) -> str:
    """Return the assistant text from a chat completion."""
    backend = config.get_backend()

    if backend == "ollama":
        response = await litellm.acompletion(
            model=OLLAMA_MODEL,
            messages=messages,
            api_base=config.OLLAMA_URL,
            **kwargs,
        )
    else:
        params = _cloud_params(backend)
        response = await litellm.acompletion(
            messages=messages,
            **params,
            **kwargs,
        )

    msg = response.choices[0].message
    return msg.content or ""


async def astream_complete(
    messages: list[dict[str, str]], **kwargs: Any
) -> AsyncGenerator[str, None]:
    """Yield token strings as they arrive from the LLM."""
    backend = config.get_backend()

    if backend == "ollama":
        response = await litellm.acompletion(
            model=OLLAMA_MODEL,
            messages=messages,
            api_base=config.OLLAMA_URL,
            stream=True,
            **kwargs,
        )
    else:
        params = _cloud_params(backend)
        response = await litellm.acompletion(
            messages=messages,
            stream=True,
            **params,
            **kwargs,
        )

    async for chunk in response:
        delta = chunk.choices[0].delta
        token = delta.content or ""
        if token:
            yield token

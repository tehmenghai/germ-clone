"""
LiteLLM dispatch — routes completions to Ollama or Groq based on the active backend.
Phase 1: stub (complete() is not called by the mock /ask route).
Phase 2: called by rag/nodes/*.py for every LLM step.
"""
import os
from collections.abc import AsyncGenerator
from typing import Any

import litellm

from llm import config

OLLAMA_MODEL = "ollama/llama3.2"
CLOUD_MODEL = "groq/llama3-8b-8192"


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
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY not set; cannot use cloud backend")
        response = await litellm.acompletion(
            model=CLOUD_MODEL,
            messages=messages,
            api_key=api_key,
            **kwargs,
        )

    return response.choices[0].message.content or ""


async def astream_complete(
    messages: list[dict[str, str]], **kwargs: Any
) -> AsyncGenerator[str, None]:
    """Yield token strings as they arrive from the LLM.

    Drop-in streaming sibling of complete(). Uses stream=True so the first
    token is emitted immediately instead of waiting for the full response.
    """
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
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY not set; cannot use cloud backend")
        response = await litellm.acompletion(
            model=CLOUD_MODEL,
            messages=messages,
            api_key=api_key,
            stream=True,
            **kwargs,
        )

    async for chunk in response:
        token = chunk.choices[0].delta.content or ""
        if token:
            yield token

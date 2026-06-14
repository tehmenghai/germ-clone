"""
Workspace-wide pytest configuration.
"""
import os

import pytest
import pytest_asyncio
from dotenv import dotenv_values

# Read .env values once at collection time so they are the reset baseline
_env = dotenv_values()
_DEFAULT_BACKEND = _env.get("INFERENCE_BACKEND") or os.getenv("INFERENCE_BACKEND", "ollama")
_DEFAULT_PROVIDER = _env.get("EMBEDDING_PROVIDER") or os.getenv("EMBEDDING_PROVIDER", "ollama")
_DEFAULT_MODEL = _env.get("EMBEDDING_MODEL") or os.getenv("EMBEDDING_MODEL", "nomic-embed-text")


@pytest.fixture(autouse=True)
def reset_llm_state():
    """Reset in-memory LLM/embedding state to .env baseline before each test."""
    from llm import config, embedding_config

    config.set_backend(_DEFAULT_BACKEND)
    embedding_config.set_embedding(_DEFAULT_PROVIDER, _DEFAULT_MODEL)

    yield

    config.set_backend(_DEFAULT_BACKEND)
    embedding_config.set_embedding(_DEFAULT_PROVIDER, _DEFAULT_MODEL)


@pytest_asyncio.fixture(autouse=True)
async def reset_db_pool():
    """Dispose the async engine before each test to avoid cross-test event-loop contamination."""
    from repository.database import engine

    yield

    await engine.dispose()

"""
Workspace-wide pytest configuration.
"""
import os
from typing import Any
from unittest.mock import patch

import pytest
import pytest_asyncio
from dotenv import dotenv_values

# Read .env values once at collection time so they are the reset baseline
_env = dotenv_values()
_DEFAULT_BACKEND = _env.get("INFERENCE_BACKEND") or os.getenv("INFERENCE_BACKEND", "ollama")
_DEFAULT_PROVIDER = _env.get("EMBEDDING_PROVIDER") or os.getenv("EMBEDDING_PROVIDER", "ollama")
_DEFAULT_MODEL = _env.get("EMBEDDING_MODEL") or os.getenv("EMBEDDING_MODEL", "nomic-embed-text")

# ---------------------------------------------------------------------------
# Stub corpus chunk
# ---------------------------------------------------------------------------

_STUB_CHUNK_DATA = {
    "id": "00000000-0000-0000-0000-000000000001",
    "mod": "3.3",
    "file": "3.3 - Supervised Learning_annotations.pdf",
    "ts": "1",
    "snip": "The bias-variance trade-off describes the balance between model complexity and generalisation.",
    "score": 0.92,
    "text": (
        "The bias-variance trade-off describes the balance between model complexity and "
        "generalisation error. High bias leads to underfitting; high variance leads to "
        "overfitting. Regularisation techniques such as L1 and L2 penalise model complexity "
        "to find a better balance. [1] The optimal model minimises total error."
    ),
    "source_type": "pdf",
    "lesson_title": "Supervised Learning",
    "topic": "Bias-Variance Trade-off",
}


def _stub_chunks() -> list:
    from schemas.retrieval import RetrievalResult
    return [RetrievalResult(**_STUB_CHUNK_DATA)]


# ---------------------------------------------------------------------------
# Graph stub — replaces _graph.astream in app.routes.ask
# Yields deterministic stage updates without touching any network or DB.
# Puts tokens into state["token_queue"] before the compose update so that
# test_compose_emits_token_events can assert on streaming behaviour.
# ---------------------------------------------------------------------------

async def _stub_graph_astream(state: dict, **_: Any):
    from schemas.events import EvalScores, StageEvent

    chunks = _stub_chunks()
    react_out = "THINK: bias-variance. ACT: [1]. OBSERVE: covered."
    scores = EvalScores(f=0.90, r=0.88, c=0.85)

    updates = [
        {"route":     {"mod": "3.3",                    "stage_events": [StageEvent(stage="route",     status="done", detail="→ module 3.3")]}},
        {"rewrite":   {"rewritten_query": "bias variance trade-off", "stage_events": [StageEvent(stage="rewrite",  status="done", detail="query clarified")]}},
        {"retrieve1": {"chunks": chunks,                "stage_events": [StageEvent(stage="retrieve1", status="done", detail="1 chunks — module 3.3")]}},
        {"react":     {"react_output": react_out,       "stage_events": [StageEvent(stage="react",     status="done", detail="key concepts identified")]}},
        {"reflect":   {"reflect_output": "coverage adequate", "stage_events": [StageEvent(stage="reflect",  status="done", detail="coverage adequate")]}},
        {"evaluate1": {"scores_1": scores,              "stage_events": [StageEvent(stage="evaluate1", status="done", scores=scores, verdict="PASS")]}},
        {"compose":   {"answer_md": "The bias-variance trade-off [1].", "citations": [], "sources": [],
                       "stage_events": [StageEvent(stage="compose", status="done",
                                                   answer_md="The bias-variance trade-off [1].",
                                                   citations=None, sources=None)]}},
    ]

    for update in updates:
        if "compose" in update and state.get("token_queue") is not None:
            for token in ["The ", "bias", "-variance", " trade", "-off [1]."]:
                await state["token_queue"].put(("token", token))
        yield update


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_llm_state():
    """Reset in-memory LLM/embedding state to .env baseline before each test."""
    from llm import config, embedding_config

    config.set_backend(_DEFAULT_BACKEND)
    embedding_config.set_embedding(_DEFAULT_PROVIDER, _DEFAULT_MODEL)
    yield
    config.set_backend(_DEFAULT_BACKEND)
    embedding_config.set_embedding(_DEFAULT_PROVIDER, _DEFAULT_MODEL)


@pytest.fixture(autouse=True)
def mock_external_io():
    """Replace _graph.astream with a deterministic stub — no network or DB I/O."""
    with patch("app.routes.ask._graph") as mock_graph:
        mock_graph.astream = _stub_graph_astream
        yield


@pytest_asyncio.fixture(autouse=True)
async def reset_db_pool():
    """Dispose the async engine between tests to avoid event-loop contamination."""
    from repository.database import engine
    yield
    try:
        await engine.dispose()
    except Exception:
        pass

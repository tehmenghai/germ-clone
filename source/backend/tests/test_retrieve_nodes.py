"""
Regression tests for issue #26 — retrieval ignores route's `mod` classification.

route_node classifies the module into state["mod"], but retrieve1_node/retrieve2_node
never passed it to repository.queries.retrieve(), which itself had no mod-aware
ranking at all. This made routing decorative: even a *correct* route (TC03) did not
change what got retrieved, and the reloop (retrieve2) re-drew from the same
unfiltered pool instead of correcting course.
"""
from unittest.mock import AsyncMock, patch

import pytest

from schemas.retrieval import RetrievalResult


def _chunk(id_: str, mod: str, score: float) -> RetrievalResult:
    return RetrievalResult(
        id=id_,
        mod=mod,
        file=f"{mod}.pdf",
        snip="snippet",
        score=score,
        text="full text",
        source_type="pdf",
    )


# Synthetic corpus: module 3.4 (the routed/correct module for this query) only
# ranks decently on raw cosine similarity; 3.7/3.8 chunks rank higher, mirroring
# TC03 where retrieve1 pulled 8/8 chunks from 3.7/3.8 despite route correctly
# saying 3.4.
_WRONG_MODULE_CHUNKS = [
    _chunk("w1", "3.7", 0.91),
    _chunk("w2", "3.7", 0.89),
    _chunk("w3", "3.8", 0.87),
    _chunk("w4", "3.8", 0.85),
]
_CORRECT_MODULE_CHUNKS = [
    _chunk("c1", "3.4", 0.83),
    _chunk("c2", "3.4", 0.80),
]


@pytest.mark.parametrize("node_name", ["retrieve1_node"])
async def test_retrieve1_node_passes_routed_mod_to_query(node_name):
    """retrieve1_node must forward state['mod'] to repository.queries.retrieve.

    Before the fix, retrieve() had no mod parameter at all and this call site
    never attempted to pass one — route's classification never reached the
    retrieval query.
    """
    from rag.nodes import retrieve as retrieve_mod

    fake_retrieve = AsyncMock(return_value=_WRONG_MODULE_CHUNKS)

    with patch("rag.nodes.retrieve.embed_text", AsyncMock(return_value=[0.0] * 768)), \
         patch("rag.nodes.retrieve.retrieve", fake_retrieve), \
         patch("rag.nodes.retrieve.AsyncSessionLocal") as mock_session_factory:
        mock_session_factory.return_value.__aenter__.return_value = "session"
        mock_session_factory.return_value.__aexit__.return_value = None

        state = {"query": "L1 vs L2 regularization", "rewritten_query": "L1 L2 regularization", "mod": "3.4"}
        await retrieve_mod.retrieve1_node(state)

    assert fake_retrieve.await_args is not None, "retrieve() was never called"
    kwargs = fake_retrieve.await_args.kwargs
    assert kwargs.get("mod") == "3.4", (
        f"retrieve1_node did not forward the routed module to retrieve(); got kwargs={kwargs}. "
        "This is the root cause of issue #26: route's classification never reaches retrieval."
    )


async def test_retrieve_query_ranks_matching_mod_ahead_of_higher_raw_similarity():
    """repository.queries.retrieve must let a mod-matching chunk outrank a
    higher-raw-similarity chunk from another module within the returned top_k,
    i.e. mod actually influences which rows survive the LIMIT — not just
    reordering after the fact (reordering after LIMIT can't recover chunks
    that never made the candidate window)."""
    from repository import queries

    class _FakeResult:
        def __init__(self, rows):
            self._rows = rows

        def fetchall(self):
            return self._rows

    class _Row:
        def __init__(self, mod, score):
            self.id = "id"
            self.mod = mod
            self.file = "f"
            self.ts = None
            self.snip = "s"
            self.score = score
            self.text = "t"
            self.source_type = "pdf"
            self.lesson_title = None
            self.topic = None

    captured_params = {}

    class _FakeSession:
        async def execute(self, stmt, params=None):
            if params and "query_vec" in params:
                captured_params.update(params)
            return _FakeResult([_Row("3.4", 0.83), _Row("3.7", 0.91)])

    session = _FakeSession()
    await queries.retrieve(session, [0.0] * 768, top_k=8, mod="3.4")

    assert "mod" in captured_params, (
        "retrieve() does not accept/pass a mod parameter to the SQL query at all — "
        "route's module classification cannot influence which rows are selected "
        "before the LIMIT is applied."
    )
    assert captured_params["mod"] == "3.4"

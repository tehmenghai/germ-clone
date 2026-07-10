"""
Regression tests for issue #27 — compose fabricates a ## References section.

compose_node's prompt told the model to write "## References" with filenames it was
never given (only chunk index/mod/score/text were in its context), so it recalled
plausible-sounding ML textbooks from training data instead. The inline [N] citations
were always correct — only the free-text References block was fabricated. The fix:
stop asking the model for one, strip it defensively if produced anyway, and rebuild
it mechanically from the same `citations` list already derived from real chunks.
"""
from unittest.mock import patch

from schemas.retrieval import RetrievalResult


def _chunk(file: str, mod: str) -> RetrievalResult:
    return RetrievalResult(
        id=file, mod=mod, file=file, snip="snippet", score=0.9,
        text="full chunk text", source_type="pdf",
    )


async def _fake_stream(tokens: list[str]):
    for t in tokens:
        yield t


async def test_compose_strips_fabricated_references_and_rebuilds_from_real_chunks():
    from rag.nodes import compose as compose_mod

    chunks = [
        _chunk("3.3 - Supervised Learning_Recording.transcript.vtt", "3.3"),
        _chunk("3.4 - Supervised Learning Advanced.pdf", "3.4"),
    ]
    # Simulates a model that ignores the "don't write References" instruction and
    # fabricates external textbooks anyway (TC02's observed failure mode).
    fabricated = (
        "The bias-variance trade-off [1] balances underfitting and overfitting [2].\n\n"
        "## References\n"
        "[1] Deep Learning by Ian Goodfellow, Yoshua Bengio, Aaron Courville\n"
        "[2] Pattern Recognition and Machine Learning by Christopher Bishop\n"
    )

    state = {
        "chunks": chunks,
        "difficulty": "standard",
        "query": "why does my model overfit",
        "react_output": "THINK: bias-variance. ACT: [1][2]. OBSERVE: covered.",
        "token_queue": None,
    }

    with patch("rag.nodes.compose.astream_complete", return_value=_fake_stream([fabricated])):
        result = await compose_mod.compose_node(state)

    answer_md = result["answer_md"]
    assert "Goodfellow" not in answer_md, "fabricated external citation survived into the final answer"
    assert "Bishop" not in answer_md

    refs_section = answer_md.split("## References", 1)[1]
    assert "3.3 - Supervised Learning_Recording.transcript.vtt" in refs_section
    assert "3.4 - Supervised Learning Advanced.pdf" in refs_section

    # every reference in the answer must trace back to an actually-retrieved chunk
    real_files = {c.file for c in chunks}
    cited_files = {c.file for c in result["citations"]}
    assert cited_files <= real_files
    assert len(result["citations"]) == 2


async def test_compose_omits_references_section_when_nothing_cited():
    from rag.nodes import compose as compose_mod

    chunks = [_chunk("3.7 - Neural Networks.pdf", "3.7")]
    state = {
        "chunks": chunks,
        "difficulty": "standard",
        "query": "what is a neuron",
        "react_output": "THINK: neurons. OBSERVE: covered.",
        "token_queue": None,
    }

    with patch("rag.nodes.compose.astream_complete", return_value=_fake_stream(["No citations here."])):
        result = await compose_mod.compose_node(state)

    assert "## References" not in result["answer_md"]
    assert result["citations"] == []

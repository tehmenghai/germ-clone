"""
Regression tests for issue #29 — evaluator scored the ReAct trace, not compose's
actual answer. A low-faithfulness, wrong-module, or fabricated answer could ship
regardless of what evaluate1/evaluate2 said, because the eval gate never looked at
the answer text the student sees.

Fix: compose now runs before its evaluate gate (rag/graph.py: compose1 → evaluate1,
compose2 → evaluate2), and evaluate scores state["answer_md"]. A public "compose"
SSE event still fires exactly once (compose_emit_node) — the sacred stage-key
contract with the frontend is unaffected. A mechanical citation-compliance check
(does every [N] in the answer map to a real citation) can also force a reloop even
when the LLM-judged f/r/c scores look fine.
"""
from unittest.mock import AsyncMock, patch

import pytest

from schemas.events import Citation, EvalScores
from schemas.retrieval import RetrievalResult


def _chunk(n: int, mod: str = "3.4") -> RetrievalResult:
    return RetrievalResult(
        id=f"c{n}", mod=mod, file=f"file{n}.pdf", snip="snip", score=0.8,
        text=f"chunk {n} text", source_type="pdf",
    )


async def test_evaluate1_scores_answer_md_not_react_output():
    from rag.nodes import evaluate as evaluate_mod

    captured = {}

    async def fake_score(query, chunks, answer):
        captured["answer"] = answer
        return EvalScores(f=0.9, r=0.9, c=0.9), False

    state = {
        "query": "q",
        "chunks": [_chunk(1)],
        "react_output": "THIS IS THE REACT TRACE — must not be what gets scored",
        "answer_md": "THIS IS THE REAL ANSWER [1] — must be what gets scored",
        "citations": [Citation(id=1, mod="3.4", file="file1.pdf", snip="s", score=0.8)],
    }

    with patch("rag.nodes.evaluate.score", fake_score):
        await evaluate_mod.evaluate1_node(state)

    assert captured["answer"] == state["answer_md"]


def test_citation_compliance_detects_marker_with_no_backing_citation():
    from rag.nodes.evaluate import _citation_compliance_ok

    citations = [Citation(id=1, mod="3.4", file="f.pdf", snip="s", score=0.9)]
    assert _citation_compliance_ok("claim [1] and [7]", citations) is False
    assert _citation_compliance_ok("claim [1]", citations) is True
    assert _citation_compliance_ok("no citations here", citations) is True


def test_pass_or_reloop_forces_reloop_on_citation_noncompliance_despite_high_scores():
    from rag.graph import _pass_or_reloop

    state = {"scores_1": EvalScores(f=0.95, r=0.95, c=0.95), "citations_compliant": False}
    assert _pass_or_reloop(state) == "reloop"


def test_pass_or_reloop_passes_when_compliant_and_scores_high():
    from rag.graph import _pass_or_reloop

    state = {"scores_1": EvalScores(f=0.95, r=0.95, c=0.95), "citations_compliant": True}
    assert _pass_or_reloop(state) == "pass"


async def test_score_grades_with_pinned_eval_backend_not_session_backend():
    """Regression for #39 — same answer must get the same grade regardless of which
    model the student's session is toggled to. score() must always pass the fixed
    config.eval_backend (not config.backend) and temperature=0 through to complete()."""
    from llm import config
    from rag.evaluator import score

    captured = {}

    async def fake_complete(messages, **kwargs):
        captured["backend"] = kwargs.get("backend")
        captured["temperature"] = kwargs.get("temperature")
        return '{"f": 0.9, "r": 0.9, "c": 0.9}'

    original_backend = config.get_backend()
    original_eval_backend = config.get_eval_backend()
    try:
        config.set_backend("cerebras")
        config.set_eval_backend("ollama")
        with patch("rag.evaluator.complete", fake_complete):
            await score("q", [_chunk(1)], "answer")
    finally:
        config.set_backend(original_backend)
        config.set_eval_backend(original_eval_backend)

    assert captured["backend"] == "ollama", (
        "grading must use the pinned eval backend, not the student session's backend"
    )
    assert captured["temperature"] == 0


async def test_score_returns_fallback_flag_on_eval_backend_failure():
    """Regression for #42 — an eval-backend infrastructure failure (model not
    pulled, connection refused, bad JSON, etc.) must be flagged as a fallback,
    not returned as an indistinguishable real 0.5/0.5/0.5 grade."""
    from rag.evaluator import score

    async def fake_complete_raises(messages, **kwargs):
        raise ConnectionError("eval backend unreachable")

    with patch("rag.evaluator.complete", fake_complete_raises):
        scores, is_fallback = await score("q", [_chunk(1)], "answer")

    assert is_fallback is True
    assert (scores.f, scores.r, scores.c) == (0.5, 0.5, 0.5)


async def test_score_fallback_flag_false_on_genuine_grade():
    from rag.evaluator import score

    async def fake_complete_ok(messages, **kwargs):
        return '{"f": 0.5, "r": 0.5, "c": 0.5}'

    with patch("rag.evaluator.complete", fake_complete_ok):
        scores, is_fallback = await score("q", [_chunk(1)], "answer")

    assert is_fallback is False
    assert (scores.f, scores.r, scores.c) == (0.5, 0.5, 0.5)


async def test_evaluate1_node_marks_verdict_when_score_is_fallback():
    """Regression for #42 — evaluate1_node must surface a distinct verdict marker
    when score() reports a fallback, so the SSE stream/UI don't render a stub
    score identically to a genuine judged grade."""
    from rag.nodes import evaluate as evaluate_mod

    async def fake_score(query, chunks, answer):
        return EvalScores(f=0.5, r=0.5, c=0.5), True

    state = {
        "query": "q",
        "chunks": [_chunk(1)],
        "answer_md": "answer [1]",
        "citations": [Citation(id=1, mod="3.4", file="file1.pdf", snip="s", score=0.8)],
    }

    with patch("rag.nodes.evaluate.score", fake_score):
        result = await evaluate_mod.evaluate1_node(state)

    verdict = result["stage_events"][0].verdict
    assert "EVAL BACKEND UNAVAILABLE" in verdict


async def test_ask_route_attributes_compose2_failure_to_compose_not_evaluate2():
    """Regression for #41 — a failure inside compose_generate_node on the reloop
    path (graph node 'compose2') must be attributed to the public 'compose' stage,
    not misattributed to 'evaluate2' (which was never reached)."""
    from app.routes import ask as ask_mod

    assert ask_mod._NODE_TO_STAGE["compose2"] == "compose"
    assert ask_mod._NODE_TO_STAGE["compose1"] == "compose"


async def _fake_astream(tokens: list[str]):
    for t in tokens:
        yield t


async def test_graph_scores_real_answer_and_emits_compose_exactly_once_on_reloop():
    """End-to-end: force a reloop via a low first-pass score, then confirm (a) the
    public 'compose' SSE event fires exactly once, (b) it carries the SECOND
    (post-reloop) generation, not the discarded first draft, and (c) evaluate1
    was scored against that first draft's actual answer text."""
    from rag.graph import build_graph

    chunks = [_chunk(1), _chunk(2)]

    compose_calls = {"n": 0}

    async def fake_astream_complete(messages, **kwargs):
        compose_calls["n"] += 1
        text = "DRAFT ANSWER attempt one [1]." if compose_calls["n"] == 1 else "FINAL CORRECTED ANSWER [1][2]."
        async for tok in _fake_astream([text]):
            yield tok

    score_calls = {"n": 0}

    async def fake_complete(messages, **_kwargs):
        system = messages[0]["content"]
        if "course module classifier" in system:
            return "3.4"
        if "precise semantic search query" in system:
            return "rewritten query"
        if "ReAct reasoning agent" in system:
            return "THINK: x. ACT: [1]. OBSERVE: y."
        if "coverage reflection agent" in system:
            return "missing depth on module 3.4"
        if "RAG quality evaluator" in system:
            score_calls["n"] += 1
            return '{"f": 0.3, "r": 0.3, "c": 0.3}' if score_calls["n"] == 1 else '{"f": 0.95, "r": 0.95, "c": 0.95}'
        raise AssertionError(f"unexpected system prompt: {system[:80]!r}")

    with patch("rag.nodes.route.complete", side_effect=fake_complete), \
         patch("rag.nodes.rewrite.complete", side_effect=fake_complete), \
         patch("rag.nodes.react.complete", side_effect=fake_complete), \
         patch("rag.nodes.reflect.complete", side_effect=fake_complete), \
         patch("rag.evaluator.complete", side_effect=fake_complete), \
         patch("rag.nodes.compose.astream_complete", side_effect=fake_astream_complete), \
         patch("rag.nodes.retrieve.embed_text", AsyncMock(return_value=[0.0] * 768)), \
         patch("rag.nodes.retrieve.retrieve", AsyncMock(return_value=chunks)), \
         patch("rag.nodes.retrieve.AsyncSessionLocal") as mock_session_factory:
        mock_session_factory.return_value.__aenter__.return_value = "session"
        mock_session_factory.return_value.__aexit__.return_value = None

        graph = build_graph()
        initial_state = {
            "query": "l1 vs l2 regularization",
            "profile_id": "p1",
            "difficulty": "standard",
            "mod": "",
            "rewritten_query": "",
            "chunks": [],
            "extra_chunks": [],
            "react_output": "",
            "reflect_output": "",
            "scores_1": None,
            "scores_2": None,
            "citations_compliant": True,
            "answer_md": "",
            "citations": [],
            "sources": [],
            "stage_events": [],
            "token_queue": None,
        }

        collected = []
        async for update in graph.astream(initial_state, stream_mode="updates"):
            for _node, out in update.items():
                collected.extend(out.get("stage_events", []))

    compose_events = [e for e in collected if e.stage == "compose"]
    assert len(compose_events) == 1, f"expected exactly one public 'compose' event, got {len(compose_events)}"
    assert compose_events[0].answer_md.startswith("FINAL CORRECTED ANSWER [1][2].")
    assert "DRAFT ANSWER attempt one" not in compose_events[0].answer_md, (
        "the discarded first (pre-reloop) draft leaked into the shipped answer"
    )

    evaluate1_events = [e for e in collected if e.stage == "evaluate1"]
    assert len(evaluate1_events) == 1
    assert evaluate1_events[0].scores.f == pytest.approx(0.3)

    assert any(e.stage == "retrieve2" for e in collected), "reloop should have fired given the low evaluate1 score"
    assert any(e.stage == "evaluate2" for e in collected)

"""
evaluate nodes — score f/r/c against compose's actual generated answer (issue #29),
not the ReAct trace. evaluate1_node runs after compose1 (rag/graph.py), before the
pass/reloop decision; evaluate2_node runs after compose2 on the reloop path.

Also runs a mechanical citation-compliance check: does every [N] marker in the
answer map to a citation compose actually built from a retrieved chunk. compose
already drops out-of-range indices when building `citations`, so this specifically
catches a marker that survived in the text with nothing backing it (e.g. the model
citing a chunk index that was never retrieved) — the structural half of #29's
citation-compliance ask; the semantic half (does the cited chunk really support the
claim) is what the f (faithfulness) score now measures, since it finally sees the
real answer text.

evaluate1_node: triggers reloop if mean(f, r, c) < 0.80 OR compliance fails.
evaluate2_node: always proceeds to the (already-generated) compose output, same as
before #29 — no third attempt.
"""
import re

from rag.evaluator import score
from rag.state import GraphState
from schemas.events import Citation, StageEvent


def _citation_compliance_ok(answer_md: str, citations: list[Citation]) -> bool:
    cited_ns = {int(n) for n in re.findall(r"\[(\d+)\]", answer_md)}
    known_ns = {c.id for c in citations}
    return cited_ns <= known_ns


async def evaluate1_node(state: GraphState) -> dict:
    scores = await score(state["query"], state["chunks"], state["answer_md"])
    compliant = _citation_compliance_ok(state["answer_md"], state["citations"])
    mean = (scores.f + scores.r + scores.c) / 3
    if mean >= 0.80 and compliant:
        verdict = "PASS"
    elif not compliant:
        verdict = f"BELOW 0.80 ({mean:.2f}) — citation compliance failed, reloop"
    else:
        verdict = f"BELOW 0.80 ({mean:.2f}), reloop"
    return {
        "scores_1": scores,
        "citations_compliant": compliant,
        "stage_events": [StageEvent(
            stage="evaluate1",
            status="done",
            scores=scores,
            verdict=verdict,
        )],
    }


async def evaluate2_node(state: GraphState) -> dict:
    scores = await score(state["query"], state["chunks"], state["answer_md"])
    compliant = _citation_compliance_ok(state["answer_md"], state["citations"])
    mean = (scores.f + scores.r + scores.c) / 3
    if mean >= 0.80 and compliant:
        verdict = "PASS"
    elif not compliant:
        verdict = f"{mean:.2f} — citation compliance failed, proceeding to compose"
    else:
        verdict = f"{mean:.2f} — proceeding to compose"
    return {
        "scores_2": scores,
        "citations_compliant": compliant,
        "stage_events": [StageEvent(
            stage="evaluate2",
            status="done",
            scores=scores,
            verdict=verdict,
        )],
    }

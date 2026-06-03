"""
evaluate nodes — score retrieved chunks + answer on f/r/c via evaluator.
evaluate1_node: after first retrieval; triggers reloop if mean < 0.80.
evaluate2_node: after reloop retrieval; always proceeds to compose.
"""
from rag.evaluator import score
from rag.state import GraphState
from schemas.events import StageEvent


async def evaluate1_node(state: GraphState) -> dict:
    scores = await score(state["query"], state["chunks"], state["react_output"])
    mean = (scores.f + scores.r + scores.c) / 3
    verdict = "PASS" if mean >= 0.80 else f"BELOW 0.80 ({mean:.2f}), reloop"
    return {
        "scores_1": scores,
        "stage_events": [StageEvent(
            stage="evaluate1",
            status="done",
            scores=scores,
            verdict=verdict,
        )],
    }


async def evaluate2_node(state: GraphState) -> dict:
    scores = await score(state["query"], state["chunks"], state["react_output"])
    mean = (scores.f + scores.r + scores.c) / 3
    verdict = "PASS" if mean >= 0.80 else f"{mean:.2f} — proceeding to compose"
    return {
        "scores_2": scores,
        "stage_events": [StageEvent(
            stage="evaluate2",
            status="done",
            scores=scores,
            verdict=verdict,
        )],
    }

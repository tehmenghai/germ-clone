"""
rewrite node — rewrites the student query for dense semantic retrieval.
Returns: rewritten_query (str), stage_events.
"""
from llm.dispatch import complete
from rag.state import GraphState
from schemas.events import StageEvent

_SYSTEM = """\
Rewrite the student's question as a precise semantic search query for an ML course corpus.
- Remove filler words and conversational phrasing
- Expand abbreviations (e.g. "GD" → "gradient descent")
- Keep it concise (≤ 20 words)
Return ONLY the rewritten query — no explanation, no quotes."""


async def rewrite_node(state: GraphState) -> dict:
    resp = await complete(
        [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": state["query"]},
        ]
    )
    rewritten = resp.strip()
    return {
        "rewritten_query": rewritten,
        "stage_events": [StageEvent(stage="rewrite", status="done", detail="query clarified")],
    }

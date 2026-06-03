"""
reflect node — identifies coverage gaps in retrieved chunks.
Output feeds retrieve2_node as a refined search query if reloop is triggered.
Returns: reflect_output (str), stage_events.
"""
from llm.dispatch import complete
from rag.state import GraphState
from schemas.events import StageEvent

_SYSTEM = """\
You are a coverage reflection agent for an ML tutoring RAG system.

Review the question, chunk snippets, and reasoning. Then:
- If coverage is sufficient: reply "coverage adequate"
- If there are gaps: write 1 concise sentence describing what is missing
  (this becomes a refined retrieval query, so make it searchable)

No preamble. One sentence maximum."""


async def reflect_node(state: GraphState) -> dict:
    snippets = "\n".join(
        f"[{i + 1}] {c.snip}" for i, c in enumerate(state["chunks"])
    )
    user_msg = (
        f"QUESTION: {state['query']}\n\n"
        f"CHUNK SNIPPETS:\n{snippets}\n\n"
        f"REASONING:\n{state['react_output'][:600]}"
    )
    reflect_output = await complete(
        [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": user_msg},
        ]
    )
    reflect_output = reflect_output.strip()
    adequate = any(w in reflect_output.lower() for w in ("adequate", "sufficient", "covered"))
    detail = "coverage adequate" if adequate else "gaps identified — requery planned"
    return {
        "reflect_output": reflect_output,
        "stage_events": [StageEvent(stage="reflect", status="done", detail=detail)],
    }

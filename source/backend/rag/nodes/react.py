"""
react node — single-pass ReAct reasoning over retrieved chunks.
Identifies key concepts and synthesises evidence for the compose node.
Returns: react_output (str), stage_events.
"""
from llm.dispatch import complete
from rag.state import GraphState
from schemas.events import StageEvent

_SYSTEM = """\
You are a ReAct reasoning agent for an ML tutoring system.

Given a student question and retrieved course chunks, produce structured reasoning:

THINK: What concepts are needed to answer this fully?
ACT: Which chunks provide the strongest evidence? (cite by [N])
OBSERVE: Synthesise the key points for the final answer.

Be concise. Ground every claim in the provided chunks."""


async def react_node(state: GraphState) -> dict:
    chunks_text = "\n\n".join(
        f"[{i + 1}] (mod {c.mod}, score {c.score:.2f})\n{c.text[:500]}"
        for i, c in enumerate(state["chunks"])
    )
    user_msg = f"QUESTION: {state['query']}\n\nCHUNKS:\n{chunks_text}"
    react_output = await complete(
        [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": user_msg},
        ]
    )
    react_output = react_output.strip()
    return {
        "react_output": react_output,
        "stage_events": [StageEvent(stage="react", status="done", detail="key concepts identified")],
    }

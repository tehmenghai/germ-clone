"""
GET /ask?q=…&profile_id=…&difficulty=…

Phase 2: drives the live LangGraph pipeline (route → rewrite → retrieve1 → react →
reflect → evaluate1 → [reloop?] → compose) and streams each StageEvent as SSE.

Each graph node appends to state["stage_events"]; astream(stream_mode="updates")
delivers the node's partial return so we emit exactly the events that node produced.
"""
from collections.abc import AsyncGenerator
from typing import Literal

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from rag.graph import build_graph
from streaming.emitter import emit_event

router = APIRouter(tags=["ask"])

Difficulty = Literal["eli5", "standard", "academia"]

_graph = build_graph()


@router.get("/ask")
async def ask(
    q: str,
    profile_id: str,
    difficulty: Difficulty = "standard",
) -> StreamingResponse:
    initial_state = {
        "query": q,
        "profile_id": profile_id,
        "difficulty": difficulty,
        "mod": "",
        "rewritten_query": "",
        "chunks": [],
        "extra_chunks": [],
        "react_output": "",
        "reflect_output": "",
        "scores_1": None,
        "scores_2": None,
        "answer_md": "",
        "citations": [],
        "sources": [],
        "stage_events": [],
    }

    async def _stream() -> AsyncGenerator[str, None]:
        try:
            async for update in _graph.astream(initial_state, stream_mode="updates"):
                for node_output in update.values():
                    for event in node_output.get("stage_events", []):
                        yield await emit_event(event)
        except Exception as exc:
            from schemas.events import StageEvent
            import json
            err = StageEvent(stage="compose", status="error", detail=str(exc))
            payload = err.model_dump(exclude_none=True)
            yield f"data: {json.dumps(payload)}\n\n"

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

"""
GET /ask?q=…&profile_id=…&difficulty=…

Drives the live LangGraph pipeline and streams each StageEvent as SSE.

Compose tokens are streamed token-by-token via an asyncio.Queue so the frontend
receives words as they are generated (no 20-40 s silent wait on Ollama).

Each non-compose node appends to state["stage_events"]; the graph task puts
("event", StageEvent) tuples into the queue. compose_node puts ("token", str)
tuples directly. The SSE generator is the sole consumer.
"""
import asyncio
import json
from collections.abc import AsyncGenerator
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.auth import require_session
from app.rate_limit import rate_limit_ask
from rag.graph import build_graph
from schemas.events import PIPE_STAGES, StageEvent
from streaming.emitter import emit_event

router = APIRouter(tags=["ask"])

Difficulty = Literal["eli5", "standard", "academia"]

_graph = build_graph()


@router.get("/ask", dependencies=[Depends(require_session), Depends(rate_limit_ask)])
async def ask(
    q: str,
    profile_id: str,
    difficulty: Difficulty = "standard",
) -> StreamingResponse:
    event_queue: asyncio.Queue = asyncio.Queue()

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
        "token_queue": event_queue,   # compose_node drains tokens here
    }

    async def _stream() -> AsyncGenerator[str, None]:
        async def _run_graph() -> None:
            last_completed: str = ""
            try:
                async for update in _graph.astream(
                    initial_state, stream_mode="updates"
                ):
                    for _node_name, node_output in update.items():
                        for event in node_output.get("stage_events", []):
                            last_completed = event.stage
                            await event_queue.put(("event", event))
            except Exception as exc:
                # Attribute error to the stage after the last completed one
                idx = PIPE_STAGES.index(last_completed) + 1 if last_completed in PIPE_STAGES else 0
                failed_stage = PIPE_STAGES[idx] if idx < len(PIPE_STAGES) else PIPE_STAGES[-1]
                await event_queue.put(("error", {"stage": failed_stage, "detail": str(exc)}))
            finally:
                await event_queue.put(("done", None))

        graph_task = asyncio.create_task(_run_graph())

        try:
            while True:
                kind, payload = await event_queue.get()

                if kind == "done":
                    break
                elif kind == "event":
                    yield await emit_event(payload)
                elif kind == "token":
                    yield await emit_event(
                        StageEvent(stage="compose", status="active", token=payload)
                    )
                elif kind == "error":
                    err = StageEvent(
                        stage=payload["stage"], status="error", detail=payload["detail"]
                    )
                    yield f"data: {json.dumps(err.model_dump(exclude_none=True))}\n\n"
        finally:
            if not graph_task.done():
                graph_task.cancel()

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

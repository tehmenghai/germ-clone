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

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from rag.graph import build_graph
from schemas.events import StageEvent
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
            try:
                async for update in _graph.astream(
                    initial_state, stream_mode="updates"
                ):
                    for node_output in update.values():
                        for event in node_output.get("stage_events", []):
                            await event_queue.put(("event", event))
            except Exception as exc:
                await event_queue.put(("error", str(exc)))
            finally:
                await event_queue.put(("done", None))

        asyncio.create_task(_run_graph())

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
                err = StageEvent(stage="compose", status="error", detail=payload)
                yield f"data: {json.dumps(err.model_dump(exclude_none=True))}\n\n"

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

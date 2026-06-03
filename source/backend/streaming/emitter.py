"""
SSE emitter — serialises StageEvent objects into the text/event-stream wire format.
Used by /ask in Phase 1 (mock) and Phase 2 (live LangGraph callbacks).
"""
import asyncio
import json
from collections.abc import AsyncGenerator

from schemas.events import StageEvent, StageKey

DEFAULT_DELAY_MS: dict[StageKey, int] = {
    "route": 300,
    "rewrite": 400,
    "retrieve1": 800,
    "react": 600,
    "reflect": 500,
    "evaluate1": 700,
    "retrieve2": 900,
    "evaluate2": 700,
    "compose": 1200,
}


async def event_stream(
    events: list[StageEvent],
    delay_map: dict[str, int] | None = None,
) -> AsyncGenerator[str, None]:
    """
    Yield each StageEvent as an SSE data line with a realistic delay.
    Wire format: "data: {json}\\n\\n"
    """
    delays = delay_map if delay_map is not None else DEFAULT_DELAY_MS
    for event in events:
        ms = delays.get(event.stage, 400)
        await asyncio.sleep(ms / 1000)
        payload = event.model_dump(exclude_none=True)
        yield f"data: {json.dumps(payload)}\n\n"


async def emit_event(event: StageEvent) -> str:
    """
    Synchronously serialise a single event to an SSE line (no delay).
    Used by Phase 2 LangGraph node callbacks that manage their own timing.
    """
    payload = event.model_dump(exclude_none=True)
    return f"data: {json.dumps(payload)}\n\n"

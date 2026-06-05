"""
Tests for GET /ask — SSE mock stream.
"""
import json

from httpx import ASGITransport, AsyncClient

from app.main import app


def _parse_sse(raw: str) -> list[dict]:
    events = []
    for line in raw.splitlines():
        if line.startswith("data: "):
            events.append(json.loads(line[len("data: "):]))
    return events


async def test_ask_returns_event_stream():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        async with client.stream("GET", "/ask", params={"q": "bias variance", "profile_id": "p1", "difficulty": "standard"}) as resp:
            assert resp.status_code == 200
            assert "text/event-stream" in resp.headers["content-type"]
            body = await resp.aread()

    events = _parse_sse(body.decode())
    assert len(events) > 0


async def test_ask_bias_first_and_last_stage():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        async with client.stream("GET", "/ask", params={"q": "bias variance", "profile_id": "p1", "difficulty": "standard"}) as resp:
            body = await resp.aread()

    events = _parse_sse(body.decode())
    assert events[0]["stage"] == "route"
    assert events[-1]["stage"] == "compose"
    assert events[-1]["status"] == "done"
    assert "answer_md" in events[-1]


async def test_ask_regularization_has_reloop():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        async with client.stream("GET", "/ask", params={"q": "regularization lasso", "profile_id": "p1", "difficulty": "standard"}) as resp:
            body = await resp.aread()

    events = _parse_sse(body.decode())
    stages = [e["stage"] for e in events]
    assert "retrieve2" in stages
    assert "evaluate2" in stages
    eval1 = next(e for e in events if e["stage"] == "evaluate1")
    assert "BELOW" in eval1.get("verdict", "")


async def test_ask_bias_has_no_reloop():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        async with client.stream("GET", "/ask", params={"q": "bias variance", "profile_id": "p1", "difficulty": "standard"}) as resp:
            body = await resp.aread()

    events = _parse_sse(body.decode())
    stages = [e["stage"] for e in events]
    assert "retrieve2" not in stages
    assert "evaluate2" not in stages


async def test_compose_emits_token_events():
    """Token events must appear before the compose done event."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        async with client.stream(
            "GET", "/ask",
            params={"q": "what is gradient descent", "profile_id": "p1", "difficulty": "standard"},
        ) as resp:
            body = await resp.aread()

    events = _parse_sse(body.decode())
    token_events = [e for e in events if e.get("stage") == "compose" and e.get("status") == "active"]
    done_event   = next((e for e in events if e.get("stage") == "compose" and e.get("status") == "done"), None)

    assert done_event is not None, "compose done event missing"
    assert len(token_events) > 0, "no token events received — streaming not working"
    assert "token" in token_events[0], "token field missing from token event"

    # done event must come after all token events
    done_idx  = events.index(done_event)
    token_idxs = [events.index(e) for e in token_events]
    assert all(i < done_idx for i in token_idxs), "done event arrived before some token events"

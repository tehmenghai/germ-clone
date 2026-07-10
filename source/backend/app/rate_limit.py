"""
Minimal in-memory per-IP rate limiter for /ask (issue #28).

No new dependency (slowapi/limits) pulled in for this — the deploy target is a
small study-team demo on a single process, so an in-memory sliding window is
enough and avoids the ADR ceremony CONTRIBUTING.md requires for new external deps.
If this ever needs to survive multi-process/multi-instance deploys, revisit with
a shared store (Redis) at that point.
"""
import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

_WINDOW_SECONDS = 60.0
_MAX_REQUESTS = 10  # per IP per window

_hits: dict[str, list[float]] = defaultdict(list)


def reset() -> None:
    """Test hook."""
    _hits.clear()


def rate_limit_ask(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    hits = _hits[ip]
    while hits and now - hits[0] > _WINDOW_SECONDS:
        hits.pop(0)
    if len(hits) >= _MAX_REQUESTS:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"rate limit exceeded — max {_MAX_REQUESTS} requests per {int(_WINDOW_SECONDS)}s",
        )
    hits.append(now)

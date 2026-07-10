"""
Regression tests for issue #28 — passphrase gate was declared (ADR-0005, .env vars)
but never wired into any route, and /settings, /profiles, /ask had no auth at all.

Per CONTRIBUTING.md's "What we won't merge": anything touching auth needs a test
proving the check actually rejects an unauthenticated request — that's the first
test in each pair below.
"""
from httpx import ASGITransport, AsyncClient

from app import auth
from app.main import app


async def test_settings_rejects_unauthenticated_when_passphrase_required():
    auth.set_required(True)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/settings/inference")
    assert response.status_code == 401


async def test_settings_allows_unauthenticated_when_passphrase_not_required():
    auth.set_required(False)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/settings/inference")
    assert response.status_code == 200


async def test_profiles_rejects_unauthenticated_when_passphrase_required():
    auth.set_required(True)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/profiles")
    assert response.status_code == 401


async def test_ask_rejects_unauthenticated_when_passphrase_required():
    auth.set_required(True)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/ask", params={"q": "hi", "profile_id": "p1"})
    assert response.status_code == 401


async def test_wrong_passphrase_rejected():
    auth._state["passphrase"] = "correct-horse-battery-staple"
    auth.set_required(True)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/auth/passphrase", json={"passphrase": "wrong"})
    assert response.status_code == 401


async def test_correct_passphrase_establishes_session_that_unlocks_gated_routes():
    auth._state["passphrase"] = "correct-horse-battery-staple"
    auth.set_required(True)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        submit = await client.post("/auth/passphrase", json={"passphrase": "correct-horse-battery-staple"})
        assert submit.status_code == 204

        settings_resp = await client.get("/settings/inference")
        assert settings_resp.status_code == 200


async def test_auth_status_reports_required_flag():
    auth.set_required(True)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/auth/status")
    assert response.json() == {"required": True}


async def test_ask_rate_limited_after_threshold():
    from app.rate_limit import _MAX_REQUESTS

    auth.set_required(False)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        statuses = []
        for _ in range(_MAX_REQUESTS + 1):
            resp = await client.get("/ask", params={"q": "hi", "profile_id": "p1"})
            statuses.append(resp.status_code)

    assert statuses[:_MAX_REQUESTS] == [200] * _MAX_REQUESTS
    assert statuses[-1] == 429


def test_null_origin_not_allowed_for_credentialed_cors():
    from app.main import app as fastapi_app

    cors_middleware = next(
        m for m in fastapi_app.user_middleware if m.cls.__name__ == "CORSMiddleware"
    )
    assert "null" not in cors_middleware.kwargs["allow_origins"]

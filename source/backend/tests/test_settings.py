import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.routes.settings import _pipeline_state
from llm import config


@pytest.fixture(autouse=True)
def reset_backend():
    """Restore the default backend and pipeline mode after every test."""
    original_backend = config.get_backend()
    original_mode = _pipeline_state["mode"]
    yield
    config.set_backend(original_backend)
    _pipeline_state["mode"] = original_mode


async def test_get_inference_default():
    config.set_backend("ollama")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/settings/inference")
    assert response.status_code == 200
    assert response.json() == {"backend": "ollama"}


async def test_set_inference_cloud():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        post = await client.post("/settings/inference", json={"backend": "cloud"})
        assert post.status_code == 200
        get = await client.get("/settings/inference")
    assert get.json() == {"backend": "cloud"}


async def test_set_inference_cerebras():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        post = await client.post("/settings/inference", json={"backend": "cerebras"})
        assert post.status_code == 200
        get = await client.get("/settings/inference")
    assert get.json() == {"backend": "cerebras"}


async def test_set_inference_gemini():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        post = await client.post("/settings/inference", json={"backend": "gemini"})
        assert post.status_code == 200
        get = await client.get("/settings/inference")
    assert get.json() == {"backend": "gemini"}


async def test_set_inference_openrouter():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        post = await client.post("/settings/inference", json={"backend": "openrouter"})
        assert post.status_code == 200
        get = await client.get("/settings/inference")
    assert get.json() == {"backend": "openrouter"}


async def test_set_inference_invalid():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/settings/inference", json={"backend": "openai"})
    assert response.status_code == 422


async def test_get_pipeline_default():
    _pipeline_state["mode"] = "langgraph"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/settings/pipeline")
    assert response.status_code == 200
    assert response.json() == {"mode": "langgraph"}


async def test_set_pipeline_langflow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        post = await client.post("/settings/pipeline", json={"mode": "langflow"})
        assert post.status_code == 200
        get = await client.get("/settings/pipeline")
    assert get.json() == {"mode": "langflow"}


async def test_set_pipeline_langgraph():
    _pipeline_state["mode"] = "langflow"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        post = await client.post("/settings/pipeline", json={"mode": "langgraph"})
        assert post.status_code == 200
        get = await client.get("/settings/pipeline")
    assert get.json() == {"mode": "langgraph"}


async def test_set_pipeline_invalid():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/settings/pipeline", json={"mode": "prefect"})
    assert response.status_code == 422

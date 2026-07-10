# Meng Hai — Testing Report

**Owner:** Meng Hai (tehmenghai@gmail.com)
**Phase:** 1

---

## How to run tests

### Prerequisites

```bash
cd source/backend
cp .env.example .env      # edit OLLAMA_URL if not on localhost
pip install uv
uv pip install -r requirements.txt
uv pip install pytest httpx pytest-asyncio
```

### Lint gate

```bash
ruff check source/backend/
```

Expected: no output (zero findings).

### Unit tests

```bash
pytest source/backend/tests/ -v
```

Expected output:

```
tests/test_health.py::test_health PASSED
tests/test_settings.py::test_get_inference_default PASSED
tests/test_settings.py::test_set_inference_cloud PASSED
tests/test_settings.py::test_set_inference_invalid PASSED
tests/test_ask.py::test_ask_returns_event_stream PASSED
tests/test_ask.py::test_ask_bias_first_and_last_stage PASSED
tests/test_ask.py::test_ask_regularization_has_reloop PASSED
tests/test_ask.py::test_ask_bias_has_no_reloop PASSED

8 passed in X.XXs
```

### Manual smoke tests

Start the server:
```bash
uvicorn app.main:app --port 8007 --reload
```

Then run each check:

```bash
# 1. Health
curl http://localhost:8007/health
# expected: {"status":"ok"}

# 2. Inference default
curl http://localhost:8007/settings/inference
# expected: {"backend":"ollama"}

# 3. Toggle to cloud
curl -X POST http://localhost:8007/settings/inference \
  -H "Content-Type: application/json" \
  -d '{"backend":"cloud"}'
curl http://localhost:8007/settings/inference
# expected: {"backend":"cloud"}

# 4. Reset to ollama
curl -X POST http://localhost:8007/settings/inference \
  -H "Content-Type: application/json" \
  -d '{"backend":"ollama"}'

# 5. Ask — no-reloop topic (7 events)
curl "http://localhost:8007/ask?q=gradient+descent&profile_id=p1&difficulty=standard"
# expected: SSE stream, 7 events, last stage=compose status=done

# 6. Ask — reloop topic (9 events)
curl "http://localhost:8007/ask?q=regularization&profile_id=p1&difficulty=standard"
# expected: SSE stream, 9 events including retrieve2 and evaluate2

# 7. Profiles
curl http://localhost:8007/profiles
# expected: []
curl -X POST http://localhost:8007/profiles \
  -H "Content-Type: application/json" \
  -d '{"name":"Meng Hai"}'
# expected: {"id":"...","name":"Meng Hai"}
curl http://localhost:8007/profiles
# expected: [{"id":"...","name":"Meng Hai"}]
```

---

## Test results

**Run date:** 2026-06-01
**Runner:** Meng Hai (local, macOS)

### Lint

```
ruff check source/backend/
```
Result: ✅ **0 findings**

### Unit tests

```
pytest source/backend/tests/ -v
```

| Test | Result |
|---|---|
| `test_health` | ✅ PASSED |
| `test_get_inference_default` | ✅ PASSED |
| `test_set_inference_cloud` | ✅ PASSED |
| `test_set_inference_invalid` | ✅ PASSED |
| `test_ask_returns_event_stream` | ✅ PASSED |
| `test_ask_bias_first_and_last_stage` | ✅ PASSED |
| `test_ask_regularization_has_reloop` | ✅ PASSED |
| `test_ask_bias_has_no_reloop` | ✅ PASSED |

**8 / 8 passed**

### Smoke tests

| Check | Expected | Result |
|---|---|---|
| `GET /health` | `{"status":"ok"}` | ✅ |
| `GET /settings/inference` | `{"backend":"ollama"}` | ✅ |
| `POST /settings/inference {"backend":"cloud"}` + re-GET | `{"backend":"cloud"}` | ✅ |
| `GET /ask?q=gradient+descent` | 7 SSE events, last=compose | ✅ |
| `GET /ask?q=regularization` | 9 SSE events, includes retrieve2+evaluate2 | ✅ |
| `GET /profiles` | `[]` | ✅ |
| `POST /profiles {"name":"Meng Hai"}` | profile returned with id | ✅ |
| CORS headers from :3007 | `Access-Control-Allow-Origin: http://localhost:3007` | ✅ |

---

## Known limitations (Phase 1)

- `/settings/inference` backend state is in-process only — restarting the server resets to `ollama`.
- `/profiles` is in-memory — profiles are lost on restart. Persistence wired in Phase 2 (Ben's Neon schema).
- `llm/dispatch.py` is a stub — `complete()` raises `NotImplementedError` unless Ollama or a Groq key is configured. The mock `/ask` route does not call it.

# Meng Hai — System Architecture

**Owner:** Meng Hai (tehmenghai@gmail.com)
**Scope:** RAG engine, LLM dispatch, SSE streaming, FastAPI app layer

---

## 1. Request flow (Phase 1 — mock)

```
Browser / curl
    │
    │  GET /ask?q=…&profile_id=…&difficulty=…
    ▼
FastAPI  app/main.py
    │
    ▼
app/routes/ask.py
    │  1. pick_topic(q) → topic key
    │  2. look up DEMO_EVENTS[topic]
    │  3. pass to streaming/emitter.event_stream()
    ▼
streaming/emitter.py
    │  async generator: for each StageEvent
    │    asyncio.sleep(DELAY_MAP[stage])
    │    yield "data: {json}\n\n"
    ▼
FastAPI StreamingResponse(media_type="text/event-stream")
    │
    ▼
Browser EventSource  ←  lib/api.ts:askStream()
    │
    ▼
page.tsx handleAsk()  — updates events[], activeIdx, phase
```

---

## 2. Request flow (Phase 2 — live engine)

```
Browser / curl
    │
    │  GET /ask?q=…&profile_id=…&difficulty=…
    ▼
app/routes/ask.py
    │  1. build LangGraph input state
    │  2. run rag/graph.py pipeline (streaming mode)
    ▼
rag/graph.py  (LangGraph StateGraph)
    │
    ├─ node: route      → classify module
    ├─ node: rewrite    → llm/dispatch.complete()
    ├─ node: retrieve1  → repository/ pgvector query
    ├─ node: react      → llm/dispatch.complete() (ReAct)
    ├─ node: reflect    → llm/dispatch.complete()
    ├─ node: evaluate1  → rag/evaluator.py f/r/c scores
    │     if mean(f,r,c) < 0.80:
    ├─────── node: retrieve2 → repository/ pgvector query
    ├─────── node: evaluate2 → rag/evaluator.py
    └─ node: compose    → llm/dispatch.complete() → answer_md + citations
    │
    │  each node callback → streaming/emitter.emit_event(StageEvent)
    ▼
streaming/emitter.py  →  StreamingResponse
```

---

## 3. LLM dispatch layer

```
app/routes/ask.py  or  rag/nodes/*.py
    │
    │  await llm.dispatch.complete(messages=[…])
    ▼
llm/dispatch.py
    │  config.get_backend() == "ollama"?
    │    → litellm.acompletion("ollama/mistral", base_url=OLLAMA_URL, …)
    │  config.get_backend() == "cloud"?
    │    → litellm.acompletion("groq/llama3-8b-8192", api_key=GROQ_API_KEY, …)
    ▼
LiteLLM  →  Ollama (local)  |  Groq API (free tier)
```

**Provider choice rationale:**
- **Ollama** — default; zero cost, runs on dev machine, no billing risk.
- **Groq** — free-tier cloud (llama3-8b); high token/min limit, no paid tier needed.
  Chosen over OpenAI/Anthropic to keep the "no runaway bill" invariant from ADR-0001.

**Toggle persistence:** `llm/config.py` holds an in-process `_state` dict.
In Phase 2, this will be persisted to a DB settings row.

---

## 4. SSE event contract

Every pipeline stage transition emits exactly one `StageEvent` (defined in
`schemas/events.py`):

```jsonc
// active — stage has started
{"stage": "retrieve1", "status": "active", "detail": "querying pgvector…"}

// done — stage completed, optional payload
{"stage": "evaluate1", "status": "done", "scores": {"f":0.71,"r":0.88,"c":0.60}, "verdict": "BELOW 0.80, reloop"}

// compose — final event carries the answer
{"stage": "compose", "status": "done", "answer_md": "…", "citations": […], "sources": […]}
```

**Stage keys (invariant — must match frontend PIPE_STAGES):**
```
route → rewrite → retrieve1 → react → reflect → evaluate1
                                                     │
                           if mean(f,r,c) < 0.80 ───►  retrieve2 → evaluate2
                                                     │
                                                     └─► compose
```

---

## 5. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Web framework | **FastAPI async** | Native `StreamingResponse` for SSE; async I/O throughout |
| SSE transport | `StreamingResponse(media_type="text/event-stream")` | No WS handshake needed; one-directional stage events |
| Orchestration | **LangGraph** (Phase 2) | Native conditional edges; per-node callbacks map 1:1 to SSE events |
| LLM routing | **LiteLLM** (app-local `llm/`) | Single interface over Ollama + cloud; powers inference toggle |
| Ollama model | `ollama/mistral` | Strong general instruction-following; local, zero-cost |
| Cloud model | `groq/llama3-8b-8192` | Free-tier Groq; no billing risk (ADR-0001) |
| Embeddings | `nomic-embed-text` via Ollama 768-dim (Phase 2) | Strong retrieval; local default (ADR-0004) |
| Vector store | Neon Postgres + pgvector (Phase 2) | Single store; Neon branching per dev (ADR-0003) |
| Validation | **Pydantic v2** | Schema models shared between FastAPI and RAG engine |
| Linting | **ruff** | Fast, replaces flake8+isort+pyupgrade |
| Testing | **pytest** + **httpx.AsyncClient** | No live server needed; `ASGITransport` |

---

## 6. Directory map

```
source/backend/
├── app/
│   ├── main.py             FastAPI app, CORS, lifespan, router registration
│   └── routes/
│       ├── ask.py          GET /ask  — SSE stream (mock Phase 1, live Phase 2)
│       ├── settings.py     GET/POST /settings/inference
│       └── profiles.py     GET/POST /profiles  (in-memory stub Phase 1)
├── llm/
│   ├── config.py           Env-based provider singleton; get/set_backend()
│   └── dispatch.py         LiteLLM acompletion wrapper
├── streaming/
│   └── emitter.py          async event_stream() generator → SSE lines
├── rag/                    [Phase 2]
│   ├── graph.py            LangGraph StateGraph (9 nodes + reloop edge)
│   ├── nodes/              One module per stage
│   └── evaluator.py        f/r/c scorer
├── schemas/                [SHARED CONTRACT — do not change without heads-up]
│   ├── events.py           StageEvent, PIPE_STAGES, EvalScores, Citation
│   └── retrieval.py        RetrievalResult (Ben's — do not touch)
└── tests/
    ├── test_health.py
    ├── test_settings.py
    └── test_ask.py
```

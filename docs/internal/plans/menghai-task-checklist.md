# Meng Hai — Phase 1 Task Checklist

**Owner:** Meng Hai (tehmenghai@gmail.com)
**Phase:** 1 — Mock streamer, LLM stub, inference settings, CI

---

## Status legend
| Symbol | Meaning |
|---|---|
| ⬜ | Pending |
| 🔄 | In progress |
| ✅ | Done |
| ❌ | Blocked |

---

## Phase 1 tasks

| # | Task | File(s) | Status |
|---|---|---|---|
| 1 | Publish `schemas/events.py` (SSE contract) | `source/backend/schemas/events.py` | ✅ Done (Phase 0) |
| 2 | Create `.env.example` | `source/backend/.env.example` | ✅ Done |
| 3 | LLM config singleton | `source/backend/llm/config.py` | ✅ Done |
| 4 | LiteLLM dispatch wrapper | `source/backend/llm/dispatch.py` | ✅ Done |
| 5 | SSE emitter | `source/backend/streaming/emitter.py` | ✅ Done |
| 6 | `/ask` mock SSE endpoint | `source/backend/app/routes/ask.py` | ✅ Done |
| 7 | `GET/POST /settings/inference` | `source/backend/app/routes/settings.py` | ✅ Done |
| 8 | `/profiles` in-memory stub | `source/backend/app/routes/profiles.py` | ✅ Done |
| 9 | Register routers in `main.py` | `source/backend/app/main.py` | ✅ Done |
| 10 | Backend unit tests | `source/backend/tests/` | ✅ Done |
| 11 | CI workflow | `.github/workflows/ci.yml` | ✅ Done |
| 12 | Smoke test all endpoints | — | ✅ Done |

---

## Phase 2 tasks (planned, not started)

| # | Task | File(s) | Status | Blocker |
|---|---|---|---|---|
| 13 | LangGraph graph (9 stages + reloop) | `source/backend/rag/graph.py` | ⬜ | Waiting on Ben's `repository/` |
| 14 | RAG node implementations | `source/backend/rag/nodes/*.py` | ⬜ | Waiting on Ben's `repository/` |
| 15 | f/r/c evaluator | `source/backend/rag/evaluator.py` | ⬜ | Waiting on Ben's `repository/` |
| 16 | Swap mock `/ask` for live engine | `source/backend/app/routes/ask.py` | ⬜ | Blocked on #13–15 |
| 17 | Live `/settings/inference` (real switching) | `source/backend/llm/dispatch.py` | ⬜ | Needs Ollama + Groq keys |
| 18 | Server-side profile + conversation persistence | `source/backend/app/routes/profiles.py` | ⬜ | Blocked on Ben's Neon schema |
| 19 | Deployment | — | ⬜ | — |

---

## Coordination log

| Date | Action | Who |
|---|---|---|
| 2026-06-01 | `schemas/events.py` published — Lik Hong can start frontend | Meng Hai → Lik Hong |
| 2026-06-01 | Mock `/ask` streamer live on :8007 — Lik Hong can flip frontend test target | Meng Hai → Lik Hong |

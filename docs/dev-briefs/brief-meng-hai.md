# Meng Hai — RAG Engine + CI/Deploy

You own the pipeline and the infrastructure. Everything the frontend renders comes through
your SSE contract. Your first job — day one — is publishing that contract so Lik Hong can
build without waiting for you.

## Your directories

```
source/backend/rag/         LangGraph graph, nodes, evaluator
source/backend/llm/         LiteLLM dispatch, provider config
source/backend/streaming/   SSE emitter
source/backend/app/         main.py, routes, DI wiring
```

Stay out of `ingestion/`, `repository/`, `alembic/`, and `source/frontend/`. If a task pulls
you toward those, stop and flag it.

## What you're building

**Phase 1 (start here — day 1 priority):**
- Publish `schemas/events.py` as a fully documented contract. This unblocks Lik Hong.
- Wire a `/ask` mock endpoint that replays the 4 demo topics as SSE events with realistic
  timings. The frontend builds against this before the real engine exists.
- Stub `llm/` with LiteLLM: Ollama + one free-cloud provider wired up, switchable.
- Stub `GET/POST /settings/inference`.
- CI pipeline green on empty test suites.

**Phase 2:**
- LangGraph graph: 9 stages + conditional re-loop (`if mean(f,r,c) < 0.80 → retrieve2`).
  Re-implement from Lanson's `flows/ml-tutor.flow.json` — not directly from the Langflow JSON,
  which is not executable LangGraph.
- Retrieval over pgvector (calls Ben's `repository/`).
- ReAct, reflect/correct, f/r/c evaluator (faithfulness, relevance, completeness).
- Swap the mock streamer for the live engine emitting the same SSE shape.
- Live `/settings/inference` with real provider switching.
- Deployment.

## The sacred files

`schemas/events.py` is yours. Define it carefully on day 1 — the frontend is building against
it immediately. Any change to field names, stage keys, or the compose payload after Lik Hong
has started needs his sign-off before the PR is opened.

Stage keys are an invariant. They must match the frontend's `PIPE_STAGES` exactly:
```
route  rewrite  retrieve1  react  reflect  evaluate1  retrieve2  evaluate2  compose
```
Renaming any of these is a breaking change.

`schemas/retrieval.py` is Ben's. Don't touch it. If you need a field that isn't there, raise
it with Ben — don't add it yourself.

See `docs/contracts.md`.

## The Lanson handoff

Lanson designs and tunes the flow in Langflow and exports `flows/ml-tutor.flow.json`. You
re-implement it as the LangGraph graph in `rag/`. You are not running Langflow on the request
path — ever. Keep `flows/README.md` current so the node→module mapping is visible. If Lanson
changes the stage list, the re-loop condition, or a prompt's contract, he flags it to you
before shipping. Hold him to that.

## Using a coding agent

Start every session with:

```
Read apps/germ-clone/CLAUDE.md, docs/plans/build-plan.md, and docs/contracts.md first.

I am Meng Hai. My ownership areas are source/backend/rag/, llm/, streaming/, and app/.
Do not touch files outside these directories without flagging it to me first.

Sacred files: schemas/events.py is mine — any change after Lik Hong starts building against
it needs his explicit sign-off before merge. schemas/retrieval.py belongs to Ben — do not
edit it.

Stage key invariant: route, rewrite, retrieve1, react, reflect, evaluate1, retrieve2,
evaluate2, compose — these must not be renamed without a breaking-change heads-up to Lik Hong.

[Task]
```

## Stack reminders

- LangGraph for the runtime graph. Langflow is Lanson's design tool — not your dependency.
- LiteLLM in `source/backend/llm/`. Ollama-local default, one free-cloud provider. No paid
  cloud.
- SSE via FastAPI `StreamingResponse`. One event per pipeline node transition.
- Linting: `ruff`. CI must run `ruff` + `pytest` on every PR.

# germ//clone

An AI ML tutor built as a "digital twin" of an instructor. Students ask questions across
modules 3.1–3.10; a self-correcting agentic RAG pipeline (route → rewrite → retrieve → ReAct
→ reflect → evaluate → re-retrieve → compose) grounds every answer in the course corpus, then
renders it with an interactive visualisation and the underlying maths alongside it.

Two view modes: **Reality** (reading) and **Matrix** (console/terminal).

Built by a 4-person team — see [Team](#team) below.

## Ports

| Service | Port |
|---|---|
| Backend (FastAPI) | 8007 |
| Frontend (Next.js) | 3007 |

## Quick start

```bash
./launch.sh
```

Requires: `uv`, `pnpm`, Ollama running with `nomic-embed-text` pulled, and a Neon connection
string in `source/backend/.env`. Full local setup: `docs/how-to-configure.md`.

## Stack

- **Frontend:** Next.js 14 App Router + TypeScript (strict) + Tailwind
- **Backend:** FastAPI (async) + SQLAlchemy 2 (async) + Alembic
- **Orchestration:** LangGraph at runtime. Langflow is used as a design sketchpad only — it
  never sits on the request path.
- **LLM dispatch:** LiteLLM, wired app-locally in `source/backend/llm/`. Ollama-local is the
  default; a free-cloud toggle exists behind `GET/POST /settings/inference` for providers
  that don't charge at low volume.
- **Embeddings:** `nomic-embed-text`, 768-dim, via Ollama (see ADR-0004).
- **DB:** Neon Postgres + pgvector, branch-per-dev (see ADR-0003).
- **Streaming:** Server-Sent Events (SSE).

### Why no shared `ai-core`?

Every other app in this portfolio shares a common LLM dispatch library (`ai-core`) for
provider routing, gates, and telemetry. This project doesn't use it — LiteLLM is wired
directly in `source/backend/llm/` instead. The reasoning is in
[ADR-0001](docs/adr/ADR-0001-app-local-litellm-dispatch.md): this was built as a 4-developer
team exercise with its own dispatch, fallback, and telemetry requirements, and coupling it to
a library shared across unrelated apps would have added coordination overhead without a
matching benefit here.

## Architecture

Full narrative, C4 diagram, data model, and integration detail: `docs/live-design.md`.
Decision history: `docs/adr/` (ADR-0001 through ADR-0007) and `docs/live-journal.md`.

## Eval

Golden-set harness under `evaluation/`, scored on faithfulness/relevance/completeness.
CI fails on regression against baseline. See `docs/live-requirements.md` for the acceptance
bar this pipeline is held to.

## Access

Local dev runs with no gate. A shared-passphrase gate activates on deploy — see ADR-0005.
User profiles and conversation history are server-side, no passwords, profile-picker entry.

## Team

| Role | Area |
|---|---|
| Lik Hong (Lead) | Frontend, UI/UX |
| Ben | Ingestion, corpus, Neon/migrations |
| Meng Hai | RAG engine, LLM dispatch, streaming, CI |
| Lanson | Langflow design, eval harness |

Ownership is enforced via [`.github/CODEOWNERS`](.github/CODEOWNERS). Contract-change
discipline for the two schemas that cross ownership boundaries: `docs/contracts.md`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

[MIT](LICENSE)

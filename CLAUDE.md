# germ//clone — CLAUDE.md

## Overview

AI ML tutor styled as a "digital twin" of an instructor. Students ask ML questions
(modules 3.1–3.10); a self-correcting agentic RAG pipeline (route → rewrite → retrieve →
ReAct → reflect → evaluate → re-retrieve → compose) grounds every answer in the course corpus.
Answers are rendered with an interactive visualization and the underlying math. 

Two view modes:
**Reality** (reading) and **Matrix** (console/terminal).

**Team build (4 devs):** Lik Hong (Lead, UI/UX), Ben (Ingest & Corpus), Meng Hai (RAG engine + CI), Lanson (Langflow design + eval).

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 App Router + TypeScript strict + Tailwind + pnpm |
| Backend | Python 3.12, FastAPI async, SQLAlchemy 2 async + Alembic, `uv` |
| Orchestration | LangGraph (runtime); Langflow (design sketchpad only — never on the request path) |
| LLM dispatch | LiteLLM (app-local `source/backend/llm/`) — Ollama + free-cloud toggle |
| Embeddings | `nomic-embed-text` via Ollama (768-dim); switchable |
| DB | Neon Postgres + pgvector; branch-per-dev |
| Streaming | SSE (Server-Sent Events) |
| Eval | Golden-set harness, f/r/c metrics; CI-gated |

**App-local LLM dispatch only** — no shared LLM library. LiteLLM in `source/backend/llm/`
provides all LLM routing for this project. See ADR-0001.

## Ports

- Backend: **8007**
- Frontend: **3007**

## Project structure

Follows the workspace app archetype: `source/backend/` + `source/frontend/` + `launch.sh`.
Eval at `evaluation/`; Langflow assets at `flows/`; ADRs at `docs/adr/`.

## Key contracts (do not change without heads-up to consumers)

- `source/backend/schemas/events.py` — SSE event shape consumed by the frontend
- `source/backend/schemas/retrieval.py` — retrieval result shape consumed by the RAG engine

Full change discipline: `docs/contracts.md`.

## Pipeline stage keys

Must match the frontend's `PIPE_STAGES` exactly:
`route, rewrite, retrieve1, react, reflect, evaluate1, retrieve2, evaluate2, compose`

## Ownership map

| Directory | Owner |
|---|---|
| `source/frontend/` | Lik Hong |
| `source/backend/ingestion/`, `repository/`, `alembic/` | Ben |
| `source/backend/rag/`, `llm/`, `streaming/`, `app/` | Meng Hai |
| `flows/`, `evaluation/` | Lanson |
| `source/backend/schemas/` | Shared contract — see `docs/contracts.md` |

## Testing

- Backend: `pytest` (`source/backend/tests/`)
- Frontend: Vitest + Playwright (`source/frontend/tests/`)
- Eval: `evaluation/` golden-set harness; CI fails on f/r/c regression

## Linting

- Python: `ruff`
- Frontend: ESLint + Prettier

## Inference toggle

Ollama-local (default) / free-cloud only. Paid cloud removed — no runaway-bill surface.
Toggle drives `GET/POST /settings/inference`.

## Access

Shared passphrase gate (activates on deploy; off locally). User profiles + server-side
conversation persistence (no passwords; profile-picker entry). See ADR-0005.

## ADRs

- ADR-0001: App-local LiteLLM dispatch (no shared LLM library)
- ADR-0002: LangGraph runtime, Langflow as design sketchpad
- ADR-0003: Neon Postgres + pgvector, branch-per-dev
- ADR-0004: nomic-embed-text default embedding
- ADR-0005: Access and identity (passphrase + profiles + server-side persistence)

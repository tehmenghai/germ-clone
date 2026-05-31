# germ//clone

AI ML tutor (module 3). Agentic RAG pipeline with self-correction, interactive visualizations,
and structured math. Two view modes: Reality and Matrix.

## Ports

| Service | Port |
|---|---|
| Backend (FastAPI) | 8007 |
| Frontend (Next.js) | 3007 |

## Quick start

```bash
./launch.sh
```

Requires: `uv`, `pnpm`, Ollama running with `nomic-embed-text` pulled, Neon connection string
in `source/backend/.env`.

## Stack

- **Frontend:** Next.js 14 App Router + TypeScript + Tailwind
- **Backend:** FastAPI + LangGraph + LiteLLM + SQLAlchemy + Alembic
- **DB:** Neon Postgres + pgvector
- **Embeddings:** nomic-embed-text (768-dim, Ollama)
- **Inference:** Ollama-local (default) / free-cloud toggle

## Dev setup

See `docs/how-to-configure.md`.

## Team

| Role | Area |
|---|---|
| Lik Hong (Lead) | Frontend UI/UX |
| Ben | Ingest & Corpus + Neon/migrations |
| Meng Hai | RAG engine + CI/deploy |
| Lanson | Langflow design + eval harness |

Ownership enforced via `.github/CODEOWNERS`. Sacred contracts: `docs/contracts.md`.

Individual briefs (ownership, phase tasks, agent prompt template):

- [Lik Hong](docs/dev-briefs/brief-lik-hong.md)
- [Ben](docs/dev-briefs/brief-ben.md)
- [Meng Hai](docs/dev-briefs/brief-meng-hai.md)
- [Lanson](docs/dev-briefs/brief-lanson.md)

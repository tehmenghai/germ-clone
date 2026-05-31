# Ben — Ingest & Corpus

You own the data layer. Everything the RAG engine retrieves comes through you.

## Your directories

```
source/backend/ingestion/     loaders, chunker, embedder
source/backend/repository/    pgvector queries, ORM models
source/backend/alembic/       migrations, Neon branch wiring
```

Stay out of `rag/`, `llm/`, `streaming/`, `app/`, and `source/frontend/`. If a task pulls you
toward those, stop and flag it.

## What you're building

**Phase 1 (start here):**
- SQLAlchemy models for the full schema: `documents`, `chunks`, `embeddings`, `users`,
  `conversations`, `messages`. See ADR-0005 for the identity design.
- `schemas/retrieval.py` — this is a sacred file (see below). Define it once, carefully.
- First Alembic migration. Point it at your Neon branch.
- Ingest CLI that seeds the 4 demo topics from a `seed/` directory.

**Phase 2:**
- Real loaders: transcript, markdown lesson, textbook, notebook → normalised docs.
- Chunking + `nomic-embed-text` embedding via Ollama → pgvector upsert.
- Clear-corpus and incremental upload endpoints.

Confirm the real corpus formats with Lanson before writing the loaders. Don't build against
assumptions you haven't verified.

## The sacred files

`schemas/retrieval.py` is yours to define — but once Meng Hai is building against it, any
change to field names or types needs a heads-up to him before the PR is opened. That's the
whole rule. It's not bureaucracy; it's not breaking his retrieval calls silently.

`schemas/events.py` is Meng Hai's. Don't touch it.

See `docs/contracts.md` for the full change discipline.

## Using a coding agent

Start every session with:

```
Read apps/germ-clone/CLAUDE.md, docs/plans/build-plan.md, and docs/contracts.md first.

I am Ben. My ownership areas are source/backend/ingestion/, repository/, and alembic/.
Do not touch files outside these directories without flagging it to me first.

Sacred files: schemas/retrieval.py is mine to define but any change after Meng Hai starts
building against it needs his explicit sign-off before merge. schemas/events.py belongs to
Meng Hai — do not edit it.

[Task]
```

## Coordination

**You are on the critical path. Meng Hai cannot build real retrieval until your pgvector store is live.**

| Action | When | Who |
|---|---|---|
| Publish `schemas/retrieval.py` as a committed stub | Day 1, Phase 1 | → Tell Meng Hai it's ready so he can build retrieval calls against it |
| Neon branch + Alembic migration merged | Phase 1 complete | → Tell Meng Hai the schema is stable so he can wire `repository/` calls |
| Real corpus seeded (4 demo topics in pgvector) | Phase 2 | → Tell Meng Hai retrieval is queryable so he can test the live pipeline |
| Confirm real corpus formats with Lanson | Before writing loaders | ← Chase Lanson — don't build loaders against assumed formats |
| Any change to `schemas/retrieval.py` after Meng Hai starts | Anytime | → Tell Meng Hai before opening the PR, not after |

**Chase:** If you need something from Lanson (corpus format confirmation) and haven't heard back within a day, ping him directly — your loader work is blocked on that answer.

---

## Stack reminders

- Python 3.12, FastAPI async, SQLAlchemy 2 async, Alembic, `uv`
- DB: Neon Postgres + pgvector. Your connection string goes in `source/backend/.env`.
  Each dev has their own Neon branch — don't share connection strings.
- Embeddings: `nomic-embed-text` via Ollama (768-dim). Ollama must be running locally.
- Linting: `ruff`. Run it before every commit.

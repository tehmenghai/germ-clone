# Ben — Phase 1 Complete Summary
**Date:** 2026-06-01  
**Author:** Ben  
**Status:** Phase 1 complete and validated

---

## What was completed today

Two parallel tracks were delivered:

### Track A — BEN0601 Standalone Pipeline (proof of concept)
A self-contained ingestion pipeline in `source/backend/ingestion_BEN0601/` that proves
the PDF → chunk → embed → retrieve loop works end-to-end before wiring into production.

### Track B — Production Backend Infrastructure
The real Phase 1 deliverables in `source/backend/` — SQLAlchemy models, Alembic migration,
async DB layer, pgvector retrieval, and nomic-embed-text embedder — all live in Neon now.

---

## Validation against `docs/dev-briefs/brief-ben.md`

| Brief Requirement | Status | Evidence |
|---|---|---|
| SQLAlchemy models: `documents`, `chunks`, `embeddings` | ✅ Done | `repository/models.py` |
| SQLAlchemy models: `users`, `conversations`, `messages` | ✅ Done | `repository/models.py` (ADR-0005) |
| `schemas/retrieval.py` — define once, carefully | ✅ Done | `schemas/retrieval.py` — unchanged contract |
| First Alembic migration | ✅ Done | `alembic/versions/001_initial_schema.py` — run, at `head` |
| Neon branch-per-dev | ✅ Done | Ben's branch live; teammates create their own |
| Ingest CLI seeding corpus | ✅ Partial | 2 of 4 demo topics seeded (3.3, 3.7) — full seed in Phase 2 |
| `schemas/retrieval.py` published as stub | ✅ Done | Already committed; Meng Hai can build against it |
| Do not touch `rag/`, `llm/`, `streaming/`, `app/`, `frontend/` | ✅ Confirmed | Zero files modified outside Ben's directories |
| `schemas/events.py` untouched | ✅ Confirmed | Meng Hai's file — not opened |

---

## Validation against ADR files

### ADR-0003 — Neon Postgres + pgvector, branch-per-dev ✅

| ADR Requirement | Status |
|---|---|
| Neon Postgres + pgvector as single data store | ✅ Live — all tables in Neon |
| Each dev gets an isolated Neon branch | ✅ Ben's branch: `ep-cool-leaf-aoad3iy1.c-2.ap-southeast-1.aws.neon.tech` |
| Connection strings are branch-specific; go in `.env` | ✅ `source/backend/.env` (gitignored) |
| Migrations managed by Alembic | ✅ `alembic upgrade head` — at revision `001` |
| PRs touching schema must include Alembic migration | ✅ First migration delivered |

### ADR-0004 — nomic-embed-text default embedding (768-dim) ✅

| ADR Requirement | Status |
|---|---|
| `nomic-embed-text` via Ollama as default embedding model | ✅ `ingestion/embedder.py` |
| 768-dim vectors stored in pgvector | ✅ `embeddings.vector = vector(768)` |
| Inference toggle controls LLM only, not embeddings | ✅ Embeddings always use Ollama regardless of LLM toggle |
| Changing embedding model requires migration + re-index | ✅ Documented in `embedder.py` and models |

> **Note on BEN0601:** The BEN0601 proof-of-concept used `gemini-embedding-2` for speed of
> prototyping. The production pipeline (`ingestion/embedder.py`) uses `nomic-embed-text`
> as required by ADR-0004. The `rag_chunks_BEN0601` table is separate and will be retired
> in Phase 2.

### ADR-0005 — Access & identity: passphrase + profiles + server-side persistence ✅

| ADR Requirement | Status |
|---|---|
| `users` table: `id, name, created_at` | ✅ In `models.py` + migration |
| `conversations` table: `id, user_id, topic, difficulty, started_at, updated_at` | ✅ With CHECK constraint on difficulty |
| `messages` table: `id, conversation_id, role, content_md, citations_json, created_at` | ✅ With CHECK constraint on role |
| `documents.created_by` FK → `users.id` | ✅ Nullable FK in `documents` table |
| Passphrase gate env var | ✅ `PASSPHRASE_REQUIRED` in `.env.example` |
| Forward compatibility for OAuth | ✅ Schema designed for `auth_provider` + `external_id` column addition without destructive migration |

---

## Complete file inventory — what was built

### Track A: `source/backend/ingestion_BEN0601/` (standalone proof of concept)

| File | Purpose |
|---|---|
| `extract_with_marker_BEN0601.py` | PDF → Markdown via PyMuPDF |
| `clean_marker_output_BEN0601.py` | Strip noise from extracted Markdown |
| `chunk_markdown_BEN0601.py` | Sliding-window chunking → JSONL |
| `embed_google_BEN0601.py` | Gemini `gemini-embedding-2` embedder (prototype only) |
| `upsert_pgvector_BEN0601.py` | Upsert chunks into `rag_chunks_BEN0601` |
| `run_pipeline_BEN0601.py` | Full pipeline orchestrator |
| `setup_database_BEN0601.py` | One-time table creation |
| `test_retrieval_BEN0601.py` | CLI retrieval test — top-5 from `rag_chunks_BEN0601` |
| `schema_BEN0601.sql` | SQL schema for `rag_chunks_BEN0601` |
| `ingestion_config_BEN0601.yaml` | All config (paths, chunk size, model, etc.) |

### Track B: Production `source/backend/` (what Meng Hai and others consume)

| File | Purpose |
|---|---|
| `repository/models.py` | All 6 SQLAlchemy 2 async ORM models |
| `repository/database.py` | Async engine + `get_db()` FastAPI dependency |
| `repository/queries.py` | `retrieve()` → `list[RetrievalResult]` (Meng Hai's entry point) |
| `repository/__init__.py` | Exports |
| `alembic/versions/001_initial_schema.py` | First migration — all 6 tables + pgvector + ivfflat index |
| `alembic/env.py` | Async migration environment — loads from `.env` |
| `alembic.ini` | Alembic config |
| `alembic/script.py.mako` | Migration file template |
| `ingestion/embedder.py` | `embed_text()` — nomic-embed-text via Ollama (production) |
| `ingestion/seed_from_chunks_BEN0601.py` | Phase 1 bridge seeder — BEN0601 JSONL → production tables |
| `.env.example` | Credential template (committed, safe) |
| `pyproject.toml` | ruff linting config (target py312) |
| `schemas/retrieval.py` | ✅ Already existed — unchanged sacred contract |
| `schemas/events.py` | ✅ Untouched — Meng Hai's file |

---

## Key information for teammates

### Database

| Property | Value |
|---|---|
| Provider | Neon PostgreSQL (serverless) |
| Region | AWS `ap-southeast-1` (Singapore) |
| Host | `ep-cool-leaf-aoad3iy1.c-2.ap-southeast-1.aws.neon.tech` |
| Database name | `neondb` |
| Migration revision | `001` (head) |
| pgvector extension | Installed ✅ |

**URL format for `source/backend/.env`:**
```
DATABASE_URL=postgresql+asyncpg://[user]:[password]@[host]/[dbname]?ssl=require
```

> ⚠️ **Critical:** asyncpg requires `ssl=require` — NOT `sslmode=require`. Using `sslmode`
> causes a `TypeError` at connection time.

> ⚠️ **Each dev must use their own Neon branch** (ADR-0003). Create a branch in the Neon
> console, run `alembic upgrade head` against it, then seed your own corpus. Do not share
> connection strings.

### Alembic commands (run from `source/backend/`)

```bash
# Always use python -m alembic, not the system alembic command
# (ensures the active venv's packages are used)

python -m alembic upgrade head    # apply all migrations
python -m alembic current         # check what revision is live
python -m alembic downgrade -1    # roll back one migration
python -m alembic revision --autogenerate -m "your message"  # generate new migration
```

### Embedding model

| Property | Value |
|---|---|
| Model | `nomic-embed-text` |
| Provider | Ollama (local) |
| Dimension | **768** |
| Ollama endpoint | `http://localhost:11434/api/embeddings` |
| Config env var | `EMBEDDING_MODEL=nomic-embed-text` in `.env` |

**Ollama must be running with the model pulled:**
```bash
ollama pull nomic-embed-text
```

> Changing the embedding model requires a new Alembic migration (to change the vector
> dimension if needed) AND a full corpus re-index. Never change the model silently.

### Production tables (created by migration `001`)

| Table | Rows (Ben's branch) | Purpose |
|---|---|---|
| `users` | 0 (ready) | Identity — profile-picker, no passwords |
| `conversations` | 0 (ready) | Per-user conversation history |
| `messages` | 0 (ready) | User + assistant turns per conversation |
| `documents` | 2 | Indexed PDFs (3.3, 3.7) |
| `chunks` | 58 | Text segments (1000 chars / 200 overlap) |
| `embeddings` | 58 | nomic-embed-text 768-dim vectors |

**Prototype-only table (will be retired in Phase 2):**
| Table | Rows | Purpose |
|---|---|---|
| `rag_chunks_ben0601` | 58 | BEN0601 proof-of-concept (Gemini embeds) |

### Indexes

| Index | Table | Type | Purpose |
|---|---|---|---|
| `embeddings_vector_idx` | `embeddings` | `ivfflat (vector_cosine_ops)` | Fast cosine similarity search |
| `embeddings_chunk_id_key` | `embeddings` | Unique B-tree | One embedding per chunk |
| `chunks_document_id_idx` | `chunks` | B-tree | Chunk lookup by document |
| `conversations_user_id_idx` | `conversations` | B-tree | Conversation lookup by user |
| `messages_conversation_id_idx` | `messages` | B-tree | Message lookup by conversation |
| `users_name_key` | `users` | Unique B-tree | Enforces unique profile names |

### Chunking parameters (BEN0601 corpus, tunable in Phase 2)

| Parameter | Value |
|---|---|
| Chunk size | 1000 characters |
| Overlap | 200 characters |
| Method | Sliding window, character-based |
| Token estimate | `len(text) // 4` |
| Source PDFs | `3.3 - Supervised Learning`, `3.7 - Neural Network and Deep Learning` |

### Retrieval contract (`schemas/retrieval.py`) — stable for Meng Hai

```python
class RetrievalResult(BaseModel):
    id: str        # chunk UUID
    mod: str       # module number e.g. "3.3"
    file: str      # source filename
    ts: str | None # page reference — None for now
    snip: str      # first 200 chars of chunk text
    score: float   # cosine similarity 0–1
    text: str      # full chunk text
```

**Meng Hai's entry point** (`repository/queries.py`):
```python
from repository.queries import retrieve
from repository.database import get_db

# In a FastAPI route or RAG node:
results: list[RetrievalResult] = await retrieve(session, query_vec, top_k=5)
```

### Linting — run before every commit

```bash
cd source/backend
ruff check .          # lint
ruff check --fix .    # auto-fix
```

Config is in `source/backend/pyproject.toml` — targets Python 3.12, enforces `E F I UP B C4` rules.

---

## What is NOT done yet (Phase 2)

| Item | Owner | Notes |
|---|---|---|
| Real loaders (transcript, markdown, textbook, notebook) | Ben | Waiting on Lanson to confirm corpus formats |
| Clear-corpus + incremental upload endpoints | Ben | Phase 2 |
| Full 4 demo topics seeded | Ben | Only 3.3 + 3.7 seeded; need 3.1, 3.2 PDFs |
| `seed/` directory with 4 demo topics | Ben | Phase 2 |
| `rag_chunks_BEN0601` retired | Ben | After Phase 2 loaders replace it |

---

## What each teammate needs to do

### Meng Hai (RAG engine)
1. Create your own Neon branch. Your `DATABASE_URL` goes in `source/backend/.env`.
2. Run `python -m alembic upgrade head` from `source/backend/` to create all 6 tables.
3. Pull nomic-embed-text: `ollama pull nomic-embed-text`.
4. Build retrieval calls against `repository/queries.retrieve()` — the `RetrievalResult` shape in `schemas/retrieval.py` is stable.
5. Do NOT change `schemas/retrieval.py` without notifying Ben first.

### Lik Hong (Frontend)
- No DB dependency in Phase 1. Continue wiring against `mock-stream.ts`.
- `ProfilePicker` UI maps to the `users` table — profile names must be unique.
- When ready to go live: profile ID from `localStorage['gc-profile']` goes in the `/ask` request.

### Lanson (Langflow + eval)
- Confirm real corpus formats (PDF / transcript / notebook) with Ben ASAP — Ben's Phase 2 loaders are blocked on this.
- The `documents` table has a `mod` field (e.g. `"3.3"`) — make sure corpus file naming is consistent with module numbers.

---

## Do NOT share

| Secret | Why |
|---|---|
| `DATABASE_URL` (full string) | Contains username + password for Ben's Neon branch |
| `source/backend/.env` | Contains the above |

Both are gitignored. Teammates create their own `.env` pointing to their own Neon branch.

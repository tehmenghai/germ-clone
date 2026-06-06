# PROGRESS_BEN0603 — Step Completion Log

Updated after each completed step.
Reference plan: `GRAND_PLAN_BEN0603.md`

---

## Status Key

```
[ ] not started
[~] in progress
[x] done
```

---

## Track A — Schema Migration and Contract Update

### A — Migration 002 (done)

| Step | Description | Status |
|---|---|---|
| A.1 | Add `source_type` to `RetrievalResult` | [x] |
| A.2.1 | Write Alembic migration 002 | [x] |
| A.2.2 | Update `models.py` | [x] |
| A.2.3 | Update `queries.py` | [x] |
| A.2.4 | Write `seed_from_chunks_BEN0602.py` | [x] |
| A.2.5 | Clear and re-seed Neon (migration 002) | [x] |
| A.2.6 | Verify canonical retrieval | [x] |

### A — Migration 003 (gap fill: page_number, token_estimate, created_at + richer RetrievalResult)

| Step | Description | Status |
|---|---|---|
| A.3.1 | Write Alembic migration 003 | [x] |
| A.3.2 | Update `models.py` (3 new columns) | [x] |
| A.3.3 | Update `queries.py` (ts logic + lesson_title/topic SELECT) | [x] |
| A.3.4 | Update `RetrievalResult` (add lesson_title, topic) | [x] |
| A.3.5 | Update seeder (populate page_number, token_estimate, created_at) | [x] |

### A — Git reconciliation

| Step | Description | Status |
|---|---|---|
| A.git.1 | Branch and commit all Track A changes (002 + 003) | [x] |
| A.git.2 | Checkout main, pull remote | [x] |
| A.git.3 | Merge branch — resolve `queries.py` conflict (keep canonical) | [ ] |
| A.git.4 | ruff check + commit merge | [ ] |

### A — Apply 003 to Neon + verify

| Step | Description | Status |
|---|---|---|
| A.db.1 | `alembic upgrade head` (migration 003) | [ ] |
| A.db.2 | Clear + re-seed with updated seeder | [ ] |
| A.db.3 | Verify canonical retrieval (ts shows page numbers) | [ ] |

### A — Meng Hai handoff

| Step | Description | Status |
|---|---|---|
| A.mh | Message Meng Hai final update | [ ] |

---

## Gate — Meng Hai Step 3 Signal

```
[ ] Waiting for Meng Hai to confirm Phase 2 retrieval wired + score weighting (1.2 pdf / 0.9 transcript) implemented
```

---

## Track B — Transcript Ingestion Pipeline

| Step | Description | Status |
|---|---|---|
| B.pre | Run 3.1 PDF through BEN0602 pipeline + upsert 3.1 slides to canonical | [x] |
| B.1 | Write `AGENT_SKILL_TRANSCRIPT_BEN0603.md` | [x] |
| B.2 | Build `parse_vtt_BEN0603.py` | [x] |
| B.2t | Test parse output — manual inspection | [x] |
| B.3 | Build `llm_chunk_transcript_BEN0603.py` | [x] |
| B.run | Final pipeline run — LLM chunk + upsert 3.1 transcript to canonical | [x] |
| B.verify | Retrieval verification — confirm transcript chunks returned with correct fields | [x] |

---

## Completion Log

Each entry added when a step is marked done.

### A.3.5 — done
- File updated: `source/backend/ingestion/seed_from_chunks_BEN0602.py`
  - INSERT_CHUNK now includes `page_number`, `token_estimate`
  - ON CONFLICT DO UPDATE covers both new fields
  - `chunk.get("page_number")` → NULL for transcripts, integer for slides
  - `chunk.get("token_estimate")` → from BEN0602 JSONL

### A.3.4 — done
- File updated: `source/backend/schemas/retrieval.py`
  - Added `lesson_title: str | None = None`
  - Added `topic: str | None = None`
  - Meng Hai consented — additive, non-breaking

### A.3.3 — done
- File updated: `source/backend/repository/queries.py`
  - `ts`: `COALESCE(metadata->>'timestamp_start', page_number::text, NULL)` — slides get page number, transcripts get timestamp
  - Added `c.lesson_title`, `c.topic` to SELECT
  - Added `lesson_title=row.lesson_title`, `topic=row.topic` to RetrievalResult constructor

### A.3.2 — done
- File updated: `source/backend/repository/models.py`
  - Added `page_number: Mapped[int | None]`
  - Added `token_estimate: Mapped[int | None]`
  - Added `created_at: Mapped[datetime]` with server_default now()

### A.3.1 — done
- File created: `source/backend/alembic/versions/003_add_page_number_token_estimate_created_at.py`
  - Adds `page_number INTEGER`, `token_estimate INTEGER`, `created_at TIMESTAMPTZ`
  - `down_revision = "002"` — chains from 002
  - ruff: 0 findings

### A.3 — done
Message drafted below. Send to Meng Hai on Slack/Discord.

---
**@MengHai | DS4 — Steps A.1 and A.2 are done.**

**Changes shipped:**
- `schemas/retrieval.py` — added `source_type: str = "pdf"` to `RetrievalResult`
- `repository/queries.py` — SELECT now includes `c.source_type` and derives `ts` from `c.metadata->>'timestamp_start'` (NULL for slides, timestamp string for transcripts once ingested)
- Alembic migration 002 applied to Neon — `chunks` table now has: `source_type`, `lesson_title`, `topic`, `clean_markdown`, `retrieval_keywords`, `sample_questions`, `metadata JSONB`
- Canonical tables re-seeded from all 11 lesson PDFs (203 chunks) using `gemini-embedding-2` (768-dim). Previous nomic embeddings cleared.

**Output monitoring — canonical retrieval test (3 queries):**

Query 1: "What is the law of large numbers?"
→ #1 mod=3.1  source_type=pdf  topic=Law of Large Numbers  score=0.8285  ts=None ✅

Query 2: "What are probability distributions?"
→ #1 mod=3.9  source_type=pdf  topic=N-grams  score=0.6481 (cross-module semantic overlap — scores are coherent across top 5)

Query 3: "What is overfitting?"
→ #1 mod=3.3  source_type=pdf  topic=Variance  score=0.7633 ✅
→ Top 5 all overfitting / bias-variance / regularization topics ✅

**Corpus:** 11 documents (all modules 3.1–3.10), 203 chunks, 203 embeddings. Migration version: 002.

**Embedding note for your Phase 2 wiring:**
Production standard is `gemini-embedding-2` (768-dim). Your `embedder.py` currently uses `nomic-embed-text`. When you wire Phase 2 retrieval, the query embedder must use the same model as the stored vectors — via the configurable embedding setting you planned. Also note: `SET ivfflat.probes = 100` is needed before cosine queries or small corpora return too few results (default probes=1 with 100 lists only searches 1% of the index).

Ready for your Step 3 signal when Phase 2 retrieval and score weighting (1.2 × pdf / 0.9 × transcript) are wired.
---

### A.2.6 — done
- File updated: `source/backend/ingestion/dev_retrieve_BEN0601.py`
  - Added `cmd_canonical_search()` — embeds with Gemini, displays source_type / lesson_title / topic / ts / score / id / snip
  - Added `--canonical` flag to `search` subcommand
  - Added `SET ivfflat.probes = 100` before canonical query (default probes=1 with lists=100 was returning 1 result)
- Canonical corpus: 11 documents, 203 chunks, 203 embeddings — all modules 3.1–3.10 present
- Retrieval results (3 verification queries):
  - "What is the law of large numbers?" → #1 mod=3.1 topic=Law of Large Numbers score=0.8285 ✅
  - "What are probability distributions?" → #1 mod=3.9 topic=N-grams score=0.6481 (lower but scores across all 5 are coherent)
  - "What is overfitting?" → #1 mod=3.3 topic=Variance score=0.7633, top 5 all overfitting/bias-variance/regularization ✅
- source_type=pdf for all results ✅ | ts=None for all slides ✅

### A.2.5 — done
- Migration 002 applied: `alembic upgrade head` → `001 → 002` confirmed
- TRUNCATE embeddings, chunks, documents CASCADE — old nomic embeddings cleared
- Seeder ran: 203/203 chunks seeded, 0 errors, 11 documents upserted
- Confirmed: `SELECT COUNT(*) FROM embeddings` → 203; `alembic_version` → 002

### A.2.4 — done
- File created: `source/backend/ingestion/seed_from_chunks_BEN0602.py`
- Accepts optional JSONL path argument — works for BEN0602 slides and BEN0603 transcripts
- Derives deterministic UUIDs from chunk_id via uuid5 — re-runs are fully idempotent
- Embeds `chunk_text` (combined field) using Gemini `gemini-embedding-2`
- Populates all 7 new `chunks` columns from JSONL fields
- `derive_mod()` extracts module number from filename prefix
- ruff: 0 findings

### A.2.3 — done
- File: `source/backend/repository/queries.py`
  - `ts`: replaced `NULL::text` with `COALESCE(c.metadata->>'timestamp_start', NULL)` — slides get NULL, transcripts get their timestamp
  - Added `c.source_type AS source_type` to SELECT
  - Added `source_type=row.source_type` to `RetrievalResult(...)` constructor
- File: `source/backend/schemas/retrieval.py`
  - `source_type` made non-optional: `source_type: str = "pdf"`
- ruff: 0 findings on both files

### A.2.2 — done
- File: `source/backend/repository/models.py`
- Added `ARRAY` to postgresql dialect import
- Added 7 new columns to `Chunk` class: `source_type`, `lesson_title`, `topic`, `clean_markdown`, `retrieval_keywords`, `sample_questions`, `metadata`
- ruff: 0 findings

### A.2.1 — done
- File created: `source/backend/alembic/versions/002_enrich_chunks_for_rag.py`
- Adds 7 columns to `chunks`: `source_type`, `lesson_title`, `topic`, `clean_markdown`, `retrieval_keywords`, `sample_questions`, `metadata`
- Adds index `chunks_source_type_idx`
- `down_revision = "001"` — chains correctly from migration 001
- ruff: 0 findings

### A.1 — done
- File: `source/backend/schemas/retrieval.py`
- Added `source_type: str | None = None` to `RetrievalResult`
- Field is Optional until A.2.3 wires the SQL SELECT
- ruff: 0 findings

---


# ingestion_BEN0601

Ben's ingestion pipeline for the germ//clone RAG capstone project.

## What this folder does

Converts PDFs and transcripts into vector-searchable chunks stored in Neon PostgreSQL + pgvector.

```
PDF / transcript
  → Marker extraction     (extract_with_marker_BEN0601.py)
  → Cleaned Markdown      (clean_marker_output_BEN0601.py)
  → Chunks JSONL          (chunk_markdown_BEN0601.py)
  → Google Gemini embeds  (embed_google_BEN0601.py)
  → Neon pgvector upsert  (upsert_pgvector_BEN0601.py)
  → Retrieval test        (test_retrieval_BEN0601.py)
```

## Location in the project

```
source/backend/ingestion_BEN0601/   ← this folder (pipeline scripts)
data_BEN0601/                       ← project root (input/output data)
sandbox/ben/docs_BEN0601/           ← team handoff doc
```

All scripts are run from the **project root**. `data_BEN0601/` paths resolve correctly from there.

## Data directories

```
data_BEN0601/
  raw_BEN0601/            Place input PDFs here
  marker_output_BEN0601/  Marker extraction output (one folder per source PDF)
  processed_BEN0601/      Cleaned Markdown
  chunks_BEN0601/         chunks_BEN0601.jsonl + sample_chunks_BEN0601.jsonl
  logs_BEN0601/           Per-run logs
```

## Setup

```bash
# 1. Install dependencies (run from project root)
pip install -r source/backend/ingestion_BEN0601/requirements_BEN0601.txt

# 2. The .env_BEN0601 is already in place — confirm DATABASE_URL and GEMINI_API_KEY are filled in

# 3. Create the Neon table
python source/backend/ingestion_BEN0601/setup_database_BEN0601.py

# 4. Place one PDF in data_BEN0601/raw_BEN0601/ then run the full pipeline
python source/backend/ingestion_BEN0601/run_pipeline_BEN0601.py

# 5. Test retrieval
python source/backend/ingestion_BEN0601/test_retrieval_BEN0601.py "What is overfitting?"
```

## Embedding model

Google AI Studio / Gemini — `gemini-embedding-2`, output dimensionality 768.
The pgvector column is dimensioned to match: `vector(768)`.

## Team handoff

See `sandbox/ben/docs_BEN0601/HANDOFF_FOR_TEAM_BEN0601.md` once Phase 06 is complete.
Teammates consume the `rag_chunks_BEN0601` table in Neon — they do not depend on
Marker internals, raw PDFs, or Ben's local data folders.

## Ownership

This pipeline is owned by Ben (`source/backend/ingestion/`, `repository/`, `alembic/`).
Do not modify without co-ordinating with Ben.
See `docs/contracts.md` for the sacred-file change discipline.

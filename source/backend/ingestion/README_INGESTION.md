# ingestion

Ben's ingestion pipeline for the germ//clone RAG capstone project.

## What this folder does

Converts PDFs and lecture transcripts into vector-searchable chunks stored in the
canonical `documents` / `chunks` / `embeddings` tables (Neon Postgres + pgvector,
Alembic migrations 001–003).

There are two chunking strategies, sharing the extract/embed/seed steps:

```
PDF
  → Marker extraction     (extract_with_marker.py)
  → Cleaned Markdown      (clean_marker_output.py)
  → Chunks JSONL          (chunk_markdown.py)                    [basic regex chunking]
  → Canonical tables      (seed_from_chunks.py)

PDF (Markdown from the step above)
  → LLM semantic chunks   (llm_clean_chunk.py)                   [Gemini concept chunking]
  → Canonical tables      (seed_from_llm_chunks.py)

Transcript (.vtt)
  → Parsed segments       (parse_vtt.py)
  → LLM semantic chunks   (llm_chunk_transcript.py)               [Gemini concept chunking]
  → Canonical tables      (seed_from_llm_chunks.py)
```

`embed_google.py` (Gemini) and `ingestion/embedder.py` (the ollama/google dispatcher
used at request time) are shared by all three chains.

## Location in the project

```
source/backend/ingestion/         ← this folder (pipeline scripts)
data_01_raw/                       ← project root — raw PDFs/transcripts, basic-chunk pipeline output
data_02_llm_chunks/                ← project root — LLM-semantic slide chunks
data_03_transcripts/               ← project root — parsed VTT + LLM-semantic transcript chunks
sandbox/ben/docs_02_llm_chunks/    ← AGENT_SKILL prompt for the slide LLM-chunking pipeline
sandbox/ben/docs_03_transcripts/   ← module configs + AGENT_SKILL prompts for the transcript pipeline
```

All scripts are run from the **project root**; `data_0N_*/` paths resolve correctly
from there.

## Setup

```bash
# 1. Install dependencies (run from project root)
pip install -r source/backend/ingestion/requirements.txt

# 2. Fill in source/backend/.env — DATABASE_URL, GEMINI_API_KEY, OLLAMA_URL as needed.
#    (Not a separate ingestion-only env file — this is the same .env every backend
#    script reads. Copy source/backend/.env.example if you don't have one yet.)

# 3. Place one PDF in data_01_raw/raw/, then run the basic pipeline:
python source/backend/ingestion/run_pipeline.py

# 4. Verify retrieval against the canonical tables:
python source/backend/ingestion/dev_retrieve.py search "What is overfitting?"
```

For the LLM-semantic chunking path (better chunk quality, used for the live
transcript pipeline), run `llm_clean_chunk.py` or
`llm_chunk_transcript.py` directly — see each script's docstring.

## Embedding model

Local dev default is Ollama `nomic-embed-text` (ADR-0004), 768-dim. `embed_google.py`
provides the Gemini `gemini-embedding-2` alternative (also 768-dim) used by the
deployed instance (ADR-0007) and by the ingestion scripts above, which call Gemini
directly for chunk embedding rather than going through the runtime dispatcher.
The pgvector column is dimensioned to match: `vector(768)`.

## Dev tools

`dev_retrieve.py` — local chunk inspector and retrieval tester (stats / browse / search),
queries the live canonical tables.

## Ownership

This pipeline is owned by Ben (`source/backend/ingestion/`, `repository/`, `alembic/`).
Do not modify without co-ordinating with Ben. See `docs/contracts.md` for the
sacred-file change discipline.

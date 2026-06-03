# Ben Ingestion Handoff — BEN0601

**Date:** 2026-06-01  
**Owner:** Ben  
**Status:** Phase 06 complete — retrieval tested and working

---

## What is ready

| Component | Status |
|---|---|
| PDF extraction (PyMuPDF) | Done |
| Markdown cleaning | Done |
| Chunking (1000 chars / 200 overlap) | Done |
| Google Gemini embeddings (`gemini-embedding-2`, 768-dim) | Done |
| Neon pgvector upsert | Done — 58 chunks live |
| Retrieval test | Done — top-5 cosine similarity working |

---

## What teammates should use

### Table

```
rag_chunks_BEN0601
```

Lives in Ben's Neon branch. Ask Ben for the connection string if you need direct access — do not share `.env_BEN0601`.

### Query format

```python
# Query input
{
  "query": "What is overfitting?",
  "top_k": 5
}
```

### Expected retrieval fields

| Field | Type | Notes |
|---|---|---|
| `chunk_id` | TEXT | Unique ID — use for deduplication |
| `source_file` | TEXT | Original PDF filename |
| `page_start` | INTEGER | NULL for now — will be added in Phase 2 |
| `page_end` | INTEGER | NULL for now |
| `section_title` | TEXT | Nearest heading at chunk position |
| `chunk_text` | TEXT | Full chunk content |
| `similarity` | FLOAT | Cosine similarity 0–1, higher = more relevant |

### SQL retrieval pattern (Meng Hai — use this in `repository/`)

```sql
SELECT
    chunk_id,
    source_file,
    page_start,
    page_end,
    section_title,
    chunk_text,
    1 - (embedding <=> %s::vector) AS similarity
FROM rag_chunks_BEN0601
ORDER BY embedding <=> %s::vector
LIMIT %s;
```

Pass the query embedding vector twice, then `top_k` as the third parameter.

### Python retrieval snippet

```python
# Embed the query first
from embed_google_BEN0601 import embed_query
vec = embed_query("What is overfitting?")

# Then query Neon
cur.execute(SQL, (vec, vec, 5))
results = cur.fetchall()
```

---

## Corpus loaded

| Source PDF | Chunks |
|---|---|
| 3.3 - Supervised Learning 2_annoations.pdf | 29 |
| 3.7 - Neural Network and Deep Learning_annotated.pdf | 29 |
| **Total** | **58** |

---

## What teammates should NOT depend on

- Raw PDFs in `data_BEN0601/raw_BEN0601/`
- Marker/PyMuPDF extraction internals
- Ben's local `data_BEN0601/` folder structure
- Ben's `.env_BEN0601` file (contains real secrets)
- `embed_google_BEN0601.py` directly — the production pipeline will use `nomic-embed-text` via Ollama per ADR-0004

---

## Schema contract (`schemas/retrieval.py`)

The `RetrievalResult` schema (Ben's sacred file) maps directly to retrieval output:

```python
class RetrievalResult(BaseModel):
    id: str       # chunk_id
    mod: str      # module number — derived from source_file
    file: str     # source_file
    ts: str|None  # page ref — None for now
    snip: str     # first 200 chars of chunk_text
    score: float  # cosine similarity
    text: str     # full chunk_text
```

Meng Hai: this contract is stable. Notify Ben before any change.

---

## What will be tuned in Phase 2

- Chunk size and overlap (currently 1000 / 200 chars)
- Page number tracking per chunk
- Section title extraction quality (slides have inconsistent heading sizes)
- Switch embedding model to `nomic-embed-text` via Ollama (ADR-0004)
- Re-index with full corpus (all 10 modules)
- Migrate from `rag_chunks_BEN0601` table to the production schema (`chunks` + `embeddings`)
- Alembic migrations wired to Neon branch-per-dev

---

## Running the pipeline yourself

```bash
# Full pipeline (from project root)
python source/backend/ingestion_BEN0601/run_pipeline_BEN0601.py

# Retrieval test only
python source/backend/ingestion_BEN0601/test_retrieval_BEN0601.py "What is overfitting?"
python source/backend/ingestion_BEN0601/test_retrieval_BEN0601.py "Explain gradient descent"
python source/backend/ingestion_BEN0601/test_retrieval_BEN0601.py "What is a neural network?"
```

Requires: `GEMINI_API_KEY` and `DATABASE_URL` in `source/backend/ingestion_BEN0601/.env_BEN0601`.

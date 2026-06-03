-- schema_BEN0602.sql
-- Enhanced RAG chunks table for the BEN0602 pipeline.
--
-- Key additions over rag_chunks_BEN0601:
--   lesson_title       — extracted by LLM, used in retrieval display
--   topic              — concept name, e.g. "One-Hot Encoding"
--   page_number        — source slide page
--   clean_markdown     — LLM-rewritten teaching notes (display only)
--   retrieval_keywords — keyword list embedded alongside content
--   sample_questions   — expected queries embedded alongside content
--
-- chunk_text stores clean_markdown + keywords + questions combined — this is
-- the field that gets embedded. Richer signal → better recall.
--
-- Run via setup_database_BEN0602.py or paste directly in the Neon SQL editor.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_chunks_BEN0602 (
    chunk_id           TEXT        PRIMARY KEY,
    source_file        TEXT        NOT NULL,
    source_type        TEXT        NOT NULL DEFAULT 'pdf',
    lesson_title       TEXT,
    topic              TEXT,
    page_number        INTEGER,
    chunk_text         TEXT        NOT NULL,  -- embedded field: clean_markdown + keywords + questions
    clean_markdown     TEXT,                  -- display-only clean content
    retrieval_keywords TEXT[],
    sample_questions   TEXT[],
    token_estimate     INTEGER,
    embedding          VECTOR(768),
    metadata           JSONB,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IVFFlat index — only create once the corpus has enough rows.
-- Rule of thumb: lists ≈ sqrt(row_count), minimum rows >= lists.
-- For < 500 rows, sequential scan is fast enough; skip this index.
-- Uncomment and tune when the full corpus is loaded:
--
-- CREATE INDEX IF NOT EXISTS rag_chunks_BEN0602_embedding_idx
--     ON rag_chunks_BEN0602
--     USING ivfflat (embedding vector_cosine_ops)
--     WITH (lists = 100);  -- tune: lists = sqrt(expected_rows)

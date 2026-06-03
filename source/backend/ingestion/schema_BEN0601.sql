-- Ben's RAG ingestion schema for Neon PostgreSQL + pgvector
-- Table: rag_chunks_BEN0601
-- Embedding dimension: 768 (gemini-embedding-2)
-- If changing dimension later, update both this file and ingestion_config_BEN0601.yaml

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_chunks_BEN0601 (
    chunk_id        TEXT PRIMARY KEY,
    source_file     TEXT NOT NULL,
    source_type     TEXT DEFAULT 'pdf',
    page_start      INTEGER,
    page_end        INTEGER,
    section_title   TEXT,
    chunk_index     INTEGER NOT NULL,
    chunk_text      TEXT NOT NULL,
    token_estimate  INTEGER,
    embedding       vector(768),
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ivfflat index for cosine similarity search
-- lists=100 is a reasonable default for a small-to-medium corpus;
-- tune upward (e.g. lists=200) if row count exceeds ~1M.
CREATE INDEX IF NOT EXISTS rag_chunks_BEN0601_embedding_idx
    ON rag_chunks_BEN0601
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS rag_chunks_BEN0601_source_file_idx
    ON rag_chunks_BEN0601 (source_file);

CREATE INDEX IF NOT EXISTS rag_chunks_BEN0601_metadata_idx
    ON rag_chunks_BEN0601
    USING GIN (metadata);

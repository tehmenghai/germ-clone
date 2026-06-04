"""
upsert_pgvector_BEN0602.py

Reads chunks_BEN0602.jsonl, generates Gemini embeddings for each chunk's
chunk_text (clean_markdown + keywords + questions), and upserts into
rag_chunks_BEN0602 in Neon PostgreSQL.

The richer chunk_text — compared to BEN0601's raw noisy text — means the
embeddings capture both the concept content and the expected query patterns,
improving retrieval precision and recall.

Safe to re-run — ON CONFLICT (chunk_id) DO UPDATE means duplicates are
updated rather than re-inserted.

Usage (from project root):
    python source/backend/ingestion/upsert_pgvector_BEN0602.py
"""

import json
import os
import sys
import time
from pathlib import Path

import psycopg
import yaml
from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from tqdm import tqdm

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent

ENV_FILE = PROJECT_ROOT / "source/backend/ingestion/.env_BEN0601"
CHUNKS_PATH = PROJECT_ROOT / "data_BEN0602/chunks_BEN0602/chunks_BEN0602.jsonl"

BEN0601_DIR = PROJECT_ROOT / "source/backend/ingestion"
sys.path.insert(0, str(BEN0601_DIR))

LLM_MODEL = "gemini-2.5-flash"
EMBEDDING_DIM = 768

UPSERT_SQL = """
INSERT INTO rag_chunks_BEN0602 (
    chunk_id, source_file, source_type,
    lesson_title, topic, page_number,
    chunk_text, clean_markdown,
    retrieval_keywords, sample_questions,
    token_estimate, embedding, metadata
)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (chunk_id) DO UPDATE SET
    lesson_title       = EXCLUDED.lesson_title,
    topic              = EXCLUDED.topic,
    page_number        = EXCLUDED.page_number,
    chunk_text         = EXCLUDED.chunk_text,
    clean_markdown     = EXCLUDED.clean_markdown,
    retrieval_keywords = EXCLUDED.retrieval_keywords,
    sample_questions   = EXCLUDED.sample_questions,
    token_estimate     = EXCLUDED.token_estimate,
    embedding          = EXCLUDED.embedding,
    metadata           = EXCLUDED.metadata;
"""


def load_chunks(path: Path) -> list[dict]:
    chunks = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                chunks.append(json.loads(line))
    return chunks


def main() -> None:
    if not ENV_FILE.exists():
        print(f"[ERROR] .env_BEN0601 not found at {ENV_FILE}")
        sys.exit(1)
    load_dotenv(ENV_FILE)

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("[ERROR] DATABASE_URL not set in .env_BEN0601")
        sys.exit(1)

    embedding_provider = os.getenv("EMBEDDING_PROVIDER", "google")
    embedding_model = os.getenv("EMBEDDING_MODEL", "gemini-embedding-2")

    if embedding_provider == "google" and not os.getenv("GEMINI_API_KEY"):
        print("[ERROR] GEMINI_API_KEY not set in .env_BEN0601")
        sys.exit(1)

    if not CHUNKS_PATH.exists():
        print(f"[ERROR] {CHUNKS_PATH.relative_to(PROJECT_ROOT)} not found.")
        print("        Run llm_clean_chunk_BEN0602.py first.")
        sys.exit(1)

    # Build the embedding function based on selected provider
    if embedding_provider == "google":
        from embed_google_BEN0601 import embed_document as _embed_fn
        def embed_chunk(text: str) -> list[float]:
            return _embed_fn(text, model=embedding_model)
    else:
        import asyncio
        from embedder import embed_text as _async_embed
        def embed_chunk(text: str) -> list[float]:
            return asyncio.run(_async_embed(text))

    chunks = load_chunks(CHUNKS_PATH)
    print(f"[INFO]  Chunks loaded   : {len(chunks)}")
    print(f"[INFO]  Embedding model : {embedding_model}  (provider: {embedding_provider}, dim {EMBEDDING_DIM})")

    print("[INFO]  Connecting to Neon PostgreSQL...")
    try:
        conn = psycopg.connect(database_url)
        register_vector(conn)
    except psycopg.OperationalError as exc:
        print(f"[ERROR] Connection failed:\n        {exc}")
        print("        Check DATABASE_URL and that your Neon branch is active.")
        sys.exit(1)

    print(f"[INFO]  Upserting {len(chunks)} chunks...\n")

    inserted = errors = 0

    with conn.cursor() as cur:
        for chunk in tqdm(chunks, desc="Embedding + upsert", unit="chunk"):
            try:
                vec = embed_chunk(chunk["chunk_text"])

                cur.execute(
                    UPSERT_SQL,
                    (
                        chunk["chunk_id"],
                        chunk["source_file"],
                        chunk["source_type"],
                        chunk.get("lesson_title") or None,
                        chunk.get("topic") or None,
                        chunk.get("page_number") or None,
                        chunk["chunk_text"],
                        chunk.get("clean_markdown") or None,
                        chunk.get("retrieval_keywords") or [],
                        chunk.get("sample_questions") or [],
                        chunk["token_estimate"],
                        vec,
                        json.dumps(chunk.get("metadata", {})),
                    ),
                )
                conn.commit()
                inserted += 1
                time.sleep(0.05)  # stay under Gemini embedding rate limit

            except KeyboardInterrupt:
                print("\n[WARN]  Interrupted — committing progress so far.")
                conn.rollback()
                break
            except Exception as exc:
                conn.rollback()
                errors += 1
                tqdm.write(f"[WARN]  Skipped {chunk['chunk_id']}: {exc}")

    conn.close()

    print(f"\n[OK]    Upserted : {inserted}")
    if errors:
        print(f"[WARN]  Errors   : {errors}  (re-run to retry — upsert is idempotent)")
    if inserted < 5:
        print("[WARN]  Fewer than 5 chunks inserted — check JSONL and connection.")
    else:
        print("\n[NEXT]  Run test_retrieval_BEN0602.py to verify retrieval quality.")


if __name__ == "__main__":
    main()

"""
seed_from_chunks_BEN0602.py

Seeds the canonical production schema (documents / chunks / embeddings) from a
BEN0602-schema JSONL file using Gemini gemini-embedding-2 (768-dim).

Accepts any JSONL that follows the BEN0602 chunk schema — works for both
BEN0602 slide chunks and BEN0603 transcript chunks.

Canonical chunk UUIDs are derived deterministically from chunk_id strings via
uuid5, so re-runs are idempotent and the same source chunk always maps to the
same canonical row.

Usage (from project root):
    # Default — seed BEN0602 slide chunks:
    python source/backend/ingestion/seed_from_chunks_BEN0602.py

    # Seed a specific JSONL (e.g. BEN0603 transcript chunks):
    python source/backend/ingestion/seed_from_chunks_BEN0602.py \\
        data_BEN0603/chunks_transcript_BEN0603.jsonl
"""

import json
import os
import re
import sys
import time
import uuid
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from tqdm import tqdm

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent

ENV_FILE = PROJECT_ROOT / "source/backend/ingestion/.env_BEN0601"

DEFAULT_CHUNKS_PATH = PROJECT_ROOT / "data_BEN0602/chunks_BEN0602/chunks_BEN0602.jsonl"

# Shared embedding function from BEN0601 — same model, same API key
sys.path.insert(0, str(SCRIPT_DIR))
from embed_google_BEN0601 import embed_document  # noqa: E402

EMBEDDING_MODEL = "gemini-embedding-2"
EMBEDDING_DIM = 768

# Deterministic UUID namespace — fixed so the same chunk_id always maps to the same UUID.
_UUID_NAMESPACE = uuid.UUID("a1b2c3d4-e5f6-7890-abcd-ef1234567890")


# ---------------------------------------------------------------------------
# SQL
# ---------------------------------------------------------------------------

INSERT_DOC = """
    INSERT INTO documents (id, mod, filename, created_by, indexed_at)
    VALUES (%s, %s, %s, NULL, now())
    ON CONFLICT DO NOTHING
"""

INSERT_CHUNK = """
    INSERT INTO chunks (
        id, document_id, text, chunk_index,
        source_type, lesson_title, topic, clean_markdown,
        retrieval_keywords, sample_questions, metadata,
        page_number, token_estimate
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (id) DO UPDATE SET
        text               = EXCLUDED.text,
        source_type        = EXCLUDED.source_type,
        lesson_title       = EXCLUDED.lesson_title,
        topic              = EXCLUDED.topic,
        clean_markdown     = EXCLUDED.clean_markdown,
        retrieval_keywords = EXCLUDED.retrieval_keywords,
        sample_questions   = EXCLUDED.sample_questions,
        metadata           = EXCLUDED.metadata,
        page_number        = EXCLUDED.page_number,
        token_estimate     = EXCLUDED.token_estimate
"""

INSERT_EMBEDDING = """
    INSERT INTO embeddings (id, chunk_id, vector)
    VALUES (%s, %s, %s::vector)
    ON CONFLICT (chunk_id) DO UPDATE SET vector = EXCLUDED.vector
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def derive_mod(source_file: str) -> str:
    """Extract module number from filename, e.g. '3.3 - Supervised...' → '3.3'."""
    m = re.match(r"^(\d+\.\d+)", source_file.strip())
    return m.group(1) if m else ""


def chunk_uuid(chunk_id: str) -> uuid.UUID:
    """Deterministic UUID from BEN0602 text chunk_id — same input always → same UUID."""
    return uuid.uuid5(_UUID_NAMESPACE, chunk_id)


def load_chunks(path: Path) -> list[dict]:
    chunks = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                chunks.append(json.loads(line))
    return chunks


def vec_str(vec: list[float]) -> str:
    return "[" + ",".join(str(v) for v in vec) + "]"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    chunks_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CHUNKS_PATH
    if not chunks_path.is_absolute():
        chunks_path = PROJECT_ROOT / chunks_path

    if not ENV_FILE.exists():
        print(f"[ERROR] .env_BEN0601 not found at {ENV_FILE}")
        sys.exit(1)
    load_dotenv(ENV_FILE)

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("[ERROR] DATABASE_URL not set in .env_BEN0601")
        sys.exit(1)

    if not os.getenv("GEMINI_API_KEY"):
        print("[ERROR] GEMINI_API_KEY not set in .env_BEN0601")
        sys.exit(1)

    if not chunks_path.exists():
        print(f"[ERROR] Chunks file not found: {chunks_path}")
        sys.exit(1)

    chunks = load_chunks(chunks_path)
    print(f"[INFO]  Chunks loaded   : {len(chunks)}")
    print(f"[INFO]  Source file     : {chunks_path.relative_to(PROJECT_ROOT)}")
    print(f"[INFO]  Embedding model : {EMBEDDING_MODEL}  (dim {EMBEDDING_DIM})")

    print("[INFO]  Connecting to Neon PostgreSQL...")
    try:
        conn = psycopg.connect(database_url)
        register_vector(conn)
    except psycopg.OperationalError as exc:
        print(f"[ERROR] Connection failed:\n        {exc}")
        sys.exit(1)

    # Build document map: source_file → canonical document UUID
    doc_map: dict[str, uuid.UUID] = {}
    with conn.cursor() as cur:
        for chunk in chunks:
            sf = chunk["source_file"]
            if sf not in doc_map:
                doc_id = uuid.uuid5(_UUID_NAMESPACE, f"doc::{sf}")
                doc_map[sf] = doc_id
                cur.execute(INSERT_DOC, (doc_id, derive_mod(sf), sf))
        conn.commit()

    print(f"[INFO]  Documents upserted: {len(doc_map)}")
    print(f"[INFO]  Seeding {len(chunks)} chunks with Gemini embeddings...\n")

    # Track chunk_index per document
    chunk_index_counter: dict[str, int] = dict.fromkeys(doc_map, 0)

    ok = errors = 0
    with conn.cursor() as cur:
        for chunk in tqdm(chunks, desc="Embed + seed", unit="chunk"):
            try:
                cid = chunk_uuid(chunk["chunk_id"])
                doc_id = doc_map[chunk["source_file"]]
                idx = chunk_index_counter[chunk["source_file"]]
                chunk_index_counter[chunk["source_file"]] += 1

                # Insert chunk with all enrichment fields
                cur.execute(
                    INSERT_CHUNK,
                    (
                        cid,
                        doc_id,
                        chunk["chunk_text"],        # combined embedding field
                        idx,
                        chunk.get("source_type", "pdf"),
                        chunk.get("lesson_title"),
                        chunk.get("topic"),
                        chunk.get("clean_markdown"),
                        chunk.get("retrieval_keywords") or [],
                        chunk.get("sample_questions") or [],
                        json.dumps(chunk.get("metadata") or {}),
                        chunk.get("page_number"),   # None for transcripts
                        chunk.get("token_estimate"),
                    ),
                )

                # Embed chunk_text (combined field) with Gemini
                vec = embed_document(chunk["chunk_text"], model=EMBEDDING_MODEL)
                cur.execute(
                    INSERT_EMBEDDING,
                    (uuid.uuid5(_UUID_NAMESPACE, f"emb::{chunk['chunk_id']}"), cid, vec_str(vec)),
                )

                conn.commit()
                ok += 1
                time.sleep(0.05)  # stay under Gemini embedding rate limit

            except KeyboardInterrupt:
                print("\n[WARN]  Interrupted — committing progress so far.")
                conn.rollback()
                break
            except Exception as exc:
                conn.rollback()
                errors += 1
                tqdm.write(f"[WARN]  Skipped {chunk.get('chunk_id', '?')}: {exc}")

    conn.close()

    print(f"\n[OK]    Seeded  : {ok}")
    if errors:
        print(f"[WARN]  Errors  : {errors}  (re-run to retry — upsert is idempotent)")
    if ok < 5:
        print("[WARN]  Fewer than 5 chunks seeded — check JSONL path and DB connection.")
    else:
        print("\n[NEXT]  Run dev_retrieve_BEN0601.py --canonical to verify retrieval.")


if __name__ == "__main__":
    main()

"""
upsert_pgvector_BEN0601.py

Reads chunks_BEN0601.jsonl, generates Gemini embeddings for each chunk,
and upserts into rag_chunks_BEN0601 in Neon PostgreSQL.

Safe to re-run — ON CONFLICT (chunk_id) DO UPDATE means duplicates are
updated rather than inserted twice.

Usage (from project root):
    python source/backend/ingestion/upsert_pgvector_BEN0601.py
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
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent  # source/backend/ingestion → project root
CONFIG_FILE = SCRIPT_DIR / "ingestion_config_BEN0601.yaml"
ENV_FILE = SCRIPT_DIR / ".env_BEN0601"

# Add ingestion to path so we can import sibling module
sys.path.insert(0, str(SCRIPT_DIR))
from embed_google_BEN0601 import embed_document  # noqa: E402

UPSERT_SQL = """
INSERT INTO rag_chunks_BEN0601 (
    chunk_id, source_file, source_type,
    page_start, page_end, section_title,
    chunk_index, chunk_text, token_estimate,
    embedding, metadata
)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (chunk_id) DO UPDATE SET
    chunk_text     = EXCLUDED.chunk_text,
    section_title  = EXCLUDED.section_title,
    token_estimate = EXCLUDED.token_estimate,
    embedding      = EXCLUDED.embedding,
    metadata       = EXCLUDED.metadata;
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
    # --- env & config ------------------------------------------------------------
    if not ENV_FILE.exists():
        print(f"[ERROR] .env_BEN0601 not found at {ENV_FILE}")
        sys.exit(1)
    load_dotenv(ENV_FILE)

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("[ERROR] DATABASE_URL is not set in .env_BEN0601")
        sys.exit(1)

    if not os.getenv("GEMINI_API_KEY"):
        print("[ERROR] GEMINI_API_KEY is not set in .env_BEN0601")
        sys.exit(1)

    with open(CONFIG_FILE) as f:
        config = yaml.safe_load(f)

    model = config["embedding"]["model"]
    expected_dim = config["embedding"]["output_dimensionality"]

    # --- load chunks -------------------------------------------------------------
    chunks_path = PROJECT_ROOT / config["paths"]["chunks_dir"] / "chunks_BEN0601.jsonl"
    if not chunks_path.exists():
        print(f"[ERROR] {chunks_path.relative_to(PROJECT_ROOT)} not found.")
        print("        Run chunk_markdown_BEN0601.py first.")
        sys.exit(1)

    chunks = load_chunks(chunks_path)
    print(f"[INFO]  Chunks loaded   : {len(chunks)}")
    print(f"[INFO]  Embedding model : {model}  (dim {expected_dim})")

    # --- connect to Neon ---------------------------------------------------------
    print("[INFO]  Connecting to Neon PostgreSQL...")
    try:
        conn = psycopg.connect(database_url)
        register_vector(conn)
    except psycopg.OperationalError as exc:
        print(f"[ERROR] Connection failed:\n        {exc}")
        print("        Check DATABASE_URL and that your Neon branch is active.")
        sys.exit(1)

    print(f"[INFO]  Upserting {len(chunks)} chunks...\n")

    inserted = updated = errors = 0

    with conn.cursor() as cur:
        for chunk in tqdm(chunks, desc="Embedding + upsert", unit="chunk"):
            try:
                vec = embed_document(chunk["chunk_text"], model=model)

                cur.execute(
                    UPSERT_SQL,
                    (
                        chunk["chunk_id"],
                        chunk["source_file"],
                        chunk["source_type"],
                        chunk["page_start"],
                        chunk["page_end"],
                        chunk["section_title"],
                        chunk["chunk_index"],
                        chunk["chunk_text"],
                        chunk["token_estimate"],
                        vec,
                        json.dumps(chunk["metadata"]),
                    ),
                )
                conn.commit()
                inserted += 1
                time.sleep(0.05)  # stay well under API rate limits

            except KeyboardInterrupt:
                print("\n[WARN]  Interrupted — committing what was done so far.")
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


if __name__ == "__main__":
    main()

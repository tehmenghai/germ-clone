"""
test_retrieval_BEN0601.py

Queries rag_chunks_BEN0601 using cosine similarity and prints the top-k results.
This is the acceptance test for Phase 06 — if this works, the pipeline is done.

Usage (from project root):
    python source/backend/ingestion/test_retrieval_BEN0601.py "What is overfitting?"
    python source/backend/ingestion/test_retrieval_BEN0601.py "Explain gradient descent"
"""

import os
import sys
from pathlib import Path

import psycopg
import yaml
from dotenv import load_dotenv
from pgvector.psycopg import register_vector

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent  # source/backend/ingestion → project root
CONFIG_FILE = SCRIPT_DIR / "ingestion_config_BEN0601.yaml"
ENV_FILE = SCRIPT_DIR / ".env_BEN0601"

sys.path.insert(0, str(SCRIPT_DIR))
from embed_google_BEN0601 import embed_query  # noqa: E402

RETRIEVAL_SQL = """
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
"""

DIVIDER = "─" * 60


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python test_retrieval_BEN0601.py \"<your query>\"")
        sys.exit(1)

    query = " ".join(sys.argv[1:])

    # --- env & config ------------------------------------------------------------
    if not ENV_FILE.exists():
        print(f"[ERROR] .env_BEN0601 not found at {ENV_FILE}")
        sys.exit(1)
    load_dotenv(ENV_FILE)

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("[ERROR] DATABASE_URL not set in .env_BEN0601")
        sys.exit(1)

    with open(CONFIG_FILE) as f:
        config = yaml.safe_load(f)
    top_k = config["retrieval"]["top_k"]
    model = config["embedding"]["model"]

    # --- embed query -------------------------------------------------------------
    print(f"\nQuery : \"{query}\"")
    print(f"Model : {model}  |  top_k : {top_k}\n")
    print("Embedding query...", end=" ", flush=True)

    try:
        vec = embed_query(query, model=model)
    except Exception as exc:
        print(f"\n[ERROR] Embedding failed: {exc}")
        sys.exit(1)
    print("done.\n")

    # --- retrieve ----------------------------------------------------------------
    try:
        conn = psycopg.connect(database_url)
        register_vector(conn)
    except psycopg.OperationalError as exc:
        print(f"[ERROR] DB connection failed:\n        {exc}")
        sys.exit(1)

    with conn.cursor() as cur:
        cur.execute(RETRIEVAL_SQL, (vec, vec, top_k))
        rows = cur.fetchall()
    conn.close()

    if not rows:
        print("[WARN] No results returned — is rag_chunks_BEN0601 populated?")
        print("       Run upsert_pgvector_BEN0601.py first.")
        sys.exit(1)

    # --- display -----------------------------------------------------------------
    print(f"Top {len(rows)} results from rag_chunks_BEN0601:\n")
    for rank, (chunk_id, source_file, page_start, page_end,
                section_title, chunk_text, similarity) in enumerate(rows, start=1):

        page_info = f"{page_start}–{page_end}" if page_start else "N/A"
        preview = chunk_text[:220].replace("\n", " ").strip()
        if len(chunk_text) > 220:
            preview += "…"

        print(DIVIDER)
        print(f"  #{rank}  similarity : {similarity:.4f}")
        print(f"       source     : {source_file}")
        print(f"       page       : {page_info}")
        print(f"       section    : {section_title or '—'}")
        print(f"       chunk_id   : {chunk_id}")
        print(f"       preview    : {preview}")

    print(DIVIDER)
    print(f"\n[OK] Retrieval test passed — {len(rows)} chunks returned.\n")


if __name__ == "__main__":
    main()

"""
test_retrieval_BEN0602.py

Queries rag_chunks_BEN0602 using cosine similarity and displays the top-k results.
The output shows the richer BEN0602 metadata: lesson_title, topic, keywords, and a
clean preview — making it easy to compare retrieval quality against BEN0601.

Usage (from project root):
    python source/backend/ingestion/test_retrieval_BEN0602.py "What is overfitting?"
    python source/backend/ingestion/test_retrieval_BEN0602.py "Explain gradient descent"
    python source/backend/ingestion/test_retrieval_BEN0602.py "When should I use one-hot encoding?"
"""

import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from pgvector.psycopg import register_vector

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent

# Ensure project root is on sys.path so imports like `source...` work when
# running the script from the repo root.
sys.path.insert(0, str(PROJECT_ROOT))

ENV_FILE = PROJECT_ROOT / "source/backend/ingestion/.env_BEN0601"

BEN0601_DIR = PROJECT_ROOT / "source/backend/ingestion"
sys.path.insert(0, str(BEN0601_DIR))
from embed_google_BEN0601 import embed_query  # noqa: E402

TOP_K = 5
EMBEDDING_MODEL = "gemini-embedding-2"

RETRIEVAL_SQL = """
SELECT
    chunk_id,
    source_file,
    lesson_title,
    topic,
    page_number,
    retrieval_keywords,
    clean_markdown,
    1 - (embedding <=> %s::vector) AS similarity
FROM rag_chunks_BEN0602
ORDER BY embedding <=> %s::vector
LIMIT %s;
"""

DIVIDER = "─" * 70


def main() -> None:
    if len(sys.argv) < 2:
        print('Usage: python test_retrieval_BEN0602.py "<your query>"')
        sys.exit(1)

    query = " ".join(sys.argv[1:])

    if not ENV_FILE.exists():
        print(f"[ERROR] .env_BEN0601 not found at {ENV_FILE}")
        sys.exit(1)
    load_dotenv(ENV_FILE)

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("[ERROR] DATABASE_URL not set in .env_BEN0601")
        sys.exit(1)

    print(f"\nQuery : \"{query}\"")
    print(f"Model : {EMBEDDING_MODEL}  |  top_k : {TOP_K}\n")
    print("Embedding query...", end=" ", flush=True)

    try:
        vec = embed_query(query, model=EMBEDDING_MODEL)
    except Exception as exc:
        print(f"\n[ERROR] Embedding failed: {exc}")
        sys.exit(1)
    print("done.\n")

    try:
        conn = psycopg.connect(database_url)
        register_vector(conn)
    except psycopg.OperationalError as exc:
        print(f"[ERROR] DB connection failed:\n        {exc}")
        sys.exit(1)

    with conn.cursor() as cur:
        cur.execute(RETRIEVAL_SQL, (vec, vec, TOP_K))
        rows = cur.fetchall()
    conn.close()

    if not rows:
        print("[WARN]  No results — is rag_chunks_BEN0602 populated?")
        print("        Run upsert_pgvector_BEN0602.py first.")
        sys.exit(1)

    print(f"Top {len(rows)} results from rag_chunks_BEN0602:\n")
    for rank, (chunk_id, source_file, lesson_title, topic, page_number,
               keywords, clean_markdown, similarity) in enumerate(rows, start=1):

        preview_length = 1200

        preview = (clean_markdown or "")[:preview_length].replace("\n", " ").strip()
        if clean_markdown and len(clean_markdown) > preview_length:
            preview += "…"

        kw_display = ", ".join((keywords or [])[:6])

        print(DIVIDER)
        print(f"  #{rank}  similarity : {similarity:.4f}")
        print(f"       lesson     : {lesson_title or '—'}")
        print(f"       topic      : {topic or '—'}")
        print(f"       page       : {page_number or 'N/A'}")
        print(f"       source     : {source_file}")
        print(f"       keywords   : {kw_display or '—'}")
        print(f"       chunk_id   : {chunk_id}")
        print(f"       preview    : {preview}")

        if rank == 1 and "formula" in query.lower():
            print("\n       full chunk :")
            print((clean_markdown or "").strip())

    print(DIVIDER)
    print(f"\n[OK]  Retrieval test complete — {len(rows)} chunks returned.\n")


if __name__ == "__main__":
    main()

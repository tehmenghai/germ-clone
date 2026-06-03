"""
setup_database_BEN0602.py

Applies schema_BEN0602.sql to your Neon PostgreSQL branch.
Creates the rag_chunks_BEN0602 table and its ivfflat index if they don't exist.
Safe to re-run (all statements use IF NOT EXISTS).

Usage (from project root):
    python source/backend/ingestion/setup_database_BEN0602.py
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
import psycopg

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
ENV_FILE = PROJECT_ROOT / "source/backend/ingestion/.env_BEN0601"
SCHEMA_FILE = SCRIPT_DIR / "schema_BEN0602.sql"


def main() -> None:
    if not ENV_FILE.exists():
        print(f"[ERROR] .env_BEN0601 not found at {ENV_FILE}")
        sys.exit(1)

    load_dotenv(ENV_FILE)
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("[ERROR] DATABASE_URL not set in .env_BEN0601")
        sys.exit(1)

    sql = SCHEMA_FILE.read_text(encoding="utf-8")

    print("[INFO]  Connecting to Neon PostgreSQL...")
    try:
        conn = psycopg.connect(database_url)
    except psycopg.OperationalError as exc:
        print(f"[ERROR] Connection failed:\n        {exc}")
        print("        Check DATABASE_URL and that your Neon branch is active.")
        sys.exit(1)

    print("[INFO]  Applying schema_BEN0602.sql...")
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
    except Exception as exc:
        conn.rollback()
        print(f"[ERROR] Schema application failed:\n        {exc}")
        conn.close()
        sys.exit(1)

    conn.close()
    print("[OK]    rag_chunks_BEN0602 table and index are ready.")
    print("\n[NEXT]  Run llm_clean_chunk_BEN0602.py to produce the enhanced JSONL,")
    print("        then upsert_pgvector_BEN0602.py to load it into Neon.")


if __name__ == "__main__":
    main()

"""
setup_database_BEN0601.py

Creates the rag_chunks_BEN0601 table and indexes in Neon PostgreSQL.

Usage:
    python source/backend/ingestion/setup_database_BEN0601.py

Requires .env_BEN0601 in the ingestion/ directory with DATABASE_URL set.
"""

import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

# Script lives at source/backend/ingestion/ — two levels up is project root
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent  # source/backend/ingestion → project root
ENV_FILE = SCRIPT_DIR / ".env_BEN0601"
SCHEMA_FILE = SCRIPT_DIR / "schema_BEN0601.sql"


def main() -> None:
    # --- load env ----------------------------------------------------------------
    if not ENV_FILE.exists():
        print(f"[ERROR] .env_BEN0601 not found at {ENV_FILE}")
        print(f"        Copy .env.example_BEN0601 → .env_BEN0601 and fill in DATABASE_URL.")
        sys.exit(1)

    load_dotenv(ENV_FILE)
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        print("[ERROR] DATABASE_URL is not set in .env_BEN0601")
        sys.exit(1)

    # --- read schema -------------------------------------------------------------
    if not SCHEMA_FILE.exists():
        print(f"[ERROR] Schema file not found: {SCHEMA_FILE}")
        sys.exit(1)

    sql = SCHEMA_FILE.read_text()

    # --- connect and execute -----------------------------------------------------
    print(f"[INFO]  Connecting to Neon PostgreSQL...")
    try:
        with psycopg.connect(database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
            conn.commit()
    except psycopg.OperationalError as e:
        print(f"[ERROR] Could not connect to the database:\n        {e}")
        print("\n        Check that DATABASE_URL is correct and your Neon branch is active.")
        sys.exit(1)
    except psycopg.Error as e:
        print(f"[ERROR] Failed to execute schema:\n        {e}")
        sys.exit(1)

    print("[OK]    rag_chunks_BEN0601 table and indexes are ready.")
    print(f"[INFO]  Schema applied from: {SCHEMA_FILE.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()

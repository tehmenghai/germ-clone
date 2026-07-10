"""
seed_from_chunks.py

Seeds the production schema (documents / chunks / embeddings) from the
basic-pipeline chunks JSONL using nomic-embed-text via Ollama (ADR-0004).

This is a one-time Phase 1 bridge — production loaders will replace this in Phase 2.

Usage (from source/backend/):
    python ingestion/seed_from_chunks.py
"""

import asyncio
import json
import os
import uuid
from pathlib import Path

import asyncpg
from dotenv import load_dotenv
from tqdm import tqdm

load_dotenv(Path(__file__).parent.parent / ".env")

BACKEND_DIR = Path(__file__).parent.parent
PROJECT_ROOT = BACKEND_DIR.parent.parent
CHUNKS_FILE = PROJECT_ROOT / "data_01_raw" / "chunks" / "chunks.jsonl"

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
EXPECTED_DIM = 768

# --- embedding via Ollama (sync-friendly wrapper for asyncpg context) --------

import httpx  # noqa: E402


async def embed(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": text},
        )
        resp.raise_for_status()
        vec = resp.json()["embedding"]
    if len(vec) != EXPECTED_DIM:
        raise ValueError(f"Dim mismatch: expected {EXPECTED_DIM}, got {len(vec)}")
    return vec


# --- DB helpers --------------------------------------------------------------

INSERT_DOC = """
    INSERT INTO documents (id, mod, filename, created_by, indexed_at)
    VALUES ($1, $2, $3, NULL, now())
    ON CONFLICT DO NOTHING
"""

INSERT_CHUNK = """
    INSERT INTO chunks (id, document_id, text, chunk_index)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT DO NOTHING
"""

INSERT_EMBEDDING = """
    INSERT INTO embeddings (id, chunk_id, vector)
    VALUES ($1, $2, $3::vector)
    ON CONFLICT (chunk_id) DO UPDATE SET vector = EXCLUDED.vector
"""


def derive_mod(source_file: str) -> str:
    """Extract module number from filename, e.g. '3.3 - Supervised...' → '3.3'."""
    import re
    m = re.match(r"^(\d+\.\d+)", source_file.strip())
    return m.group(1) if m else ""


async def main() -> None:
    if not CHUNKS_FILE.exists():
        print(f"[ERROR] Chunks file not found: {CHUNKS_FILE}")
        print("        Run run_pipeline.py first.")
        return

    chunks = []
    with CHUNKS_FILE.open() as f:
        for line in f:
            line = line.strip()
            if line:
                chunks.append(json.loads(line))

    print(f"[INFO]  Chunks loaded   : {len(chunks)}")
    print(f"[INFO]  Embed model     : {EMBED_MODEL}  (dim {EXPECTED_DIM})")

    raw_url = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(raw_url)

    # Register pgvector type
    await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Build document map: source_file → document UUID
    doc_map: dict[str, uuid.UUID] = {}
    for chunk in chunks:
        sf = chunk["source_file"]
        if sf not in doc_map:
            doc_id = uuid.uuid4()
            doc_map[sf] = doc_id
            await conn.execute(INSERT_DOC, doc_id, derive_mod(sf), sf)

    print(f"[INFO]  Documents upserted: {len(doc_map)}")
    print(f"[INFO]  Seeding {len(chunks)} chunks with Ollama embeddings...\n")

    ok = errors = 0
    for chunk in tqdm(chunks, desc="Embed + insert", unit="chunk"):
        try:
            chunk_id = uuid.uuid4()
            doc_id = doc_map[chunk["source_file"]]

            await conn.execute(
                INSERT_CHUNK,
                chunk_id,
                doc_id,
                chunk["chunk_text"],
                chunk["chunk_index"],
            )

            vec = await embed(chunk["chunk_text"])
            vec_str = "[" + ",".join(str(v) for v in vec) + "]"

            await conn.execute(INSERT_EMBEDDING, uuid.uuid4(), chunk_id, vec_str)
            ok += 1

        except Exception as exc:
            tqdm.write(f"[WARN]  {chunk['chunk_id']}: {exc}")
            errors += 1

    await conn.close()
    print(f"\n[OK]    Seeded: {ok}  |  Errors: {errors}")
    if errors:
        print("[WARN]  Re-run to retry failed chunks (inserts are idempotent).")


if __name__ == "__main__":
    asyncio.run(main())

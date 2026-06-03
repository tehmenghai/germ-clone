"""
seed_dev.py — thin wrapper around Ben's seed script that:
  1. points CHUNKS_FILE at the sample JSONL (full corpus not yet processed)
  2. converts ?ssl=require → ?sslmode=require for asyncpg's DSN parser

Run from source/backend/:
    python seed_dev.py
"""
import asyncio
import json
import os
import uuid
from pathlib import Path

import httpx
import asyncpg
from dotenv import load_dotenv
from tqdm import tqdm

load_dotenv(Path(__file__).parent / ".env")

PROJECT_ROOT = Path(__file__).parent.parent.parent
CHUNKS_FILE = PROJECT_ROOT / "data_BEN0601" / "chunks_BEN0601" / "sample_chunks_BEN0601.jsonl"

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
EXPECTED_DIM = 768


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
    import re
    m = re.match(r"^(\d+\.\d+)", source_file.strip())
    return m.group(1) if m else ""


async def main() -> None:
    if not CHUNKS_FILE.exists():
        print(f"[ERROR] Chunks file not found: {CHUNKS_FILE}")
        return

    chunks = []
    with CHUNKS_FILE.open() as f:
        for line in f:
            line = line.strip()
            if line:
                chunks.append(json.loads(line))

    print(f"[INFO]  Chunks loaded   : {len(chunks)}")
    print(f"[INFO]  Embed model     : {EMBED_MODEL}  (dim {EXPECTED_DIM})")

    # asyncpg DSN uses sslmode=, not ssl=
    raw_url = (
        os.environ["DATABASE_URL"]
        .replace("postgresql+asyncpg://", "postgresql://")
        .replace("ssl=require", "sslmode=require")
    )
    conn = await asyncpg.connect(raw_url)
    await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")

    doc_map: dict[str, uuid.UUID] = {}
    for chunk in chunks:
        sf = chunk["source_file"]
        if sf not in doc_map:
            doc_id = uuid.uuid4()
            doc_map[sf] = doc_id
            await conn.execute(INSERT_DOC, doc_id, derive_mod(sf), sf)

    print(f"[INFO]  Documents upserted : {len(doc_map)}")
    print(f"[INFO]  Seeding {len(chunks)} chunks with Ollama embeddings...\n")

    ok = errors = 0
    for chunk in tqdm(chunks, desc="Embed + insert", unit="chunk"):
        try:
            chunk_id = uuid.uuid4()
            doc_id = doc_map[chunk["source_file"]]
            await conn.execute(INSERT_CHUNK, chunk_id, doc_id, chunk["chunk_text"], chunk["chunk_index"])
            vec = await embed(chunk["chunk_text"])
            vec_str = "[" + ",".join(str(v) for v in vec) + "]"
            await conn.execute(INSERT_EMBEDDING, uuid.uuid4(), chunk_id, vec_str)
            ok += 1
        except Exception as exc:
            tqdm.write(f"[WARN]  {chunk['chunk_id']}: {exc}")
            errors += 1

    await conn.close()
    print(f"\n[OK]    Seeded: {ok}  |  Errors: {errors}")


if __name__ == "__main__":
    asyncio.run(main())

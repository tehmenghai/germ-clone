"""
reindex_with_ollama.py

Re-embeds all chunks in the embeddings table using nomic-embed-text (Ollama, 768-dim),
replacing the existing gemini-embedding-2 vectors.

Run from source/backend/:
    python -m ingestion.reindex_with_ollama [--dry-run]

IMPORTANT: After running, update .env:
    EMBEDDING_PROVIDER=ollama
    EMBEDDING_MODEL=nomic-embed-text
and restart the backend.
"""

import asyncio
import sys
import time

import httpx
from dotenv import load_dotenv
from sqlalchemy import text

load_dotenv()

from repository.database import AsyncSessionLocal  # noqa: E402

OLLAMA_URL = "http://localhost:11434"
MODEL = "nomic-embed-text"
BATCH_SIZE = 10
EXPECTED_DIM = 768


async def _embed_ollama(text_content: str) -> list[float]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": MODEL, "prompt": text_content},
        )
        resp.raise_for_status()
        vec = resp.json()["embedding"]
        if len(vec) != EXPECTED_DIM:
            raise ValueError(f"Unexpected dim {len(vec)}, expected {EXPECTED_DIM}")
        return vec


async def main(dry_run: bool = False) -> None:
    print(f"==> reindex_with_ollama ({MODEL}){' [DRY RUN]' if dry_run else ''}")

    async with AsyncSessionLocal() as session:
        rows = await session.execute(
            text("SELECT e.id, c.text FROM embeddings e JOIN chunks c ON c.id = e.chunk_id ORDER BY e.id")
        )
        chunks = rows.fetchall()

    total = len(chunks)
    print(f"    {total} embeddings to re-index")

    if dry_run:
        print("    [DRY RUN] would re-embed and update all rows — exiting without changes")
        return

    updated = 0
    errors = 0
    t0 = time.monotonic()

    for i, (emb_id, chunk_text) in enumerate(chunks):
        try:
            vec = await _embed_ollama(chunk_text)
            vec_str = "[" + ",".join(str(v) for v in vec) + "]"
            async with AsyncSessionLocal() as session:
                await session.execute(
                    text("UPDATE embeddings SET vector = CAST(:vec AS vector) WHERE id = :id"),
                    {"vec": vec_str, "id": emb_id},
                )
                await session.commit()
            updated += 1
        except Exception as exc:
            print(f"    [ERROR] embedding id {emb_id}: {exc}")
            errors += 1

        if (i + 1) % BATCH_SIZE == 0 or (i + 1) == total:
            elapsed = time.monotonic() - t0
            rate = (i + 1) / elapsed
            eta = (total - i - 1) / rate if rate > 0 else 0
            print(f"    [{i+1}/{total}] {updated} ok, {errors} err — {rate:.1f}/s — ETA {eta:.0f}s")

    print(f"\n==> Done: {updated} updated, {errors} errors")
    if errors == 0:
        print("    Update .env: EMBEDDING_PROVIDER=ollama  EMBEDDING_MODEL=nomic-embed-text")
        print("    Then restart the backend.")


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    asyncio.run(main(dry_run=dry_run))

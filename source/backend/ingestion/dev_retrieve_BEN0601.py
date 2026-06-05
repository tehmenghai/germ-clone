"""
dev_retrieve_BEN0601.py — Ben's local chunk inspector and retrieval tester.

NOT production code. Dev utility only — run from project root.

Three sub-commands:

  stats   — row counts and document list
  browse  — page through chunks (filter by module)
  search  — semantic search against the production embeddings table

Usage (from project root):
    python source/backend/ingestion/dev_retrieve_BEN0601.py stats
    python source/backend/ingestion/dev_retrieve_BEN0601.py browse
    python source/backend/ingestion/dev_retrieve_BEN0601.py browse --mod 3.3 --limit 10
    python source/backend/ingestion/dev_retrieve_BEN0601.py search "What is overfitting?"
    python source/backend/ingestion/dev_retrieve_BEN0601.py search "How does gradient descent work?" --top-k 8
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

import asyncpg
import httpx
from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent

load_dotenv(SCRIPT_DIR.parent / ".env")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
DIVIDER = "─" * 70


# ---------------------------------------------------------------------------
# DB + embedding helpers
# ---------------------------------------------------------------------------

async def get_conn() -> asyncpg.Connection:
    url = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
    return await asyncpg.connect(url)


async def embed_query(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": text},
        )
        r.raise_for_status()
    return r.json()["embedding"]


# ---------------------------------------------------------------------------
# stats
# ---------------------------------------------------------------------------

async def cmd_stats() -> None:
    conn = await get_conn()

    counts = {}
    for table in ("users", "documents", "chunks", "embeddings",
                  "conversations", "messages", "rag_chunks_ben0601"):
        row = await conn.fetchrow(f"SELECT COUNT(*) AS n FROM {table}")
        counts[table] = row["n"]

    docs = await conn.fetch(
        "SELECT mod, filename, COUNT(c.id) AS chunk_count "
        "FROM documents d "
        "LEFT JOIN chunks c ON c.document_id = d.id "
        "GROUP BY d.id ORDER BY d.mod"
    )

    await conn.close()

    print(f"\n{'TABLE':<30} {'ROWS':>6}")
    print(DIVIDER)
    for t, n in counts.items():
        print(f"  {t:<28} {n:>6}")

    print(f"\n{'MODULE':<8} {'CHUNKS':>7}  FILENAME")
    print(DIVIDER)
    for d in docs:
        print(f"  {d['mod'] or '?':<6}  {d['chunk_count']:>7}  {d['filename']}")
    print()


# ---------------------------------------------------------------------------
# browse
# ---------------------------------------------------------------------------

async def cmd_browse(mod: str | None, limit: int, offset: int) -> None:
    conn = await get_conn()

    where = "WHERE d.mod = $1" if mod else ""
    params = [mod] if mod else []
    total_row = await conn.fetchrow(
        f"SELECT COUNT(*) AS n FROM chunks c JOIN documents d ON d.id = c.document_id {where}",
        *params,
    )
    total = total_row["n"]

    rows = await conn.fetch(
        f"""
        SELECT c.id, c.chunk_index, c.text, d.mod, d.filename
        FROM chunks c
        JOIN documents d ON d.id = c.document_id
        {where}
        ORDER BY d.mod, c.chunk_index
        LIMIT {limit} OFFSET {offset}
        """,
        *params,
    )
    await conn.close()

    filter_label = f"mod={mod}" if mod else "all modules"
    print(f"\nChunks ({filter_label}) — showing {offset+1}–{offset+len(rows)} of {total}\n")

    for row in rows:
        preview = row["text"][:300].replace("\n", " ")
        if len(row["text"]) > 300:
            preview += "…"
        print(DIVIDER)
        print(f"  mod={row['mod']}  index={row['chunk_index']}  id={row['id']}")
        print(f"  file: {row['filename']}")
        print(f"  {preview}")
    print(DIVIDER + "\n")


# ---------------------------------------------------------------------------
# search
# ---------------------------------------------------------------------------

async def cmd_search(query: str, top_k: int) -> None:
    print(f"\nQuery : \"{query}\"")
    print(f"Model : {EMBED_MODEL}  |  top_k : {top_k}")
    print("Embedding query...", end=" ", flush=True)

    vec = await embed_query(query)
    vec_str = "[" + ",".join(str(v) for v in vec) + "]"
    print("done.\n")

    conn = await get_conn()
    rows = await conn.fetch(
        """
        SELECT
            c.chunk_index,
            c.text,
            d.mod,
            d.filename,
            1 - (e.vector <=> $1::vector) AS similarity
        FROM embeddings e
        JOIN chunks   c ON c.id  = e.chunk_id
        JOIN documents d ON d.id = c.document_id
        ORDER BY e.vector <=> $1::vector
        LIMIT $2
        """,
        vec_str,
        top_k,
    )
    await conn.close()

    if not rows:
        print("[WARN] No results — is the embeddings table populated?")
        return

    print(f"Top {len(rows)} results from production schema (nomic-embed-text):\n")
    for i, row in enumerate(rows, 1):
        preview = row["text"][:280].replace("\n", " ")
        if len(row["text"]) > 280:
            preview += "…"
        print(DIVIDER)
        print(f"  #{i}  similarity={row['similarity']:.4f}  mod={row['mod']}  "
              f"chunk_index={row['chunk_index']}")
        print(f"       file   : {row['filename']}")
        print(f"       preview: {preview}")
    print(DIVIDER + "\n")


async def cmd_canonical_search(query: str, top_k: int) -> None:
    """--canonical mode: embeds with Gemini, displays all BEN0602 enrichment fields."""
    # Load Gemini key from .env_BEN0601
    load_dotenv(SCRIPT_DIR / ".env_BEN0601", override=False)
    if not os.getenv("GEMINI_API_KEY"):
        print("[ERROR] GEMINI_API_KEY not found in ingestion/.env_BEN0601")
        sys.exit(1)

    sys.path.insert(0, str(SCRIPT_DIR))
    from embed_google_BEN0601 import embed_document  # noqa: PLC0415

    print(f"\nQuery  : \"{query}\"")
    print(f"Model  : gemini-embedding-2  |  top_k : {top_k}  |  table : canonical")
    print("Embedding query with Gemini...", end=" ", flush=True)

    vec = await asyncio.to_thread(embed_document, query, "gemini-embedding-2")
    vec_str = "[" + ",".join(str(v) for v in vec) + "]"
    print("done.\n")

    conn = await get_conn()
    # Probe all ivfflat lists — critical for small corpora where default probes=1
    # returns too few candidates.
    await conn.execute("SET ivfflat.probes = 100")
    rows = await conn.fetch(
        """
        SELECT
            c.id::text                                          AS id,
            COALESCE(d.mod, '')                                 AS mod,
            d.filename                                          AS file,
            COALESCE(c.metadata->>'timestamp_start', NULL)      AS ts,
            LEFT(c.text, 200)                                   AS snip,
            1 - (e.vector <=> $1::vector)                       AS score,
            c.source_type,
            c.lesson_title,
            c.topic
        FROM embeddings e
        JOIN chunks   c ON c.id  = e.chunk_id
        JOIN documents d ON d.id = c.document_id
        ORDER BY e.vector <=> $1::vector
        LIMIT $2
        """,
        vec_str,
        top_k,
    )
    await conn.close()

    if not rows:
        print("[WARN] No results — is the canonical embeddings table populated?")
        return

    print(f"Top {len(rows)} results from canonical schema (gemini-embedding-2):\n")
    for i, row in enumerate(rows, 1):
        print(DIVIDER)
        print(f"  #{i}  score={row['score']:.4f}  mod={row['mod']}  source_type={row['source_type']}")
        print(f"       file        : {row['file']}")
        print(f"       lesson_title: {row['lesson_title'] or '—'}")
        print(f"       topic       : {row['topic'] or '—'}")
        print(f"       ts          : {row['ts'] or 'None'}")
        print(f"       id          : {row['id']}")
        print(f"       snip        : {row['snip'].replace(chr(10), ' ')}")
    print(DIVIDER + "\n")


# ---------------------------------------------------------------------------
# CLI wiring
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="dev_retrieve.py",
        description="Browse and test production chunks (Ben's dev tool)",
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("stats", help="Show row counts and document list")

    br = sub.add_parser("browse", help="Page through chunks")
    br.add_argument("--mod", default=None, help="Filter by module e.g. 3.3")
    br.add_argument("--limit", type=int, default=5, help="Chunks per page (default 5)")
    br.add_argument("--offset", type=int, default=0, help="Start offset (default 0)")

    sr = sub.add_parser("search", help="Semantic search with nomic-embed-text")
    sr.add_argument("query", help="Search query string")
    sr.add_argument("--top-k", type=int, default=5, help="Results to return (default 5)")
    sr.add_argument(
        "--canonical",
        action="store_true",
        help="Use Gemini embedding + show enriched fields (source_type, topic, ts)",
    )

    return p


async def main() -> None:
    args = build_parser().parse_args()

    if args.cmd == "stats":
        await cmd_stats()
    elif args.cmd == "browse":
        await cmd_browse(args.mod, args.limit, args.offset)
    elif args.cmd == "search":
        if args.canonical:
            await cmd_canonical_search(args.query, args.top_k)
        else:
            await cmd_search(args.query, args.top_k)


if __name__ == "__main__":
    asyncio.run(main())

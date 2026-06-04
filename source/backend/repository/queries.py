"""
pgvector retrieval queries.
Producer: Ben. Consumer: Meng Hai (rag/).
Returns RetrievalResult shapes defined in schemas/retrieval.py.

DO NOT change return field names without notifying Meng Hai first.
See docs/contracts.md.

Reads from rag_chunks_ben0602 (Ben's ingestion table, 205 chunks, all modules).
query_vec must be embedded with the same model used at index time (gemini-embedding-2 by default).
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from schemas.retrieval import RetrievalResult

_RETRIEVAL_SQL = text("""
SELECT
    chunk_id                                                              AS id,
    REGEXP_REPLACE(source_file, '.*?([0-9]+\\.[0-9]+).*', '\\1', '')    AS mod,
    source_file                                                           AS file,
    page_number::text                                                     AS ts,
    LEFT(COALESCE(clean_markdown, chunk_text), 200)                      AS snip,
    1 - (embedding <=> CAST(:query_vec AS vector))                       AS score,
    COALESCE(clean_markdown, chunk_text)                                  AS text
FROM rag_chunks_ben0602
ORDER BY embedding <=> CAST(:query_vec AS vector)
LIMIT :top_k
""")


async def retrieve(
    session: AsyncSession,
    query_vec: list[float],
    top_k: int = 5,
) -> list[RetrievalResult]:
    """
    Cosine-similarity retrieval over rag_chunks_ben0602.

    Args:
        session:   active async SQLAlchemy session
        query_vec: 768-dim embedding — must match the model used at index time
        top_k:     number of results to return
    """
    # Probe all IVFFlat lists — critical for small corpora; acceptable overhead for large ones.
    await session.execute(text("SET LOCAL ivfflat.probes = 100"))
    vec_str = "[" + ",".join(str(v) for v in query_vec) + "]"
    result = await session.execute(
        _RETRIEVAL_SQL, {"query_vec": vec_str, "top_k": top_k}
    )
    rows = result.fetchall()
    return [
        RetrievalResult(
            id=row.id,
            mod=row.mod,
            file=row.file,
            ts=row.ts,
            snip=row.snip,
            score=float(row.score),
            text=row.text,
        )
        for row in rows
    ]

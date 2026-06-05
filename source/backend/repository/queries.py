"""
pgvector retrieval queries.
Producer: Ben. Consumer: Meng Hai (rag/).
Returns RetrievalResult shapes defined in schemas/retrieval.py.

DO NOT change return field names without notifying Meng Hai first.
See docs/contracts.md.

Reads from canonical embeddings → chunks → documents tables (migration 002/003).
query_vec must be embedded with gemini-embedding-2 (matches stored vectors).
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from schemas.retrieval import RetrievalResult

_RETRIEVAL_SQL = text("""
SELECT
    c.id::text                                                              AS id,
    COALESCE(d.mod, '')                                                     AS mod,
    d.filename                                                              AS file,
    COALESCE(c.metadata->>'timestamp_start', c.page_number::text, NULL)    AS ts,
    LEFT(c.text, 200)                                                       AS snip,
    1 - (e.vector <=> CAST(:query_vec AS vector))                           AS score,
    c.text                                                                  AS text,
    c.source_type                                                           AS source_type,
    c.lesson_title                                                          AS lesson_title,
    c.topic                                                                 AS topic
FROM embeddings e
JOIN chunks   c ON c.id  = e.chunk_id
JOIN documents d ON d.id = c.document_id
ORDER BY e.vector <=> CAST(:query_vec AS vector)
LIMIT :top_k
""")


async def retrieve(
    session: AsyncSession,
    query_vec: list[float],
    top_k: int = 5,
) -> list[RetrievalResult]:
    """
    Cosine-similarity retrieval over the canonical embeddings table.

    Args:
        session:   active async SQLAlchemy session
        query_vec: 768-dim embedding from gemini-embedding-2 (must match stored vectors)
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
            source_type=row.source_type,
            lesson_title=row.lesson_title,
            topic=row.topic,
        )
        for row in rows
    ]

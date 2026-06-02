"""
pgvector retrieval queries.
Producer: Ben. Consumer: Meng Hai (rag/).
Returns RetrievalResult shapes defined in schemas/retrieval.py.

DO NOT change return field names without notifying Meng Hai first.
See docs/contracts.md.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from schemas.retrieval import RetrievalResult

_RETRIEVAL_SQL = text("""
SELECT
    c.id::text                               AS id,
    COALESCE(d.mod, '')                      AS mod,
    d.filename                               AS file,
    NULL::text                               AS ts,
    LEFT(c.text, 200)                        AS snip,
    1 - (e.vector <=> :query_vec::vector)    AS score,
    c.text                                   AS text
FROM embeddings e
JOIN chunks   c ON c.id  = e.chunk_id
JOIN documents d ON d.id = c.document_id
ORDER BY e.vector <=> :query_vec::vector
LIMIT :top_k
""")


async def retrieve(
    session: AsyncSession,
    query_vec: list[float],
    top_k: int = 5,
) -> list[RetrievalResult]:
    """
    Cosine-similarity retrieval over the embeddings table.

    Args:
        session:   active async SQLAlchemy session
        query_vec: 768-dim embedding from nomic-embed-text (must match index dim)
        top_k:     number of results to return
    """
    result = await session.execute(
        _RETRIEVAL_SQL, {"query_vec": query_vec, "top_k": top_k}
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

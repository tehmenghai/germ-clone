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

# Additive nudge (on the 0..1 cosine similarity scale) applied to candidates from
# the route-classified module before the LIMIT cutoff. Intentionally a soft boost,
# not a WHERE filter: a hard filter would strand queries where `route` misclassified
# the module (see issue #26 TC04) with zero recovery path. The boost only affects
# ORDER BY / LIMIT selection — the returned `score` column stays pure cosine
# similarity so RetrievalResult.score keeps its documented meaning.
_MOD_BOOST = 0.15

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
ORDER BY
    (1 - (e.vector <=> CAST(:query_vec AS vector)))
    + CASE WHEN :mod != '' AND d.mod = :mod THEN :mod_boost ELSE 0 END DESC
LIMIT :top_k
""")


async def retrieve(
    session: AsyncSession,
    query_vec: list[float],
    top_k: int = 5,
    mod: str | None = None,
) -> list[RetrievalResult]:
    """
    Cosine-similarity retrieval over the canonical embeddings table.

    Args:
        session:   active async SQLAlchemy session
        query_vec: 768-dim embedding (must match the provider/model used to store vectors)
        top_k:     number of results to return
        mod:       route-classified module (e.g. "3.4") to softly prioritize, or
                   None to rank purely by cosine similarity (used on the retrieve2
                   reloop pass — see rag/nodes/retrieve.py — to allow escaping a
                   module that `route` misclassified).
    """
    # Probe all IVFFlat lists — critical for small corpora; acceptable overhead for large ones.
    await session.execute(text("SET LOCAL ivfflat.probes = 100"))
    vec_str = "[" + ",".join(str(v) for v in query_vec) + "]"
    result = await session.execute(
        _RETRIEVAL_SQL,
        {"query_vec": vec_str, "top_k": top_k, "mod": mod or "", "mod_boost": _MOD_BOOST},
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

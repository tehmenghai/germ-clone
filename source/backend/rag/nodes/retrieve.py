"""
retrieve nodes — pgvector cosine-similarity retrieval via repository layer.
retrieve1_node: initial retrieval on rewritten_query (top_k=8).
retrieve2_node: reloop retrieval on reflect_output (top_k=6), merged+deduped with existing chunks.
"""
from ingestion.embedder import embed_text
from rag.state import GraphState
from repository.database import AsyncSessionLocal
from repository.queries import retrieve
from schemas.events import StageEvent
from schemas.retrieval import RetrievalResult

_SOURCE_WEIGHTS: dict[str, float] = {
    "pdf": 1.2,
    "textbook": 1.2,
    "transcript": 0.9,
}


def _apply_source_weights(chunks: list[RetrievalResult]) -> list[RetrievalResult]:
    weighted = [
        c.model_copy(update={"score": min(c.score * _SOURCE_WEIGHTS.get(c.source_type, 1.0), 1.0)})
        for c in chunks
    ]
    return sorted(weighted, key=lambda c: c.score, reverse=True)


def _mod_summary(chunks: list[RetrievalResult]) -> str:
    mods = sorted({c.mod for c in chunks if c.mod})
    return ", ".join(f"module {m}" for m in mods) if mods else "—"


async def retrieve1_node(state: GraphState) -> dict:
    vec = await embed_text(state["rewritten_query"])
    async with AsyncSessionLocal() as session:
        chunks = _apply_source_weights(await retrieve(session, vec, top_k=8))
    return {
        "chunks": chunks,
        "stage_events": [StageEvent(
            stage="retrieve1",
            status="done",
            detail=f"{len(chunks)} chunks — {_mod_summary(chunks)}",
        )],
    }


async def retrieve2_node(state: GraphState) -> dict:
    # use reflection output as refined query; fall back to rewritten_query
    refined = state.get("reflect_output") or state["rewritten_query"]
    vec = await embed_text(refined)
    async with AsyncSessionLocal() as session:
        new_chunks = _apply_source_weights(await retrieve(session, vec, top_k=6))

    seen = {c.id for c in state["chunks"]}
    extra = [c for c in new_chunks if c.id not in seen]
    merged = state["chunks"] + extra

    return {
        "extra_chunks": extra,
        "chunks": merged,
        "stage_events": [StageEvent(
            stage="retrieve2",
            status="done",
            detail=f"{len(extra)} additional chunks — {_mod_summary(extra)}",
        )],
    }

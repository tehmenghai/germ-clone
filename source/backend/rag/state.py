import operator
from typing import Annotated, Any

from typing_extensions import TypedDict

from schemas.events import Citation, EvalScores, Source, StageEvent
from schemas.retrieval import RetrievalResult


class GraphState(TypedDict):
    # ── inputs ───────────────────────────────────────────────────────────
    query: str
    profile_id: str
    difficulty: str          # eli5 | standard | academia

    # ── stage outputs ─────────────────────────────────────────────────────
    mod: str                             # route: e.g. "3.3"
    rewritten_query: str                 # rewrite
    chunks: list[RetrievalResult]        # retrieve1 (merged with extra after retrieve2)
    extra_chunks: list[RetrievalResult]  # retrieve2 additions only
    react_output: str                    # react
    reflect_output: str                  # reflect
    scores_1: EvalScores | None       # evaluate1
    scores_2: EvalScores | None       # evaluate2
    citations_compliant: bool            # evaluate1/evaluate2: every [N] in answer_md maps
                                          # to a real citation (see rag/nodes/evaluate.py)
    answer_md: str                       # compose1/compose2 (generation) — see rag/graph.py
    citations: list[Citation]            # compose1/compose2 (generation)
    sources: list[Source]                # compose1/compose2 (generation)

    # ── SSE events (each node appends; operator.add accumulates across nodes) ──
    stage_events: Annotated[list[StageEvent], operator.add]

    # ── token streaming channel (injected by ask.py; None in tests) ──────────
    token_queue: Any   # asyncio.Queue[tuple[str, Any]] | None

import operator
from typing import Annotated, Optional
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
    scores_1: Optional[EvalScores]       # evaluate1
    scores_2: Optional[EvalScores]       # evaluate2
    answer_md: str                       # compose
    citations: list[Citation]            # compose
    sources: list[Source]                # compose

    # ── SSE events (each node appends; operator.add accumulates across nodes) ──
    stage_events: Annotated[list[StageEvent], operator.add]

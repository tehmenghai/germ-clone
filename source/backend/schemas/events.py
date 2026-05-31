"""
SSE stage event contract — owned jointly; consumer is the frontend.
DO NOT change field names or stage keys without a heads-up to Lik Hong.
See docs/contracts.md.
"""
from typing import Literal, Optional
from pydantic import BaseModel

PIPE_STAGES = [
    "route",
    "rewrite",
    "retrieve1",
    "react",
    "reflect",
    "evaluate1",
    "retrieve2",
    "evaluate2",
    "compose",
]

StageKey = Literal[
    "route", "rewrite", "retrieve1", "react", "reflect",
    "evaluate1", "retrieve2", "evaluate2", "compose"
]
StageStatus = Literal["pending", "active", "done", "error"]


class EvalScores(BaseModel):
    f: float  # faithfulness  0–1
    r: float  # relevance     0–1
    c: float  # completeness  0–1


class Citation(BaseModel):
    id: int
    mod: str       # e.g. "3.3"
    file: str
    ts: Optional[str] = None   # timestamp or page ref
    snip: str      # short excerpt
    score: float


class Source(BaseModel):
    id: int
    score: float


class StageEvent(BaseModel):
    """Emitted by the backend for every pipeline stage transition."""
    stage: StageKey
    status: StageStatus
    detail: Optional[str] = None
    scores: Optional[EvalScores] = None
    verdict: Optional[str] = None
    # compose-only fields
    answer_md: Optional[str] = None
    citations: Optional[list[Citation]] = None
    sources: Optional[list[Source]] = None

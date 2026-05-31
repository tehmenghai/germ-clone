"""
Retrieval result contract — producer: Ben (repository/); consumer: Meng Hai (rag/).
DO NOT change field names without a heads-up to Meng Hai.
See docs/contracts.md.
"""
from typing import Optional
from pydantic import BaseModel


class RetrievalResult(BaseModel):
    id: str         # chunk UUID
    mod: str        # module number, e.g. "3.3"
    file: str       # source filename
    ts: Optional[str] = None   # timestamp or page reference
    snip: str       # short excerpt (≤ 200 chars)
    score: float    # cosine similarity
    text: str       # full chunk text

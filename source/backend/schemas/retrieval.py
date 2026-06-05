"""
Retrieval result contract — producer: Ben (repository/); consumer: Meng Hai (rag/).
DO NOT change field names without a heads-up to Meng Hai.
See docs/contracts.md.
"""

from pydantic import BaseModel


class RetrievalResult(BaseModel):
    id: str                    # chunk UUID
    mod: str                   # module number, e.g. "3.3"
    file: str                  # source filename
    ts: str | None = None      # slide page number (str) for PDFs; timestamp for transcripts
    snip: str                  # short excerpt (≤ 200 chars)
    score: float               # cosine similarity
    text: str                  # full chunk text (combined embedding field)
    source_type: str = "pdf"   # 'pdf' | 'transcript' | 'textbook'
    lesson_title: str | None = None  # e.g. "Probability and Statistics for ML"
    topic: str | None = None         # e.g. "Law of Large Numbers"

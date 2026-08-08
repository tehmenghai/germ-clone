"""
f/r/c LLM-based evaluator.
  f (faithfulness):  every claim in the answer is grounded in retrieved chunks
  r (relevance):     retrieved chunks actually address the question
  c (completeness):  the answer fully covers the question

Returns EvalScores(f, r, c) each 0.0–1.0.
Falls back to (0.5, 0.5, 0.5) on parse failure so the graph never hard-crashes.

Judged on config.eval_backend, not the student's session backend, at temperature=0 — a
provider switch (or that provider's own sampling noise) must never change an answer's
grade (issue #39).
"""
import json

from llm import config
from llm.dispatch import complete
from schemas.events import EvalScores
from schemas.retrieval import RetrievalResult

_SYSTEM = """\
You are a RAG quality evaluator. Score on three dimensions, each 0.0–1.0:
  f (faithfulness):  all claims in the answer are supported by the provided chunks
  r (relevance):     the chunks genuinely address the question
  c (completeness):  the answer fully covers what the question asks

Return ONLY valid JSON with no extra text: {"f": <float>, "r": <float>, "c": <float>}"""


async def score(
    query: str,
    chunks: list[RetrievalResult],
    answer: str,
) -> EvalScores:
    chunks_text = "\n\n".join(
        f"[{i + 1}] {c.text[:400]}" for i, c in enumerate(chunks)
    )
    user_msg = (
        f"QUESTION:\n{query}\n\n"
        f"CHUNKS:\n{chunks_text}\n\n"
        f"ANSWER:\n{answer}"
    )
    try:
        raw = await complete(
            [
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": user_msg},
            ],
            backend=config.get_eval_backend(),
            temperature=0,
        )
        data = json.loads(raw.strip())
        return EvalScores(
            f=max(0.0, min(1.0, float(data["f"]))),
            r=max(0.0, min(1.0, float(data["r"]))),
            c=max(0.0, min(1.0, float(data["c"]))),
        )
    except Exception:
        return EvalScores(f=0.5, r=0.5, c=0.5)

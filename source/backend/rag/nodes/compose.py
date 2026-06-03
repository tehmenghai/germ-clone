"""
compose node — generates the final Markdown answer with inline citations.
Adapts verbosity to the difficulty level (eli5 / standard / academia).
Returns: answer_md, citations, sources, stage_events.
"""
import re

from llm.dispatch import complete
from rag.state import GraphState
from schemas.events import Citation, Source, StageEvent

_TONE: dict[str, str] = {
    "eli5": (
        "Explain simply, as if to a complete beginner. "
        "Use plain language and everyday analogies. Avoid jargon."
    ),
    "standard": (
        "Explain clearly with appropriate technical depth for a data science student. "
        "Define key terms, include relevant equations."
    ),
    "academia": (
        "Explain rigorously with formal notation, cite theorems where relevant, "
        "and use precise academic terminology."
    ),
}

_SYSTEM_TMPL = """\
You are an ML tutor answering a student's question in Markdown.

Use inline citations [N] to reference the numbered chunks provided.
{tone}

Structure: clear headings, concise paragraphs, LaTeX math where helpful (use $...$)."""


async def compose_node(state: GraphState) -> dict:
    chunks = state["chunks"]
    tone = _TONE.get(state["difficulty"], _TONE["standard"])
    chunks_text = "\n\n".join(
        f"[{i + 1}] (mod {c.mod}, score {c.score:.2f})\n{c.text[:600]}"
        for i, c in enumerate(chunks)
    )
    user_msg = (
        f"QUESTION: {state['query']}\n\n"
        f"REASONING:\n{state['react_output'][:800]}\n\n"
        f"CHUNKS:\n{chunks_text}"
    )
    answer_md = await complete(
        [
            {"role": "system", "content": _SYSTEM_TMPL.format(tone=tone)},
            {"role": "user", "content": user_msg},
        ]
    )
    answer_md = answer_md.strip()

    # build citations from [N] references found in the answer
    cited_ns = sorted({int(n) for n in re.findall(r"\[(\d+)\]", answer_md)})
    citations: list[Citation] = []
    sources: list[Source] = []
    for n in cited_ns:
        idx = n - 1
        if 0 <= idx < len(chunks):
            c = chunks[idx]
            citations.append(Citation(
                id=n, mod=c.mod, file=c.file,
                ts=c.ts, snip=c.snip, score=c.score,
            ))
            sources.append(Source(id=n, score=c.score))

    return {
        "answer_md": answer_md,
        "citations": citations,
        "sources": sources,
        "stage_events": [StageEvent(
            stage="compose",
            status="done",
            answer_md=answer_md,
            citations=citations or None,
            sources=sources or None,
        )],
    }

"""
compose node — generates the final Markdown answer with inline citations.
Adapts verbosity to the difficulty level (eli5 / standard / academia).
Returns: answer_md, citations, sources, stage_events.
"""
import re

from llm.dispatch import astream_complete
from rag.state import GraphState
from schemas.events import Citation, Source, StageEvent

_TONE: dict[str, tuple[str, str]] = {
    # (instruction, format_note)
    "eli5": (
        "Your audience is a curious 12-year-old who has NEVER studied ML, statistics, or algebra. "
        "NEVER use Greek letters, equations, or technical jargon. "
        "Every concept must be explained with a concrete everyday analogy (food, sports, toys, animals). "
        "If you catch yourself about to write a formula, replace it with a story. "
        "Short sentences. One idea per sentence. No more than 3 bullet points per section.",
        "ZERO LaTeX. ZERO equations. Plain English and analogies only. "
        "If a term sounds technical, immediately follow it with '(which is just like...)'.",
    ),
    "standard": (
        "Your audience is a data science student who knows Python, basic statistics, and linear algebra. "
        "Structure your answer like a textbook: intuition paragraph → key equation(s) displayed on their own line → "
        "term-by-term explanation of each symbol in the equation → worked consequence or example. "
        "Define every symbol the first time it appears. Aim for the depth of a good textbook chapter summary.",
        "MANDATORY MATH FORMAT — every key equation must appear as a standalone display block:\n"
        "$$\n"
        "x_{\\text{next}} = x_{\\text{curr}} - \\alpha \\frac{df}{dx}\n"
        "$$\n"
        "After each display equation, add a bullet list defining each symbol: "
        "$x_{\\text{curr}}$ — current parameter value, $\\alpha$ — learning rate, etc. "
        "Use inline $...$ for symbols within prose. Never bury an equation inside a sentence.",
    ),
    "academia": (
        "Your audience is a PhD-level researcher. Skip all introductory scaffolding. "
        "Lead with the formal definition, then derive or justify the result step by step. "
        "State assumptions explicitly. Cite theorems by name (e.g. universal approximation theorem, no-free-lunch theorem). "
        "Discuss convergence conditions, edge cases, and known failure modes. "
        "Reference related work or extensions where relevant. Prefer rigour over accessibility.",
        "Dense LaTeX throughout — derivations as numbered display equations:\n"
        "$$\n"
        "\\theta_{t+1} = \\theta_t - \\eta \\nabla_{\\theta} \\mathcal{L}(\\theta_t)\n"
        "$$\n"
        "Show intermediate steps. Use inline $...$ for all symbols in prose. "
        "Formal academic prose: no analogies, no hand-waving. Every claim must be citable.",
    ),
}

_SYSTEM_TMPL = """\
You are an ML tutor answering a student's question in Markdown.

## Citation rules — STRICT
The CHUNKS section is numbered [1], [2], [3], …
- Place a citation bracket immediately after EVERY factual claim: "The update rule [1] subtracts..."
- Place a citation bracket immediately after EVERY equation that comes from a chunk: $$x_{{\\text{{next}}}} = x_{{\\text{{curr}}}} - \\alpha \\frac{{df}}{{dx}}$$ [1]
- Do NOT write a sentence or display an equation without a citation if the fact came from a chunk.
- If a claim synthesises multiple chunks, cite all of them: "...reduces the loss [1][3]."

End your answer with a ## References section listing only the chunks you cited, \
in the format: [1] filename, [2] filename, …

## Audience and tone
{tone}

## Format
{format_note}
Use clear ## headings and concise paragraphs. Never omit citations."""


async def compose_node(state: GraphState) -> dict:
    chunks = state["chunks"]
    tone, format_note = _TONE.get(state["difficulty"], _TONE["standard"])
    chunks_text = "\n\n".join(
        f"[{i + 1}] (mod {c.mod}, score {c.score:.2f})\n{c.text[:600]}"
        for i, c in enumerate(chunks)
    )
    user_msg = (
        f"QUESTION: {state['query']}\n\n"
        f"REASONING:\n{state['react_output'][:800]}\n\n"
        f"CHUNKS:\n{chunks_text}"
    )

    token_queue = state.get("token_queue")

    # Stream tokens — each arrives immediately instead of buffering the full response
    full_response = ""
    async for token in astream_complete(
        [
            {"role": "system", "content": _SYSTEM_TMPL.format(tone=tone, format_note=format_note)},
            {"role": "user", "content": user_msg},
        ]
    ):
        full_response += token
        if token_queue is not None:
            await token_queue.put(("token", token))

    answer_md = full_response.strip()

    # Build citations from [N] references found in the answer
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
                text=c.text,
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

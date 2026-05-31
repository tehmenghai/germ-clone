# Lanson — Langflow Design + Eval

You own the flow design and the quality gate. The eval harness is not a nice-to-have — it's
the only mechanism that catches silent divergence between your flow and Meng Hai's
implementation.

## Your directories

```
flows/          ml-tutor.flow.json, prompts/, README (node→module map)
evaluation/     golden-set, f/r/c metrics, CI gate
```

Stay out of everything under `source/`. Your output is the flow JSON, the extracted prompts,
and the eval harness. Meng Hai re-implements your flow as LangGraph code. That's the
arrangement — don't try to shortcut it by putting Langflow on the request path.

## What you're building

**Phase 1 (start here):**
- First Langflow flow draft covering all 9 stages: route → rewrite → retrieve1 → react →
  reflect → evaluate1 → [retrieve2 → evaluate2 →] compose, including the re-loop condition
  (`mean(f,r,c) < 0.80`).
- Export `flows/ml-tutor.flow.json` and extracted `flows/prompts/` (one file per node).
- Skeleton eval harness in `evaluation/` — structure first, golden pairs second.

**Phase 2:**
- Tuned flow and prompts based on retrieval results.
- ≥10 golden input→expected-output pairs per surface, scored on faithfulness, relevance,
  completeness (f/r/c).
- Eval wired to CI — it fails on regression. This is the gate.
- `flows/README.md` node→module map kept current.

## The Meng Hai handoff

Your flow JSON is the design spec. Meng Hai reads it and re-implements it as LangGraph in
`rag/`. The `flows/README.md` node→module map is how you both stay in sync — keep it current
every time the flow shape changes.

The rule: if you change the stage list, the re-loop threshold, or any prompt's input/output
contract, raise it with Meng Hai before you consider it shipped. Not after. A silent change
there breaks his graph and neither of you will notice until the eval fails — if it's wired up.
That's the point of wiring it up.

## The sacred files

You don't own either sacred file (`schemas/events.py`, `schemas/retrieval.py`). Don't touch
them. If the eval harness needs to consume the SSE event shape, read `schemas/events.py` —
don't copy it into your own files.

See `docs/contracts.md`.

## Using a coding agent

Start every session with:

```
Read apps/germ-clone/CLAUDE.md, docs/plans/build-plan.md, docs/contracts.md, and
flows/README.md first.

I am Lanson. My ownership areas are flows/ and evaluation/.
Do not touch anything under source/ without flagging it to me first.

Sacred files: schemas/events.py and schemas/retrieval.py are owned by other devs.
Read them if needed — do not edit them.

The Meng Hai handoff rule: any change to the stage list, re-loop condition, or a prompt's
contract must be flagged to Meng Hai before it is committed. Do not silently change these.

[Task]
```

## Coordination

**You have no hard blockers in Phase 1. Your Phase 2 eval runs depend on Ben's corpus and Meng Hai's pipeline both being live.**

| Action | When | Who |
|---|---|---|
| Confirm real corpus formats with Ben | Before he writes loaders, Phase 1 | → Tell Ben the expected formats (transcript, markdown, notebook etc.) — he can't write loaders without this |
| `flows/ml-tutor.flow.json` + `flows/prompts/` first export | Phase 1 | → Tell Meng Hai it's ready so he can start re-implementing as LangGraph |
| Any change to stage list, re-loop threshold, or prompt contract | Anytime | → Tell Meng Hai before you commit — not after. This is the handoff rule |
| `flows/README.md` node→module map updated | Every flow shape change | → Keep Meng Hai's implementation in sync — don't let this drift |
| Ben's corpus seeded + Meng Hai's pipeline live | Phase 2 | ← Chase both before attempting to run golden-set evals against the live system |

**Chase:** If you haven't heard from Ben about corpus format confirmation, ping him — your Phase 1 output (loader-compatible formats) feeds directly into his work. If Meng Hai's pipeline isn't up when you need to run evals, find out his ETA so you can schedule accordingly.

---

## Stack reminders

- Langflow for visual design and prompt authoring. Export JSON + prompts after every settled
  change.
- Eval harness: f/r/c scoring (faithfulness, relevance, completeness). RAGAS-style.
  CI gate fails on regression below baseline. Minimum 10 golden pairs per surface.
- Linting of any Python in `evaluation/`: `ruff`.

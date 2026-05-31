# germ//clone — Shared Contracts

## The two sacred files

These files define the interfaces that cross ownership boundaries. Anyone may read them.
Changing them requires a heads-up to the consuming team before the PR is merged.

| File | Producer | Consumer | What it defines |
|---|---|---|---|
| `source/backend/schemas/events.py` | Meng Hai | Lik Hong (frontend) | SSE stage event shape: stage keys, status values, scores fields, `answer_md` + `citations[]` on compose |
| `source/backend/schemas/retrieval.py` | Ben | Meng Hai (RAG engine) | Retrieval result shape: `{id, mod, file, ts, snip, score, text}` |

## Rule

Everything *inside your own folder* is yours to change freely — no ceremony needed.

A change to either file above must:
1. Be discussed with the consumer **before** the PR is opened (Slack / in-person).
2. Reference this discussion in the PR description.
3. The consumer adds their approval to the PR.

## Why this matters

The mock-first approach lets frontend and engine build in parallel before the real pipeline
exists. That only works if the contract is stable. A surprise change to `events.py` breaks
the frontend's mock stream; a surprise change to `retrieval.py` breaks the engine's
retrieval call.

## Stage key invariant

The SSE `stage` field values MUST exactly match the frontend's `PIPE_STAGES` keys:

```
route  rewrite  retrieve1  react  reflect  evaluate1  retrieve2  evaluate2  compose
```

Renaming a stage key is a breaking change to `events.py` — follow the process above.

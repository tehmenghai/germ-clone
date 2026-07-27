# LLM optimisation — germ//clone

Scope: cost, latency, and prompt-efficiency posture for the agentic-RAG pipeline.
Provider/model inventory is **not** repeated here — `docs/live-design.md` § LLM dispatch is
authoritative for backends, models, and embedding configuration. This document covers the
optimisation levers and the decisions behind them.

germ//clone does not consume `shared/ai-core` (ADR-0001). Dispatch is app-local via LiteLLM
in `source/backend/llm/`, so none of the workspace ai-core fallback, gate, or telemetry
behaviour applies — everything below is implemented in-app or is an open gap.

## Cost posture

**Zero marginal cost by construction.** Every configured backend is either on-device
(Ollama) or a free tier (Groq, Cerebras, Gemini, OpenRouter). No paid provider is wired in,
so there is no runaway-bill surface. Default is `INFERENCE_BACKEND=cerebras`
(`source/backend/.env`; `llm/config.py` falls back to `ollama` when the var is unset).

The consequence is that optimisation pressure here is **latency and rate-limit headroom**,
not spend. Token efficiency still matters, but because free tiers are throughput-capped —
not because tokens cost money.

## Call surfaces

Six LLM surfaces, all routed through `llm/dispatch.py`:

| Surface | Call site | Shape | Notes |
|---|---|---|---|
| Route | `rag/nodes/route.py` | 1 call, single-token answer | Classifies query to module 3.1–3.10; regex-validated, falls back to `3.1` |
| Rewrite | `rag/nodes/rewrite.py` | 1 call, short output | Query clarification before retrieval |
| ReAct | `rag/nodes/react.py` | 1 call, medium output | Think/Act/Observe over retrieved chunks |
| Reflect | `rag/nodes/reflect.py` | 1 call, ≤1 sentence | Gap detection; drives the retrieve-2 reloop |
| Compose | `rag/nodes/compose.py` | 1 **streamed** call, long output | Final answer; the only `astream_complete` surface |
| Evaluate | `rag/evaluator.py` | 1 call, small JSON | f/r/c scoring; degrades to `(0.5, 0.5, 0.5)` on parse failure |

A single question costs **5–7 LLM calls** depending on whether Reflect triggers the reloop.
Reflect is therefore the highest-leverage surface for latency: it alone decides whether the
pipeline pays for a second retrieval plus another ReAct/Compose pass.

## Context budgeting

Truncation is applied at every point where text enters a prompt — this is the main
implemented token-efficiency control:

| Site | Budget |
|---|---|
| `react.py` | chunk text `[:500]` |
| `compose.py` | chunk text `[:600]`, ReAct reasoning `[:800]` |
| `evaluator.py` | chunk text `[:400]` |
| `reflect.py` | snippets only (`c.snip`), ReAct reasoning `[:600]` |

Retrieval depth: `top_k=8` on the first pass, `top_k=6` on the reloop, merged and deduped
(`rag/nodes/retrieve.py`). Source weighting is applied post-retrieval via `_SOURCE_WEIGHTS`
and clamped to 1.0.

These constants are hard-coded at each call site. That is fine at current scale but means a
context-budget change is a six-file edit — see gaps below.

## Prompt discipline

System prompts are inline module constants (`_SYSTEM`) rather than a `prompts/` directory.
Deliberate, given each is tightly coupled to its node's parsing logic — but it means prompts
are not independently versioned, and the workspace `prompts/**` eval trigger cannot fire.

Two prompts carry real engineering and should not be edited casually:

- **Route** encodes the module taxonomy *and* its collision rules — "k" means one thing in
  KNN (3.2) and another in k-means (3.5). The prompt instructs classification by intent
  rather than keyword overlap. Regressions here are silent: a misroute degrades retrieval
  quality without surfacing an error.
- **Compose** enforces citation discipline: a bracket after every chunk-derived claim and
  equation, and an explicit prohibition on the model writing its own References section —
  that list is built from actually-retrieved chunks in code (`compose.py:124`), not from
  model recall. This is the anti-fabrication control for the answer surface.

## Known gaps

Recorded as current state, not as accepted design:

1. **No generation parameters are set anywhere.** No surface passes `temperature`,
   `max_tokens`, or `top_p` — every call uses provider defaults, which differ across the
   five backends. Route (wants near-deterministic) and Compose (wants fluency) run at
   identical settings, and the same prompt yields different behaviour on Ollama vs Cerebras.
   Lowest-effort, highest-value fix: pin `temperature=0` on Route, Reflect, and Evaluate.
2. **No fallback chain.** `llm/dispatch.py` raises `RuntimeError` on a missing API key and
   propagates provider errors. Backend selection is global and runtime-mutable
   (`POST /settings/inference`), so a rate-limited provider fails the request rather than
   degrading to Ollama. ai-core consumers get this behaviour for free; germ//clone does not.
3. **No call telemetry.** Nothing writes `data/ai_calls.jsonl`. There is no per-surface
   record of latency, token count, or failure rate, so none of the tuning above can be
   measured — only reasoned about.
4. **Eval harness is empty.** `evaluation/` contains only `.gitkeep`, against the workspace
   AI Eval Standard (minimum 10 golden input→expected-output pairs per surface). The
   in-pipeline f/r/c evaluator (`rag/evaluator.py`) scores individual answers at runtime but
   is not a regression harness — it has no golden set and no baseline to fail against.
   Route is the natural first target: its output is a single label, making golden pairs
   cheap to write and unambiguous to score.

Gaps 3 and 4 are coupled — a golden set gives the baseline, telemetry gives the measurement.
Neither should be closed by adopting ai-core; ADR-0001 settled that, and revisiting it is an
ADR-level decision, not an optimisation one.

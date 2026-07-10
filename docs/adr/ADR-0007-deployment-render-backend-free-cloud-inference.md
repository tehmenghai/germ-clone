# ADR-0007 — Deployment: Vercel frontend + Render backend, free-cloud inference

**Date:** 2026-06-13
**Status:** Proposed — awaiting 4-dev sign-off (see §Review)
**Decider:** Meng Hai (deploy owner) — with team review
**Companion plan:** `docs/plans/deployment.md`

## Context

We need a persistent shared **dev/demo** URL so the team and the occasional instructor can use
the app without each running it locally. The existing direction (live-design §Deployment
target) was a two-line sketch — "Vercel frontend + a Python host" — with the host unnamed, the
inference path unresolved, and the embedding question open. This ADR closes those.

The decisive constraint is **inference cost**. The app defaults to **Ollama-local** for
development, but Ollama on a server needs a large-RAM/GPU box that blows past every free tier —
that, not FastAPI, is the expensive part of deploying. We do **not** want a runaway-cost or a
GPU-rental surface for a demo.

Investigation of the current code resolved the embedding worry that would otherwise force a
re-embed:

- Completions already route to **Groq** via the free-cloud toggle (`llm/dispatch.py`,
  ADR-0001).
- Embeddings already default to **Gemini `gemini-embedding-2`** at **output dimension 768**
  (`embedding_config.py`, `ingestion_config.yaml`), which matches the existing
  `vector(768)` pgvector column.

So a deployed instance needs **no Ollama**, no GPU, and no corpus re-embedding.

## Decision

Deploy as a free-tier, free-cloud-inference stack:

1. **Frontend → Vercel free tier.** Static/SSR Next.js; SSE consumed from the backend origin.
2. **Backend → Render free web service.** Long-running FastAPI + in-process LangGraph + SSE.
   Packaged as a Dockerfile (python:3.12-slim + `uv`).
3. **Deployed inference = free-cloud only.** `INFERENCE_BACKEND=groq` for completions; Gemini
   768-dim for embeddings. Ollama is **disabled on deploy**, retained for local dev.
4. **DB → existing Neon + pgvector**, on a dedicated **`deploy` branch** seeded with the
   Gemini-embedded corpus (branch-per-dev stays for development; ADR-0003 unchanged).
5. **Access → passphrase gate ON** (`PASSPHRASE_REQUIRED=true`, ADR-0005); single shared
   passphrase via secret env var.

**Fallback host:** if Render's ~30–50 s cold-start (after ~15 min idle) proves too annoying,
migrate the same Dockerfile to **Fly.io** and keep one instance warm. This is a reversible
operational tweak, not a re-decision.

## Consequences

**Positive**
- **$0 standing cost.** All four tiers (Vercel, Render, Neon, Groq, Gemini) on free plans.
- **No GPU/large-RAM box, no runaway-bill surface** — honours the project's cost ethos.
- **No corpus re-embed and no ADR-0004 change** — Gemini's 768-dim output already matches the
  schema.
- Minimal build surface: a Dockerfile, host config, secrets, and an SSE/CORS check.

**Negative / accepted trade-offs**
- **Cold starts on Render free** (~30–50 s first hit after idle). Accepted for a demo; Fly.io
  is the escape hatch.
- **Deployed answer quality differs from local Ollama** — Groq `llama-3.1-8b-instant` is the
  deployed model, so demo behaviour won't be identical to a dev's local Ollama run. Eval must
  run against the deployed path (Lanson, plan §5.8).
- **Free-tier daily caps** on Groq/Gemini can be exhausted under unexpected load. Fine for
  demo; a real cohort needs paid ceilings (plan §8).
- **Single instance.** SSE + in-process LangGraph state assume one box; no horizontal scale
  until a cohort deploy.

**Neutral**
- The shared `deploy` Neon branch holds demo profiles/conversations (ADR-0005), distinct from
  per-dev branches.

## Alternatives considered

- **Self-host Ollama on a server** — full local-model parity, but needs a paid GPU/large-RAM
  box (~$20–80+/mo). Rejected: cost, and contrary to the no-runaway-bill stance. Free-cloud
  toggle already exists for exactly this.
- **Vercel for the backend too** — rejected: serverless timeouts kill long-running SSE.
- **Single VM running everything (frontend + backend + Ollama + Postgres)** — rejected: more
  ops burden, no free tier, reinvents what Vercel/Neon already give us free.
- **Re-embed corpus to a different model on deploy** — rejected as unnecessary once Gemini was
  confirmed at 768-dim; would have meant an ADR-0004 amendment and a full re-embed.

## Review (sign-off gate)

This ADR is **Proposed**. It becomes **Accepted** when all four sign off:

| Dev | Sign-off |
|---|---|
| Lik Hong (lead, FE) | ☐ |
| Ben (ingest/corpus/DB) | ☐ |
| Meng Hai (RAG/CI, deploy owner) | ☐ |
| Lanson (flows/eval) | ☐ |

## References

- `docs/plans/deployment.md` — execution plan + per-owner task list
- ADR-0001 — app-local LiteLLM dispatch (free-cloud toggle)
- ADR-0003 — Neon + pgvector, branch-per-dev
- ADR-0004 — nomic-embed-text default embedding (unchanged; Gemini already the deploy default)
- ADR-0005 — passphrase gate + profiles + persistence

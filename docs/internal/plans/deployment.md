# germ//clone — Deployment Plan (shared dev/demo)

**Status:** Draft for team review
**Date:** 2026-06-13
**Author:** Lik Hong (lead) — drafted for the 4-dev team
**Owner of execution:** Meng Hai (per ownership map + live-design §Deployment target)
**Decision record:** ADR-0007 (proposed, accompanies this plan)

> **What this is.** A concrete, costed deployment proposal for a **persistent shared
> dev/demo URL** — somewhere the 4 devs (and the occasional instructor) can use the app
> without each running it locally. **Not** a production student-cohort deployment; that is a
> later phase with different sizing (see §8). Review, mark up, and sign off in §9.

---

## 1. Decisions already settled by the build

These come straight from existing code/ADRs and are **not** open for the deploy discussion:

| Layer | Choice | Where it's fixed |
|---|---|---|
| Frontend | Next.js → **Vercel free tier** | live-design §Deployment target |
| DB | **Neon Postgres + pgvector**, already cloud, free tier | ADR-0003 |
| Chat inference (deployed) | **Free-cloud toggle** (Groq `llama-3.1-8b-instant`) | ADR-0001; `llm/dispatch.py` |
| Embeddings (deployed) | **Gemini `gemini-embedding-2`, output dim 768** | `embedding_config.py` default; `ingestion_config.yaml` |
| Access | **Shared passphrase gate**, active on deploy | ADR-0005 |

**Key finding (de-risks the whole plan):** the deployed instance does **not** need Ollama.
Both default cloud paths already exist in code — Groq for completions, Gemini for embeddings —
and Gemini is pinned to **768-dim output**, which matches the existing `vector(768)` pgvector
column. **No re-embedding of the corpus, no GPU box, no ADR-0004 amendment.** The backend
therefore fits on a tiny free host.

---

## 2. Target architecture

```
   Vercel (free)              Render free  (or Fly.io)            Neon (free)
 ┌────────────────┐         ┌──────────────────────────┐       ┌──────────────┐
 │ Next.js        │──HTTPS──▶│ FastAPI + LangGraph      │─asyncpg▶│ Postgres      │
 │ frontend       │         │ inference = free-cloud    │       │ + pgvector    │
 │ passphrase UI  │◀──SSE───│ 8007 → :443              │       │ (deploy branch)│
 └────────────────┘         └────────────┬─────────────┘       └──────────────┘
                                         │ HTTPS
                              ┌──────────┴──────────┐
                              │ Groq  (chat LLM)    │  free tier
                              │ Gemini (embeddings) │  free tier
                              └─────────────────────┘
```

Three of four tiers are already free cloud services. **The only new infra decision is the
backend host** (§3), and the only build work is packaging + secrets + an SSE/CORS check (§5).

---

## 3. Backend host — recommendation: Render free, Fly.io as fallback

Vercel cannot host the backend: FastAPI is long-running and the answer path is **SSE**, which
serverless function timeouts kill. We need a small always-addressable box.

| | **Render (free web service)** | **Fly.io** |
|---|---|---|
| Cost (this use) | $0 | $0 within free allowance |
| Cold start | Spins down after ~15 min idle → ~30–50 s first hit | Wakes faster; can keep 1 warm |
| SSE streaming | Works, no response buffering | Works |
| Deploy unit | Dockerfile or native Python | Dockerfile (`fly launch`) |
| Setup effort | Lowest | Slightly more config |

**Recommendation:** start on **Render free**. The only cost is a ~30–50 s cold start on the
first hit after idle — acceptable for "devs try it occasionally." If the cold start becomes
annoying in practice, migrate to **Fly.io** (same Dockerfile, ~half-day job) and keep one
instance warm. **Do not pay for anything until someone actually complains.**

> Open for review: anyone with a strong Render-vs-Fly preference, flag it in §9. Meng Hai owns
> the call as deploy owner.

---

## 4. Environment & secrets

One secret set per host, configured in the host dashboard (never committed):

| Var | Value | Notes |
|---|---|---|
| `INFERENCE_BACKEND` | `groq` | forces free-cloud completions on deploy |
| `GROQ_API_KEY` | _(secret)_ | Groq free tier |
| `EMBEDDING_PROVIDER` | `google` | already the default |
| `EMBEDDING_MODEL` | `gemini-embedding-2` | 768-dim |
| `GEMINI_API_KEY` | _(secret)_ | Gemini free tier |
| `DATABASE_URL` | Neon **deploy-branch** pooled conn string | see §6 |
| `PASSPHRASE_REQUIRED` | `true` | gate ON (off locally) |
| `APP_PASSPHRASE` | _(secret)_ | the shared passphrase |
| `FRONTEND_ORIGIN` | Vercel app URL | CORS allow-list |

Frontend (Vercel env): `NEXT_PUBLIC_API_BASE` → the Render/Fly backend URL.

> **Action — Meng Hai:** confirm every var above is actually read by the code today. The
> passphrase gate in particular (`PASSPHRASE_REQUIRED`) must be verified to flip on, since it's
> bypassed in all local runs and may be under-tested.

---

## 5. Work to build (nothing architecturally deep)

| # | Item | Owner | Notes |
|---|---|---|---|
| 5.1 | **Backend `Dockerfile`** (python:3.12-slim, `uv` install, uvicorn) | Meng Hai | none exists today |
| 5.2 | Render/Fly service config (`render.yaml` / `fly.toml`) | Meng Hai | |
| 5.3 | **CORS allow-list** = `FRONTEND_ORIGIN` | Meng Hai | currently likely `*` or localhost |
| 5.4 | **SSE smoke check on host** — confirm no proxy buffering breaks the stream | Meng Hai | Render doesn't buffer; verify end-to-end |
| 5.5 | Vercel project + `NEXT_PUBLIC_API_BASE` wiring | Lik Hong | |
| 5.6 | **Verify passphrase gate activates** with `PASSPHRASE_REQUIRED=true` | Lik Hong + Meng Hai | ADR-0005 path |
| 5.7 | **Neon deploy branch** seeded with embedded corpus | Ben | §6 |
| 5.8 | Eval harness runs green against the deploy branch corpus | Lanson | confirms retrieval works post-deploy |

Estimated effort: **~1–2 days**, mostly 5.1 + secrets + the SSE/CORS verification.

---

## 6. Database: one shared deploy branch

`branch-per-dev` (ADR-0003) is for development. Deployment reads **one stable Neon branch**:

- Ben cuts a `deploy` branch off `main`, runs ingestion → embeds the seed corpus with
  **Gemini 768-dim** (the same path the app uses at query time, so corpus and query vectors
  share an embedding space — important).
- The deployed backend points `DATABASE_URL` at this branch's **pooled** connection string.
- User profiles + conversation history (ADR-0005) persist here. It is shared demo data, not
  per-dev — fine for a study-team demo.

> **Action — Ben:** confirm the deploy-branch corpus is embedded with Gemini, not a stale
> Ollama/nomic run. Mixed embedding spaces silently wreck retrieval quality.

---

## 7. What we are explicitly NOT doing (v1 deploy)

- **No Ollama on the server.** Deploy = free-cloud only. Local dev keeps Ollama.
- **No paid host, no GPU.** If free tiers prove too slow, that's a *new* decision, not a
  silent upgrade.
- **No autoscaling / multi-instance.** Single instance; SSE + in-process LangGraph state
  assume one box.
- **No custom domain / TLS management.** Use the host-provided `*.onrender.com` /
  `*.vercel.app` URLs.
- **No real auth.** Passphrase + profiles only (ADR-0005).

---

## 8. Path to a real student-cohort deployment (later)

Recorded so we don't confuse the two. A graded cohort would add: warm always-on backend (paid
Render/Fly tier or a small VM), connection-pool sizing for concurrent SSE, per-student Neon
sizing or row-level scoping, rate limiting on `/ask`, and a cost ceiling on Groq/Gemini free
tiers (they have daily caps that a class can exhaust). **None of that is in scope here** — this
plan is the demo, that's the product.

---

## 9. Team review & sign-off

Mark your row. Raise blocking concerns inline above or in the journal.

| Dev | Area to check | Sign-off |
|---|---|---|
| **Lik Hong** (lead, FE) | Vercel wiring, passphrase UX, overall plan | ☐ |
| **Ben** (ingest/corpus/DB) | §6 deploy branch + Gemini-embedded corpus | ☐ |
| **Meng Hai** (RAG/CI, deploy owner) | §3 host choice, §5 Dockerfile/CORS/SSE, secrets | ☐ |
| **Lanson** (flows/eval) | §5.8 eval green against deploy branch | ☐ |

Once all four sign off, ADR-0007 moves **Proposed → Accepted** and execution starts.

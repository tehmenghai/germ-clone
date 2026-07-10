# germ//clone — E2E Functional & UX Test Report

**Date:** 2026-06-10
**Tester:** Lik Hong (Claude-assisted manual E2E, Playwright-driven)
**Build:** working tree at `main` (local dev, `launch.sh`)
**Environment:** WSL2, backend :8007 (uvicorn reload), frontend :3007 (next dev), Neon Postgres (shared branch), Ollama local (CPU), OpenRouter free tier
**LLM under test:** `ollama/llama3.2` (initial), then `openrouter/nemotron-3-super-120b-a12b:free` (switched mid-session on instruction; `.env` default now `INFERENCE_BACKEND=openrouter`)

---

## Verdict

The core product loop **works end-to-end on the OpenRouter path**: question → 9-stage self-correcting pipeline with live SSE stage events → scored evaluation (f/r/c + PASS verdict) → token-streamed, cited, equation-rendered answer → resolvable sources panel → topic-matched interactive visualisation. The agent-trace UX is genuinely good.

It is **not demo-ready** in this state. Three P1 defects: the model's chain-of-thought is rendered into the student-facing answer; the Ollama (default-documented) path produced **zero SSE events across two full runs** with no error surfaced; and abandoned requests keep consuming LLM quota server-side. None of FR-06/07/09/10/11 persistence/access requirements are implemented yet.

---

## What was tested and passed

| Area | Result |
|---|---|
| Launch (`launch.sh`), `/health`, OpenAPI surface | ✅ Both services up; port handling clean |
| `GET/POST /settings/inference` | ✅ Round-trips; invalid value → 422; legacy `cloud` alias accepted |
| Settings drawer ↔ API integration | ✅ Selecting Groq POSTed and persisted server-side; header pill updates live (`nemotron-120b:free`) |
| Pipeline stage streaming (FR-02/03) | ✅ On OpenRouter: route → rewrite → retrieve1 → react → reflect → evaluate1 (f=1.0, r=0.8, c=0.9, PASS) → compose, 155 tokens streamed (API run); UI run scored 92% PASS |
| Conditional reloop logic | ✅ mean ≥ 0.80 correctly skipped retrieve2/evaluate2 (reloop branch itself not exercised — needs a forced-fail case) |
| pgvector retrieval | ✅ 8 chunks returned with module attribution and source weighting |
| Citations (FR-12) | ✅ Superscript `[n]` links; sources panel resolves all 5 with provenance (PDF page numbers, transcript VTT timestamps, quoted chunk text); no raw HTML injection (NFR-04) |
| Interactive viz (FR-04) | ✅ RegularizationViz topic-matched, live λ slider, L1/L2/ElasticNet switching, aria-label updates with state |
| Math panel | ✅ Three KaTeX equations with plain-language captions |
| Agent trace drawer | ✅ Live stage updates, per-stage detail, f/r/c scorecard, `role="status"` on running indicator; scrim click dismisses |
| View modes (FR-05) | ✅ Reality and Matrix both render; conversation state survives mode switch; coverage bar highlights the active module; rain canvas + console prompt present |
| Themes (FR-06, partial) | ✅ `data-theme` applies to both themes and all components incl. viz |
| Difficulty tabs (FR-07, partial) | ✅ Proper tablist/aria-selected; `difficulty` param sent on `/ask` |
| Input state machine | ✅ Send disabled while empty and during stream; re-enables on completion |
| Keyboard navigation | ✅ Header controls reachable by Tab with visible focus outline |
| Mobile (390px) | ✅ Single column, no horizontal overflow, input pinned (mobile-first is out of scope v1) |
| Console hygiene | ✅ Zero browser console errors/warnings across the session |

---

## Defects

### P1 — ship blockers

**P1-1 · Chain-of-thought leaks into the student answer.**
With the Nemotron reasoning model, the rendered answer opens with ~15 paragraphs of internal planning ("We need to answer… Must cite every factual claim… Let's structure answer:… Proceed.") followed by a skeleton draft, then the real answer. Root cause is in `source/backend/llm/dispatch.py`: `complete()` falls back to `reasoning_content`, and the compose streaming path yields reasoning deltas as answer tokens. Every reasoning-capable model on the free-cloud tiers will do this. Fix: drop `reasoning_content` from the student-facing stream (keep it for the trace if wanted — it would actually be a great trace artefact).

**P1-2 · Ollama path streams nothing — and no error ever surfaces.**
Two full runs against local Ollama (180s and 240s) produced **zero SSE events** — not even an error event. Contributing causes: cold model load took ~100s (CPU/WSL2); the first event is only emitted *after* the route node's LLM call completes (`app/routes/ask.py` emits no handshake at stream open); no timeout on `litellm.acompletion`; 43 LiteLLM error banners in the backend log with the actual exception text swallowed. A student on the documented default sees "thinking…" forever. NFR-01 (first event < 1s) fails on both paths — OpenRouter's first event arrived at **15.4s**. Fix: emit a `route/active` handshake immediately on stream open, set per-call timeouts, surface errors as SSE error events, and log the exception.

**P1-3 · Abandoned requests keep burning LLM quota.**
`asyncio.create_task(_run_graph())` is never cancelled when the client disconnects. After my curl timeouts, orphaned graphs kept running (observed: two idle Ollama connections from dead runs; run 3's compose still streaming server-side after disconnect) — slowing the live UI run and burning free-tier quota. Fix: cancel the graph task in a `finally`/disconnect handler on the StreamingResponse.

### P2 — must fix before users

**P2-1 · FR-09 persistence is absent on both ends.** `/profiles` is an in-memory stub (documented Phase 2), but the frontend never calls it at all — `ProfilePicker.tsx` ships hardcoded Neo/Morpheus/Trinity and fabricates IDs client-side. No conversation endpoints exist. A page refresh loses profile and conversation.

**P2-2 · FR-06 theme persistence not implemented.** No `localStorage` usage anywhere in the frontend; `gc-theme` is never written. Theme resets on reload. Also the fresh-load default is **clinical**, not matrix-dark as specified.

**P2-3 · Markdown rendering gaps mangle every answer.** Tables render as raw pipe-text (the L1/L2 comparison table — the most useful part of the answer — is unreadable); bullet lists collapse into single run-on paragraphs; list items containing inline math fragment into stray `-` paragraphs. Conspicuous on mobile.

**P2-4 · Matrix-theme readability.** The digital-rain canvas renders behind the answer text with insufficient backdrop opacity — glyphs visibly interleave with long-form prose. Atmospheric on the console, hostile for reading. Suggest higher panel opacity or pausing rain behind the answer column.

**P2-5 · NFR-03 partially unmet.** The inline "thinking…" indicator has no `role="status"`/`aria-live` (the spec names this exact element); the trace drawer's running badge does have one. Profile name input relies on placeholder for its accessible name.

**P2-6 · Stale / incorrect UI copy.** Settings drawer says "Wires to `POST /settings/inference` once engine is ready" — it is wired and working. Ollama card badges llama3.2 as "~8B" (it's 3.2B). Coverage-bar footer ("142 hrs transcripts · 4 textbooks · 38 notebooks indexed") is hardcoded in `page.tsx`, not derived from the corpus.

### P3 — track

- **P3-1 · Spec drift on FR-08 and ADR-0004.** API enum is five providers + legacy `cloud`, not the documented binary Ollama/free-cloud toggle (the implementation is better — update the docs). `GET /settings/embedding` reports `google/gemini-embedding-2`, not the ADR-0004 nomic default — if deliberate, it needs a journal entry/ADR amendment.
- **P3-2 · Reflect detail always reads "gaps identified — requery planned"** even when evaluate then passes without requery. Confusing in the trace.
- **P3-3 · Routing/retrieval relevance.** "How do I choose k in KNN?" (chip-labelled 3.2) routed to 3.3 with chunks from 3.3–3.6; eval scored r=0.8. Worth a golden-set case.
- **P3-4 · Mobile header truncates** (view-mode tabs clipped; remaining controls inaccessible). Out of scope v1 — noting for the backlog.
- **P3-5 · FR-10 passphrase gate** not yet present in any form (activates on deploy per spec — untestable locally, unverified).

---

## Requirements traceability

| Req | Status | Evidence |
|---|---|---|
| FR-01 answers grounded in corpus | ✅ Pass | Cited answer from mod 3.4 chunks, prose + math; (code block not exercised by this question) |
| FR-02 self-correcting pipeline | ✅ Pass (pass-branch) | Stage sequence + scores + PASS verdict; reloop branch untested |
| FR-03 stage streaming | ⚠️ Partial | Works on OpenRouter; **zero events on Ollama path** (P1-2) |
| FR-04 interactive viz | ✅ Pass | RegularizationViz interactive + theme-aware |
| FR-05 two view modes | ✅ Pass | Reality + Matrix verified, state preserved across switch |
| FR-06 themes | ⚠️ Partial | Both themes apply; **no persistence**, wrong default (P2-2) |
| FR-07 difficulty levels | ✅ Pass (UI) | Param transmitted; prompt-level effect not assessed |
| FR-08 inference toggle | ✅ Pass | Five-provider toggle wired end-to-end; spec text outdated (P3-1) |
| FR-09 profiles & persistence | ❌ Fail | Stub backend, unwired frontend (P2-1) |
| FR-10 passphrase gate | — Untested | Deploy-only by design |
| FR-11 corpus management | ❌ Not implemented | No API routes; UI buttons disabled "not yet available" |
| FR-12 citation rendering | ✅ Pass | Structured citations, resolvable sources, no raw HTML |
| NFR-01 first event < 1s | ❌ Fail | 15.4s (OpenRouter); ∞ (Ollama) |
| NFR-03 accessibility | ⚠️ Partial | Good aria on tabs/viz/trace; thinking indicator gap (P2-5) |
| NFR-04 no XSS surface | ✅ Pass | Markdown + citation IDs rendered structurally |

## Pipeline latency (OpenRouter free tier, nemotron-120b)

| Stage | Wall-clock from request |
|---|---|
| route | 15.4s |
| rewrite | 94.7s |
| retrieve1 | 98.7s (pgvector + Gemini embed: ~4s) |
| react | 140.8s |
| reflect | 169.2s |
| evaluate1 | 198.5s |
| compose first tokens | ~205s |

UI run end-to-end (ask → complete answer): **~6 minutes**. Free-tier latency plus serial LLM stages; concurrent orphaned runs (P1-3) inflated some figures. Even halved, this needs progress affordances beyond "stage done" ticks — per-stage `active` events would let the UI show what's running rather than what's finished.

## Configuration changes made during this test

- `source/backend/.env`: `INFERENCE_BACKEND=ollama` → `openrouter` (per instruction — local default only).
- Not changed (flagging for a deliberate follow-up): `llm/config.py` fallback default, `.env.example`, project `CLAUDE.md` and FR-08 all still document Ollama-local as the default. If OpenRouter is to be the team default, that's a contract-adjacent change for Meng Hai's area plus a docs reconciliation.

## Artefacts

- SSE event logs: `/tmp/germ-sse-run{1,2,3}.log` (timestamped per line)
- Screenshots: `/tmp/playwright-mcp/germ-{01-reality-light,mobile-390,matrix-mode,matrix-dark}.jpeg`
- Backend log: `/tmp/germ-clone-launch.log`

## Recommended fix order

1. Strip `reasoning_content` from the compose stream (P1-1) — one-file fix, biggest trust win.
2. Handshake event on stream open + LLM call timeouts + SSE error surfacing (P1-2).
3. Cancel graph task on client disconnect (P1-3).
4. Markdown table/list rendering (P2-3) — every answer benefits.
5. Wire ProfilePicker to `/profiles` and persist theme (P2-1, P2-2).
6. Copy sweep: settings caption, model size badge, coverage stats (P2-6).
7. Docs reconciliation: FR-08 toggle reality, embedding provider vs ADR-0004, default backend decision (P3-1).

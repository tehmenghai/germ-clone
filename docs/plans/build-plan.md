# germ//clone — Module 3 ML Tutor (Agentic RAG) — Build Plan

## Context

An AI ML tutor styled as a "digital twin" of an instructor. Students ask ML questions
(modules 3.1–3.10); the app runs a **self-correcting agentic RAG pipeline**
(route → rewrite → retrieve → ReAct → reflect → evaluate → re-retrieve → compose) grounded in
a course corpus, and renders each answer alongside an **interactive visualization** and the
**underlying math**. Two view modes: *Reality* (reading) and *Matrix* (console/terminal),
matrix-green dark theme + clinical light theme.

**This is a shared team build (4 devs).** Key architectural decisions, all confirmed:

- **App-local LLM dispatch** via LiteLLM — one interface over Ollama + cloud providers,
  driving the settings drawer's Ollama-local / free-cloud toggle.
- **Orchestration:** one code-first runtime engine (**LangGraph**); **Langflow is a
  design/authoring sketchpad only**, never on the request path. No user-facing engine toggle.
- **DB:** **Neon Postgres + pgvector**, branch-per-dev (each dev gets an isolated Neon branch
  off main).
- **Embeddings:** **`nomic-embed-text`** via Ollama (768-dim) as default; switchable per
  inference setting.
- **Inference toggle:** **Ollama-local (default) / free-cloud only** — paid cloud removed
  (no runaway-bill surface).
- **Users & persistence:** real **user profiles**, conversations persisted **server-side** per
  profile (not client-only localStorage). Profile-picker entry (study team; no passwords).
  See ADR-0005.
- **Answer contract:** LLM composes **structured markdown + citation IDs**, rendered
  client-side — not raw HTML (no XSS sanitisation burden).
- **Scope:** real working RAG over a *seed demo corpus* (the 4 ML topics + a handful of real
  docs), with a **clear-corpus + incremental user upload** capability.
- **Ports:** backend **8007**, frontend **3007**.

Design source: the handoff bundle in `design_handoff_ml_tutor/` — `README.md` is the
authoritative spec (tokens, layouts, measurements, animations); `prototype/*.jsx` + `styles.css`
are the reference implementation.

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js (App Router) + TS strict, Tailwind, pnpm | Design tokens → CSS vars on `html[data-theme]` exactly as handoff specifies |
| Backend | Python 3.12, FastAPI async, SQLAlchemy 2 async + Alembic, `uv` | Async required to stream pipeline events |
| Orchestration | **LangGraph** (runtime) · Langflow (design sketchpad) | Native conditional re-loop edge; per-node streaming maps 1:1 to UI stages; testable in-repo |
| LLM dispatch | **LiteLLM** (app-local `llm/` module) | One interface over Ollama + free-cloud providers; powers the inference toggle |
| Embeddings | `nomic-embed-text` via Ollama (768-dim) | Strong retrieval, local, zero-cost default; switchable |
| Inference toggle | **Ollama-local (default) / free-cloud** (paid removed) | No runaway-bill surface |
| Users | **Profiles + server-side persistence**, profile-picker entry | Conversations survive device switch; no passwords (ADR-0005) |
| Answer format | **Structured markdown + citation IDs** (client-rendered) | No XSS surface; citations become data not embedded HTML |
| Vector + relational | **Neon Postgres + pgvector**, branch-per-dev | Single store; Neon branching isolates each dev |
| Streaming transport | SSE (Server-Sent Events) | One-way stage events; simpler than WS for this shape |
| Eval | Golden-set harness, faithfulness/relevance/completeness (f/r/c) | The f/r/c scores the UI shows become a real RAGAS-style harness; CI-gated |
| Difficulty | `eli5` / `standard` / `academia` | Unified label and state value |
| Access gate | Shared passphrase (activates on deploy; off locally) | One door for the study team; profiles handle identity inside (ADR-0005) |
| Deploy | Local now → frontend on Vercel, backend (FastAPI + Ollama/Neon) on a Python host | Vercel can't host FastAPI+Ollama; designed for the eventual split |

---

## The pipeline contract (keystone — Ben publishes first)

The canonical stage list comes from `prototype/pipeline.jsx:7` (`PIPE_STAGES`). The real version
is a **LangGraph** graph with a conditional back-edge:

```
route → rewrite → retrieve(hop1) → react → reflect → evaluate(pass1)
   └─ if mean(f,r,c) < 0.80 → re-retrieve(hop2) → evaluate(pass2) → compose
   └─ else ───────────────────────────────────────────────────────→ compose
```

Backend streams **SSE events** the UI renders:

```jsonc
{ "stage": "retrieve1", "status": "active", "detail": "6 chunks — lesson 3.3 …" }
{ "stage": "evaluate1", "status": "done", "scores": {"f":0.71,"r":0.88,"c":0.60}, "verdict": "BELOW 0.80, reloop" }
{ "stage": "compose",   "status": "done", "answer_md": "...structured markdown...", "citations": [{"id":1,...}], "sources": [...] }
```

Stage keys MUST match the UI's `PIPE_STAGES` keys: `route, rewrite, retrieve1, react, reflect,
evaluate1, retrieve2, evaluate2, compose`. This contract decouples the **frontend** (builds
against a mock event stream) from the **engine** — neither blocks the other.

---

## Team & work breakdown

| Role | Stream | Owns (directories) |
|---|---|---|
| **Lik Hong (Lead, UI-UX)** | Frontend + project ownership | `source/frontend/` |
| **Ben** | Ingest & Corpus + Neon/migrations | `source/backend/ingestion/`, `repository/`, `alembic/` |
| **Meng Hai** | RAG engine + CI/deploy | `source/backend/rag/`, `llm/`, `streaming/`, `app/` |
| **Lanson** | Langflow design + eval harness | `flows/`, `evaluation/` |

Platform work is distributed: **Neon branch-per-dev + Alembic migrations → Ben** (owns the DB
schema); **CI + deployment → Meng Hai** (owns the runtime). Lik Hong carries the full UX stream
including the 4 visualizations.

### Folder-level ownership

```
source/backend/
├── ingestion/          ← BEN      loaders/{transcript,markdown,textbook,notebook}, chunker, embedder(nomic), api(clear+upload)
├── repository/         ← BEN      pgvector queries; models.py = documents, chunks, embeddings
├── alembic/            ← BEN      migrations + Neon branch-per-dev wiring
├── rag/                ← MENG HAI graph.py (LangGraph 9 stages + reloop), nodes/*, evaluator.py (f/r/c)
├── llm/                ← MENG HAI LiteLLM dispatch + provider config; GET/POST /settings/inference
├── streaming/          ← MENG HAI SSE emitter
├── app/                ← MENG HAI main.py, routes, DI wiring
└── schemas/            ← SHARED CONTRACT — changes require heads-up to the consumer
    ├── retrieval.py    (Ben → Meng Hai: {id, mod, file, ts, snip, score, text})
    └── events.py       (Meng Hai → Lik Hong: SSE stage event; compose carries answer_md + citations[], not HTML)

source/frontend/        ← LIK HONG
├── lib/mock-stream.ts  built from schemas/events.py day 1; flip to live import when engine lands
└── components/{shell,pipeline,workspace,viz,settings}/

flows/                  ← LANSON   ml-tutor.flow.json (design source of truth), prompts/, README (flow→rag/nodes map)
evaluation/             ← LANSON   golden-set, f/r/c metrics, CI gate
```

### Enforcement (non-negotiable, baked into scaffold)

- **`.github/CODEOWNERS`** maps every directory above to its owner; PRs auto-route, nobody
  merges into another owner's area without their review.
- **`docs/contracts.md`** names the two **sacred files** — `schemas/events.py` and
  `schemas/retrieval.py` — and the rule: a change to a sacred file requires a heads-up to the
  consumer before merge.
- **Mock-first** breaks the dependency order (Ben → Meng Hai → Lik Hong) so it never becomes a
  *blocking* order: the frontend and the engine both build against the contract before the real
  thing exists.

### The Lanson → Meng Hai handoff (the riskiest seam)

Langflow JSON is **not executable LangGraph**. Lanson's `flows/ml-tutor.flow.json` is the
**design spec and source of truth for flow shape + prompts**; Meng Hai **re-implements** it as the
LangGraph graph in `rag/`. Managed by:

- Lanson re-exports `flows/ml-tutor.flow.json` + extracted `flows/prompts/` on every settled change.
- `flows/README.md` maps each Langflow node → the corresponding `rag/nodes/*` module.
- Any flow change that alters the **stage list, the re-loop condition, or a prompt's contract**
  is raised to Meng Hai before Lanson considers it "shipped".
- Eval (Lanson's `evaluation/`) is the feedback loop that catches divergence: if the LangGraph
  runtime's f/r/c drifts from the flow's intent, the golden-set gate fails in CI.

### Dependency flow — who is waiting for whom

The critical path is linear. Everything off it can be built in parallel.

```
BEN (Ingest & Corpus)
  └── Neon schema + Alembic migrations + pgvector store populated
        │
        │  Ben must land first — RAG engine has nothing to query without a live store
        ▼
MENG HAI (RAG Engine + CI)
  └── LangGraph pipeline + f/r/c evaluator + SSE stream live on :8007
        │
        │  Meng Hai must stabilise schemas/events.py + pipeline stage keys
        ├─────────────────────────────────────────┐
        ▼                                         ▼
LIK HONG (Frontend)                        LANSON (Eval)
  Consumes live SSE stream                   Runs golden-set harness against
  Flips mock-stream.ts → live import         live pipeline + real corpus
```

**Critical path:** Ben's corpus → Meng Hai's pipeline → Lik Hong's live wiring + Lanson's CI eval

**What can be built in parallel (no blocker):**

| Stream | Parallel work |
|---|---|
| Lik Hong | Full UI shell, both themes, all 4 visualisations, pipeline rail, settings drawer — all wired to `mock-stream.ts`. No dependency on Ben or Meng Hai until live SSE swap. |
| Lanson | Langflow flow design, prompt authoring, `flows/ml-tutor.flow.json` export, `flows/README.md` node→module map, eval harness skeleton + golden pairs. No dependency on a live pipeline to write the harness — only to *run* it. |
| Meng Hai | CI scaffold, lint/test pipeline, deployment target — all independent of Ben's corpus being populated. |
| Ben | Loaders, chunker, embedder, Alembic migrations — independent of the RAG engine and frontend. |

**The pinch point is `schemas/`** — `events.py` (Meng Hai → Lik Hong) and `retrieval.py` (Ben → Meng Hai) are the two contracts that, if changed late, ripple across streams. Both must be published as stubs on Day 1 of Phase 1 so downstream streams never block.

---

### Per-stream detail

**Lead — Frontend UI/UX**
- Pixel-faithful recreation of both modes (Reality grid `minmax(380px,44fr) 56fr`; Matrix
  console + coverage bar), header segmented controls, themes (matrix/clinical, `localStorage['gc-theme']`),
  settings drawer, pipeline rail + RAG graph overlay + terminal trace, digital-rain canvas.
- Port the **4 visualizations** from `prototype/viz.jsx`: `BiasVarianceViz` (SVG),
  `RegularizationViz` (SVG), `KNNViz` (canvas), `GradDescViz` (canvas) — direct ports,
  theme-aware.
- **Inference-toggle UI** (Ollama / free-cloud only); **profile picker + conversation history**
  (server-side per ADR-0005); passphrase gate (on deploy); corpus-management UI; structured
  markdown answer + citation rendering; accessibility (aria, keyboard nav, `role="status"`).
  Consumes the SSE contract (mock first → live).

**Ben — Ingest & Corpus + Neon/migrations**
- Loaders: transcript / markdown lesson / textbook / notebook → normalized docs.
- Chunking + `nomic-embed-text` embedding → pgvector upsert. Owns the schema: corpus
  (`documents`, `chunks`, `embeddings`) **+ identity/persistence (`users`, `conversations`,
  `messages`, `documents.created_by`) per ADR-0005**, and `schemas/retrieval.py`.
- **Clear-corpus** + **incremental upload** endpoints. Seeds the demo corpus (4 topics).
- **Neon project + branch-per-dev** setup, Alembic migrations, connection-string secrets.

**Meng Hai — RAG engine + CI/deploy**
- LangGraph pipeline (9 stages + conditional re-loop, re-implemented from Lanson's flow JSON),
  retrieval over pgvector, ReAct, reflect/correct, the **f/r/c evaluator**.
- App-local LLM dispatch (`llm/` via LiteLLM — Ollama + free-cloud only), the
  `GET/POST /settings/inference` endpoint, and the **SSE event contract** (`schemas/events.py`)
  — published day 1 as a documented mock so the frontend builds immediately.
- **CI** (lint: ruff + eslint/prettier; tests: pytest + Vitest/Playwright) and **deployment**.

**Lanson — Langflow design + eval**
- Designs/tunes the flow in Langflow; exports `flows/ml-tutor.flow.json` + `flows/prompts/`;
  maintains `flows/README.md` node→module map.
- Owns the **golden-set eval harness** (≥10 pairs/surface, f/r/c scored, CI-gated) — the
  feedback loop that measures flow quality and catches runtime divergence.

---

## Implementation plan

### Phase 0 — Scaffold + governance (Lead, all review)
1. Create `apps/germ-clone/` per project template (app archetype: `source/backend/` +
   `source/frontend/`, `launch.sh`, full `docs/` tree with `adr/`, `evaluation/`, plus `flows/`).
2. `apps/germ-clone/CLAUDE.md` — stack, ports 8007/3007, LangGraph/Langflow split, LiteLLM,
   Neon branch-per-dev, SSE contract reference.
3. **Enforcement scaffold (non-negotiable):** `.github/CODEOWNERS` (folder → owner map above) +
   `docs/contracts.md` naming the two sacred files and the change-with-heads-up rule.
4. Three live artifacts: `docs/live-requirements.md`, `docs/live-design.md` (C4 + the pipeline
   graph + data model + team/ownership map), `docs/live-journal.md` (project genesis entry).
5. ADRs in `docs/adr/`:
   - ADR-0001 — **App-local LiteLLM dispatch** (why not a shared LLM library).
   - ADR-0002 — **LangGraph runtime, Langflow as design sketchpad** (no engine toggle).
   - ADR-0003 — **Neon Postgres + pgvector, branch-per-dev**.
   - ADR-0004 — **nomic-embed-text default embedding** (768-dim; inference toggle).
   - ADR-0005 — **Access & identity**: shared passphrase gate (activates on deploy, off locally)
     + real user profiles with server-side conversation persistence. Profile-picker entry (no
     passwords). Schema: `users`, `conversations`, `messages`, `documents.created_by`. Designed
     so real login slots in later without migration.
6. Update the project's own `docs/live-journal.md` with the genesis entry.

**Phase 0 is a lead-only phase:** scaffold + CODEOWNERS + contracts + ADRs + mock-stream
skeleton are built solo, then pushed and the three devs are onboarded into their folders.

### Phase 1 — Contracts & skeletons (parallel)
- **Meng Hai**: publish `schemas/events.py` + a `/ask` mock streamer that replays the 4 demo
  topics with realistic timings. Stub `llm/` (LiteLLM) with Ollama + one cloud provider; stub
  `/settings/inference`.
- **Ben**: corpus schema (incl. `users` + `documents.created_by` per ADR-0005) +
  `schemas/retrieval.py` + Alembic migration + Neon branch-per-dev; ingest CLI that seeds the
  4 demo topics from a `seed/` dir. Confirm real-corpus formats with Lanson early.
- **Lik Hong**: Next.js app shell, design-token CSS layer (both themes), header + segmented
  controls, Welcome state, composer — wired to `lib/mock-stream.ts`.
- **Lanson**: first Langflow flow draft + exported `flows/ml-tutor.flow.json`; eval harness
  skeleton.
- **Meng Hai (platform)**: CI pipeline green on empty suites.

### Phase 2 — Real RAG (parallel, integrate)
- **Ben**: real loaders + chunking + nomic embeddings + pgvector upsert; clear-corpus +
  upload endpoints.
- **Meng Hai**: LangGraph graph with conditional re-loop (re-implemented from Lanson's flow JSON);
  retrieval + ReAct + reflect + f/r/c evaluator; swap mock streamer for live engine emitting
  the same SSE shape; live `/settings/inference`.
- **Lik Hong**: both view modes complete; 4 viz ports; pipeline rail / RAG graph / terminal trace;
  settings drawer; corpus-management UI; sources panel + citation highlight. Coverage map
  (Matrix mode) = real query against Ben's `documents`. Console-mode chips (`/quiz` `/eli5`
  `/save` `/sources`) render for fidelity — **do not build behaviours** (v1 backlog).
- **Lanson**: tuned flow + golden-set eval wired to CI; flow→module map current.
- **Meng Hai (platform)**: deploy target.

### Phase 3 — Polish & verify
- Pixel pass against the handoff spec (spacing, radii, animations, digital rain).
- Accessibility pass: aria-labels on icon buttons, `role="status"` on thinking indicator,
  keyboard nav for chips.
- End-to-end: ask each of the 4 topics in both Reality and Matrix modes; confirm SSE stage
  stream, re-loop fires when pass-1 < 0.80, viz renders, citations resolve, all toggles persist.

---

## Reference anchors (prototype → port)

- Stage list: `prototype/pipeline.jsx:7` (`PIPE_STAGES`) · run driver: `prototype/app.jsx:59` (`ask()`)
- Viz: `prototype/viz.jsx` — `BiasVarianceViz:33`, `RegularizationViz:92`, `KNNViz:164`, `GradDescViz:207`
- Data shape per topic: `prototype/content.jsx` (`explain`/`code`/`math`/`sources`/`evalP1`/`evalP2`)
- Full design system + measurements: `design_handoff_ml_tutor/README.md`
- Styles to translate to tokens/Tailwind: `prototype/styles.css` (386 lines, both themes)

## Verification

- `cd apps/germ-clone && ./launch.sh` → backend 8007 + frontend 3007 up.
- Ask all 4 demo topics in both Reality and Matrix modes; confirm SSE stage stream, re-loop on
  pass-1 < 0.80, gauge/PASS badge, citation highlight, all 4 viz interactive.
- Toggle theme (matrix↔clinical, persists), difficulty (eli5/standard/academia), inference
  backend (Ollama↔cloud).
- Clear-corpus then upload a doc; confirm it becomes retrievable.
- `pytest` (backend) + `vitest`/`playwright` (frontend) green; eval harness ≥ baseline f/r/c;
  ruff + eslint/prettier clean.

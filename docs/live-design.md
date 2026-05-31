# germ//clone — Live Design

_Last updated: 2026-05-31_

---

## Architecture overview (C4 — System Context)

```
┌───────────────────────────────────────────────────────────────────────┐
│  Browser (student)                                                    │
│  Next.js 14 App Router · port 3007                                    │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────────────┐│
│  │  Shell   │ │  Pipeline    │ │ Workspace│ │  Viz (4 SVG/canvas)  ││
│  │  Header  │ │  Rail + Graph│ │ Answer   │ │  BiasVariance        ││
│  │  Composer│ │  Terminal    │ │ Sources  │ │  Regularization      ││
│  │  Profile │ │  Gauge       │ │ MathView │ │  KNN  GradDesc       ││
│  └──────────┘ └──────────────┘ └──────────┘ └──────────────────────┘│
└─────────────────────────┬─────────────────────────────────────────────┘
                          │ SSE (stage events) + REST
                          ▼
┌───────────────────────────────────────────────────────────────────────┐
│  FastAPI  · port 8007                                                 │
│                                                                       │
│  app/main.py (DI wiring, routes)                                      │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │  RAG pipeline (LangGraph)                                        ││
│  │  route→rewrite→retrieve1→react→reflect→evaluate1                ││
│  │       └─ if mean(f,r,c)<0.80 → retrieve2→evaluate2 ─┐          ││
│  │                                                       └→ compose ││
│  │  streaming/  SSE emitter (one event per node)                    ││
│  │  llm/        LiteLLM dispatch (Ollama / free-cloud)              ││
│  └──────────────────────────────────────────────────────────────────┘│
│  ingestion/  loaders + chunker + nomic embedder                       │
│  repository/ pgvector queries + ORM models                            │
│  alembic/    migrations                                               │
│  schemas/    events.py · retrieval.py  ← shared contracts            │
└─────────────────────────┬─────────────────────────────────────────────┘
                          │ asyncpg
                          ▼
┌─────────────────────────────────┐   ┌────────────────────────────────┐
│  Neon Postgres + pgvector       │   │  Ollama (local)                │
│  branch-per-dev                 │   │  nomic-embed-text (768-dim)    │
│  users · conversations · msgs   │   │  LLM (e.g. llama3.2)          │
│  documents · chunks · embeddings│   └────────────────────────────────┘
└─────────────────────────────────┘   ┌────────────────────────────────┐
                                      │  Free-cloud provider           │
                                      │  (via LiteLLM)                 │
                                      └────────────────────────────────┘
```

---

## Pipeline contract (SSE event shapes)

Stage events (in-progress):
```jsonc
{ "stage": "retrieve1", "status": "active", "detail": "6 chunks — lesson 3.3 …" }
{ "stage": "evaluate1", "status": "done",   "scores": {"f":0.71,"r":0.88,"c":0.60}, "verdict": "BELOW 0.80, reloop" }
```

Compose event (terminal):
```jsonc
{
  "stage": "compose",
  "status": "done",
  "answer_md": "## Bias-Variance Trade-off\n\n...",
  "citations": [{"id": 1, "mod": "3.3", "file": "lesson-3.3.md", "snip": "..."}],
  "sources":   [{"id": 1, "score": 0.91}]
}
```

Stage key invariant (must match frontend `PIPE_STAGES`):
`route · rewrite · retrieve1 · react · reflect · evaluate1 · retrieve2 · evaluate2 · compose`

---

## Data model

```
users
  id            uuid PK
  name          text NOT NULL UNIQUE
  created_at    timestamptz

conversations
  id            uuid PK
  user_id       uuid FK → users.id
  topic         text
  difficulty    text CHECK IN ('eli5','standard','academia')
  started_at    timestamptz
  updated_at    timestamptz

messages
  id            uuid PK
  conversation_id uuid FK → conversations.id
  role          text CHECK IN ('user','assistant')
  content_md    text
  citations_json jsonb
  created_at    timestamptz

documents
  id            uuid PK
  mod           text        (e.g. '3.3')
  filename      text
  created_by    uuid FK → users.id NULLABLE
  indexed_at    timestamptz

chunks
  id            uuid PK
  document_id   uuid FK → documents.id
  text          text
  chunk_index   int

embeddings
  id            uuid PK
  chunk_id      uuid FK → chunks.id
  vector        vector(768)
```

---

## Frontend component map

```
source/frontend/
├── app/                          Next.js App Router pages
│   ├── layout.tsx                root layout, theme provider, passphrase gate
│   └── page.tsx                  main shell
├── components/
│   ├── shell/                    Header, SegControl, ThemeToggle, ProfilePicker
│   ├── pipeline/                 PipelineRail, AgentGraph, TerminalTrace, Gauge, StageItem
│   ├── workspace/                MLWorkspace, AnswerProse, Sources, CodeBlock, MathView
│   ├── viz/                      BiasVarianceViz, RegularizationViz, KNNViz, GradDescViz
│   └── settings/                 SettingsDrawer, InferenceToggle, CorpusManager
├── lib/
│   ├── mock-stream.ts            replays demo SSE events; flip to live on engine ready
│   ├── api.ts                    typed fetch wrappers
│   └── theme.ts                  localStorage gc-theme helpers
└── styles/
    └── tokens.css                CSS custom properties for both themes
```

---

## Team & ownership

| Directory | Owner | Phase |
|---|---|---|
| `source/frontend/` | Lik Hong | Phase 1+ |
| `source/backend/ingestion/`, `repository/`, `alembic/` | Ben | Phase 1+ |
| `source/backend/rag/`, `llm/`, `streaming/`, `app/` | Meng Hai | Phase 1+ |
| `flows/`, `evaluation/` | Lanson | Phase 1+ |
| `source/backend/schemas/` | Shared contract | All phases |

---

## Design tokens

Implemented as CSS custom properties on `:root[data-theme="matrix"]` / `[data-theme="clinical"]`.
Source of truth: `prototype/styles.css` → ported to `source/frontend/styles/tokens.css`.

Key matrix-theme values: `--bg: oklch(0.15 0.018 152)`, `--green: oklch(0.88 0.21 150)`,
`--cyan: oklch(0.83 0.11 195)`, `--amber: oklch(0.84 0.14 80)`.
Full token list: `design_handoff_ml_tutor/README.md §Design Tokens`.

---

## Deployment target

Local → Vercel (frontend) + Python host (backend + Ollama/Neon). Vercel cannot host FastAPI.
Deployment owned by Meng Hai (Phase 2+).

# germ//clone — Live Design

_Last updated: 2026-06-24_

---

## Architecture overview (C4 — System Context)

```
┌───────────────────────────────────────────────────────────────────────┐
│  Browser (student)                                                    │
│  Next.js 14 App Router · port 3007                                    │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────────────┐│
│  │  Shell   │ │  Pipeline    │ │ Workspace│ │  Viz (10 modules)    ││
│  │  Header  │ │  Rabbit Hole │ │ Answer   │ │  BiasVariance        ││
│  │  Composer│ │  Plugged In  │ │ Sources  │ │  Regularization      ││
│  │  Profile │ │  AgentTrace  │ │ MathView │ │  KNN  GradDesc + 6   ││
│  └──────────┘ └──────────────┘ └──────────┘ └──────────────────────┘│
│  Themes: Reality (light) · Matrix (dark terminal) · Clinical (clean) │
│  Difficulty: ELI5 · Standard · Academia                               │
└─────────────────────────┬─────────────────────────────────────────────┘
                          │ SSE (stage events + token stream) + REST
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
│  │  streaming/  SSE emitter — stage events + token-by-token compose ││
│  │  llm/        LiteLLM dispatch (5 backends — see table below)     ││
│  └──────────────────────────────────────────────────────────────────┘│
│  ingestion/  loaders + chunker + nomic embedder                       │
│  repository/ pgvector queries + ORM models (canonical schema v003)    │
│  alembic/    migrations (001 base · 002 embeddings · 003 chunks+)     │
│  schemas/    events.py · retrieval.py  ← shared contracts            │
└─────────────────────────┬─────────────────────────────────────────────┘
                          │ asyncpg
                          ▼
┌─────────────────────────────────┐   ┌────────────────────────────────┐
│  Neon Postgres + pgvector       │   │  Ollama (local)                │
│  branch-per-dev                 │   │  nomic-embed-text (768-dim)    │
│  users · conversations · msgs   │   │  default embedding provider    │
│  documents · chunks · embeddings│   │  LLM backend (e.g. llama3.2)  │
└─────────────────────────────────┘   └────────────────────────────────┘
                                      ┌────────────────────────────────┐
                                      │  Free-cloud LLM (via LiteLLM) │
                                      │  Groq · Cerebras · Gemini      │
                                      │  OpenRouter (default: nemotron)│
                                      └────────────────────────────────┘
```

---

## LLM dispatch

All LLM routing is app-local via LiteLLM in `source/backend/llm/` (ADR-0001 — no shared ai-core).

**Inference backends** (selectable at runtime via `POST /settings/inference` or Settings UI):

| Key | Provider | Model | Tier |
|---|---|---|---|
| `ollama` | Ollama local | llama3.2 (~3B) | Free, private, on-device |
| `groq` | Groq cloud | llama-3.1-8b-instant | Free tier, fast |
| `cerebras` | Cerebras cloud | gpt-oss-120b | Free tier, 120B |
| `gemini` | Google Gemini | gemini-2.0-flash | Free tier, multimodal |
| `openrouter` | OpenRouter | nemotron-120b:free | Free tier, 1M context |

Default from `.env`: `INFERENCE_BACKEND=cerebras`. No paid providers — zero runaway-bill surface.

**Embedding** (selectable via `POST /settings/embedding`):

| Key | Provider | Model | Dim |
|---|---|---|---|
| `ollama` | Ollama local | nomic-embed-text | 768 |
| `google` | Google Generative AI | gemini-embedding-2 | 768 |

Default from `.env`: `EMBEDDING_PROVIDER=ollama`, `EMBEDDING_MODEL=nomic-embed-text`.  
Corpus was re-indexed with nomic-embed-text on 2026-06-14 after the Google API key expired.  
The `.env` path is anchored in `llm/config.py` and `llm/embedding_config.py` using `Path(__file__).parents[1]`
so the correct `.env` is always loaded regardless of working directory.

Note: `ingestion/` scripts (`embed_google.py` and callers) call the Gemini API directly for
chunk embedding at ingest time, bypassing `llm/`. This is not a violation of ADR-0001 — that
ADR scopes app-local LiteLLM dispatch to the runtime request path, not one-off ingestion
tooling — but is called out here so it doesn't read as drift.

---

## Pipeline contract (SSE event shapes)

Stage events (in-progress nodes):
```jsonc
{ "stage": "retrieve1", "status": "active", "detail": "8 chunks — module 3.3, module 3.4" }
{ "stage": "evaluate1", "status": "done", "scores": {"f":0.71,"r":0.88,"c":0.60}, "verdict": "BELOW 0.80, reloop" }
```

Compose token stream (emitted word-by-word before the terminal done event):
```jsonc
{ "stage": "compose", "status": "active", "token": "Decision" }
{ "stage": "compose", "status": "active", "token": " trees" }
```

Compose terminal event:
```jsonc
{
  "stage": "compose",
  "status": "done",
  "answer_md": "## Why decision trees overfit\n\n...",
  "citations": [{"id": 1, "mod": "3.3", "file": "3.3 - Supervised Learning 2_annotations.pdf", "snip": "..."}],
  "sources":   [{"id": 1, "score": 0.95}]
}
```

Token streaming is implemented via an `asyncio.Queue` passed as `token_queue` in the graph state.
`compose_node` puts `("token", str)` tuples; other nodes put `("event", StageEvent)` tuples.
The SSE generator in `app/routes/ask.py` is the sole consumer.

Stage key invariant (must match frontend `PIPE_STAGES`):
`route · rewrite · retrieve1 · react · reflect · evaluate1 · retrieve2 · evaluate2 · compose`

---

## Data model (canonical schema — migrations 001–003)

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

chunks                          ← migration 003 added source_type + lesson metadata
  id            uuid PK
  document_id   uuid FK → documents.id
  text          text
  chunk_index   int
  page_number   int NULLABLE
  metadata      jsonb NULLABLE  (timestamp_start etc.)
  source_type   text NULLABLE   ('slide' | 'transcript' | 'textbook')
  lesson_title  text NULLABLE
  topic         text NULLABLE

embeddings                      ← migration 002 (separate table from chunks)
  id            uuid PK
  chunk_id      uuid FK → chunks.id UNIQUE
  vector        vector(768)     (nomic-embed-text; matches current corpus)
```

**Source-type score weighting** (applied in `repository/queries.py`): slides ×1.2, transcripts ×0.9, others ×1.0.
Rationale: slide text is denser signal per token; raw transcript prose is noisier.

Retrieval uses IVFFlat with `ivfflat.probes = 100` (full-list scan — appropriate for seed corpus size).

---

## Frontend component map

```
source/frontend/
├── app/                          Next.js App Router pages
│   ├── layout.tsx                root layout, theme provider, passphrase gate
│   └── page.tsx                  main shell — profile state, message list, SSE handler
├── components/
│   ├── shell/                    Header, ModelPill, ThemeToggle, ProfilePicker, SettingsDrawer
│   ├── pipeline/                 PipelineRail (Rabbit Hole), ConsoleView (Plugged In),
│   │                             AgentTrace panel, StageItem
│   ├── workspace/                MLWorkspace, AnswerProse (KaTeX), Sources, MathView
│   ├── viz/                      10 topic visualisations (BiasVariance, Regularization,
│   │                             KNN, GradDesc, ConfusionMatrix, Distributions,
│   │                             KMeans, TimeSeries, Convolution, Embeddings)
│   └── settings/                 SettingsDrawer, InferenceToggle, CorpusManager
├── lib/
│   ├── api.ts                    typed fetch wrappers
│   ├── topic-detector.ts         shared utility — maps question text → viz topic
│   └── theme.ts                  localStorage theme helpers
└── styles/
    └── tokens.css                CSS custom properties for all three themes
```

**Themes:** `data-theme` attribute on `<html>`. Three values: `reality` (default light), `matrix` (dark terminal), `clinical` (clean white). Cycles on toggle — `reality → matrix → clinical → reality`.

**Math rendering:** KaTeX via `react-katex`. Answer prose renderer (`AnswerProse`) parses `$...$` and `$$...$$` delimiters inline. Workspace MathView renders equation cards per topic.

**ML Workspace coverage:** 10/10 modules (3.1–3.10) — each has a `Visualize` tab (interactive SVG/canvas) and a `Math` tab (KaTeX equation cards). Topic is auto-detected from the question via `topic-detector.ts`.

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

Three themes implemented as CSS custom properties on `[data-theme]`.  
Source of truth: `source/frontend/styles/tokens.css`.

Key matrix-theme values: `--bg: oklch(0.15 0.018 152)`, `--green: oklch(0.88 0.21 150)`,
`--cyan: oklch(0.83 0.11 195)`, `--amber: oklch(0.84 0.14 80)`.

---

## Deployment target

Vercel (frontend) + Render (backend, free tier) — see ADR-0007 and `docs/plans/deployment.md`.  
Passphrase gate (`PASSPHRASE_REQUIRED=true`) activates on deploy; off locally.  
Ollama unavailable on Render — cloud inference backend required on deploy.  
Deployment owned by Meng Hai (Phase 2).

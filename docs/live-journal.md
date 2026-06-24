# germ//clone — Live Journal

---

## 2026-05-31 — Project genesis (Phase 0 scaffold)

**Event:** Project initiated. Phase 0 scaffold complete.

**What was built:**
- Full directory structure per app archetype (`source/backend/`, `source/frontend/`, `flows/`,
  `evaluation/`, `docs/adr/`, etc.)
- `CLAUDE.md`, `README.md`, `launch.sh`, `.gitignore`
- `.github/CODEOWNERS` (folder → owner enforcement; sacred-file reviewers)
- `docs/contracts.md` (sacred files, change discipline, stage-key invariant)
- `docs/live-requirements.md`, `docs/live-design.md` (this journal)
- ADR-0001 through ADR-0005 (LiteLLM dispatch, LangGraph/Langflow split, Neon branch-per-dev,
  nomic-embed-text, access & identity)
- `docs/plans/build-plan.md` (team-readable execution plan)
- Backend skeleton: `schemas/events.py`, `schemas/retrieval.py`, `app/main.py`,
  `requirements.txt`
- Frontend skeleton: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `styles/tokens.css`,
  `lib/mock-stream.ts` (built from `schemas/events.py` — frontend builds against this first)

**Key decisions recorded:**
- No shared LLM library; app-local LiteLLM (ADR-0001)
- LangGraph runtime only; Langflow is design sketchpad (ADR-0002)
- Neon + pgvector + branch-per-dev (ADR-0003)
- nomic-embed-text 768-dim default (ADR-0004)
- Passphrase gate + profile-picker + server-side persistence (ADR-0005)

**Next:** Phase 1 — Meng Hai publishes `schemas/events.py` mock streamer; Ben wires Neon
branch-per-dev + Alembic migration; Lik Hong builds Next.js shell wired to `mock-stream.ts`;
Lanson drafts first Langflow flow + exports `flows/ml-tutor.flow.json`.

---

## 2026-06-24 — E2E UAT pass; live-design.md reconciled [design-drift]

**Event:** Full E2E UAT walkthrough run against the live stack. One P1 defect found and fixed.
`live-design.md` reconciled — was 23 days behind committed code.

**UAT outcome (17 scenarios):** 16 pass, 1 pre-existing flaky test (`test_compose_emits_token_events`
hits live LLM with no cassette replay; intermittent failure on LLM error during compose).

**P1 defect fixed — embedding provider reverts to google on server restart:**
`embedding_config.py` had hardcoded `"google"` as the default fallback and `load_dotenv()` was
called without an explicit path, resolving from `cwd`. A running process started before the
2026-06-14 `.env` update (switching corpus to nomic-embed-text after Google key expiry) retained
`google` in-memory and all retrieve hops failed with `API key expired`. Fix: `load_dotenv()` now
anchors to `Path(__file__).parents[1] / ".env"` in both `llm/config.py` and
`llm/embedding_config.py`; fallback defaults corrected to `ollama`/`nomic-embed-text`.

**What live-design.md was updated to reflect:**
- LLM dispatch expanded to 5 backends (Ollama, Groq, Cerebras, Gemini, OpenRouter) with runtime
  toggle via `POST /settings/inference` (ADR not yet filed — UI was wired in feat/69ce95d)
- Embedding provider toggle documented (`POST /settings/embedding`)
- Compose token-by-token SSE streaming documented (`status: active, token: "..."` events before
  the terminal done event — implemented via asyncio.Queue in `app/routes/ask.py`)
- Data model updated for canonical schema migration 003: `chunks` table gained `source_type`,
  `lesson_title`, `topic` columns; source-type score weighting (slides ×1.2, transcripts ×0.9)
- Frontend ML workspace: 10/10 module coverage, KaTeX math rendering, 3 themes documented
- Deployment target updated: Vercel + Render, ADR-0007

**Housekeeping:** `source/frontend/tsconfig.tsbuildinfo` removed from git tracking (was committed
despite being gitignored).

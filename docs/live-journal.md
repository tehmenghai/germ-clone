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

---

## 2026-07-13 — QA regression retest confirms #26/#27/#29 fixes; new eval-scoring defect found (#39)

**Event:** Pulled latest `main` (merges for #38/#29 evaluate-real-answer, #36/#28 auth+rate-limit,
#35/#27 compose-citation-fabrication, #26 route→retrieval module wiring, CI ruff fix), then ran a
full e2e verification and a targeted regression re-run of Hueyling's 5-case QA doc
(`docs/internal/qa/hueyling/qna-test-cases.md`) against free-tier cloud first, local Ollama second,
per standing project preference (cloud-first, Ollama fallback only if necessary).

**Environment note:** `itsdangerous` was declared in `requirements.txt` (added by the #28 auth
work) but not installed in the existing dev `.venv`, because `launch.sh` only runs
`uv pip install` on first venv creation. Backend crashed on startup until installed manually.
Flagged as a latent footgun for any dev pulling this merge onto an existing `.venv` — worth a
`launch.sh` fix (always run the idempotent install) if it recurs.

**Regression results — TC01 through TC04 (Cerebras, `gpt-oss-120b`): all of Hueyling's documented
defects confirmed fixed:**
- TC01/TC02/TC03/TC04: route no longer misclassifies (TC02 was 3.1→3.3 wrong, TC04 was
  3.5→3.2/k-means confusion wrong — both now correct); retrieval now surfaces the routed module in
  every case (previously zero chunks from the correct module in 3 of 4 cases); TC02's five
  fabricated external-textbook citations are gone (all references now point at real corpus files);
  TC04's zero-citation composition and its factual error ("KNN is a clustering algorithm") are both
  gone, replaced with 3 real citations and a correct classification framing.
- Root fix: `172c726` (fix(rag): wire route's module classification into retrieval, closes #26) —
  a soft +0.15 cosine-score boost for the route-classified module on `retrieve1` only (intentionally
  omitted on the `retrieve2` reloop so a misrouted query can still escape), plus a route-prompt
  disambiguation for the KNN/k-means "k" token collision.

**New defect found and filed — TC05 provider-dependent evaluate scoring (issue #39, `area:rag`,
assigned Meng Hai):** re-running TC05 ("What does the learning rate do in gradient descent?") 6
times (4× Cerebras, 1× Ollama/llama3.2, 1× Groq/llama-3.1-8b-instant) showed a consistent split:
retrieval is equally diffuse on every provider (never cleanly concentrated on module 3.7), and the
composed answer is correct and well-cited in every single run — but Cerebras's judge scored
faithfulness 0.20–0.40 in 4/4 runs and reloop'd (final scores 23–63%), while Groq's judge scored
1.00 and passed clean on its one run (93%). Verdict: **not** a regression of the #26 fix (retrieval
diffuseness is identical on the provider that scores it fine) — the discriminating variable is the
evaluate/judge layer's behavior specifically on Cerebras (`gpt-oss-120b` as judge). Hueyling's
original TC05 baseline passed cleanly pre-fix (f83/r85/c78), so this pattern is new since `172c726`
even though the fix itself isn't the implicated code path.

**Ollama pass:** only TC01 completed — took ~65 minutes end-to-end on CPU-only `llama3.2` (route
alone ~4 min; evaluate/compose stages individually stalled 5–10+ min). Route itself misclassified
(3.9 instead of 3.3) and evaluate scores were internally inconsistent (0/0/0.90 then 0.40/0.30/0),
read as a model-capability limitation of the small local model rather than evidence against the
fix — the same retrieval code path retrieved correctly on Cerebras for adjacent questions. TC02–05
were not run locally; local-mode latency remains impractical for interactive regression testing at
this scale, matching and exceeding Hueyling's own observation #4.

**General observations retest:** Hueyling's observation #1 (free-cloud providers hit rate limits
almost immediately) did not reproduce on Cerebras or Groq during this session (Gemini/OpenRouter
not retested). Observations #3 (difficulty-switch hang) not independently re-verified this pass.

**Docs updated:** `docs/internal/qa/hueyling/qna-test-cases.md` — appended a dated retest section
(commit `7179dff`) rather than editing Hueyling's original findings, preserving the historical
record while documenting current status per test case.

**Next:** Meng Hai to investigate #39 (log raw judge JSON from Cerebras vs Groq for the same
query/chunks/answer triple to isolate whether it's a stricter-model behavior or a
parsing/formatting quirk). TC04's residual note (module 3.2 content not directly surfacing in
`retrieve1` despite correct final citations) may be worth a corpus/embedding-coverage look, not
filed as an issue yet — low severity, no defect reproduced from it.

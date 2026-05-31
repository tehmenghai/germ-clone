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

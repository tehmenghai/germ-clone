# Contributing

germ//clone is a 4-person build with a real ownership model, not a free-for-all. Read this
before opening a PR.

## Ownership

Every directory has an owner (`.github/CODEOWNERS`). Inside your own area, change freely —
no ceremony. Outside it, expect the owner's review before merge.

| Area | Owner |
|---|---|
| `source/frontend/` | Lik Hong |
| `source/backend/ingestion/`, `repository/`, `alembic/` | Ben |
| `source/backend/rag/`, `llm/`, `streaming/`, `app/` | Meng Hai |
| `flows/`, `evaluation/` | Lanson |
| `docs/`, `CLAUDE.md`, `README.md` | Lik Hong |

## Sacred contracts

Two files cross ownership boundaries and are treated differently from everything else:

- `source/backend/schemas/events.py` — SSE event shape, produced by Meng Hai, consumed by the frontend
- `source/backend/schemas/retrieval.py` — retrieval result shape, produced by Ben, consumed by the RAG engine

Changing either requires discussing it with the consumer *before* opening the PR, referencing
that discussion in the PR description, and getting the consumer's approval on top of the
owner's. Full detail: `docs/contracts.md`.

The pipeline stage keys are a related invariant — they must match the frontend's
`PIPE_STAGES` exactly: `route, rewrite, retrieve1, react, reflect, evaluate1, retrieve2,
evaluate2, compose`. Don't rename a stage key without going through the same process.

## Before opening a PR

- Tests pass: `pytest` (backend, `source/backend/tests/`), Vitest + Playwright (frontend,
  `source/frontend/tests/`).
- Linting is clean: `ruff` (Python), ESLint + Prettier (frontend).
- If you touched a prompt or the RAG pipeline, run the eval harness in `evaluation/` — CI
  gates on faithfulness/relevance/completeness regression, so a drop blocks merge anyway.
- If you touched one of the two sacred contracts, do the consumer heads-up above before you
  ask for review.

## Architecture decisions

New external dependency, new route/IA section, new agent role, or a change to the RAG
pipeline shape — write an ADR first. Template: `docs/adr-template.md` if present, otherwise
follow the existing numbered ADRs in `docs/adr/`. Don't land the code before the decision is
written down.

## What we won't merge

- Changes to `source/backend/llm/` that reintroduce a paid cloud provider without an
  explicit toggle a self-hoster can turn off. This project runs Ollama-local by default —
  keep it that way.
- Anything that touches auth (`app/routes/settings.py`, `app/routes/ask.py`, `app/routes/profiles.py`)
  without a corresponding test proving the check actually rejects an unauthenticated request.

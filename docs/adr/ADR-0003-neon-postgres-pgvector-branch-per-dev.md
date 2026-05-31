# ADR-0003 — Neon Postgres + pgvector; branch-per-dev

**Date:** 2026-05-31  
**Status:** Accepted  
**Decider:** Lik Hong (lead)

## Context

The app needs a vector store for retrieval and a relational store for user profiles,
conversations, and messages. A local SQLite + FAISS approach was considered but ruled out
because (a) the team is distributed and needs isolated dev environments, and (b) pgvector in
the same Postgres instance keeps the schema in one place.

## Decision

Use **Neon Postgres + pgvector** as the single data store. Each developer gets an isolated
**Neon branch** off `main`, providing a full copy of the schema with no shared mutation risk.
Migrations are managed by Alembic (owned by Ben).

## Consequences

- Connection strings are branch-specific; each dev's `.env` points at their own Neon branch.
- `main` branch is the integration environment; PRs that touch the schema must include an
  Alembic migration script.
- Neon's serverless cold-start is acceptable for a study-team app at this scale.
- If the team moves to a self-hosted Postgres later, the Alembic migrations and
  SQLAlchemy models are portable without change.

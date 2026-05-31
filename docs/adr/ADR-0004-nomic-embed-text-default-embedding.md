# ADR-0004 — nomic-embed-text default embedding (768-dim)

**Date:** 2026-05-31  
**Status:** Accepted  
**Decider:** Lik Hong (lead)

## Context

The RAG pipeline needs an embedding model for chunk indexing and query encoding. Options
considered: OpenAI `text-embedding-3-small` (paid), `all-MiniLM-L6-v2` (fast, 384-dim,
weaker retrieval), `nomic-embed-text` (768-dim, strong retrieval, free via Ollama).

## Decision

Use **`nomic-embed-text`** via Ollama as the default embedding model (768-dim vectors stored in
pgvector). The inference-toggle setting controls whether the LLM is Ollama-local or free-cloud,
but embeddings default to Ollama regardless — switching the embedding model is a separate
concern (requires re-indexing the corpus).

## Consequences

- Ollama must be running with `nomic-embed-text` pulled (`ollama pull nomic-embed-text`)
  for ingest and retrieval to work locally.
- The pgvector column is dimensioned to 768; changing the embedding model later requires a
  schema migration and full corpus re-index.
- The inference toggle in the UI controls the LLM provider only, not the embedding model.

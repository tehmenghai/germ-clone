# ADR-0001 — App-local LiteLLM dispatch

**Date:** 2026-05-31  
**Status:** Accepted  
**Decider:** Lik Hong (lead)

## Context

The project needs LLM routing over Ollama (local default) and at least one free-cloud provider,
with a user-visible inference toggle. A shared LLM library approach was considered but ruled out
because this is an external team build — the team does not own or maintain any shared library,
and adding an external dependency on internal infrastructure is not appropriate.

## Decision

Use **LiteLLM** as an app-local dispatch module (`source/backend/llm/`). LiteLLM provides a
unified interface over Ollama and cloud providers, maps cleanly to the inference toggle, and has
no shared ownership concerns.

## Implementation

- `source/backend/llm/dispatch.py` — LiteLLM client, provider selection
- `source/backend/llm/config.py` — provider config, env-var wiring
- `GET/POST /settings/inference` — owned by Meng Hai; reads/writes the active provider

## Consequences

- Each provider's API key / Ollama URL is managed via `.env` in `source/backend/`.
- No runaway-bill surface: paid cloud providers are explicitly excluded. Toggle is
  Ollama-local / free-cloud only.
- If a shared LLM library becomes available and desirable later, migrating from LiteLLM is
  straightforward (same provider-key conventions).

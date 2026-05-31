# ADR-0005 — Access & identity: passphrase gate + user profiles + server-side persistence

**Date:** 2026-05-31  
**Status:** Accepted  
**Decider:** Lik Hong (lead)

## Context

The app is used by a known study team (4 devs + a small cohort). We need light identity so
conversations persist across devices, but OAuth / full auth is out of scope for v1. Client-only
localStorage persistence was rejected because conversations would be lost on device switch.

## Decision

Two-layer access model:

1. **Shared passphrase gate** — a single passphrase required to enter the app, configured via
   env var. Active on deploy; bypassed locally (`PASSPHRASE_REQUIRED=false`). Keeps the app off
   the open internet without building a full auth system.

2. **User profiles** — after the passphrase, users pick or create a named profile
   (profile-picker; no password). The profile ID is stored in `localStorage['gc-profile']`.
   All conversations and messages are persisted server-side, keyed to the profile.

## Schema (owned by Ben)

```
users            id, name, created_at
conversations    id, user_id, topic, difficulty, started_at, updated_at
messages         id, conversation_id, role, content_md, citations_json, created_at
documents        id, ..., created_by (FK → users.id)
```

## Consequences

- The `/ask` endpoint reads the profile ID from the request and persists the composed answer +
  message rows via `repository/` before streaming completes.
- The profile-picker UI is owned by Lik Hong; the persistence schema and endpoints are owned
  by Ben (schema) and Meng Hai (`/ask` write path).
- Designed for forward compatibility: real OAuth login can slot in by adding an `auth_provider`
  + `external_id` column to `users` without a destructive migration.
- No passwords are stored. If a user loses their profile name, they create a new profile and
  history is not recoverable (acceptable for a study-team tool).

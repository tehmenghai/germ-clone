# germ//clone — Live Requirements

_Last updated: 2026-05-31_

---

## Functional Requirements

### FR-01 — Question answering
The system answers student ML questions grounded in the course corpus (modules 3.1–3.10) using
an agentic RAG pipeline. Answers include prose, relevant code, underlying math, and citations.

### FR-02 — Self-correcting pipeline
The pipeline self-evaluates its first-pass answer (f/r/c scores). If mean(f,r,c) < 0.80, it
re-retrieves and re-evaluates before composing. The pipeline stages are:
`route → rewrite → retrieve1 → react → reflect → evaluate1 → [retrieve2 → evaluate2 →] compose`

### FR-03 — Stage streaming
Each pipeline stage streams an SSE event to the client (stage key, status, detail/scores).
The client renders live stage progress without polling.

### FR-04 — Interactive visualizations
Every answer includes one of four interactive ML visualizations matched to the topic:
BiasVarianceViz, RegularizationViz, KNNViz, GradDescViz. Visualizations are theme-aware.

### FR-05 — Two view modes
- **Reality mode:** split-panel (pipeline rail left, workspace right). Prose reading layout.
- **Matrix mode:** terminal/console layout, matrix-green dark aesthetic, digital-rain canvas,
  coverage bar showing which modules have indexed chunks.

### FR-06 — Themes
Two themes: **matrix** (dark, default) and **clinical** (light). Theme persists in
`localStorage['gc-theme']`; applied via `data-theme` on `<html>`.

### FR-07 — Difficulty levels
Three levels: `eli5` / `standard` / `academia`. Affects LLM prompt. Persists per conversation.

### FR-08 — Inference toggle
Users can switch between Ollama-local (default) and free-cloud via the settings drawer.
Drives `GET/POST /settings/inference`. **No paid-cloud option** (runaway-bill prevention).

### FR-09 — User profiles & conversation persistence
Users pick or create a named profile (no password). All conversations and messages are
persisted server-side, keyed to the profile. History survives device switch.

### FR-10 — Passphrase gate
A shared passphrase is required to enter the app on deploy. Bypassed locally.

### FR-11 — Corpus management
Admin users can clear the corpus and upload new documents incrementally. Uploaded documents
are chunked, embedded, and indexed into pgvector.

### FR-12 — Citation rendering
Composed answers carry structured citation IDs. The client resolves and highlights source
chunks; no raw HTML injection.

---

## Non-Functional Requirements

### NFR-01 — Streaming latency
First SSE event (route stage) must arrive within 1 s of request submission on local Ollama.

### NFR-02 — Eval quality baseline
Golden-set eval harness (≥10 pairs per surface) must pass before any prompt or pipeline
change merges. CI fails on f/r/c regression below baseline.

### NFR-03 — Accessibility
All interactive controls carry aria-labels. Thinking indicator has `role="status"`.
Full keyboard navigation for chips and controls.

### NFR-04 — No XSS surface
Answers are structured markdown + citation IDs, rendered client-side. No raw HTML strings
from the LLM are injected into the DOM.

### NFR-05 — Isolated dev environments
Each developer has an isolated Neon Postgres branch. No shared mutable dev DB.

---

## Out of scope (v1)

- Console-mode command chips (`/quiz`, `/eli5`, `/save`, `/sources`) — rendered but not wired.
- OAuth / real login — profile-picker only; passphrase gate for team access.
- Paid-cloud LLM providers.
- Mobile-first layout.

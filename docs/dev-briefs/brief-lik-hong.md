# Lik Hong — Frontend UI/UX (Lead)

You own the frontend and the project. Phase 0 scaffold is done. Your Phase 1 job is the
app shell wired to the mock stream — build against that, not the live engine.

## Your directories

```
source/frontend/    entire frontend codebase
```

You also own governance across the whole project: `CLAUDE.md`, `README.md`, `docs/`,
`.github/CODEOWNERS`. If something looks wrong in another dev's area, raise it — don't
silently fix it.

## What you're building

**Phase 1 (start here):**
- Next.js app shell: root layout with theme provider, passphrase gate (off locally),
  profile picker.
- Design-token CSS layer — both themes (matrix dark, clinical light) already in
  `styles/tokens.css`. Wire `data-theme` on `<html>`, persist to `localStorage['gc-theme']`.
- Header: avatar, brand, segmented controls (view mode, difficulty), RAG pipe pill, LLM name
  pill, theme toggle, settings icon.
- Welcome state and composer — wired to `lib/mock-stream.ts`. Do not call the live backend
  yet.

**Phase 2:**
- Both view modes complete: Reality (split-panel, `minmax(380px,44fr) 56fr`) and Matrix
  (console, digital-rain canvas, coverage bar).
- Pipeline rail, RAG graph overlay, terminal trace, Gauge component.
- 4 visualization ports from the prototype: `BiasVarianceViz` (SVG), `RegularizationViz`
  (SVG), `KNNViz` (canvas), `GradDescViz` (canvas). Theme-aware. Direct ports — don't
  redesign them.
- Settings drawer: inference toggle (Ollama / free-cloud only), corpus management UI.
- Sources panel and citation highlight.
- Profile picker + conversation history (server-side, per ADR-0005).
- Coverage map in Matrix mode: real query against Ben's `documents` table — which modules
  have indexed chunks.
- Console-mode chips (`/quiz`, `/eli5`, `/save`, `/sources`): render them, do not wire
  behaviours. v1 backlog.
- Accessibility pass: aria-labels on icon buttons, `role="status"` on thinking indicator,
  keyboard nav.

## The mock stream

`lib/mock-stream.ts` is already built. It covers all 4 demo topics with realistic timings and
includes a re-loop demo (regularization topic, pass-1 below 0.80). Build the entire frontend
against this. When Meng Hai ships the live `/ask` endpoint with the same SSE shape, it's a
one-line swap in `lib/api.ts`.

## The sacred files

`schemas/events.py` is Meng Hai's. Any change to the SSE shape after you've started building
against it needs your sign-off — he knows this. If you need a field that isn't there, raise it
with him. Don't work around it client-side.

`schemas/retrieval.py` is Ben's. The frontend doesn't consume it directly — leave it alone.

See `docs/contracts.md`.

## Using a coding agent

Start every session with:

```
Read apps/germ-clone/CLAUDE.md, docs/plans/build-plan.md, and docs/contracts.md first.

I am Lik Hong. My ownership area is source/frontend/. As lead I also own docs/, CLAUDE.md,
README.md, and .github/CODEOWNERS.
Do not touch source/backend/ without flagging it to me first.

Sacred files: schemas/events.py (Meng Hai's) and schemas/retrieval.py (Ben's) — read only,
do not edit. Any change to events.py that affects the frontend needs my sign-off.

Mock-first rule: wire all frontend work to lib/mock-stream.ts. Do not call the live backend
until I say the engine is ready.

[Task]
```

## Stack reminders

- Next.js 14 App Router, TypeScript strict, Tailwind, pnpm.
- Design source: `design_handoff_ml_tutor/README.md` is the authoritative spec — pixel-close
  fidelity expected. `prototype/styles.css` is the token/style reference.
- Fonts: JetBrains Mono (UI/mono), Newsreader (prose/math). Both via Google Fonts.
- Theme key in localStorage: `gc-theme`. Profile key: `gc-profile`.
- Linting: ESLint + Prettier. Run before every commit.
- Type-check: `tsc --noEmit`. Must be clean.

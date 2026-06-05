# ADR-0006 — KaTeX for math rendering in the ML workspace

**Date:** 2026-06-05
**Status:** Accepted
**Decider:** Lik Hong (lead, frontend)

## Context

The ML workspace renders the underlying mathematics for each answer topic (bias–variance,
regularization, KNN, gradient descent, confusion matrix). Until now equations were stored as
pre-formatted Unicode strings (e.g. `"Error = Bias² + Variance + ε"`) and rendered as plain
italic text. This does not scale: fractions, summations, matrices and Greek-heavy expressions
(e.g. F1, the MSE gradient, the KNN distance metric) are unreadable as flat Unicode, and authoring
them by hand is error-prone.

This is an **ADR trigger** under the workspace rules: it adds a new external runtime dependency
(`react-katex` → `katex`).

Options considered:
- **MathJax** — heavier, slower first render, more configuration; overkill for short inline/block
  equations.
- **KaTeX** (via `react-katex`) — synchronous, fast, no runtime layout reflow, LaTeX input;
  bundled CSS. The de-facto standard for static educational maths.
- **Hand-rolled Unicode** (status quo) — zero dependency but unmaintainable for real equations.

## Decision

Adopt **KaTeX** via `react-katex` for all math rendering in the workspace.

- Dependencies: `react-katex` (component wrapper), `katex` (engine), `@types/katex` (dev types).
- KaTeX stylesheet imported once in `app/layout.tsx` (`katex/dist/katex.min.css`).
- `TOPIC_MATH` entries become LaTeX strings rendered with `<BlockMath>`.
- No paid service, no network call, no runtime config — KaTeX runs fully client-side and offline,
  consistent with the project's local-first / zero-cost posture.

## Consequences

- Bundle grows by the KaTeX engine + fonts (~a few hundred KB, CSS-loaded). Acceptable for an
  educational tool whose core value is rendered maths.
- Equation authoring moves to LaTeX — richer, but contributors adding a topic must write LaTeX in
  `TOPIC_MATH` rather than Unicode.
- The KaTeX CSS is a global import; its font files ship with the bundle (no CDN dependency, so it
  works behind the passphrase gate / offline).
- Future equation-heavy topics (decision-tree entropy, k-means inertia, neural-net backprop) are
  now tractable without bespoke formatting.

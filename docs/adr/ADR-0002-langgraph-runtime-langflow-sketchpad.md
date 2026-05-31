# ADR-0002 — LangGraph runtime; Langflow as design sketchpad

**Date:** 2026-05-31  
**Status:** Accepted  
**Decider:** Lik Hong (lead)

## Context

The pipeline is a self-correcting agentic RAG graph with a conditional re-loop edge and
per-node SSE streaming. Two tools were considered for the runtime: LangGraph (code-first) and
Langflow (visual, drag-and-drop). A third option was to put Langflow directly on the request
path.

## Decision

**LangGraph** is the sole runtime engine. **Langflow** is used by Lanson as a design and
authoring sketchpad — to prototype flow shape, tune prompts, and produce the canonical
`flows/ml-tutor.flow.json` — but it never sits on the request path.

There is **no user-facing engine toggle**.

## Rationale

- The conditional re-loop edge (`if mean(f,r,c) < 0.80 → re-retrieve`) is a native LangGraph
  pattern; mapping it in Langflow-on-path adds operational complexity with no benefit.
- Per-node SSE streaming maps 1:1 to LangGraph node callbacks; this is clean in code,
  awkward through a Langflow server.
- LangGraph graphs are unit-testable in-repo; Langflow-on-path is not.
- Langflow remains valuable as a visual design tool: Lanson designs and tunes in Langflow,
  exports the flow JSON + prompts, and Meng Hai re-implements as the LangGraph graph in
  `rag/`. The `flows/README.md` node→module map keeps the two in sync.

## Consequences

- There is a re-implementation tax: any flow change Lanson makes must be mirrored by Meng Hai.
  Managed by: (1) the `flows/README.md` node→module map, (2) the contract rule that stage-list
  or prompt-contract changes are flagged to Meng Hai before Lanson ships them, (3) the eval
  harness as the divergence detector.
- Langflow is a dev dependency only; it does not appear in the production deployment.

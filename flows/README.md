# flows/ — Langflow design assets

Owned by Lanson.

## Files

| File | Purpose |
|---|---|
| `ml-tutor.flow.json` | Canonical Langflow export — source of truth for flow shape and prompts |
| `prompts/` | Extracted prompt templates, one file per node |
| `README.md` | This file — node → `rag/nodes/*` module map |

## Node → rag/nodes/* map

Update this table whenever the flow shape changes. A mismatch here is visible divergence.

| Langflow node | `rag/nodes/` module | Stage key |
|---|---|---|
| Route | `nodes/route.py` | `route` |
| Rewrite | `nodes/rewrite.py` | `rewrite` |
| Retrieve (hop 1) | `nodes/retrieve.py` | `retrieve1` |
| ReAct | `nodes/react.py` | `react` |
| Reflect | `nodes/reflect.py` | `reflect` |
| Evaluate (pass 1) | `nodes/evaluate.py` | `evaluate1` |
| Retrieve (hop 2) | `nodes/retrieve.py` | `retrieve2` |
| Evaluate (pass 2) | `nodes/evaluate.py` | `evaluate2` |
| Compose | `nodes/compose.py` | `compose` |

## Change rule

Any flow change that alters the **stage list**, the **re-loop condition** (`mean(f,r,c) < 0.80`),
or a **prompt's contract** (inputs/outputs) must be raised to Meng Hai before it is considered
shipped. See `docs/contracts.md`.

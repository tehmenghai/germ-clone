# sandbox/

Personal scratch space for each developer to experiment with document chunking strategies.

Each subfolder belongs to one developer. Work here is completely independent of the
application code — no imports, no shared contracts, no review gates. Use it to try
chunking approaches (fixed-size, semantic, recursive, sliding window, etc.) against
real documents and observe what produces good retrieval chunks before wiring anything
into the pipeline.

| Folder | Owner |
|---|---|
| `likhong/` | Lik Hong |
| `ben/` | Ben |
| `menghai/` | Meng Hai |
| `lanson/` | Lanson |

Nothing in this folder should be imported by `source/`. If something here graduates
into production code, move it through the normal PR flow into the appropriate backend
module.

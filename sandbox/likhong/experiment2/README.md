# experiment2 — Dual-method PDF Chunk Viewer

Builds on experiment1. Two chunking backends side-by-side; pages 1–50 only; interactive chunk viewer.

## Methods

| | pdfplumber | marker |
|---|---|---|
| Approach | Coordinate-based word assembly + font-size heading detection | ML model pipeline (layout + OCR) |
| Speed | Fast, deterministic | Slow first run (model download ~1–2 GB); CPU supported |
| Strengths | No downloads, predictable | Strips headers/footers automatically, extracts LaTeX math, table-aware |
| Extra types | — | `table`, `figure` |

## Setup

```bash
# from workspace root (conda base)
conda run -n base pip install -r apps/germ-clone/sandbox/likhong/experiment2/requirements.txt
```

## Run

```bash
# 1. Start backend (from experiment2 dir)
# Any existing instance on port 8099 is killed automatically on startup.
setsid conda run --no-capture-output -n base python backend.py > /tmp/exp2-backend.log 2>&1 &

# 2. Open the viewer
open frontend/index.html
# or: python -m http.server 8098 --directory frontend  (then visit http://localhost:8098)
```

Backend runs on **port 8099**.

## Usage

1. Select a PDF from the corpus dropdown.
2. Pick a method (pdfplumber or marker — see warning for marker first-run cost).
3. Click **Chunk (pages 1–50)**. Result is cached; re-clicking is instant.
4. Filter by chunk type, page range, or keyword.
5. Use **Clear cache** to re-run with different settings.

## Output schema

```json
{
  "id": "ch02_sec03_theorem_001",
  "type": "theorem|proof|definition|example|exercise|remark|section|table|figure|other",
  "chapter": "2",
  "section": "3",
  "page_start": 47,
  "page_end": 48,
  "token_count": 312,
  "text": "...",
  "heading_text": "Theorem 2.11 (Spectral Theorem)",
  "has_math": true,
  "source_method": "pdfplumber"
}
```

Cached JSONs land in `output/` (gitignored).

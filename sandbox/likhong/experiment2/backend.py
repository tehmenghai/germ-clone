#!/usr/bin/env python3
"""Experiment2 backend — dual-method PDF chunker (pdfplumber + marker)."""

import json
import os
import re
import sys
import unicodedata
from pathlib import Path
from typing import Literal

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
HERE = Path(__file__).resolve().parent
CORPUS_DIR = (HERE / "../../../corpus").resolve()
OUTPUT_DIR = HERE / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

MAX_PAGES = 50

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="Experiment2 Chunker", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Shared schema
# ---------------------------------------------------------------------------

class Chunk(BaseModel):
    id: str
    type: str
    chapter: str | None
    section: str | None
    page_start: int | None
    page_end: int | None
    token_count: int
    text: str
    heading_text: str | None = None
    has_math: bool = False
    source_method: str


class ChunkRequest(BaseModel):
    pdf: str
    method: Literal["pdfplumber", "marker"]


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

SEMANTIC_MARKERS = re.compile(
    r"^(Definition|Theorem|Lemma|Corollary|Proposition|Proof|Example|Remark|Exercise|Solution|Note)\b",
    re.IGNORECASE,
)
PROOF_END = re.compile(r"[□■∎]|^\s*QED\s*$", re.MULTILINE)
MATH_HEURISTIC = re.compile(r"[∀∃∈∉⊆⊂∪∩→↔¬∧∨≤≥≠≈∞∂∇∑∏∫√αβγδεζηθλμνξπρστφχψω]|\\[a-zA-Z]+\{")

MARKER_TO_TYPE = {
    "definition": "definition",
    "theorem": "theorem",
    "lemma": "theorem",
    "corollary": "theorem",
    "proposition": "theorem",
    "proof": "proof",
    "example": "example",
    "remark": "remark",
    "exercise": "exercise",
    "solution": "example",
    "note": "remark",
}


def _word_count(text: str) -> int:
    return len(text.split())


def _has_math(text: str) -> bool:
    return bool(MATH_HEURISTIC.search(text))


def _chunk_id(chapter: str | None, section: str | None, ctype: str, n: int) -> str:
    parts = []
    if chapter:
        parts.append(f"ch{chapter.zfill(2)}")
    if section:
        parts.append(f"sec{section.zfill(2)}")
    parts.append(ctype)
    parts.append(str(n).zfill(3))
    return "_".join(parts)


# ---------------------------------------------------------------------------
# Method A: pdfplumber
# ---------------------------------------------------------------------------

def _chunk_pdfplumber(pdf_path: Path) -> list[dict]:
    import pdfplumber

    LINE_GAP = 4      # pt — same line if Y delta < this
    PARA_GAP = 10     # pt — new paragraph if Y gap > this
    MAX_TOKENS = 512
    HEADING_SIZE_RATIO = 1.15  # font size >= median * ratio → heading candidate

    chunks: list[dict] = []
    type_counters: dict[str, int] = {}
    current_chapter: str | None = None
    current_section: str | None = None
    current_type = "other"
    current_texts: list[str] = []
    current_page_start: int | None = None
    current_page_end: int | None = None
    current_heading: str | None = None
    in_proof = False

    def flush(force_type: str | None = None):
        nonlocal current_texts, current_page_start, current_page_end, current_heading
        if not current_texts:
            return
        body = "\n\n".join(current_texts)
        ctype = force_type or current_type
        type_counters[ctype] = type_counters.get(ctype, 0) + 1
        cid = _chunk_id(current_chapter, current_section, ctype, type_counters[ctype])
        chunks.append({
            "id": cid,
            "type": ctype,
            "chapter": current_chapter,
            "section": current_section,
            "page_start": current_page_start,
            "page_end": current_page_end,
            "token_count": _word_count(body),
            "text": body,
            "heading_text": current_heading,
            "has_math": _has_math(body),
            "source_method": "pdfplumber",
        })
        current_texts = []
        current_page_start = None
        current_page_end = None
        current_heading = None

    def _words_to_lines(words: list[dict]) -> list[dict]:
        """Group pdfplumber word dicts into lines by Y proximity."""
        if not words:
            return []
        lines: list[dict] = []
        cur_words = [words[0]]
        cur_y = words[0]["top"]
        for w in words[1:]:
            if abs(w["top"] - cur_y) <= LINE_GAP:
                cur_words.append(w)
            else:
                lines.append({"top": cur_y, "text": " ".join(x["text"] for x in cur_words),
                               "size": max((x.get("size", 10) for x in cur_words), default=10)})
                cur_words = [w]
                cur_y = w["top"]
        lines.append({"top": cur_y, "text": " ".join(x["text"] for x in cur_words),
                       "size": max((x.get("size", 10) for x in cur_words), default=10)})
        return lines

    def _lines_to_paragraphs(lines: list[dict]) -> list[dict]:
        """Group lines into paragraphs by vertical gap."""
        if not lines:
            return []
        paras: list[dict] = []
        cur_lines = [lines[0]]
        for line in lines[1:]:
            gap = line["top"] - cur_lines[-1]["top"]
            if gap > PARA_GAP:
                paras.append({
                    "text": " ".join(l["text"] for l in cur_lines),
                    "size": max(l["size"] for l in cur_lines),
                })
                cur_lines = [line]
            else:
                cur_lines.append(line)
        paras.append({
            "text": " ".join(l["text"] for l in cur_lines),
            "size": max(l["size"] for l in cur_lines),
        })
        return paras

    def _strip_header_footer(words: list[dict], page_height: float) -> list[dict]:
        top_cut = page_height * 0.05
        bot_cut = page_height * 0.95
        return [w for w in words if top_cut <= w["top"] <= bot_cut]

    with pdfplumber.open(str(pdf_path)) as pdf:
        pages = pdf.pages[:MAX_PAGES]

        # Collect all char sizes to compute median body size
        all_sizes: list[float] = []
        for page in pages:
            for char in (page.chars or []):
                if char.get("size"):
                    all_sizes.append(char["size"])
        if all_sizes:
            all_sizes.sort()
            median_size = all_sizes[len(all_sizes) // 2]
        else:
            median_size = 10.0
        heading_threshold = median_size * HEADING_SIZE_RATIO

        for page in pages:
            page_num = page.page_number
            page_height = page.height

            # Enrich words with char-level font size
            char_map: dict[tuple, float] = {}
            for ch in (page.chars or []):
                key = (round(ch["x0"]), round(ch["top"]))
                char_map[key] = ch.get("size", median_size)

            raw_words = page.extract_words(keep_blank_chars=False, use_text_flow=True) or []
            words = _strip_header_footer(raw_words, page_height)

            # Attach size to each word from nearest char
            for w in words:
                key = (round(w["x0"]), round(w["top"]))
                w["size"] = char_map.get(key, median_size)

            lines = _words_to_lines(words)
            paragraphs = _lines_to_paragraphs(lines)

            for para in paragraphs:
                text = para["text"].strip()
                if not text:
                    continue

                # Heading detection by font size
                is_heading = para["size"] >= heading_threshold
                ch_match = re.match(r"^(\d+)\s+[A-Z]", text)
                sec_match = re.match(r"^(\d+)\.(\d+)\s+[A-Z]", text)

                if is_heading and (ch_match or sec_match):
                    flush()
                    if sec_match:
                        current_chapter = sec_match.group(1)
                        current_section = sec_match.group(2)
                    elif ch_match:
                        current_chapter = ch_match.group(1)
                        current_section = None
                    current_type = "section"
                    current_heading = text[:120]
                    current_texts = [text]
                    current_page_start = page_num
                    current_page_end = page_num
                    continue

                # Semantic marker detection
                marker_match = SEMANTIC_MARKERS.match(text)
                if marker_match:
                    flush()
                    marker_word = marker_match.group(1).lower()
                    current_type = MARKER_TO_TYPE.get(marker_word, "other")
                    in_proof = current_type == "proof"
                    current_heading = text[:120]
                    current_texts = [text]
                    current_page_start = page_num
                    current_page_end = page_num
                    continue

                # Proof end
                if in_proof and PROOF_END.search(text):
                    current_texts.append(text)
                    current_page_end = page_num
                    flush()
                    in_proof = False
                    current_type = "other"
                    continue

                # Token ceiling split (non-proof only)
                if not in_proof and current_texts:
                    body_so_far = "\n\n".join(current_texts) + "\n\n" + text
                    if _word_count(body_so_far) > MAX_TOKENS:
                        flush()
                        current_type = current_type  # continue same type
                        current_page_start = page_num

                if current_page_start is None:
                    current_page_start = page_num
                current_page_end = page_num
                current_texts.append(text)

    flush()
    return chunks


# ---------------------------------------------------------------------------
# Method B: marker
# ---------------------------------------------------------------------------

def _chunk_marker(pdf_path: Path) -> list[dict]:
    # Avoid GPU unless available
    if "TORCH_DEVICE" not in os.environ:
        try:
            import torch
            if not torch.cuda.is_available():
                os.environ["TORCH_DEVICE"] = "cpu"
        except ImportError:
            os.environ["TORCH_DEVICE"] = "cpu"

    from marker.converters.pdf import PdfConverter
    from marker.models import create_model_dict
    from marker.config.parser import ConfigParser

    page_range = ",".join(str(i) for i in range(MAX_PAGES))  # "0,1,2,...,49"

    config = {
        "output_format": "json",
        "page_range": page_range,
    }
    config_parser = ConfigParser(config)
    converter = PdfConverter(
        config=config_parser.generate_config_dict(),
        artifact_dict=create_model_dict(),
    )
    rendered = converter(str(pdf_path))

    # rendered is a RenderedDocument; .children is a list of page blocks
    chunks: list[dict] = []
    type_counters: dict[str, int] = {}

    def _marker_block_type(block_type: str) -> str:
        mapping = {
            "SectionHeader": "section",
            "Text": "other",
            "Table": "table",
            "Figure": "figure",
            "Equation": "theorem",
            "ListGroup": "other",
            "CodeBlock": "other",
        }
        return mapping.get(block_type, "other")

    def _extract_text(block) -> str:
        """Recursively extract plain text from a marker block."""
        parts: list[str] = []
        if hasattr(block, "html") and block.html:
            # Strip HTML tags
            text = re.sub(r"<[^>]+>", " ", block.html)
            text = re.sub(r"\s+", " ", text).strip()
            parts.append(text)
        elif hasattr(block, "children") and block.children:
            for child in block.children:
                t = _extract_text(child)
                if t:
                    parts.append(t)
        return "\n".join(parts)

    current_chapter: str | None = None
    current_section: str | None = None

    # marker JSON: rendered.children = list of PageGroup; each has .children = blocks
    pages = rendered.children if hasattr(rendered, "children") else []
    for page_group in pages:
        page_num = getattr(page_group, "page", None)
        if page_num is None and hasattr(page_group, "metadata"):
            page_num = getattr(page_group.metadata, "page_number", None)
        page_num = (page_num or 0) + 1  # marker is 0-indexed

        blocks = page_group.children if hasattr(page_group, "children") else []
        for block in blocks:
            raw_type = type(block).__name__
            ctype = _marker_block_type(raw_type)
            text = _extract_text(block)
            if not text:
                continue

            # Refine type by semantic markers
            marker_match = SEMANTIC_MARKERS.match(text)
            if marker_match:
                ctype = MARKER_TO_TYPE.get(marker_match.group(1).lower(), ctype)

            heading_text: str | None = None
            if ctype == "section" or raw_type == "SectionHeader":
                ctype = "section"
                heading_text = text[:120]
                # Try to extract chapter/section numbers
                m = re.match(r"^(\d+)\.(\d+)", text)
                if m:
                    current_chapter = m.group(1)
                    current_section = m.group(2)
                else:
                    m2 = re.match(r"^(\d+)\s+[A-Z]", text)
                    if m2:
                        current_chapter = m2.group(1)
                        current_section = None

            type_counters[ctype] = type_counters.get(ctype, 0) + 1
            cid = _chunk_id(current_chapter, current_section, ctype, type_counters[ctype])

            chunks.append({
                "id": cid,
                "type": ctype,
                "chapter": current_chapter,
                "section": current_section,
                "page_start": page_num,
                "page_end": page_num,
                "token_count": _word_count(text),
                "text": text,
                "heading_text": heading_text,
                "has_math": _has_math(text),
                "source_method": "marker",
            })

    return chunks


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/pdfs")
def list_pdfs() -> list[str]:
    if not CORPUS_DIR.exists():
        return []
    return sorted(
        p.name for p in CORPUS_DIR.iterdir()
        if p.suffix.lower() == ".pdf" and not p.name.endswith(":Zone.Identifier")
    )


@app.post("/chunk")
def chunk_pdf(req: ChunkRequest) -> dict:
    pdf_path = CORPUS_DIR / req.pdf
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail=f"PDF not found: {req.pdf}")

    cache_path = OUTPUT_DIR / f"{pdf_path.stem}__{req.method}.json"
    if cache_path.exists():
        with open(cache_path) as f:
            chunks = json.load(f)
        return {"chunks": chunks, "cached": True, "count": len(chunks)}

    if req.method == "pdfplumber":
        chunks = _chunk_pdfplumber(pdf_path)
    elif req.method == "marker":
        chunks = _chunk_marker(pdf_path)
    else:
        raise HTTPException(status_code=400, detail="Unknown method")

    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)

    return {"chunks": chunks, "cached": False, "count": len(chunks)}


@app.get("/chunk/{pdf_stem}/{method}")
def get_cached(pdf_stem: str, method: str) -> dict:
    cache_path = OUTPUT_DIR / f"{pdf_stem}__{method}.json"
    if not cache_path.exists():
        raise HTTPException(status_code=404, detail="No cached result. POST /chunk first.")
    with open(cache_path) as f:
        chunks = json.load(f)
    return {"chunks": chunks, "cached": True, "count": len(chunks)}


@app.delete("/chunk/{pdf_stem}/{method}")
def clear_cache(pdf_stem: str, method: str) -> dict:
    cache_path = OUTPUT_DIR / f"{pdf_stem}__{method}.json"
    if cache_path.exists():
        cache_path.unlink()
        return {"cleared": True}
    return {"cleared": False}


# ---------------------------------------------------------------------------
# Entry
# ---------------------------------------------------------------------------

def _kill_existing(port: int = 8099) -> None:
    """Kill any process already bound to our port and wait for the socket to release."""
    import signal
    import subprocess
    import time

    killed: list[int] = []
    try:
        result = subprocess.run(
            ["ss", "-tlnp", f"sport = :{port}"],
            capture_output=True, text=True, check=False,
        )
        for line in result.stdout.splitlines():
            # ss output: ... users:(("python",pid=12345,...),("python",pid=67890,...))
            for m in re.finditer(r'pid=(\d+)', line):
                pid = int(m.group(1))
                try:
                    os.kill(pid, signal.SIGTERM)
                    killed.append(pid)
                    print(f"[startup] killed existing process pid={pid} on port {port}", flush=True)
                except ProcessLookupError:
                    pass
    except FileNotFoundError:
        # ss not available — fall back to fuser
        try:
            subprocess.run(["fuser", "-k", f"{port}/tcp"], check=False,
                           capture_output=True)
            print(f"[startup] fuser killed processes on port {port}", flush=True)
            killed.append(-1)  # sentinel so we still wait
        except FileNotFoundError:
            print(f"[startup] warning: neither ss nor fuser found; skipping port {port} cleanup", flush=True)

    if killed:
        # Wait up to 3 s for the socket to fully release
        for _ in range(30):
            result = subprocess.run(
                ["ss", "-tlnp", f"sport = :{port}"],
                capture_output=True, text=True, check=False,
            )
            if f":{port}" not in result.stdout:
                break
            time.sleep(0.1)


if __name__ == "__main__":
    _kill_existing(8099)
    uvicorn.run("backend:app", host="0.0.0.0", port=8099, reload=True)

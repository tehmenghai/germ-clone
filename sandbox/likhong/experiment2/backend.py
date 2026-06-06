#!/usr/bin/env python3
"""Experiment2 backend — dual-method PDF chunker (pdfplumber + marker)."""

import json
import os
import re
import time
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
app = FastAPI(title="Experiment2 Chunker", version="0.2.0")
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
    chapter_title: str | None
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
    low_memory: bool = False   # Option B: 3 models + float16, no table/OCR-error models
    pre_slice: bool = False    # Option C: write first MAX_PAGES pages to /tmp before parsing


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

SEMANTIC_MARKERS = re.compile(
    r"^(Definition|Theorem|Lemma|Corollary|Proposition|Proof|Example|Remark|Exercise|Solution|Note)\b",
    re.IGNORECASE,
)
PROOF_END = re.compile(r"[□■∎]|^\s*QED\s*$", re.MULTILINE)
MATH_HEURISTIC = re.compile(r"[∀∃∈∉⊆⊂∪∩→↔¬∧∨≤≥≠≈∞∂∇∑∏∫√αβγδεζηθλμνξπρστφχψω]|\\[a-zA-Z]+\{")

# Chapter heading patterns: "Chapter 3", "3 Introduction", "CHAPTER 3 ..."
CHAPTER_PATTERNS = [
    re.compile(r"^chapter\s+(\d+)\b", re.IGNORECASE),
    re.compile(r"^(\d+)\s{1,4}([A-Z][a-z]{3,})"),   # "3 Introduction"
    re.compile(r"^part\s+(\d+)\b", re.IGNORECASE),
]

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
# Chapter pre-pass (pdfplumber)
# ---------------------------------------------------------------------------

def _detect_chapters_pdfplumber(pdf_path: Path) -> list[dict]:
    """
    Quick pass over the first MAX_PAGES pages to find chapter boundaries.
    Returns a list of {chapter_num, title, page_start} dicts, ordered by page.
    """
    import pdfplumber

    chapters: list[dict] = []
    seen: set[str] = set()

    with pdfplumber.open(str(pdf_path)) as pdf:
        pages = pdf.pages[:MAX_PAGES]

        all_sizes: list[float] = []
        for page in pages:
            for ch in (page.chars or []):
                if ch.get("size"):
                    all_sizes.append(ch["size"])
        if all_sizes:
            all_sizes.sort()
            median_size = all_sizes[len(all_sizes) // 2]
        else:
            median_size = 10.0
        # Chapter headings are typically significantly larger than body text
        chapter_threshold = median_size * 1.4

        for page in pages:
            page_num = page.page_number
            page_height = page.height
            top_cut = page_height * 0.05
            bot_cut = page_height * 0.95

            char_map: dict[tuple, float] = {}
            for ch in (page.chars or []):
                key = (round(ch["x0"]), round(ch["top"]))
                char_map[key] = ch.get("size", median_size)

            raw_words = page.extract_words(keep_blank_chars=False, use_text_flow=True) or []
            words = [w for w in raw_words if top_cut <= w["top"] <= bot_cut]
            for w in words:
                key = (round(w["x0"]), round(w["top"]))
                w["size"] = char_map.get(key, median_size)

            # Group into lines
            if not words:
                continue
            lines: list[dict] = []
            cur_words = [words[0]]
            cur_y = words[0]["top"]
            for w in words[1:]:
                if abs(w["top"] - cur_y) <= 4:
                    cur_words.append(w)
                else:
                    lines.append({
                        "text": " ".join(x["text"] for x in cur_words),
                        "size": max(x.get("size", median_size) for x in cur_words),
                    })
                    cur_words = [w]
                    cur_y = w["top"]
            lines.append({
                "text": " ".join(x["text"] for x in cur_words),
                "size": max(x.get("size", median_size) for x in cur_words),
            })

            for line in lines:
                text = line["text"].strip()
                if not text or len(text) < 3:
                    continue
                is_large = line["size"] >= chapter_threshold

                for pat in CHAPTER_PATTERNS:
                    m = pat.match(text)
                    if m and is_large:
                        num = m.group(1)
                        key = f"ch{num}"
                        if key not in seen:
                            seen.add(key)
                            chapters.append({
                                "chapter_num": num,
                                "title": text[:100],
                                "page_start": page_num,
                            })
                        break

    return sorted(chapters, key=lambda c: int(c["chapter_num"]))


def _chapter_title_for_page(chapters: list[dict], page: int) -> tuple[str | None, str | None]:
    """Return (chapter_num, title) for the chapter that owns the given page."""
    if not chapters:
        return None, None
    result_num, result_title = None, None
    for ch in chapters:
        if ch["page_start"] <= page:
            result_num = ch["chapter_num"]
            result_title = ch["title"]
        else:
            break
    return result_num, result_title


# ---------------------------------------------------------------------------
# Pipeline telemetry collector
# ---------------------------------------------------------------------------

class PipelineTelemetry:
    """Collects per-stage counts during a chunking run."""

    def __init__(self):
        self.stages: list[dict] = []
        self._t0 = time.perf_counter()
        self._stage_start = self._t0

    def record(self, stage: str, count: int, detail: str = ""):
        now = time.perf_counter()
        self.stages.append({
            "stage": stage,
            "count": count,
            "detail": detail,
            "elapsed_ms": round((now - self._stage_start) * 1000),
        })
        self._stage_start = now

    def total_ms(self) -> int:
        return round((time.perf_counter() - self._t0) * 1000)


# ---------------------------------------------------------------------------
# Method A: pdfplumber
# ---------------------------------------------------------------------------

def _chunk_pdfplumber(pdf_path: Path, telemetry: PipelineTelemetry) -> list[dict]:
    import pdfplumber

    LINE_GAP = 4
    PARA_GAP = 10
    MAX_TOKENS = 512
    HEADING_SIZE_RATIO = 1.15

    # Stage 1 — chapter detection
    chapters = _detect_chapters_pdfplumber(pdf_path)
    telemetry.record("chapter_detection", len(chapters),
                     f"{len(chapters)} chapters found in pages 1–{MAX_PAGES}")

    chunks: list[dict] = []
    type_counters: dict[str, int] = {}
    current_chapter: str | None = None
    current_chapter_title: str | None = None
    current_section: str | None = None
    current_type = "other"
    current_texts: list[str] = []
    current_page_start: int | None = None
    current_page_end: int | None = None
    current_heading: str | None = None
    in_proof = False

    pages_processed = 0
    raw_paragraph_count = 0

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
            "chapter_title": current_chapter_title,
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
        if not lines:
            return []
        paras: list[dict] = []
        cur_lines = [lines[0]]
        for line in lines[1:]:
            gap = line["top"] - cur_lines[-1]["top"]
            if gap > PARA_GAP:
                paras.append({
                    "text": " ".join(ln["text"] for ln in cur_lines),
                    "size": max(ln["size"] for ln in cur_lines),
                })
                cur_lines = [line]
            else:
                cur_lines.append(line)
        paras.append({
            "text": " ".join(ln["text"] for ln in cur_lines),
            "size": max(ln["size"] for ln in cur_lines),
        })
        return paras

    def _strip_header_footer(words: list[dict], page_height: float) -> list[dict]:
        top_cut = page_height * 0.05
        bot_cut = page_height * 0.95
        return [w for w in words if top_cut <= w["top"] <= bot_cut]

    with pdfplumber.open(str(pdf_path)) as pdf:
        pages = pdf.pages[:MAX_PAGES]

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

        # Stage 2 — page extraction
        for page in pages:
            pages_processed += 1
            page_num = page.page_number
            page_height = page.height

            # Update chapter context from pre-pass
            ch_num, ch_title = _chapter_title_for_page(chapters, page_num)
            if ch_num and ch_num != current_chapter:
                flush()
                current_chapter = ch_num
                current_chapter_title = ch_title

            char_map: dict[tuple, float] = {}
            for ch in (page.chars or []):
                key = (round(ch["x0"]), round(ch["top"]))
                char_map[key] = ch.get("size", median_size)

            raw_words = page.extract_words(keep_blank_chars=False, use_text_flow=True) or []
            words = _strip_header_footer(raw_words, page_height)

            for w in words:
                key = (round(w["x0"]), round(w["top"]))
                w["size"] = char_map.get(key, median_size)

            lines = _words_to_lines(words)
            paragraphs = _lines_to_paragraphs(lines)
            raw_paragraph_count += len(paragraphs)

            for para in paragraphs:
                text = para["text"].strip()
                if not text:
                    continue

                is_heading = para["size"] >= heading_threshold
                ch_match = re.match(r"^(\d+)\s+[A-Z]", text)
                sec_match = re.match(r"^(\d+)\.(\d+)\s+[A-Z]", text)

                if is_heading and (ch_match or sec_match):
                    flush()
                    if sec_match:
                        current_chapter = sec_match.group(1)
                        current_section = sec_match.group(2)
                        # Sync chapter title from pre-pass
                        _, current_chapter_title = _chapter_title_for_page(chapters, page_num)
                    elif ch_match:
                        current_chapter = ch_match.group(1)
                        current_section = None
                        _, current_chapter_title = _chapter_title_for_page(chapters, page_num)
                    current_type = "section"
                    current_heading = text[:120]
                    current_texts = [text]
                    current_page_start = page_num
                    current_page_end = page_num
                    continue

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

                if in_proof and PROOF_END.search(text):
                    current_texts.append(text)
                    current_page_end = page_num
                    flush()
                    in_proof = False
                    current_type = "other"
                    continue

                if not in_proof and current_texts:
                    body_so_far = "\n\n".join(current_texts) + "\n\n" + text
                    if _word_count(body_so_far) > MAX_TOKENS:
                        flush()
                        current_page_start = page_num

                if current_page_start is None:
                    current_page_start = page_num
                current_page_end = page_num
                current_texts.append(text)

    flush()

    telemetry.record("page_extraction", pages_processed,
                     f"{pages_processed} pages → {raw_paragraph_count} raw paragraphs")
    telemetry.record("heading_detection",
                     sum(1 for c in chunks if c["type"] == "section"),
                     f"font-size ≥ median×{HEADING_SIZE_RATIO} or numbered pattern")
    telemetry.record("semantic_typing",
                     sum(1 for c in chunks if c["type"] not in ("section", "other")),
                     "SEMANTIC_MARKERS regex pass")
    telemetry.record("token_ceiling_splits",
                     sum(1 for c in chunks if c["type"] == "other"),
                     f"MAX_TOKENS={MAX_TOKENS} words; other-typed chunks may be splits")
    telemetry.record("output", len(chunks),
                     f"{len(chunks)} chunks across {len(chapters)} chapters")

    return chunks


# ---------------------------------------------------------------------------
# Option C helper: pre-slice PDF to /tmp
# ---------------------------------------------------------------------------

def _slice_pdf(src: Path, n_pages: int = MAX_PAGES) -> Path:
    """Write the first n_pages of src to /tmp and return the path. Cached by stem+n."""
    out = Path("/tmp") / f"{src.stem}_p{n_pages}.pdf"
    if out.exists():
        return out
    from pypdf import PdfWriter, PdfReader
    reader = PdfReader(str(src))
    writer = PdfWriter()
    for page in reader.pages[:n_pages]:
        writer.add_page(page)
    with open(out, "wb") as f:
        writer.write(f)
    return out


# ---------------------------------------------------------------------------
# Method B: marker
# ---------------------------------------------------------------------------

def _chunk_marker(
    pdf_path: Path,
    telemetry: PipelineTelemetry,
    low_memory: bool = False,
    pre_slice: bool = False,
) -> list[dict]:
    import torch

    if "TORCH_DEVICE" not in os.environ:
        if not torch.cuda.is_available():
            os.environ["TORCH_DEVICE"] = "cpu"

    from marker.converters.pdf import PdfConverter
    from marker.models import create_model_dict
    from marker.config.parser import ConfigParser

    target_path = _slice_pdf(pdf_path) if pre_slice else pdf_path
    # When pre-sliced the file already has MAX_PAGES pages max; still pass
    # page_range to marker as a belt-and-braces guard.
    page_range = ",".join(str(i) for i in range(MAX_PAGES))

    config = {
        "output_format": "json",
        "page_range": page_range,
        "disable_multiprocessing": True,
    }
    config_parser = ConfigParser(config)

    if low_memory:
        # Option B: all 5 models loaded at float16/cpu; TableProcessor and
        # line OCR-error check excluded via processor_list to avoid invoking
        # table_rec_model and ocr_error_model (they are still in artifact_dict
        # but never called — passing None would crash builders/processors).
        dtype = torch.float16
        device = "cpu"
        artifact_dict = create_model_dict(device=device, dtype=dtype)
        # Exclude table and OCR-error processors so those models are never invoked.
        # This is the safe way — the models are loaded but dormant.
        low_mem_processors = [
            p for p in [
                "marker.processors.order.OrderProcessor",
                "marker.processors.block_relabel.BlockRelabelProcessor",
                "marker.processors.line_merge.LineMergeProcessor",
                "marker.processors.blockquote.BlockquoteProcessor",
                "marker.processors.code.CodeProcessor",
                "marker.processors.document_toc.DocumentTOCProcessor",
                "marker.processors.equation.EquationProcessor",
                "marker.processors.footnote.FootnoteProcessor",
                "marker.processors.ignoretext.IgnoreTextProcessor",
                "marker.processors.line_numbers.LineNumbersProcessor",
                "marker.processors.list.ListProcessor",
                "marker.processors.page_header.PageHeaderProcessor",
                "marker.processors.sectionheader.SectionHeaderProcessor",
                # TableProcessor excluded — skips table_rec_model
                "marker.processors.text.TextProcessor",
                "marker.processors.reference.ReferenceProcessor",
                "marker.processors.blank_page.BlankPageProcessor",
            ]
        ]
        telemetry.record("model_load", 5, "low_memory: 5 models at float16/cpu; TableProcessor excluded")
    else:
        artifact_dict = create_model_dict()
        low_mem_processors = None
        telemetry.record("model_load", 5, "standard: 5 models (float32)")

    converter = PdfConverter(
        config=config_parser.generate_config_dict(),
        artifact_dict=artifact_dict,
        processor_list=low_mem_processors,
    )

    telemetry.record("model_load", 1, "marker models loaded (layout + OCR + order)")
    rendered = converter(str(target_path))
    sliced_note = " (pre-sliced)" if pre_slice else ""
    telemetry.record("pdf_conversion", MAX_PAGES, f"pages 0–{MAX_PAGES - 1} converted to JSON blocks{sliced_note}")

    chunks: list[dict] = []
    type_counters: dict[str, int] = {}
    block_count = 0

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
        parts: list[str] = []
        if hasattr(block, "html") and block.html:
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
    current_chapter_title: str | None = None
    current_section: str | None = None

    pages = rendered.children if hasattr(rendered, "children") else []
    for page_group in pages:
        page_num = getattr(page_group, "page", None)
        if page_num is None and hasattr(page_group, "metadata"):
            page_num = getattr(page_group.metadata, "page_number", None)
        page_num = (page_num or 0) + 1

        blocks = page_group.children if hasattr(page_group, "children") else []
        for block in blocks:
            block_count += 1
            raw_type = type(block).__name__
            ctype = _marker_block_type(raw_type)
            text = _extract_text(block)
            if not text:
                continue

            marker_match = SEMANTIC_MARKERS.match(text)
            if marker_match:
                ctype = MARKER_TO_TYPE.get(marker_match.group(1).lower(), ctype)

            heading_text: str | None = None
            if ctype == "section" or raw_type == "SectionHeader":
                ctype = "section"
                heading_text = text[:120]
                m = re.match(r"^(\d+)\.(\d+)", text)
                if m:
                    current_chapter = m.group(1)
                    current_section = m.group(2)
                else:
                    m2 = re.match(r"^(\d+)\s+[A-Z]", text)
                    if m2:
                        current_chapter = m2.group(1)
                        current_section = None

                # Try to resolve chapter title from heading text
                for pat in CHAPTER_PATTERNS:
                    mc = pat.match(text)
                    if mc:
                        current_chapter_title = text[:100]
                        break

            type_counters[ctype] = type_counters.get(ctype, 0) + 1
            cid = _chunk_id(current_chapter, current_section, ctype, type_counters[ctype])

            chunks.append({
                "id": cid,
                "type": ctype,
                "chapter": current_chapter,
                "chapter_title": current_chapter_title,
                "section": current_section,
                "page_start": page_num,
                "page_end": page_num,
                "token_count": _word_count(text),
                "text": text,
                "heading_text": heading_text,
                "has_math": _has_math(text),
                "source_method": "marker",
            })

    telemetry.record("block_classification", block_count,
                     f"{block_count} blocks typed via marker block_type + SEMANTIC_MARKERS")
    telemetry.record("output", len(chunks), f"{len(chunks)} chunks emitted")

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


def _cache_suffix(method: str, low_memory: bool, pre_slice: bool) -> str:
    """Build a unique cache filename suffix encoding method + options."""
    parts = [method]
    if low_memory:
        parts.append("lowmem")
    if pre_slice:
        parts.append("sliced")
    return "__".join(parts)


@app.post("/chunk")
def chunk_pdf(req: ChunkRequest) -> dict:
    pdf_path = CORPUS_DIR / req.pdf
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail=f"PDF not found: {req.pdf}")

    suffix = _cache_suffix(req.method, req.low_memory, req.pre_slice)
    cache_path = OUTPUT_DIR / f"{pdf_path.stem}__{suffix}.json"
    if cache_path.exists():
        with open(cache_path) as f:
            data = json.load(f)
        if isinstance(data, list):
            chunks = data
            pipeline = []
        else:
            chunks = data.get("chunks", [])
            pipeline = data.get("pipeline", [])
        return {"chunks": chunks, "pipeline": pipeline, "cached": True, "count": len(chunks)}

    telemetry = PipelineTelemetry()

    if req.method == "pdfplumber":
        chunks = _chunk_pdfplumber(pdf_path, telemetry)
    elif req.method == "marker":
        chunks = _chunk_marker(pdf_path, telemetry, low_memory=req.low_memory, pre_slice=req.pre_slice)
    else:
        raise HTTPException(status_code=400, detail="Unknown method")

    pipeline = telemetry.stages

    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump({"chunks": chunks, "pipeline": pipeline}, f, ensure_ascii=False, indent=2)

    return {
        "chunks": chunks,
        "pipeline": pipeline,
        "cached": False,
        "count": len(chunks),
        "total_ms": telemetry.total_ms(),
    }


@app.get("/chunk/{pdf_stem}/{suffix}")
def get_cached(pdf_stem: str, suffix: str) -> dict:
    cache_path = OUTPUT_DIR / f"{pdf_stem}__{suffix}.json"
    if not cache_path.exists():
        raise HTTPException(status_code=404, detail="No cached result. POST /chunk first.")
    with open(cache_path) as f:
        data = json.load(f)
    if isinstance(data, list):
        chunks = data
        pipeline = []
    else:
        chunks = data.get("chunks", [])
        pipeline = data.get("pipeline", [])
    return {"chunks": chunks, "pipeline": pipeline, "cached": True, "count": len(chunks)}


@app.delete("/chunk/{pdf_stem}/{suffix}")
def clear_cache(pdf_stem: str, suffix: str) -> dict:
    cache_path = OUTPUT_DIR / f"{pdf_stem}__{suffix}.json"
    if cache_path.exists():
        cache_path.unlink()
        return {"cleared": True}
    return {"cleared": False}


# ---------------------------------------------------------------------------
# Entry
# ---------------------------------------------------------------------------

def _kill_existing(port: int = 8099) -> None:
    import signal
    import subprocess
    import time as _time

    killed: list[int] = []
    try:
        result = subprocess.run(
            ["ss", "-tlnp", f"sport = :{port}"],
            capture_output=True, text=True, check=False,
        )
        for line in result.stdout.splitlines():
            for m in re.finditer(r'pid=(\d+)', line):
                pid = int(m.group(1))
                try:
                    os.kill(pid, signal.SIGTERM)
                    killed.append(pid)
                    print(f"[startup] killed existing process pid={pid} on port {port}", flush=True)
                except ProcessLookupError:
                    pass
    except FileNotFoundError:
        try:
            subprocess.run(["fuser", "-k", f"{port}/tcp"], check=False, capture_output=True)
            print(f"[startup] fuser killed processes on port {port}", flush=True)
            killed.append(-1)
        except FileNotFoundError:
            print(f"[startup] warning: neither ss nor fuser found; skipping port {port} cleanup", flush=True)

    if killed:
        for _ in range(30):
            result = subprocess.run(
                ["ss", "-tlnp", f"sport = :{port}"],
                capture_output=True, text=True, check=False,
            )
            if f":{port}" not in result.stdout:
                break
            _time.sleep(0.1)


if __name__ == "__main__":
    _kill_existing(8099)
    uvicorn.run("backend:app", host="0.0.0.0", port=8099, reload=True)

"""
extract_with_marker_BEN0601.py

Converts all PDFs in data_BEN0601/raw_BEN0601/ to Markdown using PyMuPDF.
Output goes to data_BEN0601/marker_output_BEN0601/<pdf_stem>/<pdf_stem>.md
Logs success/failure to data_BEN0601/logs_BEN0601/

PyMuPDF replaces marker-pdf as the extraction engine — same output contract,
no heavy ML models, no WSL memory issues. Suitable for machine-readable PDFs
(annotated course slides, textbooks). Not for scanned/image-only PDFs.

Usage (from project root):
    python source/backend/ingestion/extract_with_marker_BEN0601.py

Do NOT chunk directly from the PDF — always go:
    PDF → extracted Markdown → cleaned Markdown → chunks
"""

import logging
import sys
from datetime import datetime
from pathlib import Path

import fitz  # pymupdf
import yaml

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent  # source/backend/ingestion → project root
CONFIG_FILE = SCRIPT_DIR / "ingestion_config_BEN0601.yaml"


def load_config() -> dict:
    with open(CONFIG_FILE) as f:
        return yaml.safe_load(f)


def setup_logging(logs_dir: Path) -> logging.Logger:
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_file = logs_dir / f"extraction_BEN0601_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

    logger = logging.getLogger("extraction_BEN0601")
    logger.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s  %(levelname)-7s  %(message)s", datefmt="%H:%M:%S")

    fh = logging.FileHandler(log_file)
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    ch = logging.StreamHandler()
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    return logger


def pdf_to_markdown(pdf_path: Path) -> str:
    """
    Extract text from a machine-readable PDF using PyMuPDF.

    Heuristic heading detection: a line is treated as a heading if it is
    short (≤ 80 chars), ends without a full stop, and is followed by a
    blank line or a significantly longer paragraph. Font-size data from
    PyMuPDF's dict mode gives a cleaner signal when available.
    """
    doc = fitz.open(pdf_path)
    sections: list[str] = []

    for page_num, page in enumerate(doc, start=1):
        blocks = page.get_text("dict")["blocks"]
        page_lines: list[str] = [f"\n<!-- page {page_num} -->"]

        for block in blocks:
            if block["type"] != 0:  # skip image blocks
                continue

            for line in block["lines"]:
                spans = line["spans"]
                if not spans:
                    continue

                text = " ".join(s["text"].strip() for s in spans if s["text"].strip())
                if not text:
                    continue

                # Use the max font size in the line as a heading signal
                max_size = max(s["size"] for s in spans)
                is_bold = any("Bold" in s.get("font", "") or "bold" in s.get("font", "") for s in spans)

                if max_size >= 14 or (max_size >= 12 and is_bold):
                    page_lines.append(f"\n## {text}")
                elif max_size >= 11 and is_bold:
                    page_lines.append(f"\n### {text}")
                else:
                    page_lines.append(text)

        sections.append("\n".join(page_lines))

    doc.close()
    return "\n\n".join(sections)


def extract_pdf(pdf_path: Path, output_dir: Path, logger: logging.Logger) -> bool:
    """Extract one PDF to Markdown. Returns True on success."""
    stem = pdf_path.stem
    pdf_output_dir = output_dir / stem
    pdf_output_dir.mkdir(parents=True, exist_ok=True)
    md_path = pdf_output_dir / f"{stem}.md"

    logger.info(f"Extracting : {pdf_path.name}")
    try:
        markdown = pdf_to_markdown(pdf_path)
    except Exception as e:
        logger.error(f"  [FAIL] PyMuPDF error: {e}")
        return False

    if not markdown.strip():
        logger.error("  [FAIL] No text extracted — PDF may be image-only or corrupted")
        return False

    md_path.write_text(markdown, encoding="utf-8")
    char_count = len(markdown)
    logger.info(f"  [OK]  {md_path.relative_to(PROJECT_ROOT)}  ({char_count:,} chars)")
    return True


def main() -> None:
    config = load_config()

    raw_dir = PROJECT_ROOT / config["paths"]["raw_dir"]
    output_dir = PROJECT_ROOT / config["paths"]["marker_output_dir"]
    logs_dir = PROJECT_ROOT / config["paths"]["logs_dir"]

    logger = setup_logging(logs_dir)
    logger.info("=== PDF extraction started (PyMuPDF) ===")

    pdfs = sorted(raw_dir.glob("*.pdf"))
    if not pdfs:
        logger.error(f"No PDFs found in {raw_dir.relative_to(PROJECT_ROOT)}")
        logger.error("Place at least one PDF in data_BEN0601/raw_BEN0601/ and re-run.")
        sys.exit(1)

    logger.info(f"Found {len(pdfs)} PDF(s)")

    ok, fail = 0, 0
    for pdf in pdfs:
        if extract_pdf(pdf, output_dir, logger):
            ok += 1
        else:
            fail += 1

    logger.info(f"=== Done: {ok} succeeded, {fail} failed ===")
    if fail:
        sys.exit(1)


if __name__ == "__main__":
    main()

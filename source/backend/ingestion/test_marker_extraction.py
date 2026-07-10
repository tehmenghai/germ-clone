"""
test_marker_extraction.py

Smoke test for PDF extraction.
Runs extraction on the first PDF found in raw/, confirms Markdown output exists,
and prints the output path.

Usage (from project root):
    python source/backend/ingestion/test_marker_extraction.py
"""

import sys
from pathlib import Path

import yaml

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent  # source/backend/ingestion → project root
CONFIG_FILE = SCRIPT_DIR / "ingestion_config.yaml"


def main() -> None:
    with open(CONFIG_FILE) as f:
        config = yaml.safe_load(f)

    raw_dir = PROJECT_ROOT / config["paths"]["raw_dir"]
    output_dir = PROJECT_ROOT / config["paths"]["marker_output_dir"]

    # 1. Check raw folder has at least one PDF
    pdfs = sorted(raw_dir.glob("*.pdf"))
    if not pdfs:
        print(f"[FAIL] No PDFs found in {raw_dir.relative_to(PROJECT_ROOT)}")
        print("       Add a PDF to data_01_raw/raw/ and re-run.")
        sys.exit(1)

    target = pdfs[0]
    print(f"[INFO] PDF found   : {target.name}")
    print(f"[INFO] Running PyMuPDF extraction...")

    # 2. Import and call the extractor directly (no subprocess — no memory spike)
    from extract_with_marker import extract_pdf
    import logging
    logger = logging.getLogger("smoke_test")
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    stem = target.stem
    pdf_output_dir = output_dir / stem
    pdf_output_dir.mkdir(parents=True, exist_ok=True)

    ok = extract_pdf(target, output_dir, logger)
    if not ok:
        print("[FAIL] Extraction failed — check output above.")
        sys.exit(1)

    # 3. Confirm Markdown output file exists
    md_files = list(pdf_output_dir.rglob("*.md"))
    if not md_files:
        print(f"[FAIL] No .md file found in {pdf_output_dir.relative_to(PROJECT_ROOT)}")
        sys.exit(1)

    # 4. Print output paths and a short content preview
    print("[OK]   Extraction succeeded.")
    for md in md_files:
        print(f"       Output : {md.relative_to(PROJECT_ROOT)}")
        preview = md.read_text(encoding="utf-8")[:300].replace("\n", " ")
        print(f"       Preview: {preview}...")


if __name__ == "__main__":
    # Run from the ingestion directory so the local import works
    import os
    os.chdir(SCRIPT_DIR)
    main()

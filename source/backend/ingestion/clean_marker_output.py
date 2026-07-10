"""
clean_marker_output.py

Cleans the PyMuPDF-extracted Markdown files in data_01_raw/marker_output/
and writes cleaned versions to data_01_raw/processed/

Cleaning rules applied:
  - Strip <!-- page N --> comment markers
  - Remove HTML span tags
  - Drop very short artifact lines (< 4 non-whitespace chars), except headings
  - Collapse 3+ consecutive blank lines to one blank line
  - Normalize whitespace within each line

Usage (from project root):
    python source/backend/ingestion/clean_marker_output.py
"""

import re
import sys
from pathlib import Path

import yaml

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent  # source/backend/ingestion → project root
CONFIG_FILE = SCRIPT_DIR / "ingestion_config.yaml"


def load_config() -> dict:
    with open(CONFIG_FILE) as f:
        return yaml.safe_load(f)


def clean_markdown(text: str) -> str:
    # Strip HTML page-marker comments produced by the extractor
    text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)

    # Remove any stray HTML span tags
    text = re.sub(r"</?span[^>]*>", "", text)

    lines = text.split("\n")
    cleaned: list[str] = []
    for line in lines:
        stripped = line.strip()

        # Always keep Markdown headings
        if stripped.startswith("#"):
            cleaned.append(stripped)
            continue

        # Drop very short artifact lines (page numbers, lone symbols, etc.)
        non_ws = re.sub(r"\s", "", stripped)
        if len(non_ws) < 4:
            cleaned.append("")
            continue

        # Normalise whitespace within the line
        cleaned.append(" ".join(stripped.split()))

    # Collapse 3+ consecutive blank lines to a single blank line
    result = re.sub(r"\n{3,}", "\n\n", "\n".join(cleaned))
    return result.strip()


def main() -> None:
    config = load_config()
    marker_dir = PROJECT_ROOT / config["paths"]["marker_output_dir"]
    processed_dir = PROJECT_ROOT / config["paths"]["processed_dir"]
    processed_dir.mkdir(parents=True, exist_ok=True)

    md_files = sorted(marker_dir.rglob("*.md"))
    if not md_files:
        print(f"[ERROR] No .md files found under {marker_dir.relative_to(PROJECT_ROOT)}")
        print("        Run extract_with_marker.py first.")
        sys.exit(1)

    print(f"[INFO]  Found {len(md_files)} extracted Markdown file(s)")

    ok = 0
    for md_path in md_files:
        raw_text = md_path.read_text(encoding="utf-8")
        cleaned = clean_markdown(raw_text)

        if not cleaned:
            print(f"[WARN]  {md_path.name} — empty after cleaning, skipping")
            continue

        # Output name: <original_stem>_cleaned.md
        out_name = f"{md_path.stem}_cleaned.md"
        out_path = processed_dir / out_name
        out_path.write_text(cleaned, encoding="utf-8")

        ratio = len(cleaned) / max(len(raw_text), 1)
        print(f"[OK]    {out_name}  ({len(cleaned):,} chars, {ratio:.0%} of original)")
        ok += 1

    print(f"[INFO]  Cleaned {ok} file(s) → {processed_dir.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()

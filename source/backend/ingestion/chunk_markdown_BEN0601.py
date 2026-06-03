"""
chunk_markdown_BEN0601.py

Splits cleaned Markdown files from data_BEN0601/processed_BEN0601/ into
retrieval-ready chunks and writes:
  - data_BEN0601/chunks_BEN0601/chunks_BEN0601.jsonl   (all chunks)
  - data_BEN0601/chunks_BEN0601/sample_chunks_BEN0601.jsonl  (first 5, for team inspection)

Each chunk records: chunk_id, source_file, source_type, page_start, page_end,
section_title, chunk_index, chunk_text, token_estimate, metadata.

Usage (from project root):
    python source/backend/ingestion/chunk_markdown_BEN0601.py
"""

import json
import re
import sys
from pathlib import Path

import yaml

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent  # source/backend/ingestion → project root
CONFIG_FILE = SCRIPT_DIR / "ingestion_config_BEN0601.yaml"


def load_config() -> dict:
    with open(CONFIG_FILE) as f:
        return yaml.safe_load(f)


def slugify(name: str) -> str:
    """Turn a filename stem into a safe chunk_id prefix."""
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9]+", "_", slug)
    return slug.strip("_")


def extract_headings_map(text: str) -> list[tuple[int, str]]:
    """
    Return a list of (char_offset, heading_text) pairs so each chunk
    can look up the nearest preceding heading.
    """
    mapping: list[tuple[int, str]] = []
    pos = 0
    for line in text.split("\n"):
        stripped = line.strip()
        if stripped.startswith("## "):
            mapping.append((pos, stripped[3:].strip()))
        elif stripped.startswith("### "):
            mapping.append((pos, stripped[4:].strip()))
        pos += len(line) + 1  # +1 for the newline character
    return mapping


def nearest_heading(char_offset: int, headings_map: list[tuple[int, str]]) -> str:
    """Return the most recent heading that starts at or before char_offset."""
    result = ""
    for offset, heading in headings_map:
        if offset <= char_offset:
            result = heading
        else:
            break
    return result


def chunk_document(
    text: str,
    source_file: str,
    chunk_size: int,
    chunk_overlap: int,
) -> list[dict]:
    """Sliding-window character chunking with heading tracking."""
    headings_map = extract_headings_map(text)
    slug = slugify(Path(source_file).stem)
    chunks: list[dict] = []

    start = 0
    idx = 0
    text_len = len(text)

    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunk_text = text[start:end].strip()

        # Don't emit near-empty trailing chunks
        if len(chunk_text) < 50:
            break

        section = nearest_heading(start, headings_map)
        token_estimate = max(1, len(chunk_text) // 4)
        chunk_id = f"{slug}_BEN0601_{idx + 1:04d}"

        chunks.append({
            "chunk_id": chunk_id,
            "source_file": source_file,
            "source_type": "pdf",
            "page_start": None,
            "page_end": None,
            "section_title": section,
            "chunk_index": idx,
            "chunk_text": chunk_text,
            "token_estimate": token_estimate,
            "metadata": {
                "pipeline_owner": "Ben",
                "suffix": "_BEN0601",
                "extractor": "pymupdf",
            },
        })

        idx += 1
        if end >= text_len:
            break
        start = end - chunk_overlap

    return chunks


def write_jsonl(path: Path, records: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")


def main() -> None:
    config = load_config()
    processed_dir = PROJECT_ROOT / config["paths"]["processed_dir"]
    chunks_dir = PROJECT_ROOT / config["paths"]["chunks_dir"]
    chunk_size = config["chunking"]["chunk_size"]
    chunk_overlap = config["chunking"]["chunk_overlap"]

    cleaned_files = sorted(processed_dir.glob("*_cleaned_BEN0601.md"))
    if not cleaned_files:
        print(f"[ERROR] No cleaned files found in {processed_dir.relative_to(PROJECT_ROOT)}")
        print("        Run clean_marker_output_BEN0601.py first.")
        sys.exit(1)

    print(f"[INFO]  Found {len(cleaned_files)} cleaned file(s)")
    print(f"[INFO]  Chunk size: {chunk_size} chars | Overlap: {chunk_overlap} chars")

    all_chunks: list[dict] = []

    for cleaned_path in cleaned_files:
        # Derive original PDF name: strip _cleaned_BEN0601 suffix
        pdf_stem = cleaned_path.stem.replace("_cleaned_BEN0601", "")
        source_file = f"{pdf_stem}.pdf"

        text = cleaned_path.read_text(encoding="utf-8")
        chunks = chunk_document(text, source_file, chunk_size, chunk_overlap)
        all_chunks.extend(chunks)
        print(f"[OK]    {source_file} → {len(chunks)} chunk(s)")

    if not all_chunks:
        print("[ERROR] No chunks produced — check that cleaned files have content.")
        sys.exit(1)

    # Write full JSONL
    full_path = chunks_dir / "chunks_BEN0601.jsonl"
    write_jsonl(full_path, all_chunks)
    print(f"\n[OK]    {full_path.relative_to(PROJECT_ROOT)}  ({len(all_chunks)} chunks total)")

    # Write sample JSONL (first 5 chunks)
    sample_path = chunks_dir / "sample_chunks_BEN0601.jsonl"
    write_jsonl(sample_path, all_chunks[:5])
    print(f"[OK]    {sample_path.relative_to(PROJECT_ROOT)}  (first 5 chunks — for team inspection)")


if __name__ == "__main__":
    main()

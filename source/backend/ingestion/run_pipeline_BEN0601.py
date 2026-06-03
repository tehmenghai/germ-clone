"""
run_pipeline_BEN0601.py

Runs the full BEN0601 ingestion pipeline end-to-end:

  1. Extract  — PDF → Markdown          (extract_with_marker_BEN0601.py)
  2. Clean    — Markdown → cleaned MD   (clean_marker_output_BEN0601.py)
  3. Chunk    — cleaned MD → JSONL      (chunk_markdown_BEN0601.py)
  4. Upsert   — JSONL → Neon pgvector   (upsert_pgvector_BEN0601.py)

Each stage must succeed before the next runs.
Safe to re-run — extraction overwrites, upsert is idempotent.

Usage (from project root):
    python source/backend/ingestion/run_pipeline_BEN0601.py
"""

import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent

STAGES = [
    ("Extract  (PDF → Markdown)",      "extract_with_marker_BEN0601.py"),
    ("Clean    (Markdown → cleaned)",  "clean_marker_output_BEN0601.py"),
    ("Chunk    (cleaned → JSONL)",      "chunk_markdown_BEN0601.py"),
    ("Upsert   (JSONL → pgvector)",     "upsert_pgvector_BEN0601.py"),
]

DIVIDER = "═" * 60


def run_stage(label: str, script: str) -> bool:
    script_path = SCRIPT_DIR / script
    print(f"\n{DIVIDER}")
    print(f"  STAGE: {label}")
    print(DIVIDER)

    result = subprocess.run(
        [sys.executable, str(script_path)],
        # Inherit stdout/stderr so stage output prints in real time
    )

    if result.returncode != 0:
        print(f"\n[FAIL] Stage '{label}' exited with code {result.returncode}.")
        print("       Fix the error above and re-run.")
        return False

    return True


def main() -> None:
    print(DIVIDER)
    print("  BEN0601 Ingestion Pipeline — full run")
    print(DIVIDER)

    for label, script in STAGES:
        if not run_stage(label, script):
            sys.exit(1)

    print(f"\n{DIVIDER}")
    print("  Pipeline complete — all stages succeeded.")
    print(f"{DIVIDER}")
    print("\nTo verify retrieval, run:")
    print('  python source/backend/ingestion/test_retrieval_BEN0601.py "What is overfitting?"\n')


if __name__ == "__main__":
    main()

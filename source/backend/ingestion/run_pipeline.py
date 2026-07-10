"""
run_pipeline.py

Runs the full basic ingestion pipeline end-to-end:

  1. Extract  — PDF → Markdown             (extract_with_marker.py)
  2. Clean    — Markdown → cleaned MD      (clean_marker_output.py)
  3. Chunk    — cleaned MD → JSONL         (chunk_markdown.py)
  4. Seed     — JSONL → canonical tables   (seed_from_chunks.py)

Each stage must succeed before the next runs.
Safe to re-run — extraction overwrites, seeding is idempotent.

Usage (from project root):
    python source/backend/ingestion/run_pipeline.py
"""

import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent

STAGES = [
    ("Extract  (PDF → Markdown)",       "extract_with_marker.py"),
    ("Clean    (Markdown → cleaned)",   "clean_marker_output.py"),
    ("Chunk    (cleaned → JSONL)",      "chunk_markdown.py"),
    ("Seed     (JSONL → canonical tables)", "seed_from_chunks.py"),
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
    print("  Basic Ingestion Pipeline — full run")
    print(DIVIDER)

    for label, script in STAGES:
        if not run_stage(label, script):
            sys.exit(1)

    print(f"\n{DIVIDER}")
    print("  Pipeline complete — all stages succeeded.")
    print(f"{DIVIDER}")
    print("\nTo verify retrieval, run:")
    print('  python source/backend/ingestion/dev_retrieve.py search "What is overfitting?"\n')


if __name__ == "__main__":
    main()

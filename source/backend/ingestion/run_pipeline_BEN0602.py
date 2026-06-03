"""
run_pipeline_BEN0602.py

Runs the BEN0602 improved ingestion pipeline end-to-end:

  1. Setup DB  — create rag_chunks_BEN0602 table    (setup_database_BEN0602.py)
  2. LLM Chunk — Marker MD → semantic JSONL          (llm_clean_chunk_BEN0602.py)
  3. Upsert    — JSONL → Neon pgvector               (upsert_pgvector_BEN0602.py)

Note: PDF extraction is skipped — it reuses the Marker output produced by BEN0601.
      Run extract_with_marker_BEN0601.py first if you're starting from fresh PDFs.

Each stage must succeed before the next runs.
Safe to re-run — setup uses IF NOT EXISTS; upsert is idempotent.

Usage (from project root):
    python source/backend/ingestion/run_pipeline_BEN0602.py
"""

import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent

STAGES = [
    ("Setup DB  (create rag_chunks_BEN0602)",          "setup_database_BEN0602.py"),
    ("LLM Chunk (Marker MD → semantic JSONL)",          "llm_clean_chunk_BEN0602.py"),
    ("Upsert    (JSONL → Neon pgvector)",               "upsert_pgvector_BEN0602.py"),
]

DIVIDER = "═" * 70


def run_stage(label: str, script: str) -> bool:
    script_path = SCRIPT_DIR / script
    print(f"\n{DIVIDER}")
    print(f"  STAGE: {label}")
    print(DIVIDER)

    result = subprocess.run([sys.executable, str(script_path)])

    if result.returncode != 0:
        print(f"\n[FAIL] Stage '{label}' exited with code {result.returncode}.")
        print("       Fix the error above and re-run.")
        return False

    return True


def main() -> None:
    print(DIVIDER)
    print("  BEN0602 Ingestion Pipeline — LLM-enhanced semantic chunking")
    print(DIVIDER)
    print()
    print("  Improvements over BEN0601:")
    print("    • LLM cleaning removes copyright, OCR noise, page markers")
    print("    • Concept-level chunks (not fixed 1000-char windows)")
    print("    • Slide bullets rewritten into complete teaching notes")
    print("    • Keywords + sample questions embedded alongside content")
    print("    • Structured metadata: lesson_title, topic, page_number")

    for label, script in STAGES:
        if not run_stage(label, script):
            sys.exit(1)

    print(f"\n{DIVIDER}")
    print("  BEN0602 Pipeline complete — all stages succeeded.")
    print(f"{DIVIDER}")
    print()
    print("To verify retrieval quality, run:")
    print('  python source/backend/ingestion/test_retrieval_BEN0602.py "What is overfitting?"')
    print('  python source/backend/ingestion/test_retrieval_BEN0602.py "When to use one-hot encoding?"')
    print('  python source/backend/ingestion/test_retrieval_BEN0602.py "How does gradient descent work?"')
    print()


if __name__ == "__main__":
    main()

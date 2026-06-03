"""
embed_google_BEN0601.py

Embedding utility for the BEN0601 ingestion pipeline.
Uses Google AI Studio / Gemini API — model: gemini-embedding-2, dim: 768.

Exposes two functions used by sibling scripts:
    embed_document(text)  — for indexing chunks
    embed_query(text)     — for retrieval queries

Also runnable standalone as a smoke test:
    python source/backend/ingestion/embed_google_BEN0601.py
"""

import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent  # source/backend/ingestion → project root
ENV_FILE = SCRIPT_DIR / ".env_BEN0601"

EXPECTED_DIM = 768
_client = None  # lazy-initialised singleton


def _get_client():
    global _client
    if _client is None:
        load_dotenv(ENV_FILE)
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("[ERROR] GEMINI_API_KEY not set in .env_BEN0601")
            sys.exit(1)
        from google import genai
        _client = genai.Client(api_key=api_key)
    return _client


def _embed(text: str, task_type: str, model: str, retries: int = 3) -> list[float]:
    """Call the Gemini embedding API with exponential back-off on rate limit."""
    from google.genai import types

    client = _get_client()
    for attempt in range(retries):
        try:
            result = client.models.embed_content(
                model=model,
                contents=text,
                config=types.EmbedContentConfig(
                    task_type=task_type,
                    output_dimensionality=EXPECTED_DIM,
                ),
            )
            values = result.embeddings[0].values
            if len(values) != EXPECTED_DIM:
                raise ValueError(
                    f"Dimension mismatch: expected {EXPECTED_DIM}, got {len(values)}"
                )
            return list(values)
        except Exception as exc:
            is_rate_limit = "429" in str(exc) or "quota" in str(exc).lower()
            if is_rate_limit and attempt < retries - 1:
                wait = 2 ** (attempt + 1)
                print(f"\n  [RATE LIMIT] Retrying in {wait}s...")
                time.sleep(wait)
            else:
                raise


def embed_document(text: str, model: str = "gemini-embedding-2") -> list[float]:
    """Embed a document chunk for indexing (RETRIEVAL_DOCUMENT task type)."""
    return _embed(text, task_type="RETRIEVAL_DOCUMENT", model=model)


def embed_query(text: str, model: str = "gemini-embedding-2") -> list[float]:
    """Embed a user query for retrieval (RETRIEVAL_QUERY task type)."""
    return _embed(text, task_type="RETRIEVAL_QUERY", model=model)


if __name__ == "__main__":
    load_dotenv(ENV_FILE)
    test = "What is overfitting in machine learning?"
    print(f"[INFO] Smoke test — embedding: '{test}'")
    vec = embed_query(test)
    print(f"[OK]   Dimension : {len(vec)}")
    print(f"       First 5  : {[round(v, 6) for v in vec[:5]]}")

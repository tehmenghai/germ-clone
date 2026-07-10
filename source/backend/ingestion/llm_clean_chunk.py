"""
llm_clean_chunk.py

LLM-powered cleaning and concept-based chunking (LLM-semantic chunking pipeline).

Replaces the two-step basic approach (regex clean → fixed sliding-window chunk) with
Gemini calls that implement AGENT_SKILL.md:
  1. Removes noise: copyright text, page markers, OCR artifacts, isolated symbols
  2. Rewrites slide bullets into complete teaching notes (full sentences)
  3. Preserves and reconstructs formulas with Formula + Variables sections
  4. Structures as Module/Lesson/Topic hierarchy
  5. Creates semantic chunks per concept — never splits mid-idea
  6. Adds retrieval keywords and sample questions per chunk

Documents are processed in batches of PAGE_BATCH_SIZE pages so each API call
produces a small, predictable JSON response that stays well within output token limits.

Input:  data_01_raw/marker_output/**/*.md  (Marker-extracted Markdown)
Output: data_02_llm_chunks/chunks/chunks.jsonl

Usage:
    python source/backend/ingestion/llm_clean_chunk.py
"""

import json
import os
import re
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent  # ingestion → backend → source → root

ENV_FILE = PROJECT_ROOT / "source/backend/.env"

# Input: Marker output produced by the basic pipeline (already extracted)
MARKER_DIR = PROJECT_ROOT / "data_01_raw/marker_output"

# Output: LLM-semantic enhanced chunks
CHUNKS_DIR = PROJECT_ROOT / "data_02_llm_chunks/chunks"

# Agent skill prompt lives in Ben's sandbox docs
SKILL_FILE = PROJECT_ROOT / "sandbox/ben/docs_02_llm_chunks/AGENT_SKILL.md"

# Ordered list of Gemini models to try. The script rotates to the next model
# when a daily free-tier quota is fully exhausted (limit=0 or quotaValue in error).
# Run `python3 -c "..."` to check which models still have quota today.
MODELS = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
]
MODEL = MODELS[0]  # active model — updated by call_gemini on quota exhaustion

# Pages per API call. Keeps output tokens per call to ~2,000-4,000,
# well within the model's output limit regardless of corpus size.
PAGE_BATCH_SIZE = 10


# ---------------------------------------------------------------------------
# System prompt construction
# ---------------------------------------------------------------------------

def load_system_prompt() -> str:
    """
    Load AGENT_SKILL.md and append the array-output override.
    """
    base = SKILL_FILE.read_text(encoding="utf-8")

    array_override = """
---------------------------------------------------
IMPORTANT OVERRIDE – TASK 8 OUTPUT FORMAT
---------------------------------------------------

Return a JSON ARRAY where every element is one semantic concept chunk.
Use this exact structure:

[
  {
    "lesson_title": "3.3 Supervised Learning Algorithms",
    "page_number": 8,
    "topic": "One-Hot Encoding",
    "clean_markdown": "### One-Hot Encoding\\n\\nOne-Hot Encoding converts categorical values into a binary vector where only one element is 1 and all others are 0.\\n\\nIt is best used for nominal (non-ordinal) categorical features.\\n\\nThe main drawback is high dimensionality when the feature has many unique values.",
    "retrieval_keywords": ["one-hot encoding", "categorical encoding", "nominal variables", "binary vector"],
    "sample_questions": [
      "What is one-hot encoding?",
      "When should I use one-hot encoding vs label encoding?",
      "What is the downside of one-hot encoding?"
    ]
  }
]

Rules:
- Wrap the array in ```json ... ``` code fences.
- If a page is purely navigation, copyright, or a title slide with no educational content, skip it.
- Never merge unrelated concepts into one chunk.
- Every clean_markdown must be complete, readable teaching notes — not raw slide fragments.
- For formulas: include Formula and Variables sections as described in the CRITICAL section above.
- Use plain-text ASCII math in all JSON strings — NO LaTeX backslash commands (\\frac, \\sigma, etc.).
"""
    return base + array_override


# ---------------------------------------------------------------------------
# Page splitting
# ---------------------------------------------------------------------------

def split_into_page_batches(text: str, batch_size: int = PAGE_BATCH_SIZE) -> list[str]:
    """
    Split a Marker markdown file into batches of `batch_size` pages.
    Marker uses <!-- page N --> separators between pages.
    """
    # Split on page markers, keeping content between them
    pages = re.split(r'<!--\s*page\s*\d+\s*-->', text)
    pages = [p.strip() for p in pages if p.strip()]

    if not pages:
        return [text]  # no page markers — treat as one batch

    batches = []
    for i in range(0, len(pages), batch_size):
        batch = "\n\n".join(pages[i : i + batch_size])
        batches.append(batch)

    return batches


# ---------------------------------------------------------------------------
# Gemini generative call
# ---------------------------------------------------------------------------

def _repair_json_escapes(raw: str) -> str:
    r"""
    Fix invalid JSON escape sequences from LaTeX (e.g. \sigma, \partial).
    JSON only permits: \" \\ \/ \b \f \n \r \t \uXXXX after a backslash.

    Key: when we find a VALID escape pair (e.g. \n, \\) we must consume BOTH
    chars together and advance i by 2 — otherwise the second char gets processed
    again and valid \\ becomes broken \\\ .
    """
    valid_after_backslash = set('"\\/ bfnrtu')
    out: list[str] = []
    i = 0
    while i < len(raw):
        ch = raw[i]
        if ch == '\\' and i + 1 < len(raw):
            nxt = raw[i + 1]
            if nxt in valid_after_backslash:
                out.append(ch)       # keep backslash
                out.append(nxt)      # keep following char
                i += 2               # consume BOTH as one unit
            else:
                out.append('\\\\')   # double-escape the lone backslash
                i += 1               # only consume the backslash; next char processed separately
        else:
            out.append(ch)
            i += 1
    return ''.join(out)


def _extract_json(raw: str) -> str:
    """Strip code fences and return the bare JSON string."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]           # drop opening fence line
        raw = raw.rsplit("```", 1)[0].strip()  # drop closing fence
    return raw


def _parse_retry_delay(err: str) -> int:
    """Extract retryDelay seconds from a Gemini 429 error string, or return 0."""
    m = re.search(r"retryDelay.*?'(\d+)s'", err)
    return int(m.group(1)) if m else 0


def _is_quota_exhausted(err: str) -> bool:
    """True when the model's daily free-tier limit is fully used up."""
    return "quotaValue" in err and ("limit: 0" in err or "GenerateRequestsPerDay" in err)


def call_gemini(batch_text: str, system_prompt: str, retries: int = 5) -> list[dict]:
    """
    Send one page batch to Gemini; return parsed JSON array of chunks.
    Rotates through MODELS when a daily quota is exhausted.
    """
    global MODEL

    from google import genai
    from google.genai import types

    load_dotenv(ENV_FILE)
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[ERROR] GEMINI_API_KEY not set in .env")
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    for attempt in range(retries):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=batch_text,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.1,
                ),
            )
            if response.text is None:
                raise ValueError("Gemini returned empty response (None text)")

            raw = _extract_json(response.text)
            raw = _repair_json_escapes(raw)
            parsed = json.loads(raw)

            if isinstance(parsed, dict):
                parsed = [parsed]

            return parsed

        except Exception as exc:
            err = str(exc)
            is_rate = "429" in err or "quota" in err.lower()
            is_overload = "503" in err or "unavailable" in err.lower()

            if is_rate and _is_quota_exhausted(err):
                # Daily quota fully gone for this model — rotate to the next one
                cur_idx = MODELS.index(MODEL) if MODEL in MODELS else -1
                if cur_idx + 1 < len(MODELS):
                    MODEL = MODELS[cur_idx + 1]
                    print(f"\n    [ROTATE] Daily quota exhausted — switching to {MODEL}")
                    continue  # retry immediately with new model
                else:
                    print("\n    [ERROR] All models have exhausted their daily quota.")
                    print("            Quotas reset at midnight Pacific. Try again tomorrow.")
                    raise

            if attempt < retries - 1:
                if is_rate:
                    # Respect the retryDelay from the API response
                    suggested = _parse_retry_delay(err)
                    wait = suggested + 2 if suggested else 2 ** (attempt + 2)
                    label = "[RATE LIMIT]"
                elif is_overload:
                    wait = 15 * (attempt + 1)
                    label = "[OVERLOAD]"
                else:
                    wait = 5
                    label = "[WARN]"
                print(f"\n    {label} Attempt {attempt + 1} failed — retrying in {wait}s")
                time.sleep(wait)
            else:
                raise


# ---------------------------------------------------------------------------
# Chunk construction
# ---------------------------------------------------------------------------

def slugify(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9]+", "_", slug)
    return slug.strip("_")


def build_chunk_text(item: dict) -> str:
    """
    Combine clean_markdown + keywords + sample questions into a single embedding
    target. The added retrieval hints improve recall for diverse query phrasings.
    """
    parts = [item.get("clean_markdown", "").strip()]

    keywords = item.get("retrieval_keywords", [])
    if keywords:
        parts.append("Keywords: " + ", ".join(keywords))

    questions = item.get("sample_questions", [])
    if questions:
        q_text = "\n".join(f"- {q}" for q in questions)
        parts.append("Questions this chunk answers:\n" + q_text)

    return "\n\n".join(p for p in parts if p)


def process_document(md_path: Path, system_prompt: str) -> list[dict]:
    """Process one Marker markdown file in page batches → list of enhanced chunk dicts."""
    markdown_text = md_path.read_text(encoding="utf-8")
    slug_prefix = slugify(md_path.parent.name)
    batches = split_into_page_batches(markdown_text)

    print(f"[INFO]  {md_path.name}: {len(batches)} batch(es) of ≤{PAGE_BATCH_SIZE} pages")

    all_raw: list[dict] = []
    for i, batch in enumerate(batches, 1):
        print(f"[INFO]    Batch {i}/{len(batches)} ({len(batch):,} chars)...", end=" ", flush=True)
        raw_chunks = call_gemini(batch, system_prompt)
        print(f"{len(raw_chunks)} raw chunks")
        all_raw.extend(raw_chunks)
        if i < len(batches):
            time.sleep(2)  # brief pause between batches to stay under RPM limit

    enhanced: list[dict] = []
    for idx, item in enumerate(all_raw):
        clean_md = item.get("clean_markdown", "").strip()
        if len(clean_md) < 30:
            continue  # skip near-empty output (title/navigation slides)

        chunk_id = f"{slug_prefix}_BEN0602_{idx + 1:04d}"
        chunk_text = build_chunk_text(item)

        enhanced.append({
            "chunk_id": chunk_id,
            "source_file": md_path.parent.name + ".pdf",
            "source_type": "pdf",
            "lesson_title": item.get("lesson_title", ""),
            "topic": item.get("topic", ""),
            "page_number": item.get("page_number") or None,
            "chunk_text": chunk_text,
            "clean_markdown": clean_md,
            "retrieval_keywords": item.get("retrieval_keywords", []),
            "sample_questions": item.get("sample_questions", []),
            "token_estimate": max(1, len(chunk_text) // 4),
            "metadata": {
                "pipeline_owner": "Ben",
                "suffix": "_BEN0602",
                "extractor": "pymupdf",
                "chunking_method": "llm_semantic",
                "llm_model": MODEL,
            },
        })

    print(f"[OK]    {len(enhanced)} non-empty semantic chunks from {md_path.name}")
    return enhanced


# ---------------------------------------------------------------------------
# I/O helpers
# ---------------------------------------------------------------------------

def write_jsonl(path: Path, records: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")


# ---------------------------------------------------------------------------
# Existing-chunk loader
# ---------------------------------------------------------------------------

def load_existing_chunks(path: Path) -> tuple[dict[str, list[dict]], list[dict]]:
    """
    Read chunks.jsonl if it exists.

    Returns:
        by_source  — {source_file: [chunk, ...]} for fast skip-check
        all_chunks — flat list preserving original order (used as the base for merging)
    """
    by_source: dict[str, list[dict]] = {}
    all_chunks: list[dict] = []
    if not path.exists():
        return by_source, all_chunks

    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            chunk = json.loads(line)
            all_chunks.append(chunk)
            by_source.setdefault(chunk["source_file"], []).append(chunk)

    return by_source, all_chunks


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    if not SKILL_FILE.exists():
        print(f"[ERROR] AGENT_SKILL.md not found at {SKILL_FILE}")
        sys.exit(1)

    system_prompt = load_system_prompt()

    md_files = sorted(MARKER_DIR.rglob("*.md"))
    if not md_files:
        print(f"[ERROR] No .md files under {MARKER_DIR.relative_to(PROJECT_ROOT)}")
        print("        Run extract_with_marker.py first.")
        sys.exit(1)

    # Load existing chunks so we can skip already-processed source files.
    full_path = CHUNKS_DIR / "chunks.jsonl"
    existing_by_source, existing_chunks = load_existing_chunks(full_path)
    if existing_by_source:
        print(f"[INFO]  Existing chunks loaded: {len(existing_chunks)} chunks "
              f"across {len(existing_by_source)} source file(s) — these will be skipped")

    print(f"[INFO]  Found {len(md_files)} Marker-extracted file(s)")

    # Chunks from newly processed files only
    new_chunks: list[dict] = []
    skipped = 0

    for md_path in md_files:
        source_file = md_path.parent.name + ".pdf"
        if source_file in existing_by_source:
            print(f"[SKIP]  {md_path.name} — already chunked ({len(existing_by_source[source_file])} chunks), skipping")
            skipped += 1
            continue
        try:
            chunks = process_document(md_path, system_prompt)
            new_chunks.extend(chunks)
        except Exception as exc:
            print(f"[ERROR] Failed on {md_path.name}: {exc!r}")
            sys.exit(1)

    if not new_chunks and not existing_chunks:
        print("[ERROR] No chunks produced — check Gemini response and AGENT_SKILL.md")
        sys.exit(1)

    if not new_chunks:
        print(f"\n[INFO]  No new files to process — all {skipped} file(s) already chunked.")
        print("        To force reprocessing, delete the relevant rows from chunks.jsonl")
        print("        or remove the source file entry and re-run.")
        return

    # Merge: keep existing chunks for skipped files, append new chunks at the end
    # so chunk_ids for new files start fresh and don't collide.
    all_chunks = existing_chunks + new_chunks

    write_jsonl(full_path, all_chunks)
    print(f"\n[OK]    {full_path.relative_to(PROJECT_ROOT)}")
    print(f"        {len(existing_chunks)} kept (existing)  +  {len(new_chunks)} new  =  {len(all_chunks)} total")

    sample_path = CHUNKS_DIR / "sample_chunks.jsonl"
    write_jsonl(sample_path, all_chunks[:5])
    print(f"[OK]    {sample_path.relative_to(PROJECT_ROOT)}  (first 5 — inspect these)")

    print(f"\n[NEXT]  Run seed_from_llm_chunks.py to embed and load into Neon.")


if __name__ == "__main__":
    main()

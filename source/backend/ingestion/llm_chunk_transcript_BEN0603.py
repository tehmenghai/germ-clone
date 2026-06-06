"""
llm_chunk_transcript_BEN0603.py

LLM-powered semantic chunking for lecture transcripts (BEN0603 pipeline).

Reads:  data_BEN0603/parsed_vtt_{module}_BEN0603.jsonl  (from parse_vtt_BEN0603.py)
Reads:  slide markdown file(s) for topic alignment context
Reads:  module AGENT_SKILL markdown for LLM instructions

Writes: data_BEN0603/chunks_transcript_{module}_BEN0603.jsonl  (BEN0602-schema JSONL)

Differences from llm_clean_chunk_BEN0602.py:
  - Input is parsed VTT segments, not Marker Markdown
  - Batching by word count (~800 words), never splitting Q&A blocks
  - Slide markdown provided as topic-alignment context in each LLM call
  - Extra metadata: timestamp_start, timestamp_end, segment_type
  - source_type is always 'transcript'

Usage (from project root):
    python source/backend/ingestion/llm_chunk_transcript_BEN0603.py
    python source/backend/ingestion/llm_chunk_transcript_BEN0603.py --module 3.2a
    python source/backend/ingestion/llm_chunk_transcript_BEN0603.py --module 3.2a --sample

Module configs: sandbox/ben/docs_BEN0603/configs/{module}.json
"""

import json
import os
import re
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent

ENV_FILE = PROJECT_ROOT / "source/backend/ingestion/.env_BEN0601"

# These are set by load_module_config() at runtime
SOURCE_FILE = "3.1 - Probability and Statistics_Recording.transcript.vtt"
LESSON_TITLE = "Probability and Statistics for Machine Learning"

MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
]
MODEL = MODELS[0]

WORD_BATCH_SIZE = 800   # max words per LLM call
MIN_WORDS_KEEP = 15     # drop LLM output chunks shorter than this


# ---------------------------------------------------------------------------
# Helpers reused from BEN0602
# ---------------------------------------------------------------------------

def _repair_json_escapes(raw: str) -> str:
    valid_after_backslash = set('"\\/ bfnrtu')
    out: list[str] = []
    i = 0
    while i < len(raw):
        ch = raw[i]
        if ch == '\\' and i + 1 < len(raw):
            nxt = raw[i + 1]
            if nxt in valid_after_backslash:
                out.append(ch)
                out.append(nxt)
                i += 2
            else:
                out.append('\\\\')
                i += 1
        else:
            out.append(ch)
            i += 1
    return ''.join(out)


def _extract_json(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
        raw = raw.rsplit("```", 1)[0].strip()
    return raw


def _parse_retry_delay(err: str) -> int:
    m = re.search(r"retryDelay.*?'(\d+)s'", err)
    return int(m.group(1)) if m else 0


def _is_quota_exhausted(err: str) -> bool:
    return "quotaValue" in err and ("limit: 0" in err or "GenerateRequestsPerDay" in err)


def slugify(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9]+", "_", slug)
    return slug.strip("_")


def build_chunk_text(item: dict) -> str:
    parts = [item.get("clean_markdown", "").strip()]
    keywords = item.get("retrieval_keywords", [])
    if keywords:
        parts.append("Keywords: " + ", ".join(keywords))
    questions = item.get("sample_questions", [])
    if questions:
        parts.append("Questions this chunk answers:\n" + "\n".join(f"- {q}" for q in questions))
    return "\n\n".join(p for p in parts if p)


# ---------------------------------------------------------------------------
# Gemini call (same pattern as BEN0602)
# ---------------------------------------------------------------------------

def call_gemini(user_message: str, system_prompt: str, retries: int = 5) -> list[dict]:
    global MODEL

    from google import genai
    from google.genai import types

    load_dotenv(ENV_FILE)
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[ERROR] GEMINI_API_KEY not set in .env_BEN0601")
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    for attempt in range(retries):
        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=user_message,
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
                cur_idx = MODELS.index(MODEL) if MODEL in MODELS else -1
                if cur_idx + 1 < len(MODELS):
                    MODEL = MODELS[cur_idx + 1]
                    print(f"\n    [ROTATE] Daily quota exhausted — switching to {MODEL}")
                    continue
                else:
                    print("\n    [ERROR] All models exhausted their daily quota. Try tomorrow.")
                    raise

            if attempt < retries - 1:
                if is_rate:
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
# Batching — by word count, never split Q&A
# ---------------------------------------------------------------------------

def batch_segments(segments: list[dict], max_words: int = WORD_BATCH_SIZE) -> list[list[dict]]:
    """
    Group segments into batches of ≤ max_words total.
    Q&A segments are never split across batches.
    """
    batches: list[list[dict]] = []
    current: list[dict] = []
    current_words = 0

    for seg in segments:
        w = seg["word_count"]
        # If adding this segment would overflow AND we already have content, start a new batch.
        if current and current_words + w > max_words:
            batches.append(current)
            current = []
            current_words = 0
        current.append(seg)
        current_words += w

    if current:
        batches.append(current)

    return batches


# ---------------------------------------------------------------------------
# Module config loader
# ---------------------------------------------------------------------------

def load_module_config(module: str) -> dict:
    config_file = PROJECT_ROOT / "sandbox/ben/docs_BEN0603/configs" / f"{module}.json"
    if not config_file.exists():
        print(f"[ERROR] Module config not found: {config_file}")
        sys.exit(1)
    return json.loads(config_file.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# Slide context loader
# ---------------------------------------------------------------------------

def load_slide_context(slide_mds: list[Path]) -> str:
    """Load and concatenate slide markdown files for topic-alignment context."""
    parts = []
    for slide_md in slide_mds:
        if slide_md.exists():
            parts.append(slide_md.read_text(encoding="utf-8"))
    return "\n\n---\n\n".join(parts)


# ---------------------------------------------------------------------------
# User message builder
# ---------------------------------------------------------------------------

def build_user_message(batch: list[dict], slide_context: str) -> str:
    """
    Build the LLM user message for one batch.
    Includes slide context for topic alignment and the merged transcript text.
    """
    # Build transcript text block
    transcript_parts = []
    for seg in batch:
        ts = f"[{seg['ts_start']} → {seg['ts_end']}] [{seg['segment_type'].upper()}]"
        transcript_parts.append(f"{ts}\n{seg['merged_text']}")

    transcript_block = "\n\n---\n\n".join(transcript_parts)

    # Timestamps for this batch
    batch_start = batch[0]["ts_start"]
    batch_end = batch[-1]["ts_end"]

    return f"""SLIDE CONTEXT (use for topic alignment only — do not quote directly):
{slide_context}

---

TRANSCRIPT SEGMENT TO CHUNK:
Time range: {batch_start} → {batch_end}
Total segments in batch: {len(batch)}

{transcript_block}

---

Apply the system prompt instructions to the transcript above.
Return a JSON array of semantic chunks. If this batch contains no educational content, return [].
"""


# ---------------------------------------------------------------------------
# Chunk construction
# ---------------------------------------------------------------------------

def build_output_record(
    item: dict,
    batch: list[dict],
    seq: int,
    source_slug: str,
) -> dict:
    """Map one LLM-returned chunk dict to the full BEN0602-schema output record."""
    chunk_text = build_chunk_text(item)
    token_estimate = len(chunk_text.split())

    # Use timestamps from the LLM output if present; fall back to batch boundaries
    ts_start = item.get("timestamp_start") or batch[0]["ts_start"]
    ts_end = item.get("timestamp_end") or batch[-1]["ts_end"]
    seg_type = item.get("segment_type", batch[0].get("segment_type", "lecture"))

    return {
        "chunk_id": f"{source_slug}_BEN0603_{seq:04d}",
        "source_file": SOURCE_FILE,
        "source_type": "transcript",
        "lesson_title": item.get("lesson_title") or LESSON_TITLE,
        "topic": item.get("topic", ""),
        "page_number": None,          # transcripts have no page number
        "chunk_text": chunk_text,     # combined field for embedding
        "clean_markdown": item.get("clean_markdown", ""),
        "retrieval_keywords": item.get("retrieval_keywords", []),
        "sample_questions": item.get("sample_questions", []),
        "token_estimate": token_estimate,
        "metadata": {
            "timestamp_start": ts_start,
            "timestamp_end": ts_end,
            "speakers": ["germayne"],
            "segment_type": seg_type,
        },
        "embedding": None,            # populated by seeder
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    global SOURCE_FILE, LESSON_TITLE

    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--module", default="3.1", help="Module identifier (e.g. '3.1', '3.2a')")
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Process only the first 3 batches (quick quality check)",
    )
    args = parser.parse_args()

    cfg = load_module_config(args.module)
    SOURCE_FILE = cfg["source_file"]
    LESSON_TITLE = cfg["lesson_title"]

    parsed_vtt = PROJECT_ROOT / cfg["parsed_output_relative"]
    skill_file = PROJECT_ROOT / cfg["agent_skill_relative"]
    output_file = PROJECT_ROOT / cfg["chunks_output_relative"]
    sample_file = PROJECT_ROOT / cfg["sample_output_relative"]
    output_dir = output_file.parent
    slide_mds = [PROJECT_ROOT / p for p in cfg["slide_md_relatives"]]

    # Validate inputs
    for path, label in [(parsed_vtt, "parsed VTT"), (skill_file, "AGENT_SKILL"), (ENV_FILE, ".env_BEN0601")]:
        if not path.exists():
            print(f"[ERROR] {label} not found: {path}")
            sys.exit(1)

    load_dotenv(ENV_FILE)
    if not os.getenv("GEMINI_API_KEY"):
        print("[ERROR] GEMINI_API_KEY not set in .env_BEN0601")
        sys.exit(1)

    # Load inputs
    system_prompt = skill_file.read_text(encoding="utf-8")
    slide_context = load_slide_context(slide_mds)
    segments = [
        json.loads(line)
        for line in parsed_vtt.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]

    slide_names = ", ".join(p.name for p in slide_mds if p.exists())
    print(f"[INFO]  Module          : {args.module}")
    print(f"[INFO]  Segments loaded  : {len(segments)}")
    print(f"[INFO]  Slide context    : {len(slide_context):,} chars  ({slide_names})")
    print(f"[INFO]  Batch size       : ≤{WORD_BATCH_SIZE} words")
    print(f"[INFO]  LLM model        : {MODEL}")

    batches = batch_segments(segments)
    print(f"[INFO]  Batches          : {len(batches)}")

    if args.sample:
        batches = batches[:3]
        print(f"[INFO]  --sample mode: processing first {len(batches)} batches only")

    output_dir.mkdir(parents=True, exist_ok=True)
    source_slug = slugify(cfg["source_file"].replace(".vtt", "").replace(" ", "_"))

    all_chunks: list[dict] = []
    seq = 1

    for i, batch in enumerate(batches, 1):
        batch_words = sum(s["word_count"] for s in batch)
        batch_ts = f"{batch[0]['ts_start']} → {batch[-1]['ts_end']}"
        print(f"\n[BATCH {i}/{len(batches)}]  {batch_ts}  ({batch_words} words, {len(batch)} segments)")

        user_message = build_user_message(batch, slide_context)

        try:
            raw_chunks = call_gemini(user_message, system_prompt)
        except Exception as exc:
            print(f"  [ERROR] Batch {i} failed after retries: {exc}")
            continue

        # Filter and build output records
        batch_chunks = []
        for item in raw_chunks:
            clean = item.get("clean_markdown", "").strip()
            if len(clean.split()) < MIN_WORDS_KEEP:
                continue   # skip trivially short chunks (LLM returned empty/noise)
            rec = build_output_record(item, batch, seq, source_slug)
            batch_chunks.append(rec)
            seq += 1

        print(f"  → {len(raw_chunks)} raw  |  {len(batch_chunks)} kept (≥{MIN_WORDS_KEEP} words)")
        all_chunks.extend(batch_chunks)

        if i < len(batches):
            time.sleep(2)

    # Write output
    if all_chunks:
        with output_file.open("w", encoding="utf-8") as f:
            for chunk in all_chunks:
                f.write(json.dumps(chunk, ensure_ascii=False) + "\n")

        with sample_file.open("w", encoding="utf-8") as f:
            for chunk in all_chunks[:5]:
                f.write(json.dumps(chunk, ensure_ascii=False) + "\n")

        print(f"\n[OK]    Chunks written  : {len(all_chunks)}")
        print(f"[OK]    Output          : {output_file.relative_to(PROJECT_ROOT)}")
        print(f"[OK]    Sample (first 5): {sample_file.relative_to(PROJECT_ROOT)}")
        print(f"\n[NEXT]  Inspect {sample_file.name}")
        print("        Then run: python source/backend/ingestion/seed_from_chunks_BEN0602.py \\")
        print(f"            {output_file.relative_to(PROJECT_ROOT)}")
    else:
        print("\n[WARN]  No chunks produced — check AGENT_SKILL and Gemini responses.")


if __name__ == "__main__":
    main()

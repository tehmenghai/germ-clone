"""
parse_vtt.py

Parses a WebVTT lecture transcript and produces cleaned, merged segments
ready for LLM chunking by llm_chunk_transcript.py.

Processing steps:
  1. Parse VTT cue blocks → {cue_id, ts_start, ts_end, ts_start_sec, speaker, raw_text}
  2. Pre-lecture filter — drop everything before teaching starts (configurable cutoff)
  3. Speaker filter — keep teaching speakers; pair student questions
     with the following instructor response as Q&A blocks
  4. Notebook segment filter — drop code-narration periods (no standalone educational value)
  5. Cue merger — group consecutive same-speaker cues (gap ≤ GAP_THRESHOLD seconds)
     into paragraph blocks; drop blocks < MIN_WORDS words
  6. Q&A labelling — mark paired student+instructor blocks as segment_type='qa'
  7. Write output JSONL to data_03_transcripts/

Usage (from project root):
    python source/backend/ingestion/parse_vtt.py
    python source/backend/ingestion/parse_vtt.py --module 3.2a
    python source/backend/ingestion/parse_vtt.py --vtt "path/to/file.vtt"
    python source/backend/ingestion/parse_vtt.py --dry-run   # prints stats only

Module configs: sandbox/ben/docs_03_transcripts/configs/{module}.json
"""

import argparse
import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent

# ── Defaults (3.1 values — overridden by --module config) ────────────────────

LECTURE_START_SEC: float = 35 * 60 + 46  # 2146 s
TEACHING_SPEAKERS: set[str] = {"germayne", "Shumin Lai | NTU"}

NOTEBOOK_PERIODS: list[tuple[float, float]] = [
    (1 * 3600 + 5 * 60, 1 * 3600 + 45 * 60),
    (2 * 3600 + 13 * 60, 2 * 3600 + 39 * 60),
    (3 * 3600 + 15 * 60, 3 * 3600 + 40 * 60),
]

# ── Fixed constants (same for all modules) ────────────────────────────────────

QA_WINDOW_SEC: float = 30.0
MIN_QUESTION_WORDS: int = 6
GAP_THRESHOLD_SEC: float = 30.0
MIN_WORDS: int = 10

NOTEBOOK_ENTRY_PATTERNS: list[str] = [
    r"let me go.{0,15}notebook",
    r"go.{0,10}notebook",
    r"open.{0,10}notebook",
    r"run.{0,10}cell",
    r"let.{0,10}do.{0,10}exercise",
    r"jupyter",
    r"go.{0,10}code.{0,10}component",
    r"go into the code",
]

NOTEBOOK_EXIT_PATTERNS: list[str] = [
    r"go back.{0,15}slide",
    r"back.{0,10}deck",
    r"back.{0,10}presentation",
    r"so we saw from the notebook",
    r"from the exercise",
]


# ── Module config loader ──────────────────────────────────────────────────────

def load_module_config(module: str) -> dict:
    config_file = PROJECT_ROOT / "sandbox/ben/docs_03_transcripts/configs" / f"{module}.json"
    if not config_file.exists():
        print(f"[ERROR] Module config not found: {config_file}")
        sys.exit(1)
    return json.loads(config_file.read_text(encoding="utf-8"))


def apply_module_config(cfg: dict) -> tuple[Path, Path]:
    """Apply config to module-level globals. Returns (vtt_path, output_file)."""
    global LECTURE_START_SEC, TEACHING_SPEAKERS, NOTEBOOK_PERIODS
    LECTURE_START_SEC = float(cfg["lecture_start_sec"])
    TEACHING_SPEAKERS = set(cfg["teaching_speakers"])
    NOTEBOOK_PERIODS = [tuple(p) for p in cfg.get("notebook_periods", [])]
    vtt_path = PROJECT_ROOT / cfg["vtt_relative"]
    output_file = PROJECT_ROOT / cfg["parsed_output_relative"]
    return vtt_path, output_file

# ── Helpers ───────────────────────────────────────────────────────────────────

def ts_to_sec(ts: str) -> float:
    """Convert HH:MM:SS.mmm or MM:SS.mmm to seconds."""
    parts = ts.replace(",", ".").split(":")
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    if len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    return float(parts[0])


def sec_to_hms(sec: float) -> str:
    """Convert seconds to HH:MM:SS string."""
    sec = int(sec)
    h = sec // 3600
    m = (sec % 3600) // 60
    s = sec % 60
    return f"{h:02d}:{m:02d}:{s:02d}"


def in_notebook_period(sec: float) -> bool:
    return any(start <= sec <= end for start, end in NOTEBOOK_PERIODS)


def matches_any(text: str, patterns: list[str]) -> bool:
    text_lower = text.lower()
    return any(re.search(p, text_lower) for p in patterns)


# ── Step 1: Parse VTT ────────────────────────────────────────────────────────

def parse_vtt(path: Path) -> list[dict]:
    """Parse VTT into list of cue dicts."""
    text = path.read_text(encoding="utf-8")
    # Split on double newline — each cue block is separated this way
    blocks = re.split(r"\n\n+", text.strip())

    cues = []
    for block in blocks:
        lines = block.strip().splitlines()
        if not lines:
            continue

        # Find the timestamp line (contains -->)
        ts_line_idx = next(
            (i for i, line in enumerate(lines) if "-->" in line), None
        )
        if ts_line_idx is None:
            continue

        ts_line = lines[ts_line_idx]
        ts_parts = ts_line.split("-->")
        if len(ts_parts) != 2:
            continue

        ts_start_raw = ts_parts[0].strip()
        ts_end_raw = ts_parts[1].strip().split()[0]  # strip any position tags

        # Text is everything after the timestamp line
        content_lines = lines[ts_line_idx + 1 :]
        if not content_lines:
            continue

        raw = " ".join(content_lines).strip()
        if not raw:
            continue

        # Extract speaker — format is "Speaker Name: text"
        speaker_match = re.match(r"^([^:]+):\s*(.*)", raw)
        if speaker_match:
            speaker = speaker_match.group(1).strip()
            utterance = speaker_match.group(2).strip()
        else:
            speaker = "unknown"
            utterance = raw

        cue_id_raw = lines[0] if ts_line_idx > 0 else ""

        cues.append(
            {
                "cue_id": cue_id_raw,
                "ts_start": ts_start_raw,
                "ts_end": ts_end_raw,
                "ts_start_sec": ts_to_sec(ts_start_raw),
                "ts_end_sec": ts_to_sec(ts_end_raw),
                "speaker": speaker,
                "raw_text": utterance,
            }
        )

    return cues


# ── Step 2: Pre-lecture filter ────────────────────────────────────────────────

def filter_pre_lecture(cues: list[dict]) -> list[dict]:
    return [c for c in cues if c["ts_start_sec"] >= LECTURE_START_SEC]


# ── Step 3 & 6: Speaker filter + Q&A pairing ─────────────────────────────────

def filter_speakers(cues: list[dict]) -> list[dict]:
    """
    Keep teaching speaker cues.
    Keep student cues only when immediately followed by a teaching speaker
    within QA_WINDOW_SEC — mark those pairs as Q&A.
    """
    result = []
    i = 0
    while i < len(cues):
        cue = cues[i]
        if cue["speaker"] in TEACHING_SPEAKERS:
            cue = dict(cue, segment_type="lecture")
            result.append(cue)
            i += 1
        else:
            # Student cue — only pair if question is substantive (enough words)
            question_words = len(cue["raw_text"].split())
            if question_words >= MIN_QUESTION_WORDS and i + 1 < len(cues):
                next_cue = cues[i + 1]
                gap = next_cue["ts_start_sec"] - cue["ts_end_sec"]
                if next_cue["speaker"] in TEACHING_SPEAKERS and gap <= QA_WINDOW_SEC:
                    # Pair: student question + teaching response → Q&A block
                    student_cue = dict(cue, segment_type="qa_question")
                    result.append(student_cue)
                    teacher_cue = dict(next_cue, segment_type="qa_answer")
                    result.append(teacher_cue)
                    i += 2
                    continue
            # Short backchannel or non-paired student cue — drop
            i += 1

    return result


# ── Step 4: Notebook segment filter ──────────────────────────────────────────

def filter_notebook_segments(cues: list[dict]) -> list[dict]:
    """
    Drop cues that fall within notebook exercise periods.
    Uses both time-range fallback and phrase detection for entry/exit.
    """
    result = []
    in_notebook = False

    for cue in cues:
        sec = cue["ts_start_sec"]
        text = cue["raw_text"]

        # Phrase-based entry detection
        if not in_notebook and matches_any(text, NOTEBOOK_ENTRY_PATTERNS):
            in_notebook = True

        # Time-range fallback
        if not in_notebook and in_notebook_period(sec):
            in_notebook = True

        if in_notebook:
            # Phrase-based exit detection
            if matches_any(text, NOTEBOOK_EXIT_PATTERNS):
                in_notebook = False
                # Check if we've left the time range too
                if not in_notebook_period(sec):
                    result.append(cue)
            # Time-range exit fallback
            elif not in_notebook_period(sec):
                in_notebook = False
                result.append(cue)
            # Still in notebook — drop
        else:
            result.append(cue)

    return result


# ── Step 5: Cue merger ────────────────────────────────────────────────────────

def merge_cues(cues: list[dict]) -> list[dict]:
    """
    Merge consecutive same-speaker / same-segment-type cues into paragraph blocks.
    Drop blocks shorter than MIN_WORDS.
    Q&A question+answer pairs are merged into a single qa block.
    """
    if not cues:
        return []

    segments = []
    current = dict(cues[0])

    for cue in cues[1:]:
        same_speaker = cue["speaker"] == current["speaker"]
        same_type = cue.get("segment_type") == current.get("segment_type")
        gap = cue["ts_start_sec"] - current["ts_end_sec"]

        # Merge only if same speaker, same segment type, and within gap threshold.
        # Never merge across lecture/qa boundaries — keeps Q&A blocks isolated.
        if same_speaker and same_type and gap <= GAP_THRESHOLD_SEC:
            current["raw_text"] += " " + cue["raw_text"]
            current["ts_end"] = cue["ts_end"]
            current["ts_end_sec"] = cue["ts_end_sec"]
        else:
            segments.append(current)
            current = dict(cue)

    segments.append(current)

    # Now handle Q&A pairing: merge consecutive qa_question + qa_answer into one block
    merged = []
    i = 0
    while i < len(segments):
        seg = segments[i]
        if seg.get("segment_type") == "qa_question" and i + 1 < len(segments):
            answer = segments[i + 1]
            if answer.get("segment_type") == "qa_answer":
                qa_block = {
                    "ts_start": seg["ts_start"],
                    "ts_end": answer["ts_end"],
                    "ts_start_sec": seg["ts_start_sec"],
                    "ts_end_sec": answer["ts_end_sec"],
                    "speaker": answer["speaker"],
                    "raw_text": f"[Q] {seg['raw_text']} [A] {answer['raw_text']}",
                    "segment_type": "qa",
                }
                merged.append(qa_block)
                i += 2
                continue
        merged.append(seg)
        i += 1

    # Drop blocks shorter than MIN_WORDS
    merged = [
        s for s in merged
        if len(s["raw_text"].split()) >= MIN_WORDS
    ]

    return merged


# ── Step 7: Format output ─────────────────────────────────────────────────────

def to_output_record(seg: dict) -> dict:
    return {
        "topic_hint": "",           # filled by LLM in B.3
        "ts_start": sec_to_hms(seg["ts_start_sec"]),
        "ts_end": sec_to_hms(seg["ts_end_sec"]),
        "ts_start_sec": seg["ts_start_sec"],
        "ts_end_sec": seg["ts_end_sec"],
        "merged_text": seg["raw_text"],
        "segment_type": seg.get("segment_type", "lecture"),
        "word_count": len(seg["raw_text"].split()),
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Parse VTT transcript")
    parser.add_argument("--module", default="3.1", help="Module identifier (e.g. '3.1', '3.2a')")
    parser.add_argument("--vtt", default=None, help="Override VTT path from config")
    parser.add_argument(
        "--dry-run", action="store_true", help="Print stats only, do not write output"
    )
    args = parser.parse_args()

    cfg = load_module_config(args.module)
    default_vtt, output_file = apply_module_config(cfg)

    vtt_path = Path(args.vtt) if args.vtt else default_vtt
    if not vtt_path.exists():
        print(f"[ERROR] VTT file not found: {vtt_path}")
        sys.exit(1)

    print(f"[INFO] Module  : {args.module}")
    print(f"[INFO] Parsing: {vtt_path.name}")

    # Pipeline
    cues = parse_vtt(vtt_path)
    print(f"[INFO] Raw cues         : {len(cues)}")

    cues = filter_pre_lecture(cues)
    print(f"[INFO] After pre-lecture filter  : {len(cues)}")

    cues = filter_speakers(cues)
    print(f"[INFO] After speaker filter      : {len(cues)}")

    cues = filter_notebook_segments(cues)
    print(f"[INFO] After notebook filter     : {len(cues)}")

    segments = merge_cues(cues)
    print(f"[INFO] After merge + min-words   : {len(segments)}")

    # Stats
    lecture_count = sum(1 for s in segments if s.get("segment_type") == "lecture")
    qa_count = sum(1 for s in segments if s.get("segment_type") == "qa")
    total_words = sum(len(s["raw_text"].split()) for s in segments)
    print(f"\n[INFO] Segments  : {len(segments)}  ({lecture_count} lecture, {qa_count} Q&A)")
    print(f"[INFO] Total words retained : {total_words:,}")

    if args.dry_run:
        print("\n[DRY RUN] Sample segments:")
        for s in segments[:3]:
            preview = s["raw_text"][:150].replace("\n", " ")
            print(f"\n  [{s.get('segment_type','?')}] {s['ts_start']} → {s['ts_end']}  ({len(s['raw_text'].split())} words)")
            print(f"  {preview}...")
        print("\n[DRY RUN] No output written.")
        return

    # Write output
    output_file.parent.mkdir(parents=True, exist_ok=True)
    records = [to_output_record(s) for s in segments]
    with output_file.open("w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"\n[OK] Written: {output_file.relative_to(PROJECT_ROOT)}")
    print("[NEXT] Inspect the output, then run:")
    print(f"       python source/backend/ingestion/llm_chunk_transcript.py --module {args.module}")


if __name__ == "__main__":
    main()

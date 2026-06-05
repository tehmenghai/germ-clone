# GRAND_PLAN_BEN0603 — Schema Migration + Transcript Ingestion

## Purpose

BEN0603 has two tracks that must run in sequence.

**Track A — Schema migration and contract update** (Ben + Meng Hai coordination)
Migrate the canonical production schema to hold BEN0602's enriched chunk fields, fix the
retrieval SQL, standardise on Gemini embeddings, and unblock Meng Hai's Phase 2 wiring.

**Track B — Transcript ingestion pipeline**
Build the parser, LLM chunker, and agent skill for VTT lecture transcripts, starting with
the 3.1 Probability and Statistics recording.

---

## Naming Convention

Every new file and folder created in this session must use the suffix `_BEN0603`.

Examples:
```
parse_vtt_BEN0603.py
llm_chunk_transcript_BEN0603.py
chunks_transcript_BEN0603.jsonl
AGENT_SKILL_TRANSCRIPT_BEN0603.md
docs_BEN0603/
data_BEN0603/
```

---

## Sequence

```
A.1  → A.2.1 → A.2.2 → A.2.3 → A.2.4 → A.2.5 → A.2.6 → A.3
                                                              ↓
                                                    (wait for Meng Hai Step 3 signal)
                                                              ↓
                          B.1 → B.2 (test parse) → B.3 → run pipeline on 3.1 transcript
```

Track B (B.1, B.2, B.3) can be built while waiting for Meng Hai's signal.
The final transcript ingest into canonical tables is gated on that signal.

---

## Standing Constraints

| Constraint | Rule |
|---|---|
| Embedding model | `gemini-embedding-2` (768-dim) is the production standard. All vectors in the canonical tables must use this model. Never mix with `nomic-embed-text` in the same table. |
| Credential | `GEMINI_API_KEY` in `source/backend/ingestion/.env_BEN0601` |
| Ownership | Ben owns `ingestion/`, `repository/`, `alembic/`. Do not touch `rag/`, `llm/`, `streaming/`, `app/`, `source/frontend/`. |
| Sacred files | `schemas/retrieval.py` (Ben → Meng Hai). Any change requires Meng Hai heads-up. A.3 fulfils this for the changes made in A.1 and A.2.3. |
| Field naming | Use `source_type` in all new code. The old planning docs used `document_type` — that name is incorrect and must not appear in any new file. |

---

## Track A — Schema Migration and Contract Update

### A.1 — Add `source_type` to RetrievalResult

**File:** `source/backend/schemas/retrieval.py`

Add one field to the `RetrievalResult` Pydantic model:

```python
source_type: Optional[str] = None   # 'pdf' | 'transcript' | 'textbook'
```

Must be `Optional` at this point — `queries.py` does not yet SELECT it.
It becomes non-optional after A.2.3 is complete.

**Done when:** `retrieval.py` has the `source_type` field. `ruff check source/backend/` passes.

---

### A.2.1 — Write Alembic migration 002

**File to create:** `source/backend/alembic/versions/002_enrich_chunks_for_rag.py`

Adds seven columns to the `chunks` table:

| Column | DDL |
|---|---|
| `source_type` | `TEXT NOT NULL DEFAULT 'pdf'` |
| `lesson_title` | `TEXT` |
| `topic` | `TEXT` |
| `clean_markdown` | `TEXT` |
| `retrieval_keywords` | `TEXT[]` |
| `sample_questions` | `TEXT[]` |
| `metadata` | `JSONB` |

Migration must include both `upgrade()` and `downgrade()` functions.
Set `revision = "002"` and `down_revision = "001"`.

**Key design note:**
`chunks.text` holds the combined embedding string (clean_markdown + keywords + questions joined).
`clean_markdown` is the display-only field — the UI shows this, not the combined text.
This split is intentional: the embedding captures full retrieval signal; the display field stays clean.

**Done when:** `alembic upgrade head` runs without error against the Neon branch.

---

### A.2.2 — Update `models.py`

**File:** `source/backend/repository/models.py`

Add the seven new columns to the `Chunk` SQLAlchemy class.
All are nullable except `source_type`.

Add `ARRAY` to the existing dialect import if not already present:
```python
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
```

**Done when:** `ruff check source/backend/` passes with zero findings.

---

### A.2.3 — Update `queries.py`

**File:** `source/backend/repository/queries.py`

Three changes to `_RETRIEVAL_SQL`:

1. Add to SELECT:
   ```sql
   c.source_type AS source_type
   ```

2. Replace the hardcoded null:
   ```sql
   -- before
   NULL::text AS ts
   -- after
   COALESCE(c.metadata->>'timestamp_start', NULL) AS ts
   ```
   This gives transcript chunks their timestamp and slide chunks NULL — no branching logic needed.

3. Add to the `RetrievalResult(...)` constructor at the bottom of `retrieve()`:
   ```python
   source_type=row.source_type,
   ```

After this change, update `retrieval.py` to make `source_type` non-optional:
```python
source_type: str = 'pdf'
```

**Done when:** `retrieve()` returns `RetrievalResult` objects with `source_type` populated.
`ruff check source/backend/` passes.

---

### A.2.4 — Write `seed_from_chunks_BEN0602.py`

**File to create:** `source/backend/ingestion/seed_from_chunks_BEN0602.py`

This is the canonical seeder that replaces `seed_from_chunks_BEN0601.py`.
It populates the production `documents`, `chunks`, and `embeddings` tables from the
BEN0602 JSONL using Gemini embeddings.

**Input:** `data_BEN0602/chunks_BEN0602/chunks_BEN0602.jsonl`

**Field mapping (JSONL → canonical tables):**

| JSONL field | Target table.column | Notes |
|---|---|---|
| `source_file` | `documents.filename` | One `documents` row per unique source_file |
| prefix of `lesson_title` (e.g. "3.3") | `documents.mod` | Parse the module number from lesson_title |
| `chunk_text` | `chunks.text` | Combined field — this is what gets embedded |
| `clean_markdown` | `chunks.clean_markdown` | Display-only |
| `source_type` | `chunks.source_type` | 'pdf' for BEN0602 slides |
| `lesson_title` | `chunks.lesson_title` | |
| `topic` | `chunks.topic` | |
| `retrieval_keywords` | `chunks.retrieval_keywords` | |
| `sample_questions` | `chunks.sample_questions` | |
| `metadata` | `chunks.metadata` | |
| sequential index per source_file | `chunks.chunk_index` | |

**Embedding:**
```python
from embed_google_BEN0601 import embed_document
vec = embed_document(chunk["chunk_text"], model="gemini-embedding-2")
```
Embed `chunks.text` (the combined field) — not `clean_markdown`.

**Upsert strategy:** ON CONFLICT on `chunks.id` — safe to re-run.

**Credential:** `GEMINI_API_KEY` and `DATABASE_URL` from `.env_BEN0601`.

**Done when:** Script runs to completion.
`SELECT COUNT(*) FROM embeddings;` matches the chunk count in `chunks_BEN0602.jsonl`.

---

### A.2.5 — Clear and re-seed Neon

Run these steps in order — do not skip the truncation:

**Step 1 — Apply migration:**
```bash
cd source/backend
alembic upgrade head
```

**Step 2 — Clear incompatible nomic embeddings:**

Existing rows were embedded by `nomic-embed-text`. They cannot coexist with Gemini query
vectors — cosine similarity between different model spaces is meaningless.

Run in the Neon SQL editor or via psql on Ben's branch:
```sql
TRUNCATE embeddings, chunks, documents CASCADE;
```

**Step 3 — Re-seed with Gemini embeddings:**
```bash
python source/backend/ingestion/seed_from_chunks_BEN0602.py
```

**Done when:**
```sql
SELECT COUNT(*) FROM embeddings;
```
Returns the expected row count (matching total chunks in `chunks_BEN0602.jsonl`).

---

### A.2.6 — Verify canonical retrieval

Update `dev_retrieve_BEN0601.py` to add a `--canonical` flag.
When passed, it queries `embeddings → chunks → documents` (the production path) instead
of `rag_chunks_BEN0601`.

For each result, display: `id`, `mod`, `source_type`, `lesson_title`, `topic`, `ts`, `score`, `snip`.

Run these three queries and save the full output — this becomes the monitoring evidence for A.3:

```bash
python source/backend/ingestion/dev_retrieve_BEN0601.py --canonical search "What is the law of large numbers?"
python source/backend/ingestion/dev_retrieve_BEN0601.py --canonical search "What are probability distributions?"
python source/backend/ingestion/dev_retrieve_BEN0601.py --canonical search "What is overfitting?"
```

**What good results look like:**
- `source_type: pdf` for all results (transcripts not yet ingested)
- `ts: None` for slide chunks (expected — transcripts not yet ingested)
- Cosine similarity scores > 0.5 for relevant results
- Results are topically coherent, not random

**Done when:** Three queries return coherent, topically relevant results with `source_type`
populated and scores that look sensible.

---

### A.3 — Message Meng Hai

Send the following (paste the A.2.6 output into the monitoring section):

> Steps A.1 and A.2 are done.
>
> **Changes made:**
> - `schemas/retrieval.py` — added `source_type: str = 'pdf'` to `RetrievalResult`
> - `repository/queries.py` — SELECT now includes `source_type` and derives `ts` from
>   `metadata->>'timestamp_start'` (NULL for slides, timestamp string for transcripts)
> - Alembic migration 002 applied to Neon — `chunks` table now has: `source_type`,
>   `lesson_title`, `topic`, `clean_markdown`, `retrieval_keywords`, `sample_questions`,
>   `metadata JSONB`
> - Canonical tables re-seeded from `chunks_BEN0602.jsonl` using Gemini `gemini-embedding-2`
>   (768-dim). Previous nomic embeddings cleared.
>
> **Output monitoring (canonical retrieval test):**
> [paste output from A.2.6 here]
>
> **Embedding note for your Phase 2 wiring:**
> Production standard is now `gemini-embedding-2`. Your `embedder.py` currently uses
> `nomic-embed-text`. When you wire Phase 2 retrieval, the query embedder must use the
> same model as the stored vectors — via the configurable embedding setting you planned.
>
> Ready for your Step 3 signal when Phase 2 retrieval and score weighting
> (1.2 × pdf / 0.9 × transcript) are wired.

**Gate:** Do not proceed to the Track B final pipeline run until Meng Hai sends the Step 3 signal.
B.1, B.2, and B.3 can be built while waiting.

---

## Track B — Transcript Ingestion Pipeline

### Prerequisite before Track B final pipeline run

3.1 slides must be in canonical before ingesting the 3.1 transcript.
Without slide chunks, queries for 3.1 topics would return only transcript results with no
denser slide backup — the transcript chunks are designed to supplement slides, not replace them.

Steps:
1. Run `run_pipeline_BEN0602.py` targeting the 3.1 marker output:
   `data_BEN0601/marker_output_BEN0601/3.1 - Probability and Statistics/3.1 - Probability and Statistics.md`
2. Verify new chunks appear in `data_BEN0602/chunks_BEN0602/chunks_BEN0602.jsonl`
3. Re-run `seed_from_chunks_BEN0602.py` to upsert the 3.1 slide chunks into canonical

This prerequisite must be complete before the final pipeline run step — not before B.1/B.2/B.3.

---

### B.1 — Write `AGENT_SKILL_TRANSCRIPT_BEN0603.md`

**File to create:** `sandbox/ben/docs_BEN0603/AGENT_SKILL_TRANSCRIPT_BEN0603.md`

This is the LLM system prompt for transcript chunking.
It is the transcript counterpart to `AGENT_SKILL_BEN0602.md` (which is for slides).

The prompt must contain the following sections:

**Context section — tell the LLM:**
- Source: university lecture transcript, already parsed and merged by `parse_vtt_BEN0603.py`
- Speakers of interest: `germayne` (primary instructor), `Shumin Lai | NTU` (co-instructor)
- Final use: embedded into pgvector for a RAG chatbot answering ML student questions
- Objective: maximise retrieval quality, not preserve the original transcript exactly

**Task 1 — Remove noise**

Remove:
- Sentence-final fillers: "right?", "okay?", "yeah?", "you know?", "is it?"
- Singapore English discourse particles: "lah", "leh", "lor", "can can", "wah", "sia"
- Repetitive false starts: "so so basically basically", "I think I think", "right right right"
- Transition noise: "okay okay okay", "let me let me", "erm", "uhh", "hmm"
- Any residual attendance, admin, or logistics content

Provide at least three concrete before/after examples in the prompt — the LLM performs
better with examples for colloquial patterns it may not clean automatically.

**Task 2 — Preserve teaching content**

Keep and preserve in full:
- Verbal analogies (coin flip demonstration, election polling, survey sampling — these are
  what makes transcript chunks uniquely valuable for "explain in plain English" queries)
- Worked numerical examples germayne steps through verbally
- Germayne's live corrections and clarifications, especially misconception corrections
  (e.g. "central limit theorem is about the distribution of the X bars, not your X")
- Student Q&A blocks where the student question is substantive and germayne's answer
  adds explanation not already in the slides

**Task 3 — Format Q&A blocks**

When a Q&A block is present:
```
**Q:** [student question, cleaned]
**A:** [germayne's answer, cleaned]
```

**Task 4 — Preserve the verbal register**

Explicitly instruct the LLM: do NOT rewrite into formal bullet-point notes.
The verbal explanation style must be preserved — this is what differentiates transcript
chunks from slide chunks for "explain X in plain English" retrieval queries.

**Task 5 — Align topic to slide**

The `topic` field must match the corresponding slide heading exactly.
Provide the 3.1 slide topic list as context in the prompt so the LLM can align:

```
What is probability theory?
Definitions (Event, Sample Space)
Law of Large Numbers
Probability Distributions
Binomial Distribution
Continuous Probability Distribution
Normal Distribution
Central Limit Theorem
Statistical Inference
Z-Scores
Hypothesis Testing
```

`lesson_title` is always "Probability and Statistics for Machine Learning" for this transcript.

**Task 6 — Output format**

Same JSON array format as BEN0602, with two additional fields:

```json
[
  {
    "lesson_title": "",
    "topic": "",
    "timestamp_start": "HH:MM:SS",
    "timestamp_end": "HH:MM:SS",
    "clean_markdown": "",
    "retrieval_keywords": [],
    "sample_questions": []
  }
]
```

Return only the JSON array inside ```json ... ``` fences. No explanations.

---

### B.2 — Build `parse_vtt_BEN0603.py`

**File to create:** `source/backend/ingestion/parse_vtt_BEN0603.py`

**Input:** path to `.vtt` file (parametrized — not hardcoded to 3.1)
**Output:** `data_BEN0603/parsed_vtt_BEN0603.jsonl`

#### Step 1 — Parse cue blocks

Parse each VTT cue block into:
```python
{
  "cue_id": int,
  "ts_start": str,   # "HH:MM:SS.mmm" — keep as string for output
  "ts_end": str,
  "ts_start_sec": float,   # convert to seconds for gap arithmetic
  "speaker": str,
  "raw_text": str
}
```

Speaker label parsing: the VTT format is `Speaker Name: text on the same line`.
Strip the speaker prefix to get `raw_text`.

#### Step 2 — Pre-lecture filter

Drop all cues where `ts_start_sec < 2146.0` (= 00:35:46).

This removes admin, attendance, Shumin's NLP bio introduction, and all social chat
before germayne begins teaching. The boundary is germayne's first slide-teaching
utterance: "okay so hopefully you guys can see my slides" at 00:35:46.

#### Step 3 — Speaker filter

Keep cues where `speaker` exactly matches (case-sensitive):
- `germayne`
- `Shumin Lai | NTU`

For all other speakers (students): keep a student cue only if it is immediately followed
within 30 seconds by a `germayne` cue. That pair becomes a Q&A block.
Drop all other student cues.

#### Step 4 — Jupyter Notebook segment filter

Drop cues that fall within notebook exercise periods.
These segments contain verbal code narration ("I'm running this cell now...") with
no self-contained educational content — they reference visuals that don't exist in the chunk.

Detect notebook entry: germayne phrases containing "notebook", "let me go to", "run this".
Detect notebook exit: germayne phrases containing "go back to the slides",
"back to the deck", "so we saw from the notebook".

Approximate periods in the 3.1 transcript (use as fallback if detection fails):
- Notebook Part 1: ~01:05:xx – ~01:45:xx
- Notebook Part 2: ~02:13:xx – ~02:39:xx
- Notebook Part 3: ~03:15:xx – ~03:40:xx

#### Step 5 — Cue merger

Group consecutive same-speaker cues where gap between `ts_end` of one and `ts_start`
of next is ≤ 30 seconds. Concatenate `raw_text` with a single space. The merged block
inherits `ts_start` from the first cue and `ts_end` from the last.

Drop any merged block whose total word count < 10 — these are residual backchannels
("Correct", "Yes", "Okay") that survived speaker filtering.

#### Step 6 — Q&A detection and labeling

A merged block is `segment_type: 'qa'` if it was created from a student–germayne pair
(Step 3). All other germayne blocks are `segment_type: 'lecture'`.

#### Output format

Each line of `data_BEN0603/parsed_vtt_BEN0603.jsonl`:
```json
{
  "topic_hint": "",
  "ts_start": "00:39:24",
  "ts_end": "01:05:00",
  "merged_text": "...",
  "segment_type": "lecture"
}
```

`topic_hint` is left empty at parse time — the LLM assigns the final `topic` in B.3.

#### Mandatory inspection step before proceeding to B.3

Run the parser against the 3.1 VTT and inspect `parsed_vtt_BEN0603.jsonl` manually:

| Check | Expected |
|---|---|
| First cue `ts_start` | ≥ 00:35:46 |
| Jupyter notebook periods | Absent |
| Q&A blocks | Student question + germayne answer paired |
| Standalone backchannel blocks | None (< 10 words filtered) |
| Merged paragraphs | Read as coherent speech |

Do not proceed to B.3 until this inspection passes.

---

### B.3 — Build `llm_chunk_transcript_BEN0603.py`

**File to create:** `source/backend/ingestion/llm_chunk_transcript_BEN0603.py`

**Inputs:**
- `data_BEN0603/parsed_vtt_BEN0603.jsonl` (from B.2)
- Slide markdown for topic alignment context:
  `data_BEN0601/marker_output_BEN0601/3.1 - Probability and Statistics/3.1 - Probability and Statistics.md`
- System prompt: `sandbox/ben/docs_BEN0603/AGENT_SKILL_TRANSCRIPT_BEN0603.md`

**Output:** `data_BEN0603/chunks_transcript_BEN0603.jsonl`

#### Key differences from `llm_clean_chunk_BEN0602.py`

| Aspect | BEN0602 (slides) | BEN0603 (transcript) |
|---|---|---|
| Batching unit | 10 slide pages | ~800 words per batch |
| Batch splitter | `re.split(r'<!--\s*page\s*\d+\s*-->', text)` | split merged blocks by cumulative word count |
| LLM context per call | Slide markdown only | Parsed VTT batch + corresponding slide markdown sections |
| Extra output fields | — | `timestamp_start`, `timestamp_end` |
| System prompt file | `AGENT_SKILL_BEN0602.md` | `AGENT_SKILL_TRANSCRIPT_BEN0603.md` |

#### Batching strategy

Split `parsed_vtt_BEN0603.jsonl` into batches of cumulative ≤ 800 words.
Never split a Q&A block across two batches — if adding a Q&A block would exceed 800 words,
close the current batch and start a new one with that block.

For each batch, the user message to Gemini should contain:
1. The merged transcript text for the batch
2. The relevant slide markdown sections (the subset of slide pages that cover the same topic range)

This slide context lets the LLM align `topic` to exact slide headings without guessing.

#### Output per chunk

Same schema as `chunks_BEN0602.jsonl` with these differences:
- `source_type: 'transcript'`
- `chunk_id` format: `{source_file_slug}_BEN0603_{seq:04d}` — must use `_BEN0603_`, not `_BEN0602_`
- `page_number: null`
- `metadata`:
  ```json
  {
    "timestamp_start": "HH:MM:SS",
    "timestamp_end": "HH:MM:SS",
    "speakers": ["germayne"],
    "segment_type": "lecture"
  }
  ```

#### Model rotation

Reuse the same `MODELS` list and daily-quota rotation logic from `llm_clean_chunk_BEN0602.py`.

---

### Final pipeline run (gated on Meng Hai Step 3 signal + 3.1 slides prerequisite)

Run in order:

1. Confirm Meng Hai Step 3 signal received
2. Confirm 3.1 slides are in canonical (see prerequisite above)
3. Run `llm_chunk_transcript_BEN0603.py`
4. Inspect 5 sample chunks from `data_BEN0603/chunks_transcript_BEN0603.jsonl`:
   - `topic` aligns to a 3.1 slide heading
   - `clean_markdown` reads like cleaned verbal teaching (not formal bullets)
   - Q&A blocks are formatted correctly
   - No Singapore English filler in `clean_markdown`
   - `metadata.timestamp_start` / `timestamp_end` are populated
5. Extend `seed_from_chunks_BEN0602.py` to also accept `chunks_transcript_BEN0603.jsonl`
   as input (or write `seed_from_chunks_BEN0603.py` following the same pattern)
6. Run seeder to upsert transcript chunks into canonical
7. Run retrieval verification queries — these should now return transcript chunks:
   ```bash
   python source/backend/ingestion/dev_retrieve_BEN0601.py --canonical search "Explain the central limit theorem in simple terms"
   python source/backend/ingestion/dev_retrieve_BEN0601.py --canonical search "What happens if my sample size is too small?"
   python source/backend/ingestion/dev_retrieve_BEN0601.py --canonical search "Can you explain the law of large numbers with an example?"
   ```
8. Confirm in results: `source_type: transcript`, `ts` shows timestamp, scores are reasonable

---

## Watch-outs

| # | Issue | Guard |
|---|---|---|
| 1 | Embedding model mismatch | All vectors in canonical must be Gemini — never mix with nomic in the same table |
| 2 | 3.1 slides missing from canonical | Run BEN0602 pipeline on 3.1 PDF before the final transcript upsert |
| 3 | Jupyter Notebook segments are unindexable | B.2 parser must filter these — inspect output before proceeding to B.3 |
| 4 | Singapore English filler | `AGENT_SKILL_TRANSCRIPT_BEN0603.md` must include explicit examples — the LLM needs them |
| 5 | Shumin's NLP intro creates a stray off-topic chunk | Pre-lecture filter at 00:35:46 covers this |
| 6 | Token budget: transcripts are 3–6× longer than slide pages | Batch by ~800 words — never by page count |
| 7 | `source_type` vs `document_type` | Use `source_type` everywhere — `document_type` was an error in old planning docs |
| 8 | `chunk_id` collision | BEN0603 transcript chunk IDs must use `_BEN0603_` — not `_BEN0602_` |
| 9 | Upsert target | Transcript chunks go into canonical tables via the seeder — not into `rag_chunks_BEN0602` |
| 10 | How many VTTs exist | Only 3.1 is confirmed. Chase Lanson before making the pipeline generic for all lessons |

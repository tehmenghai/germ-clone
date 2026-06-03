# INGESTION_TEXTBOOK_RULES_BEN0601.md

## Purpose

Different document types require different chunking strategies.

This project ingests:

1. Lecture Slides
2. Textbooks
3. Lecture Transcripts
4. Other Documents

The ingestion pipeline MUST identify document type before chunking.

---

# Document Classification Rules

## TYPE 1: Lecture Slides

Typical Characteristics:

* Many pages (10–100)
* Short text blocks
* Bullet points
* Large images
* Sparse paragraphs
* Page title on almost every page

Examples:

```text
3.1 - Probability and Statistics.pdf
3.3 - Supervised Learning 2_annotations.pdf
3.7 - Neural Network and Deep Learning_annotated.pdf
```

Recommended Chunking:

```yaml
chunk_strategy: slide
chunk_size: 500-1000
chunk_overlap: 100-200
```

Chunk Boundaries:

```text
1 slide = 1 chunk
or
2-3 small slides = 1 chunk
```

Metadata:

```json
{
  "document_type": "slide",
  "slide_number": 15,
  "lesson": "3.3",
  "topic": "Min-Max Scaling"
}
```

---

## TYPE 2: Textbooks

Typical Characteristics:

* Hundreds of pages
* Long paragraphs
* Chapters
* Sections
* Subsections
* Figures
* Equations
* References

Examples:

```text
Deep Learning (Goodfellow)
Machine Learning Textbook
Research Handbook
```

Recommended Chunking:

```yaml
chunk_strategy: textbook
chunk_size: 1000-1500
chunk_overlap: 200
```

Chunk Boundaries:

Priority Order:

```text
Chapter
→ Section
→ Subsection
→ Chunk
```

DO NOT:

```text
Split mid-formula
Split figure caption from figure explanation
Mix two sections into one chunk
```

Metadata:

```json
{
  "document_type": "textbook",
  "chapter": "Chapter 6",
  "section": "6.2 Gradient Descent",
  "page_start": 210,
  "page_end": 212
}
```

---

## TYPE 3: Lecture Transcripts

Typical Characteristics:

* Generated from audio/video
* Speaker labels
* Long conversational text
* Questions and answers

Examples:

```text
4-hour lecture transcript
Zoom recording transcript
Class discussion transcript
```

Recommended Chunking:

```yaml
chunk_strategy: transcript
chunk_size: 1200
chunk_overlap: 250
```

Preferred Boundary:

```text
Topic change
Speaker change
Q&A block
```

Metadata:

```json
{
  "document_type": "transcript",
  "speaker": "Lecturer",
  "segment_type": "lecture",
  "timestamp_start": "01:12:15"
}
```

---

# Auto Detection Logic

The ingestion pipeline should classify documents using the following heuristics.

## Identify as Textbook if:

Any of:

* More than 100 pages
* Contains "Chapter"
* Contains table of contents
* Contains numbered sections such as:

```text
1
1.1
1.1.1
2
2.3
```

* Average words per page > 300

Classification:

```python
document_type = "textbook"
```

---

## Identify as Slides if:

Any of:

* Average words per page < 150
* Many bullet points
* Large percentage of image content
* Repeated lesson title on pages

Classification:

```python
document_type = "slide"
```

---

## Identify as Transcript if:

Any of:

* Speaker labels
* Timestamp patterns
* Long conversational paragraphs
* Frequent question/answer patterns

Classification:

```python
document_type = "transcript"
```

---

# Embedding Rules

All document types use:

```yaml
embedding_model: gemini-embedding-2
embedding_dimension: 768
```

Store:

```yaml
chunk_text
metadata
embedding_vector
source_file
page_number
document_type
```

---

# Retrieval Rules

Default:

```yaml
top_k: 5
```

Future enhancement:

```yaml
textbook_chunks_weight = 1.0
slide_chunks_weight = 1.2
transcript_chunks_weight = 0.9
```

to prioritize concise slide content when duplicate concepts exist.

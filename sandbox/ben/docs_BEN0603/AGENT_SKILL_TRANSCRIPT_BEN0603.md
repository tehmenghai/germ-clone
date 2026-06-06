You are an expert Data Engineering and RAG preprocessing engineer.

Context
-------
The source document is a university lecture transcript from a Zoom recording.
It has already been parsed and speaker-filtered by parse_vtt_BEN0603.py.

The input text contains merged utterances from two instructors:
- germayne (primary instructor)
- Shumin Lai | NTU (co-instructor, present for introduction only)

The final output will be embedded into a Vector Database (pgvector on Neon) and
used by a Retrieval Augmented Generation (RAG) chatbot that answers ML student questions.

Your objective is NOT to produce a perfect transcript.
Your objective is to maximise retrieval quality for student queries.

---------------------------------------------------
TASK 1 – REMOVE NOISE
---------------------------------------------------

Remove the following without exception:

Sentence-final fillers:
"right?", "okay?", "yeah?", "you know?", "is it?", "lah?", "leh?"

Singapore English discourse particles:
"lah", "leh", "lor", "can can", "wah", "sia", "lo"

Repetitive false starts:
"so so basically basically", "I think I think", "right right right",
"okay okay okay", "let me let me", "basically basically"

Disfluencies:
"erm", "uhh", "hmm", "you know", "like like", "I mean I mean"

Transition noise:
"okay so", "alright so", "so so", "and and"

Examples of what to remove vs keep:

REMOVE: "So basically, right, what I'm trying to say, lah, is that the law of large numbers, yeah..."
KEEP:   "The law of large numbers states that as the number of trials increases, the observed probability converges to the true probability."

REMOVE: "okay okay okay let me let me go back to the slide"
REMOVE: "wah, that's actually quite interesting lah"
REMOVE: "I think I think what you're asking is, you know, like..."

---------------------------------------------------
TASK 2 – PRESERVE TEACHING CONTENT
---------------------------------------------------

Keep and preserve in full:

Verbal analogies — these are the unique value of transcripts over slides:
- Coin flip demonstrations (law of large numbers)
- Election polling examples (statistical inference)
- Survey sampling examples (CLT)
- Supplement trial examples (hypothesis testing)
- Any real-world application germayne uses to illustrate a concept

Worked examples germayne steps through numerically.

Live corrections and misconception clarifications — especially high value:
- "Central limit theorem is about the distribution of the X bars, not your X"
- Any moment where germayne explicitly says "to be very clear" or "just to clarify"

Student Q&A blocks where the student question is substantive and germayne's
answer adds explanation not already in the slides.

---------------------------------------------------
TASK 3 – FORMAT Q&A BLOCKS
---------------------------------------------------

When a Q&A exchange is present in the input, format it as:

**Q:** [student question, cleaned of fillers]
**A:** [germayne's answer, cleaned of fillers]

Example:

Input:
"Student: yeah so I was wondering lah, how do I know if my sample is actually good enough?
germayne: Good question. Well, we will discuss that later — but essentially, what you want
to look at is your confidence interval..."

Output:
**Q:** How do I know if my sample is good enough?
**A:** What you want to look at is your confidence interval. We will cover this when we
discuss statistical inference — the confidence interval tells you the range within which
the true population parameter likely falls, given your sample.

---------------------------------------------------
TASK 4 – PRESERVE THE VERBAL REGISTER
---------------------------------------------------

DO NOT rewrite into formal bullet-point teaching notes.

The verbal explanation style must be preserved.
Germayne's analogies and step-by-step walk-throughs are what differentiate transcript
chunks from slide chunks for "explain X in plain English" retrieval queries.

WRONG output:
"### Law of Large Numbers
- Definition: As trials increase, observed probability converges to true probability.
- Example: Coin flip."

CORRECT output:
"The law of large numbers is essentially saying that if you flip a coin a million times,
you will start to see the probability converge to 50%. If you only flip it 5 or 10 times,
you might not see that — you might get heads 80% of the time. But the more trials you run,
the closer your observed result gets to the true underlying probability."

---------------------------------------------------
TASK 5 – ALIGN TOPIC TO SLIDE HEADING
---------------------------------------------------

The topic field must match one of the following slide headings exactly.
Use the slide context provided alongside each input batch to determine alignment.

Valid topic values for lesson 3.1 — Probability and Statistics for Machine Learning:

"Introduction to Probability Theory"
"Probability Definitions: Sample Space and Event"
"Law of Large Numbers"
"Probability Distributions"
"Discrete Probability Distributions"
"Binomial Distribution"
"Continuous Probability Distribution"
"Normal Distribution"
"Central Limit Theorem"
"Statistical Inference"
"Z-Scores"
"Hypothesis Testing"
"P-Value"
"Common Statistical Tests"

If a segment spans a topic transition, split it into two chunks — one per topic.
If a segment is purely administrative (attendance, technical issues, social chat),
return an empty array [] for that batch.

lesson_title is always:
"Probability and Statistics for Machine Learning"

---------------------------------------------------
TASK 6 – OUTPUT FORMAT
---------------------------------------------------

Return a JSON array. Each element is one semantic chunk.

Use this exact structure:

[
  {
    "lesson_title": "Probability and Statistics for Machine Learning",
    "topic": "<exact topic from the valid list above>",
    "timestamp_start": "HH:MM:SS",
    "timestamp_end": "HH:MM:SS",
    "segment_type": "lecture" or "qa",
    "clean_markdown": "<cleaned verbal teaching content, preserving analogy register>",
    "retrieval_keywords": ["keyword1", "keyword2", ...],
    "sample_questions": [
      "Question a student would ask to find this chunk",
      "Another question this chunk answers"
    ]
  }
]

Rules:
- Wrap the array in ```json ... ``` code fences.
- If a batch contains no educational content, return ```json [] ```.
- Never merge two different topics into one chunk.
- clean_markdown must read as natural teaching speech — not formal bullets.
- For Q&A chunks: clean_markdown should contain the formatted Q/A block.
- retrieval_keywords: 4–8 terms, lower-case, comma-separated.
- sample_questions: 2–4 questions a student would realistically type into the chatbot.
- Use plain-text ASCII math — NO LaTeX backslash commands.
- timestamp_start and timestamp_end use HH:MM:SS format (no milliseconds).
- segment_type is "qa" only when the chunk is primarily a student question + answer exchange.

Do not return explanations outside the JSON. Return only the JSON array.

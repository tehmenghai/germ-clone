# Automated QA with Manual Review/Verification — Q&A Test Cases & Results  

Tester: hueyling  
Scope: Q&A flow only (ask → pipeline → composed answer with citations, math, and visualization).  
Out of scope: settings/theme/view-mode UI (already covered by Lik Hong's frontend tests??)

## How to run

```bash
./launch.sh
```

Open `http://localhost:3007`, pick or create a profile, and ask each question below **as a
fresh message** (new question, not a follow-up) unless a test case says otherwise.

## Results convention

Each test case gets its own subfolder under this folder's `results/` directory:

```
docs/qa/hueyling/results/TC<NN>/stages.png  (Agent Trace drawer open)
docs/qa/hueyling/results/TC<NN>/math.png
docs/qa/hueyling/results/TC<NN>/viz.png     (or empty.png for the no-match fallback)
docs/qa/hueyling/results/TC<NN>/answer.md   — composed answer, captured as plain text read from the rendered page as answer can be long
```

**Note on `answer.md`:** the automated script (`source/frontend/tests/qa/run-test-case.mjs`) captures this by reading the rendered DOM (`page.locator(".msg-bot").innerText()`) after the UI finishes rendering the answer, at the cost of losing the raw Markdown/LaTeX source (KaTeX renders equations to styled HTML, not `$...$` text, so `answer.md` is a plain-text transcript of what's visible, not the original markdown string).

## If a test case fails

Fill in the following fields in that test case's "If failed" block if applicable:
1. Pipeline stage that hung/failed (from the stage rail or Agent Trace drawer)
2. Backend terminal output (paste relevant lines in log from the `launch.sh` terminal)

---

## Test Cases Summary

| ID | Topic | Sample question | Module(s) |
|---|---|---|---|
| TC01 | confusion-matrix | "What's the difference between precision and recall?" | 3.3 |
| TC02 | bias-variance | "Why does my model overfit the training data?" | 3.3, 3.4 |
| TC03 | regularization | "L1 vs L2 regularization - when to use which?" | 3.4, 3.8 |
| TC04 | knn | "How do i choose k in KNN?" | 3.2 |
| TC05 | gradient-descent | "What does the learning rate do in gradient descent?" | 3.7 |

Expected Results (Standard difficulty tab):
- Pipeline stage rail completes all stages (`route → rewrite → retrieve1 → react → reflect →
  evaluate1 → compose`, with or without reloop)
- Answer prose has inline `[N]` citations and a `## References` section
- Math tab and answer show the topic's curated equations
- Visualize tab renders the matching component
- Answer metrics:  
  f (faithfulness): Every claim in the answer is grounded in retrieved chunks  
  r (relevance)   : Retrieved chunks actually address the question (Sources panel shows chunks from the correct module's PDF/VTT)  
  c (completeness): The answer fully covers the question  

---

## General Observations / Feedback

1. Tried running using the free cloud LLM (Groq, Gemini, Cerebras) but all hit rate limit error almost immediately, not sure why... So have to use local ollama.
2. No browsing conversation history per profile - Backend data model is fully designed but persistence not implemented. Frontend has no UI for browsing conversation history. Not part of the design.
3. Switching the diffculty mode after one Q&A run during the session will hang the app.
4. Composing answer took a long time (more than 10mins for local ollama, half the processing time) compared to the other pipeline stages.
5. 5 Test cases tested: 
- completed all pipeline stages with evaluation scores
- all have `## References` section and inline `[N]` citations except no citation for TC04
- failed source retrieval for 4 out of 5 test cases - see actual results / evidences
- provided Claude summary of the respective VTT on Germayne mention about the topic for ref
6. For Claude noting - Claude made a number of wrong assumptions while troubleshooting instead of checking first, requiring correction each time 
   — e.g., claiming the "answer never renders" finding was confirmed before it had been reproduced manually; 
   and asserting a blanket 600s LLM timeout applied to `compose` before checking that `compose` uses a different (streaming) code path than the other stages.
   Assumptions should get verified against the actual code/logs before being stated as findings.

---

## TC01 — confusion-matrix (Module 3.3)

- **Question:** "What's the difference between precision and recall?"
- **Difficulty:** Standard
- **Inference backend:** Ollama (local)
- **Expected result:** Stage rail completes; answer cites module 3.3 sources;
  Math tab shows precision/recall/F1 equations; Visualize tab renders `ConfusionMatrixViz`.

**Actual result:** Manual run
- Math tab and answer show the topic's curated equations: ok  
- Visualize tab renders the matching component: ok  
- Answer metrics:  
  f: 60% - Answer and references didnt match.  
  r: 70% - failed to retrieve from 3.3 PDF & VTT (see Claude summary of 3.3 VTT on topic).  
  c: 40% - Answer looks ok but is missing out on contents from 3.3 VTT.

**Pass/Fail:** Failed source retrieval.

---

## TC02 — bias-variance (Modules 3.3, 3.4)

- **Question:** "Why does my model overfit the training data?"
- **Difficulty:** Standard
- **Inference backend:** Ollama (local)
- **Expected result:** Stage rail completes; answer cites module 3.3/3.4
  sources; Math tab shows bias-variance decomposition equations; Visualize tab renders `BiasVarianceViz`.

**Actual result:** Run via the automated Chromium script
- `route` → module 3.1 (wrong; should be 3.3/3.4)
- `retrieve1` → 8 chunks, all from modules 3.7/3.8 — none from 3.3/3.4
- `evaluate1` → faithful 0.60/relevant 0.80/complete 0.90 → BELOW 0.80 (0.77), **reloop**
- `retrieve2` → 4 more chunks, still only modules 3.7/3.8 — reloop did not fix the module miss
- `evaluate2` → faithful 0.90/relevant 0.80/complete 0.70 → **PASS** (mean 0.80)
- `compose` → done
- Math tab and answer show the topic's curated equations: Answer not the same equation as Math tab (see answer)  
- Visualize tab renders the matching component: ok  
- Answer metrics:  
  f: 90% - `## References` section didn't tally with sources. It hallucinated five **real external textbook
citations** that don't exist in this app's corpus at all.  
  r: 80% - failed to retrieve from 3.3 PDF & 3.4 VTT, the modules that actually cover bias-variance tradeoff (see Claude summary of 3.4 VTT on topic).    
  c: 70% - The answer should be about the model with high variance (complex model, too many features) which overly learned the training data and does not generalise on the data will capture noise in the training data, leading to overfitting. Missing out on contents from 3.3 PDF & & 3.4 VTT.

**Pass/Fail:** Failed source retrieval.

---

## TC03 — regularization (Module 3.4, 3.8)

- **Question:** "L1 vs L2 regularization - when to use which?"
- **Difficulty:** Standard & ELI5
- **Inference backend:** Ollama (local)
- **Expected result:** Stage rail completes; answer cites module 3.4 & 3.8 sources;
  Math tab shows L1/L2 regularization equations; Visualize tab renders `L1 (Lasso)/ L2 (Ridge) Regularization Viz`

**Actual result:** Manual Run
- Math tab and answer show the topic's curated equations: Answer shows the equation for Gradient Descent. Not the same equation as Math tab (see answer)  
- Visualize tab renders the matching component: ok  
- Answer metrics:  
  f: 80% (standard) / 58% (ELI5) - Actually low for standard mode as the answer and references didnt quite match.  
  r: 60% (standard) / 55% (ELI5) - `route` correctly identified module 3.4, but `retrieve1` pulled all 8 chunks from modules 3.7/3.8 — none from 3.4, that cover L1, L2 comprehensively by Germayne (see Claude summary of 3.4 & 3.8 VTT on topic).  
  c: 40% (standard) / 62% (ELI5) - The answer is missing out on contents from 3.4 PDF & VTT.

**Pass/Fail:** Failed source retrieval and equation in answer.

---

## TC04 — knn (Module 3.2)

- **Question:** "How do i choose k in KNN?"
- **Difficulty:** Standard
- **Inference backend:** Ollama (local)
- **Expected result:** Stage rail completes; answer cites module 3.2
  sources; Math tab shows distance-metric equations; Visualize tab renders `KNNViz`.

**Actual result:** Run via the automated Chromium script
- `route` → module 3.5 (wrong — that's k-means/unsupervised learning, not KNN; likely confused by the shared "k" parameter between "k in KNN" and "k-means")
- `retrieve1` → 8 chunks, all from modules 3.7/3.8/3.9 — none from 3.2
- `evaluate1` → faithful 0.80/relevant 0.60/complete 0.40 → BELOW 0.80 (0.60), **reloop**
- `retrieve2` → 5 more chunks, from modules 3.10/3.7/3.8/3.9 — still zero from 3.2
- `evaluate2` → faithful 0.30/relevant 0.20/complete 0.10 → 0.20 — proceeds to compose anyway
- `compose` → done, but with **zero citations** — Sources panel shows "⌥ 0 sources"
- Math tab and answer show the topic's curated equations: no — Math tab has the real distance-metric equations, but the answer's own "KEY EQUATION" is just `K = k` (a tautology, not a distance formula)
- Visualize tab renders the matching component: ok
- Answer metrics:  
  f: 30% - final eval score, matches the degraded second pass; the answer is generic/textbook
  filler ungrounded in any retrieved chunk (there's nothing to ground it in — 0 sources)  
  r: 20% - retrieval never touched module 3.2 across either attempt; reloop made it worse,
  not better (relevant dropped from 0.60 → 0.20)  
  c: 10% - answer doesn't address the actual question (how to *choose* k) beyond generic
  "use grid search/cross-validation" filler with no course-specific content  
- the answer contains a **factual error**, not just a grounding gap — it calls KNN "an effective clustering algorithm." KNN is supervised classification/regression; k-means is the clustering algorithm. This reads like contamination from the wrong-module retrieval (module 3.5 is unsupervised/k-means) bleeding into the answer's own framing of KNN itself.

**Pass/Fail:** Failed source retrieval, zero citations, a factual error in the answer itself.

---

## TC05 — gradient-descent (Module 3.7)

- **Question:** "What does the learning rate do in gradient descent?"
- **Difficulty:** Standard
- **Inference backend:** Ollama (local)
- **Expected result:** Stage rail completes; answer cites module 3.7 sources;
  Math tab shows the gradient-descent update rule; Visualize tab renders `GradDescViz` (adjust
  the learning-rate slider or optimizer variant before screenshotting).

**Actual result:** Run via the automated Chromium script
- `route` → module 3.7 (correct)
- `retrieve1` pulled 8 chunks from modules 3.10/3.7/3.8 — same mixed result as the first attempt.
- `evaluate1` — faithful 0.59/relevant 0.67/complete 0.80 → BELOW 0.80 (0.69), triggering the reloop. 
- `retrieve2` pulled 3 more chunks, still from modules 3.10/3.7. 
- `evaluate2` then passed (0.83/0.85/0.78 → PASS, mean 0.82)
- `compose` done
- Math/Visualize tabs both rendered correctly (topic detection runs off the query text, independent of the answer).
- Answer metrics:  
  f: 83%  
  r: 85% - 2 of 3 from the correct module (3.7), 1 from module 3.8 (normalization — unrelated).  
  c: 78% - ok. Format compliance for Standard difficulty was correct (INTUITION → KEY EQUATION →
   TERM-BY-TERM → CONSEQUENCE → WORKED EXAMPLE → REFERENCES structure).

**Pass/Fail:** Pass

---

## Retest — 2026-07-13 (post fix for #26, #27, #29)

**Tester:** Claude (on englikhong's behalf), free-tier cloud first per instruction, Ollama used only where noted.
**Trigger:** confirming whether `172c726` (fix(rag): wire route's module classification into retrieval, fixes #26) resolves the wrong-module routing/retrieval defects documented above, plus the citation-fabrication fix (#27) and evaluate-scores-real-answer fix (#29).

### Summary verdict

All defects TC01–TC04 documented above are **fixed** on free-tier cloud (Cerebras, `gpt-oss-120b`). Route no longer misclassifies TC02 (3.1→3.3) or TC04 (3.5→3.2); retrieval now surfaces the correct module in every case; TC02's fabricated external citations are gone (all references now point at real corpus files); TC04's zero-citation and "KNN is a clustering algorithm" factual error are both gone. TC05 surfaced a **new, separate, confirmed** provider-specific defect — filed as [issue #39](https://github.com/englikhong/germ-clone/issues/39), assigned to Meng Hai (`area:rag`).

General observation #1 (immediate rate-limiting on free cloud) did not reproduce on Cerebras or Groq during this retest.

### TC01 — confusion-matrix retest (Cerebras)

- `route` → module 3.3 (unchanged, was already correct at baseline)
- `retrieve1` → 8 chunks, **modules 3.3, 3.4** (baseline: zero from 3.3) — module-boost fix confirmed working
- `evaluate1` → faithful 0.60/relevant 0.90/complete 0.95 → **PASS** (mean 0.82), no reloop needed
- References: 2 real citations, both module 3.3 PDF — no fabrication
- **Verdict:** retrieval module-mix defect **resolved**. Faithfulness unchanged at 60% vs baseline — a residual, separate issue, not a regression.

### TC02 — bias-variance retest (Cerebras)

- `route` → module 3.3 (**fixed** — baseline was 3.1, wrong)
- `retrieve1` → 8 chunks, **modules 3.2, 3.3, 3.4, 3.7, 3.8** (baseline: all 3.7/3.8 only)
- `evaluate1` → faithful 0.90/relevant 1.00/complete 1.00 → **PASS** (mean 0.97), no reloop needed
- References: 4 real citations — 3.7 PDF, 3.3 PDF, 3.8 PDF, 3.2a VTT. **No fabricated external textbook citations** (baseline's worst defect on this TC)
- Key Equation in the answer matches the bias-variance decomposition shown in the Math tab
- **Verdict:** route misclassification **fixed**. Wrong-module retrieval **fixed**. Citation fabrication **fixed**.

### TC03 — regularization retest (Cerebras)

- `route` → module 3.4 (unchanged, correct)
- `retrieve1` → 8 chunks, **modules 3.3, 3.4** (baseline: all 3.7/3.8, zero 3.4)
- `evaluate1` → faithful 0.85/relevant 1.00/complete 0.95 → **PASS** (mean 0.93), no reloop needed
- Answer shows the **correct L1 (Lasso) and L2 (Ridge) penalty equations**, matching the Math/Visualize tab topic (baseline showed the gradient-descent equation instead)
- References: 2 real citations, both module 3.4 PDF — no fabrication
- **Verdict:** wrong-module retrieval **fixed**. Wrong-equation-in-answer defect **fixed**.

### TC04 — knn retest (Cerebras) — primary target of the #26 fix

- `route` → module 3.2 (**fixed** — baseline was 3.5/k-means confusion; this is exactly the disambiguation `route.py` prompt change in `172c726` targets)
- `retrieve1` → 8 chunks, modules 3.3, 3.4, 3.5, 3.7 (module 3.2 itself still not directly retrieved — see residual note below)
- `evaluate1` → faithful 0.80/relevant 0.90/complete 0.85 → **PASS** (mean 0.85), no reloop needed
- References: **3 real citations** — 3.4 PDF, 3.7 PDF, 3.4 transcript VTT (baseline: **zero citations**, "⌥ 0 sources")
- Answer correctly frames KNN as a classification algorithm tuned via grid-search/cross-validation. **No factual error** calling KNN "a clustering algorithm" (baseline's worst defect)
- KEY EQUATION is a real cross-validation-error formula, not baseline's tautological `K = k`
- **Verdict:** route k/k-means confusion **fixed**. Zero-citation defect **fixed**. Factual error **fixed**. Tautological equation **fixed**.
- **Residual, not a regression of a documented defect:** `retrieve1`'s chunk list doesn't explicitly surface module 3.2 content even though the final citations are accurate (3.4/3.7). Corpus/embedding coverage for module 3.2 specifically may be worth a follow-up look.

### TC05 — gradient-descent retest — **new defect found, filed as issue #39**

Ran 6 times total across this retest to confirm reproducibility before filing: 4× Cerebras, 1× Ollama (llama3.2), 1× Groq (llama-3.1-8b-instant).

- `route` → module 3.7 every time (correct, unchanged from baseline)
- `retrieve1` → diffuse mix every time regardless of provider (typically modules 3.2/3.7/3.8/3.10, sometimes +3.4/3.6) — never cleanly concentrated on 3.7
- **The composed answer was correct in every single run** — right update rule, correct worked numeric example, one accurate citation to the real 3.7 PDF, no fabrication, no factual errors (manually inspected each time)
- **But the evaluate score is provider-dependent:**

  | Run | Provider (judge model) | evaluate1 f/r/c | Final score |
  |---|---|---|---|
  | 1 | Cerebras (gpt-oss-120b) | 0.20/0.40/0.30 (reloop) | 53% |
  | 2 | Ollama (llama3.2) | 0.00/0.00/0.90 → 0.40/0.30/0.00 (reloop) | 23% |
  | 3 | Cerebras, fresh session | 0.30/0.60/0.90 (reloop) | 23% |
  | 4 | Cerebras, fresh session | 0.30/0.80/0.90 (reloop) | 63% |
  | 5 | **Groq**, fresh session | **1.00/1.00/0.80 (no reloop)** | **93% PASS** |

  4/4 Cerebras runs score faithfulness in the 0.20–0.40 band and reloop (reloop never recovers — `retrieve2` pulls chunks from *other* modules, e.g. 3.1/3.3, rather than narrowing onto 3.7, and evaluate2 sometimes scores worse than evaluate1). The 1 Groq run scores faithfulness 1.00 and passes on the first try, on an equally diffuse chunk set.
- **Verdict:** this is **not** a regression of the #26 fix — retrieval diffuseness is identical on Groq, which still scores it fine, so the discriminating variable is the evaluate judge model's behaviour, not retrieval. Baseline (this doc, above) passed cleanly at f83/r85/c78 pre-fix, so the low-scoring pattern on Cerebras is new since `172c726`, though the fix itself isn't the likely cause (retrieval is equally messy on Groq).
- **Filed:** [github.com/englikhong/germ-clone/issues/39](https://github.com/englikhong/germ-clone/issues/39) — `area:rag`, assigned `tehmenghai` (Meng Hai).

### General observations retest

1. **Rate limiting (#1 above):** not reproduced. Ran the equivalent of 5 full TC pipelines (each firing 3× `/ask` for difficulty prefetch, plus reloops) back-to-back on Cerebras with zero rate-limit errors in the backend log. Groq also rate-limit-free across its one run. Not exhaustively retested for Gemini/OpenRouter specifically.
2. **Difficulty-switch hang (#3):** not independently re-verified this session — out of scope for this retest pass.
3. **Compose/eval latency on Ollama (#4):** reproduced and then some. A single TC01 run on Ollama (llama3.2, CPU-only) took **~65 minutes** end-to-end — route alone took ~4 minutes, and evaluate1/evaluate2/compose each stalled 5–10+ minutes. Local-mode latency remains impractical for this kind of interactive regression testing; full TC02–05 were not run locally as a result.


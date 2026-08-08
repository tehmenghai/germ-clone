# E2E UAT Findings — germ//clone — 2026-08-08

**Target:** PR #40 `fix(rag): decouple evaluator grading from student's inference backend`
(branch `fix/issue-39-eval-backend-decouple`), closing issue #39. Retest of Huey Ling's
TC01–TC05 golden-path suite (`docs/internal/qa/hueyling/qna-test-cases.md`) plus a
targeted live repro of the #39 defect pattern.

## Verdict

**Ready with known friction.** PR #40's fix is confirmed working end-to-end — issue #39's
core defect (eval score swinging with the student's inference-backend toggle) is fixed and
verified live, not just at the unit-test level the PR's own description could reach (no
`CEREBRAS_API_KEY` in the author's environment; this environment has one). TC01–TC05 all
pass with no regressions. One **pre-existing, unrelated defect** was found during the walk
(error mislabeling on a reloop-path Groq rate-limit) — real, but out of scope for this PR;
recommend filing separately rather than blocking merge.

## Scope walked

- TC01–TC05 (Huey Ling's full golden-set), backend-direct SSE probes on Cerebras — regression check post-#40
- TC05 specifically: full browser UI walk (Playwright, live backend, screenshots) on both Groq and Cerebras student-backends, with `EVAL_BACKEND` pinned to Cerebras — the exact #39 repro condition
- Settings drawer — confirmed `EVAL_BACKEND` is correctly *not* exposed to the student (server-side-only by design, matches PR intent)
- Backend test suite (`pytest`, 35/35 pass) + `ruff check` on PR-changed files (clean)
- Edge case surfaced organically: Groq TPM rate-limit mid-reloop

## Findings

### P2-1 — Reloop-path LLM failure mislabeled as `evaluate2` in SSE stream and UI
**Journey:** TC05, standard difficulty, reloop triggered (faithfulness below threshold on first pass)
**Expected:** When the second-pass answer generation (`compose2`) fails (e.g. provider rate-limit), the error should surface attributed to the stage that actually failed, or at minimum a stage the user/dev can map back to "answer generation," not the evaluator.
**Actual:** `compose_generate_node` (graph node `compose2`) emits no `stage_events` of its own by design (`rag/nodes/compose.py` docstring: "internal to the graph, invisible over SSE"). `app/routes/ask.py`'s exception handler attributes any unhandled error to *the next stage in the pipeline sequence* (`PIPE_STAGES[idx+1]`), so a Groq `RateLimitError` thrown inside `compose2` is reported to the frontend as an `evaluate2` stage error. The evaluator itself is not at fault and was never called.
**Repro:**
1. Set `INFERENCE_BACKEND=groq` (needs a Groq key close to its per-minute token budget)
2. Ask a TC05-style question that triggers a reloop (diffuse retrieval, faithfulness < 0.80 on first pass)
3. If Groq rate-limits during the second `compose` call, the SSE stream and Agent Trace both show the failure under `evaluate2`, not `compose`/`compose2`
**Evidence:** live SSE capture — `"stage": "evaluate2", "status": "error", "detail": "litellm.RateLimitError: ... GroqException ... tokens per minute (TPM): Limit 6000 ..."`
**Likely location:** `source/backend/app/routes/ask.py:73` (`# Attribute error to the stage after the last completed one`) — the heuristic itself, not `evaluator.py` or anything PR #40 touched.
**Scope note:** Confirmed **not** introduced by PR #40 — `ask.py` is untouched by the diff, and the mechanism is pre-existing. Worth a follow-up issue since it would mislead exactly the kind of provider-behavior debugging Huey Ling was doing when she filed #39 (a Cerebras/Groq-specific symptom that's actually a stage-attribution bug, not a model behavior difference). Does not block this PR.

### P3-1 — Evaluator's parse-failure fallback is indistinguishable from a real score in the SSE stream
**Journey:** Any — observed while `EVAL_BACKEND`'s configured Ollama model was not yet pulled in this environment
**Expected:** An eval-backend infrastructure failure (model not found, connection refused) should be visibly different from a genuine low score.
**Actual:** `rag/evaluator.py`'s `except Exception → (0.5, 0.5, 0.5)` fallback renders identically to a real `f:0.5/r:0.5/c:0.5` judged score in both the SSE event and the UI — a 404 from Ollama (missing model) produced the exact same shape as a legitimate mediocre grade.
**Repro:** Point `EVAL_BACKEND` at an Ollama model that isn't pulled; ask any question; `evaluate1`/`evaluate2` both silently report 0.5/0.5/0.5.
**Evidence:** backend log showed `POST /api/generate → 404` for the eval call while the SSE stream reported a clean `"status": "done"` with flat 0.5s.
**Scope note:** Pre-existing (the fallback comment predates #40), not a regression. Flagging because #40 makes `EVAL_BACKEND` default to Ollama for every environment going forward — this exact failure mode (fresh env, model not pulled yet) is now the *first-run* experience for anyone standing up the app, not an edge case. Worth a `launch.sh` preflight check or at least a visibly distinct "eval backend unavailable" status rather than a silently-plausible fallback score. Does not block this PR — a documentation/DX note at most (e.g. `launch.sh` or first-run instructions should mention pulling `nomic-embed-text` + the `EVAL_BACKEND` model).

## Clean checkpoints

- **TC05 (primary #40 target), UI walk, Groq-student / Cerebras-eval, reloop path:** retrieve1 diffuse (modules 3.10/3.2/3.7/3.8) exactly as in the original #39 report; evaluate1 scored a genuine faithful 0.20/relevant 0.50/complete 0.20 → correctly triggered reloop; evaluate2 after retrieve2 passed at mean 0.68; composed answer correct throughout (right update rule, correct worked example, one accurate 3.7 PDF citation, GradDescViz rendered and interactive). Screenshot evidence captured.
- **TC01–TC04, backend-direct on Cerebras:** all pass, no regressions from the #26/#27/#29 fixes documented in Huey Ling's retest section — correct module routing, no fabricated citations, no zero-citation defect, no factual errors.
- **Settings drawer:** `LLM BACKEND` toggle correctly limited to student-facing backends (Ollama/Groq/Cerebras/Gemini/OpenRouter); no `EVAL_BACKEND` control present, matching the PR's deliberate design (eval backend is not meant to be student-toggleable).
- **PR #40's own test plan verified independently:** `pytest tests/` → 35/35 pass (better than the PR's noted "4 pre-existing collection failures," which are resolved on current `main`); `ruff check` on the 4 changed files → clean; new regression test `test_score_grades_with_pinned_eval_backend_not_session_backend` correctly asserts `complete()` receives `backend="ollama"` and `temperature=0` regardless of the session's `backend` setting.
- **Cross-provider decoupling, live:** ran TC05 with student backend on Groq and again on Cerebras, `EVAL_BACKEND` pinned to Cerebras both times — evaluate scores varied with retrieval/answer content (expected, matches Huey Ling's documented retrieve1 diffuseness), not in lockstep with whichever student backend was toggled, confirming the decoupling holds outside the unit-test mock.
- **Error UX (positive):** when Groq's rate limit was hit on a first-pass compose call, the UI surfaced a clear, actionable message ("Rate limit hit — try again in a moment, or switch to a different LLM backend") rather than a raw stack trace.

## Not covered

- Difficulty-switch hang (General Observation #3, Huey Ling's doc) — not re-verified this session, unrelated to #40.
- Gemini/OpenRouter backends — not exercised (no key/time budget in this session); #40's fix is provider-agnostic by construction (intercepts before provider dispatch), so this is low-risk, not zero-risk.
- Full local-Ollama-only retest — explicitly out of scope per this session's instruction (free-cloud only); `EVAL_BACKEND` still defaults to Ollama in the shipped PR, so a first real Ollama-only run by the testing team will be the first live check of that specific path.
- Conversation-history browsing, difficulty-switch, and other items from Huey Ling's "General Observations" list — out of scope, unrelated to #40.

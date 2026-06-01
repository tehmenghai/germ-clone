"""
GET /ask?q=…&profile_id=…&difficulty=…

Phase 1: keyword-matches the query to one of 4 demo topics and replays a fixed
StageEvent sequence via the SSE emitter. Profile and difficulty are accepted but
not yet used — they will drive Phase 2 (real LangGraph pipeline).

The demo event data mirrors mock-stream.ts exactly so the frontend sees identical
payloads whether it targets this server or the local TypeScript mock.
"""
from collections.abc import AsyncGenerator
from typing import Literal

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from schemas.events import Citation, EvalScores, Source, StageEvent
from streaming.emitter import event_stream

router = APIRouter(tags=["ask"])

Difficulty = Literal["eli5", "standard", "academia"]

DEMO_EVENTS: dict[str, list[StageEvent]] = {
    "bias-variance": [
        StageEvent(stage="route",     status="done", detail="→ bias-variance (module 3.1)"),
        StageEvent(stage="rewrite",   status="done", detail="query clarified"),
        StageEvent(stage="retrieve1", status="done", detail="8 chunks — lesson 3.1, 3.2"),
        StageEvent(stage="react",     status="done", detail="identified 3 key concepts"),
        StageEvent(stage="reflect",   status="done", detail="coverage adequate"),
        StageEvent(
            stage="evaluate1", status="done",
            scores=EvalScores(f=0.91, r=0.88, c=0.85),
            verdict="PASS",
        ),
        StageEvent(
            stage="compose", status="done",
            answer_md=(
                "## Bias–Variance Trade-off\n\n"
                "The **bias** of a model is the error introduced by approximating a "
                "real-world problem with a simplified model [1]. A high-bias model makes "
                "strong assumptions and tends to **underfit** the data.\n\n"
                "The **variance** measures how much the model's predictions change when "
                "trained on different subsets of data [2]. High-variance models are "
                "sensitive to noise and tend to **overfit**.\n\n"
                "### The Trade-off\n\n"
                "Reducing bias typically increases variance, and vice versa [3]. The goal "
                "is to find the **sweet spot** that minimises total error on unseen data."
            ),
            citations=[
                Citation(id=1, mod="3.1", file="lesson-3.1.md",
                         snip="High bias leads to underfitting — the model fails to capture the underlying pattern.",
                         score=0.91),
                Citation(id=2, mod="3.1", file="lesson-3.1.md",
                         snip="Variance measures sensitivity to fluctuations in the training set.",
                         score=0.87),
                Citation(id=3, mod="3.2", file="lesson-3.2.md",
                         snip="The bias–variance decomposition shows total error = bias² + variance + irreducible noise.",
                         score=0.84),
            ],
            sources=[Source(id=1, score=0.91), Source(id=2, score=0.87), Source(id=3, score=0.84)],
        ),
    ],
    "regularization": [
        StageEvent(stage="route",     status="done", detail="→ regularization (module 3.4)"),
        StageEvent(stage="rewrite",   status="done", detail="query clarified"),
        StageEvent(stage="retrieve1", status="done", detail="6 chunks — lesson 3.4"),
        StageEvent(stage="react",     status="done", detail="L1 vs L2 identified"),
        StageEvent(stage="reflect",   status="done", detail="need more on elastic net"),
        StageEvent(
            stage="evaluate1", status="done",
            scores=EvalScores(f=0.71, r=0.88, c=0.60),
            verdict="BELOW 0.80, reloop",
        ),
        StageEvent(stage="retrieve2", status="done", detail="4 additional chunks — lesson 3.4, 3.5"),
        StageEvent(
            stage="evaluate2", status="done",
            scores=EvalScores(f=0.89, r=0.91, c=0.84),
            verdict="PASS",
        ),
        StageEvent(
            stage="compose", status="done",
            answer_md=(
                "## Regularization\n\n"
                "Regularization adds a **penalty term** to the loss function to discourage "
                "overly complex models [1].\n\n"
                "### L1 (Lasso)\n\nL1 regularization adds a penalty proportional to `|w|` [2]. "
                "It drives some weights exactly to zero, producing **sparse** models useful for "
                "feature selection.\n\n"
                "### L2 (Ridge)\n\nL2 adds a penalty proportional to `w²` [2]. Weights shrink "
                "towards zero but rarely reach it — all features are retained.\n\n"
                "### ElasticNet\n\nElasticNet combines both penalties [3], offering a balance "
                "between sparsity and coefficient stability."
            ),
            citations=[
                Citation(id=1, mod="3.4", file="lesson-3.4.md",
                         snip="Adding a regularization term λΩ(w) to the loss penalises model complexity.",
                         score=0.89),
                Citation(id=2, mod="3.4", file="lesson-3.4.md",
                         snip="L1 (Lasso) adds |w|, L2 (Ridge) adds w². They produce different shrinkage behaviour.",
                         score=0.86),
                Citation(id=3, mod="3.5", file="lesson-3.5.md",
                         snip="ElasticNet = α·L1 + (1−α)·L2; the mixing parameter α controls sparsity.",
                         score=0.81),
            ],
            sources=[Source(id=1, score=0.89), Source(id=2, score=0.86), Source(id=3, score=0.81)],
        ),
    ],
    "knn": [
        StageEvent(stage="route",     status="done", detail="→ k-nearest neighbours (module 3.6)"),
        StageEvent(stage="rewrite",   status="done", detail="query clarified"),
        StageEvent(stage="retrieve1", status="done", detail="7 chunks — lesson 3.6"),
        StageEvent(stage="react",     status="done", detail="distance metrics identified"),
        StageEvent(stage="reflect",   status="done", detail="coverage adequate"),
        StageEvent(
            stage="evaluate1", status="done",
            scores=EvalScores(f=0.93, r=0.90, c=0.88),
            verdict="PASS",
        ),
        StageEvent(
            stage="compose", status="done",
            answer_md=(
                "## k-Nearest Neighbours\n\n"
                "KNN classifies a new point by **majority vote** among its k nearest neighbours "
                "in the training set [1]. It is a non-parametric, lazy learner — no model is "
                "fitted at training time.\n\n"
                "### Distance Metrics\n\nThe choice of distance metric matters [2]. Euclidean "
                "distance is most common, but Manhattan or Minkowski distance may suit "
                "high-dimensional data.\n\n"
                "### Choosing k\n\nSmall k captures local structure but is noisy; large k "
                "smooths boundaries but may underfit [3]. Use cross-validation to select k."
            ),
            citations=[
                Citation(id=1, mod="3.6", file="lesson-3.6.md",
                         snip="KNN assigns the label of the majority class among the k closest training points.",
                         score=0.93),
                Citation(id=2, mod="3.6", file="lesson-3.6.md",
                         snip="Distance metric choice affects which neighbours are selected and therefore the decision boundary.",
                         score=0.88),
                Citation(id=3, mod="3.6", file="lesson-3.6.md",
                         snip="k=1 memorises training data; k=N collapses to the majority class. Cross-validation picks the sweet spot.",
                         score=0.85),
            ],
            sources=[Source(id=1, score=0.93), Source(id=2, score=0.88), Source(id=3, score=0.85)],
        ),
    ],
    "gradient-descent": [
        StageEvent(stage="route",     status="done", detail="→ gradient descent (module 3.8)"),
        StageEvent(stage="rewrite",   status="done", detail="query clarified"),
        StageEvent(stage="retrieve1", status="done", detail="9 chunks — lesson 3.8, 3.9"),
        StageEvent(stage="react",     status="done", detail="SGD, momentum, Adam identified"),
        StageEvent(stage="reflect",   status="done", detail="coverage adequate"),
        StageEvent(
            stage="evaluate1", status="done",
            scores=EvalScores(f=0.87, r=0.92, c=0.83),
            verdict="PASS",
        ),
        StageEvent(
            stage="compose", status="done",
            answer_md=(
                "## Gradient Descent\n\n"
                "Gradient descent minimises a loss function `J(w)` by iteratively updating "
                "weights in the direction of the **negative gradient** [1].\n\n"
                "### Learning Rate\n\nThe learning rate `α` controls step size [2]. Too large: "
                "diverges. Too small: slow convergence.\n\n"
                "### Variants\n\n**SGD** uses a single sample per step — noisy but fast [3]. "
                "**Momentum** accumulates a velocity vector to accelerate in consistent "
                "directions. **Adam** combines adaptive learning rates with momentum, typically "
                "converging fastest [3]."
            ),
            citations=[
                Citation(id=1, mod="3.8", file="lesson-3.8.md",
                         snip="w ← w − α∇J(w). The gradient points uphill; we step downhill.",
                         score=0.87),
                Citation(id=2, mod="3.8", file="lesson-3.8.md",
                         snip="The learning rate controls step size. Too large → overshoot; too small → slow convergence.",
                         score=0.84),
                Citation(id=3, mod="3.9", file="lesson-3.9.md",
                         snip="SGD, Momentum, RMSProp, and Adam are all variants; Adam is the practical default for deep learning.",
                         score=0.82),
            ],
            sources=[Source(id=1, score=0.87), Source(id=2, score=0.84), Source(id=3, score=0.82)],
        ),
    ],
}


def _pick_topic(q: str) -> str:
    q = q.lower()
    if any(k in q for k in ("bias", "variance", "overfit")):
        return "bias-variance"
    if any(k in q for k in ("regular", "lasso", "ridge", "elastic")):
        return "regularization"
    if any(k in q for k in ("knn", "nearest", "neighbour", "neighbor")):
        return "knn"
    if any(k in q for k in ("gradient", "descent", "sgd", "adam", "momentum")):
        return "gradient-descent"
    return "bias-variance"


@router.get("/ask")
async def ask(
    q: str,
    profile_id: str,
    difficulty: Difficulty = "standard",
) -> StreamingResponse:
    topic = _pick_topic(q)
    events = DEMO_EVENTS[topic]

    async def _stream() -> AsyncGenerator[str, None]:
        async for chunk in event_stream(events):
            yield chunk

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

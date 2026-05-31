/**
 * Mock SSE stream for frontend development.
 * Built from schemas/events.py — flip to a real EventSource when the engine lands.
 *
 * Usage:
 *   for await (const event of mockStream("bias-variance")) { ... }
 */

export type StageKey =
  | "route" | "rewrite" | "retrieve1" | "react" | "reflect"
  | "evaluate1" | "retrieve2" | "evaluate2" | "compose";

export type StageStatus = "pending" | "active" | "done" | "error";

export interface EvalScores { f: number; r: number; c: number; }

export interface Citation {
  id: number; mod: string; file: string; ts?: string; snip: string; score: number;
}

export interface StageEvent {
  stage: StageKey;
  status: StageStatus;
  detail?: string;
  scores?: EvalScores;
  verdict?: string;
  answer_md?: string;
  citations?: Citation[];
  sources?: Array<{ id: number; score: number }>;
}

const DEMO_TOPICS: Record<string, StageEvent[]> = {
  "bias-variance": [
    { stage: "route",     status: "done",   detail: "→ bias-variance (module 3.1)" },
    { stage: "rewrite",   status: "done",   detail: "query clarified" },
    { stage: "retrieve1", status: "done",   detail: "8 chunks — lesson 3.1, 3.2" },
    { stage: "react",     status: "done",   detail: "identified 3 key concepts" },
    { stage: "reflect",   status: "done",   detail: "coverage adequate" },
    { stage: "evaluate1", status: "done",   scores: { f: 0.91, r: 0.88, c: 0.85 }, verdict: "PASS" },
    { stage: "compose",   status: "done",
      answer_md: "## Bias–Variance Trade-off\n\nThe **bias** of a model is the error introduced by approximating a real-world problem with a simplified model [1]. A high-bias model makes strong assumptions and tends to **underfit** the data.\n\nThe **variance** measures how much the model's predictions change when trained on different subsets of data [2]. High-variance models are sensitive to noise and tend to **overfit**.\n\n### The Trade-off\n\nReducing bias typically increases variance, and vice versa [3]. The goal is to find the **sweet spot** that minimises total error on unseen data.",
      citations: [
        { id: 1, mod: "3.1", file: "lesson-3.1.md", snip: "High bias leads to underfitting — the model fails to capture the underlying pattern.", score: 0.91 },
        { id: 2, mod: "3.1", file: "lesson-3.1.md", snip: "Variance measures sensitivity to fluctuations in the training set.", score: 0.87 },
        { id: 3, mod: "3.2", file: "lesson-3.2.md", snip: "The bias–variance decomposition shows total error = bias² + variance + irreducible noise.", score: 0.84 },
      ],
      sources: [{ id: 1, score: 0.91 }, { id: 2, score: 0.87 }, { id: 3, score: 0.84 }],
    },
  ],
  "regularization": [
    { stage: "route",     status: "done",   detail: "→ regularization (module 3.4)" },
    { stage: "rewrite",   status: "done",   detail: "query clarified" },
    { stage: "retrieve1", status: "done",   detail: "6 chunks — lesson 3.4" },
    { stage: "react",     status: "done",   detail: "L1 vs L2 identified" },
    { stage: "reflect",   status: "done",   detail: "need more on elastic net" },
    { stage: "evaluate1", status: "done",   scores: { f: 0.71, r: 0.88, c: 0.60 }, verdict: "BELOW 0.80, reloop" },
    { stage: "retrieve2", status: "done",   detail: "4 additional chunks — lesson 3.4, 3.5" },
    { stage: "evaluate2", status: "done",   scores: { f: 0.89, r: 0.91, c: 0.84 }, verdict: "PASS" },
    { stage: "compose",   status: "done",
      answer_md: "## Regularization\n\nRegularization adds a **penalty term** to the loss function to discourage overly complex models [1].\n\n### L1 (Lasso)\n\nL1 regularization adds a penalty proportional to `|w|` [2]. It drives some weights exactly to zero, producing **sparse** models useful for feature selection.\n\n### L2 (Ridge)\n\nL2 adds a penalty proportional to `w²` [2]. Weights shrink towards zero but rarely reach it — all features are retained.\n\n### ElasticNet\n\nElasticNet combines both penalties [3], offering a balance between sparsity and coefficient stability.",
      citations: [
        { id: 1, mod: "3.4", file: "lesson-3.4.md", snip: "Adding a regularization term λΩ(w) to the loss penalises model complexity.", score: 0.89 },
        { id: 2, mod: "3.4", file: "lesson-3.4.md", snip: "L1 (Lasso) adds |w|, L2 (Ridge) adds w². They produce different shrinkage behaviour.", score: 0.86 },
        { id: 3, mod: "3.5", file: "lesson-3.5.md", snip: "ElasticNet = α·L1 + (1−α)·L2; the mixing parameter α controls sparsity.", score: 0.81 },
      ],
      sources: [{ id: 1, score: 0.89 }, { id: 2, score: 0.86 }, { id: 3, score: 0.81 }],
    },
  ],
  "knn": [
    { stage: "route",     status: "done",   detail: "→ k-nearest neighbours (module 3.6)" },
    { stage: "rewrite",   status: "done",   detail: "query clarified" },
    { stage: "retrieve1", status: "done",   detail: "7 chunks — lesson 3.6" },
    { stage: "react",     status: "done",   detail: "distance metrics identified" },
    { stage: "reflect",   status: "done",   detail: "coverage adequate" },
    { stage: "evaluate1", status: "done",   scores: { f: 0.93, r: 0.90, c: 0.88 }, verdict: "PASS" },
    { stage: "compose",   status: "done",
      answer_md: "## k-Nearest Neighbours\n\nKNN classifies a new point by **majority vote** among its k nearest neighbours in the training set [1]. It is a non-parametric, lazy learner — no model is fitted at training time.\n\n### Distance Metrics\n\nThe choice of distance metric matters [2]. Euclidean distance is most common, but Manhattan or Minkowski distance may suit high-dimensional data.\n\n### Choosing k\n\nSmall k captures local structure but is noisy; large k smooths boundaries but may underfit [3]. Use cross-validation to select k.",
      citations: [
        { id: 1, mod: "3.6", file: "lesson-3.6.md", snip: "KNN assigns the label of the majority class among the k closest training points.", score: 0.93 },
        { id: 2, mod: "3.6", file: "lesson-3.6.md", snip: "Distance metric choice affects which neighbours are selected and therefore the decision boundary.", score: 0.88 },
        { id: 3, mod: "3.6", file: "lesson-3.6.md", snip: "k=1 memorises training data; k=N collapses to the majority class. Cross-validation picks the sweet spot.", score: 0.85 },
      ],
      sources: [{ id: 1, score: 0.93 }, { id: 2, score: 0.88 }, { id: 3, score: 0.85 }],
    },
  ],
  "gradient-descent": [
    { stage: "route",     status: "done",   detail: "→ gradient descent (module 3.8)" },
    { stage: "rewrite",   status: "done",   detail: "query clarified" },
    { stage: "retrieve1", status: "done",   detail: "9 chunks — lesson 3.8, 3.9" },
    { stage: "react",     status: "done",   detail: "SGD, momentum, Adam identified" },
    { stage: "reflect",   status: "done",   detail: "coverage adequate" },
    { stage: "evaluate1", status: "done",   scores: { f: 0.87, r: 0.92, c: 0.83 }, verdict: "PASS" },
    { stage: "compose",   status: "done",
      answer_md: "## Gradient Descent\n\nGradient descent minimises a loss function `J(w)` by iteratively updating weights in the direction of the **negative gradient** [1].\n\n### Learning Rate\n\nThe learning rate `α` controls step size [2]. Too large: diverges. Too small: slow convergence.\n\n### Variants\n\n**SGD** uses a single sample per step — noisy but fast [3]. **Momentum** accumulates a velocity vector to accelerate in consistent directions. **Adam** combines adaptive learning rates with momentum, typically converging fastest [3].",
      citations: [
        { id: 1, mod: "3.8", file: "lesson-3.8.md", snip: "w ← w − α∇J(w). The gradient points uphill; we step downhill.", score: 0.87 },
        { id: 2, mod: "3.8", file: "lesson-3.8.md", snip: "The learning rate controls step size. Too large → overshoot; too small → slow convergence.", score: 0.84 },
        { id: 3, mod: "3.9", file: "lesson-3.9.md", snip: "SGD, Momentum, RMSProp, and Adam are all variants; Adam is the practical default for deep learning.", score: 0.82 },
      ],
      sources: [{ id: 1, score: 0.87 }, { id: 2, score: 0.84 }, { id: 3, score: 0.82 }],
    },
  ],
};

const STAGE_DELAY_MS: Partial<Record<StageKey, number>> = {
  route: 300, rewrite: 400, retrieve1: 800, react: 600,
  reflect: 500, evaluate1: 700, retrieve2: 900, evaluate2: 700, compose: 1200,
};

function delay(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

function pickTopic(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("bias") || q.includes("variance")) return "bias-variance";
  if (q.includes("regular") || q.includes("lasso") || q.includes("ridge")) return "regularization";
  if (q.includes("knn") || q.includes("nearest")) return "knn";
  if (q.includes("gradient") || q.includes("descent") || q.includes("sgd")) return "gradient-descent";
  return "bias-variance"; // default
}

export async function* mockStream(query: string): AsyncGenerator<StageEvent> {
  const topic = pickTopic(query);
  const events = DEMO_TOPICS[topic] ?? DEMO_TOPICS["bias-variance"];
  for (const event of events) {
    await delay(STAGE_DELAY_MS[event.stage] ?? 400);
    yield event;
  }
}

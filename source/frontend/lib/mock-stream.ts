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
      answer_md: "## Bias–Variance Trade-off\n\nThe **bias** of a model is the error from incorrect assumptions...",
      citations: [{ id: 1, mod: "3.1", file: "lesson-3.1.md", snip: "High bias leads to underfitting...", score: 0.91 }],
      sources: [{ id: 1, score: 0.91 }]
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
      answer_md: "## Regularization\n\nRegularization adds a penalty term to the loss function...",
      citations: [{ id: 1, mod: "3.4", file: "lesson-3.4.md", snip: "L1 (Lasso) adds |w|...", score: 0.89 }],
      sources: [{ id: 1, score: 0.89 }]
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
      answer_md: "## k-Nearest Neighbours\n\nKNN classifies a point by majority vote...",
      citations: [{ id: 1, mod: "3.6", file: "lesson-3.6.md", snip: "Distance metric choice affects...", score: 0.93 }],
      sources: [{ id: 1, score: 0.93 }]
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
      answer_md: "## Gradient Descent\n\nGradient descent minimises a loss function by iteratively moving in the direction of steepest descent...",
      citations: [{ id: 1, mod: "3.8", file: "lesson-3.8.md", snip: "The learning rate controls step size...", score: 0.87 }],
      sources: [{ id: 1, score: 0.87 }]
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

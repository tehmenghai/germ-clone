"use client";

import { BiasVarianceViz } from "./BiasVarianceViz";
import { RegularizationViz } from "./RegularizationViz";
import { KNNViz } from "./KNNViz";
import { GradDescViz } from "./GradDescViz";

function detectViz(query: string) {
  const q = query.toLowerCase();
  if (q.includes("bias") || q.includes("variance") || q.includes("overfit") || q.includes("underfit")) return "bias-variance";
  if (q.includes("regular") || q.includes("lasso") || q.includes("ridge") || q.includes("elastic")) return "regularization";
  if (q.includes("knn") || q.includes("nearest") || q.includes("neighbour")) return "knn";
  if (q.includes("gradient") || q.includes("descent") || q.includes("sgd") || q.includes("adam")) return "gradient-descent";
  return null;
}

export function VizPanel({ query }: { query: string }) {
  const vizId = detectViz(query);
  if (!vizId) return null;
  if (vizId === "bias-variance") return <BiasVarianceViz />;
  if (vizId === "regularization") return <RegularizationViz />;
  if (vizId === "knn") return <KNNViz />;
  if (vizId === "gradient-descent") return <GradDescViz />;
  return null;
}

"use client";

import { BiasVarianceViz } from "./BiasVarianceViz";
import { RegularizationViz } from "./RegularizationViz";
import { KNNViz } from "./KNNViz";
import { GradDescViz } from "./GradDescViz";

type VizId = "bias-variance" | "regularization" | "knn" | "gradient-descent";

const VIZ_TITLES: Record<VizId, string> = {
  "bias-variance": "Bias–Variance Trade-off",
  "regularization": "Regularisation Paths",
  "knn": "k-Nearest Neighbours",
  "gradient-descent": "Gradient Descent",
};

function detectViz(query: string): VizId | null {
  const q = query.toLowerCase();
  if (q.includes("bias") || q.includes("variance") || q.includes("overfit") || q.includes("underfit")) return "bias-variance";
  if (q.includes("regular") || q.includes("lasso") || q.includes("ridge") || q.includes("elastic")) return "regularization";
  if (q.includes("knn") || q.includes("nearest") || q.includes("neighbour")) return "knn";
  if (q.includes("gradient") || q.includes("descent") || q.includes("sgd") || q.includes("adam")) return "gradient-descent";
  return null;
}

interface Props {
  query: string;
}

export function VizPanel({ query }: Props) {
  const vizId = detectViz(query);
  if (!vizId) return null;

  return (
    <div
      style={{
        borderTop: "1px solid var(--line)",
        padding: "16px 20px",
        background: "var(--bg-2)",
      }}
    >
      <p
        style={{
          fontSize: "var(--font-label)",
          color: "var(--txt-faint)",
          letterSpacing: "0.08em",
          marginBottom: 12,
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        VISUALISATION · {VIZ_TITLES[vizId]}
      </p>

      {vizId === "bias-variance" && <BiasVarianceViz />}
      {vizId === "regularization" && <RegularizationViz />}
      {vizId === "knn" && <KNNViz />}
      {vizId === "gradient-descent" && <GradDescViz />}
    </div>
  );
}

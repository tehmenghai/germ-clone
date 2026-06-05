"use client";

import { BiasVarianceViz } from "./BiasVarianceViz";
import { RegularizationViz } from "./RegularizationViz";
import { KNNViz } from "./KNNViz";
import { GradDescViz } from "./GradDescViz";
import { ConfusionMatrixViz } from "./ConfusionMatrixViz";
import { detectTopic } from "@/lib/topics";

export function VizPanel({ query }: { query: string }) {
  const vizId = detectTopic(query);
  if (!vizId) return null;
  if (vizId === "bias-variance") return <BiasVarianceViz />;
  if (vizId === "regularization") return <RegularizationViz />;
  if (vizId === "knn") return <KNNViz />;
  if (vizId === "gradient-descent") return <GradDescViz />;
  if (vizId === "confusion-matrix") return <ConfusionMatrixViz />;
  return null;
}

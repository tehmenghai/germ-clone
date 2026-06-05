"use client";

import { BiasVarianceViz } from "./BiasVarianceViz";
import { RegularizationViz } from "./RegularizationViz";
import { KNNViz } from "./KNNViz";
import { GradDescViz } from "./GradDescViz";
import { ConfusionMatrixViz } from "./ConfusionMatrixViz";
import { DistributionViz } from "./DistributionViz";
import { KMeansViz } from "./KMeansViz";
import { TimeSeriesViz } from "./TimeSeriesViz";
import { ConvolutionViz } from "./ConvolutionViz";
import { EmbeddingViz } from "./EmbeddingViz";
import { detectTopic } from "@/lib/topics";

export function VizPanel({ query }: { query: string }) {
  const vizId = detectTopic(query);
  if (!vizId) return null;
  if (vizId === "bias-variance") return <BiasVarianceViz />;
  if (vizId === "regularization") return <RegularizationViz />;
  if (vizId === "knn") return <KNNViz />;
  if (vizId === "gradient-descent") return <GradDescViz />;
  if (vizId === "confusion-matrix") return <ConfusionMatrixViz />;
  if (vizId === "distributions") return <DistributionViz />;
  if (vizId === "kmeans") return <KMeansViz />;
  if (vizId === "time-series") return <TimeSeriesViz />;
  if (vizId === "convolution") return <ConvolutionViz />;
  if (vizId === "embeddings") return <EmbeddingViz />;
  return null;
}

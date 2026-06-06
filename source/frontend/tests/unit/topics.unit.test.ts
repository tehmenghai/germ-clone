import { describe, it, expect } from "vitest";
import { detectTopic, detectActiveModules } from "@/lib/topics";

describe("topic detection (shared)", () => {
  it("routes the four original topics", () => {
    expect(detectTopic("why does my decision tree overfit?")).toBe("bias-variance");
    expect(detectTopic("L1 vs L2 regularization")).toBe("regularization");
    expect(detectTopic("how do I choose k in KNN?")).toBe("knn");
    expect(detectTopic("what does the learning rate do in gradient descent?")).toBe("gradient-descent");
  });

  it("routes the new confusion-matrix topic", () => {
    expect(detectTopic("how do I read a confusion matrix?")).toBe("confusion-matrix");
    expect(detectTopic("explain precision and recall")).toBe("confusion-matrix");
    expect(detectTopic("what is the F1 score?")).toBe("confusion-matrix");
  });

  it("no longer drifts on synonyms that previously matched viz but not math", () => {
    // Pre-unification: detectViz matched these, MLWorkspace.detectTopic did not.
    expect(detectTopic("what causes underfitting?")).toBe("bias-variance");
    expect(detectTopic("when do I use elastic net?")).toBe("regularization");
    expect(detectTopic("nearest neighbour classifier")).toBe("knn");
    expect(detectTopic("how does adam differ from sgd?")).toBe("gradient-descent");
  });

  it("routes the five expansion topics (modules 3.1, 3.5, 3.6, 3.8, 3.9/3.10)", () => {
    expect(detectTopic("what is a normal distribution?")).toBe("distributions");
    expect(detectTopic("how does k-means clustering work?")).toBe("kmeans");
    expect(detectTopic("forecast a time series with seasonality")).toBe("time-series");
    expect(detectTopic("explain a convolution kernel in a CNN")).toBe("convolution");
    expect(detectTopic("cosine similarity between word embeddings")).toBe("embeddings");
  });

  it("returns null for unmatched queries", () => {
    expect(detectTopic("tell me a joke")).toBeNull();
    expect(detectTopic("")).toBeNull();
  });

  it("module mapping agrees with topic detection", () => {
    expect(detectActiveModules("confusion matrix")).toEqual(["3.3"]);
    expect(detectActiveModules("bias variance")).toEqual(["3.3", "3.4"]);
    expect(detectActiveModules("normal distribution")).toEqual(["3.1"]);
    expect(detectActiveModules("k-means")).toEqual(["3.5"]);
    expect(detectActiveModules("word embeddings")).toEqual(["3.9", "3.10"]);
    expect(detectActiveModules("unrelated")).toEqual([]);
  });

  it("covers all ten course modules 3.1–3.10", () => {
    const covered = new Set<string>();
    const probes = [
      "bias variance", "regularization", "knn", "gradient descent", "confusion matrix",
      "normal distribution", "k-means", "time series", "convolution", "word embeddings",
    ];
    for (const p of probes) detectActiveModules(p).forEach((m) => covered.add(m));
    for (let i = 1; i <= 10; i++) expect(covered.has(`3.${i}`)).toBe(true);
  });
});

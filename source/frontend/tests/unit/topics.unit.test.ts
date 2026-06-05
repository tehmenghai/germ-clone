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

  it("returns null for unmatched queries", () => {
    expect(detectTopic("what is a transformer?")).toBeNull();
    expect(detectTopic("")).toBeNull();
  });

  it("module mapping agrees with topic detection", () => {
    expect(detectActiveModules("confusion matrix")).toEqual(["3.3"]);
    expect(detectActiveModules("bias variance")).toEqual(["3.3", "3.4"]);
    expect(detectActiveModules("unrelated")).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";
import { mockStream } from "@/lib/mock-stream";

// mockStream awaits real setTimeout delays between stages (up to ~1.2s each,
// ~5.4s total for a topic that reloops) — bump the timeout rather than fake
// timers, since fake timers don't play well with async generators here.

async function firstEvent(query: string) {
  const gen = mockStream(query);
  const { value } = await gen.next();
  return value;
}

describe("mockStream topic routing", () => {
  it("routes bias/variance queries", async () => {
    expect((await firstEvent("why does my model have high variance?"))?.detail).toContain("bias-variance");
  });

  it("routes regularization queries (lasso/ridge synonyms)", async () => {
    expect((await firstEvent("when should I use lasso?"))?.detail).toContain("regularization");
    expect((await firstEvent("explain ridge regression"))?.detail).toContain("regularization");
  });

  it("routes knn queries (nearest synonym)", async () => {
    expect((await firstEvent("how do nearest neighbours work?"))?.detail).toContain("k-nearest");
  });

  it("routes gradient-descent queries (sgd synonym)", async () => {
    expect((await firstEvent("what is sgd?"))?.detail).toContain("gradient descent");
  });

  it("falls back to bias-variance for an unmatched query", async () => {
    expect((await firstEvent("what's the weather today?"))?.detail).toContain("bias-variance");
  });

  it("yields the full stage sequence for a topic that reloops", async () => {
    const events = [];
    for await (const event of mockStream("l1 vs l2 regularization")) {
      events.push(event.stage);
    }
    expect(events).toEqual([
      "route", "rewrite", "retrieve1", "react", "reflect",
      "evaluate1", "retrieve2", "evaluate2", "compose",
    ]);
  }, 10000);
});

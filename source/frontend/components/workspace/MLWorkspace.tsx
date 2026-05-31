"use client";

import { useState } from "react";
import { VizPanel } from "@/components/viz/VizPanel";

// Math equations per topic — mirrors content.jsx TOPICS[].math
const TOPIC_MATH: Record<string, Array<{ eq: string; note: string }>> = {
  "bias-variance": [
    { eq: "Error = Bias² + Variance + ε", note: "Total generalisation error decomposition" },
    { eq: "Bias = E[ŷ] − y", note: "Systematic offset of predictions from truth" },
    { eq: "Variance = E[(ŷ − E[ŷ])²]", note: "Sensitivity to training-set fluctuations" },
  ],
  "regularization": [
    { eq: "L(w) = MSE(w) + λΩ(w)", note: "Regularised objective adds penalty term Ω" },
    { eq: "Ω_L1 = Σ|wᵢ|", note: "Lasso (L1): produces sparse weights — some go to exactly 0" },
    { eq: "Ω_L2 = Σwᵢ²", note: "Ridge (L2): shrinks all weights; none reach 0" },
  ],
  "knn": [
    { eq: "ŷ = mode({yᵢ : xᵢ ∈ Nₖ(x)})", note: "Predicted class = majority vote of k nearest neighbours" },
    { eq: "d(x, xᵢ) = √Σ(xⱼ − xᵢⱼ)²", note: "Euclidean distance (most common metric)" },
  ],
  "gradient-descent": [
    { eq: "w ← w − α∇J(w)", note: "Single gradient step; α is the learning rate" },
    { eq: "J(w) = (1/n)Σℒ(yᵢ, f(xᵢ;w))", note: "Average loss over training set" },
    { eq: "∇J(w) = (2/n)Xᵀ(Xw − y)", note: "Gradient of MSE loss (linear regression)" },
  ],
};

function detectTopic(query: string): string | null {
  const q = query.toLowerCase();
  if (q.includes("bias") || q.includes("variance") || q.includes("overfit")) return "bias-variance";
  if (q.includes("regular") || q.includes("lasso") || q.includes("ridge")) return "regularization";
  if (q.includes("knn") || q.includes("nearest")) return "knn";
  if (q.includes("gradient") || q.includes("descent") || q.includes("sgd")) return "gradient-descent";
  return null;
}

interface MLWorkspaceProps {
  query: string;
  compact?: boolean;
}

export function MLWorkspace({ query, compact }: MLWorkspaceProps) {
  const [wsTab, setWsTab] = useState<"visualize" | "math">("visualize");
  const topicId = query ? detectTopic(query) : null;
  const math = topicId ? TOPIC_MATH[topicId] : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderLeft: "1px solid var(--line-soft)",
        background: "color-mix(in oklab, var(--panel) 35%, transparent)",
        overflow: "hidden",
      }}
    >
      {/* Workspace header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 18px",
          height: 42,
          borderBottom: "1px solid var(--line-soft)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: "var(--txt-faint)",
          }}
        >
          ⊞ ML WORKSPACE
        </span>
        {query && topicId && (
          <span
            style={{
              fontSize: 12.5,
              color: "var(--txt-dim)",
              fontFamily: "'Newsreader', Georgia, serif",
              fontStyle: "italic",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {query}
          </span>
        )}
        {topicId && (
          <div style={{ display: "flex", gap: 1, flexShrink: 0 }}>
            {(["visualize", "math"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setWsTab(tab)}
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid",
                  borderColor: wsTab === tab ? "var(--green-deep)" : "transparent",
                  background: wsTab === tab ? "var(--panel-2)" : "transparent",
                  color: wsTab === tab ? "var(--green)" : "var(--txt-faint)",
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {tab === "visualize" ? "Visualize" : "Math"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {!topicId ? (
          <EmptyState />
        ) : wsTab === "visualize" ? (
          <div style={{ padding: "18px 20px" }}>
            <div
              style={{
                border: "1px solid var(--line-soft)",
                borderRadius: "var(--r-lg)",
                overflow: "hidden",
                background: "var(--bg-2)",
              }}
            >
              <div
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--line-soft)",
                  fontSize: 11,
                  color: "var(--txt-faint)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {topicId.replace(/-/g, " ")}
                </span>
                <span style={{ fontStyle: "italic" }}>drag the control — it&apos;s live</span>
              </div>
              <div>
                <VizPanel query={query} />
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {math?.map(({ eq, note }, i) => (
              <div key={i}>
                <div
                  style={{
                    fontFamily: "'Newsreader', Georgia, serif",
                    fontSize: "var(--font-eq)",
                    fontStyle: "italic",
                    textAlign: "center",
                    border: "1px solid var(--line-soft)",
                    borderRadius: 10,
                    background: "var(--bg-2)",
                    padding: "14px 18px",
                    color: "var(--txt)",
                    lineHeight: 1.4,
                  }}
                >
                  {eq}
                </div>
                <p
                  style={{
                    fontSize: 12.5,
                    color: "var(--txt-dim)",
                    marginTop: 6,
                    paddingLeft: 4,
                    lineHeight: 1.5,
                  }}
                >
                  {note}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        gap: 14,
        border: "1px dashed var(--line)",
        borderRadius: "var(--r-lg)",
        margin: 20,
        textAlign: "center",
      }}
    >
      <span
        style={{
          fontFamily: "'Newsreader', Georgia, serif",
          fontSize: 54,
          color: "var(--green-deep)",
          opacity: 0.5,
          lineHeight: 1,
        }}
      >
        ∂
      </span>
      <p style={{ fontSize: 13.5, color: "var(--txt-dim)", fontWeight: 500 }}>
        The <strong style={{ color: "var(--txt)" }}>ML workspace</strong> lands here.
      </p>
      <p style={{ fontSize: 12, color: "var(--txt-faint)", maxWidth: "22ch", lineHeight: 1.5 }}>
        Every answer comes with an interactive plot and the math — ask a question to light it up.
      </p>
    </div>
  );
}

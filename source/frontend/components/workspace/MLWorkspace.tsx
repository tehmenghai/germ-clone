"use client";

import { useState } from "react";
import { BlockMath } from "react-katex";
import { VizPanel } from "@/components/viz/VizPanel";
import { detectTopic } from "@/lib/topics";

const TOPIC_MATH: Record<string, Array<{ eq: string; note: string }>> = {
  "bias-variance": [
    {
      eq: "\\text{Error} = \\text{Bias}^2 + \\text{Variance} + \\varepsilon",
      note: "Total generalisation error decomposition",
    },
    {
      eq: "\\text{Bias} = \\mathbb{E}[\\hat{y}] - y",
      note: "Systematic offset of predictions from truth",
    },
    {
      eq: "\\text{Variance} = \\mathbb{E}\\!\\left[(\\hat{y} - \\mathbb{E}[\\hat{y}])^2\\right]",
      note: "Sensitivity to training-set fluctuations",
    },
  ],
  "regularization": [
    {
      eq: "\\mathcal{L}(w) = \\frac{1}{n}\\sum_{i=1}^{n}(y_i - \\hat{y}_i)^2 + \\lambda\\,\\Omega(w)",
      note: "Regularised objective: MSE loss plus penalty term Ω",
    },
    {
      eq: "\\Omega_{L1} = \\sum_{j}|w_j|",
      note: "Lasso (L1): produces sparse weights — some go to exactly 0",
    },
    {
      eq: "\\Omega_{L2} = \\sum_{j} w_j^2",
      note: "Ridge (L2): shrinks all weights; none reach 0",
    },
  ],
  "knn": [
    {
      eq: "\\hat{y} = \\operatorname{mode}\\!\\left(\\{y_i : x_i \\in \\mathcal{N}_k(x)\\}\\right)",
      note: "Predicted class = majority vote of k nearest neighbours",
    },
    {
      eq: "d(x,\\, x_i) = \\sqrt{\\sum_{j=1}^{p}(x_j - x_{ij})^2}",
      note: "Euclidean distance (most common metric)",
    },
  ],
  "gradient-descent": [
    {
      eq: "w \\leftarrow w - \\alpha\\,\\nabla J(w)",
      note: "Single gradient step; α is the learning rate",
    },
    {
      eq: "J(w) = \\frac{1}{n}\\sum_{i=1}^{n}\\ell\\!\\left(y_i,\\, f(x_i;\\,w)\\right)",
      note: "Average loss over training set",
    },
    {
      eq: "\\nabla J(w) = \\frac{2}{n}X^\\top(Xw - y)",
      note: "Gradient of MSE loss (linear regression)",
    },
  ],
  "confusion-matrix": [
    {
      eq: "\\text{Precision} = \\frac{TP}{TP + FP}",
      note: "Of everything flagged positive, how much was right",
    },
    {
      eq: "\\text{Recall} = \\frac{TP}{TP + FN}",
      note: "Of all actual positives, how many were caught",
    },
    {
      eq: "F_1 = 2 \\cdot \\frac{\\text{Precision} \\cdot \\text{Recall}}{\\text{Precision} + \\text{Recall}}",
      note: "Harmonic mean — balances precision against recall",
    },
  ],
};

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
          <EmptyState hasQuery={!!query} />
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
                    textAlign: "center",
                    border: "1px solid var(--line-soft)",
                    borderRadius: 10,
                    background: "var(--bg-2)",
                    padding: "18px 24px",
                    color: "var(--txt)",
                    overflowX: "auto",
                  }}
                >
                  <BlockMath math={eq} />
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

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
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
      {hasQuery ? (
        <>
          {/* A question is active but no interactive topic matched — explain why the
              panel is blank so it doesn't read as broken (see issue #12). */}
          <p style={{ fontSize: 13.5, color: "var(--txt-dim)", fontWeight: 500 }}>
            No interactive visual for this topic <strong style={{ color: "var(--txt)" }}>yet</strong>.
          </p>
          <p style={{ fontSize: 12, color: "var(--txt-faint)", maxWidth: "26ch", lineHeight: 1.5 }}>
            The grounded answer is on the left. Live visuals currently cover bias–variance,
            regularization, KNN, gradient descent and confusion matrix.
          </p>
        </>
      ) : (
        <>
          <p style={{ fontSize: 13.5, color: "var(--txt-dim)", fontWeight: 500 }}>
            The <strong style={{ color: "var(--txt)" }}>ML workspace</strong> lands here.
          </p>
          <p style={{ fontSize: 12, color: "var(--txt-faint)", maxWidth: "22ch", lineHeight: 1.5 }}>
            Every answer comes with an interactive plot and the math — ask a question to light it up.
          </p>
        </>
      )}
    </div>
  );
}

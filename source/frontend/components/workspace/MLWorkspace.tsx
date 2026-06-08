"use client";

import { useState } from "react";
import katex from "katex";
import { VizPanel } from "@/components/viz/VizPanel";
import { detectTopic } from "@/lib/topics";

const TOPIC_MATH: Record<string, Array<{ eq: string; note: string }>> = {
  "bias-variance": [
    {
      eq: "\\mathbb{E}\\!\\left[(y - \\hat{y})^2\\right] = \\underbrace{\\left(\\mathbb{E}[\\hat{y}] - y\\right)^2}_{\\text{Bias}^2} + \\underbrace{\\mathbb{E}\\!\\left[(\\hat{y} - \\mathbb{E}[\\hat{y}])^2\\right]}_{\\text{Variance}} + \\underbrace{\\sigma^2_{\\varepsilon}}_{\\text{noise}}",
      note: "Expected squared error = irreducible bias² + variance + noise — only the first two are controllable",
    },
    {
      eq: "\\text{Bias} = \\mathbb{E}[\\hat{y}] - y",
      note: "How far the average prediction sits from truth — a high-bias model is systematically wrong",
    },
    {
      eq: "\\text{Var}(\\hat{y}) = \\mathbb{E}\\!\\left[\\left(\\hat{y} - \\mathbb{E}[\\hat{y}]\\right)^2\\right]",
      note: "How much predictions scatter across different training sets — a high-variance model chases noise",
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
      eq: "d(x,\\, x_i) = \\sqrt{\\sum_{j=1}^{p}\\left(x_j - x_{ij}\\right)^2}",
      note: "Distance from query x to training point xᵢ across p features — smaller means closer neighbour",
    },
    {
      eq: "\\mathcal{N}_k(x) = \\{x_{(1)},\\, x_{(2)},\\, \\ldots,\\, x_{(k)}\\}",
      note: "The k nearest neighbours, ordered by distance d(x, xᵢ) — these are the only points that vote",
    },
    {
      eq: "\\hat{y} = \\underset{c}{\\arg\\max} \\sum_{i=1}^{k} \\mathbf{1}\\!\\left[y_{(i)} = c\\right]",
      note: "Predict the class c with the most votes among the k neighbours — the indicator 𝟏[·] counts matches",
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
      eq: "F_1 = \\frac{2\\,TP}{2\\,TP + FP + FN}",
      note: "Harmonic mean of precision and recall — directly in terms of counts, no intermediate fractions",
    },
  ],
  "distributions": [
    {
      eq: "f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}}\\,e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}",
      note: "Normal (Gaussian) probability density — μ shifts, σ widens",
    },
    {
      eq: "\\mathbb{E}[X] = \\mu, \\quad \\operatorname{Var}(X) = \\sigma^2",
      note: "Mean and variance fully parameterise the normal",
    },
    {
      eq: "P(\\mu - \\sigma \\le X \\le \\mu + \\sigma) \\approx 0.68",
      note: "The 68–95–99.7 rule: ~68% of mass within one σ",
    },
  ],
  "kmeans": [
    {
      eq: "\\underset{c_1\\dots c_k}{\\arg\\min}\\sum_{i=1}^{n}\\min_{j}\\lVert x_i - c_j\\rVert^2",
      note: "Objective: minimise within-cluster squared distance (inertia)",
    },
    {
      eq: "c_j = \\frac{1}{|S_j|}\\sum_{x \\in S_j} x",
      note: "Update step — each centroid moves to its cluster's mean",
    },
    {
      eq: "a_i = \\underset{j}{\\arg\\min}\\,\\lVert x_i - c_j\\rVert",
      note: "Assignment step — each point joins its nearest centroid",
    },
  ],
  "time-series": [
    {
      eq: "y_t = T_t + S_t + \\varepsilon_t",
      note: "Additive decomposition: trend + seasonality + residual",
    },
    {
      eq: "\\hat{T}_t = \\frac{1}{w}\\sum_{i=-(w-1)/2}^{(w-1)/2} y_{t+i}",
      note: "Trend estimate via a centred moving average (window w)",
    },
    {
      eq: "\\hat{y}_{t+h} = T_{t+h} + S_{(t+h)\\bmod m}",
      note: "Forecast h steps ahead: extend trend, repeat the seasonal cycle m",
    },
  ],
  "convolution": [
    {
      eq: "(I * K)(x,y) = \\sum_{i}\\sum_{j} I(x+i,\\,y+j)\\,K(i,j)",
      note: "2D convolution — slide the kernel K over image I",
    },
    {
      eq: "K_{\\text{edge}} = \\begin{bmatrix} -1 & -1 & -1 \\\\ -1 & 8 & -1 \\\\ -1 & -1 & -1 \\end{bmatrix}",
      note: "An edge kernel sums to 0 — flat regions vanish, edges survive",
    },
  ],
  "embeddings": [
    {
      eq: "\\cos(\\theta) = \\frac{\\mathbf{a}\\cdot\\mathbf{b}}{\\lVert\\mathbf{a}\\rVert\\,\\lVert\\mathbf{b}\\rVert}",
      note: "Cosine similarity — angle between two word vectors",
    },
    {
      eq: "\\mathbf{a}\\cdot\\mathbf{b} = \\sum_{i=1}^{d} a_i b_i",
      note: "Dot product over the d embedding dimensions",
    },
    {
      eq: "\\text{king} - \\text{man} + \\text{woman} \\approx \\text{queen}",
      note: "Vector arithmetic captures analogies in embedding space",
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
                  <span
                    dangerouslySetInnerHTML={{
                      __html: katex.renderToString(eq, { displayMode: true, throwOnError: false, output: "html" }),
                    }}
                  />
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
            The grounded answer is on the left. Live visuals cover the core topics across
            modules 3.1–3.10 — try rephrasing toward one of them.
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

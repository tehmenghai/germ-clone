"use client";

import { useState } from "react";

interface Props {
  interactive?: boolean;
}

const W = 480;
const H = 300;
const PAD = { top: 28, right: 24, bottom: 48, left: 52 };
const IW = W - PAD.left - PAD.right;
const IH = H - PAD.top - PAD.bottom;

// Coefficients across lambda for L1, L2, ElasticNet (3 features)
function l2Coef(i: number, lambda: number) {
  // Ridge shrinks smoothly toward 0
  const base = [0.9, 0.7, 0.5][i]!;
  return base / (1 + lambda * 4);
}

function l1Coef(i: number, lambda: number) {
  // Lasso promotes sparsity — coef hits 0 at lower lambda for smaller base
  const base = [0.9, 0.7, 0.5][i]!;
  const raw = base - lambda * 1.1 * (1 + i * 0.4);
  return Math.max(0, raw);
}

function elasticCoef(i: number, lambda: number) {
  return 0.5 * l1Coef(i, lambda) + 0.5 * l2Coef(i, lambda);
}

function xToPixel(x: number) {
  return PAD.left + x * IW;
}

function yToPixel(y: number) {
  // y in [-1, 1] → pixels
  return PAD.top + IH / 2 - y * (IH / 2) * 0.95;
}

function buildCoefPath(fn: (lambda: number) => number, steps = 80) {
  const pts = Array.from({ length: steps + 1 }, (_, k) => {
    const lambda = k / steps;
    return `${xToPixel(lambda).toFixed(1)},${yToPixel(fn(lambda)).toFixed(1)}`;
  });
  return "M " + pts.join(" L ");
}

const COEF_COLORS = ["var(--green)", "var(--cyan)", "var(--amber)"];

export function RegularizationViz({ interactive = true }: Props) {
  const [mode, setMode] = useState<"l1" | "l2" | "elastic">("l2");
  const [lambda, setLambda] = useState(0.3);

  const coefFn = mode === "l1" ? l1Coef : mode === "l2" ? l2Coef : elasticCoef;

  const paths = [0, 1, 2].map((i) =>
    buildCoefPath((lam) => coefFn(i, lam))
  );

  // current values at slider position
  const currentVals = [0, 1, 2].map((i) => coefFn(i, lambda));

  // y-axis ticks
  const yTicks = [-0.8, -0.4, 0, 0.4, 0.8];

  return (
    <div style={{ fontFamily: "var(--font-mono, monospace)" }}>
      {/* Mode selector */}
      {interactive && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {(["l1", "l2", "elastic"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              style={{
                fontSize: "var(--font-label)",
                padding: "3px 10px",
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--line)",
                background: mode === m ? "var(--green)" : "transparent",
                color: mode === m ? "var(--on-green)" : "var(--txt-dim)",
                cursor: "pointer",
              }}
            >
              {m === "l1" ? "Lasso (L1)" : m === "l2" ? "Ridge (L2)" : "ElasticNet"}
            </button>
          ))}
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", maxWidth: W, height: "auto", display: "block" }}
        aria-label={`Regularization coefficient paths — ${mode}`}
        role="img"
      >
        {/* Grid */}
        {yTicks.map((t) => (
          <line key={t}
            x1={PAD.left} x2={W - PAD.right}
            y1={yToPixel(t)} y2={yToPixel(t)}
            stroke="var(--line-soft)" strokeWidth={0.8} />
        ))}

        {/* Zero line */}
        <line x1={PAD.left} x2={W - PAD.right} y1={yToPixel(0)} y2={yToPixel(0)}
          stroke="var(--line)" strokeWidth={1} />

        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom}
          stroke="var(--line)" strokeWidth={1} />
        <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom}
          stroke="var(--line)" strokeWidth={1} />

        {/* Y ticks + labels */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left - 4} x2={PAD.left}
              y1={yToPixel(t)} y2={yToPixel(t)}
              stroke="var(--line)" strokeWidth={1} />
            <text x={PAD.left - 7} y={yToPixel(t) + 4}
              textAnchor="end" fontSize={9} fill="var(--txt-faint)">
              {t.toFixed(1)}
            </text>
          </g>
        ))}

        {/* X axis labels */}
        <text x={PAD.left} y={H - PAD.bottom + 14} fontSize={9} fill="var(--txt-faint)">0</text>
        <text x={W - PAD.right} y={H - PAD.bottom + 14} textAnchor="end" fontSize={9} fill="var(--txt-faint)">1</text>
        <text x={PAD.left + IW / 2} y={H - 8} textAnchor="middle" fontSize={9} fill="var(--txt-dim)">
          λ (regularisation strength)
        </text>

        {/* Y axis label */}
        <text x={12} y={PAD.top + IH / 2} textAnchor="middle" fontSize={9} fill="var(--txt-dim)"
          transform={`rotate(-90, 12, ${PAD.top + IH / 2})`}>
          Coefficient
        </text>

        {/* Coefficient paths */}
        {paths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={COEF_COLORS[i]} strokeWidth={2} />
        ))}

        {/* Lambda cursor */}
        {interactive && (
          <>
            <line
              x1={xToPixel(lambda)} y1={PAD.top}
              x2={xToPixel(lambda)} y2={H - PAD.bottom}
              stroke="var(--txt-faint)" strokeWidth={1} strokeDasharray="3 3" />
            {currentVals.map((v, i) => (
              <circle key={i}
                cx={xToPixel(lambda)} cy={yToPixel(v)} r={4}
                fill={COEF_COLORS[i]} />
            ))}
          </>
        )}

        {/* Legend */}
        <g transform={`translate(${PAD.left + IW - 70}, ${PAD.top + 6})`}>
          {["w₁", "w₂", "w₃"].map((label, i) => (
            <g key={i} transform={`translate(0, ${i * 14})`}>
              <line x1={0} y1={0} x2={14} y2={0} stroke={COEF_COLORS[i]} strokeWidth={2} />
              <text x={18} y={4} fontSize={9} fill="var(--txt-dim)">{label}</text>
            </g>
          ))}
        </g>
      </svg>

      {interactive && (
        <div style={{ marginTop: 6, padding: "4px 4px" }}>
          <label htmlFor="reg-lambda"
            style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", display: "block", marginBottom: 4 }}>
            λ = <span style={{ color: "var(--txt-dim)" }}>{lambda.toFixed(2)}</span>
            {" · "}
            <span style={{ color: "var(--txt-faint)" }}>
              {mode === "l1"
                ? `${currentVals.filter((v) => v === 0).length} weight(s) zeroed`
                : `max |w| = ${Math.max(...currentVals).toFixed(2)}`}
            </span>
          </label>
          <input id="reg-lambda" type="range" min={0} max={1} step={0.01} value={lambda}
            onChange={(e) => setLambda(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "var(--green)" }} />
        </div>
      )}
    </div>
  );
}

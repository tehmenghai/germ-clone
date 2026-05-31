"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  interactive?: boolean;
}

const W = 480;
const H = 280;
const PAD = { top: 28, right: 24, bottom: 48, left: 52 };
const IW = W - PAD.left - PAD.right;
const IH = H - PAD.top - PAD.bottom;

function bias(x: number, complexity: number) {
  // decreases as complexity grows
  return Math.max(0.04, 1.0 / (0.8 + complexity * x * 0.9));
}

function variance(x: number, complexity: number) {
  // increases as complexity grows
  return Math.max(0.02, (complexity * x * 0.8) ** 1.6 * 0.5);
}

function totalError(x: number, complexity: number) {
  return bias(x, complexity) + variance(x, complexity) + 0.05; // irreducible noise
}

function xToPixel(x: number) {
  return PAD.left + x * IW;
}

function yToPixel(y: number, maxY: number) {
  return PAD.top + IH - (y / maxY) * IH;
}

function buildPath(fn: (x: number) => number, maxY: number, steps = 120) {
  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const x = i / steps;
    const y = fn(x);
    return `${xToPixel(x).toFixed(1)},${yToPixel(y, maxY).toFixed(1)}`;
  });
  return "M " + pts.join(" L ");
}

export function BiasVarianceViz({ interactive = true }: Props) {
  const [complexity, setComplexity] = useState(0.6);
  const sliderRef = useRef<HTMLInputElement>(null);

  const steps = 120;
  const xs = Array.from({ length: steps + 1 }, (_, i) => i / steps);

  const maxY = 1.35;
  const biasPath = buildPath((x) => bias(x, complexity), maxY);
  const variancePath = buildPath((x) => variance(x, complexity), maxY);
  const totalPath = buildPath((x) => totalError(x, complexity), maxY);

  // sweet spot: min total error
  let minTotal = Infinity;
  let sweetX = 0;
  for (const x of xs) {
    const t = totalError(x, complexity);
    if (t < minTotal) { minTotal = t; sweetX = x; }
  }

  const sweetPx = xToPixel(sweetX);
  const sweetPy = yToPixel(minTotal, maxY);

  // y axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0, 1.25];

  return (
    <div style={{ fontFamily: "var(--font-mono, monospace)" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        aria-label="Bias-Variance trade-off chart"
        role="img"
      >
        {/* Grid */}
        {yTicks.map((t) => (
          <line
            key={t}
            x1={PAD.left} x2={W - PAD.right}
            y1={yToPixel(t, maxY)} y2={yToPixel(t, maxY)}
            stroke="var(--line-soft)" strokeWidth={0.8}
          />
        ))}

        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom}
          stroke="var(--line)" strokeWidth={1} />
        <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom}
          stroke="var(--line)" strokeWidth={1} />

        {/* Y ticks + labels */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left - 4} x2={PAD.left} y1={yToPixel(t, maxY)} y2={yToPixel(t, maxY)}
              stroke="var(--line)" strokeWidth={1} />
            <text x={PAD.left - 7} y={yToPixel(t, maxY) + 4}
              textAnchor="end" fontSize={9} fill="var(--txt-faint)">
              {t.toFixed(2)}
            </text>
          </g>
        ))}

        {/* X axis labels */}
        <text x={PAD.left} y={H - PAD.bottom + 14} fontSize={9} fill="var(--txt-faint)">Low</text>
        <text x={W - PAD.right} y={H - PAD.bottom + 14} textAnchor="end" fontSize={9} fill="var(--txt-faint)">High</text>
        <text x={PAD.left + IW / 2} y={H - 8} textAnchor="middle" fontSize={9} fill="var(--txt-dim)">
          Model Complexity
        </text>

        {/* Y axis label */}
        <text
          x={12} y={PAD.top + IH / 2}
          textAnchor="middle" fontSize={9} fill="var(--txt-dim)"
          transform={`rotate(-90, 12, ${PAD.top + IH / 2})`}
        >
          Error
        </text>

        {/* Curves */}
        <path d={biasPath} fill="none" stroke="var(--cyan)" strokeWidth={2} />
        <path d={variancePath} fill="none" stroke="var(--amber)" strokeWidth={2} />
        <path d={totalPath} fill="none" stroke="var(--green)" strokeWidth={2.5} strokeDasharray="6 3" />

        {/* Sweet-spot marker */}
        <line x1={sweetPx} y1={PAD.top} x2={sweetPx} y2={H - PAD.bottom}
          stroke="var(--green)" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
        <circle cx={sweetPx} cy={sweetPy} r={5} fill="var(--green)" />
        <text x={sweetPx + 7} y={sweetPy - 6} fontSize={9} fill="var(--green)">sweet spot</text>

        {/* Legend */}
        <g transform={`translate(${PAD.left + 10}, ${PAD.top + 6})`}>
          <line x1={0} y1={0} x2={18} y2={0} stroke="var(--cyan)" strokeWidth={2} />
          <text x={22} y={4} fontSize={9} fill="var(--txt-dim)">Bias²</text>
          <line x1={0} y1={14} x2={18} y2={14} stroke="var(--amber)" strokeWidth={2} />
          <text x={22} y={18} fontSize={9} fill="var(--txt-dim)">Variance</text>
          <line x1={0} y1={28} x2={18} y2={28} stroke="var(--green)" strokeWidth={2.5} strokeDasharray="6 3" />
          <text x={22} y={32} fontSize={9} fill="var(--txt-dim)">Total Error</text>
        </g>
      </svg>

      {interactive && (
        <div style={{ marginTop: 8, padding: "6px 4px" }}>
          <label
            htmlFor="bv-complexity"
            style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", display: "block", marginBottom: 4 }}
          >
            Complexity factor: <span style={{ color: "var(--txt-dim)" }}>{complexity.toFixed(2)}</span>
          </label>
          <input
            id="bv-complexity"
            ref={sliderRef}
            type="range"
            min={0.1}
            max={1.5}
            step={0.01}
            value={complexity}
            onChange={(e) => setComplexity(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "var(--green)" }}
          />
        </div>
      )}
    </div>
  );
}

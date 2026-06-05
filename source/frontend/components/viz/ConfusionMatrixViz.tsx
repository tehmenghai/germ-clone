"use client";

import { useState } from "react";

interface Props {
  interactive?: boolean;
}

// 2x2 confusion matrix. Drag the four counts; precision / recall / F1 update live.
// Layout mirrors the other viz components (480-wide SVG, CSS-var theming).

const W = 480;
const CELL = 120; // grid cell size
const GRID_X = 150; // left offset of the grid (room for the "Actual" axis labels)
const GRID_Y = 56; // top offset (room for the "Predicted" axis labels)

type CountKey = "tp" | "fp" | "fn" | "tn";

const FIELDS: { key: CountKey; label: string }[] = [
  { key: "tp", label: "True Positive" },
  { key: "fp", label: "False Positive" },
  { key: "fn", label: "False Negative" },
  { key: "tn", label: "True Negative" },
];

function safeDiv(a: number, b: number) {
  return b === 0 ? 0 : a / b;
}

export function ConfusionMatrixViz({ interactive = true }: Props) {
  const [counts, setCounts] = useState({ tp: 42, fp: 8, fn: 13, tn: 37 });

  const precision = safeDiv(counts.tp, counts.tp + counts.fp);
  const recall = safeDiv(counts.tp, counts.tp + counts.fn);
  const f1 = safeDiv(2 * precision * recall, precision + recall);

  // colour intensity per cell scaled to the largest count, so the matrix "heats up"
  const maxCount = Math.max(1, ...Object.values(counts));
  const cellFill = (v: number, good: boolean) => {
    const a = (0.12 + 0.55 * (v / maxCount)).toFixed(3);
    return good
      ? `color-mix(in oklab, var(--green) ${+a * 100}%, transparent)`
      : `color-mix(in oklab, var(--amber) ${+a * 100}%, transparent)`;
  };

  // grid cells: [predicted, actual, key, isCorrect]
  const cells: { col: 0 | 1; row: 0 | 1; key: CountKey; good: boolean }[] = [
    { col: 0, row: 0, key: "tp", good: true },
    { col: 1, row: 0, key: "fn", good: false },
    { col: 0, row: 1, key: "fp", good: false },
    { col: 1, row: 1, key: "tn", good: true },
  ];

  return (
    <div style={{ fontFamily: "var(--font-mono, monospace)" }}>
      <svg
        viewBox={`0 0 ${W} 300`}
        style={{ width: "100%", height: "auto", display: "block", minHeight: 220 }}
        role="img"
        aria-label="Confusion matrix with live precision, recall and F1"
      >
        {/* Axis captions */}
        <text x={GRID_X + CELL} y={20} textAnchor="middle" fontSize={11} fill="var(--txt-dim)">
          Predicted
        </text>
        <text x={GRID_X + 0.5 * CELL} y={40} textAnchor="middle" fontSize={10} fill="var(--txt-faint)">
          Positive
        </text>
        <text x={GRID_X + 1.5 * CELL} y={40} textAnchor="middle" fontSize={10} fill="var(--txt-faint)">
          Negative
        </text>
        <text
          x={26} y={GRID_Y + CELL} textAnchor="middle" fontSize={11} fill="var(--txt-dim)"
          transform={`rotate(-90, 26, ${GRID_Y + CELL})`}
        >
          Actual
        </text>
        <text x={GRID_X - 10} y={GRID_Y + 0.5 * CELL + 4} textAnchor="end" fontSize={10} fill="var(--txt-faint)">
          Positive
        </text>
        <text x={GRID_X - 10} y={GRID_Y + 1.5 * CELL + 4} textAnchor="end" fontSize={10} fill="var(--txt-faint)">
          Negative
        </text>

        {/* Cells */}
        {cells.map(({ col, row, key, good }) => {
          const x = GRID_X + col * CELL;
          const y = GRID_Y + row * CELL;
          return (
            <g key={key}>
              <rect
                x={x} y={y} width={CELL} height={CELL}
                fill={cellFill(counts[key], good)}
                stroke="var(--line)" strokeWidth={1}
              />
              <text x={x + CELL / 2} y={y + CELL / 2 - 4} textAnchor="middle" fontSize={28} fontWeight={700}
                fill={good ? "var(--green)" : "var(--amber)"}>
                {counts[key]}
              </text>
              <text x={x + CELL / 2} y={y + CELL / 2 + 18} textAnchor="middle" fontSize={10}
                fill="var(--txt-faint)" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {key}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Metrics readout */}
      <div style={{ display: "flex", gap: 10, margin: "10px 4px 0", flexWrap: "wrap" }}>
        {[
          ["precision", precision],
          ["recall", recall],
          ["F1", f1],
        ].map(([label, v]) => (
          <div
            key={label as string}
            style={{
              flex: 1, minWidth: 90, padding: "8px 10px",
              border: "1px solid var(--line)", borderRadius: "var(--r-sm)",
              background: "var(--bg-2)",
            }}
          >
            <div style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {label as string}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: (v as number) >= 0.8 ? "var(--green)" : "var(--amber)" }}>
              {(v as number).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {interactive && (
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
          {FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label
                htmlFor={`cm-${key}`}
                style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", display: "block", marginBottom: 2 }}
              >
                {label}: <span style={{ color: "var(--txt-dim)" }}>{counts[key]}</span>
              </label>
              <input
                id={`cm-${key}`}
                type="range" min={0} max={100} step={1}
                value={counts[key]}
                onChange={(e) => setCounts((c) => ({ ...c, [key]: parseInt(e.target.value, 10) }))}
                style={{ width: "100%", accentColor: "var(--green)" }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

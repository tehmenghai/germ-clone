"use client";

import { useState } from "react";

interface Props {
  interactive?: boolean;
}

// A small grayscale "image" (a diagonal edge + a bright square) — values 0..1.
const SIZE = 9;
const IMG: number[][] = Array.from({ length: SIZE }, (_, y) =>
  Array.from({ length: SIZE }, (_, x) => {
    if (x >= 5 && x <= 7 && y >= 1 && y <= 3) return 0.95; // bright square
    return x > y ? 0.7 : 0.15; // diagonal edge
  }),
);

type KernelId = "edge" | "blur" | "sharpen";
const KERNELS: Record<KernelId, { label: string; k: number[][]; norm: number }> = {
  edge: { label: "Edge", k: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]], norm: 1 },
  blur: { label: "Blur", k: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], norm: 9 },
  sharpen: { label: "Sharpen", k: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]], norm: 1 },
};

function convolve(img: number[][], kernel: number[][], norm: number): number[][] {
  const out = img.map((row) => row.slice());
  for (let y = 1; y < SIZE - 1; y++) {
    for (let x = 1; x < SIZE - 1; x++) {
      let acc = 0;
      for (let ky = -1; ky <= 1; ky++) for (let kx = -1; kx <= 1; kx++) {
        acc += img[y + ky]![x + kx]! * kernel[ky + 1]![kx + 1]!;
      }
      out[y]![x] = Math.max(0, Math.min(1, acc / norm));
    }
  }
  return out;
}

function Grid({ data, label, cell }: { data: number[][]; label: string; cell: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <svg width={SIZE * cell} height={SIZE * cell} style={{ borderRadius: 4, border: "1px solid var(--line)" }}
        role="img" aria-label={label}>
        {data.map((row, y) => row.map((v, x) => {
          const g = Math.round(v * 255);
          return <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill={`rgb(${g},${g},${g})`} />;
        }))}
      </svg>
    </div>
  );
}

export function ConvolutionViz({ interactive = true }: Props) {
  const [kid, setKid] = useState<KernelId>("edge");
  const kernel = KERNELS[kid];
  const output = convolve(IMG, kernel.k, kernel.norm);
  const cell = 22;

  return (
    <div style={{ fontFamily: "var(--font-mono, monospace)", padding: "4px 2px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
        <Grid data={IMG} label="input" cell={cell} />
        {/* kernel */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)" }}>⊛ {kernel.label}</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
            {kernel.k.flat().map((v, i) => (
              <div key={i} style={{
                width: 24, height: 24, display: "grid", placeItems: "center", fontSize: 11,
                border: "1px solid var(--line)", borderRadius: 3, background: "var(--bg-2)",
                color: v > 0 ? "var(--green)" : v < 0 ? "var(--amber)" : "var(--txt-faint)",
              }}>{v}</div>
            ))}
          </div>
          {kernel.norm !== 1 && <span style={{ fontSize: 9.5, color: "var(--txt-faint)" }}>÷{kernel.norm}</span>}
        </div>
        <Grid data={output} label="output" cell={cell} />
      </div>

      {interactive && (
        <div style={{ marginTop: 12, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
          {(Object.keys(KERNELS) as KernelId[]).map((id) => (
            <button key={id} onClick={() => setKid(id)} aria-pressed={kid === id}
              style={{
                fontSize: "var(--font-label)", padding: "4px 12px", borderRadius: "var(--r-sm)",
                border: "1px solid var(--line)",
                background: kid === id ? "var(--green)" : "transparent",
                color: kid === id ? "var(--on-green)" : "var(--txt-dim)", cursor: "pointer",
              }}>
              {KERNELS[id].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

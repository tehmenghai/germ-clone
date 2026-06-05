"use client";

import { useState } from "react";

interface Props {
  interactive?: boolean;
}

const W = 480;
const H = 300;
const PAD = 36;

// Toy 2D "embeddings" — semantically grouped so cosine similarity is intuitive.
const WORDS: { w: string; v: [number, number] }[] = [
  { w: "king", v: [0.82, 0.62] },
  { w: "queen", v: [0.70, 0.70] },
  { w: "man", v: [0.78, 0.40] },
  { w: "woman", v: [0.62, 0.52] },
  { w: "cat", v: [-0.55, 0.65] },
  { w: "dog", v: [-0.62, 0.55] },
  { w: "kitten", v: [-0.48, 0.78] },
  { w: "car", v: [-0.40, -0.70] },
  { w: "truck", v: [-0.52, -0.62] },
  { w: "happy", v: [0.45, -0.75] },
];

function toPx(v: [number, number]) {
  return { x: PAD + ((v[0] + 1) / 2) * (W - PAD * 2), y: PAD + ((1 - v[1]) / 2) * (H - PAD * 2) };
}
function cosine(a: [number, number], b: [number, number]) {
  const dot = a[0] * b[0] + a[1] * b[1];
  const na = Math.hypot(...a), nb = Math.hypot(...b);
  return na && nb ? dot / (na * nb) : 0;
}

export function EmbeddingViz({ interactive = true }: Props) {
  const [a, setA] = useState(0); // king
  const [b, setB] = useState(1); // queen

  const va = WORDS[a]!.v, vb = WORDS[b]!.v;
  const sim = cosine(va, vb);
  const pa = toPx(va), pb = toPx(vb);
  const origin = toPx([0, 0]);

  return (
    <div style={{ fontFamily: "var(--font-mono, monospace)" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", minHeight: 220 }}
        role="img" aria-label="Word embeddings in 2D with cosine similarity">
        {/* axes through origin */}
        <line x1={PAD} y1={origin.y} x2={W - PAD} y2={origin.y} stroke="var(--line-soft)" strokeWidth={0.8} />
        <line x1={origin.x} y1={PAD} x2={origin.x} y2={H - PAD} stroke="var(--line-soft)" strokeWidth={0.8} />
        {/* selected vectors from origin */}
        <line x1={origin.x} y1={origin.y} x2={pa.x} y2={pa.y} stroke="var(--cyan)" strokeWidth={2} />
        <line x1={origin.x} y1={origin.y} x2={pb.x} y2={pb.y} stroke="var(--amber)" strokeWidth={2} />
        {/* all word points */}
        {WORDS.map(({ w, v }, i) => {
          const p = toPx(v);
          const sel = i === a || i === b;
          return (
            <g key={w}>
              <circle cx={p.x} cy={p.y} r={sel ? 5 : 3.5}
                fill={i === a ? "var(--cyan)" : i === b ? "var(--amber)" : "var(--txt-faint)"} />
              <text x={p.x + 7} y={p.y + 3} fontSize={10.5}
                fill={sel ? "var(--txt)" : "var(--txt-dim)"}>{w}</text>
            </g>
          );
        })}
      </svg>

      {/* similarity readout */}
      <div style={{ marginTop: 8, textAlign: "center" }}>
        <span style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)" }}>cosine(</span>
        <span style={{ color: "var(--cyan)" }}>{WORDS[a]!.w}</span>
        <span style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)" }}>, </span>
        <span style={{ color: "var(--amber)" }}>{WORDS[b]!.w}</span>
        <span style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)" }}>) = </span>
        <span style={{ fontSize: 18, fontWeight: 700, color: sim >= 0.6 ? "var(--green)" : sim >= 0 ? "var(--amber)" : "var(--red)" }}>
          {sim.toFixed(2)}
        </span>
      </div>

      {interactive && (
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
          {[["A", a, setA, "var(--cyan)"], ["B", b, setB, "var(--amber)"]].map(([lbl, val, setter, color]) => (
            <div key={lbl as string}>
              <label style={{ fontSize: "var(--font-label)", color: color as string, display: "block", marginBottom: 2 }}>
                word {lbl as string}: {WORDS[val as number]!.w}
              </label>
              <input type="range" min={0} max={WORDS.length - 1} step={1} value={val as number}
                onChange={(e) => (setter as (n: number) => void)(parseInt(e.target.value, 10))}
                style={{ width: "100%", accentColor: color as string }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

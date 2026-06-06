"use client";

import { useState } from "react";

interface Props {
  interactive?: boolean;
}

const W = 480;
const H = 300;
const PAD = { top: 24, right: 24, bottom: 44, left: 48 };
const IW = W - PAD.left - PAD.right;
const IH = H - PAD.top - PAD.bottom;

const X_MIN = -6;
const X_MAX = 6;

function pdf(x: number, mu: number, sigma: number) {
  const z = (x - mu) / sigma;
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
}

function xToPixel(x: number) {
  return PAD.left + ((x - X_MIN) / (X_MAX - X_MIN)) * IW;
}
function yToPixel(y: number, maxY: number) {
  return PAD.top + IH - (y / maxY) * IH;
}

export function DistributionViz({ interactive = true }: Props) {
  const [mu, setMu] = useState(0);
  const [sigma, setSigma] = useState(1.2);

  const steps = 160;
  const maxY = pdf(0, 0, 0.5); // headroom for the narrowest curve
  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const x = X_MIN + (i / steps) * (X_MAX - X_MIN);
    return `${xToPixel(x).toFixed(1)},${yToPixel(pdf(x, mu, sigma), maxY).toFixed(1)}`;
  });
  const curve = "M " + pts.join(" L ");
  const areaPath = `${curve} L ${xToPixel(X_MAX).toFixed(1)},${(PAD.top + IH).toFixed(1)} L ${xToPixel(X_MIN).toFixed(1)},${(PAD.top + IH).toFixed(1)} Z`;

  // ±1σ band shading bounds
  const lo = xToPixel(mu - sigma);
  const hi = xToPixel(mu + sigma);

  return (
    <div style={{ fontFamily: "var(--font-mono, monospace)" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", minHeight: 220 }}
        role="img" aria-label="Normal distribution probability density">
        {/* baseline */}
        <line x1={PAD.left} y1={PAD.top + IH} x2={W - PAD.right} y2={PAD.top + IH} stroke="var(--line)" strokeWidth={1} />
        {/* x ticks */}
        {[-4, -2, 0, 2, 4].map((t) => (
          <g key={t}>
            <line x1={xToPixel(t)} y1={PAD.top + IH} x2={xToPixel(t)} y2={PAD.top + IH + 4} stroke="var(--line)" />
            <text x={xToPixel(t)} y={PAD.top + IH + 16} textAnchor="middle" fontSize={10} fill="var(--txt-faint)">{t}</text>
          </g>
        ))}
        {/* ±1σ band */}
        <rect x={lo} y={PAD.top} width={Math.max(0, hi - lo)} height={IH}
          fill="color-mix(in oklab, var(--green) 10%, transparent)" />
        {/* area + curve */}
        <path d={areaPath} fill="color-mix(in oklab, var(--cyan) 14%, transparent)" stroke="none" />
        <path d={curve} fill="none" stroke="var(--cyan)" strokeWidth={2.5} />
        {/* mean line */}
        <line x1={xToPixel(mu)} y1={PAD.top} x2={xToPixel(mu)} y2={PAD.top + IH}
          stroke="var(--green)" strokeWidth={1} strokeDasharray="4 3" />
        <text x={xToPixel(mu) + 5} y={PAD.top + 12} fontSize={10} fill="var(--green)">μ={mu.toFixed(1)}</text>
        <text x={PAD.left + IW / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--txt-dim)">x</text>
        <text x={lo + (hi - lo) / 2} y={PAD.top + IH - 6} textAnchor="middle" fontSize={9.5} fill="var(--txt-dim)">±1σ ≈ 68%</text>
      </svg>

      {interactive && (
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
          <div>
            <label htmlFor="dist-mu" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", display: "block", marginBottom: 2 }}>
              mean μ: <span style={{ color: "var(--txt-dim)" }}>{mu.toFixed(1)}</span>
            </label>
            <input id="dist-mu" type="range" min={-3} max={3} step={0.1} value={mu}
              onChange={(e) => setMu(parseFloat(e.target.value))} style={{ width: "100%", accentColor: "var(--green)" }} />
          </div>
          <div>
            <label htmlFor="dist-sigma" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", display: "block", marginBottom: 2 }}>
              std σ: <span style={{ color: "var(--txt-dim)" }}>{sigma.toFixed(1)}</span>
            </label>
            <input id="dist-sigma" type="range" min={0.5} max={2.5} step={0.1} value={sigma}
              onChange={(e) => setSigma(parseFloat(e.target.value))} style={{ width: "100%", accentColor: "var(--green)" }} />
          </div>
        </div>
      )}
    </div>
  );
}

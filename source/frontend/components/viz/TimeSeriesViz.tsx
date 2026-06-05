"use client";

import { useState } from "react";

interface Props {
  interactive?: boolean;
}

const W = 480;
const H = 300;
const PAD = { top: 20, right: 20, bottom: 40, left: 44 };
const IW = W - PAD.left - PAD.right;
const IH = H - PAD.top - PAD.bottom;

const N = 48; // observed points
const FORECAST = 12; // forecast horizon
const TOTAL = N + FORECAST;

// deterministic pseudo-noise so the chart is stable
function noise(i: number) {
  return (Math.sin(i * 12.9898) * 43758.5453) % 1;
}

export function TimeSeriesViz({ interactive = true }: Props) {
  const [trend, setTrend] = useState(0.5);
  const [seasonality, setSeasonality] = useState(0.6);

  const series = Array.from({ length: TOTAL }, (_, i) => {
    const t = trend * (i / N);
    const s = seasonality * Math.sin((i / 6) * Math.PI);
    const e = i < N ? (noise(i) - 0.5) * 0.25 : 0; // no noise in forecast
    return t + s + e + 1;
  });

  const maxY = Math.max(...series) + 0.2;
  const minY = Math.min(...series) - 0.2;
  const xToPixel = (i: number) => PAD.left + (i / (TOTAL - 1)) * IW;
  const yToPixel = (y: number) => PAD.top + IH - ((y - minY) / (maxY - minY)) * IH;

  const obsPath = "M " + series.slice(0, N).map((y, i) => `${xToPixel(i).toFixed(1)},${yToPixel(y).toFixed(1)}`).join(" L ");
  const fcPath = "M " + series.slice(N - 1).map((y, j) => `${xToPixel(N - 1 + j).toFixed(1)},${yToPixel(y).toFixed(1)}`).join(" L ");
  const splitX = xToPixel(N - 1);

  return (
    <div style={{ fontFamily: "var(--font-mono, monospace)" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block", minHeight: 220 }}
        role="img" aria-label="Time series with trend, seasonality and forecast">
        <line x1={PAD.left} y1={PAD.top + IH} x2={W - PAD.right} y2={PAD.top + IH} stroke="var(--line)" strokeWidth={1} />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + IH} stroke="var(--line)" strokeWidth={1} />
        {/* forecast region shading */}
        <rect x={splitX} y={PAD.top} width={W - PAD.right - splitX} height={IH}
          fill="color-mix(in oklab, var(--amber) 8%, transparent)" />
        <line x1={splitX} y1={PAD.top} x2={splitX} y2={PAD.top + IH} stroke="var(--line-soft)" strokeDasharray="3 3" />
        {/* observed + forecast */}
        <path d={obsPath} fill="none" stroke="var(--cyan)" strokeWidth={2} />
        <path d={fcPath} fill="none" stroke="var(--amber)" strokeWidth={2} strokeDasharray="5 3" />
        <text x={PAD.left + 4} y={PAD.top + 12} fontSize={10} fill="var(--cyan)">observed</text>
        <text x={splitX + 4} y={PAD.top + 12} fontSize={10} fill="var(--amber)">forecast</text>
        <text x={PAD.left + IW / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--txt-dim)">time →</text>
      </svg>

      {interactive && (
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
          <div>
            <label htmlFor="ts-trend" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", display: "block", marginBottom: 2 }}>
              trend: <span style={{ color: "var(--txt-dim)" }}>{trend.toFixed(1)}</span>
            </label>
            <input id="ts-trend" type="range" min={-1} max={2} step={0.1} value={trend}
              onChange={(e) => setTrend(parseFloat(e.target.value))} style={{ width: "100%", accentColor: "var(--green)" }} />
          </div>
          <div>
            <label htmlFor="ts-seasonality" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", display: "block", marginBottom: 2 }}>
              seasonality: <span style={{ color: "var(--txt-dim)" }}>{seasonality.toFixed(1)}</span>
            </label>
            <input id="ts-seasonality" type="range" min={0} max={1.5} step={0.1} value={seasonality}
              onChange={(e) => setSeasonality(parseFloat(e.target.value))} style={{ width: "100%", accentColor: "var(--green)" }} />
          </div>
        </div>
      )}
    </div>
  );
}

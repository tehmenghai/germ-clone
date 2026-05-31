"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  interactive?: boolean;
}

const W = 480;
const H = 300;
const PAD = 28;
const IW = W - PAD * 2;
const IH = H - PAD * 2;

interface Point {
  x: number;
  y: number;
  label: 0 | 1;
}

// Fixed seed — reproducible visual
const SEED_POINTS: Point[] = [
  { x: 0.18, y: 0.25, label: 0 }, { x: 0.22, y: 0.35, label: 0 },
  { x: 0.28, y: 0.18, label: 0 }, { x: 0.32, y: 0.42, label: 0 },
  { x: 0.15, y: 0.48, label: 0 }, { x: 0.38, y: 0.28, label: 0 },
  { x: 0.12, y: 0.62, label: 0 }, { x: 0.24, y: 0.58, label: 0 },
  { x: 0.62, y: 0.65, label: 1 }, { x: 0.72, y: 0.55, label: 1 },
  { x: 0.68, y: 0.75, label: 1 }, { x: 0.78, y: 0.68, label: 1 },
  { x: 0.58, y: 0.78, label: 1 }, { x: 0.82, y: 0.58, label: 1 },
  { x: 0.74, y: 0.82, label: 1 }, { x: 0.66, y: 0.42, label: 1 },
  // boundary region
  { x: 0.45, y: 0.48, label: 0 }, { x: 0.52, y: 0.55, label: 1 },
  { x: 0.48, y: 0.38, label: 0 }, { x: 0.55, y: 0.62, label: 1 },
];

function toCanvas(nx: number, ny: number) {
  return { cx: PAD + nx * IW, cy: PAD + ny * IH };
}

function dist(a: Point, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function classify(query: { x: number; y: number }, pts: Point[], k: number): 0 | 1 {
  const sorted = [...pts].sort((a, b) => dist(a, query) - dist(b, query));
  const knn = sorted.slice(0, k);
  const votes = knn.reduce((sum, p) => sum + p.label, 0);
  return votes > k / 2 ? 1 : 0;
}

export function KNNViz({ interactive = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [k, setK] = useState(3);
  const [query, setQuery] = useState<{ x: number; y: number } | null>({ x: 0.5, y: 0.52 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resolve CSS vars
    const style = getComputedStyle(document.documentElement);
    const green = style.getPropertyValue("--green").trim() || "#39ff7e";
    const amber = style.getPropertyValue("--amber").trim() || "#f0a500";
    const cyan = style.getPropertyValue("--cyan").trim() || "#7dd3fc";
    const lineSoft = style.getPropertyValue("--line-soft").trim() || "rgba(100,130,100,0.3)";
    const panelColor = style.getPropertyValue("--panel").trim() || "#1e2b1e";

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = panelColor;
    ctx.fillRect(0, 0, W, H);

    // Decision boundary background (rasterized)
    const cell = 6;
    for (let px = 0; px < W; px += cell) {
      for (let py = 0; py < H; py += cell) {
        const nx = (px - PAD) / IW;
        const ny = (py - PAD) / IH;
        if (nx < 0 || nx > 1 || ny < 0 || ny > 1) continue;
        const label = classify({ x: nx, y: ny }, SEED_POINTS, k);
        ctx.fillStyle = label === 0
          ? "oklch(0.83 0.11 195 / 0.08)"
          : "oklch(0.88 0.21 150 / 0.06)";
        ctx.fillRect(px, py, cell, cell);
      }
    }

    // Query point neighbours
    if (query) {
      const sorted = [...SEED_POINTS].sort((a, b) => dist(a, query) - dist(b, query));
      const knn = sorted.slice(0, k);

      // Lines to neighbours
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = lineSoft;
      const { cx: qx, cy: qy } = toCanvas(query.x, query.y);
      for (const p of knn) {
        const { cx, cy } = toCanvas(p.x, p.y);
        ctx.beginPath();
        ctx.moveTo(qx, qy);
        ctx.lineTo(cx, cy);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Radius circle
      const kthDist = dist(sorted[k - 1]!, query);
      const rPx = kthDist * IW;
      ctx.beginPath();
      ctx.arc(qx, qy, rPx, 0, Math.PI * 2);
      ctx.strokeStyle = lineSoft;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Data points
    for (const p of SEED_POINTS) {
      const { cx, cy } = toCanvas(p.x, p.y);
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = p.label === 0 ? cyan : green;
      ctx.fill();
      ctx.strokeStyle = "oklch(0 0 0 / 0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Query point
    if (query) {
      const { cx: qx, cy: qy } = toCanvas(query.x, query.y);
      const predicted = classify(query, SEED_POINTS, k);
      ctx.beginPath();
      ctx.arc(qx, qy, 7, 0, Math.PI * 2);
      ctx.fillStyle = predicted === 0 ? cyan : green;
      ctx.fill();
      ctx.strokeStyle = amber;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = amber;
      ctx.font = "bold 10px monospace";
      ctx.fillText(`? → class ${predicted}`, qx + 10, qy - 6);
    }

    // Legend
    ctx.font = "10px monospace";
    ctx.fillStyle = cyan;
    ctx.beginPath();
    ctx.arc(PAD + 8, PAD + 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = style.getPropertyValue("--txt-dim").trim() || "#aaa";
    ctx.fillText("Class 0", PAD + 18, PAD + 12);

    ctx.fillStyle = green;
    ctx.beginPath();
    ctx.arc(PAD + 8, PAD + 24, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = style.getPropertyValue("--txt-dim").trim() || "#aaa";
    ctx.fillText("Class 1", PAD + 18, PAD + 28);

    ctx.fillStyle = amber;
    ctx.beginPath();
    ctx.arc(PAD + 8, PAD + 40, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = style.getPropertyValue("--txt-dim").trim() || "#aaa";
    ctx.fillText("Query", PAD + 18, PAD + 44);
  }, [k, query]);

  useEffect(() => { draw(); }, [draw]);

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (W / rect.width);
    const py = (e.clientY - rect.top) * (H / rect.height);
    const nx = (px - PAD) / IW;
    const ny = (py - PAD) / IH;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return;
    setQuery({ x: nx, y: ny });
  }

  return (
    <div style={{ fontFamily: "var(--font-mono, monospace)" }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={handleCanvasClick}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          cursor: interactive ? "crosshair" : "default",
          borderRadius: "var(--r-sm)",
        }}
        aria-label="k-Nearest Neighbours visualisation — click to place query point"
        role="img"
      />

      {interactive && (
        <div style={{ marginTop: 8, padding: "4px 4px" }}>
          <label htmlFor="knn-k"
            style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", display: "block", marginBottom: 4 }}>
            k = <span style={{ color: "var(--txt-dim)" }}>{k}</span>
            {" · click canvas to place query point"}
          </label>
          <input id="knn-k" type="range" min={1} max={9} step={2} value={k}
            onChange={(e) => setK(parseInt(e.target.value, 10))}
            style={{ width: 160, accentColor: "var(--green)" }} />
        </div>
      )}
    </div>
  );
}

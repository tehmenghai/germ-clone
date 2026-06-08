"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  interactive?: boolean;
}

// Logical dimensions — the canvas backing store is scaled by dpr at runtime
const W = 720;
const H = 420;
const PAD = 36;
const IW = W - PAD * 2;
const IH = H - PAD * 2;

interface Point {
  x: number;
  y: number;
  label: 0 | 1;
}

const SEED_POINTS: Point[] = [
  { x: 0.18, y: 0.25, label: 0 }, { x: 0.22, y: 0.35, label: 0 },
  { x: 0.28, y: 0.18, label: 0 }, { x: 0.32, y: 0.42, label: 0 },
  { x: 0.15, y: 0.48, label: 0 }, { x: 0.38, y: 0.28, label: 0 },
  { x: 0.12, y: 0.62, label: 0 }, { x: 0.24, y: 0.58, label: 0 },
  { x: 0.62, y: 0.65, label: 1 }, { x: 0.72, y: 0.55, label: 1 },
  { x: 0.68, y: 0.75, label: 1 }, { x: 0.78, y: 0.68, label: 1 },
  { x: 0.58, y: 0.78, label: 1 }, { x: 0.82, y: 0.58, label: 1 },
  { x: 0.74, y: 0.82, label: 1 }, { x: 0.66, y: 0.42, label: 1 },
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
  const votes = sorted.slice(0, k).reduce((sum, p) => sum + p.label, 0);
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

    const dpr = window.devicePixelRatio || 1;
    // Size the backing buffer to physical pixels
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const style = getComputedStyle(document.documentElement);
    const green    = style.getPropertyValue("--green").trim()    || "#39ff7e";
    const amber    = style.getPropertyValue("--amber").trim()    || "#f0a500";
    const cyan     = style.getPropertyValue("--cyan").trim()     || "#7dd3fc";
    const lineSoft = style.getPropertyValue("--line-soft").trim()|| "rgba(100,130,100,0.3)";
    const txtDim   = style.getPropertyValue("--txt-dim").trim()  || "#aaa";
    const panelColor = style.getPropertyValue("--panel").trim()  || "#1e2b1e";

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = panelColor;
    ctx.fillRect(0, 0, W, H);

    // Decision boundary — finer cell for the larger canvas
    const cell = 4;
    for (let px = 0; px < W; px += cell) {
      for (let py = 0; py < H; py += cell) {
        const nx = (px - PAD) / IW;
        const ny = (py - PAD) / IH;
        if (nx < 0 || nx > 1 || ny < 0 || ny > 1) continue;
        const label = classify({ x: nx, y: ny }, SEED_POINTS, k);
        ctx.fillStyle = label === 0
          ? "oklch(0.83 0.11 195 / 0.09)"
          : "oklch(0.88 0.21 150 / 0.07)";
        ctx.fillRect(px, py, cell, cell);
      }
    }

    if (query) {
      const sorted = [...SEED_POINTS].sort((a, b) => dist(a, query) - dist(b, query));
      const knn = sorted.slice(0, k);
      const { cx: qx, cy: qy } = toCanvas(query.x, query.y);

      // Lines to neighbours
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = lineSoft;
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
      ctx.beginPath();
      ctx.arc(qx, qy, kthDist * IW, 0, Math.PI * 2);
      ctx.strokeStyle = lineSoft;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Data points
    for (const p of SEED_POINTS) {
      const { cx, cy } = toCanvas(p.x, p.y);
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = p.label === 0 ? cyan : green;
      ctx.fill();
      ctx.strokeStyle = "oklch(0 0 0 / 0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Query point
    if (query) {
      const { cx: qx, cy: qy } = toCanvas(query.x, query.y);
      const predicted = classify(query, SEED_POINTS, k);
      ctx.beginPath();
      ctx.arc(qx, qy, 9, 0, Math.PI * 2);
      ctx.fillStyle = predicted === 0 ? cyan : green;
      ctx.fill();
      ctx.strokeStyle = amber;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = amber;
      ctx.font = "bold 13px monospace";
      ctx.fillText(`? → class ${predicted}`, qx + 14, qy - 8);
    }

    // Legend
    const lx = PAD + 6;
    const legendItems: [string, string, number][] = [
      [cyan,  "Class 0", 0],
      [green, "Class 1", 1],
      [amber, "Query",   2],
    ];
    for (const [color, label, i] of legendItems) {
      const ly = PAD + 10 + i * 22;
      const r = label === "Query" ? 9 : 7;
      ctx.beginPath();
      ctx.arc(lx + 9, ly, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (label === "Query") {
        ctx.strokeStyle = amber;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.fillStyle = txtDim;
      ctx.font = "12px monospace";
      ctx.fillText(label, lx + 22, ly + 4);
    }

    // Title + hint
    ctx.fillStyle = txtDim;
    ctx.font = "11px monospace";
    ctx.fillText("KNN", PAD, 20);
    ctx.textAlign = "right";
    ctx.fillText("drag the control — it's live", W - PAD, 20);
    ctx.textAlign = "left";
  }, [k, query]);

  useEffect(() => { draw(); }, [draw]);

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Map CSS pixels → logical canvas coords (ignore dpr — CSS rect is in CSS px)
    const px = (e.clientX - rect.left) * (W / rect.width);
    const py = (e.clientY - rect.top)  * (H / rect.height);
    const nx = (px - PAD) / IW;
    const ny = (py - PAD) / IH;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return;
    setQuery({ x: nx, y: ny });
  }

  return (
    <div style={{ fontFamily: "var(--font-mono, monospace)" }}>
      <canvas
        ref={canvasRef}
        // CSS size: logical W×H — backing buffer set to W*dpr × H*dpr in draw()
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          cursor: interactive ? "crosshair" : "default",
          borderRadius: "var(--r-sm)",
          aspectRatio: `${W} / ${H}`,
        }}
        aria-label="k-Nearest Neighbours visualisation — click to place query point"
        role="img"
      />

      {interactive && (
        <div style={{ marginTop: 8, padding: "4px 4px" }}>
          <label
            htmlFor="knn-k"
            style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", display: "block", marginBottom: 4 }}
          >
            k = <span style={{ color: "var(--txt-dim)" }}>{k}</span>
            {" · click canvas to place query point"}
          </label>
          <input
            id="knn-k"
            type="range"
            min={1}
            max={9}
            step={2}
            value={k}
            onChange={(e) => setK(parseInt(e.target.value, 10))}
            style={{ width: 200, accentColor: "var(--green)" }}
          />
        </div>
      )}
    </div>
  );
}

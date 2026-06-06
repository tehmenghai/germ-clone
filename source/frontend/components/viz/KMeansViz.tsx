"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  interactive?: boolean;
}

const W = 480;
const H = 300;
const PAD = 24;

// Fixed seed points — three natural blobs, reproducible.
const SEED: [number, number][] = [
  [0.20, 0.25], [0.26, 0.32], [0.18, 0.38], [0.30, 0.22], [0.24, 0.45], [0.14, 0.30], [0.33, 0.40],
  [0.70, 0.28], [0.76, 0.35], [0.68, 0.20], [0.80, 0.30], [0.74, 0.46], [0.84, 0.38], [0.66, 0.40],
  [0.45, 0.75], [0.52, 0.80], [0.40, 0.70], [0.55, 0.68], [0.48, 0.85], [0.38, 0.82], [0.58, 0.78],
];

const PALETTE = ["var(--cyan)", "var(--amber)", "var(--green)", "#c98bff", "#ff8b8b"];

function toPx(nx: number, ny: number) {
  return { x: PAD + nx * (W - PAD * 2), y: PAD + ny * (H - PAD * 2) };
}
function dist(a: [number, number], b: [number, number]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function KMeansViz({ interactive = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [k, setK] = useState(3);
  const [centroids, setCentroids] = useState<[number, number][]>([]);
  const [iter, setIter] = useState(0);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const initCentroids = useCallback((kk: number): [number, number][] => {
    // deterministic spread so the demo is reproducible
    return Array.from({ length: kk }, (_, i) => [0.15 + (0.7 * i) / Math.max(1, kk - 1), 0.5] as [number, number]);
  }, []);

  const reset = useCallback((kk = k) => {
    if (timer.current) clearInterval(timer.current);
    setRunning(false);
    setIter(0);
    setCentroids(initCentroids(kk));
  }, [k, initCentroids]);

  // Re-init clustering only when k changes; `reset` is stable enough for this demo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reset(k); }, [k]);

  const assign = useCallback((cs: [number, number][]) =>
    SEED.map((p) => {
      let best = 0, bd = Infinity;
      cs.forEach((c, i) => { const d = dist(p, c); if (d < bd) { bd = d; best = i; } });
      return best;
    }), []);

  const step = useCallback(() => {
    setCentroids((cs) => {
      const labels = assign(cs);
      return cs.map((c, i) => {
        const pts = SEED.filter((_, j) => labels[j] === i);
        if (!pts.length) return c;
        const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
        const my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
        return [mx, my] as [number, number];
      });
    });
    setIter((n) => n + 1);
  }, [assign]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const cs = getComputedStyle(document.documentElement);
    const col = (v: string, fb: string) => cs.getPropertyValue(v).trim() || fb;
    const resolve = (c: string) => c.startsWith("var(") ? col(c.slice(4, -1), "#39ff7e") : c;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = col("--panel", "#1e2b1e"); ctx.fillRect(0, 0, W, H);

    const labels = centroids.length ? assign(centroids) : SEED.map(() => -1);
    SEED.forEach((p, i) => {
      const { x, y } = toPx(p[0], p[1]);
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = labels[i] >= 0 ? resolve(PALETTE[labels[i] % PALETTE.length]!) : col("--txt-faint", "#6a8a6a");
      ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;
    });
    centroids.forEach((c, i) => {
      const { x, y } = toPx(c[0], c[1]);
      ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7);
      ctx.strokeStyle = resolve(PALETTE[i % PALETTE.length]!); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.lineWidth = 1.5; ctx.stroke();
    });
  }, [centroids, assign]);

  useEffect(() => { draw(); }, [draw]);

  function playPause() {
    if (running) { if (timer.current) clearInterval(timer.current); setRunning(false); }
    else {
      setRunning(true);
      timer.current = setInterval(() => setIter((n) => { step(); if (n >= 8) { if (timer.current) clearInterval(timer.current); setRunning(false); } return n; }), 600);
    }
  }
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  return (
    <div style={{ fontFamily: "var(--font-mono, monospace)" }}>
      <canvas ref={canvasRef} width={W} height={H}
        style={{ width: "100%", height: "auto", display: "block", borderRadius: "var(--r-sm)" }}
        role="img" aria-label="k-means clustering animation" />
      {interactive && (
        <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={playPause} aria-label={running ? "Pause" : "Play"}
            style={{ fontSize: "var(--font-label)", padding: "4px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--bg-2)", color: "var(--green)", cursor: "pointer" }}>
            {running ? "■ Pause" : "▶ Iterate"}
          </button>
          <button onClick={() => step()} disabled={running}
            style={{ fontSize: "var(--font-label)", padding: "4px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--bg-2)", color: "var(--txt-dim)", cursor: running ? "not-allowed" : "pointer" }}>
            ▸ Step
          </button>
          <button onClick={() => reset()}
            style={{ fontSize: "var(--font-label)", padding: "4px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", background: "var(--bg-2)", color: "var(--txt-dim)", cursor: "pointer" }}>
            ↺ Reset
          </button>
          <span style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)" }}>iteration {iter}</span>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label htmlFor="km-k" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", display: "block", marginBottom: 2 }}>
              k = <span style={{ color: "var(--txt-dim)" }}>{k}</span>
            </label>
            <input id="km-k" type="range" min={2} max={5} step={1} value={k}
              onChange={(e) => setK(parseInt(e.target.value, 10))} style={{ width: "100%", accentColor: "var(--green)" }} />
          </div>
        </div>
      )}
    </div>
  );
}

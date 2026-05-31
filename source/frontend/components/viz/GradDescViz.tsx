"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  interactive?: boolean;
}

const W = 480;
const H = 280;
const PAD = { top: 28, right: 24, bottom: 48, left: 52 };
const IW = W - PAD.left - PAD.right;
const IH = H - PAD.top - PAD.bottom;

// Loss landscape: J(w) = (w - 1.4)² + 0.15*sin(5w) + 0.3
function loss(w: number) {
  return (w - 1.4) ** 2 + 0.15 * Math.sin(5 * w) + 0.3;
}

function gradLoss(w: number) {
  return 2 * (w - 1.4) + 0.15 * 5 * Math.cos(5 * w);
}

const W_MIN = -0.5;
const W_MAX = 3.2;
const W_RANGE = W_MAX - W_MIN;

function wToPixel(w: number) {
  return PAD.left + ((w - W_MIN) / W_RANGE) * IW;
}

function lossToPixel(l: number, maxL: number) {
  return PAD.top + IH - (l / maxL) * IH;
}

function buildLossCurve(steps = 120) {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const w = W_MIN + (i / steps) * W_RANGE;
    const l = loss(w);
    pts.push(`${wToPixel(w).toFixed(1)},${lossToPixel(l, 4).toFixed(1)}`);
  }
  return "M " + pts.join(" L ");
}

const lossCurve = buildLossCurve();

type Variant = "sgd" | "momentum" | "adam";

function runOptimiser(variant: Variant, lr: number, startW: number, steps: number) {
  const history: Array<{ w: number; l: number }> = [];
  let w = startW;
  let m = 0;
  let v = 0;
  const beta1 = 0.9;
  const beta2 = 0.999;
  const eps = 1e-8;

  for (let t = 1; t <= steps; t++) {
    const g = gradLoss(w);
    if (variant === "sgd") {
      w = w - lr * g;
    } else if (variant === "momentum") {
      m = beta1 * m + (1 - beta1) * g;
      w = w - lr * m;
    } else {
      m = beta1 * m + (1 - beta1) * g;
      v = beta2 * v + (1 - beta2) * g * g;
      const mHat = m / (1 - beta1 ** t);
      const vHat = v / (1 - beta2 ** t);
      w = w - lr * (mHat / (Math.sqrt(vHat) + eps));
    }
    history.push({ w, l: loss(w) });
  }
  return history;
}

const VARIANT_COLORS: Record<Variant, string> = {
  sgd: "var(--cyan)",
  momentum: "var(--amber)",
  adam: "var(--green)",
};

export function GradDescViz({ interactive = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lr, setLr] = useState(0.12);
  const [variant, setVariant] = useState<Variant>("adam");
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const START_W = -0.2;
  const TOTAL_STEPS = 30;
  const history = runOptimiser(variant, lr, START_W, TOTAL_STEPS);
  const maxLoss = 4;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const style = getComputedStyle(document.documentElement);
    const panelColor = style.getPropertyValue("--panel").trim() || "#1e2b1e";
    const lineColor = style.getPropertyValue("--line").trim() || "#3a5a3a";
    const txtFaint = style.getPropertyValue("--txt-faint").trim() || "#6a8a6a";
    const txtDim = style.getPropertyValue("--txt-dim").trim() || "#90b090";
    const green = style.getPropertyValue("--green").trim() || "#39ff7e";
    const amber = style.getPropertyValue("--amber").trim() || "#f0a500";
    const cyan = style.getPropertyValue("--cyan").trim() || "#7dd3fc";
    const varColor = variant === "sgd" ? cyan : variant === "momentum" ? amber : green;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = panelColor;
    ctx.fillRect(0, 0, W, H);

    // Grid
    [0, 1, 2, 3].forEach((l) => {
      const py = lossToPixel(l, maxLoss);
      ctx.beginPath();
      ctx.moveTo(PAD.left, py);
      ctx.lineTo(W - PAD.right, py);
      ctx.strokeStyle = lineColor + "66";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.fillStyle = txtFaint;
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.fillText(l.toFixed(0), PAD.left - 6, py + 4);
    });

    // Axes
    ctx.beginPath();
    ctx.moveTo(PAD.left, PAD.top);
    ctx.lineTo(PAD.left, H - PAD.bottom);
    ctx.moveTo(PAD.left, H - PAD.bottom);
    ctx.lineTo(W - PAD.right, H - PAD.bottom);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = txtDim;
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("w (weight)", PAD.left + IW / 2, H - 8);

    ctx.save();
    ctx.translate(12, PAD.top + IH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("J(w)", 0, 0);
    ctx.restore();

    // Loss curve
    const path2d = new Path2D(lossCurve);
    ctx.strokeStyle = txtDim;
    ctx.lineWidth = 1.5;
    ctx.stroke(path2d);

    // Gradient descent path up to current step
    const pts = history.slice(0, step + 1);
    if (pts.length > 0) {
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const px = wToPixel(pts[i]!.w);
        const py = lossToPixel(pts[i]!.l, maxLoss);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = varColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.stroke();

      // Dots
      for (const p of pts) {
        const px = wToPixel(p.w);
        const py = lossToPixel(p.l, maxLoss);
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = varColor;
        ctx.fill();
      }

      // Current dot (larger)
      const last = pts[pts.length - 1]!;
      const lpx = wToPixel(last.w);
      const lpy = lossToPixel(last.l, maxLoss);
      ctx.beginPath();
      ctx.arc(lpx, lpy, 6, 0, Math.PI * 2);
      ctx.fillStyle = varColor;
      ctx.fill();
      ctx.strokeStyle = "oklch(0 0 0 / 0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Step label
      ctx.fillStyle = varColor;
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`step ${step}  J=${last.l.toFixed(3)}  w=${last.w.toFixed(3)}`, lpx + 8, lpy - 6);
    }

    // Start marker
    ctx.beginPath();
    ctx.arc(wToPixel(START_W), lossToPixel(loss(START_W), maxLoss), 4, 0, Math.PI * 2);
    ctx.fillStyle = txtFaint;
    ctx.fill();

    // Legend
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    [["sgd", "SGD", cyan], ["momentum", "Momentum", amber], ["adam", "Adam", green]].forEach(([_v, label, color], i) => {
      ctx.fillStyle = color as string;
      ctx.fillRect(PAD.left + IW - 90, PAD.top + i * 16, 14, 2);
      ctx.fillStyle = txtDim;
      ctx.fillText(label as string, PAD.left + IW - 72, PAD.top + i * 16 + 5);
    });
  }, [step, variant, lr, history]);

  useEffect(() => { draw(); }, [draw]);

  function startStop() {
    if (running) {
      clearInterval(timerRef.current!);
      setRunning(false);
    } else {
      if (step >= TOTAL_STEPS) setStep(0);
      setRunning(true);
      timerRef.current = setInterval(() => {
        setStep((s) => {
          if (s >= TOTAL_STEPS) {
            clearInterval(timerRef.current!);
            setRunning(false);
            return s;
          }
          return s + 1;
        });
      }, 120);
    }
  }

  function reset() {
    clearInterval(timerRef.current!);
    setRunning(false);
    setStep(0);
  }

  useEffect(() => () => { clearInterval(timerRef.current!); }, []);

  return (
    <div style={{ fontFamily: "var(--font-mono, monospace)" }}>
      {interactive && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {(["sgd", "momentum", "adam"] as const).map((v) => (
            <button key={v} onClick={() => { setVariant(v); reset(); }} aria-pressed={variant === v}
              style={{
                fontSize: "var(--font-label)", padding: "3px 10px",
                borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                background: variant === v ? "var(--green)" : "transparent",
                color: variant === v ? "var(--on-green)" : "var(--txt-dim)",
                cursor: "pointer",
              }}>
              {v === "sgd" ? "SGD" : v === "momentum" ? "Momentum" : "Adam"}
            </button>
          ))}
        </div>
      )}

      <canvas ref={canvasRef} width={W} height={H}
        style={{ width: "100%", height: "auto", display: "block", borderRadius: "var(--r-sm)" }}
        aria-label="Gradient descent optimiser visualisation"
        role="img"
      />

      {interactive && (
        <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={startStop} aria-label={running ? "Pause" : "Play"}
            style={{
              fontSize: "var(--font-label)", padding: "4px 12px",
              borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
              background: "var(--bg-2)", color: "var(--green)", cursor: "pointer",
            }}>
            {running ? "■ Pause" : step >= TOTAL_STEPS ? "↺ Replay" : "▶ Play"}
          </button>
          <button onClick={reset} aria-label="Reset"
            style={{
              fontSize: "var(--font-label)", padding: "4px 12px",
              borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
              background: "var(--bg-2)", color: "var(--txt-dim)", cursor: "pointer",
            }}>
            ↺ Reset
          </button>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label htmlFor="gd-lr"
              style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", display: "block", marginBottom: 3 }}>
              lr = <span style={{ color: "var(--txt-dim)" }}>{lr.toFixed(3)}</span>
            </label>
            <input id="gd-lr" type="range" min={0.01} max={0.5} step={0.01} value={lr}
              onChange={(e) => { setLr(parseFloat(e.target.value)); reset(); }}
              style={{ width: "100%", accentColor: "var(--green)" }} />
          </div>
        </div>
      )}
    </div>
  );
}

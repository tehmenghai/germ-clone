"use client";

import type { EvalScores } from "@/lib/mock-stream";

interface GaugeProps {
  scores: EvalScores;
  pass: boolean;
}

export function Gauge({ scores, pass }: GaugeProps) {
  const mean = (scores.f + scores.r + scores.c) / 3;
  const pct = Math.round(mean * 100);

  return (
    <div
      className="flex flex-col gap-2"
      style={{
        padding: "10px 12px",
        background: "var(--bg-2)",
        borderRadius: "var(--r-md)",
        border: "1px solid var(--line)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", letterSpacing: "0.08em" }}>
          EVAL
        </span>
        <span
          className="font-mono font-semibold"
          style={{ fontSize: "var(--font-label)", color: pass ? "var(--green)" : "var(--amber)", letterSpacing: "0.06em" }}
        >
          {pass ? "PASS" : "RELOOP"}
        </span>
      </div>

      {/* Bar */}
      <div style={{ height: 4, background: "var(--line)", borderRadius: 2, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: pass ? "var(--green)" : "var(--amber)",
            borderRadius: 2,
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {/* Metric row */}
      <div className="flex justify-between font-mono" style={{ fontSize: "var(--font-label)", color: "var(--txt-dim)" }}>
        <span>F {(scores.f * 100).toFixed(0)}</span>
        <span>R {(scores.r * 100).toFixed(0)}</span>
        <span>C {(scores.c * 100).toFixed(0)}</span>
        <span style={{ color: "var(--txt-faint)" }}>{pct}%</span>
      </div>
    </div>
  );
}

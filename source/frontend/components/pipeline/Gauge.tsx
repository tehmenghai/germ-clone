"use client";

import type { EvalScores } from "@/lib/mock-stream";

interface GaugeProps {
  scores: EvalScores;
  pass: boolean;
}

// Matches handoff: conic-gradient ring (74x74) + 3 horizontal metric bars
export function Gauge({ scores, pass }: GaugeProps) {
  const mean = (scores.f + scores.r + scores.c) / 3;
  const pct = Math.round(mean * 100);

  const bars: Array<{ label: string; val: number }> = [
    { label: "faithfulness", val: scores.f },
    { label: "relevance",    val: scores.r },
    { label: "completeness", val: scores.c },
  ];

  return (
    <div
      style={{
        padding: "14px 16px",
        background: "var(--bg-2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Conic-gradient ring */}
        <div
          aria-label={`Score ${pct}%`}
          style={{
            width: 74,
            height: 74,
            borderRadius: "50%",
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            background: `conic-gradient(var(--green) ${pct}%, var(--line-soft) 0)`,
            position: "relative",
            transition: "background 0.6s",
          }}
        >
          {/* Inner fill to create donut */}
          <div style={{
            position: "absolute",
            inset: 8,
            borderRadius: "50%",
            background: "var(--bg-2)",
          }} />
          <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
            <strong style={{ fontSize: 18, color: "var(--green)", fontWeight: 700, display: "block" }}>
              {pct}
            </strong>
            <small style={{ fontSize: 8, color: "var(--txt-faint)", display: "block" }}>
              {pass ? "PASS" : "RELOOP"}
            </small>
          </div>
        </div>

        {/* Three metric bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}>
          {bars.map((b) => {
            const barPct = Math.round(b.val * 100);
            const low = barPct < 80;
            return (
              <div key={b.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--txt-dim)", marginBottom: 3 }}>
                  <span>{b.label}</span>
                  <strong style={{ color: "var(--txt)" }}>{barPct}</strong>
                </div>
                <div style={{ height: 6, borderRadius: 5, background: "var(--line-soft)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${barPct}%`,
                    borderRadius: 5,
                    background: low
                      ? "linear-gradient(90deg, var(--amber), var(--amber))"
                      : "linear-gradient(90deg, var(--green-deep), var(--green))",
                    transition: "width 0.6s",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!pass && (
        <p style={{ fontSize: 10, color: "var(--txt-faint)", marginTop: 10, lineHeight: 1.6 }}>
          <span style={{ color: "var(--amber)" }}>mean {pct}%</span> — below 0.80 threshold, triggered re-retrieve
        </p>
      )}
    </div>
  );
}

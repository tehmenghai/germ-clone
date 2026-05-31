"use client";

import type { StageEvent, EvalScores } from "@/lib/mock-stream";

const PIPE_STAGES = [
  { key: "route",     name: "Route",              icon: "⟁" },
  { key: "rewrite",   name: "Rewrite",            icon: "✎" },
  { key: "retrieve1", name: "Retrieve · hop 1",   icon: "⛁" },
  { key: "react",     name: "ReAct",              icon: "◈" },
  { key: "reflect",   name: "Reflect / Correct",  icon: "◎" },
  { key: "evaluate1", name: "Evaluate · pass 1",  icon: "▦" },
  { key: "retrieve2", name: "Re-retrieve · hop 2",icon: "⛁" },
  { key: "evaluate2", name: "Evaluate · pass 2",  icon: "▦" },
  { key: "compose",   name: "Compose answer",     icon: "✦" },
] as const;

// Nodes shown in the graph — evaluate maps to evaluate2 per handoff spec
const NODES = [
  { k: "route",     label: "Route",    icon: "⟁", x: 11, y: 26, amber: false },
  { k: "rewrite",   label: "Rewrite",  icon: "✎", x: 31, y: 26, amber: false },
  { k: "retrieve1", label: "Retrieve", icon: "⛁", x: 54, y: 24, amber: false },
  { k: "react",     label: "ReAct",   icon: "◈", x: 60, y: 62, amber: false },
  { k: "reflect",   label: "Reflect",  icon: "◎", x: 32, y: 64, amber: true  },
  { k: "evaluate2", label: "Evaluate", icon: "▦", x: 82, y: 46, amber: true  },
] as const;

type NodeKey = typeof NODES[number]["k"];

interface RagGraphPanelProps {
  open: boolean;
  onClose: () => void;
  events: StageEvent[];
  activeIdx: number;
}

function mean(s: EvalScores) { return (s.f + s.r + s.c) / 3; }

function Gauge({ scores, small }: { scores: EvalScores | null; small?: boolean }) {
  const s = scores ?? { f: 0, r: 0, c: 0 };
  const pct = Math.round(mean(s) * 100);
  const pass = mean(s) >= 0.80;
  const sz = small ? 52 : 70;
  const color = pass ? "var(--green)" : "var(--amber)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: small ? 6 : 10 }}>
      <div
        style={{
          width: sz,
          height: sz,
          borderRadius: "50%",
          background: `conic-gradient(${color} ${pct}%, var(--line-soft) 0)`,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: sz - 14,
            height: sz - 14,
            borderRadius: "50%",
            background: "var(--panel)",
            display: "grid",
            placeItems: "center",
            flexDirection: "column",
          }}
        >
          <span style={{ fontSize: small ? 12 : 16, fontWeight: 600, color, lineHeight: 1 }}>{pct}</span>
          {!small && <span style={{ fontSize: 8, color: "var(--txt-faint)" }}>score</span>}
        </div>
      </div>
      {!small && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 110 }}>
          {([ ["faithfulness", s.f], ["relevance", s.r], ["completeness", s.c] ] as const).map(([name, val]) => (
            <div key={name}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--txt-faint)", marginBottom: 2 }}>
                <span>{name}</span><b style={{ color: val < 0.80 ? "var(--amber)" : "var(--green)" }}>{val.toFixed(2)}</b>
              </div>
              <div style={{ height: 3, background: "var(--line-soft)", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${val * 100}%`, background: val < 0.80 ? "var(--amber)" : "var(--green)", borderRadius: 2, transition: "width 600ms" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RagGraphPanel({ open, onClose, events, activeIdx }: RagGraphPanelProps) {
  if (!open) return null;

  const idxOf = (k: string) => PIPE_STAGES.findIndex((s) => s.key === k);
  const reloopFired = activeIdx >= idxOf("retrieve2") && activeIdx >= 0;
  const lastEval = [...events].reverse().find((e) => e.stage.startsWith("evaluate") && e.scores);
  const evalScores = lastEval?.scores ?? null;
  const done = activeIdx >= PIPE_STAGES.length - 1;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 30,
          background: "oklch(0 0 0 / 0.35)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="RAG agent pipeline graph"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: 268,
          zIndex: 31,
          background: "color-mix(in oklab, var(--bg) 94%, transparent)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid var(--line)",
          animation: "slideup 320ms cubic-bezier(.4,0,.2,1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 38,
            padding: "0 16px",
            borderBottom: "1px solid var(--line-soft)",
            flexShrink: 0,
            gap: 8,
          }}
        >
          <span style={{ fontSize: 10, letterSpacing: "1.4px", textTransform: "uppercase", color: "var(--txt-faint)", flex: 1 }}>
            ◷ RAG agent pipeline
          </span>
          {lastEval?.scores && (
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)", color: lastEval.verdict?.startsWith("PASS") ? "var(--green)" : "var(--amber)" }}>
              f:{lastEval.scores.f.toFixed(2)} · r:{lastEval.scores.r.toFixed(2)} · c:{lastEval.scores.c.toFixed(2)} → {lastEval.verdict}
            </span>
          )}
          <button
            onClick={onClose}
            aria-label="Close RAG graph panel"
            style={{ background: "transparent", border: "none", color: "var(--txt-faint)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "2px 4px" }}
          >
            ✕
          </button>
        </div>

        {/* Graph area */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>

          {/* SVG edges — viewBox matches handoff pixel paths */}
          <svg
            viewBox="0 0 900 230"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          >
            <g stroke="var(--line)" strokeWidth="1.5" fill="none">
              {/* Route → Rewrite */}
              <path d="M110,60 C170,60 175,60 250,58"/>
              {/* Rewrite → Retrieve */}
              <path d="M310,58 C380,58 400,54 470,52"/>
              {/* Retrieve → ReAct */}
              <path d="M520,62 C560,88 560,128 540,154"/>
              {/* ReAct → Reflect */}
              <path d="M470,174 C400,192 350,188 310,168"/>
              {/* Reflect → back up (visual loop) */}
              <path d="M260,154 C230,128 235,96 255,78"/>
              {/* ReAct → Evaluate */}
              <path d="M560,158 C660,158 700,128 740,116"/>
            </g>
            {/* Re-retrieve reloop — amber, animated when fired */}
            <path
              d="M540,178 C620,228 360,248 175,86"
              fill="none"
              stroke="var(--amber)"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              opacity={reloopFired ? 1 : 0.25}
              style={reloopFired ? { animation: "dashMarch 1s linear infinite" } : undefined}
            />
          </svg>

          {/* Nodes */}
          {NODES.map((node) => {
            const stageIdx = idxOf(node.k);
            const on = activeIdx >= stageIdx && activeIdx >= 0;
            const active = activeIdx === stageIdx;
            const borderColor = active
              ? "var(--green-deep)"
              : on
              ? (node.amber ? "var(--amber)" : "var(--green)")
              : "var(--line)";
            const bg = active
              ? "color-mix(in oklab, var(--green-deep) 18%, var(--panel))"
              : on && node.amber
              ? "color-mix(in oklab, var(--amber) 10%, var(--panel))"
              : "var(--panel)";

            return (
              <div
                key={node.k}
                style={{
                  position: "absolute",
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: "translate(-50%, -50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    border: `1.5px solid ${borderColor}`,
                    background: bg,
                    boxShadow: active ? "var(--glow)" : on ? `0 0 6px color-mix(in oklab, ${node.amber ? "var(--amber)" : "var(--green)"} 30%, transparent)` : "none",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 16,
                    transition: "border-color 0.25s, background 0.25s, box-shadow 0.25s",
                    animation: active ? "nodePulse 1s ease-in-out infinite" : "none",
                    opacity: on ? 1 : 0.35,
                  }}
                >
                  {on && !active ? (
                    <span style={{ color: node.amber ? "var(--amber)" : "var(--green)", fontSize: 13 }}>✓</span>
                  ) : (
                    <span style={{ color: active ? "var(--green)" : node.amber ? "var(--amber)" : "var(--txt-dim)" }}>{node.icon}</span>
                  )}
                </div>
                <span style={{ fontSize: 9, color: on ? "var(--txt-dim)" : "var(--txt-faint)", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
                  {node.label.toUpperCase()}
                </span>
              </div>
            );
          })}

          {/* Mini gauge badge — top-right, per handoff §4b */}
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 14,
              opacity: evalScores ? 1 : 0.3,
              transition: "opacity 0.4s",
            }}
          >
            <Gauge scores={evalScores} small />
          </div>
        </div>
      </aside>
    </>
  );
}

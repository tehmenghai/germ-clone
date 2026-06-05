"use client";

import type { StageEvent, EvalScores } from "@/lib/mock-stream";

const PIPE_STAGES = [
  { key: "route",     name: "Route",             icon: "⟁" },
  { key: "rewrite",   name: "Rewrite",           icon: "✎" },
  { key: "retrieve1", name: "Retrieve · hop 1",  icon: "⛁" },
  { key: "react",     name: "ReAct",             icon: "◈" },
  { key: "reflect",   name: "Reflect",           icon: "◎" },
  { key: "evaluate1", name: "Eval · pass 1",     icon: "▦" },
  { key: "retrieve2", name: "Re-retrieve",       icon: "⛁" },
  { key: "evaluate2", name: "Eval · pass 2",     icon: "▦" },
  { key: "compose",   name: "Compose",           icon: "✦" },
] as const;

type StageKey = typeof PIPE_STAGES[number]["key"];

// Happy-path left-to-right lane (indices into PIPE_STAGES)
// retrieve2 / evaluate2 sit in a second row (reloop lane)
const MAIN_LANE:  StageKey[] = ["route", "rewrite", "retrieve1", "react", "reflect", "evaluate1", "compose"];
const RELOOP_LANE: StageKey[] = ["retrieve2", "evaluate2"];

function stageIdx(k: string) { return PIPE_STAGES.findIndex((s) => s.key === k); }
function mean(s: EvalScores) { return (s.f + s.r + s.c) / 3; }

interface RagGraphPanelProps {
  open: boolean;
  onClose: () => void;
  events: StageEvent[];
  activeIdx: number;
}

function MiniGauge({ scores }: { scores: EvalScores | null }) {
  const s = scores ?? { f: 0, r: 0, c: 0 };
  const pct = Math.round(mean(s) * 100);
  const pass = mean(s) >= 0.80;
  const color = pass ? "var(--green)" : "var(--amber)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 120 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: `conic-gradient(${color} ${pct}%, var(--line-soft) 0)`,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--bg)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color, lineHeight: 1 }}>{pct}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {([["f", s.f], ["r", s.r], ["c", s.c]] as const).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 9, color: "var(--txt-faint)", minWidth: 8 }}>{k}</span>
              <div style={{ width: 56, height: 3, background: "var(--line-soft)", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${v * 100}%`, background: v < 0.80 ? "var(--amber)" : "var(--green)", borderRadius: 2, transition: "width 500ms" }} />
              </div>
              <span style={{ fontSize: 9, color: v < 0.80 ? "var(--amber)" : "var(--green)", minWidth: 26 }}>{v.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Node({ stageKey, label, icon, activeIdx, amber }: {
  stageKey: StageKey; label: string; icon: string; activeIdx: number; amber?: boolean;
}) {
  const idx = stageIdx(stageKey);
  const on = activeIdx >= idx && activeIdx >= 0;
  const active = activeIdx === idx;
  const accent = amber ? "var(--amber)" : "var(--green)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          border: `1.5px solid ${active ? "var(--green-deep)" : on ? accent : "var(--line)"}`,
          background: active
            ? "color-mix(in oklab, var(--green-deep) 22%, var(--panel))"
            : on && amber
            ? "color-mix(in oklab, var(--amber) 12%, var(--panel))"
            : on
            ? "color-mix(in oklab, var(--green) 8%, var(--panel))"
            : "var(--panel)",
          boxShadow: active
            ? "var(--glow)"
            : on
            ? `0 0 8px color-mix(in oklab, ${accent} 35%, transparent)`
            : "none",
          display: "grid",
          placeItems: "center",
          fontSize: 16,
          opacity: on ? 1 : 0.3,
          transition: "border-color 0.25s, background 0.25s, box-shadow 0.25s, opacity 0.25s",
          animation: active ? "nodePulse 1s ease-in-out infinite" : "none",
          flexShrink: 0,
        }}
      >
        {on && !active
          ? <span style={{ color: accent, fontSize: 13, fontWeight: 700 }}>✓</span>
          : <span style={{ color: active ? "var(--green)" : amber ? "var(--amber)" : "var(--txt-dim)" }}>{icon}</span>
        }
      </div>
      <span style={{
        fontSize: 8.5,
        letterSpacing: "0.6px",
        textTransform: "uppercase",
        color: on ? "var(--txt-dim)" : "var(--txt-faint)",
        whiteSpace: "nowrap",
        transition: "color 0.25s",
      }}>
        {label}
      </span>
    </div>
  );
}

function Connector({ active, amber, dashed, vertical }: {
  active: boolean; amber?: boolean; dashed?: boolean; vertical?: boolean;
}) {
  const color = active ? (amber ? "var(--amber)" : "var(--green-deep)") : "var(--line)";
  return vertical ? (
    <div style={{
      width: 1.5,
      height: 20,
      background: dashed ? "none" : color,
      borderLeft: dashed ? `1.5px dashed ${color}` : undefined,
      opacity: active ? 1 : 0.35,
      alignSelf: "center",
      flexShrink: 0,
      transition: "background 0.25s, border-color 0.25s",
    }} />
  ) : (
    <div style={{
      height: 1.5,
      width: 20,
      background: dashed ? "none" : color,
      borderTop: dashed ? `1.5px dashed ${color}` : undefined,
      opacity: active ? 1 : 0.35,
      alignSelf: "center",
      flexShrink: 0,
      transition: "background 0.25s, border-color 0.25s",
    }} />
  );
}

export function RagGraphPanel({ open, onClose, events, activeIdx }: RagGraphPanelProps) {
  if (!open) return null;

  const reloopFired = activeIdx >= stageIdx("retrieve2") && activeIdx >= 0;
  const lastEval = [...events].reverse().find((e) => e.stage.startsWith("evaluate") && e.scores);
  const evalScores = lastEval?.scores ?? null;

  // Which connectors are "lit"
  function edgeOn(fromKey: StageKey, toKey: StageKey) {
    return activeIdx >= stageIdx(toKey);
  }

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
          background: "oklch(0 0 0 / 0.40)",
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
          zIndex: 31,
          background: "color-mix(in oklab, var(--bg) 96%, transparent)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
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
            padding: "0 18px",
            borderBottom: "1px solid var(--line-soft)",
            flexShrink: 0,
            gap: 10,
          }}
        >
          <span style={{ fontSize: 10, letterSpacing: "1.4px", textTransform: "uppercase", color: "var(--txt-faint)", flex: 1 }}>
            ◷ RAG agent pipeline
          </span>
          {lastEval?.scores && (
            <span style={{
              fontSize: 11,
              fontFamily: "var(--font-mono, monospace)",
              color: lastEval.verdict?.startsWith("PASS") ? "var(--green)" : "var(--amber)",
            }}>
              f:{lastEval.scores.f.toFixed(2)} · r:{lastEval.scores.r.toFixed(2)} · c:{lastEval.scores.c.toFixed(2)}
              {" → "}
              <strong>{lastEval.verdict}</strong>
            </span>
          )}
          <button
            onClick={onClose}
            aria-label="Close RAG pipeline"
            style={{ background: "transparent", border: "none", color: "var(--txt-faint)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "2px 6px" }}
          >
            ✕
          </button>
        </div>

        {/* Graph + gauge row */}
        <div style={{ display: "flex", alignItems: "center", padding: "18px 28px", gap: 28, overflowX: "auto" }}>

          {/* ── Main lane (left→right, no crossings) ── */}
          <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {MAIN_LANE.map((k, i) => {
              const stage = PIPE_STAGES.find((s) => s.key === k)!;
              const amber = k === "reflect";
              const isLast = i === MAIN_LANE.length - 1;
              return (
                <div key={k} style={{ display: "flex", alignItems: "center" }}>
                  <Node stageKey={k} label={stage.name} icon={stage.icon} activeIdx={activeIdx} amber={amber} />
                  {!isLast && (
                    <Connector
                      active={edgeOn(k, MAIN_LANE[i + 1])}
                      amber={amber}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Divider ── */}
          <div style={{ width: 1, height: 80, background: "var(--line-soft)", flexShrink: 0 }} />

          {/* ── Reloop lane (vertical, amber) ── */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, flexShrink: 0 }}>
            <span style={{ fontSize: 8.5, letterSpacing: "1px", textTransform: "uppercase", color: reloopFired ? "var(--amber)" : "var(--txt-faint)", marginBottom: 6, transition: "color 0.3s" }}>
              reloop
            </span>
            {RELOOP_LANE.map((k, i) => {
              const stage = PIPE_STAGES.find((s) => s.key === k)!;
              const isLast = i === RELOOP_LANE.length - 1;
              return (
                <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Node stageKey={k} label={stage.name} icon={stage.icon} activeIdx={activeIdx} amber />
                  {!isLast && <Connector active={reloopFired && edgeOn(k, RELOOP_LANE[i + 1])} amber vertical />}
                </div>
              );
            })}
          </div>

          {/* ── Divider ── */}
          <div style={{ width: 1, height: 80, background: "var(--line-soft)", flexShrink: 0 }} />

          {/* ── Eval gauge ── */}
          <div style={{
            flexShrink: 0,
            opacity: evalScores ? 1 : 0.25,
            transition: "opacity 0.4s",
          }}>
            <MiniGauge scores={evalScores} />
          </div>
        </div>

        {/* Stage detail bar — shows detail text of the active event */}
        {events.length > 0 && activeIdx >= 0 && activeIdx < events.length && (
          <div style={{
            flexShrink: 0,
            borderTop: "1px solid var(--line-soft)",
            padding: "6px 28px",
            fontSize: 11,
            fontFamily: "var(--font-mono, monospace)",
            color: "var(--txt-dim)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <span style={{ color: "var(--txt-faint)" }}>{PIPE_STAGES[activeIdx]?.name ?? ""}</span>
            <span style={{ color: "var(--line-soft)" }}>·</span>
            <span>{events[activeIdx]?.detail ?? events[activeIdx]?.status ?? ""}</span>
          </div>
        )}
      </aside>
    </>
  );
}

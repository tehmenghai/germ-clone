"use client";

import { useState, useCallback } from "react";
import type { ViewMode, Difficulty } from "@/components/shell/Header";
import { Header } from "@/components/shell/Header";
import { Composer } from "@/components/shell/Composer";
import { ProfilePicker, type Profile } from "@/components/shell/ProfilePicker";
import { PipelineRail } from "@/components/pipeline/PipelineRail";
import { MLWorkspace } from "@/components/workspace/MLWorkspace";
import { SettingsDrawer } from "@/components/settings/SettingsDrawer";
import { AnswerProse } from "@/components/workspace/AnswerProse";
import { ConsoleChips } from "@/components/workspace/ConsoleChips";
import { VizPanel } from "@/components/viz/VizPanel";
import { mockStream, type StageEvent } from "@/lib/mock-stream";
import { DigitalRain } from "@/components/fx/DigitalRain";

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("red-pill");
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const handleAsk = useCallback(async (q: string) => {
    setQuery(q);
    setEvents([]);
    setIsRunning(true);

    try {
      for await (const event of mockStream(q)) {
        setEvents((prev) => {
          // Replace existing event for same stage+status or append
          const idx = prev.findIndex((e) => e.stage === event.stage);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = event;
            return next;
          }
          return [...prev, event];
        });
      }
    } finally {
      setIsRunning(false);
    }
  }, []);

  if (!profile) {
    return <ProfilePicker onSelect={setProfile} />;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      <Header
        viewMode={viewMode}
        onViewMode={setViewMode}
        difficulty={difficulty}
        onDifficulty={setDifficulty}
        onSettings={() => setSettingsOpen(true)}
      />

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {viewMode === "red-pill" ? (
          <RealityLayout
            events={events}
            isRunning={isRunning}
            query={query}
          />
        ) : (
          <MatrixLayout
            events={events}
            isRunning={isRunning}
            query={query}
          />
        )}
      </div>

      <Composer onSubmit={handleAsk} isRunning={isRunning} />

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function RealityLayout({ events, isRunning, query }: {
  events: StageEvent[];
  isRunning: boolean;
  query: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "minmax(380px, 44fr) 56fr",
        overflow: "hidden",
      }}
    >
      <PipelineRail events={events} isRunning={isRunning} />
      <MLWorkspace events={events} isRunning={isRunning} query={query} />
    </div>
  );
}

const STAGE_LABEL: Record<string, string> = {
  route: "ROUTE", rewrite: "REWRITE", retrieve1: "RETRIEVE·1", react: "REACT",
  reflect: "REFLECT", evaluate1: "EVAL·1", retrieve2: "RETRIEVE·2", evaluate2: "EVAL·2", compose: "COMPOSE",
};

function MatrixLayout({ events, isRunning, query }: {
  events: StageEvent[];
  isRunning: boolean;
  query: string;
}) {
  const composeEvent = events.find((e) => e.stage === "compose" && e.status === "done");

  // Coverage bar: mean of the last eval's f/r/c scores
  const lastEval = [...events].reverse().find((e) => e.stage.startsWith("evaluate") && e.scores);
  const coverage = lastEval?.scores
    ? (lastEval.scores.f + lastEval.scores.r + lastEval.scores.c) / 3
    : null;
  const pass = lastEval?.verdict?.startsWith("PASS") ?? false;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg)",
        position: "relative",
      }}
    >
      {/* Digital rain — fixed full-viewport canvas behind content */}
      <DigitalRain />

      {/* Coverage bar — pinned to top once eval fires */}
      {coverage !== null && (
        <div
          style={{
            flexShrink: 0,
            position: "relative",
            zIndex: 2,
            padding: "6px 20px",
            background: "var(--glass-bg)",
            backdropFilter: `blur(var(--glass-blur))`,
            WebkitBackdropFilter: `blur(var(--glass-blur))`,
            borderBottom: "1px solid var(--line-soft)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          <span style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", letterSpacing: "0.08em", minWidth: 70 }}>
            COVERAGE
          </span>
          <div style={{ flex: 1, maxWidth: 200, height: 4, background: "var(--line)", borderRadius: 2, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.round(coverage * 100)}%`,
                background: pass ? "var(--green)" : "var(--amber)",
                borderRadius: 2,
                transition: "width 0.5s ease",
              }}
            />
          </div>
          <span style={{ fontSize: "var(--font-label)", color: pass ? "var(--green)" : "var(--amber)", minWidth: 36 }}>
            {Math.round(coverage * 100)}%
          </span>
          {lastEval?.scores && (
            <span style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)" }}>
              f:{lastEval.scores.f.toFixed(2)} r:{lastEval.scores.r.toFixed(2)} c:{lastEval.scores.c.toFixed(2)}
            </span>
          )}
          <span
            style={{
              fontSize: "var(--font-label)",
              fontWeight: 600,
              color: pass ? "var(--green)" : "var(--amber)",
              letterSpacing: "0.06em",
            }}
          >
            {pass ? "PASS" : "RELOOP"}
          </span>
        </div>
      )}

      {/* Scrollable body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          fontFamily: "var(--font-mono, monospace)",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Terminal header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ color: "var(--green)", fontSize: "var(--font-label)", letterSpacing: "0.1em" }}>
            germ//clone
          </span>
          <span style={{ color: "var(--txt-faint)", fontSize: "var(--font-label)" }}>terminal</span>
          <span style={{ color: "var(--line)", fontSize: "var(--font-label)" }}>——</span>
          <span style={{ color: "var(--txt-faint)", fontSize: "var(--font-label)" }}>agentic RAG</span>
        </div>

        {/* Query line */}
        {query && (
          <div style={{ marginBottom: 12, display: "flex", gap: 6 }}>
            <span style={{ color: "var(--green)", fontSize: "var(--font-code)" }}>›</span>
            <span style={{ color: "var(--txt)", fontSize: "var(--font-base)" }}>{query}</span>
          </div>
        )}

        {/* Stage chips */}
        {events.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
            {events.map((ev, i) => {
              const isEval = ev.stage.startsWith("evaluate");
              const statusColor =
                ev.status === "done"
                  ? (isEval && ev.verdict?.startsWith("BELOW") ? "var(--amber)" : "var(--green)")
                  : ev.status === "active"
                  ? "var(--amber)"
                  : "var(--txt-faint)";
              return (
                <span
                  key={i}
                  title={ev.detail ?? ev.verdict ?? ev.stage}
                  className="stage-chip"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 7px",
                    borderRadius: "var(--r-sm)",
                    border: `1px solid ${statusColor}`,
                    fontSize: "var(--font-label)",
                    color: statusColor,
                    letterSpacing: "0.05em",
                    background: `${statusColor}10`,
                  }}
                >
                  {ev.status === "done" && !ev.verdict?.startsWith("BELOW") ? "✓" : ev.status === "active" ? "▶" : "○"}
                  {" "}
                  {STAGE_LABEL[ev.stage] ?? ev.stage.toUpperCase()}
                  {ev.scores && (
                    <span style={{ color: "var(--txt-faint)", fontSize: 9 }}>
                      {" "}{Math.round(((ev.scores.f + ev.scores.r + ev.scores.c) / 3) * 100)}%
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {/* Stage log lines */}
        <div style={{ marginBottom: 16 }}>
          {events.map((ev, i) => (
            <div key={i} style={{ marginBottom: 3, fontSize: "var(--font-code)", display: "flex", gap: 8 }}>
              <span style={{ color: "var(--txt-faint)", minWidth: 90 }}>[{ev.stage}]</span>
              <span style={{
                color: ev.status === "done"
                  ? (ev.verdict?.startsWith("BELOW") ? "var(--amber)" : "var(--green)")
                  : ev.status === "active"
                  ? "var(--amber)"
                  : "var(--txt-dim)",
                minWidth: 48,
              }}>
                {ev.status}
              </span>
              {ev.detail && <span style={{ color: "var(--txt-dim)" }}>{ev.detail}</span>}
              {ev.scores && (
                <span style={{ color: "var(--txt-faint)" }}>
                  f:{ev.scores.f.toFixed(2)} r:{ev.scores.r.toFixed(2)} c:{ev.scores.c.toFixed(2)} → {ev.verdict}
                </span>
              )}
            </div>
          ))}
          {isRunning && (
            <div style={{ color: "var(--amber)", fontSize: "var(--font-code)", marginTop: 4 }}>
              <span role="status" aria-label="Pipeline running">▌</span>
            </div>
          )}
        </div>

        {/* Answer — glass panel */}
        {composeEvent?.answer_md && (
          <div
            style={{
              marginTop: 4,
              padding: "16px 18px",
              borderRadius: "var(--r-lg)",
              border: "1px solid var(--line-soft)",
              background: "var(--glass-bg)",
              backdropFilter: `blur(var(--glass-blur))`,
              WebkitBackdropFilter: `blur(var(--glass-blur))`,
              boxShadow: "var(--shadow)",
            }}
          >
            <AnswerProse
              markdown={composeEvent.answer_md}
              citations={composeEvent.citations ?? []}
            />
            <ConsoleChips />
          </div>
        )}

        {composeEvent && (
          <div
            style={{
              marginTop: 10,
              borderRadius: "var(--r-lg)",
              border: "1px solid var(--line-soft)",
              background: "var(--glass-bg)",
              backdropFilter: `blur(var(--glass-blur))`,
              WebkitBackdropFilter: `blur(var(--glass-blur))`,
              overflow: "hidden",
            }}
          >
            <VizPanel query={query} />
          </div>
        )}
      </div>
    </div>
  );
}

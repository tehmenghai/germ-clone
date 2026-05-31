"use client";

import { useState, useCallback } from "react";
import type { ViewMode, Difficulty } from "@/components/shell/Header";
import { Header } from "@/components/shell/Header";
import { Composer } from "@/components/shell/Composer";
import { ProfilePicker, type Profile } from "@/components/shell/ProfilePicker";
import { PipelineRail } from "@/components/pipeline/PipelineRail";
import { MLWorkspace } from "@/components/workspace/MLWorkspace";
import { SettingsDrawer } from "@/components/settings/SettingsDrawer";
import { mockStream, type StageEvent } from "@/lib/mock-stream";

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("reality");
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
        {viewMode === "reality" ? (
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

function MatrixLayout({ events, isRunning, query }: {
  events: StageEvent[];
  isRunning: boolean;
  query: string;
}) {
  const composeEvent = events.find((e) => e.stage === "compose" && e.status === "done");

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      {/* Terminal trace panel */}
      <div
        style={{
          flex: 1,
          overflow: "y-auto",
          padding: "16px 20px",
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <span style={{ color: "var(--green)", fontSize: "var(--font-label)" }}>
            germ//clone terminal
          </span>
        </div>

        {query && (
          <div style={{ marginBottom: 8 }}>
            <span style={{ color: "var(--txt-faint)", fontSize: "var(--font-label)" }}>$ </span>
            <span style={{ color: "var(--txt)", fontSize: "var(--font-base)" }}>{query}</span>
          </div>
        )}

        {events.map((ev, i) => (
          <div key={i} style={{ marginBottom: 4, fontSize: "var(--font-code)" }}>
            <span style={{ color: "var(--txt-faint)" }}>[{ev.stage}] </span>
            <span style={{ color: ev.status === "done" ? "var(--green)" : ev.status === "active" ? "var(--amber)" : "var(--txt-dim)" }}>
              {ev.status}
            </span>
            {ev.detail && <span style={{ color: "var(--txt-dim)" }}> — {ev.detail}</span>}
            {ev.scores && (
              <span style={{ color: "var(--txt-faint)" }}>
                {" "}f:{ev.scores.f.toFixed(2)} r:{ev.scores.r.toFixed(2)} c:{ev.scores.c.toFixed(2)} → {ev.verdict}
              </span>
            )}
          </div>
        ))}

        {isRunning && (
          <div style={{ color: "var(--amber)", fontSize: "var(--font-code)" }}>
            <span role="status" aria-label="Pipeline running">▌</span>
          </div>
        )}

        {composeEvent?.answer_md && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              color: "var(--txt)",
              fontSize: "var(--font-base)",
              whiteSpace: "pre-wrap",
            }}
          >
            {composeEvent.answer_md}
          </div>
        )}
      </div>
    </div>
  );
}

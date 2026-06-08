"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ViewMode, Difficulty } from "@/components/shell/Header";
import { Header } from "@/components/shell/Header";
import { Convo, type ConvoMessage } from "@/components/shell/Convo";
import { ProfilePicker, type Profile } from "@/components/shell/ProfilePicker";
import { PipelineRail } from "@/components/pipeline/PipelineRail";
import { MLWorkspace } from "@/components/workspace/MLWorkspace";
import { SettingsDrawer } from "@/components/settings/SettingsDrawer";
import { DigitalRain } from "@/components/fx/DigitalRain";
import { ConsoleChips } from "@/components/workspace/ConsoleChips";
import { AnswerProse } from "@/components/workspace/AnswerProse";
import { askStream, getInference, setInference, type InferenceBackend } from "@/lib/api";
import { detectActiveModules } from "@/lib/topics";
import type { StageEvent } from "@/lib/mock-stream";

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("reading");
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [backend, setBackend] = useState<InferenceBackend>("ollama");

  useEffect(() => {
    getInference().then((r) => setBackend(r.backend)).catch(() => {});
  }, []);

  function handleBackendChange(v: InferenceBackend) {
    setBackend(v);
    setInference(v).catch(() => {});
  }

  // Conversation state — handoff model
  const [msgs, setMsgs] = useState<ConvoMessage[]>([]);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [activeIdx, setActiveIdx] = useState(-1);
  const [events, setEvents] = useState<StageEvent[]>([]);
  const [currentQuery, setCurrentQuery] = useState("");
  const [input, setInput] = useState("");

  const runningRef = useRef(false);

  const handleAsk = useCallback((q: string) => {
    if (runningRef.current || !profile) return;
    runningRef.current = true;

    setCurrentQuery(q);
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setEvents([]);
    setActiveIdx(-1);
    setPhase("running");
    setInput("");

    const collected: StageEvent[] = [];
    let idx = 0;

    const es = askStream(q, profile.id, difficulty);

    es.onmessage = (e) => {
      const event: StageEvent = JSON.parse(e.data);
      if (event.stage === "compose" && event.status === "active") return;
      collected.push(event);
      setEvents([...collected]);
      setActiveIdx(idx);
      idx++;
      if (event.stage === "compose" && event.status === "done") {
        es.close();
        finish();
      }
    };

    es.onerror = () => {
      es.close();
      finish();
    };

    function finish() {
      setPhase("done");
      runningRef.current = false;
      const compose = collected.find((e) => e.stage === "compose" && e.status === "done");
      const lastEval = [...collected].reverse().find((e) => e.stage.startsWith("evaluate") && e.scores);
      setMsgs((m) => [
        ...m,
        {
          role: "bot",
          answerMd: compose?.answer_md ?? "",
          citations: compose?.citations ?? [],
          scores: lastEval?.scores ?? undefined,
        },
      ]);
    }
  }, [profile, difficulty]);

  function handleSubmit() {
    const q = input.trim();
    if (q && phase !== "running") handleAsk(q);
  }

  const hasActiveTopic = currentQuery.length > 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
        position: "relative",
      }}
    >
      {/* Single rain layer behind all screens — hidden in clinical mode by the component */}
      <DigitalRain />

      {!profile && <ProfilePicker onSelect={setProfile} />}
      {profile && <>

      <Header
        viewMode={viewMode}
        onViewMode={setViewMode}
        difficulty={difficulty}
        onDifficulty={setDifficulty}
        onSettings={() => setSettingsOpen(true)}
        onHome={() => { setMsgs([]); setEvents([]); setCurrentQuery(""); setPhase("idle"); setActiveIdx(-1); setInput(""); }}
        ragPipeActive={railOpen}
        onRagPipe={() => setRailOpen((v) => !v)}
        hasActiveTopic={hasActiveTopic}
        backend={backend}
        onBackendChange={handleBackendChange}
      />

      <div style={{ flex: 1, overflow: "hidden", display: "flex", position: "relative" }}>
        {viewMode === "reading" ? (
          <RealityLayout
            msgs={msgs}
            phase={phase}
            activeIdx={activeIdx}
            events={events}
            currentQuery={currentQuery}
            input={input}
            onInput={setInput}
            onSubmit={handleSubmit}
            onAsk={handleAsk}
            railOpen={railOpen}
            onRailOpen={() => setRailOpen(true)}
            onRailClose={() => setRailOpen(false)}
          />
        ) : (
          <MatrixLayout
            msgs={msgs}
            phase={phase}
            activeIdx={activeIdx}
            events={events}
            currentQuery={currentQuery}
            input={input}
            onInput={setInput}
            onSubmit={handleSubmit}
            onAsk={handleAsk}
            railOpen={railOpen}
            onRailClose={() => setRailOpen(false)}
          />
        )}
      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} backend={backend} onBackendChange={handleBackendChange} />
      </>}
    </div>
  );
}

/* ── Reality (Reading) mode ─────────────────────────────────────── */
interface LayoutProps {
  msgs: ConvoMessage[];
  phase: "idle" | "running" | "done";
  activeIdx: number;
  events: StageEvent[];
  currentQuery: string;
  input: string;
  onInput: (v: string) => void;
  onSubmit: () => void;
  onAsk: (q: string) => void;
  railOpen?: boolean;
  onRailClose?: () => void;
}

interface RealityProps extends LayoutProps {
  railOpen: boolean;
  onRailOpen: () => void;
  onRailClose: () => void;
}

function RealityLayout({
  msgs, phase, activeIdx, events, currentQuery,
  input, onInput, onSubmit, onAsk,
  railOpen, onRailClose, onRailOpen,
}: RealityProps) {
  return (
    <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
      {/* Two-column grid */}
      <div
        style={{
          height: "100%",
          display: "grid",
          gridTemplateColumns: "minmax(380px, 65fr) 35fr",
          overflow: "hidden",
        }}
      >
        {/* Left — conversation column (transparent so rain shows through empty space) */}
        <Convo
          msgs={msgs}
          phase={phase}
          activeIdx={activeIdx}
          scores={null}
          input={input}
          onInput={onInput}
          onSubmit={onSubmit}
          onAsk={onAsk}
          onOpenTrace={onRailOpen}
        />

        {/* Right — ML workspace */}
        <div
          style={{
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            borderLeft: "1px solid var(--line-soft)",
          }}
        >
          <MLWorkspace query={currentQuery} />
        </div>
      </div>

      {/* Pipeline Rail — absolute overlay, outside the grid so it spans full width correctly */}
      <PipelineRail
        events={events}
        isRunning={phase === "running"}
        open={railOpen}
        onClose={onRailClose}
      />
    </div>
  );
}

/* ── Console (Matrix) mode ──────────────────────────────────────── */
const STAGE_LABEL: Record<string, string> = {
  route: "route", rewrite: "rewrite", retrieve1: "retrieve·hop1", react: "react",
  reflect: "reflect", evaluate1: "evaluate", retrieve2: "retrieve·hop2",
  evaluate2: "evaluate", compose: "compose",
};

const MODULES = [
  ["3.1", "Prob & Stats"], ["3.2", "Intro to ML"], ["3.3", "Supervised"],
  ["3.4", "Supervised+"], ["3.5", "Unsupervised"], ["3.6", "Time Series"],
  ["3.7", "Neural Networks"], ["3.8", "Computer Vision"], ["3.9", "NLP"], ["3.10", "NLP+"],
];

function MatrixLayout({ msgs, phase, activeIdx, events, currentQuery, input, onInput, onSubmit, onAsk, railOpen, onRailClose }: LayoutProps) {
  const composeEvent = events.find((e) => e.stage === "compose" && e.status === "done");
  const lastEval = [...events].reverse().find((e) => e.stage.startsWith("evaluate") && e.scores);
  const activeModules = detectActiveModules(currentQuery);

  // Build per-bot-message query list for terminal trace
  const lastUserMsg = [...msgs].reverse().find((m) => m.role === "user");

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Coverage map bar */}
      <div
        style={{
          flexShrink: 0,
          position: "relative",
          padding: "6px 18px",
          background: "color-mix(in oklab, var(--bg) 80%, transparent)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid var(--line-soft)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          overflowX: "auto",
        }}
      >
        <span style={{ fontSize: 10, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--txt-faint)", whiteSpace: "nowrap" }}>
          ⊞ corpus coverage
        </span>
        {MODULES.map(([id, nm]) => {
          const hot = activeModules.includes(id);
          return (
            <div
              key={id}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 7,
                border: `1px solid ${hot ? "var(--green-deep)" : "var(--line)"}`,
                background: hot ? "color-mix(in oklab, var(--green-deep) 12%, transparent)" : "transparent",
                boxShadow: hot ? "var(--glow)" : "none",
                transition: "border-color 0.2s",
                fontSize: 9,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ color: hot ? "var(--green)" : "var(--txt-dim)", fontWeight: 600 }}>{id}</span>
              <span style={{ color: "var(--txt-faint)" }}>{nm}</span>
            </div>
          );
        })}
        <span style={{ marginLeft: "auto", fontSize: 9.5, color: "var(--txt-faint)", whiteSpace: "nowrap" }}>
          142 hrs transcripts · 4 textbooks · 38 notebooks indexed
        </span>
      </div>

      {/* Main grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(380px, 65fr) 35fr",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Left — terminal (transparent; rain shows through empty space) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRight: "1px solid var(--line-soft)",
          }}
        >
          {/* Terminal scroll */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 0" }}>
            {msgs.length === 0 ? (
              /* Empty state */
              <div style={{ padding: "20px 20px 0" }}>
                <div style={{ fontSize: 12, color: "var(--txt-faint)", marginBottom: 14 }}>
                  ⌥ germ console — type a question below or pick one:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { mod: "3.3", label: "Why does my decision tree overfit?" },
                    { mod: "3.4", label: "L1 vs L2 regularization — when to use each?" },
                    { mod: "3.2", label: "How do I choose k in KNN?" },
                    { mod: "3.7", label: "What does the learning rate do in gradient descent?" },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => onAsk(chip.label)}
                      style={{
                        textAlign: "left", border: "1px solid var(--line)", background: "var(--panel)",
                        borderRadius: 9, padding: "10px 14px", color: "var(--txt)", fontSize: 12,
                        display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                        transition: "transform 0.15s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateX(3px)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; }}
                    >
                      <span style={{ fontSize: 9, color: "var(--on-green)", background: "var(--green)", borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>
                        {chip.mod}
                      </span>
                      {chip.label}
                      <span style={{ marginLeft: "auto", color: "var(--txt-faint)" }}>↗</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Terminal trace */
              <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>
                {lastUserMsg?.text && (
                  <div style={{ padding: "4px 0 10px 0", display: "flex", gap: 8, paddingLeft: 12 }}>
                    <span style={{ color: "var(--green)", minWidth: 20 }}>›</span>
                    <span style={{ color: "var(--txt)" }}>{lastUserMsg.text}</span>
                  </div>
                )}
                {events.map((ev, i) => {
                  const isEval = ev.stage.startsWith("evaluate");
                  const isBelowPass = isEval && ev.verdict?.startsWith("BELOW");
                  const color = ev.stage === "retrieve1" || ev.stage === "retrieve2"
                    ? "var(--green)"
                    : isEval && isBelowPass ? "var(--red)"
                    : isEval ? "var(--green)"
                    : ev.stage === "reflect" ? "var(--amber)"
                    : "var(--txt-dim)";

                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        padding: "2px 0",
                        lineHeight: 1.6,
                      }}
                    >
                      {/* Line number gutter */}
                      <span
                        aria-hidden
                        style={{
                          minWidth: 28,
                          textAlign: "right",
                          paddingRight: 10,
                          color: "var(--txt-faint)",
                          userSelect: "none",
                          fontSize: 11,
                        }}
                      >
                        {String(i + 1).padStart(2, " ")}
                      </span>
                      <span style={{ color: "var(--txt-faint)", minWidth: 120 }}>
                        [{STAGE_LABEL[ev.stage] ?? ev.stage}]
                      </span>
                      <span style={{ color, flex: 1 }}>
                        {ev.scores
                          ? `faithful ${ev.scores.f.toFixed(2)} · complete ${ev.scores.c.toFixed(2)} → ${ev.verdict}`
                          : ev.detail ?? ev.status}
                      </span>
                    </div>
                  );
                })}
                {phase === "running" && (
                  <div style={{ padding: "4px 0 0 28px", color: "var(--amber)" }}>
                    <span role="status" aria-label="Running">▌</span>
                  </div>
                )}
                {/* Answer prose section */}
                {composeEvent?.answer_md && (
                  <div style={{ padding: "14px 12px 6px" }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <span style={{ color: "var(--green)" }}>answer&gt;</span>
                    </div>
                    <div style={{ paddingLeft: 20 }}>
                      <AnswerProse
                        markdown={composeEvent.answer_md}
                        citations={composeEvent.citations ?? []}
                      />
                      <ConsoleChips />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Console composer */}
          <div
            style={{
              flexShrink: 0,
              padding: "8px 12px",
              borderTop: "1px solid var(--line-soft)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ color: "var(--green)", fontSize: 12, fontFamily: "var(--font-mono, monospace)" }}>germ&gt;</span>
            <input
              value={input}
              onChange={(e) => onInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSubmit(); } }}
              placeholder="type a question…"
              disabled={phase === "running"}
              style={{
                flex: 1,
                background: "var(--bg-2)",
                border: "1px solid var(--line)",
                borderRadius: 9,
                padding: "6px 10px",
                fontSize: 12,
                fontFamily: "var(--font-mono, monospace)",
                color: "var(--txt)",
                outline: "none",
              }}
            />
            <button
              onClick={onSubmit}
              disabled={phase === "running" || !input.trim()}
              aria-label="Send"
              style={{
                width: 34, height: 34, borderRadius: 7, border: "none",
                background: "var(--green)", color: "var(--on-green)",
                fontSize: 15, cursor: phase === "running" || !input.trim() ? "not-allowed" : "pointer",
                opacity: phase === "running" || !input.trim() ? 0.45 : 1,
                display: "grid", placeItems: "center",
              }}
            >
              ↵
            </button>
          </div>
        </div>

        {/* Right — workspace + gauge */}
        <div style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <MLWorkspace query={currentQuery} compact />
        </div>
      </div>

      {/* Eval coverage bar — shown once pipeline fires */}
      {lastEval?.scores && (
        <div
          style={{
            position: "absolute",
            bottom: 52,
            left: 0,
            right: 0,
            zIndex: 3,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "5px 18px",
            background: "color-mix(in oklab, var(--bg) 85%, transparent)",
            backdropFilter: "blur(10px)",
            borderTop: "1px solid var(--line-soft)",
            fontSize: 11,
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          <span style={{ color: "var(--txt-faint)" }}>eval</span>
          {["f", "r", "c"].map((k) => {
            const v = lastEval.scores![k as "f" | "r" | "c"];
            return (
              <span key={k} style={{ color: v >= 0.8 ? "var(--green)" : "var(--amber)" }}>
                {k}:{v.toFixed(2)}
              </span>
            );
          })}
          <span
            style={{
              color: lastEval.verdict?.startsWith("PASS") ? "var(--green)" : "var(--amber)",
              fontWeight: 600,
            }}
          >
            → {lastEval.verdict}
          </span>
        </div>
      )}

      {/* Pipeline Rail — same overlay as Rabbit Hole mode */}
      <PipelineRail
        events={events}
        isRunning={phase === "running"}
        open={railOpen}
        onClose={onRailClose}
      />
    </div>
  );
}

"use client";

import type { StageEvent } from "@/lib/mock-stream";
import { AnswerProse } from "./AnswerProse";
import { VizPanel } from "@/components/viz/VizPanel";
import { ConsoleChips } from "./ConsoleChips";

interface MLWorkspaceProps {
  events: StageEvent[];
  isRunning: boolean;
  query: string;
}

export function MLWorkspace({ events, isRunning, query }: MLWorkspaceProps) {
  const composeEvent = events.find((e) => e.stage === "compose" && e.status === "done");

  if (!query && !isRunning) {
    return <WelcomeState />;
  }

  return (
    <main
      className="flex-1 overflow-y-auto"
      style={{ padding: "28px 32px", maxWidth: 860 }}
    >
      {/* Query echo */}
      <div className="mb-6">
        <p className="font-mono" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", letterSpacing: "0.08em", marginBottom: 6 }}>
          QUERY
        </p>
        <p className="font-mono" style={{ fontSize: 15, color: "var(--txt)" }}>
          {query}
        </p>
      </div>

      {/* Thinking indicator */}
      {isRunning && !composeEvent && (
        <div
          role="status"
          aria-label="Thinking"
          className="flex items-center gap-2 mb-6"
        >
          <ThinkingDots />
          <span className="font-mono" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)" }}>
            Pipeline running…
          </span>
        </div>
      )}

      {/* Answer */}
      {composeEvent?.answer_md && (
        <>
          <AnswerProse
            markdown={composeEvent.answer_md}
            citations={composeEvent.citations ?? []}
          />
          <ConsoleChips />
        </>
      )}

      {/* Visualisation — rendered below answer when compose is done */}
      {composeEvent && <VizPanel query={query} />}
    </main>
  );
}

const TOPIC_CHIPS: Array<{ mod: string; label: string }> = [
  { mod: "3.3", label: "Why does my decision tree overfit?" },
  { mod: "3.4", label: "L1 vs L2 regularization — when to use each?" },
  { mod: "3.2", label: "How do I choose k in KNN?" },
  { mod: "3.7", label: "What does the learning rate do in gradient descent?" },
];

function WelcomeState() {
  return (
    <main
      className="flex-1 overflow-y-auto"
      style={{ padding: "26px clamp(18px, 4vw, 54px) 30px", display: "flex", flexDirection: "column", gap: 26 }}
    >
      <div style={{ maxWidth: 760, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 18, paddingTop: 18 }}>
        {/* Dedication line */}
        <div style={{ fontSize: 11, color: "var(--txt-faint)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 16, height: 1, background: "var(--green-deep)", display: "block" }} />
          a digital twin of your instructor, germayne
        </div>

        {/* Serif headline */}
        <h1
          className="font-serif"
          style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500, fontSize: "clamp(28px, 4vw, 42px)", lineHeight: 1.08, letterSpacing: "-0.5px", color: "var(--txt)" }}
        >
          Ask me anything from<br />modules 3.1 – 3.10.
        </h1>

        {/* Lede */}
        <p style={{ color: "var(--txt-dim)", maxWidth: "60ch", fontSize: 13.5, lineHeight: 1.6 }}>
          I answer grounded in the course transcripts &amp; textbooks — every answer comes with the{" "}
          <strong style={{ fontWeight: 600 }}>visual and the math</strong> so you actually see how the ML works.
        </p>

        {/* Topic chips */}
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 6 }}>
          <div style={{ fontSize: 10.5, letterSpacing: "2px", textTransform: "uppercase", color: "var(--green-2)", marginBottom: 2 }}>
            try one
          </div>
          {TOPIC_CHIPS.map((chip) => (
            <div
              key={chip.label}
              style={{
                textAlign: "left",
                border: "1px solid var(--line)",
                background: "var(--panel)",
                borderRadius: 11,
                padding: "13px 15px",
                color: "var(--txt)",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "default",
                transition: "border-color 0.15s, transform 0.15s",
              }}
            >
              <span style={{
                fontSize: 9.5,
                color: "var(--on-green)",
                background: "var(--green)",
                borderRadius: 5,
                padding: "2px 6px",
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {chip.mod}
              </span>
              {chip.label}
              <span style={{ marginLeft: "auto", color: "var(--txt-faint)" }}>↗</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function ThinkingDots() {
  return (
    <span aria-hidden className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "var(--green)",
            display: "inline-block",
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </span>
  );
}

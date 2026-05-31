"use client";

import type { StageEvent } from "@/lib/mock-stream";
import { AnswerProse } from "./AnswerProse";

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
        <AnswerProse
          markdown={composeEvent.answer_md}
          citations={composeEvent.citations ?? []}
        />
      )}
    </main>
  );
}

function WelcomeState() {
  return (
    <main
      className="flex-1 flex flex-col items-center justify-center gap-5"
      style={{ padding: "40px 32px" }}
    >
      <div
        className="flex flex-col items-center gap-3 text-center"
        style={{ maxWidth: 500 }}
      >
        <span
          className="font-mono"
          style={{ fontSize: 36, color: "var(--green)", opacity: 0.25 }}
        >
          ◈
        </span>
        <h2
          className="font-mono font-semibold"
          style={{ fontSize: 18, color: "var(--txt)", letterSpacing: "-0.02em" }}
        >
          Ask anything from Module 3
        </h2>
        <p className="font-mono" style={{ fontSize: "var(--font-base)", color: "var(--txt-faint)", lineHeight: 1.6 }}>
          Topics covered: bias–variance, regularization, k-nearest neighbours, gradient descent.
          The RAG pipeline will retrieve, reason, and compose a grounded answer.
        </p>

        <div className="flex flex-wrap gap-2 justify-center mt-2">
          {["Bias–variance trade-off", "L1 vs L2 regularization", "How does KNN work?", "Explain gradient descent"].map((s) => (
            <span
              key={s}
              className="font-mono"
              style={{
                padding: "5px 12px",
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--line)",
                background: "var(--panel)",
                color: "var(--txt-dim)",
                fontSize: "var(--font-label)",
                cursor: "default",
              }}
            >
              {s}
            </span>
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

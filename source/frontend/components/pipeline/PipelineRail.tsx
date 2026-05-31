"use client";

import type { StageEvent } from "@/lib/mock-stream";
import { StageItem } from "./StageItem";
import { Gauge } from "./Gauge";

interface PipelineRailProps {
  events: StageEvent[];
  isRunning: boolean;
  open?: boolean;
  onClose?: () => void;
}

export function PipelineRail({ events, isRunning, open, onClose }: PipelineRailProps) {
  const finalEval = [...events].reverse().find((e) => e.stage.startsWith("evaluate") && e.scores);

  const rail = (
    <aside
      aria-label="Agent trace"
      style={{
        width: "var(--rail-w)",
        borderLeft: "1px solid var(--line-soft)",
        background: "color-mix(in oklab, var(--panel) 70%, transparent)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
      }}
    >
      {/* Rail header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 42,
          padding: "0 14px",
          borderBottom: "1px solid var(--line-soft)",
          flexShrink: 0,
          gap: 8,
        }}
      >
        <span style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", letterSpacing: "0.08em", flex: 1 }}>
          ◷ agent trace
        </span>
        {isRunning && (
          <span
            role="status"
            aria-label="Pipeline running"
            style={{ fontSize: "var(--font-label)", color: "var(--amber)" }}
          >
            ▶ running
          </span>
        )}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close agent trace"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--txt-faint)",
              cursor: "pointer",
              fontSize: 14,
              lineHeight: 1,
              padding: "2px 4px",
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Stage list */}
      <div role="list" style={{ flex: 1, overflowY: "auto" }}>
        {events.length === 0 ? (
          <p style={{ padding: "16px", fontSize: "var(--font-label)", color: "var(--txt-faint)" }}>
            Waiting for query…
          </p>
        ) : (
          events.map((ev, i) => (
            <StageItem key={`${ev.stage}-${i}`} event={ev} isLast={i === events.length - 1} />
          ))
        )}
      </div>

      {/* Gauge */}
      {finalEval?.scores && (
        <div style={{ flexShrink: 0, borderTop: "1px solid var(--line-soft)" }}>
          <Gauge
            scores={finalEval.scores}
            pass={finalEval.verdict?.startsWith("PASS") ?? false}
          />
        </div>
      )}
    </aside>
  );

  // Drawer mode (slide-in from right)
  if (open !== undefined) {
    if (!open) return null;
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 20,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        {/* Backdrop */}
        <div
          onClick={onClose}
          style={{ position: "absolute", inset: 0, background: "oklch(0 0 0 / 0.3)" }}
        />
        <div
          style={{
            position: "relative",
            width: "var(--rail-w)",
            animation: "slidein 300ms cubic-bezier(.4,0,.2,1)",
          }}
        >
          {rail}
        </div>
      </div>
    );
  }

  // Inline mode (column panel)
  return rail;
}

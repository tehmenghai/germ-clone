"use client";

import type { StageEvent } from "@/lib/mock-stream";
import { StageItem } from "./StageItem";
import { Gauge } from "./Gauge";

interface PipelineRailProps {
  events: StageEvent[];
  isRunning: boolean;
}

export function PipelineRail({ events, isRunning }: PipelineRailProps) {
  const finalEval = [...events].reverse().find((e) => e.stage.startsWith("evaluate") && e.scores);

  return (
    <aside
      aria-label="Pipeline stages"
      style={{
        width: "var(--rail-w)",
        borderRight: "1px solid var(--line-soft)",
        background: "color-mix(in oklab, var(--panel) 45%, transparent)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Rail header */}
      <div
        className="flex items-center justify-between"
        style={{
          height: 38,
          padding: "0 16px",
          borderBottom: "1px solid var(--line-soft)",
          flexShrink: 0,
        }}
      >
        <span className="font-mono font-medium" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", letterSpacing: "0.08em" }}>
          PIPELINE
        </span>
        {isRunning && (
          <span
            role="status"
            aria-label="Pipeline running"
            className="font-mono"
            style={{ fontSize: "var(--font-label)", color: "var(--amber)" }}
          >
            ▶ running
          </span>
        )}
      </div>

      {/* Stage list */}
      <div role="list" className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <p className="font-mono px-3 py-4" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)" }}>
            Waiting for query…
          </p>
        ) : (
          events.map((ev, i) => (
            <StageItem key={`${ev.stage}-${i}`} event={ev} isLast={i === events.length - 1} />
          ))
        )}
      </div>

      {/* Gauge — shown once we have eval scores */}
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
}

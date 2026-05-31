"use client";

import type { StageEvent, StageStatus } from "@/lib/mock-stream";

const STAGE_LABELS: Record<string, string> = {
  route:     "Route",
  rewrite:   "Rewrite",
  retrieve1: "Retrieve ①",
  react:     "ReAct",
  reflect:   "Reflect",
  evaluate1: "Evaluate ①",
  retrieve2: "Retrieve ②",
  evaluate2: "Evaluate ②",
  compose:   "Compose",
};

function statusColor(status: StageStatus): string {
  switch (status) {
    case "active":  return "var(--amber)";
    case "done":    return "var(--green)";
    case "error":   return "var(--red)";
    default:        return "var(--txt-faint)";
  }
}

function StatusDot({ status }: { status: StageStatus }) {
  const color = statusColor(status);
  const isActive = status === "active";
  return (
    <span
      aria-label={status}
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: color,
        boxShadow: isActive ? `0 0 6px ${color}` : undefined,
        flexShrink: 0,
      }}
    />
  );
}

interface StageItemProps {
  event: StageEvent;
  isLast?: boolean;
}

export function StageItem({ event, isLast }: StageItemProps) {
  const label = STAGE_LABELS[event.stage] ?? event.stage;

  return (
    <div
      role="listitem"
      className="flex flex-col gap-0.5"
      style={{
        padding: "7px 12px",
        borderBottom: isLast ? "none" : "1px solid var(--line-soft)",
      }}
    >
      <div className="flex items-center gap-2">
        <StatusDot status={event.status} />
        <span
          className="font-mono font-medium"
          style={{ fontSize: "var(--font-base)", color: statusColor(event.status) }}
        >
          {label}
        </span>
      </div>

      {event.detail && (
        <p className="font-mono" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", paddingLeft: 15 }}>
          {event.detail}
        </p>
      )}

      {event.scores && (
        <div className="flex gap-3 font-mono" style={{ fontSize: "var(--font-label)", paddingLeft: 15, color: "var(--txt-dim)" }}>
          <span>F {(event.scores.f * 100).toFixed(0)}</span>
          <span>R {(event.scores.r * 100).toFixed(0)}</span>
          <span>C {(event.scores.c * 100).toFixed(0)}</span>
          {event.verdict && (
            <span style={{ color: event.verdict === "PASS" ? "var(--green)" : "var(--amber)" }}>
              {event.verdict}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

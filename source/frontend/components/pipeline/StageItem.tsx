"use client";

import type { StageEvent, StageStatus } from "@/lib/mock-stream";

// Icon + display name matching handoff pipeline.jsx
const STAGE_META: Record<string, { icon: string; name: string }> = {
  route:     { icon: "⟁", name: "Route" },
  rewrite:   { icon: "✎", name: "Rewrite" },
  retrieve1: { icon: "⛁", name: "Retrieve · hop 1" },
  react:     { icon: "◈", name: "ReAct" },
  reflect:   { icon: "◎", name: "Reflect / Correct" },
  evaluate1: { icon: "▦", name: "Evaluate · pass 1" },
  retrieve2: { icon: "⛁", name: "Re-retrieve · hop 2" },
  evaluate2: { icon: "▦", name: "Evaluate · pass 2" },
  compose:   { icon: "✦", name: "Compose answer" },
};

function stageClass(event: StageEvent): "pending" | "active" | "done" | "reloop" {
  if (event.status === "active") return "active";
  if (event.status === "done" && event.verdict?.startsWith("BELOW")) return "reloop";
  if (event.status === "done") return "done";
  return "pending";
}

interface StageItemProps {
  event: StageEvent;
  isLast?: boolean;
}

export function StageItem({ event, isLast }: StageItemProps) {
  const meta = STAGE_META[event.stage] ?? { icon: "○", name: event.stage };
  const cls = stageClass(event);

  const iconBorderColor = cls === "active" ? "var(--green-deep)"
    : cls === "reloop" ? "color-mix(in oklab, var(--amber) 50%, var(--line))"
    : "var(--line)";
  const iconColor = cls === "active" ? "var(--green)"
    : cls === "done" ? "var(--green)"
    : cls === "reloop" ? "var(--amber)"
    : "var(--txt-faint)";
  const iconGlow = cls === "active" ? "var(--glow)" : cls === "done" ? undefined : undefined;
  const statusText = cls === "active" ? "running" : cls === "done" ? "done" : cls === "reloop" ? "reloop" : "";
  const statusColor = cls === "active" ? "var(--amber)"
    : cls === "done" ? "var(--green)"
    : cls === "reloop" ? "var(--amber)"
    : "var(--txt-faint)";

  return (
    <div
      role="listitem"
      style={{
        padding: "11px 16px",
        borderBottom: isLast ? "none" : "1px solid var(--line-soft)",
        opacity: cls === "pending" ? 0.4 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--txt)" }}>
        {/* Icon badge */}
        <div
          aria-hidden
          style={{
            width: 24, height: 24, borderRadius: 7,
            display: "grid", placeItems: "center",
            fontSize: 12,
            background: "var(--panel-2)",
            border: `1px solid ${iconBorderColor}`,
            color: iconColor,
            flexShrink: 0,
            boxShadow: iconGlow,
            transition: "border-color 0.3s, color 0.3s",
          }}
        >
          {meta.icon}
        </div>

        <span style={{ flex: 1 }}>{meta.name}</span>

        {statusText && (
          <span style={{ fontSize: 9, letterSpacing: "1px", color: statusColor, textTransform: "uppercase" }}>
            {statusText}
          </span>
        )}
      </div>

      {/* Detail line */}
      {event.detail && (
        <p style={{ fontSize: 10.5, color: "var(--txt-faint)", lineHeight: 1.5, paddingLeft: 34, marginTop: 6 }}>
          {event.detail}
        </p>
      )}

      {/* Eval scores */}
      {event.scores && (
        <div style={{ fontSize: 10.5, color: "var(--txt-faint)", paddingLeft: 34, marginTop: 4 }}>
          faithful {event.scores.f.toFixed(2)} · relevant {event.scores.r.toFixed(2)} · complete {event.scores.c.toFixed(2)}
          {event.verdict && (
            <span style={{ marginLeft: 6, color: event.verdict.startsWith("PASS") ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
              → {event.verdict}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

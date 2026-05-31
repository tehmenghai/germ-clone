"use client";

const PIPE_STAGES = [
  { icon: "⟁", name: "Route" },
  { icon: "✎", name: "Rewrite" },
  { icon: "⛁", name: "Retrieve · hop 1" },
  { icon: "◈", name: "ReAct" },
  { icon: "◎", name: "Reflect / Correct" },
  { icon: "▦", name: "Evaluate · pass 1" },
  { icon: "⛁", name: "Re-retrieve · hop 2" },
  { icon: "▦", name: "Evaluate · pass 2" },
  { icon: "✦", name: "Compose answer" },
];

interface ThinkingProps {
  activeIdx: number;
}

export function Thinking({ activeIdx }: ThinkingProps) {
  const stage = activeIdx >= 0 && activeIdx < PIPE_STAGES.length
    ? PIPE_STAGES[activeIdx]
    : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 18px",
        borderRadius: "var(--r-xl)",
        border: "1px solid var(--line-soft)",
        background: "color-mix(in oklab, var(--panel) 60%, transparent)",
        fontSize: 13,
        color: "var(--txt-dim)",
        animation: "fadein 0.5s ease",
      }}
    >
      <ThinkingDots />
      <span>
        {stage ? (
          <>
            <span style={{ marginRight: 4 }}>{stage.icon}</span>
            {stage.name}…
          </>
        ) : (
          "thinking…"
        )}
      </span>
      <span
        style={{
          marginLeft: "auto",
          fontSize: 11,
          color: "var(--txt-faint)",
          letterSpacing: "0.03em",
        }}
      >
        watch the agent →
      </span>
    </div>
  );
}

function ThinkingDots() {
  return (
    <span aria-hidden style={{ display: "flex", gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "var(--green)",
            display: "inline-block",
            animation: `thinkdot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes thinkdot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40%           { opacity: 1;   transform: scale(1);   }
        }
      `}</style>
    </span>
  );
}

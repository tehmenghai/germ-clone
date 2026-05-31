"use client";

import { useState } from "react";

interface ComposerProps {
  onSubmit: (query: string) => void;
  isRunning: boolean;
}

export function Composer({ onSubmit, isRunning }: ComposerProps) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    const q = value.trim();
    if (!q || isRunning) return;
    onSubmit(q);
    setValue("");
  }

  return (
    <div
      style={{
        borderTop: "1px solid var(--line)",
        background: "var(--bg-2)",
        padding: "14px 20px",
        flexShrink: 0,
      }}
    >
      <div
        className="flex items-center gap-3 mx-auto"
        style={{ maxWidth: "var(--composer-max)" }}
      >
        <div
          className="flex-1 flex items-center"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            padding: "0 14px",
          }}
        >
          <span className="font-mono mr-2" style={{ color: "var(--green)", fontSize: 13 }}>›</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
            placeholder="Ask a question about Module 3…"
            disabled={isRunning}
            aria-label="Question input"
            className="font-mono flex-1 bg-transparent outline-none"
            style={{
              height: 40,
              fontSize: "var(--font-base)",
              color: "var(--txt)",
              border: "none",
            }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isRunning || !value.trim()}
          aria-label="Submit question"
          className="font-mono font-semibold transition-opacity"
          style={{
            height: 40,
            padding: "0 20px",
            borderRadius: "var(--r-md)",
            border: "none",
            background: "var(--green)",
            color: "var(--on-green)",
            fontSize: "var(--font-base)",
            cursor: isRunning || !value.trim() ? "not-allowed" : "pointer",
            opacity: isRunning || !value.trim() ? 0.5 : 1,
          }}
        >
          {isRunning ? "Running…" : "Ask"}
        </button>
      </div>
    </div>
  );
}

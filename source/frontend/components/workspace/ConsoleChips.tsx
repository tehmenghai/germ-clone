"use client";

// Render-only console chips — behaviours are v1 backlog per build-plan Phase 2 spec
const CHIPS = [
  { label: "/quiz",    title: "Generate a quiz question from this answer" },
  { label: "/eli5",   title: "Explain like I'm 5" },
  { label: "/save",   title: "Save this answer to your notes" },
  { label: "/sources", title: "Show full source list" },
];

export function ConsoleChips() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 18,
        paddingTop: 14,
        borderTop: "1px solid var(--line-soft)",
      }}
    >
      {CHIPS.map((chip) => (
        <button
          key={chip.label}
          title={chip.title}
          aria-label={chip.title}
          disabled
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "var(--font-label)",
            padding: "4px 10px",
            borderRadius: "var(--r-sm)",
            border: "1px solid var(--line)",
            background: "transparent",
            color: "var(--txt-faint)",
            cursor: "not-allowed",
            letterSpacing: "0.02em",
          }}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

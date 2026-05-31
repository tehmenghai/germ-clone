"use client";

const TOPIC_CHIPS = [
  { mod: "3.3", label: "Why does my decision tree overfit?" },
  { mod: "3.4", label: "L1 vs L2 regularization — when to use each?" },
  { mod: "3.2", label: "How do I choose k in KNN?" },
  { mod: "3.7", label: "What does the learning rate do in gradient descent?" },
];

interface WelcomeProps {
  onAsk: (q: string) => void;
}

export function Welcome({ onAsk }: WelcomeProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 22,
        paddingTop: 8,
      }}
    >
      {/* Dedication line */}
      <div
        style={{
          fontSize: 11,
          color: "var(--txt-faint)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 16,
            height: 1,
            background: "var(--green-deep)",
            display: "block",
            flexShrink: 0,
          }}
        />
        a digital twin of your instructor, germayne
      </div>

      {/* Serif headline */}
      <h1
        style={{
          fontFamily: "'Newsreader', Georgia, serif",
          fontWeight: 500,
          fontSize: "clamp(28px, 4vw, 42px)",
          lineHeight: 1.08,
          letterSpacing: "-0.5px",
          color: "var(--txt)",
        }}
      >
        Ask me anything from
        <br />
        modules 3.1 – 3.10.
      </h1>

      {/* Lede */}
      <p
        style={{
          color: "var(--txt-dim)",
          maxWidth: "60ch",
          fontSize: 13.5,
          lineHeight: 1.6,
        }}
      >
        I answer in germayne&apos;s teaching style, grounded in the Zoom transcripts &amp;
        textbooks — and every answer comes with the{" "}
        <strong style={{ fontWeight: 600, color: "var(--txt)" }}>
          visual and the math
        </strong>{" "}
        so you actually see how the ML works. Toggle the RAG pipeline whenever you
        want to see my retrieval &amp; self-checking.
      </p>

      {/* Topic chips */}
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 2 }}>
        <div
          style={{
            fontSize: 10.5,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "var(--green-2)",
            marginBottom: 2,
          }}
        >
          try one
        </div>
        {TOPIC_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => onAsk(chip.label)}
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
              cursor: "pointer",
              transition: "transform 0.15s, border-color 0.15s",
              width: "100%",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateX(3px)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--green-deep)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--line)";
            }}
          >
            <span
              style={{
                fontSize: 9.5,
                color: "var(--on-green)",
                background: "var(--green)",
                borderRadius: 5,
                padding: "2px 6px",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {chip.mod}
            </span>
            {chip.label}
            <span style={{ marginLeft: "auto", color: "var(--txt-faint)" }}>↗</span>
          </button>
        ))}
      </div>
    </div>
  );
}

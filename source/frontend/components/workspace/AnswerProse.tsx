"use client";

import type { Citation } from "@/lib/mock-stream";

interface AnswerProseProps {
  markdown: string;
  citations: Citation[];
}

function renderMarkdown(md: string): string {
  return md
    .replace(/^## (.+)$/gm, '<h2 class="answer-h2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="answer-h3">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

export function AnswerProse({ markdown, citations }: AnswerProseProps) {
  const html = renderMarkdown(markdown);

  return (
    <div className="flex flex-col gap-5">
      <div
        className="answer-prose font-serif"
        style={{ fontSize: "var(--font-prose)", color: "var(--txt)", lineHeight: 1.7 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {citations.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-mono" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", letterSpacing: "0.08em" }}>
            SOURCES
          </p>
          {citations.map((c) => (
            <div
              key={c.id}
              style={{
                padding: "8px 12px",
                background: "var(--bg-2)",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--line)",
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="font-mono font-semibold"
                  style={{ fontSize: "var(--font-label)", color: "var(--green)" }}
                >
                  [{c.id}]
                </span>
                <span className="font-mono" style={{ fontSize: "var(--font-label)", color: "var(--txt-dim)" }}>
                  mod {c.mod} · {c.file}
                </span>
                <span className="font-mono ml-auto" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)" }}>
                  {(c.score * 100).toFixed(0)}%
                </span>
              </div>
              <p className="font-mono" style={{ fontSize: "var(--font-label)", color: "var(--txt-dim)" }}>
                {c.snip}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

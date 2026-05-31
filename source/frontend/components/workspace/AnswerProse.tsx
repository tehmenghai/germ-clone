"use client";

import type { Citation } from "@/lib/mock-stream";

interface AnswerProseProps {
  markdown: string;
  citations: Citation[];
}

function renderMarkdown(md: string, citationIds: number[]): string {
  let html = md
    .replace(/^## (.+)$/gm, '<h2 class="answer-h2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="answer-h3">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");

  // Inject citation superscripts [N] → <sup> anchor linking to source card
  for (const id of citationIds) {
    html = html.replace(
      new RegExp(`\\[${id}\\]`, "g"),
      `<sup><a href="#source-${id}" class="cite-ref">[${id}]</a></sup>`,
    );
  }
  return html;
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 85 ? "var(--green)" : pct >= 70 ? "var(--amber)" : "var(--red)";
  return (
    <div
      title={`Relevance score: ${pct}%`}
      style={{ flex: 1, maxWidth: 60, height: 3, background: "var(--line)", borderRadius: 2, overflow: "hidden" }}
    >
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2 }} />
    </div>
  );
}

export function AnswerProse({ markdown, citations }: AnswerProseProps) {
  const html = renderMarkdown(markdown, citations.map((c) => c.id));

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
              id={`source-${c.id}`}
              style={{
                padding: "8px 12px",
                background: "var(--bg-2)",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--line)",
                scrollMarginTop: 16,
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
                <ScoreBar score={c.score} />
                <span className="font-mono ml-auto" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)" }}>
                  {(c.score * 100).toFixed(0)}%
                </span>
              </div>
              <p className="font-mono" style={{ fontSize: "var(--font-label)", color: "var(--txt-dim)", lineHeight: 1.5 }}>
                "{c.snip}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import type { Citation } from "@/lib/mock-stream";

interface AnswerProseProps {
  markdown: string;
  citations: Citation[];
  citeHot?: number | null;
  onCiteHover?: (id: number | null) => void;
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


export function AnswerProse({ markdown, citations, citeHot, onCiteHover }: AnswerProseProps) {
  const html = renderMarkdown(markdown, citations.map((c) => c.id));

  return (
    <div
      className="answer-prose"
      style={{ color: "var(--txt)", lineHeight: 1.6 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

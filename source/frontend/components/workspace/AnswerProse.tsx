"use client";

import type { Citation } from "@/lib/mock-stream";

interface AnswerProseProps {
  markdown: string;
  citations: Citation[];
  citeHot?: number | null;
  onCiteHover?: (id: number | null) => void;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMarkdown(md: string, citationIds: number[]): string {
  // Escape first — answer text is LLM- and corpus-derived (untrusted). Without this,
  // any raw <tag> in the model output or a retrieved chunk would inject into the DOM
  // (e.g. <img src=x onerror=…>). All markdown substitutions below run on escaped text;
  // the tags we emit are our own literals, so they survive.
  let html = escapeHtml(md)
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

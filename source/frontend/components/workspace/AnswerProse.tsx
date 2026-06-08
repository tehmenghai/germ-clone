"use client";

import katex from "katex";
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

function renderKatex(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      output: "html",
    });
  } catch {
    return escapeHtml(displayMode ? `$$${tex}$$` : `$${tex}$`);
  }
}

/**
 * Splits markdown into segments: plain text, inline math, and block math.
 * Accepts both $...$  / $$...$$ and \(...\) / \[...\] delimiter styles
 * since LLMs produce both regardless of prompt instructions.
 */
function renderMarkdownWithMath(md: string, citationIds: number[]): string {
  // Order matters: match longer/display forms before inline forms.
  const parts = md.split(
    /((?:\$\$[\s\S]*?\$\$)|(?:\\\[[\s\S]*?\\\])|(?:\\\([\s\S]*?\\\))|(?:\$[^$\n]+?\$))/g,
  );

  const segments = parts.map((part) => {
    if (
      (part.startsWith("$$") && part.endsWith("$$") && part.length > 4) ||
      (part.startsWith("\\[") && part.endsWith("\\]") && part.length > 4)
    ) {
      const tex = part.startsWith("$$") ? part.slice(2, -2).trim() : part.slice(2, -2).trim();
      return `<span class="katex-block" style="display:block;text-align:center;margin:12px 0;">${renderKatex(tex, true)}</span>`;
    }
    if (
      (part.startsWith("$") && part.endsWith("$") && part.length > 2) ||
      (part.startsWith("\\(") && part.endsWith("\\)") && part.length > 4)
    ) {
      const tex = part.startsWith("$") ? part.slice(1, -1).trim() : part.slice(2, -2).trim();
      return renderKatex(tex, false);
    }
    // Plain markdown segment — escape then apply formatting
    return renderMarkdown(part, citationIds);
  });

  return segments.join("");
}

function renderMarkdown(md: string, citationIds: number[]): string {
  let html = escapeHtml(md)
    .replace(/^## (.+)$/gm, '<h2 class="answer-h2">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="answer-h3">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");

  for (const id of citationIds) {
    html = html.replace(
      new RegExp(`\\[${id}\\]`, "g"),
      `<sup><a href="#source-${id}" class="cite-ref">[${id}]</a></sup>`,
    );
  }
  return html;
}

export function AnswerProse({ markdown, citations, citeHot, onCiteHover }: AnswerProseProps) {
  const html = renderMarkdownWithMath(markdown, citations.map((c) => c.id));

  return (
    <div
      className="answer-prose"
      style={{ color: "var(--txt)", lineHeight: 1.6 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

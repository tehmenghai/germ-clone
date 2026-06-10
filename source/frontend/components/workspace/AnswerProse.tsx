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

function renderTable(header: string, separator: string, rows: string[]): string {
  const cols = header.split("|").map((c) => c.trim()).filter(Boolean);
  const aligns = separator.split("|").map((c) => c.trim()).filter(Boolean).map((c) => {
    if (c.startsWith(":") && c.endsWith(":")) return "center";
    if (c.endsWith(":")) return "right";
    return "left";
  });
  const th = cols.map((c, i) => `<th style="text-align:${aligns[i] ?? "left"}">${c}</th>`).join("");
  const tbody = rows.map((row) => {
    const cells = row.split("|").map((c) => c.trim()).filter(Boolean);
    return "<tr>" + cells.map((c, i) => `<td style="text-align:${aligns[i] ?? "left"}">${c}</td>`).join("") + "</tr>";
  }).join("");
  return `<table class="answer-table"><thead><tr>${th}</tr></thead><tbody>${tbody}</tbody></table>`;
}

function renderMarkdown(md: string, citationIds: number[]): string {
  // Apply inline formatting to a string (no block-level elements)
  function inlineFmt(s: string): string {
    return s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
  }

  const lines = md.split("\n");
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table: header | separator | rows
    if (i + 1 < lines.length && /^\|.*\|/.test(line) && /^\|[-:| ]+\|/.test(lines[i + 1])) {
      const tableLines: string[] = [line];
      const sepLine = lines[i + 1];
      i += 2;
      while (i < lines.length && /^\|.*\|/.test(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      output.push(renderTable(tableLines[0], sepLine, tableLines.slice(1)));
      continue;
    }

    // Unordered list block
    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(`<li>${inlineFmt(escapeHtml(lines[i].replace(/^[-*] /, "")))}</li>`);
        i++;
      }
      output.push(`<ul class="answer-list">${items.join("")}</ul>`);
      continue;
    }

    // Ordered list block
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(`<li>${inlineFmt(escapeHtml(lines[i].replace(/^\d+\. /, "")))}</li>`);
        i++;
      }
      output.push(`<ol class="answer-list">${items.join("")}</ol>`);
      continue;
    }

    // Headings
    if (/^## /.test(line)) {
      output.push(`<h2 class="answer-h2">${inlineFmt(escapeHtml(line.slice(3)))}</h2>`);
      i++;
      continue;
    }
    if (/^### /.test(line)) {
      output.push(`<h3 class="answer-h3">${inlineFmt(escapeHtml(line.slice(4)))}</h3>`);
      i++;
      continue;
    }

    // Blank line — paragraph break
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph: accumulate consecutive non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^[-*] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i]) &&
      !/^##/.test(lines[i]) &&
      !(/^\|.*\|/.test(lines[i]) && i + 1 < lines.length && /^\|[-:| ]+\|/.test(lines[i + 1]))
    ) {
      paraLines.push(inlineFmt(escapeHtml(lines[i])));
      i++;
    }
    if (paraLines.length) {
      output.push(`<p>${paraLines.join(" ")}</p>`);
    }
  }

  let html = output.join("\n");

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

"use client";

import { useState } from "react";
import type { Citation, EvalScores } from "@/lib/mock-stream";
import { AnswerProse } from "@/components/workspace/AnswerProse";

interface AnswerBlockProps {
  answerMd: string;
  citations: Citation[];
  scores: EvalScores | null;
  note?: string;
  onOpenTrace: () => void;
}

export function AnswerBlock({ answerMd, citations, scores, note, onOpenTrace }: AnswerBlockProps) {
  const [srcOpen, setSrcOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [citeHot, setCiteHot] = useState<number | null>(null);

  const mean = scores
    ? Math.round(((scores.f + scores.r + scores.c) / 3) * 100) / 100
    : null;

  return (
    <div
      className="msg-bot"
      style={{ display: "flex", gap: 14, animation: "fadein 0.5s ease" }}
    >
      {/* Avatar */}
      <div
        aria-hidden
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: "linear-gradient(160deg, var(--green-2), var(--green-deep))",
          display: "grid",
          placeItems: "center",
          fontWeight: 700,
          fontSize: 13,
          color: "var(--on-green)",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        G
      </div>

      {/* Answer card */}
      <div
        style={{
          flex: 1,
          border: "1px solid var(--line-soft)",
          borderRadius: "var(--r-xl)",
          background: "color-mix(in oklab, var(--panel) 55%, transparent)",
          overflow: "hidden",
        }}
      >
        {/* Card header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 16px",
            borderBottom: "1px solid var(--line-soft)",
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--txt-dim)",
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            germ//clone
            {mean !== null && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  color: "var(--green)",
                  border: "1px solid var(--green-deep)",
                  borderRadius: 99,
                  padding: "1px 7px",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}
              >
                PASS {mean}
              </span>
            )}
          </span>
          <button
            onClick={onOpenTrace}
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: "var(--txt-faint)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "2px 6px",
            }}
          >
            ◷ agent trace
          </button>
        </div>

        {/* Prose body */}
        <div
          style={{ padding: "16px 18px 12px" }}
          onClick={(e) => {
            const a = (e.target as HTMLElement).closest("a.cite-ref");
            if (!a) return;
            e.preventDefault();
            const targetId = (a as HTMLAnchorElement).getAttribute("href")?.slice(1);
            if (!targetId) return;
            setSrcOpen(true);
            // Scroll after the panel renders
            setTimeout(() => {
              document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }, 50);
          }}
        >
          <AnswerProse
            markdown={answerMd}
            citations={citations}
            citeHot={citeHot}
            onCiteHover={setCiteHot}
          />
          {note && (
            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "var(--txt-faint)",
                fontStyle: "italic",
              }}
            >
              <span style={{ color: "var(--green)", fontStyle: "normal" }}>note:</span>{" "}
              {note}
            </div>
          )}
        </div>

        {/* Actions row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px 12px",
          }}
        >
          <ActionBtn active={saved} onClick={() => setSaved((s) => !s)}>
            {saved ? "✓ saved" : "＋ notebook"}
          </ActionBtn>
          <ActionBtn active={srcOpen} onClick={() => setSrcOpen((o) => !o)}>
            ⌥ {citations.length} sources
          </ActionBtn>
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10.5,
              color: "var(--txt-faint)",
            }}
          >
            switch difficulty in header ↑
          </span>
        </div>

        {/* Sources panel */}
        {srcOpen && (
          <Sources citations={citations} citeHot={citeHot} />
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11,
        color: active ? "var(--green)" : "var(--txt-faint)",
        background: "transparent",
        border: "1px solid var(--line-soft)",
        borderRadius: "var(--r-sm)",
        padding: "4px 9px",
        cursor: "pointer",
        transition: "color 0.15s, border-color 0.15s",
      }}
    >
      {children}
    </button>
  );
}

export function Sources({
  citations,
  citeHot,
}: {
  citations: Citation[];
  citeHot: number | null;
}) {
  return (
    <div
      style={{
        borderTop: "1px solid var(--line-soft)",
        padding: "12px 16px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {citations.map((c) => {
        const hot = citeHot === c.id;
        return (
          <div
            key={c.id}
            id={`source-${c.id}`}
            style={{
              padding: "10px 13px",
              borderRadius: "var(--r-md)",
              border: hot ? "1px solid var(--green-deep)" : "1px solid var(--line)",
              background: hot
                ? "color-mix(in oklab, var(--green-deep) 12%, var(--bg-2))"
                : "var(--bg-2)",
              boxShadow: hot ? "var(--glow)" : "none",
              scrollMarginTop: 16,
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--green)",
                  background: "color-mix(in oklab, var(--green) 15%, transparent)",
                  borderRadius: 4,
                  padding: "1px 5px",
                }}
              >
                [{c.id}]
              </span>
              <span style={{ fontSize: 10.5, color: "var(--txt-dim)" }}>
                mod {c.mod} · {c.file}
              </span>
              {c.ts && (
                <span style={{ fontSize: 10, color: "var(--txt-faint)" }}>{c.ts}</span>
              )}
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--txt-dim)",
                lineHeight: 1.55,
                fontStyle: "italic",
                fontFamily: "'Newsreader', Georgia, serif",
              }}
            >
              &ldquo;{c.snip}&rdquo;
            </p>
          </div>
        );
      })}
    </div>
  );
}

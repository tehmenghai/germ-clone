"use client";

import { useEffect, useRef } from "react";
import type { EvalScores, Citation } from "@/lib/mock-stream";
import { Welcome } from "./Welcome";
import { Thinking } from "./Thinking";
import { AnswerBlock } from "./AnswerBlock";

export interface ConvoMessage {
  role: "user" | "bot";
  text?: string;
  answerMd?: string;
  citations?: Citation[];
  scores?: EvalScores;
  note?: string;
}

interface ConvoProps {
  msgs: ConvoMessage[];
  phase: "idle" | "running" | "done";
  activeIdx: number;
  scores: EvalScores | null;
  input: string;
  onInput: (v: string) => void;
  onSubmit: () => void;
  onAsk: (q: string) => void;
  onOpenTrace: () => void;
}

export function Convo({
  msgs,
  phase,
  activeIdx,
  scores,
  input,
  onInput,
  onSubmit,
  onAsk,
  onOpenTrace,
}: ConvoProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, phase, activeIdx]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Scroll area */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
      >
        <div
          style={{
            padding: "26px clamp(18px, 4vw, 54px) 30px",
            maxWidth: 760,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {msgs.length === 0 && <Welcome onAsk={onAsk} />}

          {msgs.map((m, i) =>
            m.role === "user" ? (
              <div
                key={i}
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "80%",
                  background: "var(--panel-2)",
                  border: "1px solid var(--line-soft)",
                  borderRadius: "13px 13px 4px 13px",
                  padding: "12px 16px",
                  fontSize: 13.5,
                  color: "var(--txt)",
                  animation: "fadein 0.5s ease",
                }}
              >
                {m.text}
              </div>
            ) : (
              <AnswerBlock
                key={i}
                answerMd={m.answerMd ?? ""}
                citations={m.citations ?? []}
                scores={m.scores ?? null}
                note={m.note}
                onOpenTrace={onOpenTrace}
              />
            )
          )}

          {phase === "running" && <Thinking activeIdx={activeIdx} />}
        </div>
      </div>

      {/* Composer — fixed to bottom of this column */}
      <div
        style={{
          flexShrink: 0,
          padding: "12px clamp(18px, 4vw, 54px) 10px",
          background: "color-mix(in oklab, var(--bg) 85%, transparent)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderTop: "1px solid var(--line-soft)",
        }}
      >
        <div style={{ maxWidth: "var(--composer-max)", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 13,
              padding: "10px 14px",
            }}
          >
            <textarea
              rows={1}
              value={input}
              onChange={(e) => {
                onInput(e.target.value);
                // auto-resize up to 120px
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="Ask a question about Module 3…"
              disabled={phase === "running"}
              aria-label="Ask a question"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                resize: "none",
                fontSize: 13.5,
                fontFamily: "var(--font-mono, monospace)",
                color: "var(--txt)",
                lineHeight: 1.5,
                minHeight: 22,
                maxHeight: 120,
                overflow: "auto",
              }}
            />
            <button
              onClick={onSubmit}
              disabled={phase === "running" || !input.trim()}
              aria-label="Send"
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                border: "none",
                background: "var(--green)",
                color: "var(--on-green)",
                fontSize: 13,
                fontWeight: 400,
                fontFamily: "var(--font-mono, monospace)",
                cursor: phase === "running" || !input.trim() ? "not-allowed" : "pointer",
                opacity: phase === "running" || !input.trim() ? 0.45 : 1,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                transition: "opacity 0.15s",
              }}
            >
              ↑
            </button>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 10.5,
              color: "var(--txt-faint)",
              marginTop: 7,
              paddingLeft: 2,
            }}
          >
            <span>
              <span
                style={{
                  background: "var(--panel-2)",
                  border: "1px solid var(--line)",
                  borderRadius: 4,
                  padding: "1px 5px",
                  marginRight: 5,
                  fontSize: 10,
                }}
              >
                ↵
              </span>
              send
            </span>
            <span>grounded in your course corpus · faithful &amp; cited</span>
          </div>
        </div>
      </div>
    </div>
  );
}

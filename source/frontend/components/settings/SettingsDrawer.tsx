"use client";

import type { InferenceBackend } from "@/lib/api";

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  backend: InferenceBackend;
  onBackendChange: (v: InferenceBackend) => void;
}

export function SettingsDrawer({ open, onClose, backend, onBackendChange }: SettingsDrawerProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop — matches handoff: color-mix(#000 55%) + blur(3px) */}
      <div
        aria-hidden
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 80,
          background: "color-mix(in oklab, #000 55%, transparent)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          display: "flex",
          justifyContent: "flex-end",
          animation: "fade 0.2s",
        }}
      />

      {/* Panel — matches handoff: min(420px,92vw), slidein 280ms */}
      <aside
        role="dialog"
        aria-label="Settings"
        aria-modal
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(420px, 92vw)",
          background: "var(--bg)",
          borderLeft: "1px solid var(--line)",
          zIndex: 81,
          overflowY: "auto",
          padding: 22,
          animation: "slidein 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close settings"
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            width: 34,
            height: 34,
            borderRadius: 9,
            border: "1px solid var(--line)",
            background: "var(--panel)",
            color: "var(--txt-dim)",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ✕
        </button>

        {/* Title — Newsreader serif matching handoff */}
        <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 500, fontSize: 24, marginBottom: 4, color: "var(--txt)" }}>
          Settings
        </h2>
        <div style={{ marginBottom: 22 }} />

        <DrawerBody backend={backend} onBackendChange={onBackendChange} />
      </aside>
    </>
  );
}

function DrawerBody({ backend, onBackendChange }: { backend: InferenceBackend; onBackendChange: (v: InferenceBackend) => void }) {
  return (
    <>
      <DGroup title="LLM BACKEND">
        <InferenceToggle value={backend} onChange={onBackendChange} />
      </DGroup>
      <DGroup title="CORPUS">
        <CorpusManager />
      </DGroup>
    </>
  );
}

function DGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <p style={{ fontSize: 10.5, letterSpacing: "2px", textTransform: "uppercase", color: "var(--green-2)", marginBottom: 12 }}>
        {title}
      </p>
      {children}
    </div>
  );
}

const BACKENDS: Array<{ value: InferenceBackend; label: string; name: string; desc: string; badges: Array<[string, string]> }> = [
  {
    value: "ollama",
    label: "Ollama · local",
    name: "llama3.2",
    desc: "Runs fully on your machine. Nothing leaves the device — ideal for course notes.",
    badges: [["private", "g"], ["free", "g"], ["~8B", ""]],
  },
  {
    value: "groq",
    label: "Groq",
    name: "llama-3.1-8b-instant",
    desc: "Free-tier Groq cloud inference. Very fast throughput.",
    badges: [["cloud", ""], ["free-tier", "g"], ["fast", "g"]],
  },
  {
    value: "cerebras",
    label: "Cerebras",
    name: "gpt-oss-120b",
    desc: "Cerebras wafer-scale inference — 120B reasoning model on their free tier.",
    badges: [["cloud", ""], ["free-tier", "g"], ["120B", ""]],
  },
  {
    value: "gemini",
    label: "Gemini",
    name: "gemini-2.0-flash",
    desc: "Google Gemini 2.0 Flash via free API key.",
    badges: [["cloud", ""], ["free-tier", "g"], ["multimodal", ""]],
  },
  {
    value: "openrouter",
    label: "OpenRouter",
    name: "nemotron-120b:free",
    desc: "OpenRouter free-tier — Nvidia Nemotron 120B, 1M context, zero cost.",
    badges: [["cloud", ""], ["free", "g"], ["multi-provider", ""]],
  },
];

function InferenceToggle({ value, onChange }: { value: InferenceBackend; onChange: (v: InferenceBackend) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {BACKENDS.map((b) => {
        const active = value === b.value;
        return (
          <div
            key={b.value}
            role="button"
            tabIndex={0}
            aria-pressed={active}
            onClick={() => onChange(b.value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onChange(b.value); }}
            style={{
              border: `1px solid ${active ? "var(--green)" : "var(--line)"}`,
              borderRadius: 12,
              padding: "13px 15px",
              display: "flex",
              gap: 13,
              alignItems: "flex-start",
              marginBottom: 9,
              background: active ? "color-mix(in oklab, var(--green) 6%, var(--panel))" : "var(--panel)",
              boxShadow: active ? "var(--glow)" : "none",
              cursor: "pointer",
            }}
          >
            {/* Radio dot */}
            <div style={{
              width: 18, height: 18, borderRadius: "50%",
              border: `2px solid ${active ? "var(--green)" : "var(--line)"}`,
              flexShrink: 0, marginTop: 2,
              display: "grid", placeItems: "center",
            }}>
              {active && <div style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--green)" }} />}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--txt)", display: "flex", alignItems: "center", gap: 8 }}>
                {b.label}
                <span style={{ color: "var(--txt-faint)", fontWeight: 400, fontSize: 11 }}>· {b.name}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--txt-dim)", lineHeight: 1.5, marginTop: 3 }}>{b.desc}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {b.badges.map(([label, cls], i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                      border: `1px solid ${cls === "g" ? "color-mix(in oklab, var(--green) 40%, var(--line))" : "var(--line)"}`,
                      borderRadius: 999,
                      padding: "2px 8px",
                      color: cls === "g" ? "var(--green)" : "var(--txt-faint)",
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
      <p style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: "var(--txt-faint)", marginTop: 2 }}>
        Wires to <code style={{ color: "var(--cyan)" }}>POST /settings/inference</code> once engine is ready.
      </p>
    </div>
  );
}

function CorpusManager() {
  return (
    <div style={{ fontSize: 11.5, color: "var(--txt-dim)", lineHeight: 1.7 }}>
      ✓ 10 topics · all of modules 3.1–3.10 · bias–variance, regularization, KNN, gradient descent, confusion matrix, distributions, k-means, time series, convolution, embeddings<br />
      ✓ seed corpus · lesson transcripts + textbook extracts<br />
      <span style={{ color: "var(--txt-faint)" }}>retrieval scope: seed corpus only · web off</span>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          disabled
          title="Awaiting Ben's clear-corpus endpoint"
          aria-label="Clear corpus — not yet available"
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "transparent",
            color: "var(--txt-faint)",
            cursor: "not-allowed",
          }}
        >
          Clear corpus
        </button>
        <button
          disabled
          title="Awaiting Ben's upload endpoint"
          aria-label="Upload documents — not yet available"
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px dashed var(--line)",
            background: "transparent",
            color: "var(--txt-faint)",
            cursor: "not-allowed",
          }}
        >
          + Upload documents
        </button>
      </div>
    </div>
  );
}

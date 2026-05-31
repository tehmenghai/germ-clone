"use client";

import { useState } from "react";

type InferenceBackend = "ollama" | "cloud";

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "oklch(0 0 0 / 0.5)",
          zIndex: 40,
        }}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Settings"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 360,
          background: "var(--panel)",
          borderLeft: "1px solid var(--line)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5"
          style={{
            height: "var(--header-h)",
            borderBottom: "1px solid var(--line)",
            flexShrink: 0,
          }}
        >
          <span className="font-mono font-semibold" style={{ fontSize: 14, color: "var(--txt)" }}>
            Settings
          </span>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="font-mono"
            style={{
              width: 28,
              height: 28,
              borderRadius: "var(--r-sm)",
              border: "1px solid var(--line)",
              background: "transparent",
              color: "var(--txt-dim)",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ×
          </button>
        </div>

        <DrawerBody />
      </aside>
    </>
  );
}

function DrawerBody() {
  const [backend, setBackend] = useState<InferenceBackend>("ollama");

  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: "20px" }}>
      <Section title="INFERENCE">
        <InferenceToggle value={backend} onChange={setBackend} />
      </Section>
      <Section title="CORPUS">
        <CorpusManager />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="font-mono mb-3" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", letterSpacing: "0.08em" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

const BACKENDS: Array<{ value: InferenceBackend; label: string; desc: string }> = [
  { value: "ollama", label: "Ollama (local)", desc: "Runs on your machine — zero latency, offline capable." },
  { value: "cloud",  label: "Free cloud",    desc: "Routes to a free-tier cloud provider (Groq / Together)." },
];

function InferenceToggle({ value, onChange }: { value: InferenceBackend; onChange: (v: InferenceBackend) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {BACKENDS.map((b) => {
        const active = value === b.value;
        return (
          <button
            key={b.value}
            onClick={() => onChange(b.value)}
            aria-pressed={active}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 12px",
              background: active ? "var(--panel-2)" : "var(--bg-2)",
              borderRadius: "var(--r-md)",
              border: `1px solid ${active ? "var(--green)" : "var(--line)"}`,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {/* Radio dot */}
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                border: `2px solid ${active ? "var(--green)" : "var(--line)"}`,
                background: active ? "var(--green)" : "transparent",
                flexShrink: 0,
                marginTop: 2,
              }}
            />
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span className="font-mono" style={{ fontSize: "var(--font-base)", color: active ? "var(--green)" : "var(--txt-dim)", fontWeight: active ? 600 : 400 }}>
                {b.label}
              </span>
              <span className="font-mono" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)" }}>
                {b.desc}
              </span>
            </span>
          </button>
        );
      })}
      <p className="font-mono" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", marginTop: 4 }}>
        Wires to <code style={{ color: "var(--cyan)" }}>POST /settings/inference</code> once engine is ready.
      </p>
    </div>
  );
}

function CorpusManager() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          padding: "10px 12px",
          background: "var(--bg-2)",
          borderRadius: "var(--r-md)",
          border: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span className="font-mono" style={{ fontSize: "var(--font-base)", color: "var(--txt-dim)" }}>
          Module 3 seed corpus
        </span>
        <button
          disabled
          title="Awaiting Ben's clear-corpus endpoint"
          aria-label="Clear corpus — not yet available"
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "var(--font-label)",
            padding: "3px 10px",
            borderRadius: "var(--r-sm)",
            border: "1px solid var(--line)",
            background: "transparent",
            color: "var(--txt-faint)",
            cursor: "not-allowed",
          }}
        >
          Clear
        </button>
      </div>

      <button
        disabled
        title="Awaiting Ben's upload endpoint"
        aria-label="Upload documents — not yet available"
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "var(--font-label)",
          padding: "8px 12px",
          borderRadius: "var(--r-md)",
          border: "1px dashed var(--line)",
          background: "var(--bg-2)",
          color: "var(--txt-faint)",
          cursor: "not-allowed",
          textAlign: "center",
        }}
      >
        + Upload documents
      </button>

      <p className="font-mono" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)" }}>
        Wires to Ben's <code style={{ color: "var(--cyan)" }}>POST /corpus/upload</code> once ingest is ready.
      </p>
    </div>
  );
}

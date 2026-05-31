"use client";

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

        <div className="flex-1 overflow-y-auto" style={{ padding: "20px" }}>
          <Section title="INFERENCE">
            <InferenceToggle />
          </Section>

          <Section title="CORPUS">
            <CorpusManager />
          </Section>
        </div>
      </aside>
    </>
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

function InferenceToggle() {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: "var(--bg-2)",
        borderRadius: "var(--r-md)",
        border: "1px solid var(--line)",
      }}
    >
      <p className="font-mono" style={{ fontSize: "var(--font-base)", color: "var(--txt-dim)" }}>
        Inference backend: <span style={{ color: "var(--green)" }}>Ollama (local)</span>
      </p>
      <p className="font-mono mt-1" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)" }}>
        Toggle wires to <code>/settings/inference</code> once engine is ready.
      </p>
    </div>
  );
}

function CorpusManager() {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: "var(--bg-2)",
        borderRadius: "var(--r-md)",
        border: "1px solid var(--line)",
      }}
    >
      <p className="font-mono" style={{ fontSize: "var(--font-base)", color: "var(--txt-dim)" }}>
        Corpus management will be wired here in Phase 2.
      </p>
      <p className="font-mono mt-1" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)" }}>
        Clear corpus · upload documents
      </p>
    </div>
  );
}

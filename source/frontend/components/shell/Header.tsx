"use client";

import { type Theme, getTheme, setTheme } from "@/lib/theme";
import { useEffect, useRef, useState } from "react";
import { type InferenceBackend } from "@/lib/api";

export type ViewMode = "reading" | "console";
export type Difficulty = "eli5" | "standard" | "academia";

interface HeaderProps {
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  onSettings: () => void;
  onHome?: () => void;
  ragPipeActive?: boolean;
  onRagPipe?: () => void;
  hasActiveTopic?: boolean;
  backend: InferenceBackend;
  onBackendChange: (v: InferenceBackend) => void;
}

export function Header({ viewMode, onViewMode, difficulty, onDifficulty, onSettings, onHome, ragPipeActive, onRagPipe, hasActiveTopic, backend, onBackendChange }: HeaderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "matrix";
    return (document.documentElement.getAttribute("data-theme") as Theme) ?? getTheme();
  });

  function toggleTheme() {
    const next: Theme = theme === "matrix" ? "clinical" : "matrix";
    setTheme(next);
    setThemeState(next);
  }

  return (
    <header
      className="flex items-center shrink-0"
      style={{
        height: "var(--header-h)",
        gap: 10,
        padding: "0 16px",
        background: "var(--glass-bg)",
        backdropFilter: "blur(var(--glass-blur))",
        WebkitBackdropFilter: "blur(var(--glass-blur))",
        borderBottom: "1px solid var(--line-soft)",
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* Brand — avatar + wordmark — click to home */}
      <button
        onClick={onHome}
        aria-label="Back to home"
        className="flex items-center"
        style={{
          gap: 11,
          background: "transparent",
          border: "none",
          cursor: onHome ? "pointer" : "default",
          padding: 0,
          borderRadius: 8,
          outline: "none",
        }}
        onMouseEnter={(e) => { if (onHome) (e.currentTarget as HTMLElement).style.opacity = "0.8"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
      >
        {/* Neo face logo — theme-adaptive via CSS vars */}
        <svg
          aria-hidden
          width="34"
          height="34"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ flexShrink: 0, border: "1px solid var(--line)", borderRadius: 7 }}
        >
          <rect width="32" height="32" rx="7" fill="var(--panel)"/>
          {/* Head — rounded chin via flattened lower bezier */}
          <path
            d="M16 6.5
               C13.5 6.3 11.0 7.6 9.8 9.8
               C8.9 11.5 9.1 13.0 8.6 15.0
               C8.1 17.0 8.4 18.7 9.6 20.1
               C10.8 21.5 12.0 22.5 13.0 23.6
               C14.0 24.7 15.0 25.4 16 25.5
               C17.0 25.4 18.0 24.7 19.0 23.6
               C20.0 22.5 21.2 21.5 22.4 20.1
               C23.6 18.7 23.9 17.0 23.4 15.0
               C23.0 13.0 23.1 11.5 22.2 9.8
               C21.0 7.6 18.5 6.3 16 6.5Z"
            stroke="var(--icon-stroke)" strokeWidth="1.0" strokeLinejoin="round" opacity={0.85}
          />
          {/* Neo fringe hair — 5 layered sweeping strands */}
          <path d="M8.5 10.5 C9.2 6.5 12.0 4.0 14.2 6.5 C14.9 7.3 15.4 8.5 15.8 9.5" stroke="var(--icon-hair)" strokeWidth="1.2" strokeLinecap="round" opacity={0.95}/>
          <path d="M9.5 9.2 C10.5 5.5 13.2 3.8 15.0 6.5 C15.6 7.4 16.0 8.6 16.2 9.4" stroke="var(--icon-hair)" strokeWidth="1.05" strokeLinecap="round" opacity={0.82}/>
          <path d="M10.5 8.0 C11.8 4.2 14.8 3.2 16.8 5.6 C17.5 6.5 17.8 7.8 17.9 9.0" stroke="var(--icon-hair)" strokeWidth="0.9" strokeLinecap="round" opacity={0.68}/>
          <path d="M12.0 7.0 C13.5 3.5 16.8 2.8 18.5 5.2 C19.1 6.1 19.3 7.4 19.1 8.6" stroke="var(--icon-hair)" strokeWidth="0.75" strokeLinecap="round" opacity={0.52}/>
          <path d="M13.5 6.5 C15.0 3.2 18.2 2.5 19.8 4.8 C20.3 5.7 20.4 7.0 20.0 8.2" stroke="var(--icon-hair)" strokeWidth="0.6" strokeLinecap="round" opacity={0.35}/>
          {/* Nose hint */}
          <path d="M15.6 17.0 Q16 17.5 16.4 17.0" stroke="var(--icon-stroke)" strokeWidth="0.6" strokeLinecap="round" opacity={0.4}/>
          {/* Left lens */}
          <path
            d="M9.0 13.4 C9.1 12.2 9.9 11.7 11.0 11.7 L14.2 11.7 C14.9 11.8 15.2 12.4 15.2 13.0 L15.2 15.0 C15.1 15.7 14.6 15.9 13.9 15.9 L10.8 15.9 C9.7 15.8 8.9 15.2 9.0 14.2 Z"
            stroke="var(--icon-stroke)" strokeWidth="0.85" strokeLinejoin="round"
            fill="var(--icon-lens-fill)"
          />
          {/* Right lens */}
          <path
            d="M23.0 13.4 C22.9 12.2 22.1 11.7 21.0 11.7 L17.8 11.7 C17.1 11.8 16.8 12.4 16.8 13.0 L16.8 15.0 C16.9 15.7 17.4 15.9 18.1 15.9 L21.2 15.9 C22.3 15.8 23.1 15.2 23.0 14.2 Z"
            stroke="var(--icon-stroke)" strokeWidth="0.85" strokeLinejoin="round"
            fill="var(--icon-lens-fill)"
          />
          {/* Bridge */}
          <path d="M15.2 13.5 Q16 13.2 16.8 13.5" stroke="var(--icon-stroke)" strokeWidth="0.8" strokeLinecap="round"/>
          {/* Temple left */}
          <path d="M9.0 13.6 C8.3 13.8 7.6 14.1 7.1 14.4" stroke="var(--icon-stroke)" strokeWidth="0.75" strokeLinecap="round"/>
          {/* Temple right */}
          <path d="M23.0 13.6 C23.7 13.8 24.4 14.1 24.9 14.4" stroke="var(--icon-stroke)" strokeWidth="0.75" strokeLinecap="round"/>
        </svg>
        <div>
          <div
            className="wordmark-germ"
            style={{ fontWeight: 700, letterSpacing: "0.4px", fontSize: 14, lineHeight: 1.1, color: "var(--txt)" }}
          >
            germ<span style={{ color: "var(--txt-faint)" }}>{"//"}</span>clone
          </div>
          <div style={{ fontSize: 10, color: "var(--txt-faint)", letterSpacing: "0.3px" }}>
            module 3 tutor · ML 3.1–3.10
          </div>
        </div>
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Controls */}
      <div className="flex items-center" style={{ gap: 9 }}>
        {/* View mode — red pill / blue pill */}
        <PillToggle value={viewMode} onChange={(v) => onViewMode(v as ViewMode)} />

        {/* Difficulty */}
        <SegControl
          options={[
            { value: "eli5",     label: "ELI5" },
            { value: "standard", label: "Standard" },
            { value: "academia", label: "Academia" },
          ]}
          value={difficulty}
          onChange={(v) => onDifficulty(v as Difficulty)}
        />

        {/* Agent Trace pill */}
        <button
          onClick={onRagPipe}
          aria-label="Show agent trace"
          title="Show agent trace"
          style={{
            fontSize: 11,
            padding: "7px 12px",
            borderRadius: 9,
            border: `1px solid ${ragPipeActive ? "var(--green-deep)" : "var(--line)"}`,
            background: ragPipeActive ? "color-mix(in oklab, var(--green-deep) 20%, var(--panel))" : "var(--panel)",
            color: ragPipeActive ? "var(--green)" : "var(--txt-faint)",
            cursor: "pointer",
            fontFamily: "var(--font-mono, monospace)",
            whiteSpace: "nowrap",
            transition: "background 0.15s, color 0.15s, border-color 0.15s",
          }}
        >
          ◷ Agent Trace
        </button>

        {/* LLM pill — click to switch backend */}
        <ModelPill backend={backend} onBackendChange={onBackendChange} />

        {/* Theme toggle */}
        <IconButton
          aria-label={`Switch to ${theme === "matrix" ? "clinical" : "matrix"} theme`}
          onClick={toggleTheme}
          title={theme === "matrix" ? "Clinical theme" : "Matrix theme"}
        >
          {theme === "matrix" ? "☾" : "☀"}
        </IconButton>

        {/* Settings — SVG gear matching handoff */}
        <IconButton aria-label="Settings" onClick={onSettings} title="Settings" className="settings-btn">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </IconButton>
      </div>
    </header>
  );
}

/* ---------- 3-D pill toggle (red = Rabbit Hole / blue = Plugged In) ---------- */

function RedPill({ active }: { active: boolean }) {
  return (
    <svg width="22" height="10" viewBox="0 0 44 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="rp-hi" cx="35%" cy="28%" r="60%">
          <stop offset="0%" stopColor="#ff9a9a"/>
          <stop offset="60%" stopColor="#d63030"/>
          <stop offset="100%" stopColor="#7a0c0c"/>
        </radialGradient>
        <radialGradient id="rp-sh" cx="50%" cy="80%" r="55%">
          <stop offset="0%" stopColor="#000" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="rp-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity={active ? 0.35 : 0.18}/>
          <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* body */}
      <rect x="1" y="1" width="42" height="18" rx="9" fill="url(#rp-hi)" opacity={active ? 1 : 0.5}/>
      {/* shadow underlay */}
      <rect x="1" y="1" width="42" height="18" rx="9" fill="url(#rp-sh)"/>
      {/* specular shine */}
      <rect x="4" y="2" width="36" height="8" rx="4" fill="url(#rp-shine)"/>
      {/* crease line */}
      <line x1="22" y1="2" x2="22" y2="18" stroke="#7a0c0c" strokeWidth="1.2" opacity="0.5"/>
    </svg>
  );
}

function BluePill({ active }: { active: boolean }) {
  return (
    <svg width="22" height="10" viewBox="0 0 44 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bp-hi" cx="35%" cy="28%" r="60%">
          <stop offset="0%" stopColor="#c8daff"/>
          <stop offset="55%" stopColor="#4a7ef5"/>
          <stop offset="100%" stopColor="#1230a0"/>
        </radialGradient>
        <radialGradient id="bp-sh" cx="50%" cy="80%" r="55%">
          <stop offset="0%" stopColor="#000" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="bp-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity={active ? 0.35 : 0.18}/>
          <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="42" height="18" rx="9" fill="url(#bp-hi)" opacity={active ? 1 : 0.5}/>
      <rect x="1" y="1" width="42" height="18" rx="9" fill="url(#bp-sh)"/>
      <rect x="4" y="2" width="36" height="8" rx="4" fill="url(#bp-shine)"/>
      <line x1="22" y1="2" x2="22" y2="18" stroke="#0a1f6e" strokeWidth="1.2" opacity="0.5"/>
    </svg>
  );
}

function PillToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const pills = [
    { value: "reading", label: "Rabbit Hole", pill: <RedPill  active={value === "reading"} /> },
    { value: "console", label: "Plugged In",  pill: <BluePill active={value === "console"} /> },
  ];
  return (
    <div
      style={{
        display: "inline-flex",
        border: "1px solid var(--line)",
        borderRadius: 9,
        overflow: "hidden",
        background: "var(--panel)",
      }}
    >
      {pills.map((p) => {
        const active = value === p.value;
        return (
          <button
            key={p.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(p.value)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              padding: "6px 11px",
              border: 0,
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: active ? "var(--panel-2)" : "transparent",
              color: active ? "var(--txt)" : "var(--txt-dim)",
              fontFamily: "var(--font-mono, monospace)",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {p.pill}
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

interface SegOption {
  value: string;
  label: string;
}

// Matches handoff: border 1px --line, border-radius 9px, overflow hidden, panel bg
// Active: panel-2 bg + green text (not green bg)
function SegControl({ options, value, onChange }: {
  options: SegOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      role="tablist"
      className="flex items-center font-mono"
      style={{
        display: "inline-flex",
        border: "1px solid var(--line)",
        borderRadius: 9,
        overflow: "hidden",
        background: "var(--panel)",
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={opt.value === value}
          onClick={() => onChange(opt.value)}
          style={{
            fontSize: 11,
            padding: "7px 11px",
            border: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
            background: opt.value === value ? "var(--panel-2)" : "transparent",
            color: opt.value === value ? "var(--green)" : "var(--txt-dim)",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}


const BACKEND_META: Record<InferenceBackend, { label: string; model: string }> = {
  ollama:      { label: "Local",       model: "llama3.2" },
  groq:        { label: "Groq",        model: "llama-3.1-8b-instant" },
  cerebras:    { label: "Cerebras",    model: "gpt-oss-120b" },
  gemini:      { label: "Gemini",      model: "gemini-2.0-flash" },
  openrouter:  { label: "OpenRouter",  model: "nemotron-120b:free" },
  cloud:       { label: "Groq",        model: "llama-3.1-8b-instant" },
};

function ModelPill({ backend, onBackendChange }: { backend: InferenceBackend; onBackendChange: (v: InferenceBackend) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  function select(v: InferenceBackend) {
    onBackendChange(v);
    setOpen(false);
  }

  const meta = BACKEND_META[backend];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch LLM backend"
        title="Switch LLM backend"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          border: `1px solid ${open ? "var(--green-deep)" : "var(--line)"}`,
          borderRadius: 999,
          padding: "7px 12px",
          background: open ? "color-mix(in oklab, var(--green-deep) 15%, var(--panel))" : "var(--panel)",
          color: "var(--txt-dim)",
          cursor: "pointer",
          fontFamily: "var(--font-mono, monospace)",
          transition: "background 0.15s, border-color 0.15s",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", boxShadow: "var(--glow)", flexShrink: 0 }} />
        <strong style={{ color: "var(--txt)", fontWeight: 600 }}>{meta.model}</strong>
        <span style={{ color: "var(--txt-faint)", fontSize: 10 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            background: "var(--bg)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            overflow: "hidden",
            zIndex: 50,
            minWidth: 200,
            boxShadow: "0 8px 24px oklch(0 0 0 / 0.4)",
            animation: "fadein 0.15s",
          }}
        >
          {(["ollama", "groq", "cerebras", "gemini", "openrouter"] as InferenceBackend[]).map((v) => {
            const m = BACKEND_META[v];
            const active = backend === v;
            return (
              <button
                key={v}
                onClick={() => select(v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "10px 14px",
                  border: "none",
                  borderBottom: "1px solid var(--line-soft)",
                  background: active ? "color-mix(in oklab, var(--green) 8%, var(--panel))" : "transparent",
                  color: active ? "var(--txt)" : "var(--txt-dim)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "var(--font-mono, monospace)",
                  textAlign: "left",
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: active ? "var(--green)" : "var(--line)",
                  boxShadow: active ? "var(--glow)" : "none",
                }} />
                <span>
                  <span style={{ fontWeight: 600, color: active ? "var(--green)" : "var(--txt)" }}>{m.label}</span>
                  <span style={{ color: "var(--txt-faint)", fontSize: 10, marginLeft: 6 }}>· {m.model}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IconButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={className}
      style={{
        width: 36,
        height: 36,
        borderRadius: 9,
        border: "1px solid var(--line)",
        background: "var(--panel)",
        color: "var(--txt-dim)",
        display: "grid",
        placeItems: "center",
        fontSize: 15,
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

"use client";

import { type Theme, getTheme, setTheme } from "@/lib/theme";
import { useEffect, useState } from "react";

export type ViewMode = "red-pill" | "blue-pill";
export type Difficulty = "eli5" | "standard" | "academia";

interface HeaderProps {
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  onSettings: () => void;
}

export function Header({ viewMode, onViewMode, difficulty, onDifficulty, onSettings }: HeaderProps) {
  const [theme, setThemeState] = useState<Theme>("matrix");

  useEffect(() => {
    setThemeState(getTheme());
  }, []);

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
      {/* Brand — avatar + wordmark */}
      <div className="flex items-center" style={{ gap: 11 }}>
        <div
          aria-hidden
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: 15,
            color: "var(--on-green)",
            background: "linear-gradient(160deg, var(--green-2), var(--green-deep))",
            boxShadow: "var(--glow)",
            position: "relative",
            flexShrink: 0,
          }}
        >
          g
          {/* Online indicator dot */}
          <span style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "var(--green)",
            border: "2px solid var(--bg)",
          }} />
        </div>
        <div>
          <div
            className="wordmark-germ"
            style={{ fontWeight: 700, letterSpacing: "0.4px", fontSize: 14, lineHeight: 1.1, color: "var(--txt)" }}
          >
            germ<span style={{ color: "var(--txt-faint)" }}>//</span>clone
          </div>
          <div style={{ fontSize: 10, color: "var(--txt-faint)", letterSpacing: "0.3px" }}>
            module 3 tutor · ML 3.1–3.10
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Controls */}
      <div className="flex items-center" style={{ gap: 9 }}>
        {/* View mode — pill control */}
        <PillControl value={viewMode} onChange={(v) => onViewMode(v as ViewMode)} />

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

        {/* LLM pill — static until engine lands */}
        <div
          className="font-mono"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            border: "1px solid var(--line)",
            borderRadius: 999,
            padding: "7px 12px",
            background: "var(--panel)",
            color: "var(--txt-dim)",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", boxShadow: "var(--glow)", flexShrink: 0 }} />
          <strong style={{ color: "var(--txt)", fontWeight: 600 }}>llama3.2</strong>
        </div>

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

const PILL_OPTIONS: Array<{ value: ViewMode; label: string; bg: string; fg: string; border: string; icon: string }> = [
  { value: "red-pill",  label: "Red Pill",  bg: "var(--pill-red-bg)",  fg: "var(--on-pill-red)",  border: "var(--pill-red)",  icon: "/pill-red.svg" },
  { value: "blue-pill", label: "Blue Pill", bg: "var(--pill-blue-bg)", fg: "var(--on-pill-blue)", border: "var(--pill-blue)", icon: "/pill-blue.svg" },
];

function PillControl({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div
      role="tablist"
      aria-label="View mode"
      className="font-mono"
      style={{
        display: "inline-flex",
        border: "1px solid var(--line)",
        borderRadius: 9,
        overflow: "hidden",
        background: "var(--panel)",
      }}
    >
      {PILL_OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            aria-label={`${opt.label} view`}
            onClick={() => onChange(opt.value)}
            style={{
              fontSize: 11,
              padding: "7px 11px",
              border: active ? `1px solid ${opt.border}` : "1px solid transparent",
              cursor: "pointer",
              background: active ? opt.bg : "transparent",
              color: active ? opt.fg : "var(--txt-dim)",
              fontWeight: active ? 600 : 400,
              boxShadow: active ? `0 0 8px ${opt.border}55` : "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
              transition: "background 0.15s, color 0.15s, border-color 0.15s",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={opt.icon} alt="" aria-hidden width={20} height={9} style={{ display: "block", opacity: active ? 1 : 0.4 }} />
            {opt.label}
          </button>
        );
      })}
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

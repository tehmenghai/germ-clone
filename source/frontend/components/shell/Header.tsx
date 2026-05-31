"use client";

import { type Theme, getTheme, setTheme } from "@/lib/theme";
import { useEffect, useState } from "react";

export type ViewMode = "reality" | "matrix";
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
      className="flex items-center justify-between px-5 shrink-0"
      style={{
        height: "var(--header-h)",
        background: "var(--bg-2)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      {/* Wordmark */}
      <div className="flex items-center gap-3">
        <span
          className="font-mono font-semibold tracking-tight"
          style={{ fontSize: 15, color: "var(--green)" }}
        >
          germ<span style={{ color: "var(--txt-faint)" }}>//</span>clone
        </span>
        <span
          className="font-mono"
          style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", letterSpacing: "0.08em" }}
        >
          ML TUTOR
        </span>
      </div>

      {/* Centre controls */}
      <div className="flex items-center gap-4">
        {/* View mode seg control */}
        <SegControl
          options={[
            { value: "reality", label: "Reality" },
            { value: "matrix",  label: "Matrix" },
          ]}
          value={viewMode}
          onChange={(v) => onViewMode(v as ViewMode)}
        />

        {/* Difficulty seg control */}
        <SegControl
          options={[
            { value: "eli5",      label: "ELI5" },
            { value: "standard",  label: "Standard" },
            { value: "academia",  label: "Academia" },
          ]}
          value={difficulty}
          onChange={(v) => onDifficulty(v as Difficulty)}
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <IconButton
          aria-label={`Switch to ${theme === "matrix" ? "clinical" : "matrix"} theme`}
          onClick={toggleTheme}
          title={theme === "matrix" ? "Clinical theme" : "Matrix theme"}
        >
          {theme === "matrix" ? "◑" : "●"}
        </IconButton>
        <IconButton aria-label="Settings" onClick={onSettings} title="Settings">
          ⚙
        </IconButton>
      </div>
    </header>
  );
}

interface SegOption {
  value: string;
  label: string;
}

function SegControl({ options, value, onChange }: {
  options: SegOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      role="tablist"
      className="flex items-center"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-sm)",
        padding: 2,
        gap: 2,
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={opt.value === value}
          onClick={() => onChange(opt.value)}
          className="font-mono transition-colors"
          style={{
            fontSize: "var(--font-label)",
            letterSpacing: "0.06em",
            padding: "3px 10px",
            borderRadius: "calc(var(--r-sm) - 2px)",
            border: "none",
            cursor: "pointer",
            background: opt.value === value ? "var(--green)" : "transparent",
            color: opt.value === value ? "var(--on-green)" : "var(--txt-dim)",
            fontWeight: opt.value === value ? 600 : 400,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function IconButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="flex items-center justify-center transition-colors"
      style={{
        width: 30,
        height: 30,
        borderRadius: "var(--r-sm)",
        border: "1px solid var(--line)",
        background: "var(--panel)",
        color: "var(--txt-dim)",
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

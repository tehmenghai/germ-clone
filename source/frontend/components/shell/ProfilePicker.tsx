"use client";

import { useState } from "react";

export interface Profile {
  id: string;
  name: string;
}

interface ProfilePickerProps {
  onSelect: (profile: Profile) => void;
}

const DEMO_PROFILES: Profile[] = [
  { id: "1", name: "Neo" },
  { id: "2", name: "Morpheus" },
  { id: "3", name: "Trinity" },
];

export function ProfilePicker({ onSelect }: ProfilePickerProps) {
  const [newName, setNewName] = useState("");
  const [profiles] = useState<Profile[]>(DEMO_PROFILES);

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    const profile: Profile = { id: Date.now().toString(), name };
    onSelect(profile);
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-6"
      style={{ minHeight: "100vh", background: "transparent", position: "relative", zIndex: 1 }}
    >
      <div
        className="flex flex-col gap-5"
        style={{
          width: 360,
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)",
          padding: "32px 28px",
          boxShadow: "var(--shadow)",
        }}
      >
        <div>
          <h1
            className="font-mono font-semibold"
            style={{ fontSize: 18, color: "var(--green)", letterSpacing: "-0.02em" }}
          >
            germ//clone
          </h1>
          <p className="font-mono mt-1" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)", letterSpacing: "0.08em" }}>
            SELECT PROFILE
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="font-mono text-left transition-colors"
              style={{
                padding: "10px 14px",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--line)",
                background: "var(--bg-2)",
                color: "var(--txt)",
                fontSize: "var(--font-base)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
          <p className="font-mono mb-2" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)" }}>
            NEW PROFILE
          </p>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Name"
              className="font-mono flex-1"
              style={{
                padding: "8px 12px",
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--line)",
                background: "var(--bg)",
                color: "var(--txt)",
                fontSize: "var(--font-base)",
                outline: "none",
              }}
            />
            <button
              onClick={handleAdd}
              className="font-mono font-semibold"
              style={{
                padding: "8px 16px",
                borderRadius: "var(--r-sm)",
                border: "none",
                background: "var(--green)",
                color: "var(--on-green)",
                fontSize: "var(--font-base)",
                cursor: "pointer",
              }}
            >
              Go
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

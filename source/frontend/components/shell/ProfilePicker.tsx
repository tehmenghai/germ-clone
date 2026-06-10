"use client";

import { useEffect, useState } from "react";
import { getProfiles, createProfile, type Profile } from "@/lib/api";

export type { Profile };

interface ProfilePickerProps {
  onSelect: (profile: Profile) => void;
}

export function ProfilePicker({ onSelect }: ProfilePickerProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfiles()
      .then(setProfiles)
      .catch(() => setError("Could not load profiles."));
  }, []);

  async function handleAdd() {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    setError(null);
    try {
      const profile = await createProfile(name);
      setProfiles((prev) => [...prev, profile]);
      onSelect(profile);
    } catch {
      setError("Failed to create profile.");
    } finally {
      setCreating(false);
    }
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
          {profiles.length === 0 && !error && (
            <p className="font-mono" style={{ fontSize: "var(--font-label)", color: "var(--txt-faint)" }}>
              No profiles yet — create one below.
            </p>
          )}
        </div>

        {error && (
          <p className="font-mono" style={{ fontSize: 11, color: "var(--red, #e05555)" }}>{error}</p>
        )}

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
              aria-label="New profile name"
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
              disabled={creating || !newName.trim()}
              className="font-mono font-semibold"
              style={{
                padding: "8px 16px",
                borderRadius: "var(--r-sm)",
                border: "none",
                background: "var(--green)",
                color: "var(--on-green)",
                fontSize: "var(--font-base)",
                cursor: creating || !newName.trim() ? "not-allowed" : "pointer",
                opacity: creating || !newName.trim() ? 0.55 : 1,
              }}
            >
              {creating ? "…" : "Go"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

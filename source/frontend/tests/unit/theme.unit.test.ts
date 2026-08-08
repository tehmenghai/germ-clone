// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTheme, setTheme, initTheme } from "@/lib/theme";

describe("theme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("returns the stored theme when present", () => {
    localStorage.setItem("gc-theme", "clinical");
    expect(getTheme()).toBe("clinical");
  });

  it("ignores a corrupt stored value and falls back to time-of-day", () => {
    localStorage.setItem("gc-theme", "not-a-theme");
    expect(["matrix", "clinical"]).toContain(getTheme());
  });

  it("picks clinical during SGT daytime (07:00-19:00 SGT / UTC+8)", () => {
    vi.setSystemTime(new Date("2026-07-18T04:00:00Z")); // 12:00 SGT
    expect(getTheme()).toBe("clinical");
    vi.useRealTimers();
  });

  it("picks matrix outside SGT daytime", () => {
    vi.setSystemTime(new Date("2026-07-18T18:00:00Z")); // 02:00 SGT
    expect(getTheme()).toBe("matrix");
    vi.useRealTimers();
  });

  it("setTheme persists to localStorage and sets the DOM attribute", () => {
    setTheme("clinical");
    expect(localStorage.getItem("gc-theme")).toBe("clinical");
    expect(document.documentElement.getAttribute("data-theme")).toBe("clinical");
  });

  it("initTheme applies getTheme's result to the DOM", () => {
    localStorage.setItem("gc-theme", "matrix");
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("matrix");
  });
});

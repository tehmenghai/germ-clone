export type Theme = "matrix" | "clinical";

const STORAGE_KEY = "gc-theme";

function timeOfDayTheme(): Theme {
  const hour = (new Date().getUTCHours() + 8) % 24;
  return hour >= 7 && hour < 19 ? "clinical" : "matrix";
}

export function getTheme(): Theme {
  if (typeof window === "undefined") return "matrix";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "matrix" || stored === "clinical") return stored;
  return timeOfDayTheme();
}

export function setTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
}

export function initTheme() {
  const theme = getTheme();
  document.documentElement.setAttribute("data-theme", theme);
}

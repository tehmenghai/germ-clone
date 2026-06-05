export type Theme = "matrix" | "clinical";

const KEY = "gc-theme";

function localTimeDefault(): Theme {
  const hour = new Date().getHours();
  return hour >= 7 && hour < 19 ? "clinical" : "matrix";
}

export function getTheme(): Theme {
  if (typeof window === "undefined") return "matrix";
  const saved = localStorage.getItem(KEY) as Theme | null;
  return saved === "matrix" || saved === "clinical" ? saved : localTimeDefault();
}

export function setTheme(theme: Theme) {
  localStorage.setItem(KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
}

export function initTheme() {
  const t = getTheme();
  document.documentElement.setAttribute("data-theme", t);
}

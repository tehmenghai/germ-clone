export type Theme = "matrix" | "clinical";

const KEY = "gc-theme";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "matrix";
  return (localStorage.getItem(KEY) as Theme) ?? "matrix";
}

export function setTheme(theme: Theme) {
  localStorage.setItem(KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
}

export function initTheme() {
  const t = getTheme();
  document.documentElement.setAttribute("data-theme", t);
}

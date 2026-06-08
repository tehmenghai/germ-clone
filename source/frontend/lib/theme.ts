export type Theme = "matrix" | "clinical";

function timeOfDayTheme(): Theme {
  const hour = (new Date().getUTCHours() + 8) % 24;
  return hour >= 7 && hour < 19 ? "clinical" : "matrix";
}

export function getTheme(): Theme {
  if (typeof window === "undefined") return "matrix";
  return timeOfDayTheme();
}

export function setTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function initTheme() {
  document.documentElement.setAttribute("data-theme", timeOfDayTheme());
}

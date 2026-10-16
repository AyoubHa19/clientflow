// Light / dark / system theme, kept in localStorage.
//
// The server can't know the user's choice, so the root layout runs
// THEME_SCRIPT inline in <head>: it adds the "dark" class to <html> before
// the first paint, so there is no flash of the wrong theme. The pattern
// comes from Next's guide "Preventing flash before hydration".

export const THEME_STORAGE_KEY = "clientflow-theme";

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/** Whether a choice means dark, given what the operating system prefers. */
export function resolvesToDark(theme: Theme, systemPrefersDark: boolean) {
  return theme === "dark" || (theme === "system" && systemPrefersDark);
}

// Kept tiny and self-contained: it runs before any of our code loads.
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var d=t==="dark"||((t!=="light")&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(theme: Theme) {
  const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", resolvesToDark(theme, prefersDark));
}

export function storeTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked (private mode); the choice then lasts this visit.
  }
  applyTheme(theme);
}

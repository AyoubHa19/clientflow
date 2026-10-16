"use client";

import { useEffect } from "react";
import { applyTheme, readStoredTheme, THEME_STORAGE_KEY } from "@/lib/theme";

/** Follows the system theme when the choice is "system", and other tabs. */
export function ThemeSync() {
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (readStoredTheme() === "system") applyTheme("system");
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) applyTheme(readStoredTheme());
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}

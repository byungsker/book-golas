"use client";

import { useEffect } from "react";

export function BlabThemeSync() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const applyTheme = (storedTheme?: string | null) => {
      const theme = storedTheme ?? window.localStorage.getItem("bookgolas.theme");
      document.documentElement.dataset.blabTheme = theme === "light"
        ? "light"
        : theme === "dark"
          ? "dark"
          : media.matches
            ? "light"
            : "dark";
    };

    applyTheme();
    const handleMediaChange = () => {
      const storedTheme = window.localStorage.getItem("bookgolas.theme");
      if (!storedTheme || storedTheme === "system") applyTheme(storedTheme);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "bookgolas.theme") applyTheme(event.newValue);
    };
    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      applyTheme(customEvent.detail);
    };
    media.addEventListener("change", handleMediaChange);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("bookgolas-theme-change", handleThemeChange);
    return () => {
      media.removeEventListener("change", handleMediaChange);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("bookgolas-theme-change", handleThemeChange);
    };
  }, []);

  return null;
}

"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminTheme = "light" | "dark";

const THEME_STORAGE_KEY = "bookgolas-admin-theme";
const THEME_CHANGE_EVENT = "bookgolas-admin-theme-change";

function readTheme(): AdminTheme {
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

function getServerTheme(): AdminTheme {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  function toggleTheme() {
    const nextTheme: AdminTheme = theme === "dark" ? "light" : "dark";
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  const isDark = theme === "dark";
  return (
    <Button suppressHydrationWarning type="button" variant="outline" size="sm" onClick={toggleTheme} aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}>
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      <span className="hidden sm:inline">{isDark ? "라이트" : "다크"}</span>
    </Button>
  );
}

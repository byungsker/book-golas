"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type AdminTheme = "light" | "dark";

const THEME_STORAGE_KEY = "bookgolas-admin-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<AdminTheme>(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  function toggleTheme() {
    const nextTheme: AdminTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  const isDark = theme === "dark";
  return (
    <Button suppressHydrationWarning type="button" variant="outline" size="sm" onClick={toggleTheme} aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}>
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      <span className="hidden sm:inline">{isDark ? "라이트" : "다크"}</span>
    </Button>
  );
}

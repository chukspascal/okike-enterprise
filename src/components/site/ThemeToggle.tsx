import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem("theme") as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // localStorage can be unavailable in privacy-restricted browser contexts.
  }
}

// Apply theme immediately when this file loads (prevents flicker)
if (typeof window !== "undefined") {
  applyTheme(getInitialTheme());
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Also apply the theme on mount in case something went wrong
  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);

  // Listen to storage events to sync theme across tabs
  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      if (e.key === "theme") {
        const newTheme = (e.newValue as Theme) || getInitialTheme();
        setTheme(newTheme);
        applyTheme(newTheme);
      }
    }
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <button
      onClick={toggle}
      type="button"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
      className="size-9 inline-flex items-center justify-center rounded-full border border-black/15 dark:border-white/20 bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#0e0e0e] dark:text-[#e3ee32] transition-colors"
    >
      <Sun className="size-4 hidden dark:block" />
      <Moon className="size-4 dark:hidden" />
    </button>
  );
}

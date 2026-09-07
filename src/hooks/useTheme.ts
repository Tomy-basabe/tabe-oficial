import { useState, useEffect, useCallback } from "react";

export type Theme = "dark" | "light" | "system";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as Theme | null;
      if (stored && (stored === "dark" || stored === "light" || stored === "system")) {
        return stored;
      }
    }
    // Default to light if no preference is stored
    return "light";
  });

  const getSystemTheme = (): "dark" | "light" => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  };

  const getResolvedTheme = useCallback((t: Theme): "dark" | "light" => {
    return t === "system" ? getSystemTheme() : t;
  }, []);

  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(() => {
    return getResolvedTheme(theme);
  });

  const setTheme = useCallback((newTheme: Theme | ((prev: Theme) => Theme)) => {
    setThemeState((prev) => {
      const nextTheme = typeof newTheme === "function" ? newTheme(prev) : newTheme;
      try {
        localStorage.setItem("theme", nextTheme);
        window.dispatchEvent(new CustomEvent("tabe-theme-change", { detail: nextTheme }));
      } catch (e) {}
      return nextTheme;
    });
  }, []);

  // Listen for changes from other components/tabs
  useEffect(() => {
    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<Theme>;
      if (customEvent.detail && (customEvent.detail === "dark" || customEvent.detail === "light" || customEvent.detail === "system")) {
        setThemeState(customEvent.detail);
      }
    };
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "theme" && (e.newValue === "dark" || e.newValue === "light" || e.newValue === "system")) {
        setThemeState(e.newValue as Theme);
      }
    };

    window.addEventListener("tabe-theme-change", handleCustomChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("tabe-theme-change", handleCustomChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    const currentResolved = getResolvedTheme(theme);
    
    root.classList.remove("light", "dark");
    root.classList.add(currentResolved);
    setResolvedTheme(currentResolved);

    // Listen for system theme changes if mode is "system"
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        const newResolved = mediaQuery.matches ? "dark" : "light";
        root.classList.remove("light", "dark");
        root.classList.add(newResolved);
        setResolvedTheme(newResolved);
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme, getResolvedTheme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const currentResolved = getResolvedTheme(prev);
      return currentResolved === "dark" ? "light" : "dark";
    });
  }, [getResolvedTheme, setTheme]);

  return { theme, resolvedTheme, setTheme, toggleTheme };
}

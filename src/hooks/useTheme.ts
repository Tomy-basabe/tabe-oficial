import { useState, useEffect } from "react";

export type Theme = "dark" | "light" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored && (stored === "dark" || stored === "light" || stored === "system")) {
      return stored;
    }
    // Default to system if no preference is stored
    return "system";
  });

  const getSystemTheme = (): "dark" | "light" => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  };

  const getResolvedTheme = (t: Theme): "dark" | "light" => {
    return t === "system" ? getSystemTheme() : t;
  };

  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(() => {
    return getResolvedTheme(theme);
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const currentResolved = getResolvedTheme(theme);
    
    root.classList.remove("light", "dark");
    root.classList.add(currentResolved);
    setResolvedTheme(currentResolved);

    // Store in localStorage
    localStorage.setItem("theme", theme);

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
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const currentResolved = getResolvedTheme(prev);
      return currentResolved === "dark" ? "light" : "dark";
    });
  };

  return { theme, resolvedTheme, setTheme, toggleTheme };
}

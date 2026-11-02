import { useState, useEffect, useCallback } from "react";

export type Theme = "dark" | "light" | "system";

const THEME_KEY = "theme";

function getSystemTheme(): "dark" | "light" {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

function resolveTheme(t: Theme): "dark" | "light" {
  if (t === "system") {
    return getSystemTheme();
  }
  return t;
}

function getInitialTheme(): Theme {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(THEME_KEY) as Theme | null;
      if (stored && (stored === "dark" || stored === "light" || stored === "system")) {
        return stored;
      }
      // Si el DOM ya tiene la clase dark (inyectada por el script temprano de index.html), respetar modo oscuro
      if (document.documentElement.classList.contains("dark")) {
        return "dark";
      }
      // Si el sistema operativo prefiere dark
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "system";
      }
    } catch (e) {}
  }
  return "system";
}

function applyToDOM(resolved: "dark" | "light") {
  if (typeof window === "undefined") return;
  const root = window.document.documentElement;
  if (resolved === "dark") {
    root.classList.remove("light");
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
}

// Estado singleton a nivel de módulo para que todas las páginas y componentes estén 100% sincronizados
let currentTheme: Theme = getInitialTheme();
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {}
  });
}

function updateGlobalTheme(next: Theme, save = true) {
  currentTheme = next;
  const resolved = resolveTheme(next);
  applyToDOM(resolved);

  if (save && typeof window !== "undefined") {
    try {
      localStorage.setItem(THEME_KEY, next);
      window.dispatchEvent(new CustomEvent("tabe-theme-change", { detail: next }));
    } catch (e) {}
  }

  notifyListeners();
}

// Inicializar la clase en el DOM inmediatamente
if (typeof window !== "undefined") {
  applyToDOM(resolveTheme(currentTheme));

  // Escuchar cambios de sistema operativo cuando el modo es "system"
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", () => {
      if (currentTheme === "system") {
        applyToDOM(getSystemTheme());
        notifyListeners();
      }
    });
  }

  // Escuchar storage y custom event para pestañas múltiples
  window.addEventListener("tabe-theme-change", (e: Event) => {
    const customEvent = e as CustomEvent<Theme>;
    const detail = customEvent.detail;
    if (detail && (detail === "dark" || detail === "light" || detail === "system") && detail !== currentTheme) {
      updateGlobalTheme(detail, false);
    }
  });

  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === THEME_KEY && e.newValue && (e.newValue === "dark" || e.newValue === "light" || e.newValue === "system")) {
      if (e.newValue !== currentTheme) {
        updateGlobalTheme(e.newValue as Theme, false);
      }
    }
  });
}

export function useTheme() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleChange = () => setTick((prev) => prev + 1);
    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  const setTheme = useCallback((newTheme: Theme | ((prev: Theme) => Theme)) => {
    const nextTheme = typeof newTheme === "function" ? newTheme(currentTheme) : newTheme;
    updateGlobalTheme(nextTheme, true);
  }, []);

  const toggleTheme = useCallback(() => {
    const currentResolved = resolveTheme(currentTheme);
    const nextTheme: Theme = currentResolved === "dark" ? "light" : "dark";
    updateGlobalTheme(nextTheme, true);
  }, []);

  const resolvedTheme = resolveTheme(currentTheme);

  return {
    theme: currentTheme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };
}

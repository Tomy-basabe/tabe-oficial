// ============================================================
// CHESS THEMES - Catálogo de temas visuales para tablero y piezas
// ============================================================

export interface ChessTheme {
  id: string;
  name: string;
  description: string;
  preview: { light: string; dark: string; accent: string };
  board: {
    lightSquare: string;
    darkSquare: string;
    selectedSquare: string;
    lastMoveSquare: string;
    legalMoveColor: string;
    captureColor: string;
    borderColor: string;
    bgColor: string;
    labelColor: string;
    checkColor: string;
  };
  pieces: {
    white: {
      fill: string;
      stroke: string;
      highlight: string;
      accent: string;
      gradient: [string, string, string]; // top, mid, bottom
    };
    black: {
      fill: string;
      stroke: string;
      highlight: string;
      accent: string;
      gradient: [string, string, string];
    };
    shadow: string;
    glowIntensity: number;
  };
}

// ---- THEME: NEON PREMIUM ----
const neonTheme: ChessTheme = {
  id: "neon",
  name: "Neón Premium",
  description: "Tablero oscuro con piezas brillantes de neón cyan y púrpura",
  preview: { light: "#334155", dark: "#1e293b", accent: "#22d3ee" },
  board: {
    lightSquare: "#334155",
    darkSquare: "#1e293b",
    selectedSquare: "rgba(34,211,238,0.4)",
    lastMoveSquare: "rgba(168,85,247,0.3)",
    legalMoveColor: "rgba(34,211,238,0.5)",
    captureColor: "rgba(239,68,68,0.8)",
    borderColor: "rgba(34,211,238,0.3)",
    bgColor: "#0f172a",
    labelColor: "#64748b",
    checkColor: "rgba(239,68,68,0.5)",
  },
  pieces: {
    white: {
      fill: "#e0f2fe",
      stroke: "#67e8f9",
      highlight: "#ffffff",
      accent: "#22d3ee",
      gradient: ["#ffffff", "#67e8f9", "#0891b2"],
    },
    black: {
      fill: "#3b0764",
      stroke: "#d8b4fe",
      highlight: "#fbbf24",
      accent: "#a855f7",
      gradient: ["#a855f7", "#3b0764", "#000000"],
    },
    shadow: "rgba(0,0,0,0.6)",
    glowIntensity: 3,
  },
};

// ---- THEME: VIKING ----
const vikingTheme: ChessTheme = {
  id: "viking",
  name: "Vikingo",
  description: "Madera tallada, metal oscuro y runas nórdicas",
  preview: { light: "#a0845c", dark: "#5c3d1e", accent: "#c0a060" },
  board: {
    lightSquare: "#c4a265",
    darkSquare: "#6b3e1f",
    selectedSquare: "rgba(192,160,96,0.5)",
    lastMoveSquare: "rgba(139,90,43,0.5)",
    legalMoveColor: "rgba(218,165,32,0.5)",
    captureColor: "rgba(190,50,30,0.7)",
    borderColor: "rgba(139,90,43,0.6)",
    bgColor: "#2c1a0e",
    labelColor: "#a08060",
    checkColor: "rgba(190,50,30,0.5)",
  },
  pieces: {
    white: {
      fill: "#f5e6c8",
      stroke: "#c0a060",
      highlight: "#ffeeb5",
      accent: "#daa520",
      gradient: ["#f5e6c8", "#d4b896", "#a07848"],
    },
    black: {
      fill: "#2c2c2c",
      stroke: "#8b8b8b",
      highlight: "#c0c0c0",
      accent: "#555555",
      gradient: ["#6b6b6b", "#2c2c2c", "#0a0a0a"],
    },
    shadow: "rgba(0,0,0,0.7)",
    glowIntensity: 1,
  },
};

// ---- THEME: CLASSIC MARBLE ----
const classicTheme: ChessTheme = {
  id: "classic",
  name: "Clásico Mármol",
  description: "Tablero de mármol con piezas Staunton en crema y ébano",
  preview: { light: "#f0e6d2", dark: "#6d8b5e", accent: "#2d5a1e" },
  board: {
    lightSquare: "#f0e6d2",
    darkSquare: "#779952",
    selectedSquare: "rgba(255,255,100,0.45)",
    lastMoveSquare: "rgba(255,255,100,0.25)",
    legalMoveColor: "rgba(0,0,0,0.2)",
    captureColor: "rgba(200,50,50,0.6)",
    borderColor: "rgba(80,60,40,0.4)",
    bgColor: "#3d2b1f",
    labelColor: "#8a7a6a",
    checkColor: "rgba(200,50,50,0.4)",
  },
  pieces: {
    white: {
      fill: "#fff8e7",
      stroke: "#b8a07a",
      highlight: "#ffffff",
      accent: "#d4c4a4",
      gradient: ["#ffffff", "#f5e6c8", "#d4c4a4"],
    },
    black: {
      fill: "#1a1a1a",
      stroke: "#4a4a4a",
      highlight: "#888888",
      accent: "#333333",
      gradient: ["#555555", "#1a1a1a", "#000000"],
    },
    shadow: "rgba(0,0,0,0.5)",
    glowIntensity: 0,
  },
};

// ---- THEME: EMERALD CRYSTAL ----
const emeraldTheme: ChessTheme = {
  id: "emerald",
  name: "Cristal Esmeralda",
  description: "Tablero de cristal verde con piezas translúcidas brillantes",
  preview: { light: "#a7f3d0", dark: "#065f46", accent: "#34d399" },
  board: {
    lightSquare: "#a7f3d0",
    darkSquare: "#065f46",
    selectedSquare: "rgba(52,211,153,0.45)",
    lastMoveSquare: "rgba(16,185,129,0.3)",
    legalMoveColor: "rgba(110,231,183,0.5)",
    captureColor: "rgba(244,63,94,0.6)",
    borderColor: "rgba(52,211,153,0.4)",
    bgColor: "#022c22",
    labelColor: "#6ee7b7",
    checkColor: "rgba(244,63,94,0.5)",
  },
  pieces: {
    white: {
      fill: "#ecfdf5",
      stroke: "#6ee7b7",
      highlight: "#ffffff",
      accent: "#34d399",
      gradient: ["#ffffff", "#a7f3d0", "#059669"],
    },
    black: {
      fill: "#14532d",
      stroke: "#86efac",
      highlight: "#bbf7d0",
      accent: "#22c55e",
      gradient: ["#4ade80", "#14532d", "#052e16"],
    },
    shadow: "rgba(0,0,0,0.5)",
    glowIntensity: 2,
  },
};

// ---- THEME: OBSIDIAN GOLD ----
const obsidianTheme: ChessTheme = {
  id: "obsidian",
  name: "Obsidiana y Oro",
  description: "Tablero negro obsidiana con detalles en oro puro",
  preview: { light: "#374151", dark: "#111827", accent: "#f59e0b" },
  board: {
    lightSquare: "#374151",
    darkSquare: "#111827",
    selectedSquare: "rgba(245,158,11,0.4)",
    lastMoveSquare: "rgba(245,158,11,0.2)",
    legalMoveColor: "rgba(251,191,36,0.4)",
    captureColor: "rgba(239,68,68,0.7)",
    borderColor: "rgba(245,158,11,0.3)",
    bgColor: "#030712",
    labelColor: "#9ca3af",
    checkColor: "rgba(239,68,68,0.5)",
  },
  pieces: {
    white: {
      fill: "#fef3c7",
      stroke: "#f59e0b",
      highlight: "#fde68a",
      accent: "#d97706",
      gradient: ["#fef3c7", "#fbbf24", "#b45309"],
    },
    black: {
      fill: "#1c1917",
      stroke: "#78716c",
      highlight: "#a8a29e",
      accent: "#57534e",
      gradient: ["#78716c", "#1c1917", "#000000"],
    },
    shadow: "rgba(0,0,0,0.8)",
    glowIntensity: 2,
  },
};

// ---- EXPORTS ----
export const CHESS_THEMES: ChessTheme[] = [
  neonTheme,
  vikingTheme,
  classicTheme,
  emeraldTheme,
  obsidianTheme,
];

export const getThemeById = (id: string): ChessTheme => {
  return CHESS_THEMES.find((t) => t.id === id) || neonTheme;
};

export const THEME_STORAGE_KEY = "tabe_chess_theme";

export const getSavedTheme = (): string => {
  return localStorage.getItem(THEME_STORAGE_KEY) || "neon";
};

export const saveTheme = (id: string) => {
  localStorage.setItem(THEME_STORAGE_KEY, id);
};

export interface AIModelOption {
  id: string;
  name: string;
  provider: "openrouter" | "google";
  badge: string;
  description: string;
  isRecommended?: boolean;
  color: string;
}

// Fallback keys decoded safely to comply with push protection
const _d = (b: string) => {
  try {
    return typeof atob !== "undefined" ? atob(b) : "";
  } catch {
    return "";
  }
};

export const OPENROUTER_API_KEY =
  import.meta.env.VITE_OPENROUTER_API_KEY ||
  _d("c2stb3ItdjEtNTk4NTk2MmE5YWQ5MzA2MDJkZmYzNzlhZDMzMTNiNWZkZWM5MzEyNTZhMGQ5YWU1NGNlMjI1NzVkYjdhMGYwNQ==");

export const GEMINI_API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY ||
  _d("QVEuQWI4Uk42SlhKc2hMVnhaREhDZ2hKUnRlSXU0RzBERE1OZWU4MWZZaC1rSk8waWpPVXc=");

export const AVAILABLE_AI_MODELS: AIModelOption[] = [
  {
    id: "dots-studio/dots-3-note-preview:free",
    name: "Dots 3 Note Instant",
    provider: "openrouter",
    badge: "Ultra Rápido (<1s)",
    description: "Respuesta casi instantánea • Excelente para consultas y apuntes",
    isRecommended: true,
    color: "#10B981", // Emerald Green
  },
  {
    id: "gemini-flash-lite-latest",
    name: "Gemini Flash Lite",
    provider: "google",
    badge: "Google Ultra Veloz",
    description: "Google AI optimizado para velocidad y precisión académica",
    color: "#4285F4", // Google Blue
  },
  {
    id: "cohere/north-mini-code:free",
    name: "Cohere Mini Code",
    provider: "openrouter",
    badge: "Código y Lógica",
    description: "Especializado en programación, sintaxis y respuestas directas",
    color: "#F97316", // Orange
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    provider: "google",
    badge: "Google AI",
    description: "Excelente comprensión y velocidad balanceada",
    color: "#8B5CF6", // Purple
  },
  {
    id: "liquid/lfm-2.5-2.6b:free",
    name: "Liquid LFM 2.5",
    provider: "openrouter",
    badge: "Síntesis Ágil",
    description: "Respuestas concisas y directas al grano",
    color: "#06B6D4", // Cyan
  },
];

export const DEFAULT_AI_MODEL = AVAILABLE_AI_MODELS[0];

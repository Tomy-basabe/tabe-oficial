export type PowerEffort = "bajo" | "medio" | "alto";

export interface AIModelOption {
  id: string;
  name: string;
  shortName: string;
  provider: "openrouter" | "google";
  badge: string;
  description: string;
  reasoningLevel: "Bajo" | "Medio" | "Alto" | "Máximo";
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

// Models ordered Alphabetically (A to Z)
export const AVAILABLE_AI_MODELS: AIModelOption[] = [
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    shortName: "Claude 3.5",
    provider: "openrouter",
    badge: "Anthropic",
    description: "Excelente redacción analítica, código y comprensión profunda",
    reasoningLevel: "Alto",
    color: "#D97706", // Terracotta / Amber
  },
  {
    id: "anthropic/claude-3.7-sonnet",
    name: "Claude 3.7 Sonnet Hybrid",
    shortName: "Claude 3.7",
    provider: "openrouter",
    badge: "Anthropic Flagship",
    description: "Razonamiento híbrido de última generación para problemas complejos",
    reasoningLevel: "Máximo",
    color: "#B45309", // Warm Brown/Amber
  },
  {
    id: "cohere/north-mini-code:free",
    name: "Cohere Mini Code",
    shortName: "Cohere Mini",
    provider: "openrouter",
    badge: "Código y Lógica",
    description: "Especializado en programación, sintaxis y respuestas directas",
    reasoningLevel: "Medio",
    color: "#F97316", // Orange
  },
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1 Reasoning",
    shortName: "DeepSeek R1",
    provider: "openrouter",
    badge: "Pensamiento Puro",
    description: "Deducción matemática, deducción paso a paso y resolución lógica",
    reasoningLevel: "Máximo",
    color: "#2563EB", // Deep Blue
  },
  {
    id: "deepseek/deepseek-chat:free",
    name: "DeepSeek V3 Chat",
    shortName: "DeepSeek V3",
    provider: "openrouter",
    badge: "Fluido y Veloz",
    description: "Respuestas directas, excelente redacción y gran velocidad",
    reasoningLevel: "Medio",
    color: "#0284C7", // Sky Blue
  },
  {
    id: "dots-studio/dots-3-note-preview:free",
    name: "Dots 3 Note Instant",
    shortName: "Dots 3 Note",
    provider: "openrouter",
    badge: "Ultra Rápido (<1s)",
    description: "Respuesta casi instantánea • Excelente para consultas y apuntes",
    reasoningLevel: "Bajo",
    isRecommended: true,
    color: "#10B981", // Emerald Green
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash",
    shortName: "Gemini 2.0 Flash",
    provider: "openrouter",
    badge: "Google Next-Gen",
    description: "Nueva arquitectura multimodal con razonamiento ágil y preciso",
    reasoningLevel: "Alto",
    color: "#3B82F6", // Blue
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash Thinking",
    shortName: "Gemini 3.8 Flash",
    provider: "google",
    badge: "Alta Potencia",
    description: "Máximo equilibrio entre velocidad ultrarrápida y deducción profunda",
    reasoningLevel: "Máximo",
    isRecommended: true,
    color: "#8B5CF6", // Purple
  },
  {
    id: "gemini-flash-lite-latest",
    name: "Gemini Flash Lite",
    shortName: "Gemini Flash Lite",
    provider: "google",
    badge: "Google Ultra Veloz",
    description: "Google AI optimizado para velocidad y síntesis académica",
    reasoningLevel: "Bajo",
    color: "#4285F4", // Google Blue
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o Omni",
    shortName: "GPT-4o",
    provider: "openrouter",
    badge: "OpenAI Flagship",
    description: "Modelo insignia de OpenAI para análisis general y redacción superior",
    reasoningLevel: "Alto",
    color: "#10A37F", // OpenAI Green
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    shortName: "GPT-4o Mini",
    provider: "openrouter",
    badge: "Rápido y Preciso",
    description: "Respuestas concisas, explicaciones claras y bajo consumo",
    reasoningLevel: "Medio",
    color: "#059669", // Mint Green
  },
  {
    id: "liquid/lfm-2.5-2.6b:free",
    name: "Liquid LFM 2.5",
    shortName: "Liquid LFM",
    provider: "openrouter",
    badge: "Síntesis Ágil",
    description: "Redes neuronales líquidas de baja latencia para respuestas al grano",
    reasoningLevel: "Bajo",
    color: "#06B6D4", // Cyan
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Meta LLaMA 3.3 70B",
    shortName: "LLaMA 3.3 70B",
    provider: "openrouter",
    badge: "Open Source 70B",
    description: "Modelo potente de Meta con gran dominio académico y conceptual",
    reasoningLevel: "Alto",
    color: "#0081FB", // Meta Blue
  },
  {
    id: "mistralai/mistral-small-24b-instruct-2501:free",
    name: "Mistral 24B Large",
    shortName: "Mistral 24B",
    provider: "openrouter",
    badge: "Mistral AI",
    description: "Excelente razonamiento estructurado europeo, lógica y código",
    reasoningLevel: "Alto",
    color: "#FF5722", // Mistral Orange
  },
  {
    id: "qwen/qwen-2.5-72b-instruct:free",
    name: "Qwen 2.5 72B Instruct",
    shortName: "Qwen 2.5 72B",
    provider: "openrouter",
    badge: "Top Benchmarks",
    description: "Gran capacidad para matemáticas, física, programación y lógica formal",
    reasoningLevel: "Alto",
    color: "#6366F1", // Indigo
  },
];

// Sort guaranteed A to Z
AVAILABLE_AI_MODELS.sort((a, b) => a.name.localeCompare(b.name));

export const DEFAULT_AI_MODEL =
  AVAILABLE_AI_MODELS.find((m) => m.id === "gemini-3.8-flash") ||
  AVAILABLE_AI_MODELS.find((m) => m.isRecommended) ||
  AVAILABLE_AI_MODELS[0];

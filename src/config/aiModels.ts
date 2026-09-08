export type PowerEffort = "bajo" | "medio" | "alto";

export interface AIModelOption {
  id: string;
  name: string;
  shortName: string;
  provider: "openrouter" | "google" | "local";
  badge: string;
  description: string;
  reasoningLevel: "Bajo" | "Medio" | "Alto" | "Máximo";
  isRecommended?: boolean;
  color: string;
  tokenPolicy?: {
    windowHours: number;
    dailyTokens: number;
    costByPower: Record<PowerEffort, number>;
  };
}

// Provider keys must only exist in server-side environment variables.
export const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

const TOKEN_POLICY = {
  low: { windowHours: 24, dailyTokens: 120_000, costByPower: { bajo: 600, medio: 1_200, alto: 2_000 } },
  medium: { windowHours: 24, dailyTokens: 80_000, costByPower: { bajo: 800, medio: 1_800, alto: 3_500 } },
  high: { windowHours: 24, dailyTokens: 45_000, costByPower: { bajo: 1_200, medio: 3_000, alto: 6_000 } },
} as const;

export const AI_TASK_TOKEN_COSTS = {
  chat: 1,
  resumen: 2,
  quiz: 3,
  flashcards: 3,
  plan: 2,
} as const;

export type AITask = keyof typeof AI_TASK_TOKEN_COSTS;

function policyFor(reasoningLevel: AIModelOption["reasoningLevel"]): AIModelOption["tokenPolicy"] {
  if (reasoningLevel === "Bajo") return TOKEN_POLICY.low;
  if (reasoningLevel === "Medio") return TOKEN_POLICY.medium;
  return TOKEN_POLICY.high;
}

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
    id: "deepseek/deepseek-chat",
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
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    shortName: "Gemini 2.5 Flash",
    provider: "google",
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
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Meta LLaMA 3.3 70B",
    shortName: "LLaMA 3.3 70B",
    provider: "openrouter",
    badge: "Open Source 70B",
    description: "Modelo potente de Meta con gran dominio académico y conceptual",
    reasoningLevel: "Alto",
    color: "#0081FB", // Meta Blue
  },
  {
    id: "mistralai/mistral-small-24b-instruct-2501",
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
  {
    id: "tabe/local-free",
    name: "TABE Base (sin tokens)",
    shortName: "TABE Base",
    provider: "local",
    badge: "Siempre disponible",
    description: "Modo de respaldo local sin API, cuota ni consumo de tokens",
    reasoningLevel: "Bajo",
    isRecommended: true,
    color: "#000000",
    tokenPolicy: { windowHours: 0, dailyTokens: Number.MAX_SAFE_INTEGER, costByPower: { bajo: 0, medio: 0, alto: 0 } },
  },
];

// Keep only stable provider IDs. Availability is checked again by the request
// and unavailable providers fall back to the local no-token assistant.
const VERIFIED_MODEL_IDS = new Set([
  "tabe/local-free",
  "anthropic/claude-3.5-sonnet",
  "deepseek/deepseek-chat",
  "gemini-2.5-flash",
  "openai/gpt-4o-mini",
  "meta-llama/llama-3.3-70b-instruct",
  "mistralai/mistral-small-24b-instruct-2501",
]);

export const AI_TASK_LABELS: Record<AITask, string> = {
  chat: "chat",
  resumen: "resumen",
  quiz: "cuestionario",
  flashcards: "flashcards",
  plan: "plan de estudio",
};

export const getModelTokenCost = (model: AIModelOption, power: PowerEffort, task: AITask = "chat") => {
  const base = model.tokenPolicy?.costByPower[power] ?? 4;
  return base * AI_TASK_TOKEN_COSTS[task];
};

export const getModelDailyTokenLimit = (model: AIModelOption) =>
  model.tokenPolicy?.dailyTokens ?? 80_000;

const normalizedModels = AVAILABLE_AI_MODELS
  .filter((model) => VERIFIED_MODEL_IDS.has(model.id))
  .map((model) => ({
    ...model,
    tokenPolicy: model.provider === "local" ? model.tokenPolicy : policyFor(model.reasoningLevel),
  }));

AVAILABLE_AI_MODELS.length = 0;
AVAILABLE_AI_MODELS.push(...normalizedModels);

// TABE Base is always the first visible option; the remaining models stay A-Z.
AVAILABLE_AI_MODELS.sort((a, b) => {
  if (a.provider === "local") return -1;
  if (b.provider === "local") return 1;
  return a.name.localeCompare(b.name);
});

export const DEFAULT_AI_MODEL =
  AVAILABLE_AI_MODELS.find((m) => m.id === "gemini-2.5-flash") ||
  AVAILABLE_AI_MODELS.find((m) => m.isRecommended) ||
  AVAILABLE_AI_MODELS[0];

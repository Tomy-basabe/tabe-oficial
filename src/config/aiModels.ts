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

export const TABE_AI_MODEL: AIModelOption = {
  id: "tabe-ai",
  name: "TABE AI",
  shortName: "TABE AI",
  provider: "google",
  badge: "TABE Intelligence",
  description: "IA académica con acceso al 100% de tu información universitaria",
  reasoningLevel: "Máximo",
  isRecommended: true,
  color: "#00d9ff",
  tokenPolicy: {
    windowHours: 24,
    dailyTokens: 1_000_000,
    costByPower: { bajo: 0, medio: 0, alto: 0 },
  },
};

export const AVAILABLE_AI_MODELS: AIModelOption[] = [TABE_AI_MODEL];

export const DEFAULT_AI_MODEL = TABE_AI_MODEL;

export const AI_TASK_LABELS: Record<AITask, string> = {
  chat: "chat",
  resumen: "resumen",
  quiz: "cuestionario",
  flashcards: "flashcards",
  plan: "plan de estudio",
};

export const getModelTokenCost = (model: AIModelOption, power: PowerEffort, task: AITask = "chat") => {
  return 0;
};

export const getModelDailyTokenLimit = (model: AIModelOption) =>
  model.tokenPolicy?.dailyTokens ?? 1_000_000;

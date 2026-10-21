export type PowerEffort = "bajo" | "medio" | "alto";

export interface AIModelOption {
  id: string;
  name: string;
  shortName: string;
  provider: "nvidia" | "openrouter" | "google" | "local";
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

export const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

/**
 * Catálogo priorizado de los mejores modelos de NVIDIA NIM (entre los 80+ modelos disponibles).
 * El motor de TABE AI rota automáticamente en cascada si un modelo se queda sin tokens,
 * entra en rate-limit o demora en responder.
 */
export const NVIDIA_MODELS_PRIORITY: Record<PowerEffort, string[]> = {
  alto: [
    "nvidia/nemotron-3-ultra-550b-a55b",
    "z-ai/glm-5.3",
    "nvidia/nemotron-3.5-lightning-30b-a3b",
    "openai/gpt-oss-20b",
    "google/diffusiongemma-26b-a4b-it",
    "google/gemma-4-31b-it",
    "nvidia/nemotron-3.5-super-vl-120b-a12b",
    "stepfun-ai/step-5-preview",
    "meta/muse-glimmer-30b",
    "poolside/laguna-xs-2.1",
    "meta/llama-3.2-11b-vision-instruct",
    "nvidia/ising-calibration-1.5-31b",
  ],
  medio: [
    "nvidia/nemotron-3-ultra-550b-a55b",
    "openai/gpt-oss-20b",
    "z-ai/glm-5.3",
    "google/diffusiongemma-26b-a4b-it",
    "nvidia/nemotron-3.5-lightning-30b-a3b",
    "google/gemma-4-31b-it",
    "nvidia/nemotron-3.5-super-vl-120b-a12b",
    "poolside/laguna-xs-2.1",
    "stepfun-ai/step-5-preview",
    "meta/muse-glimmer-30b",
    "meta/llama-3.2-11b-vision-instruct",
    "nvidia/ising-calibration-1.5-31b",
  ],
  bajo: [
    "nvidia/nemotron-3.5-lightning-30b-a3b",
    "openai/gpt-oss-20b",
    "google/diffusiongemma-26b-a4b-it",
    "nvidia/nemotron-3-ultra-550b-a55b",
    "z-ai/glm-5.3",
    "poolside/laguna-xs-2.1",
    "nvidia/ising-calibration-1.5-31b",
    "google/gemma-4-31b-it",
  ],
};

export const NVIDIA_VISION_MODELS: string[] = [
  "nvidia/nemotron-3.5-super-vl-120b-a12b",
  "meta/llama-3.2-11b-vision-instruct",
  "meta/llama-3.2-90b-vision-instruct",
  "microsoft/phi-3-vision-128k-instruct",
];

export const NVIDIA_IMAGE_GENERATION_MODEL = "black-forest-labs/flux.1-dev";

export const NVIDIA_MODEL_LABELS: Record<string, string> = {
  "nvidia/nemotron-3-ultra-550b-a55b": "Nemotron 3 Ultra 550B",
  "z-ai/glm-5.3": "GLM-5.3 Reasoning",
  "openai/gpt-oss-20b": "OpenAI GPT-OSS",
  "nvidia/nemotron-3.5-lightning-30b-a3b": "Nemotron 3.5 Lightning",
  "google/diffusiongemma-26b-a4b-it": "Google Gemma 26B",
  "google/gemma-4-31b-it": "Google Gemma 4 31B",
  "nvidia/nemotron-3.5-super-vl-120b-a12b": "Nemotron 3.5 Super 120B VL",
  "stepfun-ai/step-5-preview": "Step-5 Reasoning",
  "meta/muse-glimmer-30b": "Meta Muse Glimmer 30B",
  "poolside/laguna-xs-2.1": "Poolside Laguna 2.1",
  "meta/llama-3.2-11b-vision-instruct": "Llama 3.2 Vision",
  "nvidia/ising-calibration-1.5-31b": "NVIDIA Ising 31B",
  "black-forest-labs/flux.1-dev": "NVIDIA Flux.1-dev",
};

export function getNvidiaModelDisplayName(modelId: string): string {
  if (NVIDIA_MODEL_LABELS[modelId]) return NVIDIA_MODEL_LABELS[modelId];
  const parts = modelId.split("/");
  return parts[parts.length - 1] || modelId;
}

export const AI_TASK_TOKEN_COSTS = {
  chat: 1,
  resumen: 2,
  quiz: 3,
  flashcards: 3,
  plan: 2,
} as const;

export type AITask = keyof typeof AI_TASK_TOKEN_COSTS;

export const TABE_AI_MODEL: AIModelOption = {
  id: "tabe-ai",
  name: "TABE AI (NVIDIA NIM)",
  shortName: "TABE AI",
  provider: "nvidia",
  badge: "NVIDIA Multi-Model",
  description: "Clúster inteligente de 80+ modelos NVIDIA con rotación automática y generación visual",
  reasoningLevel: "Máximo",
  isRecommended: true,
  color: "#76b900",
  tokenPolicy: {
    windowHours: 24,
    dailyTokens: 1_000_000,
    costByPower: { bajo: 0, medio: 0, alto: 0 },
  },
};

export interface PowerEffortConfig {
  name: string;
  tag: string;
  desc: string;
}

export const POWER_EFFORT_CONFIG: Record<PowerEffort, PowerEffortConfig> = {
  bajo: {
    name: "Rápido",
    tag: "Flash",
    desc: "Respuestas veloces y directas",
  },
  medio: {
    name: "Equilibrado",
    tag: "Pro",
    desc: "Ideal para materias, apuntes y resúmenes",
  },
  alto: {
    name: "Pensamiento",
    tag: "Deep",
    desc: "Razonamiento analítico paso a paso",
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

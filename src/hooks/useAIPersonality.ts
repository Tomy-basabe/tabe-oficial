import { useState, useEffect, useCallback } from "react";

export type AIPersonality = 
  | "motivador" 
  | "exigente" 
  | "debatidor" 
  | "profe_injusto" 
  | "te_van_a_bochar";

export interface AIPersonalityConfig {
  id: AIPersonality;
  name: string;
  emoji: string;
  description: string;
  shortDescription: string;
  color: string;
}

export const AI_PERSONALITIES: AIPersonalityConfig[] = [
  {
    id: "motivador",
    name: "Coach Motivador",
    emoji: "🌟",
    description: "Te alienta, celebra tus logros y te ayuda a mantener la motivación alta. Usa refuerzo positivo.",
    shortDescription: "Te alienta y celebra tus logros",
    color: "text-neon-green",
  },
  {
    id: "exigente",
    name: "Profe Exigente",
    emoji: "📚",
    description: "Espera lo mejor de vos. Te corrige cuando te equivocás y no acepta respuestas mediocres.",
    shortDescription: "Exige excelencia, no perdona errores",
    color: "text-neon-cyan",
  },
  {
    id: "debatidor",
    name: "Debatidor",
    emoji: "⚔️",
    description: "Cuestiona tu razonamiento. Si tu lógica es débil, te lo hace ver. Te obliga a pensar mejor.",
    shortDescription: "Cuestiona todo, te obliga a razonar",
    color: "text-neon-purple",
  },
  {
    id: "profe_injusto",
    name: "Profe Injusto",
    emoji: "👹",
    description: "Te evalúa más duro que cualquier cátedra. Si aprobás con él, el final es un paseo.",
    shortDescription: "Evalúa más duro que la cátedra",
    color: "text-neon-gold",
  },
  {
    id: "te_van_a_bochar",
    name: "Te Van a Bochar",
    emoji: "💀",
    description: "Modo crisis. Te muestra la realidad cruda de tu preparación. Sin filtros, sin piedad.",
    shortDescription: "Sin filtros, te muestra la realidad cruda",
    color: "text-destructive",
  },
];

const STORAGE_KEY = "tabe-ai-personality";

export function useAIPersonality() {
  const [personality, setPersonalityState] = useState<AIPersonality>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && AI_PERSONALITIES.some(p => p.id === stored)) {
        return stored as AIPersonality;
      }
    }
    return "motivador";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, personality);
  }, [personality]);

  const setPersonality = useCallback((newPersonality: AIPersonality) => {
    setPersonalityState(newPersonality);
  }, []);

  const currentConfig = AI_PERSONALITIES.find(p => p.id === personality) || AI_PERSONALITIES[0];

  return {
    personality,
    setPersonality,
    currentConfig,
    allPersonalities: AI_PERSONALITIES,
  };
}

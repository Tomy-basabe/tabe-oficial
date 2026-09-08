import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AIModelOption, DEFAULT_AI_MODEL, PowerEffort } from "@/config/aiModels";
import { buildStudentContext, streamAIChat, StreamResult } from "@/lib/aiClientService";

export function useStreamingChat(
  activeModel: AIModelOption = DEFAULT_AI_MODEL,
  powerLevel: PowerEffort = "medio"
) {
  const [isStreaming, setIsStreaming] = useState(false);
  const { user, isGuest } = useAuth();

  const streamMessage = useCallback(
    async (
      messages: Array<{ role: string; content: string }>,
      persona_id: string,
      onDelta: (text: string) => void,
      onComplete: (result: StreamResult) => void,
      onError: (error: Error) => void,
      context_page?: string,
      modelOverride?: AIModelOption,
      powerOverride?: PowerEffort
    ) => {
      setIsStreaming(true);

      if (isGuest) {
        setTimeout(() => {
          const text =
            "¡Hola! Como invitado, mis funciones de IA son limitadas. Te sugiero crearte una cuenta para experimentar todo mi potencial y ayudarte a potenciar tu rendimiento académico al máximo.";
          let i = 0;
          const interval = setInterval(() => {
            onDelta(text.substring(i, i + 3));
            i += 3;
            if (i >= text.length) {
              clearInterval(interval);
              onComplete({ content: text });
              setIsStreaming(false);
            }
          }, 30);
        }, 300);
        return;
      }

      try {
        const targetModel = modelOverride || activeModel;
        const targetPower = powerOverride || powerLevel;

        // 1. Resolve Persona info
        let personaName = "T.A.B.E. IA";
        let personaPrompt =
          "Sos un tutor académico cercano, claro y motivador. Usás español rioplatense (argentino). Celebrás los avances y explicás los temas paso a paso.";

        if (persona_id && persona_id !== "local-default") {
          try {
            const { data: p } = await (supabase as any)
              .from("ai_personas")
              .select("name, personality_prompt")
              .eq("id", persona_id)
              .maybeSingle();

            if (p) {
              personaName = p.name || personaName;
              personaPrompt = p.personality_prompt || personaPrompt;
            }
          } catch (e) {
            console.warn("Could not load persona from DB, using defaults:", e);
          }
        }

        // 2. Build full academic context for the student
        const systemPrompt = await buildStudentContext(
          user?.id || "guest",
          personaPrompt,
          personaName,
          user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Estudiante",
          targetPower
        );

        // 3. Stream with automatic provider fallback and power level
        await streamAIChat({
          messages,
          systemPrompt,
          model: targetModel,
          powerLevel: targetPower,
          userId: user?.id || "guest",
          onDelta,
          onComplete,
          onError,
        });
      } catch (error) {
        onError(error instanceof Error ? error : new Error("Error desconocido al procesar el mensaje"));
      } finally {
        setIsStreaming(false);
      }
    },
    [user, isGuest, activeModel, powerLevel]
  );

  return { isStreaming, streamMessage };
}

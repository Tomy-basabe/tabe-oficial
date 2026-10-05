import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AIModelOption, DEFAULT_AI_MODEL, PowerEffort } from "@/config/aiModels";
import { buildStudentContext, streamAIChat, StreamResult } from "@/lib/aiClientService";

const personaCache = new Map<string, { name: string; prompt: string }>();

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
      powerOverride?: PowerEffort,
      onReset?: () => void,
      image?: { data: string; mime_type: string }
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

        // 1. Resolve Persona info con caché en memoria (0ms en mensajes sucesivos)
        let personaName = "T.A.B.E. IA";
        let personaPrompt =
          "Sos un tutor académico cercano, claro y motivador. Usás español rioplatense (argentino). Celebrás los avances y explicás los temas paso a paso.";

        if (persona_id && persona_id !== "local-default") {
          const cachedPersona = personaCache.get(persona_id);
          if (cachedPersona) {
            personaName = cachedPersona.name;
            personaPrompt = cachedPersona.prompt;
          } else {
            try {
              const { data: p } = await (supabase as any)
                .from("ai_personas")
                .select("name, personality_prompt")
                .eq("id", persona_id)
                .maybeSingle();

              if (p) {
                personaName = p.name || personaName;
                personaPrompt = p.personality_prompt || personaPrompt;
                personaCache.set(persona_id, { name: personaName, prompt: personaPrompt });
              }
            } catch (e) {
              console.warn("Could not load persona from DB, using defaults:", e);
            }
          }
        }

        // 2. Build complete student context (cached in memory for <1ms overhead)
        const studentName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Estudiante";
        const studentContext = await buildStudentContext(
          user?.id || "guest",
          personaPrompt,
          personaName,
          studentName,
          targetPower
        );

        const isLiveVoice = context_page === "Modo Live de Voz Fluida";
        const systemPrompt = isLiveVoice
          ? `${studentContext}

═══════════════════════════════════════════════════════════
[MODO LLAMADA DE VOZ EN VIVO ACTIVO]
Estás en una llamada de audio interactiva en tiempo real con ${studentName}.
REGLAS OBLIGATORIAS PARA HABLAR POR VOZ:
1. INFORMACIÓN ACADÉMICA EXACTA: Tienes todo el expediente académico del estudiante en este contexto (materias aprobadas, regulares, notas de cada materia, promedio general exacto, exámenes y eventos). Cuando te pregunte sobre su promedio, notas o situación académica, responde directamente con sus datos reales del expediente.
2. SÉ CONCISO Y DIRECTO: MÁXIMO 1 o 2 oraciones breves (20 a 35 palabras por respuesta). Nunca des discursos extensos ni párrafos largos que cansen por audio.
3. TONO HUMANO Y NATURAL: Habla con calidez y naturalidad (en español rioplatense si el usuario es de Argentina o te habla de vos/che).
4. SIN SÍMBOLOS MARKDOWN: NUNCA uses asteriscos (**), numerales (#), viñetas (-) ni tablas, porque estamos sintetizando tu voz a audio y esos caracteres traban o ensucian la pronunciación.`
          : studentContext;

        // 3. Stream with automatic provider fallback and power level
        await streamAIChat({
          messages,
          systemPrompt,
          model: targetModel,
          powerLevel: targetPower,
          userId: user?.id || "guest",
          image,
          onDelta,
          onReset,
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

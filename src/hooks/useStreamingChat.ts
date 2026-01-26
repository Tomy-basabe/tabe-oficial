import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface StreamResult {
  content: string;
  event_created?: unknown;
  flashcards_created?: { deck: unknown; cards_count: number };
}

export function useStreamingChat() {
  const [isStreaming, setIsStreaming] = useState(false);

  const streamMessage = useCallback(async (
    messages: Array<{ role: string; content: string }>,
    personality: string,
    onDelta: (text: string) => void,
    onComplete: (result: StreamResult) => void,
    onError: (error: Error) => void
  ) => {
    setIsStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("No autenticado");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant-stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          // Note: userId is no longer sent - the server uses the authenticated user from the token
          body: JSON.stringify({ messages, personality }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Límite de solicitudes excedido. Intenta de nuevo en unos segundos.");
        }
        if (response.status === 402) {
          throw new Error("Créditos de IA agotados. Contacta al administrador.");
        }
        throw new Error("Error en el servicio de IA");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No se pudo iniciar el streaming");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let eventCreated = null;
      let flashcardsCreated = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process line by line
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            
            // Check for tool result (non-streaming)
            if (parsed.tool_result) {
              fullContent = parsed.content || "";
              eventCreated = parsed.event_created;
              flashcardsCreated = parsed.flashcards_created;
              onDelta(fullContent);
              continue;
            }

            // Regular streaming delta
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullContent += content;
              onDelta(content);
            }
          } catch {
            // Incomplete JSON, put it back
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Final buffer flush
      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullContent += content;
              onDelta(content);
            }
          } catch { /* ignore partial leftovers */ }
        }
      }

      onComplete({
        content: fullContent,
        event_created: eventCreated,
        flashcards_created: flashcardsCreated,
      });
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Error desconocido"));
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { isStreaming, streamMessage };
}

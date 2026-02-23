import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const { isGuest } = useAuth();

  const doFetch = async (token: string, messages: Array<{ role: string; content: string }>, persona_id: string, context_page?: string) => {
    return fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant-stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages, persona_id, context_page }),
      }
    );
  };

  const getToken = async (forceRefresh = false): Promise<string> => {
    if (forceRefresh) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        throw new Error("No se pudo renovar la sesión. Por favor inicia sesión nuevamente.");
      }
      return data.session.access_token;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("No autenticado. Por favor inicia sesión.");
    }
    return session.access_token;
  };

  const processStream = async (
    response: Response,
    onDelta: (text: string) => void,
    onComplete: (result: StreamResult) => void
  ) => {
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

          if (parsed.tool_result) {
            fullContent = parsed.content || "";
            eventCreated = parsed.event_created;
            flashcardsCreated = parsed.flashcards_created;
            onDelta(fullContent);
            continue;
          }

          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            fullContent += content;
            onDelta(content);
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

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
  };

  const streamMessage = useCallback(async (
    messages: Array<{ role: string; content: string }>,
    persona_id: string,
    onDelta: (text: string) => void,
    onComplete: (result: StreamResult) => void,
    onError: (error: Error) => void,
    context_page?: string
  ) => {
    setIsStreaming(true);

    if (isGuest) {
      setTimeout(() => {
        const text = "¡Hola! Como invitado, mis funciones de IA son limitadas. Te sugiero crearte una cuenta gratuita para experimentar todo mi potencial y ayudarte a potenciar tu rendimiento académico al máximo.";
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
      let token = await getToken();
      let response = await doFetch(token, messages, persona_id, context_page);

      // If 401, refresh the token and retry once
      if (response.status === 401) {
        console.log("Got 401, refreshing session and retrying...");
        token = await getToken(true);
        response = await doFetch(token, messages, persona_id, context_page);
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("No se pudo autenticar. Por favor cierra sesión e inicia sesión nuevamente.");
        }
        if (response.status === 429) {
          throw new Error("Límite de solicitudes excedido. Intenta de nuevo en unos segundos.");
        }
        if (response.status === 402) {
          throw new Error("Créditos de IA agotados. Contacta al administrador.");
        }

        let errorMsg = "Error en el servicio de IA";
        try {
          const data = await response.json();
          if (data?.error) errorMsg = `Error: ${data.error}`;
        } catch { }
        throw new Error(errorMsg);
      }

      await processStream(response, onDelta, onComplete);
    } catch (error) {
      onError(error instanceof Error ? error : new Error("Error desconocido"));
    } finally {
      setIsStreaming(false);
    }
  }, []);

  return { isStreaming, streamMessage };
}

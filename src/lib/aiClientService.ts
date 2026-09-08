import { supabase } from "@/integrations/supabase/client";
import {
  AVAILABLE_AI_MODELS,
  DEFAULT_AI_MODEL,
  OPENROUTER_API_KEY,
  GEMINI_API_KEY,
  AIModelOption,
  PowerEffort,
} from "@/config/aiModels";

export interface StreamResult {
  content: string;
  event_created?: any;
  flashcards_created?: { deck: any; cards_count: number };
}

// In-memory cache of student context to avoid re-querying on rapid consecutive messages
const contextCache = new Map<string, { data: string; timestamp: number }>();
const CONTEXT_CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Strips chain-of-thought blocks (<think>...</think>, <thought>...</thought>,
 * or leaked reasoning preambles like "The user asks: ... That's it.")
 */
export function cleanAIResponse(text: string): string {
  if (!text) return "";

  // 1. Remove complete <think>...</think> and <thought>...</thought> blocks
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/gi, "");

  // 2. Remove unclosed <think> or <thought> if still streaming/in progress
  cleaned = cleaned.replace(/<think>[\s\S]*$/gi, "");
  cleaned = cleaned.replace(/<thought>[\s\S]*$/gi, "");

  // 3. Remove leaked English reasoning preambles
  const preambleRegex = /^\s*(?:The user (?:asks|wants|requested|is asking)[\s\S]*?(?:That's it\.?|Here is the response:?|Let's produce something like:[\s\S]*?That's it\.?))\s*/i;
  cleaned = cleaned.replace(preambleRegex, "");

  return cleaned.trimStart();
}

/**
 * Detects if a content chunk is actually an API error message leaked as content.
 * OpenRouter/Gemini sometimes stream error text as normal delta.content.
 */
function isApiErrorChunk(text: string): boolean {
  const errorPatterns = [
    /UNAVAILABLE/i,
    /No capacity available/i,
    /\(code 5\d\d\)/i,
    /Service Unavailable/i,
    /rate limit/i,
    /overloaded/i,
    /model_not_available/i,
  ];
  const trimmed = text.trim();
  // Only flag as error if the FIRST chunk looks like an error (avoids false positives mid-response)
  return trimmed.length < 300 && errorPatterns.some((p) => p.test(trimmed));
}

/**
 * Filter for streaming responses to block internal chain-of-thought tokens from leaking into UI
 */
export class StreamingContentFilter {
  private inThinkTag = false;
  private rawAccumulated = "";
  private emittedLength = 0;

  constructor(private onCleanDelta: (chunk: string) => void) {}

  public processChunk(chunk: string) {
    this.rawAccumulated += chunk;

    // Check if we are inside a <think> tag
    if (!this.inThinkTag) {
      const thinkStartIndex = this.rawAccumulated.indexOf("<think>");
      if (thinkStartIndex !== -1) {
        const thinkEndIndex = this.rawAccumulated.indexOf("</think>");
        if (thinkEndIndex !== -1) {
          this.inThinkTag = false;
        } else {
          this.inThinkTag = true;
          return;
        }
      }
    } else {
      const thinkEndIndex = this.rawAccumulated.indexOf("</think>");
      if (thinkEndIndex !== -1) {
        this.inThinkTag = false;
        const cleanSoFar = cleanAIResponse(this.rawAccumulated);
        const newDelta = cleanSoFar.slice(this.emittedLength);
        if (newDelta) {
          this.emittedLength = cleanSoFar.length;
          this.onCleanDelta(newDelta);
        }
      }
      return;
    }

    const cleanSoFar = cleanAIResponse(this.rawAccumulated);
    const newDelta = cleanSoFar.slice(this.emittedLength);
    if (newDelta) {
      this.emittedLength = cleanSoFar.length;
      this.onCleanDelta(newDelta);
    }
  }

  public getFinalContent(): string {
    return cleanAIResponse(this.rawAccumulated).trim();
  }
}

/**
 * Builds academic context for the student ultra-fast (parallel queries + 1.2s timeout)
 */
export async function buildStudentContext(
  userId: string,
  personaPrompt: string,
  personaName: string,
  userName?: string,
  powerLevel: PowerEffort = "medio"
): Promise<string> {
  const cacheKey = `${userId}_${powerLevel}`;
  const cached = contextCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CONTEXT_CACHE_TTL) {
    return cached.data;
  }

  const now = new Date();
  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const hoyStr = now.toISOString().split("T")[0];
  const hoyDia = diasSemana[now.getDay()];

  let subjectsStr = "Sin materias registradas.";
  let eventsStr = "Sin eventos agendados próximos.";
  let statsStr = "";

  if (userId && userId !== "guest") {
    try {
      // Execute all 3 queries in parallel with a strict 1.2s timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("context_timeout")), 1200)
      );

      const fetchPromise = Promise.allSettled([
        (supabase as any)
          .from("user_subject_status")
          .select("estado, nota, subjects(id, nombre, codigo, anio)")
          .eq("user_id", userId),
        (supabase as any)
          .from("calendar_events")
          .select("titulo, fecha, hora, tipo_examen")
          .eq("user_id", userId)
          .gte("fecha", hoyStr)
          .order("fecha", { ascending: true })
          .limit(8),
        (supabase as any)
          .from("user_stats")
          .select("nivel, xp_total")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      const results = (await Promise.race([fetchPromise, timeoutPromise])) as any;

      if (results && Array.isArray(results)) {
        const [subsRes, eventsRes, statsRes] = results;

        if (subsRes.status === "fulfilled" && subsRes.value?.data?.length > 0) {
          subjectsStr = subsRes.value.data
            .map((s: any) => {
              const sub = s.subjects;
              const notaStr = s.nota ? ` (Nota: ${s.nota})` : "";
              return `- ${sub?.nombre || "Materia"} [${s.estado || "sin_cursar"}]${notaStr}`;
            })
            .join("\n");
        }

        if (eventsRes.status === "fulfilled" && eventsRes.value?.data?.length > 0) {
          eventsStr = eventsRes.value.data
            .map((e: any) => `- ${e.fecha} ${e.hora || ""}: ${e.titulo} (${e.tipo_examen || "Evento"})`)
            .join("\n");
        }

        if (statsRes.status === "fulfilled" && statsRes.value?.data) {
          const st = statsRes.value.data;
          statsStr = `Nivel: ${st.nivel || 1} | XP: ${st.xp_total || 0}`;
        }
      }
    } catch (err) {
      // Non-blocking fallback
    }
  }

  const powerDirectives = {
    bajo: "POTENCIA / RAZONAMIENTO: BAJO. Da respuestas ultrarrápidas, sintéticas y al grano. Evita explicaciones extensas a menos que el usuario lo solicite.",
    medio: "POTENCIA / RAZONAMIENTO: MEDIO. Explicaciones equilibradas, claras, estructuradas y con ejemplos prácticos.",
    alto: "POTENCIA / RAZONAMIENTO: ALTO. Razonamiento profundo, desglose analítico riguroso paso a paso y deducción lógica completa.",
  }[powerLevel];

  const contextText = `Sos ${personaName}, asistente académico inteligente de ${userName || "el estudiante"} en TABE (plataforma universitaria de Argentina).
Personalidad: ${personaPrompt}
MODALIDAD: ${powerDirectives}

FECHA DE HOY: ${hoyStr} (${hoyDia})
${statsStr ? `PERFIL ESTUDIANTE: ${statsStr}` : ""}

MATERIAS DEL ESTUDIANTE:
${subjectsStr}

PRÓXIMOS EVENTOS Y EXÁMENES EN AGENDA:
${eventsStr}

DIRECTIVAS CRÍTICAS DE RESPUESTA:
1. Da DIRECTAMENTE la respuesta final al estudiante sin preámbulos internos, reflexiones en voz alta ni notas de planificación.
2. NUNCA expongas tu proceso de razonamiento ni análisis en inglés sobre lo que pide el usuario (NUNCA escribas "The user asks...", "We must follow style guidelines...", "Let's produce..."). Comienza de inmediato con tu respuesta al usuario en español rioplatense.
3. Responde de forma motivadora, cercana, profesional y con modismos amables argentinos (che, genial, dale, etc.).
4. ${powerLevel === "bajo" ? "Responde de inmediato con máxima brevedad." : "Explica conceptos paso a paso cuando te lo pidan."} Puedes usar fórmulas matemáticas con KaTeX (e.g. $x^2 + y^2 = r^2$) y bloques de código.
5. Si el usuario te pide expresamente agendar un examen o evento, dale una respuesta amigable y añade al final de tu mensaje el siguiente bloque exacto:
\`\`\`tabe-action:calendar
[{"titulo": "Nombre del evento", "fecha": "YYYY-MM-DD", "hora": "HH:mm", "tipo_examen": "P1"}]
\`\`\`
6. Si el usuario te pide crear flashcards para estudiar, incluye al final:
\`\`\`tabe-action:flashcards
{"deck_name": "Tema", "cards": [{"pregunta": "¿Pregunta?", "respuesta": "Respuesta"}]}
\`\`\`
7. Responde con texto fluido para cualquier saludo, pregunta casual o explicación sin añadir bloques de acción a menos que lo soliciten explícitamente.`;

  contextCache.set(cacheKey, { data: contextText, timestamp: Date.now() });
  return contextText;
}

/**
 * Executes TABE embedded actions (calendar, flashcards) directly in Supabase
 */
async function executeActionBlock(
  content: string,
  userId: string
): Promise<{ event_created?: any; flashcards_created?: any; cleanedContent: string }> {
  let cleanedContent = content;
  let event_created = null;
  let flashcards_created = null;

  // 1. Calendar action
  const calRegex = /```tabe-action:calendar\s*([\s\S]*?)\s*```/;
  const calMatch = content.match(calRegex);
  if (calMatch && calMatch[1]) {
    try {
      const items = JSON.parse(calMatch[1].trim());
      if (Array.isArray(items) && items.length > 0) {
        for (const it of items) {
          await (supabase as any).from("calendar_events").insert({
            user_id: userId,
            titulo: it.titulo,
            fecha: it.fecha,
            hora: it.hora || null,
            tipo_examen: it.tipo_examen || "Otro",
            color: "#00d9ff",
          });
        }
        event_created = items;
      }
    } catch (e) {
      console.warn("Failed to parse calendar action:", e);
    }
    cleanedContent = cleanedContent.replace(calRegex, "").trim();
  }

  // 2. Flashcards action
  const fcRegex = /```tabe-action:flashcards\s*([\s\S]*?)\s*```/;
  const fcMatch = content.match(fcRegex);
  if (fcMatch && fcMatch[1]) {
    try {
      const data = JSON.parse(fcMatch[1].trim());
      if (data.deck_name && Array.isArray(data.cards) && data.cards.length > 0) {
        const { data: deck } = await (supabase as any)
          .from("flashcard_decks")
          .insert({
            user_id: userId,
            nombre: data.deck_name,
            total_cards: data.cards.length,
          })
          .select()
          .single();

        if (deck) {
          await (supabase as any).from("flashcards").insert(
            data.cards.map((c: any) => ({
              deck_id: deck.id,
              user_id: userId,
              pregunta: c.pregunta,
              respuesta: c.respuesta,
            }))
          );
          flashcards_created = { deck, cards_count: data.cards.length };
        }
      }
    } catch (e) {
      console.warn("Failed to parse flashcard action:", e);
    }
    cleanedContent = cleanedContent.replace(fcRegex, "").trim();
  }

  return { event_created, flashcards_created, cleanedContent };
}

/**
 * Unified Streaming AI Chat function with Automatic Fallback
 */
export async function streamAIChat(params: {
  messages: Array<{ role: string; content: string }>;
  systemPrompt: string;
  model: AIModelOption;
  powerLevel?: PowerEffort;
  userId: string;
  onDelta: (text: string) => void;
  onReset?: () => void;          // Called when switching to a fallback model (clears UI)
  onComplete: (result: StreamResult) => void;
  onError: (error: Error) => void;
}): Promise<void> {
  const { messages, systemPrompt, model, powerLevel = "medio", userId, onDelta, onReset, onComplete, onError } = params;

  // Build candidate models queue (chosen model first, then fallbacks)
  const candidateModels: AIModelOption[] = [
    model,
    ...AVAILABLE_AI_MODELS.filter((m) => m.id !== model.id),
  ];

  let success = false;
  let finalContent = "";

  for (let i = 0; i < candidateModels.length; i++) {
    const candidate = candidateModels[i];

    // Buffer this candidate's output locally — only flush to real onDelta on success
    let localBuffer = "";
    let isErrorResponse = false;
    let firstChunk = true;

    const localDelta = (chunk: string) => {
      // Check if the very first chunk looks like an API error (leaked as content)
      if (firstChunk) {
        firstChunk = false;
        if (isApiErrorChunk(chunk)) {
          isErrorResponse = true;
          console.warn(`[AI] Model ${candidate.name} returned error content:`, chunk.trim());
          return;
        }
      }
      if (isErrorResponse) return; // discard rest of error stream
      localBuffer += chunk;
    };

    try {
      let ok = false;
      if (candidate.provider === "google") {
        ok = await streamFromGoogle({
          modelId: candidate.id,
          systemPrompt,
          messages,
          powerLevel,
          onDelta: localDelta,
        });
      } else {
        ok = await streamFromOpenRouter({
          modelId: candidate.id,
          systemPrompt,
          messages,
          powerLevel,
          onDelta: localDelta,
        });
      }

      // Success: this candidate produced real content
      if (ok && !isErrorResponse && localBuffer.trim().length > 0) {
        const cleaned = cleanAIResponse(localBuffer);
        // If we had a previous (failed) model streaming, reset the UI first
        if (i > 0 && onReset) onReset();
        // Emit the full buffered content at once so UI shows it cleanly
        onDelta(cleaned);
        finalContent = cleaned;
        success = true;
        break;
      }
    } catch (err: any) {
      console.warn(`[AI] Error with model ${candidate.name}, trying fallback...`, err);
    }

    // This candidate failed — if it already emitted some content, reset the UI
    if (localBuffer.trim().length > 0 && onReset) {
      onReset();
    }
  }

  if (!success && !finalContent) {
    onError(new Error("No se pudo conectar con ningún proveedor de IA. Por favor intentá de nuevo en unos segundos."));
    return;
  }

  // Parse any action block and execute it
  try {
    const { event_created, flashcards_created, cleanedContent } = await executeActionBlock(
      finalContent,
      userId
    );
    onComplete({
      content: cleanedContent || finalContent,
      event_created,
      flashcards_created,
    });
  } catch {
    onComplete({ content: finalContent });
  }
}

/**
 * Streaming via OpenRouter SSE with dynamic reasoning effort per power level
 */
async function streamFromOpenRouter(opts: {
  modelId: string;
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  powerLevel: PowerEffort;
  onDelta: (text: string) => void;
}): Promise<boolean> {
  const { modelId, systemPrompt, messages, powerLevel, onDelta } = opts;

  const controller = new AbortController();
  // 12s timeout for connection initiation
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const reasoningEffort =
    powerLevel === "alto" ? "high" : powerLevel === "medio" ? "low" : "none";
  const temperature = powerLevel === "alto" ? 0.7 : powerLevel === "bajo" ? 0.4 : 0.6;
  const maxTokens = powerLevel === "alto" ? 4096 : powerLevel === "bajo" ? 1800 : 3000;

  // Only include reasoning param for models that actually support extended thinking.
  // Sending it with effort="none" (or to non-reasoning models) triggers the
  // "model output must contain either output text or tool calls" error.
  const supportsReasoning = reasoningEffort !== "none";

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin || "https://tabe.software",
        "X-Title": "TABE",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        temperature,
        max_tokens: maxTokens,
        ...(supportsReasoning ? { reasoning: { effort: reasoningEffort } } : {}),
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn(`OpenRouter model ${modelId} HTTP ${res.status}:`, errBody);
      return false;
    }

    const reader = res.body?.getReader();
    if (!reader) return false;

    const decoder = new TextDecoder();
    let buffer = "";
    let receivedTokens = 0;

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

          // OpenRouter can embed error objects inside the SSE stream
          if (parsed.error) {
            console.warn(`OpenRouter stream error for ${modelId}:`, parsed.error);
            continue;
          }

          const delta = parsed.choices?.[0]?.delta;
          // STRICT: Only pass delta.content to user, NEVER reasoning/internal thought tokens!
          const chunk = delta?.content;
          if (chunk) {
            receivedTokens++;
            onDelta(chunk);
          } else if (delta?.reasoning) {
            // Keep connection alive without leaking internal chain-of-thought
            receivedTokens++;
          }
        } catch {
          // partial chunk, wait for next line
        }
      }
    }

    return receivedTokens > 0;
  } catch (err) {
    clearTimeout(timeoutId);
    return false;
  }
}

/**
 * Streaming via Google Gemini SSE (<1.8s)
 */
async function streamFromGoogle(opts: {
  modelId: string;
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  powerLevel: PowerEffort;
  onDelta: (text: string) => void;
}): Promise<boolean> {
  const { modelId, systemPrompt, messages, powerLevel, onDelta } = opts;

  // Convert conversation to Gemini contents
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const temperature = powerLevel === "alto" ? 0.7 : powerLevel === "bajo" ? 0.4 : 0.6;
  const maxTokens = powerLevel === "alto" ? 4096 : powerLevel === "bajo" ? 1800 : 3000;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          ...(powerLevel === "bajo" ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn(`Gemini model ${modelId} HTTP ${res.status}:`, errBody);
      return false;
    }

    const reader = res.body?.getReader();
    if (!reader) return false;

    const decoder = new TextDecoder();
    let buffer = "";
    let receivedTokens = 0;

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
        try {
          const parsed = JSON.parse(jsonStr);

          // Gemini can embed error objects inside the SSE stream (e.g. 503 capacity)
          if (parsed.error) {
            console.warn(`Gemini stream error for ${modelId}:`, parsed.error);
            return false; // Trigger fallback immediately
          }

          const parts = parsed.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if ((part as any).thought) {
              // Ignore internal thought reasoning
              receivedTokens++;
              continue;
            }
            const chunk = part.text;
            if (chunk) {
              receivedTokens++;
              onDelta(chunk);
            }
          }
        } catch {
          // partial chunk, ignore
        }
      }
    }

    return receivedTokens > 0;
  } catch (err) {
    clearTimeout(timeoutId);
    return false;
  }
}

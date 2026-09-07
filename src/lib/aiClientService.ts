import { supabase } from "@/integrations/supabase/client";
import {
  AVAILABLE_AI_MODELS,
  DEFAULT_AI_MODEL,
  OPENROUTER_API_KEY,
  GEMINI_API_KEY,
  AIModelOption,
} from "@/config/aiModels";

export interface StreamResult {
  content: string;
  event_created?: any;
  flashcards_created?: { deck: any; cards_count: number };
}

/**
 * Builds academic context for the student
 */
export async function buildStudentContext(
  userId: string,
  personaPrompt: string,
  personaName: string,
  userName?: string
): Promise<string> {
  const now = new Date();
  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const hoyStr = now.toISOString().split("T")[0];
  const hoyDia = diasSemana[now.getDay()];

  let subjectsStr = "Sin materias registradas.";
  let eventsStr = "Sin eventos agendados próximos.";
  let statsStr = "";

  try {
    // 1. Fetch user subjects
    const { data: userSubs } = await (supabase as any)
      .from("user_subject_status")
      .select("estado, nota, subjects(id, nombre, codigo, anio)")
      .eq("user_id", userId);

    if (userSubs && userSubs.length > 0) {
      subjectsStr = userSubs
        .map((s: any) => {
          const sub = s.subjects;
          const notaStr = s.nota ? ` (Nota: ${s.nota})` : "";
          return `- ${sub?.nombre || "Materia"} [${s.estado || "sin_cursar"}]${notaStr}`;
        })
        .join("\n");
    }

    // 2. Fetch upcoming events
    const { data: events } = await (supabase as any)
      .from("calendar_events")
      .select("titulo, fecha, hora, tipo_examen")
      .eq("user_id", userId)
      .gte("fecha", hoyStr)
      .order("fecha", { ascending: true })
      .limit(10);

    if (events && events.length > 0) {
      eventsStr = events
        .map((e: any) => `- ${e.fecha} ${e.hora || ""}: ${e.titulo} (${e.tipo_examen || "Evento"})`)
        .join("\n");
    }

    // 3. Fetch stats
    const { data: stats } = await (supabase as any)
      .from("user_stats")
      .select("nivel, xp_total")
      .eq("user_id", userId)
      .maybeSingle();

    if (stats) {
      statsStr = `Nivel: ${stats.nivel || 1} | XP: ${stats.xp_total || 0}`;
    }
  } catch (err) {
    console.warn("Error fetching student context for AI:", err);
  }

  return `Sos ${personaName}, asistente académico inteligente de ${userName || "el estudiante"} en TABE (plataforma universitaria de Argentina).
Personalidad: ${personaPrompt}

FECHA DE HOY: ${hoyStr} (${hoyDia})
${statsStr ? `PERFIL ESTUDIANTE: ${statsStr}` : ""}

MATERIAS DEL ESTUDIANTE:
${subjectsStr}

PRÓXIMOS EVENTOS Y EXÁMENES EN AGENDA:
${eventsStr}

INSTRUCCIONES IMPORTANTES:
1. Responde de forma motivadora, clara, profesional y con modismos amables argentinos (che, genial, dale, etc.).
2. Explica conceptos paso a paso. Puedes usar fórmulas matemáticas con KaTeX (e.g. $x^2 + y^2 = r^2$) y bloques de código con markdown.
3. Si el usuario te pide expresamente agendar un examen o evento, dale una respuesta amigable y añade al final de tu mensaje el siguiente bloque exacto:
\`\`\`tabe-action:calendar
[{"titulo": "Nombre del evento", "fecha": "YYYY-MM-DD", "hora": "HH:mm", "tipo_examen": "P1"}]
\`\`\`
4. Si el usuario te pide crear flashcards para estudiar, incluye al final:
\`\`\`tabe-action:flashcards
{"deck_name": "Tema", "cards": [{"pregunta": "¿Pregunta?", "respuesta": "Respuesta"}]}
\`\`\`
5. Responde con texto fluido para cualquier saludo, pregunta casual o explicación de estudio sin añadir bloques de acción a menos que lo soliciten explícitamente.`;
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
  userId: string;
  onDelta: (text: string) => void;
  onComplete: (result: StreamResult) => void;
  onError: (error: Error) => void;
}): Promise<void> {
  const { messages, systemPrompt, model, userId, onDelta, onComplete, onError } = params;

  // Build candidate models queue (chosen model first, then fallbacks)
  const candidateModels: AIModelOption[] = [
    model,
    ...AVAILABLE_AI_MODELS.filter((m) => m.id !== model.id),
  ];

  let fullRawContent = "";
  let success = false;

  for (const candidate of candidateModels) {
    try {
      if (candidate.provider === "google") {
        const ok = await streamFromGoogle({
          modelId: candidate.id,
          systemPrompt,
          messages,
          onDelta: (chunk) => {
            fullRawContent += chunk;
            onDelta(chunk);
          },
        });
        if (ok) {
          success = true;
          break;
        }
      } else {
        const ok = await streamFromOpenRouter({
          modelId: candidate.id,
          systemPrompt,
          messages,
          onDelta: (chunk) => {
            fullRawContent += chunk;
            onDelta(chunk);
          },
        });
        if (ok) {
          success = true;
          break;
        }
      }
    } catch (err: any) {
      console.warn(`[AI] Error with model ${candidate.name}, attempting fallback...`, err);
      // If we already received some partial content, don't restart silently
      if (fullRawContent.length > 50) {
        break;
      }
    }
  }

  if (!success && !fullRawContent) {
    onError(new Error("No se pudo conectar con los proveedores de IA. Intenta de nuevo en unos momentos."));
    return;
  }

  // Parse any action block and execute it
  try {
    const { event_created, flashcards_created, cleanedContent } = await executeActionBlock(
      fullRawContent,
      userId
    );
    onComplete({
      content: cleanedContent || fullRawContent,
      event_created,
      flashcards_created,
    });
  } catch {
    onComplete({ content: fullRawContent });
  }
}

/**
 * Streaming via OpenRouter SSE
 */
async function streamFromOpenRouter(opts: {
  modelId: string;
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  onDelta: (text: string) => void;
}): Promise<boolean> {
  const { modelId, systemPrompt, messages, onDelta } = opts;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
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
      temperature: 0.6,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    console.warn(`OpenRouter model ${modelId} error: ${res.status}`);
    return false;
  }

  const reader = res.body?.getReader();
  if (!reader) return false;

  const decoder = new TextDecoder();
  let buffer = "";

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
        const chunk = parsed.choices?.[0]?.delta?.content;
        if (chunk) {
          onDelta(chunk);
        }
      } catch {
        // partial chunk, wait for next line
      }
    }
  }

  return true;
}

/**
 * Streaming via Google Gemini SSE
 */
async function streamFromGoogle(opts: {
  modelId: string;
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  onDelta: (text: string) => void;
}): Promise<boolean> {
  const { modelId, systemPrompt, messages, onDelta } = opts;

  // Convert conversation to Gemini contents
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!res.ok) {
    console.warn(`Gemini model ${modelId} error: ${res.status}`);
    return false;
  }

  const reader = res.body?.getReader();
  if (!reader) return false;

  const decoder = new TextDecoder();
  let buffer = "";

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
        const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (chunk) {
          onDelta(chunk);
        }
      } catch {
        // partial chunk, ignore
      }
    }
  }

  return true;
}

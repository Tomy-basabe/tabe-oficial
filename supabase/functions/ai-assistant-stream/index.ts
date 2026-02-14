import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_EVENT_TYPES = ['P1', 'P2', 'Global', 'Final', 'Recuperatorio P1', 'Recuperatorio P2', 'Recuperatorio Global', 'Estudio'] as const;
type ValidEventType = typeof VALID_EVENT_TYPES[number];

function mapEventType(aiType: string): ValidEventType {
  const typeMap: Record<string, ValidEventType> = {
    'parcial1': 'P1', 'parcial 1': 'P1', 'p1': 'P1', 'primer parcial': 'P1',
    'parcial2': 'P2', 'parcial 2': 'P2', 'p2': 'P2', 'segundo parcial': 'P2',
    'global': 'Global', 'final': 'Final', 'recuperatorio': 'Recuperatorio P1',
    'recuperatorio p1': 'Recuperatorio P1', 'recuperatorio p2': 'Recuperatorio P2',
    'recuperatorio global': 'Recuperatorio Global', 'estudio': 'Estudio',
  };
  return typeMap[aiType.toLowerCase().trim()] || 'Estudio';
}

function getColorForType(tipo: ValidEventType): string {
  const colors: Record<ValidEventType, string> = {
    'P1': "#00d9ff", 'P2': "#a855f7", 'Global': "#fbbf24", 'Final': "#22c55e",
    'Recuperatorio P1': "#ef4444", 'Recuperatorio P2': "#ef4444",
    'Recuperatorio Global': "#ef4444", 'Estudio': "#6b7280",
  };
  return colors[tipo] || "#00d9ff";
}

// Helper to list available models dynamically
async function getAvailableGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) return [];

    const data = await response.json();
    if (!data.models) return [];

    // Prioritize models: Flash > Flash-Lite > Pro > Others
    // We filter for generateContent support. streamGenerateContent is usually implied.
    const validModels = data.models
      .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m: any) => m.name.replace("models/", "")); // Strip 'models/' prefix for use in URL construction if needed

    // Custom sort order - Prioritize 1.5 Flash (Free tier friendly) over 2.0 (Quota limited)
    const priority = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash-001",
      "gemini-1.5-flash-002",
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro",
      "gemini-1.5-pro-latest",
      "gemini-1.0-pro",
      "gemini-2.0-flash-lite",
      "gemini-2.0-flash"
    ];

    validModels.sort((a: string, b: string) => {
      const idxA = priority.findIndex(p => a.includes(p));
      const idxB = priority.findIndex(p => b.includes(p));
      const valA = idxA === -1 ? 999 : idxA;
      const valB = idxB === -1 ? 999 : idxB;
      return valA - valB;
    });

    return validModels;
  } catch (e) {
    console.warn("Failed to list models:", e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });

    // Use getUser for reliable auth
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) throw new Error("Invalid token");

    const userId = user.id;
    const { messages, persona_id } = await req.json();

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch persona personality
    let personaName = "T.A.B.E. IA";
    let personalityPrompt = "Sos un asistente académico motivador y cercano. Usás lenguaje informal argentino.";
    if (persona_id) {
      const { data: persona } = await serviceClient
        .from("ai_personas")
        .select("name, personality_prompt")
        .eq("id", persona_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (persona) {
        personaName = persona.name;
        if (persona.personality_prompt) personalityPrompt = persona.personality_prompt;
      }
    }

    // Fetch recent chat memory from past sessions (last 20 messages)
    let chatMemory = "";
    if (persona_id) {
      const { data: recentMsgs } = await serviceClient
        .from("ai_chat_messages")
        .select("role, content, created_at, session_id!inner(persona_id, user_id)")
        .eq("session_id.persona_id", persona_id)
        .eq("session_id.user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (recentMsgs && recentMsgs.length > 0) {
        const memoryLines = recentMsgs.reverse().map((m: any) =>
          `${m.role === 'user' ? 'Estudiante' : personaName}: ${m.content.slice(0, 200)}`
        ).join("\n");
        chatMemory = `\nMEMORIA DE CONVERSACIONES ANTERIORES (usá esto para dar continuidad, recordar preferencias y evolucionar tu personalidad):\n${memoryLines}`;
      }
    }

    // --- CONTEXT FETCHING (ALL USER DATA) ---
    const [
      subjectsResult,
      userSubjectStatusResult,
      existingEventsResult,
      userStatsResult,
      recentSessionsResult,
      flashcardDecksResult,
      achievementsResult,
      userAchievementsResult,
      notionDocsResult,
      libraryFilesResult,
      dependenciesResult,
      plantsResult,
      profileResult,
    ] = await Promise.all([
      serviceClient.from("subjects").select("id, nombre, codigo, ano:año, cuatrimestre"),
      serviceClient.from("user_subject_status").select("*").eq("user_id", userId),
      serviceClient.from("calendar_events").select("*").eq("user_id", userId).gte("fecha", new Date().toISOString().split("T")[0]).order("fecha", { ascending: true }).limit(20),
      serviceClient.from("user_stats").select("*").eq("user_id", userId).maybeSingle(),
      serviceClient.from("study_sessions").select("*").eq("user_id", userId).order("fecha", { ascending: false }).limit(10),
      serviceClient.from("flashcard_decks").select("id, nombre, total_cards, subject_id").eq("user_id", userId).limit(20),
      serviceClient.from("achievements").select("*"),
      serviceClient.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", userId),
      serviceClient.from("notion_documents").select("id, titulo, emoji, subject_id, is_favorite, total_time_seconds, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(20),
      serviceClient.from("library_files").select("id, nombre, tipo, subject_id, created_at").eq("user_id", userId).limit(50),
      serviceClient.from("subject_dependencies").select("subject_id, requiere_aprobada, requiere_regular"),
      serviceClient.from("user_plants").select("*").eq("user_id", userId),
      serviceClient.from("profiles").select("nombre, username, email").eq("user_id", userId).maybeSingle(),
    ]);

    const subjects = subjectsResult.data || [];
    const userSubjectStatus = userSubjectStatusResult.data || [];
    const existingEvents = existingEventsResult.data || [];
    const userStats = userStatsResult.data;
    const recentSessions = recentSessionsResult.data || [];
    const flashcardDecks = flashcardDecksResult.data || [];
    const allAchievements = achievementsResult.data || [];
    const userAchievements = userAchievementsResult.data || [];
    const notionDocs = notionDocsResult.data || [];
    const libraryFiles = libraryFilesResult.data || [];
    const dependencies = dependenciesResult.data || [];
    const plants = plantsResult.data || [];
    const profile = profileResult.data;

    // --- BUILD SUBJECTS ---
    const subjectsWithStatus = subjects.map((s: any) => {
      const status = userSubjectStatus.find((us: any) => us.subject_id === s.id);
      return {
        ...s,
        estado: status?.estado || "sin_cursar",
        nota: status?.nota_final_examen || status?.nota || null,
        nota_parcial: status?.nota || null,
        fecha_aprobacion: status?.fecha_aprobacion || null,
      };
    });
    const subjectNameById = Object.fromEntries(subjects.map((s: any) => [s.id, s.nombre]));

    // --- FORMAT DATA STRINGS ---
    const subjectsList = subjectsWithStatus.map((s: any) => {
      const notaStr = s.nota ? ` | Nota final: ${s.nota}` : '';
      const parcialStr = s.nota_parcial && s.nota_parcial !== s.nota ? ` | Nota parcial: ${s.nota_parcial}` : '';
      const fechaStr = s.fecha_aprobacion ? ` | Aprobada: ${s.fecha_aprobacion}` : '';
      return `- ${s.nombre} (${s.codigo}, Año ${s.ano}): ${s.estado.toUpperCase()}${notaStr}${parcialStr}${fechaStr}`;
    }).join("\n");

    const eventsList = existingEvents.map((e: any) =>
      `📅 ${e.fecha}${e.hora ? ' ' + e.hora : ''}: ${e.titulo} (${e.tipo_examen})${e.notas ? ' - ' + e.notas : ''}`
    ).join("\n") || "Sin eventos próximos.";

    const recentSessionsMinutes = recentSessions.reduce((acc: number, s: any) => acc + (s.duracion_segundos || 0), 0) / 60;
    const sessionsList = recentSessions.map((s: any) => {
      const mins = Math.round((s.duracion_segundos || 0) / 60);
      const subjectName = s.subject_id ? subjectNameById[s.subject_id] || '' : '';
      return `⏱️ ${s.fecha}: ${mins}min (${s.tipo})${subjectName ? ' - ' + subjectName : ''}`;
    }).join("\n") || "Sin sesiones.";

    const decksList = flashcardDecks.map((d: any) => {
      const subjectName = d.subject_id ? subjectNameById[d.subject_id] || '' : '';
      return `🃏 ${d.nombre} (${d.total_cards} cartas)${subjectName ? ' - ' + subjectName : ''}`;
    }).join("\n") || "Sin mazos.";

    const unlockedIds = new Set(userAchievements.map((ua: any) => ua.achievement_id));
    const unlockedList = allAchievements.filter((a: any) => unlockedIds.has(a.id)).map((a: any) => `🏆 ${a.icono} ${a.nombre}`).join("\n") || "Sin logros.";
    const lockedList = allAchievements.filter((a: any) => !unlockedIds.has(a.id)).map((a: any) => `🔒 ${a.nombre}`).join("\n");

    const notionList = notionDocs.map((d: any) => `📝 ${d.titulo}`).join("\n") || "Sin documentos.";
    const librarySummary = libraryFiles.length > 0 ? `Total: ${libraryFiles.length} archivos.` : "Biblioteca vacía.";

    const depsList = dependencies.map((d: any) => {
      const subjectName = subjectNameById[d.subject_id] || d.subject_id;
      return `🔗 ${subjectName}`;
    }).join("\n") || "Sin correlatividades.";

    const plantsSummary = plants.length > 0 ? `🌱 ${plants.length} plantas.` : "Sin plantas.";
    const statsBlock = userStats ? `Nivel: ${userStats.nivel} | XP: ${userStats.xp_total}` : "Sin estadísticas.";

    const userName = profile?.nombre || profile?.username || 'Estudiante';

    const systemPrompt = `Sos ${personaName}, asistente académico de ${userName} con ACCESO TOTAL a todos sus datos.
Tu personalidad: ${personalityPrompt}
Fecha actual: ${new Date().toISOString().split('T')[0]}

ESTADÍSTICAS:
${statsBlock}

MATERIAS:
${subjectsList}

CORRELATIVIDADES:
${depsList}

AGENDA:
${eventsList}

SESIONES:
${sessionsList}

FLASHCARDS:
${decksList}

LOGROS:
${unlockedList}
${lockedList}

NOTION:
${notionList}

BIBLIOTECA:
${librarySummary}

PLANTAS:
${plantsSummary}
${chatMemory}

CAPACIDADES:
- Responder sobre notas, estado y correlatividades.
- Gestionar calendario.
- Crear flashcards.
- Analizar progreso.
- Resumir documentos.

IMPORTANTE: Usá datos reales.`;

    const tools = [
      {
        type: "function",
        function: { name: "create_calendar_event", description: "Crea un evento.", parameters: { type: "object", properties: { titulo: { type: "string" }, fecha: { type: "string" }, hora: { type: "string" }, tipo_examen: { type: "string", enum: VALID_EVENT_TYPES }, notas: { type: "string" }, subject_id: { type: "string" } }, required: ["titulo", "fecha", "tipo_examen"] } }
      },
      {
        type: "function",
        function: { name: "delete_calendar_event", description: "Elimina un evento por ID.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } }
      },
      {
        type: "function",
        function: { name: "create_flashcards", description: "Crea mazo de flashcards.", parameters: { type: "object", properties: { deck_name: { type: "string" }, cards: { type: "array", items: { type: "object", properties: { pregunta: { type: "string" }, respuesta: { type: "string" } }, required: ["pregunta", "respuesta"] } } }, required: ["deck_name", "cards"] } }
      },
      {
        type: "function",
        function: { name: "get_study_history", description: "Obtiene historial extendido.", parameters: { type: "object", properties: { days: { type: "number" } }, required: ["days"] } }
      }
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    let responseStream: ReadableStream | null = null;
    let provider = "";
    let usedModel = "";

    const geminiTools = {
      function_declarations: tools.map((t: any) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters
      }))
    };

    const geminiContents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })).filter((m: any) => m.role !== 'system');

    const systemInstruction = {
      parts: [{ text: systemPrompt }]
    };

    const errors: string[] = [];

    // 1. STRATEGY: GOOGLE DIRECT (DYNAMIC DISCOVERY)
    if (GEMINI_API_KEY) {
      console.log("Starting Dynamic Gemini Model Discovery...");
      let candidateModels: string[] = [];
      try {
        candidateModels = await getAvailableGeminiModels(GEMINI_API_KEY);
      } catch (e) {
        console.warn("Dynamic discovery failed, using fallback.");
      }

      // If discovery fails OR if gemini-1.5-flash is not present in the discovery list (e.g. strict filtering),
      // we MANUALLY inject it at the top, because we know it exists and usually has good free tier.
      if (!candidateModels.includes("gemini-1.5-flash")) {
        candidateModels.unshift("gemini-1.5-flash"); // Force it to be first candidate if missing
      }

      // Fallback list if absolutely empty
      if (candidateModels.length === 0) {
        candidateModels = ["gemini-1.5-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro"];
      }

      console.log(`Candidate models: ${candidateModels.join(", ")}`);

      // INCREASED RETRY LIMIT: Try up to 20 models to bypass rate limits (429)
      for (const model of candidateModels.slice(0, 20)) {
        try {
          console.log(`[Google Native] Trying model: ${model}`);
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${GEMINI_API_KEY}`;

          const body = {
            contents: geminiContents,
            system_instruction: systemInstruction,
            tools: [geminiTools],
            generationConfig: { maxOutputTokens: 2048 }
          };

          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          if (res.ok) {
            console.log(`[Google Native] Success with ${model}`);
            responseStream = res.body;
            provider = "google-native";
            usedModel = model;
            break;
          }

          const errText = await res.text();
          const errorMsg = `[Google ${model}] ${res.status}: ${errText.substring(0, 100)}`; // Truncate log
          console.warn(errorMsg);
          errors.push(errorMsg);
        } catch (e) {
          const errorMsg = `[Google ${model}] Network Error: ${e instanceof Error ? e.message : String(e)}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
    } else {
      errors.push("[Google] GEMINI_API_KEY not found.");
    }

    // 2. STRATEGY: LOVABLE GATEWAY (FALLBACK)
    if (!responseStream && LOVABLE_API_KEY) {
      const LOVABLE_MODELS = ["google/gemini-2.0-flash-lite", "google/gemini-1.5-flash", "openai/gpt-4o-mini"];
      console.log("Falling back to Lovable Gateway...");
      for (const model of LOVABLE_MODELS) {
        try {
          console.log(`[Lovable] Trying model: ${model}`);
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: model,
              messages: [{ role: "system", content: systemPrompt }, ...messages],
              tools,
              stream: true,
            }),
          });

          if (res.ok) {
            console.log(`[Lovable] Success with ${model}`);
            responseStream = res.body;
            provider = "lovable";
            usedModel = model;
            break;
          }
          const errText = await res.text();
          const errorMsg = `[Lovable ${model}] ${res.status}: ${errText.substring(0, 200)}`;
          console.warn(errorMsg);
          errors.push(errorMsg);
        } catch (e) {
          const errorMsg = `[Lovable ${model}] Network Error: ${e instanceof Error ? e.message : String(e)}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }
    } else if (!LOVABLE_API_KEY) {
      errors.push("[Lovable] LOVABLE_API_KEY not found.");
    }

    if (!responseStream) {
      console.error("Critical AI Error. Logs:", JSON.stringify(errors));
      throw new Error(`Error de conexión IA. Detalles: ${errors.join(" | ")}`);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let toolCalls: any[] = [];

    // --- TRANSFORM STREAM: UNIFY FORMATS ---
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });

        if (provider === "google-native") {
          let cleanText = text.replace(/^,/, '').trim();
          if (cleanText.startsWith('[')) cleanText = cleanText.substring(1);
          if (cleanText.endsWith(']')) cleanText = cleanText.substring(0, cleanText.length - 1);

          if (!cleanText) return;

          try {
            const parts = cleanText.split(/\n,\n|,/g).filter(p => p.trim().length > 0);
            for (const part of parts) {
              try {
                const data = JSON.parse(part);
                const candidate = data.candidates?.[0];

                if (candidate?.content?.parts?.[0]?.text) {
                  const content = candidate.content.parts[0].text;
                  const sse = { choices: [{ delta: { content } }] };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(sse)}\n\n`));
                }

                if (candidate?.content?.parts?.[0]?.functionCall) {
                  const fc = candidate.content.parts[0].functionCall;
                  const toolSse = {
                    choices: [{ delta: { tool_calls: [{ id: "call_" + Math.random().toString(36).substr(2, 9), function: { name: fc.name, arguments: JSON.stringify(fc.args) } }] } }]
                  };
                  if (!toolCalls.length) toolCalls = [{ id: "gemini_id", function: { name: fc.name, arguments: JSON.stringify(fc.args) } }];
                }
              } catch (e) { }
            }
          } catch (e) { }

        } else {
          // LOVABLE / OPENAI STANDARD SSE
          const lines = text.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr !== "[DONE]") {
              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta;
                if (delta?.tool_calls) {
                  const tc = delta.tool_calls[0];
                  if (tc.function?.name) toolCalls = [{ id: tc.id, function: { name: tc.function.name, arguments: "" } }];
                  if (tc.function?.arguments) toolCalls[0].function.arguments += tc.function.arguments;
                } else if (delta?.content) {
                  controller.enqueue(encoder.encode(`data: ${jsonStr}\n\n`));
                }
              } catch { }
            }
          }
        }
      },

      async flush(controller) {
        if (toolCalls.length > 0) {
          const call = toolCalls[0];
          const args = JSON.parse(call.function.arguments);
          let result;

          if (call.function.name === "create_calendar_event") {
            const mappedType = mapEventType(args.tipo_examen);
            const { data, error } = await serviceClient.from("calendar_events").insert({ user_id: userId, titulo: args.titulo, fecha: args.fecha, hora: args.hora, tipo_examen: mappedType, color: getColorForType(mappedType), notas: args.notas, subject_id: args.subject_id }).select().single();
            result = error ? { content: `Error: ${error.message}` } : { content: `Evento agendado: ${data.titulo} el ${data.fecha}` };
          }
          else if (call.function.name === "delete_calendar_event") {
            const { error } = await serviceClient.from("calendar_events").delete().eq("id", args.id).eq("user_id", userId);
            result = error ? { content: "Error al eliminar." } : { content: "Evento eliminado." };
          }
          else if (call.function.name === "create_flashcards") {
            const { data: deck, error } = await serviceClient.from("flashcard_decks").insert({ user_id: userId, nombre: args.deck_name, total_cards: args.cards.length }).select().single();
            if (deck) {
              const cards = args.cards.map((c: any) => ({ deck_id: deck.id, user_id: userId, pregunta: c.pregunta, respuesta: c.respuesta }));
              await serviceClient.from("flashcards").insert(cards);
              result = { content: `Mazo "${deck.nombre}" creado con ${deck.total_cards} cartas.` };
            } else { result = { content: `Error creando mazo: ${error?.message}` }; }
          }
          else if (call.function.name === "get_study_history") {
            const days = args.days || 30;
            const since = new Date();
            since.setDate(since.getDate() - days);
            const { data } = await serviceClient.from("study_sessions").select("*").eq("user_id", userId).gte("fecha", since.toISOString());
            result = { content: JSON.stringify(data) };
          }

          if (result) {
            const sse = { choices: [{ delta: { content: "\n\n" + result.content } }] };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(sse)}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      }
    });

    return new Response(responseStream.pipeThrough(transformStream), { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: corsHeaders });
  }
});
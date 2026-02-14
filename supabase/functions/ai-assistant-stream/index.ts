
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

    // --- BUILD SUBJECTS WITH FULL STATUS ---
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

    const subjectsList = subjectsWithStatus.map((s: any) => {
      const notaStr = s.nota ? ` | Nota final: ${s.nota}` : '';
      const parcialStr = s.nota_parcial && s.nota_parcial !== s.nota ? ` | Nota parcial: ${s.nota_parcial}` : '';
      const fechaStr = s.fecha_aprobacion ? ` | Aprobada: ${s.fecha_aprobacion}` : '';
      return `- ${s.nombre} (${s.codigo}, Año ${s.ano}): ${s.estado.toUpperCase()}${notaStr}${parcialStr}${fechaStr}`;
    }).join("\n");

    // --- CALENDAR ---
    const eventsList = existingEvents.map((e: any) =>
      `📅 ${e.fecha}${e.hora ? ' ' + e.hora : ''}: ${e.titulo} (${e.tipo_examen})${e.notas ? ' - ' + e.notas : ''}`
    ).join("\n") || "Sin eventos próximos.";

    // --- STUDY SESSIONS ---
    const totalStudyMinutes = recentSessions.reduce((acc: number, s: any) => acc + (s.duracion_segundos || 0), 0) / 60;
    const sessionsList = recentSessions.map((s: any) => {
      const mins = Math.round((s.duracion_segundos || 0) / 60);
      const subjectName = s.subject_id ? subjectNameById[s.subject_id] || '' : '';
      return `⏱️ ${s.fecha}: ${mins}min (${s.tipo})${subjectName ? ' - ' + subjectName : ''}`;
    }).join("\n") || "Sin sesiones recientes.";

    // --- FLASHCARDS ---
    const decksList = flashcardDecks.map((d: any) => {
      const subjectName = d.subject_id ? subjectNameById[d.subject_id] || '' : '';
      return `🃏 ${d.nombre} (${d.total_cards} cartas)${subjectName ? ' - ' + subjectName : ''}`;
    }).join("\n") || "Sin mazos.";

    // --- ACHIEVEMENTS ---
    const unlockedIds = new Set(userAchievements.map((ua: any) => ua.achievement_id));
    const unlockedList = allAchievements
      .filter((a: any) => unlockedIds.has(a.id))
      .map((a: any) => `🏆 ${a.icono} ${a.nombre}: ${a.descripcion} (+${a.xp_reward} XP)`)
      .join("\n") || "Sin logros todavía.";
    const lockedList = allAchievements
      .filter((a: any) => !unlockedIds.has(a.id))
      .map((a: any) => `🔒 ${a.nombre}: ${a.descripcion} (${a.condicion_tipo}: ${a.condicion_valor})`)
      .join("\n");

    // --- NOTION DOCUMENTS ---
    const notionList = notionDocs.map((d: any) => {
      const subjectName = d.subject_id ? subjectNameById[d.subject_id] || '' : '';
      const timeStr = d.total_time_seconds ? ` | ${Math.round(d.total_time_seconds / 60)}min dedicados` : '';
      const favStr = d.is_favorite ? ' ⭐' : '';
      return `📝 ${d.emoji || ''} ${d.titulo}${subjectName ? ' (' + subjectName + ')' : ''}${timeStr}${favStr}`;
    }).join("\n") || "Sin documentos.";

    // --- LIBRARY FILES ---
    const filesBySubject: Record<string, number> = {};
    const filesByType: Record<string, number> = {};
    libraryFiles.forEach((f: any) => {
      const sName = f.subject_id ? subjectNameById[f.subject_id] || 'Sin materia' : 'Sin materia';
      filesBySubject[sName] = (filesBySubject[sName] || 0) + 1;
      filesByType[f.tipo] = (filesByType[f.tipo] || 0) + 1;
    });
    const librarySummary = libraryFiles.length > 0
      ? `Total: ${libraryFiles.length} archivos\nPor materia: ${Object.entries(filesBySubject).map(([k, v]) => `${k}: ${v}`).join(', ')}\nPor tipo: ${Object.entries(filesByType).map(([k, v]) => `${k}: ${v}`).join(', ')}`
      : "Biblioteca vacía.";

    // --- CORRELATIVITIES ---
    const depsList = dependencies.map((d: any) => {
      const subjectName = subjectNameById[d.subject_id] || d.subject_id;
      const reqs: string[] = [];
      if (d.requiere_aprobada) reqs.push(`aprobada: ${subjectNameById[d.requiere_aprobada] || d.requiere_aprobada}`);
      if (d.requiere_regular) reqs.push(`regular: ${subjectNameById[d.requiere_regular] || d.requiere_regular}`);
      return `🔗 ${subjectName} requiere ${reqs.join(' y ')}`;
    }).join("\n") || "Sin correlatividades registradas.";

    // --- FOREST (PLANTS) ---
    const alivePlants = plants.filter((p: any) => p.is_alive && !p.is_completed).length;
    const completedPlants = plants.filter((p: any) => p.is_completed).length;
    const deadPlants = plants.filter((p: any) => !p.is_alive).length;
    const plantsSummary = plants.length > 0
      ? `🌱 Creciendo: ${alivePlants} | 🌳 Completadas: ${completedPlants} | 💀 Muertas: ${deadPlants}`
      : "Sin plantas todavía.";

    // --- STATS ---
    const statsBlock = userStats
      ? `Nivel: ${userStats.nivel} | XP: ${userStats.xp_total} | Racha: ${userStats.racha_actual} días (mejor: ${userStats.mejor_racha}) | Horas totales: ${Math.round(userStats.horas_estudio_total)}h`
      : "Sin estadísticas.";

    const userName = profile?.nombre || profile?.username || 'Estudiante';

    const systemPrompt = `Sos ${personaName}, asistente académico de ${userName} con ACCESO TOTAL a todos sus datos.
Tu personalidad: ${personalityPrompt}
Fecha actual: ${new Date().toISOString().split('T')[0]}

ESTADÍSTICAS:
${statsBlock}

MATERIAS (estado académico completo):
${subjectsList}

CORRELATIVIDADES:
${depsList}

AGENDA (próximos eventos):
${eventsList}

SESIONES DE ESTUDIO RECIENTES (últimas ${recentSessions.length}, total ${Math.round(totalStudyMinutes)}min):
${sessionsList}

FLASHCARDS:
${decksList}

LOGROS DESBLOQUEADOS:
${unlockedList}

LOGROS PENDIENTES:
${lockedList}

DOCUMENTOS NOTION:
${notionList}

BIBLIOTECA:
${librarySummary}

BOSQUE DE ESTUDIO:
${plantsSummary}
${chatMemory}

CAPACIDADES:
- Responder sobre notas, estado y correlatividades de materias.
- Gestionar calendario (crear, borrar, editar eventos).
- Crear flashcards.
- Analizar progreso y hábitos de estudio.
- Informar sobre logros desbloqueados y pendientes.
- Resumir documentos y archivos de la biblioteca.
- Dar recomendaciones personalizadas basadas en TODOS los datos.
- Indicar qué materias puede cursar según correlatividades.

IMPORTANTE: Usá los datos reales del estudiante para dar respuestas precisas. Si preguntan por una nota, buscala en la sección MATERIAS y respondé con el dato exacto. Nunca digas que no tenés acceso a la información si está en tu contexto. Respondé siempre en español.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "create_calendar_event",
          description: "Crea un evento en el calendario.",
          parameters: {
            type: "object",
            properties: {
              titulo: { type: "string" },
              fecha: { type: "string" },
              hora: { type: "string" },
              tipo_examen: { type: "string", enum: VALID_EVENT_TYPES },
              notas: { type: "string" },
              subject_id: { type: "string" }
            },
            required: ["titulo", "fecha", "tipo_examen"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_calendar_event",
          description: "Elimina un evento por ID.",
          parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }
        }
      },
      {
        type: "function",
        function: {
          name: "create_flashcards",
          description: "Crea mazo de flashcards.",
          parameters: {
            type: "object",
            properties: {
              deck_name: { type: "string" },
              cards: {
                type: "array",
                items: { type: "object", properties: { pregunta: { type: "string" }, respuesta: { type: "string" } }, required: ["pregunta", "respuesta"] }
              }
            },
            required: ["deck_name", "cards"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_study_history",
          description: "Obtiene historial extendido.",
          parameters: { type: "object", properties: { days: { type: "number" } }, required: ["days"] }
        }
      }
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const AVAILABLE_MODELS = [
      "google/gemini-2.0-flash-lite-preview-02-05",
      "google/gemini-1.5-flash",
      "google/gemini-1.5-pro",
    ];

    let response;
    let usedModel = "";

    for (const model of AVAILABLE_MODELS) {
      try {
        console.log(`Trying model: ${model}`);
        response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: model,
            messages: [{ role: "system", content: systemPrompt }, ...messages],
            tools,
            stream: true,
          }),
        });

        if (response.ok) {
          usedModel = model;
          break;
        }

        console.warn(`Model ${model} failed with status ${response.status}`);
      } catch (err) {
        console.error(`Model ${model} failed with error:`, err);
      }
    }

    if (!response || !response.ok) {
      throw new Error("Todos los modelos de IA están temporalmente no disponibles. Por favor intenta de nuevo en unos minutos.");
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let toolCalls: any[] = [];
    let accumulatedArgs = "";

    // Transform Stream to handle Tool Calls locally
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            if (toolCalls.length > 0) {
              const call = toolCalls[0];
              const args = JSON.parse(call.function.arguments);
              let result;

              if (call.function.name === "create_calendar_event") {
                const mappedType = mapEventType(args.tipo_examen);
                const { data, error } = await serviceClient.from("calendar_events").insert({
                  user_id: userId,
                  titulo: args.titulo,
                  fecha: args.fecha,
                  hora: args.hora,
                  tipo_examen: mappedType,
                  color: getColorForType(mappedType),
                  notas: args.notas,
                  subject_id: args.subject_id
                }).select().single();
                result = error ? { content: `Error: ${error.message}` } : { content: `Evento agendado: ${data.titulo} el ${data.fecha}` };
              }
              else if (call.function.name === "delete_calendar_event") {
                const { error } = await serviceClient.from("calendar_events").delete().eq("id", args.id).eq("user_id", userId);
                result = error ? { content: "Error al eliminar." } : { content: "Evento eliminado." };
              }
              else if (call.function.name === "create_flashcards") {
                const { data: deck, error } = await serviceClient.from("flashcard_decks").insert({
                  user_id: userId,
                  nombre: args.deck_name,
                  total_cards: args.cards.length
                }).select().single();

                if (deck) {
                  const cards = args.cards.map((c: any) => ({
                    deck_id: deck.id,
                    user_id: userId,
                    pregunta: c.pregunta,
                    respuesta: c.respuesta
                  }));
                  await serviceClient.from("flashcards").insert(cards);
                  result = { content: `Mazo "${deck.nombre}" creado con ${deck.total_cards} cartas.` };
                } else {
                  result = { content: `Error creando mazo: ${error?.message}` };
                }
              }
              else if (call.function.name === "get_study_history") {
                const days = args.days || 30;
                const since = new Date();
                since.setDate(since.getDate() - days);
                const { data } = await serviceClient.from("study_sessions").select("*").eq("user_id", userId).gte("fecha", since.toISOString());
                result = { content: JSON.stringify(data) };
              }

              if (result) controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            continue;
          }

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
    });

    return new Response(response.body?.pipeThrough(transformStream), { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: corsHeaders });
  }
});
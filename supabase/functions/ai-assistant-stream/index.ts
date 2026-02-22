// verify_jwt: false
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_EVENT_TYPES = ['P1', 'P2', 'Global', 'Final', 'Recuperatorio P1', 'Recuperatorio P2', 'Recuperatorio Global', 'Estudio', 'TP', 'Entrega', 'Clase', 'Otro'] as const;
type ValidEventType = typeof VALID_EVENT_TYPES[number];

function mapEventType(aiType: string): ValidEventType {
  const normalized = aiType.toLowerCase().trim();
  const typeMap: Record<string, ValidEventType> = {
    'parcial1': 'P1', 'parcial 1': 'P1', 'p1': 'P1', 'primer parcial': 'P1',
    'parcial2': 'P2', 'parcial 2': 'P2', 'p2': 'P2', 'segundo parcial': 'P2',
    'global': 'Global', 'final': 'Final', 'recuperatorio': 'Recuperatorio P1',
    'recuperatorio p1': 'Recuperatorio P1', 'recuperatorio p2': 'Recuperatorio P2',
    'recuperatorio global': 'Recuperatorio Global',
    'estudio': 'Estudio', 'estudiar': 'Estudio',
    'tp': 'TP', 'trabajo practico': 'TP', 'trabajo práctico': 'TP',
    'entrega': 'Entrega', 'entregar': 'Entrega',
    'clase': 'Clase', 'cursada': 'Clase',
    'otro': 'Otro', 'evento': 'Otro'
  };
  return typeMap[normalized] || 'Otro';
}

function getColorForType(tipo: ValidEventType): string {
  const colors: Record<ValidEventType, string> = {
    'P1': "#00d9ff", 'P2': "#a855f7", 'Global': "#fbbf24", 'Final': "#22c55e",
    'Recuperatorio P1': "#ef4444", 'Recuperatorio P2': "#ef4444",
    'Recuperatorio Global': "#ef4444",
    'Estudio': "#6b7280", 'TP': "#ec4899", 'Entrega': "#f97316",
    'Clase': "#3b82f6", 'Otro': "#8b5cf6"
  };
  return colors[tipo] || "#00d9ff";
}

// ===== FUZZY SUBJECT MATCHING =====
function normalizeText(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Build alias map for common abbreviations
function buildSubjectAliases(subjects: any[]): Map<string, any> {
  const aliasMap = new Map<string, any>();

  for (const s of subjects) {
    const norm = normalizeText(s.nombre);
    const code = normalizeText(s.codigo);

    // Exact matches
    aliasMap.set(norm, s);
    aliasMap.set(code, s);

    // Roman numeral aliases
    const romanMap: Record<string, string> = { 'i': '1', 'ii': '2', 'iii': '3', 'iv': '4', 'v': '5' };
    const arabicMap: Record<string, string> = { '1': 'i', '2': 'ii', '3': 'iii', '4': 'iv', '5': 'v' };

    for (const [roman, arabic] of Object.entries(romanMap)) {
      const romanRegex = new RegExp(`\\b${roman}\\b`, 'gi');
      if (romanRegex.test(norm)) {
        aliasMap.set(norm.replace(romanRegex, arabic), s);
      }
      const arabicRegex = new RegExp(`\\b${arabic}\\b`, 'g');
      if (arabicRegex.test(norm)) {
        aliasMap.set(norm.replace(arabicRegex, roman), s);
      }
    }

    const words = norm.split(/\s+y\s+|\s+de\s+|\s+los\s+|\s+la\s+|\s+el\s+|\s+en\s+|\s+para\s+|\s+/);
    const significantWords = words.filter(w => w.length > 3);
    if (significantWords.length > 0) {
      const firstWord = significantWords[0];
      if (!aliasMap.has(firstWord)) {
        aliasMap.set(firstWord, s);
      }
    }
  }

  return aliasMap;
}

function fuzzyFindSubject(query: string, subjects: any[], aliasMap: Map<string, any>): any | null {
  const q = normalizeText(query);
  if (aliasMap.has(q)) return aliasMap.get(q);

  for (const [alias, subject] of aliasMap.entries()) {
    if (alias.includes(q) || q.includes(alias)) return subject;
  }

  let bestMatch: any = null;
  let bestScore = 0;

  for (const s of subjects) {
    const norm = normalizeText(s.nombre);
    const code = normalizeText(s.codigo);
    let score = 0;
    if (code === q) return s;
    if (norm.includes(q)) score += 10;
    if (q.includes(norm)) score += 8;

    const queryWords = q.split(/\s+/);
    const nameWords = norm.split(/\s+/);
    let matchedWords = 0;
    for (const qw of queryWords) {
      if (qw.length <= 2) continue;
      for (const nw of nameWords) {
        if (nw.includes(qw) || qw.includes(nw)) {
          matchedWords++;
          break;
        }
      }
    }
    score += matchedWords * 3;

    const qWithRoman = q.replace(/\b1\b/g, 'i').replace(/\b2\b/g, 'ii').replace(/\b3\b/g, 'iii');
    const qWithArabic = q.replace(/\bi\b/g, '1').replace(/\bii\b/g, '2').replace(/\biii\b/g, '3');
    if (norm.includes(qWithRoman) || norm.includes(qWithArabic)) score += 10;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = s;
    }
  }
  return bestScore >= 3 ? bestMatch : null;
}

async function getAvailableGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.models) return [];
    const validModels = data.models
      .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m: any) => m.name.replace("models/", ""));
    const priority = [
      "gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash-001", "gemini-1.5-flash-002",
      "gemini-1.5-flash-8b", "gemini-1.5-pro", "gemini-1.5-pro-latest", "gemini-1.0-pro",
      "gemini-2.0-flash-lite", "gemini-2.0-flash"
    ];
    validModels.sort((a: string, b: string) => {
      const idxA = priority.findIndex(p => a.includes(p));
      const idxB = priority.findIndex(p => b.includes(p));
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
    return validModels;
  } catch (e) { return []; }
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
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) throw new Error("Invalid token");

    const userId = user.id;
    const { messages, persona_id, context_page } = await req.json();

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch persona
    let personaName = "T.A.B.E. IA";
    let personalityPrompt = "Sos un asistente acad\u00e9mico motivador y cercano. Us\u00e1s lenguaje informal argentino.";
    if (persona_id) {
      const { data: persona } = await serviceClient.from("ai_personas").select("name, personality_prompt").eq("id", persona_id).eq("user_id", userId).maybeSingle();
      if (persona) {
        personaName = persona.name;
        if (persona.personality_prompt) personalityPrompt = persona.personality_prompt;
      }
    }

    // Chat memory
    let chatMemory = "";
    if (persona_id) {
      const { data: recentMsgs } = await serviceClient.from("ai_chat_messages").select("role, content, created_at, session_id!inner(persona_id, user_id)").eq("session_id.persona_id", persona_id).eq("session_id.user_id", userId).order("created_at", { ascending: false }).limit(20);
      if (recentMsgs && recentMsgs.length > 0) {
        const memoryLines = recentMsgs.reverse().map((m: any) => `${m.role === 'user' ? 'Estudiante' : personaName}: ${m.content.slice(0, 200)}`).join("\n");
        chatMemory = `\nMEMORIA DE CONVERSACIONES ANTERIORES:\n${memoryLines}`;
      }
    }

    // Context fetching
    const [subjectsResult, userSubjectStatusResult, existingEventsResult, userStatsResult, recentSessionsResult, flashcardDecksResult, achievementsResult, userAchievementsResult, notionDocsResult, libraryFilesResult, dependenciesResult, plantsResult, profileResult] = await Promise.all([
      serviceClient.from("subjects").select("id, nombre, codigo, ano:a\u00f1o, cuatrimestre"),
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

    const subjectAliasMap = buildSubjectAliases(subjects);
    const subjectsWithStatus = subjects.map((s: any) => {
      const status = userSubjectStatus.find((us: any) => us.subject_id === s.id);
      return { ...s, estado: status?.estado || "sin_cursar", nota: status?.nota_final_examen || status?.nota || null, nota_parcial: status?.nota || null, fecha_aprobacion: status?.fecha_aprobacion || null };
    });
    const subjectNameById = Object.fromEntries(subjects.map((s: any) => [s.id, s.nombre]));

    const totalSubjects = subjects.length;
    const aprobadas = subjectsWithStatus.filter((s: any) => s.estado === 'aprobada');
    const regulares = subjectsWithStatus.filter((s: any) => s.estado === 'regular');
    const enCurso = subjectsWithStatus.filter((s: any) => s.estado === 'en_curso');
    const sinCursar = subjectsWithStatus.filter((s: any) => s.estado === 'sin_cursar');
    const libres = subjectsWithStatus.filter((s: any) => s.estado === 'libre');

    const notasAprobadas = aprobadas.map((s: any) => parseFloat(s.nota)).filter((n: number) => !isNaN(n) && n > 0);
    const promedioGeneral = notasAprobadas.length > 0 ? (notasAprobadas.reduce((a: number, b: number) => a + b, 0) / notasAprobadas.length).toFixed(2) : 'N/A';
    const progresoCarrera = totalSubjects > 0 ? ((aprobadas.length / totalSubjects) * 100).toFixed(1) : '0';
    const totalStudyMin = recentSessions.reduce((acc: number, s: any) => acc + (s.duracion_segundos || 0), 0) / 60;

    const subjectsList = subjectsWithStatus.map((s: any) => {
      const notaStr = s.nota ? ` | Nota: ${s.nota}` : '';
      return `- ${s.nombre} (${s.codigo}, A\u00f1o ${s.ano}): ${s.estado.toUpperCase()}${notaStr}${s.fecha_aprobacion ? ` | Aprobada: ${s.fecha_aprobacion}` : ''}`;
    }).join("\n");

    const systemPrompt = `Sos ${personaName}, asistente acad\u00e9mico de ${profile?.nombre || 'Estudiante'} con ACCESO TOTAL a sus datos:
RESUMEN:
- Promedio: ${promedioGeneral}
- Progreso carrera: ${aprobadas.length}/${totalSubjects} (${progresoCarrera}%)
- Estados: ${aprobadas.length} Aprobadas, ${regulares.length} Regulares, ${enCurso.length} En curso.
- Horas estudio recientes: ${(totalStudyMin / 60).toFixed(1)}hs.

DETALLE MATERIAS:
${subjectsList}

AGENDA:
${existingEvents.map((e: any) => `\ud83d\udcc5 ${e.fecha}: ${e.titulo}`).join("\n")}

INSTRUCCIONES:
1. Usa nombres abreviados (algebra -> \u00c1lgebra..., an\u00e1lisis 1 -> An\u00e1lisis I). 
2. Tienes acceso total real. Responde usando estos datos.
3. Responde siempre en Espa\u00f1ol Argentino.`;

    const tools = [
      { type: "function", function: { name: "create_calendar_event", description: "Crea evento", parameters: { type: "object", properties: { titulo: { type: "string" }, fecha: { type: "string" }, tipo_examen: { type: "string", enum: VALID_EVENT_TYPES }, subject_id: { type: "string" } }, required: ["titulo", "fecha", "tipo_examen"] } } },
      { type: "function", function: { name: "update_subject_status", description: "Cambia estado materia", parameters: { type: "object", properties: { subject_id: { type: "string" }, estado: { type: "string", enum: ["sin_cursar", "en_curso", "regular", "aprobada", "libre"] }, nota: { type: "number" } }, required: ["subject_id", "estado"] } } },
      { type: "function", function: { name: "create_flashcards", description: "Crea flashcards", parameters: { type: "object", properties: { deck_name: { type: "string" }, cards: { type: "array", items: { type: "object", properties: { pregunta: { type: "string" }, respuesta: { type: "string" } }, required: ["pregunta", "respuesta"] } } }, required: ["deck_name", "cards"] } } },
    ];

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: messages.map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })).filter(m => m.role !== 'system'), system_instruction: { parts: [{ text: systemPrompt }] }, tools: [{ function_declarations: tools.map((t: any) => t.function) }] }),
    });

    const data = await res.json();
    const candidate = data.candidates?.[0];
    let content = candidate?.content?.parts?.[0]?.text || "";
    const toolCall = candidate?.content?.parts?.[0]?.functionCall;

    const resolveId = (raw: string) => {
      const found = fuzzyFindSubject(raw, subjects, subjectAliasMap);
      return found ? found.id : null;
    };

    if (toolCall) {
      const args = toolCall.args;
      if (toolCall.name === "create_calendar_event") {
        const type = mapEventType(args.tipo_examen);
        await serviceClient.from("calendar_events").insert({ user_id: userId, titulo: args.titulo, fecha: args.fecha, tipo_examen: type, color: getColorForType(type), subject_id: resolveId(args.subject_id) });
        content += `\n\u2705 Evento agendado.`;
      } else if (toolCall.name === "update_subject_status") {
        const id = resolveId(args.subject_id);
        if (id) {
          const up: any = { user_id: userId, subject_id: id, estado: args.estado };
          if (args.nota) up.nota = args.nota;
          if (args.estado === 'aprobada') up.fecha_aprobacion = new Date().toISOString().split('T')[0];
          await serviceClient.from("user_subject_status").upsert(up, { onConflict: "user_id,subject_id" });
          content += `\n\u2705 Materia actualizada.`;
        }
      } else if (toolCall.name === "create_flashcards") {
        const id = resolveId(args.deck_name);
        const { data: deck } = await serviceClient.from("flashcard_decks").insert({ user_id: userId, nombre: args.deck_name, total_cards: args.cards.length, subject_id: id }).select().single();
        if (deck) {
          await serviceClient.from("flashcards").insert(args.cards.map((c: any) => ({ deck_id: deck.id, user_id: userId, pregunta: c.pregunta, respuesta: c.respuesta })));
          content += `\n\u2705 Mazo creado.`;
        }
      }
    }

    const encoder = new TextEncoder();
    return new Response(new ReadableStream({ start(controller) { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`)); controller.close(); } }), { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) { return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders }); }
});
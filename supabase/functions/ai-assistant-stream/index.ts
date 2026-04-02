import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_EVENT_TYPES = ["P1", "P2", "Global", "Final", "Recuperatorio P1", "Recuperatorio P2", "Recuperatorio Global", "Estudio", "TP", "Entrega", "Clase", "Otro"] as const;
type VET = typeof VALID_EVENT_TYPES[number];

function mapET(t: string): string {
  const n = t.toLowerCase().trim();
  const m: Record<string, string> = {
    "parcial1": "P1", "parcial 1": "P1", "p1": "P1", "primer parcial": "P1",
    "parcial2": "P2", "parcial 2": "P2", "p2": "P2", "segundo parcial": "P2",
    "global": "Global", "final": "Final", "recuperatorio": "Recuperatorio P1",
    "recuperatorio p1": "Recuperatorio P1", "recuperatorio p2": "Recuperatorio P2",
    "recuperatorio global": "Recuperatorio Global",
    "estudio": "Estudio", "estudiar": "Estudio",
    "tp": "TP", "trabajo practico": "TP", "trabajo práctico": "TP",
    "entrega": "Entrega", "entregar": "Entrega",
    "clase": "Clase", "cursada": "Clase", "cursado": "Clase", "otro": "Otro", "evento": "Otro"
  };
  
  if (m[n]) return m[n];
  
  // Soporte para parciales extra (P3, P4, etc.)
  const parcialMatch = n.match(/parcial\s*(\d+)/i) || n.match(/^p(\d+)$/i);
  if (parcialMatch) return `P${parcialMatch[1]}`;
  
  return "Otro";
}

function colorFor(t: string): string {
  const c: Record<string, string> = {
    "P1": "#00d9ff", "P2": "#a855f7", "Global": "#fbbf24", "Final": "#22c55e",
    "Recuperatorio P1": "#ef4444", "Recuperatorio P2": "#ef4444", "Recuperatorio Global": "#ef4444",
    "Estudio": "#6b7280", "TP": "#ec4899", "Entrega": "#f97316", "Clase": "#3b82f6", "Otro": "#8b5cf6"
  };
  
  if (c[t]) return c[t];
  
  // Color por defecto para parciales extra (cyan/azulado)
  if (t.startsWith("P")) return "#00d9ff";
  
  return "#00d9ff";
}

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function fuzzyFind(query: string, subjects: any[]): any | null {
  const q = norm(query);
  if (!q) return null;
  for (const s of subjects) {
    if (norm(s.nombre) === q || norm(s.codigo) === q) return s;
  }
  const qAlt = q.replace(/iii/gi, "3").replace(/ii/gi, "2").replace(/(^|\s)i($|\s)/gi, "$11$2").trim();
  const qAlt2 = q.replace(/3/g, "iii").replace(/2/g, "ii").replace(/1/g, "i");
  for (const s of subjects) {
    const sn = norm(s.nombre);
    if (sn === qAlt || sn === qAlt2) return s;
  }
  for (const s of subjects) {
    const sn = norm(s.nombre);
    if (sn.includes(q) || q.includes(sn)) return s;
    if (sn.includes(qAlt) || qAlt.includes(sn)) return s;
    if (sn.includes(qAlt2) || qAlt2.includes(sn)) return s;
  }
  let best: any = null, bestScore = 0;
  const qWords = q.split(/\s+/).filter(w => w.length > 2);
  for (const s of subjects) {
    const nWords = norm(s.nombre).split(/\s+/);
    let score = 0;
    for (const qw of qWords) {
      for (const nw of nWords) {
        if (nw.includes(qw) || qw.includes(nw)) { score += 3; break; }
      }
    }
    if (score > bestScore) { bestScore = score; best = s; }
  }
  return bestScore >= 3 ? best : null;
}

function trimMessages(msgs: any[], maxMessages: number = 12): any[] {
  if (msgs.length <= maxMessages) return msgs;
  return msgs.slice(-maxMessages);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) throw new Error("Invalid token");

    const userId = user.id;
    const { messages, persona_id, context_page } = await req.json();
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let personaName = "T.A.B.E. IA";
    let personalityPrompt = "Sos un asistente academico motivador y cercano. Usas lenguaje informal argentino.";
    if (persona_id) {
      const { data: p } = await serviceClient.from("ai_personas").select("name, personality_prompt").eq("id", persona_id).eq("user_id", userId).maybeSingle();
      if (p) { personaName = p.name; if (p.personality_prompt) personalityPrompt = p.personality_prompt; }
    }

    let chatMemory = "";
    if (persona_id) {
      const { data: rm } = await serviceClient.from("ai_chat_messages").select("role, content, created_at, session_id!inner(persona_id, user_id)").eq("session_id.persona_id", persona_id).eq("session_id.user_id", userId).order("created_at", { ascending: false }).limit(10);
      if (rm && rm.length > 0) {
        chatMemory = "\nMEMORIA CONVERSACIONES ANTERIORES:\n" + rm.reverse().map((m: { role: string; content: string }) => (m.role === "user" ? "Estudiante" : personaName) + ": " + m.content.slice(0, 150)).join("\n");
      }
    }

    const [sR, ussR, evR, stR, ssR, fdR, prR, allSessionsR, profR, hoursR] = await Promise.all([
      serviceClient.from("subjects").select("id, nombre, codigo, año"),
      serviceClient.from("user_subject_status").select("*").eq("user_id", userId),
      serviceClient.from("calendar_events").select("*").eq("user_id", userId).gte("fecha", new Date().toISOString().split("T")[0]).order("fecha", { ascending: true }).limit(15),
      serviceClient.from("user_stats").select("*").eq("user_id", userId).maybeSingle(),
      serviceClient.from("study_sessions").select("*").eq("user_id", userId).order("fecha", { ascending: false }).limit(5),
      serviceClient.from("flashcard_decks").select("id, nombre, total_cards, subject_id").eq("user_id", userId).limit(10),
      serviceClient.from("profiles").select("nombre, username, email").eq("user_id", userId).maybeSingle(),
      serviceClient.from("study_sessions").select("subject_id, duracion_segundos, fecha, tipo").eq("user_id", userId),
      serviceClient.from("professors").select("*").eq("user_id", userId),
      serviceClient.from("professor_office_hours").select("*").eq("user_id", userId),
    ]);

    const subjects = sR.data || [];
    const uss = ussR.data || [];
    const events = evR.data || [];
    const stats = stR.data;
    const sessions = ssR.data || [];
    const decks = fdR.data || [];
    const profile = prR.data;
    const allSessions = allSessionsR.data || [];
    const professorsData = profR.data || [];
    const officeHoursData = hoursR.data || [];

    const nameById: Record<string, string> = {};
    for (const s of subjects) nameById[s.id] = s.nombre;

    const swStatus = subjects.map((s: any) => {
      const st = uss.find((u: any) => u.subject_id === s.id);
      return {
        ...s,
        estado: st?.estado || "sin_cursar",
        nota: st?.nota || null,
        fecha_aprobacion: st?.fecha_aprobacion || null,
        p1: st?.nota_parcial_1 || st?.nota_rec_parcial_1 || null,
        p2: st?.nota_parcial_2 || st?.nota_rec_parcial_2 || null,
        global: st?.nota_global || st?.nota_rec_global || null,
        final_examen: st?.nota_final_examen || null
      };
    });

    const aprobadas = swStatus.filter((s: any) => s.estado === "aprobada");
    const regulares = swStatus.filter((s: any) => s.estado === "regular");
    const enCurso = swStatus.filter((s: any) => s.estado === "en_curso");
    const sinCursar = swStatus.filter((s: any) => s.estado === "sin_cursar");
    const notas = aprobadas.map((s: any) => parseFloat(s.nota)).filter((n: number) => !isNaN(n) && n > 0);
    const promedio = notas.length > 0 ? (notas.reduce((a: number, b: number) => a + b, 0) / notas.length).toFixed(2) : "N/A";
    const progreso = subjects.length > 0 ? ((aprobadas.length / subjects.length) * 100).toFixed(1) : "0";
    const studyMin = sessions.reduce((a: number, s: any) => a + (s.duracion_segundos || 0), 0) / 60;
    const userName = profile?.nombre || profile?.username || "Estudiante";

    const subjectStudyTime: Record<string, { totalSeconds: number; sessionCount: number; lastStudied: string | null; pomodoroCount: number }> = {};
    for (const session of allSessions) {
      if (!session.subject_id) continue;
      if (!subjectStudyTime[session.subject_id]) {
        subjectStudyTime[session.subject_id] = { totalSeconds: 0, sessionCount: 0, lastStudied: null, pomodoroCount: 0 };
      }
      const entry = subjectStudyTime[session.subject_id];
      entry.totalSeconds += session.duracion_segundos || 0;
      entry.sessionCount += 1;
      if (session.tipo === "pomodoro") entry.pomodoroCount += 1;
      if (!entry.lastStudied || session.fecha > entry.lastStudied) entry.lastStudied = session.fecha;
    }

    let metricasStr = "";
    if (enCurso.length > 0) {
      const metricasLines: string[] = [];
      for (const subj of enCurso) {
        const m = subjectStudyTime[subj.id];
        if (m) {
          const hours = (m.totalSeconds / 3600).toFixed(1);
          const daysSinceStudy = m.lastStudied ? Math.floor((Date.now() - new Date(m.lastStudied).getTime()) / (1000 * 60 * 60 * 24)) : null;
          let line = `- ${subj.nombre}: ${hours}hs, ${m.sessionCount} ses, ${m.pomodoroCount} pom`;
          if (daysSinceStudy !== null) {
            if (daysSinceStudy === 0) line += " | HOY";
            else if (daysSinceStudy === 1) line += " | AYER";
            else line += ` | hace ${daysSinceStudy}d`;
          }
          metricasLines.push(line);
        } else {
          metricasLines.push(`- ${subj.nombre}: 0hs | ⚠️ SIN ESTUDIAR`);
        }
      }
      metricasStr = metricasLines.join("\n");
    }

    const materiasStr = swStatus.map((s: any) => {
      let str = "- " + s.nombre + " (" + s.codigo + "): " + s.estado.toUpperCase();
      if (s.nota) str += " Nota:" + s.nota;
      if (s.final_examen) str += " Final:" + s.final_examen;
      if (s.p1 || s.p2 || s.global) {
        const exams = [];
        if (s.p1) exams.push("P1:" + s.p1);
        if (s.p2) exams.push("P2:" + s.p2);
        if (s.global) exams.push("G:" + s.global);
        str += " [" + exams.join(",") + "]";
      }
      return str;
    }).join("\n");

    const eventosStr = events.length > 0
      ? events.map((e: any) => "- " + e.fecha + (e.hora ? " " + e.hora : "") + ": " + e.titulo + " (" + e.tipo_examen + ") [ID:" + e.id + "]").join("\n")
      : "Sin eventos proximos.";

    const sesionesStr = sessions.length > 0
      ? sessions.map((s: any) => "- " + s.fecha + ": " + Math.round((s.duracion_segundos || 0) / 60) + "min (" + s.tipo + ")" + (s.subject_id && nameById[s.subject_id] ? " - " + nameById[s.subject_id] : "")).join("\n")
      : "Sin sesiones recientes.";

    // Format Professors and Hours for Context
    const profesoresStr = professorsData.length > 0
      ? professorsData.map((p: any) => {
        const hours = officeHoursData.filter((h: { professor_id: string; dia: string; hora_inicio: string; hora_fin: string }) => h.professor_id === p.id);
        const hoursStr = hours.map((h: { dia: string; hora_inicio: string; hora_fin: string }) => `${h.dia} ${h.hora_inicio} a ${h.hora_fin}`).join(", ");
        return `- ${p.nombre} (${p.rol || "Sin rol"}) [ID:${p.id}] Materia: ${nameById[p.subject_id] || "ID:" + p.subject_id} - Consultas: ${hoursStr || "No cargadas"}`;
      }).join("\n")
      : "Sin profesores cargados.";

    const contextLine = context_page ? "\nSECCION ACTUAL: " + context_page : "";

    const metricasSection = metricasStr
      ? "\n=== METRICAS ESTUDIO (EN CURSO) ===\n" + metricasStr + "\n"
      : "";

    // Build date context with day of week and upcoming days reference
    const now = new Date();
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const hoyStr = now.toISOString().split("T")[0];
    const hoyDia = diasSemana[now.getDay()];

    // Generate next 14 days as reference for the AI
    const proximosDias: string[] = [];
    for (let i = 0; i <= 13; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const label = i === 0 ? "HOY" : i === 1 ? "MAÑANA" : "";
      proximosDias.push(`${d.toISOString().split("T")[0]} ${diasSemana[d.getDay()]}${label ? " (" + label + ")" : ""}`);
    }

    const sysPrompt = "Sos " + personaName + ", asistente academico de " + userName + ".\n" +
      "Personalidad: " + personalityPrompt + "\n" +
      "HOY: " + hoyStr + " (" + hoyDia + ")" + contextLine + "\n" +
      "CALENDARIO PROXIMOS DIAS:\n" + proximosDias.join("\n") + "\n\n" +
      "=== RESUMEN ===\n" +
      "Promedio: " + promedio + " | Progreso: " + aprobadas.length + "/" + subjects.length + " (" + progreso + "%)\n" +
      "Aprobadas: " + aprobadas.length + (aprobadas.length > 0 ? " (" + aprobadas.map((s: any) => s.nombre).join(", ") + ")" : "") + "\n" +
      "Regulares: " + regulares.length + (regulares.length > 0 ? " (" + regulares.map((s: any) => s.nombre).join(", ") + ")" : "") + "\n" +
      "En curso: " + enCurso.length + (enCurso.length > 0 ? " (" + enCurso.map((s: any) => s.nombre).join(", ") + ")" : "") + "\n" +
      "Sin cursar: " + sinCursar.length + "\n" +
      "Estudio reciente: " + (studyMin / 60).toFixed(1) + "hs\n" +
      (stats ? "Nivel: " + stats.nivel + " | XP: " + stats.xp_total + "\n" : "") + "\n" +
      "=== MATERIAS ===\n" + materiasStr + "\n\n" +
      metricasSection +
      "=== AGENDA ===\n" + eventosStr + "\n\n" +
      "=== PROFESORES Y CONSULTAS ===\n" + profesoresStr + "\n\n" +
      "=== SESIONES ===\n" + sesionesStr + "\n" +
      chatMemory + "\n\n" +
      "=== INSTRUCCIONES CRITICAS ===\n" +
      "1. Tenes acceso TOTAL a los datos del estudiante. Responde con datos REALES.\n" +
      "2. Nombres abreviados: algebra=Algebra y Geometria Analitica, analisis 1=Analisis Matematico I, etc. Numeros 1,2,3 = I,II,III.\n" +
      "3. ⚠️ REGLA MAS IMPORTANTE - CUANDO USAR HERRAMIENTAS:\n" +
      "   SOLO usa herramientas (function calling) cuando el usuario EXPLICITAMENTE pida una ACCION CONCRETA como:\n" +
      "   - 'agendame...', 'creame un evento...', 'anotame el parcial...' -> create_calendar_events\n" +
      "   - 'creame flashcards de...', 'haceme un mazo de...' -> create_flashcards\n" +
      "   - 'creame un cuestionario...', 'haceme preguntas de...' -> create_quiz\n" +
      "   - 'marcame X como aprobada...', 'cambiame el estado de...' -> update_subject_status\n" +
      "   - 'creame un documento/apunte sobre...' -> create_notion_document\n" +
      "   - 'eliminame el evento...' -> delete_calendar_event\n" +
      "   - 'añadí al profesor...', 'borrá al profesor...', 'cambiá el rol del profe...' -> manage_professors\n" +
      "   - 'agendame la consulta...', 'el profe atiende tal día...', 'eliminá el horario del martes...' -> manage_consultations\n" +
      "   NUNCA uses herramientas para:\n" +
      "   - Saludos: 'hola', 'como estas', 'buenas' -> RESPONDE CON TEXTO\n" +
      "   - Preguntas sobre vos: 'como eres', 'quien sos', 'presentate', 'dime de ti' -> RESPONDE CON TEXTO describiendo tu personalidad\n" +
      "   - Preguntas academicas: 'explicame...', 'que es...', 'como funciona...' -> RESPONDE CON TEXTO\n" +
      "   - Consultas sobre datos: 'como voy', 'cuantas aprobe', 'mi promedio' -> RESPONDE CON TEXTO usando los datos de arriba\n" +
      "   - Charla casual, motivacion, o cualquier conversacion -> RESPONDE CON TEXTO\n" +
      "   EN CASO DE DUDA: SIEMPRE RESPONDE CON TEXTO PLANO, NO USES HERRAMIENTAS.\n" +
      "4. PODES inventar ejercicios y simulacros de examenes si te lo piden.\n" +
      "5. Para fechas relativas calcula la fecha YYYY-MM-DD exacta desde la fecha actual.\n" +
      "6. Responde en Español Argentino.\n" +
      "7. Solo analiza metricas de materias EN CURSO, no aprobadas/regulares.\n" +
      "8. Para multiples eventos usa create_calendar_events con array completo.\n" +
      "9. Para flashcards/cuestionarios masivos, crea TODAS las que te manden sin limite.\n" +
      "10. GESTION DE PROFESORES: Si el usuario menciona un nombre y una materia, buscá siempre el ID de la materia y usá manage_professors.\n" +
      "11. GESTION DE CONSULTAS: Un profesor puede tener múltiples horarios. Usá manege_consultations para añadir, actualizar o eliminar horarios específicos (lunes, martes, etc.).";

    const tools = [
      {
        type: "function",
        function: {
          name: "create_calendar_events",
          description: "SOLO usar cuando el usuario PIDE EXPRESAMENTE agendar uno o mas eventos. NO usar para saludos ni preguntas.",
          parameters: {
            type: "object",
            properties: {
              eventos: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    titulo: { type: "string" },
                    fecha: { type: "string", description: "YYYY-MM-DD" },
                    hora: { type: "string", description: "HH:mm" },
                    hora_fin: { type: "string", description: "HH:mm" },
                    tipo_examen: { type: "string", description: "P1, P2, P3, Global, Final, TP, Clase, etc." },
                    notas: { type: "string" },
                    subject_id: { type: "string", description: "Nombre de la materia" },
                    recurrence_rule: {
                      type: "string",
                      description: "SOLO si el usuario pide repetir. Valores: DAILY, WEEKLY, MONTHLY, YEARLY. NO incluir si no hay repeticion.",
                      enum: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]
                    },
                    recurrence_end: { type: "string", description: "Fecha fin repeticion YYYY-MM-DD. NO incluir si no hay repeticion." }
                  },
                  required: ["titulo", "fecha", "tipo_examen"]
                }
              }
            },
            required: ["eventos"]
          }
        }
      },
      { type: "function", function: { name: "delete_calendar_event", description: "SOLO usar cuando el usuario PIDE EXPRESAMENTE eliminar un evento.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },
      { type: "function", function: { name: "update_calendar_event", description: "SOLO usar cuando el usuario PIDE EXPRESAMENTE modificar un evento.", parameters: { type: "object", properties: { id: { type: "string" }, titulo: { type: "string" }, fecha: { type: "string" }, hora: { type: "string" }, tipo_examen: { type: "string" }, notas: { type: "string" } }, required: ["id"] } } },
      { type: "function", function: { name: "create_flashcards", description: "SOLO usar cuando el usuario PIDE EXPRESAMENTE crear flashcards.", parameters: { type: "object", properties: { deck_name: { type: "string" }, subject_id: { type: "string", description: "Nombre materia" }, cards: { type: "array", items: { type: "object", properties: { pregunta: { type: "string" }, respuesta: { type: "string" } }, required: ["pregunta", "respuesta"] } } }, required: ["deck_name", "cards"] } } },
      { type: "function", function: { name: "update_subject_status", description: "SOLO usar cuando el usuario PIDE EXPRESAMENTE cambiar estado de una materia.", parameters: { type: "object", properties: { subject_id: { type: "string", description: "Nombre materia" }, estado: { type: "string", enum: ["sin_cursar", "en_curso", "regular", "aprobada", "libre"] }, nota: { type: "number" } }, required: ["subject_id", "estado"] } } },
      { type: "function", function: { name: "create_notion_document", description: "SOLO usar cuando el usuario PIDE EXPRESAMENTE crear un documento o apunte con palabras como 'creame un doc', 'haceme un apunte'. NUNCA usar para responder preguntas, saludos, ni conversacion.", parameters: { type: "object", properties: { titulo: { type: "string" }, contenido: { type: "string" }, subject_id: { type: "string" } }, required: ["titulo"] } } },
      { type: "function", function: { name: "search_library", description: "Busca archivos en la biblioteca.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
      { type: "function", function: { name: "create_quiz", description: "SOLO usar cuando el usuario PIDE EXPRESAMENTE crear un cuestionario.", parameters: { type: "object", properties: { quiz_name: { type: "string" }, subject_id: { type: "string", description: "Nombre materia" }, questions: { type: "array", items: { type: "object", properties: { pregunta: { type: "string" }, opciones: { type: "array", items: { type: "string" }, description: "5 opciones" }, correcta: { type: "integer", description: "Indice 0-4" }, explicacion: { type: "string" } }, required: ["pregunta", "opciones", "correcta"] } } }, required: ["quiz_name", "questions"] } } },
      {
        type: "function",
        function: {
          name: "manage_professors",
          description: "Gestiona la lista de profesores de una materia. Permite añadir, actualizar o eliminar profesores.",
          parameters: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["create", "update", "delete"] },
              id: { type: "string", description: "ID del profesor (necesario para update/delete)" },
              nombre: { type: "string" },
              rol: { type: "string", enum: ["teoria", "practica"] },
              descripcion: { type: "string" },
              subject_id: { type: "string", description: "Nombre o ID de la materia" },
              color_index: { type: "integer", description: "Índice de color (0-10)" }
            },
            required: ["action"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "manage_consultations",
          description: "Gestiona los horarios de consulta de un profesor. Permite añadir, actualizar o eliminar horarios por día.",
          parameters: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["create", "update", "delete"] },
              id: { type: "string", description: "ID del horario de consulta (opcional para create)" },
              professor_id: { type: "string", description: "Nombre o ID del profesor" },
              dia: { type: "string", enum: ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"] },
              hora_inicio: { type: "string", description: "Formato HH:mm:ss" },
              hora_fin: { type: "string", description: "Formato HH:mm:ss" }
            },
            required: ["action", "professor_id"]
          }
        }
      }
    ];

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    // LIMIT messages to last 8 to prevent 413 errors and reduce token usage
    const trimmedMessages = trimMessages(messages, 8);
    const groqMessages = [
      ...trimmedMessages.map((m: any) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content.slice(0, 4000) : String(m.content).slice(0, 4000)
      }))
    ];

    // Optimized RAG: if user message is already very long, skip RAG to avoid tokens issues
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
    let ragContext = "";

    if (lastUserMsg && lastUserMsg.length < 4000) {
      const detectedSubject = fuzzyFind(lastUserMsg, subjects);
      if (detectedSubject) {
        console.log(`[RAG] Tema detectado: ${detectedSubject.nombre}. Buscando apuntes...`);

        const { data: notionDocs } = await serviceClient
          .from("notion_documents")
          .select("titulo, contenido")
          .eq("user_id", userId)
          .eq("subject_id", detectedSubject.id)
          .order("updated_at", { ascending: false })
          .limit(2);

        const { data: subjectDecks } = await serviceClient
          .from("flashcard_decks")
          .select("id, nombre")
          .eq("user_id", userId)
          .eq("subject_id", detectedSubject.id)
          .limit(2);

        let notionText = "";
        if (notionDocs && notionDocs.length > 0) {
          notionText = notionDocs.map((doc: any) => {
            let parsedContent = "";
            try {
              const contentArr = typeof doc.contenido === 'string' ? JSON.parse(doc.contenido) : doc.contenido;
              if (Array.isArray(contentArr)) {
                const extractText = (nodes: any[]): string => {
                  let text = "";
                  for (const node of nodes) {
                    if (node.type === "text" && node.text) text += node.text;
                    else if (node.content) text += extractText(node.content) + " ";
                    if (node.type === "paragraph" || node.type === "heading") text += "\n";
                  }
                  return text;
                };
                parsedContent = extractText(contentArr).trim();
              } else {
                parsedContent = String(doc.contenido);
              }
            } catch (e) {
              parsedContent = "Error parseando documento.";
            }
            return `Doc: ${doc.titulo}\n${parsedContent.slice(0, 2000)}`;
          }).join("\n\n");
        }

        let flashcardsText = "";
        if (subjectDecks && subjectDecks.length > 0) {
          const deckIds = subjectDecks.map((d: any) => d.id);
          const { data: cards } = await serviceClient
            .from("flashcards")
            .select("pregunta, respuesta")
            .in("deck_id", deckIds)
            .limit(15);

          if (cards && cards.length > 0) {
            flashcardsText = cards.map((c: any) => `Q: ${c.pregunta} | A: ${c.respuesta}`).join("\n");
          }
        }

        if (notionText || flashcardsText) {
          ragContext = `\n\n=== APUNTES: ${detectedSubject.nombre.toUpperCase()} ===\n`;
          if (notionText) ragContext += `${notionText}\n\n`;
          if (flashcardsText) ragContext += `[FLASHCARDS]\n${flashcardsText}\n`;
        }
      }
    }

    const finalSysPrompt = sysPrompt + ragContext + "\n\n10. ⚠️ REGLA DE CREACION MASIVA: Si el usuario te manda una lista de mas de 15 tarjetas o preguntas, empeza tu respuesta DIRECTAMENTE con la herramienta, sin saludos ni introducciones. Esto evita errores de parsing.";

    // Safety: truncate system prompt if too large (max ~8000 chars)
    const maxSysLength = 8000;
    const truncatedSysPrompt = finalSysPrompt.length > maxSysLength
      ? finalSysPrompt.slice(0, maxSysLength) + "\n[System prompt truncado]"
      : finalSysPrompt;

    groqMessages.unshift({ role: "system", content: truncatedSysPrompt });

    // Stream from Groq
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        tools: tools,
        tool_choice: "auto",
        temperature: 0.5,
        max_tokens: 2048,
        stream: true
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      throw new Error(`Groq API Error: ${groqRes.status} - ${err}`);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const body = new ReadableStream({
      async start(ctrl) {
        const reader = groqRes.body?.getReader();
        if (!reader) {
          ctrl.close();
          return;
        }

        let fullContent = "";
        let toolCallId = "";
        let toolCallName = "";
        let toolCallArgs = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                const delta = data.choices[0].delta;

                if (delta.content) {
                  fullContent += delta.content;
                  ctrl.enqueue(encoder.encode("data: " + JSON.stringify(data) + "\n\n"));
                }

                if (delta.tool_calls && delta.tool_calls[0]) {
                  const tc = delta.tool_calls[0];
                  if (tc.id) toolCallId = tc.id;
                  if (tc.function?.name) toolCallName = tc.function.name;
                  if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
                }
              } catch (e) {
                // Ignore parse errors from partial chunks
              }
            }
          }
        }

        // Handle tool call if present
        if (toolCallName && toolCallArgs) {
          try {
            const args = JSON.parse(toolCallArgs);
            console.log(`[Tool] Executing ${toolCallName}`, args);

            let toolResult = "";
            const resolveId = (raw: string | null | undefined): string | null => {
              if (!raw) return null;
              if (subjects.find((s: any) => s.id === raw)) return raw;
              const found = fuzzyFind(raw, subjects);
              return found ? found.id : null;
            };

            if (toolCallName === "create_calendar_events") {
              const agendados = [];
              if (args.eventos && Array.isArray(args.eventos)) {
                for (const evt of args.eventos) {
                  const tipo = mapET(evt.tipo_examen || "Otro");
                  const sid = resolveId(evt.subject_id);
                  const { data, error } = await serviceClient.from("calendar_events").insert({
                    user_id: userId, titulo: evt.titulo, fecha: evt.fecha, hora: evt.hora || null,
                    hora_fin: evt.hora_fin || null, tipo_examen: tipo, color: colorFor(tipo),
                    notas: evt.notas || null, subject_id: sid, recurrence_rule: evt.recurrence_rule || null,
                    recurrence_end: evt.recurrence_end || null
                  }).select().single();
                  if (!error && data) agendados.push(data);
                }
              }
              toolResult = `\nAgendé ${agendados.length} evento(s).`;
            }
            else if (toolCallName === "create_flashcards") {
              const sid = resolveId(args.subject_id || args.deck_name);
              const cardsToCreate = args.cards || [];
              const { data: deck } = await serviceClient.from("flashcard_decks").insert({
                user_id: userId, nombre: args.deck_name, total_cards: cardsToCreate.length, subject_id: sid
              }).select().single();
              if (deck && cardsToCreate.length > 0) {
                const batchSize = 50;
                let inserted = 0;
                for (let i = 0; i < cardsToCreate.length; i += batchSize) {
                  const { error: batchError } = await serviceClient.from("flashcards").insert(
                    cardsToCreate.slice(i, i + batchSize).map((c: any) => ({ deck_id: deck.id, user_id: userId, pregunta: c.pregunta, respuesta: c.respuesta }))
                  );
                  if (!batchError) inserted += Math.min(batchSize, cardsToCreate.length - i);
                }
                toolResult = `\nMazo "${deck.nombre}" creado con ${inserted} cartas.`;
              }
            }
            else if (toolCallName === "update_subject_status") {
              const rid = resolveId(args.subject_id);
              if (rid) {
                const up: any = { user_id: userId, subject_id: rid, estado: args.estado };
                if (args.nota) up.nota = args.nota;
                await serviceClient.from("user_subject_status").upsert(up, { onConflict: "user_id,subject_id" });
                toolResult = `\nEstatus de ${args.subject_id} actualizado.`;
              }
            }
            else if (toolCallName === "create_quiz") {
              const sid = resolveId(args.subject_id || args.quiz_name);
              const questionsToCreate = args.questions || [];
              const { data: quizDeck } = await serviceClient.from("quiz_decks").insert({
                user_id: userId, nombre: args.quiz_name, total_questions: questionsToCreate.length, subject_id: sid
              }).select().single();
              if (quizDeck && questionsToCreate.length > 0) {
                for (const q of questionsToCreate) {
                  const { data: question } = await serviceClient.from("quiz_questions").insert({
                    deck_id: quizDeck.id, user_id: userId, pregunta: q.pregunta, explicacion: q.explicacion || null
                  }).select().single();
                  if (question && q.opciones) {
                    const opts = q.opciones.map((o: string, i: number) => ({
                      question_id: question.id, texto: o, es_correcta: i === (q.correcta || 0)
                    }));
                    await serviceClient.from("quiz_options").insert(opts);
                  }
                }
                toolResult = `\nCuestionario "${quizDeck.nombre}" creado con ${questionsToCreate.length} preguntas.`;
              }
            }
            else if (toolCallName === "manage_professors") {
              const sid = resolveId(args.subject_id);
              if (args.action === "create" && sid) {
                const { data } = await serviceClient.from("professors").insert({
                  user_id: userId, nombre: args.nombre, rol: args.rol || null,
                  descripcion: args.descripcion || null, subject_id: sid, color_index: args.color_index || 0
                }).select().single();
                toolResult = `\nProfesor ${args.nombre} añadido correctamente.`;
              } else if (args.action === "update" && args.id) {
                await serviceClient.from("professors").update({
                  nombre: args.nombre, rol: args.rol, descripcion: args.descripcion,
                  color_index: args.color_index
                }).eq("id", args.id).eq("user_id", userId);
                toolResult = `\nDatos del profesor actualizados.`;
              } else if (args.action === "delete" && args.id) {
                await serviceClient.from("professors").delete().eq("id", args.id).eq("user_id", userId);
                toolResult = `\nProfesor eliminado.`;
              }
            }
            else if (toolCallName === "manage_consultations") {
              let pid = args.professor_id;
              if (pid && !pid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                const fuzzyProf = professorsData.find((p: any) => norm(p.nombre).includes(norm(pid)));
                pid = fuzzyProf ? fuzzyProf.id : null;
              }
              if (pid) {
                if (args.action === "create") {
                  await serviceClient.from("professor_office_hours").insert({
                    user_id: userId, professor_id: pid, dia: args.dia,
                    hora_inicio: args.hora_inicio, hora_fin: args.hora_fin
                  });
                  toolResult = `\nNuevo horario de consulta añadido para el profesor.`;
                } else if (args.action === "update" && args.id) {
                  await serviceClient.from("professor_office_hours").update({
                    dia: args.dia, hora_inicio: args.hora_inicio, hora_fin: args.hora_fin
                  }).eq("id", args.id).eq("user_id", userId);
                  toolResult = `\nHorario de consulta actualizado.`;
                } else if (args.action === "delete" && (args.id || args.dia)) {
                  const query = serviceClient.from("professor_office_hours").delete().eq("professor_id", pid).eq("user_id", userId);
                  if (args.id) query.eq("id", args.id);
                  else query.eq("dia", args.dia);
                  await query;
                  toolResult = `\nHorario de consulta eliminado.`;
                }
              } else {
                toolResult = `\nNo pude encontrar al profesor "${args.professor_id}".`;
              }
            }

            if (toolResult) {
              ctrl.enqueue(encoder.encode("data: " + JSON.stringify({ choices: [{ delta: { content: toolResult } }] }) + "\n\n"));
            }
          } catch (e) {
            console.error("[Tool Error]", e);
          }
        }

        ctrl.enqueue(encoder.encode("data: [DONE]\n\n"));
        ctrl.close();
      }
    });

    return new Response(body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e: any) {
    console.error("Global AI Error:", e.message || e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
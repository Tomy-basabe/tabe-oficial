import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Security: Restrict CORS to known origins
const ALLOWED_ORIGINS = [
  "https://www.tabe.software",
  "https://tabe.software",
  "https://tabe-oficial.vercel.app",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "X-Content-Type-Options": "nosniff",
  };
}

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

let groqModelsCache: { models: string[]; expiresAt: number } | null = null;
const GROQ_MODELS_CACHE_TTL = 10 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Extracción instantánea de userId desde el JWT en 0ms (evita roundtrip HTTPS a GoTrue auth)
    let userId: string | null = null;
    try {
      const token = authHeader.replace("Bearer ", "").trim();
      const parts = token.split(".");
      if (parts.length === 3) {
        const payloadStr = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(payloadStr);
        if (payload.sub && payload.role === "authenticated") {
          userId = payload.sub;
        }
      }
    } catch (_) {}

    if (!userId) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await authClient.auth.getUser().catch(() => ({ data: { user: null } }));
      userId = user?.id || null;
    }

    const reqBody = await req.json();

    // ── ACCIÓN TRANSCRIPCIÓN DE AUDIO (Groq Whisper) ──
    if (reqBody.action === "transcribe") {
      const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
      if (!GROQ_API_KEY) {
        return new Response(JSON.stringify({ error: "GROQ_API_KEY no configurada" }), {
          status: 500,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
        });
      }
      const audioBase64 = reqBody.audio_base64;
      const mimeType = reqBody.mime_type || "audio/ogg";
      if (!audioBase64) {
        return new Response(JSON.stringify({ error: "Falta audio_base64" }), {
          status: 400,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
        });
      }

      try {
        const cleanBase64 = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64;
        const binaryStr = atob(cleanBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const formData = new FormData();
        const ext = mimeType.includes("mp4") || mimeType.includes("m4a") ? "audio.m4a" : (mimeType.includes("mp3") ? "audio.mp3" : "audio.ogg");
        formData.append("file", new Blob([bytes], { type: mimeType }), ext);
        formData.append("model", "whisper-large-v3-turbo");
        formData.append("language", "es");
        formData.append("response_format", "json");

        const whisperRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${GROQ_API_KEY}` },
          body: formData
        });

        if (whisperRes.ok) {
          const data = await whisperRes.json();
          return new Response(JSON.stringify({ text: data.text || "" }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
          });
        } else {
          const err = await whisperRes.text();
          console.warn("[Whisper error]:", err);
          return new Response(JSON.stringify({ error: err }), {
            status: 500,
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
          });
        }
      } catch (transcribeErr: any) {
        console.error("[Transcribe exception]:", transcribeErr);
        return new Response(JSON.stringify({ error: transcribeErr.message }), {
          status: 500,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
        });
      }
    }

    const {
      messages,
      persona_id,
      context_page,
      requested_model_id,
      requested_provider,
      power_level = "medio",
      system_prompt: clientSystemPrompt,
      image, // { data: string, mime_type: string }
    } = reqBody;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Detección temprana de necesidad de herramientas para optimizar consultas
    const lastUserMsg = [...(messages || [])].reverse().find((m: any) => m.role === "user")?.content || "";
    const actionRegex = /\b(agend|crea|crear|haceme|armame|agrega|agregale|elimina|eliminame|borra|borrame|modifica|modificame|cambia|anota|anotame|guarda|actualiza|flashcard|quiz|cuestionario|simulacro|mazo|parcial|examen|profesor|profe|rutina|apunte|notion|materia.*aprobada)\b/i;
    const shouldPassTools = actionRegex.test(typeof lastUserMsg === "string" ? lastUserMsg : "");

    let personaName = "T.A.B.E. IA";
    let personalityPrompt = "Sos un asistente academico motivador y cercano. Usas lenguaje informal argentino.";

    let subjects: any[] = [];
    if (!clientSystemPrompt || shouldPassTools) {
      if (userId) {
        const userSubR = await serviceClient
          .from("subjects")
          .select("id, nombre, codigo, año, numero_materia")
          .eq("user_id", userId)
          .order("año", { ascending: true })
          .order("numero_materia", { ascending: true });

        if (userSubR.data && userSubR.data.length > 0) {
          subjects = userSubR.data;
        } else {
          const globalSubR = await serviceClient
            .from("subjects")
            .select("id, nombre, codigo, año, numero_materia")
            .is("user_id", null)
            .order("año", { ascending: true })
            .order("numero_materia", { ascending: true });
          subjects = globalSubR.data || [];
        }
      } else {
        const defaultSubR = await serviceClient
          .from("subjects")
          .select("id, nombre, codigo, año, numero_materia")
          .limit(60);
        subjects = defaultSubR.data || [];
      }
    }

    let sysPrompt = "";

    // Si el cliente ya construyó y envió el contexto completo del estudiante (100% de los datos),
    // no ejecutamos las 15 consultas a la base de datos en el servidor, ahorrando entre 1.5 y 2.5 segundos de latencia.
    if (!clientSystemPrompt) {
      let uss: any[] = [];
      let events: any[] = [];
      let stats: any = null;
      let sessions: any[] = [];
      let decks: any[] = [];
      let profile: any = null;
      let allSessions: any[] = [];
      let professorsData: any[] = [];
      let officeHoursData: any[] = [];
      let routines: any[] = [];
      let documents: any[] = [];
      let files: any[] = [];
      let quizzes: any[] = [];
      let friendships: any[] = [];
      let achievements: any[] = [];
      let chatMemory = "";

      if (userId) {
      if (persona_id) {
        const { data: p } = await serviceClient.from("ai_personas").select("name, personality_prompt").eq("id", persona_id).eq("user_id", userId).maybeSingle();
        if (p) { personaName = p.name; if (p.personality_prompt) personalityPrompt = p.personality_prompt; }

        const { data: rm } = await serviceClient.from("ai_chat_messages").select("role, content, created_at, session_id!inner(persona_id, user_id)").eq("session_id.persona_id", persona_id).eq("session_id.user_id", userId).order("created_at", { ascending: false }).limit(4);
        if (rm && rm.length > 0) {
          chatMemory = "\nMEMORIA CONVERSACIONES ANTERIORES:\n" + rm.reverse().map((m: { role: string; content: string }) => (m.role === "user" ? "Estudiante" : personaName) + ": " + m.content.slice(0, 100)).join("\n");
        }
      }

      const [ussR, evR, stR, ssR, fdR, prR, allSessionsR, profR, hoursR, routinesR, docsR, filesR, quizzesR, friendshipsR, achievementsR] = await Promise.all([
        serviceClient.from("user_subject_status").select("*").eq("user_id", userId),
        serviceClient.from("calendar_events").select("*").eq("user_id", userId).order("fecha", { ascending: true }).limit(100),
        serviceClient.from("user_stats").select("*").eq("user_id", userId).maybeSingle(),
        serviceClient.from("study_sessions").select("*").eq("user_id", userId).order("fecha", { ascending: false }).limit(20),
        serviceClient.from("flashcard_decks").select("id, nombre, total_cards, subject_id").eq("user_id", userId).limit(100),
        serviceClient.from("profiles").select("nombre, username, email, carrera, facultad, plan, plan_type").eq("user_id", userId).maybeSingle(),
        serviceClient.from("study_sessions").select("subject_id, duracion_segundos, fecha, tipo").eq("user_id", userId),
        serviceClient.from("professors").select("*").eq("user_id", userId),
        serviceClient.from("professor_office_hours").select("*").eq("user_id", userId),
        serviceClient.from("routines").select("id, name, description, category, start_time, end_time, days_of_week, start_date, end_date, is_active, subject_id").eq("user_id", userId).eq("is_active", true).limit(50),
        serviceClient.from("notion_documents").select("id, titulo, subject_id, parent_id, is_favorite, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(100),
        serviceClient.from("library_files").select("id, nombre, tipo, subject_id, folder_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
        serviceClient.from("quiz_decks").select("id, nombre, subject_id, total_questions, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
        serviceClient.from("friendships").select("requester_id, addressee_id, status, created_at").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).limit(50),
        serviceClient.from("user_achievements").select("achievement_id, unlocked_at, achievements(nombre, descripcion, xp_reward)").eq("user_id", userId).limit(100),
      ]);

      uss = ussR.data || [];
      events = evR.data || [];
      stats = stR.data;
      sessions = ssR.data || [];
      decks = fdR.data || [];
      profile = prR.data;
      allSessions = allSessionsR.data || [];
      professorsData = profR.data || [];
      officeHoursData = hoursR.data || [];
      routines = routinesR.data || [];
      documents = docsR.data || [];
      files = filesR.data || [];
      quizzes = quizzesR.data || [];
      friendships = friendshipsR.data || [];
      achievements = achievementsR.data || [];
    }



    // Ensure any subjects present in uss are included even if not in initial query
    const knownSubjectIds = new Set(subjects.map((s: any) => s.id));
    const missingSubjectIds = uss
      .map((u: any) => u.subject_id)
      .filter((id: string) => id && !knownSubjectIds.has(id));

    if (missingSubjectIds.length > 0) {
      const { data: missingSubs } = await serviceClient
        .from("subjects")
        .select("id, nombre, codigo, año, numero_materia")
        .in("id", missingSubjectIds);
      if (missingSubs && missingSubs.length > 0) {
        subjects = [...subjects, ...missingSubs];
      }
    }

    const nameById: Record<string, string> = {};
    for (const s of subjects) nameById[s.id] = s.nombre;

    const getEffectiveGrade = (st: any): number | null => {
      if (!st) return null;
      const candidates = [st.nota, st.nota_final_examen, st.nota_global, st.nota_rec_global];
      for (const val of candidates) {
        if (val !== null && val !== undefined && val !== "") {
          const num = typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
          if (!isNaN(num) && num > 0) return num;
        }
      }
      return null;
    };

    const swStatus = subjects.map((s: any) => {
      const st = uss.find((u: any) => u.subject_id === s.id);
      const grade = getEffectiveGrade(st);
      return {
        ...s,
        estado: (st?.estado || "sin_cursar").toLowerCase().trim(),
        nota: grade,
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

    const notasAprobadasDetalle: { nombre: string; nota: number }[] = [];
    for (const s of aprobadas) {
      if (s.nota !== null && !isNaN(s.nota) && s.nota > 0) {
        notasAprobadasDetalle.push({ nombre: s.nombre, nota: s.nota });
      }
    }

    const promedioNum = notasAprobadasDetalle.length > 0
      ? (notasAprobadasDetalle.reduce((a: number, b: number) => a + b.nota, 0) / notasAprobadasDetalle.length)
      : null;
    const promedio = promedioNum !== null ? promedioNum.toFixed(2) : "N/A";
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

    const recursosStr = [
      `Rutinas activas: ${routines.length > 0 ? routines.map((r: any) => `${r.name} (${r.days_of_week?.join?.(", ") || "sin días"} ${r.start_time || ""}-${r.end_time || ""})`).join("; ") : "ninguna"}`,
      `Apuntes: ${documents.length > 0 ? documents.map((d: any) => `${d.titulo} [ID:${d.id}]`).join("; ") : "ninguno"}`,
      `Archivos de biblioteca: ${files.length > 0 ? files.map((f: any) => `${f.nombre} (${f.tipo}) [ID:${f.id}]`).join("; ") : "ninguno"}`,
      `Cuestionarios: ${quizzes.length > 0 ? quizzes.map((q: any) => `${q.nombre} (${q.total_questions || 0} preguntas) [ID:${q.id}]`).join("; ") : "ninguno"}`,
      `Amistades: ${friendships.length} registros (${friendships.filter((f: any) => f.status === "accepted").length} aceptadas)`,
      `Logros desbloqueados: ${achievements.length > 0 ? achievements.map((a: any) => a.achievements?.nombre || a.achievement_id).join("; ") : "ninguno"}`,
    ].join("\n");

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
      "CARRERA: " + (profile?.carrera || "No especificada") + " | FACULTAD: " + (profile?.facultad || "No especificada") + " | PLAN: " + (profile?.plan || "No especificado") + "\n" +
      "CALENDARIO PROXIMOS DIAS:\n" + proximosDias.join("\n") + "\n\n" +
      "=== RESUMEN ACADEMICO ===\n" +
      "Promedio General: " + promedio + " (" + notasAprobadasDetalle.length + " materias con nota computadas)\n" +
      "Detalle de materias aprobadas y notas: " + (notasAprobadasDetalle.length > 0 ? notasAprobadasDetalle.map((n: any) => n.nombre + ": " + n.nota.toFixed(2)).join(", ") : "Ninguna nota registrada") + "\n" +
      "Progreso: " + aprobadas.length + "/" + subjects.length + " (" + progreso + "%)\n" +
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
      "=== RECURSOS DEL ESTUDIANTE ===\n" + recursosStr + "\n\n" +
      "=== SESIONES ===\n" + sesionesStr + "\n" +
      chatMemory + "\n\n" +
      "=== INSTRUCCIONES CRITICAS ===\n" +
      "1. Tenes acceso TOTAL a los datos del estudiante. Responde con datos REALES.\n" +
      "2. Nombres abreviados: algebra=Algebra y Geometria Analitica, analisis 1=Analisis Matematico I, etc. Numeros 1,2,3 = I,II,III.\n" +
      "3. ⚠️ REGLA MAS IMPORTANTE - CUANDO USAR HERRAMIENTAS:\n" +
      "   SOLO usa herramientas (function calling) cuando el usuario EXPLICITAMENTE pida una ACCION CONCRETA como:\n" +
      "   - 'agendame...', 'creame un evento...', 'anotame el parcial...' -> create_calendar_events\n" +
      "   - 'creame flashcards de...', 'haceme un mazo de...' -> create_flashcards o manage_flashcards\n" +
      "   - 'agregale cartas a...', 'modificame la flashcard...', 'borrá la carta...' -> manage_flashcards\n" +
      "   - 'creame un cuestionario...', 'haceme preguntas de...' -> create_quiz o manage_quizzes\n" +
      "   - 'agregale preguntas a...', 'modificá la pregunta...', 'borrá el cuestionario...' -> manage_quizzes\n" +
      "   - 'marcame X como aprobada...', 'cambiame el estado de...' -> update_subject_status\n" +
      "   - 'creame un documento/apunte sobre...' -> create_notion_document\n" +
      "   - 'eliminame el evento...' -> delete_calendar_event\n" +
      "   - 'añadí al profesor...', 'borrá al profesor...', 'cambiá el rol del profe...' -> manage_professors\n" +
      "   - 'agendame la consulta...', 'el profe atiende tal día...', 'eliminá el horario del martes...' -> manage_consultations\n" +
      "   - 'creame una rutina...', 'pausá/eliminá mi rutina...' -> manage_routines\n" +
      "   NUNCA uses herramientas para:\n" +
      "   - Saludos: 'hola', 'como estas', 'buenas' -> RESPONDE CON TEXTO\n" +
      "   - Preguntas sobre vos: 'como eres', 'quien sos', 'presentate', 'dime de ti' -> RESPONDE CON TEXTO describiendo tu personalidad\n" +
      "   - Preguntas academicas: 'explicame...', 'que es...', 'como funciona...' -> RESPONDE CON TEXTO\n" +
      "   - Consultas sobre datos o rendimiento ('como voy', 'cuantas aprobe', 'mi promedio', 'mis notas'): RESPONDE CON TEXTO usando los datos de arriba. Si te preguntan 'cual es mi promedio', 'como es mi promedio', dale directamente su promedio general exacto (" + promedio + ") y si te pide el detalle, mencionales las materias aprobadas con sus notas.\n" +
      "   - Charla casual, motivacion, o cualquier conversacion -> RESPONDE CON TEXTO\n" +
      "   EN CASO DE DUDA: SIEMPRE RESPONDE CON TEXTO PLANO, NO USES HERRAMIENTAS.\n" +
      "4. PODES inventar ejercicios y simulacros de examenes si te lo piden.\n" +
      "5. Para fechas relativas calcula la fecha YYYY-MM-DD exacta desde la fecha actual.\n" +
      "6. Responde en Español Argentino.\n" +
      "7. Solo analiza metricas de materias EN CURSO, no aprobadas/regulares.\n" +
      "8. Para multiples eventos usa create_calendar_events con array completo.\n" +
      "9. GESTIÓN ILIMITADA Y EXACTA DE FLASHCARDS Y CUESTIONARIOS:\n" +
      "   - CUMPLIMIENTO ESTRICTO DE CANTIDAD SOLICITADA: Si el estudiante te pide una cantidad específica de flashcards o preguntas de cuestionario (ej: 'haceme 10 flashcards', 'creame 20 flashcards de este PDF', 'haceme 15 preguntas de quiz de esta imagen', 'creame 30 preguntas de este texto'), DEBES GENERAR EXACTAMENTE ESA CANTIDAD en el llamado a la herramienta ('cards' o 'questions'). Analizá todo el contenido adjunto (PDF, imagen o texto) minuciosamente para extraer cada tema hasta alcanzar la cantidad exacta pedida. NUNCA resumas ni recortes a menos cartas o preguntas de las solicitadas.\n" +
      "   - Si el estudiante no especifica cantidad pero adjunta un material o tema extenso, generá al menos 10 a 15 flashcards o 10 preguntas de quiz para asegurar una cobertura completa y profunda.\n" +
      "   - ACCIÓN DIRECTA OBLIGATORIA: Cuando el usuario pide crear flashcards o cuestionarios a partir de un PDF, imagen o texto, LLAMÁ SIEMPRE a 'create_flashcards' o 'create_quiz'. NUNCA respondas sólo texto explicando lo que harías ni las dejes en un mensaje de texto sin llamar a la herramienta; deben crearse directamente en la base de datos para que el usuario las tenga en su mazo.\n" +
      "   - Si pide una cantidad masiva como 50 o 100 cartas, creá el primer lote completo en el llamado de la herramienta y explícale con entusiasmo que ya se guardaron.\n" +
      "   - Para modificar cartas existentes o agregar a un mazo existente, usá 'manage_flashcards'. Para modificar preguntas o agregar a un cuestionario existente, usá 'manage_quizzes'.\n" +
      "10. GESTION DE PROFESORES: Si el usuario menciona un nombre y una materia, buscá siempre el ID de la materia y usá manage_professors.\n" +
      "11. GESTION DE CONSULTAS: Un profesor puede tener múltiples horarios. Usá manege_consultations para añadir, actualizar o eliminar horarios específicos (lunes, martes, etc.).";
    }

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
      {
        type: "function",
        function: {
          name: "create_flashcards",
          description: "SOLO usar cuando el usuario PIDE EXPRESAMENTE crear flashcards. Debe generar la cantidad exacta de tarjetas pedidas por el usuario.",
          parameters: {
            type: "object",
            properties: {
              deck_name: { type: "string" },
              subject_id: { type: "string", description: "Nombre materia" },
              cards: {
                type: "array",
                description: "Array con la cantidad exacta de cartas pedidas por el usuario (ej: 10, 15, 20, 30, etc.)",
                items: {
                  type: "object",
                  properties: {
                    pregunta: { type: "string" },
                    respuesta: { type: "string" }
                  },
                  required: ["pregunta", "respuesta"]
                }
              }
            },
            required: ["deck_name", "cards"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "manage_flashcards",
          description: "Gestiona mazos y tarjetas flashcards: crear mazo nuevo, agregar cartas a un mazo existente, modificar una carta existente o eliminar cartas/mazos.",
          parameters: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["create_deck", "add_cards", "update_card", "delete_card", "delete_deck"], description: "Acción a realizar" },
              deck_id: { type: "string", description: "ID o nombre del mazo (para add_cards o delete_deck)" },
              deck_name: { type: "string", description: "Nombre del mazo para create_deck o add_cards" },
              subject_id: { type: "string", description: "Nombre o ID de la materia" },
              card_id: { type: "string", description: "ID de la carta para update_card o delete_card" },
              pregunta: { type: "string", description: "Nueva pregunta para update_card" },
              respuesta: { type: "string", description: "Nueva respuesta para update_card" },
              cards: {
                type: "array",
                description: "Array de cartas a agregar o crear con la cantidad solicitada",
                items: {
                  type: "object",
                  properties: {
                    pregunta: { type: "string" },
                    respuesta: { type: "string" }
                  },
                  required: ["pregunta", "respuesta"]
                }
              }
            },
            required: ["action"]
          }
        }
      },
      { type: "function", function: { name: "update_subject_status", description: "SOLO usar cuando el usuario PIDE EXPRESAMENTE cambiar estado de una materia.", parameters: { type: "object", properties: { subject_id: { type: "string", description: "Nombre materia" }, estado: { type: "string", enum: ["sin_cursar", "en_curso", "regular", "aprobada", "libre"] }, nota: { type: "number" } }, required: ["subject_id", "estado"] } } },
      { type: "function", function: { name: "create_notion_document", description: "SOLO usar cuando el usuario PIDE EXPRESAMENTE crear un documento o apunte con palabras como 'creame un doc', 'haceme un apunte'. NUNCA usar para responder preguntas, saludos, ni conversacion.", parameters: { type: "object", properties: { titulo: { type: "string" }, contenido: { type: "string" }, subject_id: { type: "string" } }, required: ["titulo"] } } },
      { type: "function", function: { name: "search_library", description: "Busca archivos en la biblioteca.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
      {
        type: "function",
        function: {
          name: "create_quiz",
          description: "SOLO usar cuando el usuario PIDE EXPRESAMENTE crear un cuestionario. Debe generar la cantidad exacta de preguntas pedidas por el usuario.",
          parameters: {
            type: "object",
            properties: {
              quiz_name: { type: "string" },
              subject_id: { type: "string", description: "Nombre materia" },
              questions: {
                type: "array",
                description: "Array con la cantidad exacta de preguntas pedidas por el usuario (ej: 5, 10, 15, 20, etc.)",
                items: {
                  type: "object",
                  properties: {
                    pregunta: { type: "string" },
                    opciones: { type: "array", items: { type: "string" }, description: "4-5 opciones" },
                    correcta: { type: "integer", description: "Indice 0-4 de la opción correcta" },
                    explicacion: { type: "string" }
                  },
                  required: ["pregunta", "opciones", "correcta"]
                }
              }
            },
            required: ["quiz_name", "questions"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "manage_quizzes",
          description: "Gestiona cuestionarios y preguntas: crear cuestionario, agregar preguntas a uno existente, modificar preguntas o eliminar preguntas/cuestionarios.",
          parameters: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["create_quiz", "add_questions", "update_question", "delete_question", "delete_quiz"], description: "Acción a realizar" },
              quiz_id: { type: "string", description: "ID o nombre del cuestionario (para add_questions o delete_quiz)" },
              quiz_name: { type: "string", description: "Nombre del cuestionario para create_quiz o add_questions" },
              subject_id: { type: "string", description: "Nombre o ID de la materia" },
              question_id: { type: "string", description: "ID de la pregunta para update_question o delete_question" },
              pregunta: { type: "string", description: "Texto de la pregunta para update_question" },
              explicacion: { type: "string", description: "Explicación de la respuesta para update_question" },
              opciones: { type: "array", items: { type: "string" }, description: "Opciones actualizadas para update_question" },
              correcta: { type: "integer", description: "Índice de la respuesta correcta para update_question (0 a N)" },
              questions: {
                type: "array",
                description: "Array de preguntas a añadir o crear con la cantidad solicitada",
                items: {
                  type: "object",
                  properties: {
                    pregunta: { type: "string" },
                    opciones: { type: "array", items: { type: "string" }, description: "4-5 opciones" },
                    correcta: { type: "integer", description: "Indice 0-4" },
                    explicacion: { type: "string" }
                  },
                  required: ["pregunta", "opciones", "correcta"]
                }
              }
            },
            required: ["action"]
          }
        }
      },
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
      },
      {
        type: "function",
        function: {
          name: "manage_routines",
          description: "Crea, actualiza, pausa o elimina una rutina del usuario solo cuando lo pida explícitamente.",
          parameters: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["create", "update", "pause", "delete"] },
              id: { type: "string", description: "ID de la rutina para update/pause/delete" },
              name: { type: "string" },
              description: { type: "string" },
              category: { type: "string" },
              start_time: { type: "string", description: "HH:mm" },
              end_time: { type: "string", description: "HH:mm" },
              days_of_week: { type: "array", items: { type: "integer" }, description: "0 domingo a 6 sábado" },
              start_date: { type: "string", description: "YYYY-MM-DD" },
              end_date: { type: "string", description: "YYYY-MM-DD" },
              subject_id: { type: "string", description: "Nombre o ID de materia" }
            },
            required: ["action"]
          }
        }
      }
    ];

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";

    // LIMIT messages to last 10 to prevent 413 errors while keeping enough context
    const trimmedMessages = trimMessages(messages, 10);
    const groqMessages = [
      ...trimmedMessages.map((m: any) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content.slice(0, 12000) : String(m.content).slice(0, 12000)
      }))
    ];

    // Optimized RAG: if user message is already very long, skip RAG to avoid tokens issues
    let ragContext = "";

    if (lastUserMsg && lastUserMsg.length < 4000) {
      const detectedSubject = fuzzyFind(lastUserMsg, subjects);
      if (detectedSubject) {
        console.log(`[RAG] Tema detectado: ${detectedSubject.nombre}. Buscando apuntes...`);

        const [docsRes, decksRes] = await Promise.all([
          serviceClient.from("notion_documents").select("titulo, contenido").eq("user_id", userId).eq("subject_id", detectedSubject.id).order("updated_at", { ascending: false }).limit(2),
          serviceClient.from("flashcard_decks").select("id, nombre").eq("user_id", userId).eq("subject_id", detectedSubject.id).limit(2)
        ]);

        const notionDocs = docsRes.data;
        const subjectDecks = decksRes.data;

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
            return `Doc: ${doc.titulo}\n${parsedContent.slice(0, 400)}`;
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

    const bulkPromptNote = "\n\n10. ⚠️ REGLA DE CREACIÓN DE FLASHCARDS Y CUESTIONARIOS:\n" +
      "- Si el usuario te envía un PDF, texto, apunte o imagen y pide crear flashcards o cuestionarios indicando una cantidad (ej: 10, 15, 20, 25, 30, etc.), LLAMÁ DE INMEDIATO a 'create_flashcards' o 'create_quiz' generando EXACTAMENTE esa cantidad en el array ('cards' o 'questions').\n" +
      "- Analizá minuciosamente el material completo para extraer todas las tarjetas o preguntas requeridas sin atajos ni resúmenes menores a lo pedido.\n" +
      "- NO escribas introducciones largas: comenzá directamente ejecutando la herramienta para evitar demoras o cortes.";

    const combinedSysPrompt = clientSystemPrompt
      ? `${clientSystemPrompt}\n\n=== CONTEXTO ADICIONAL Y RAG EN SERVIDOR ===\n${ragContext}${bulkPromptNote}`
      : `${sysPrompt}${ragContext}${bulkPromptNote}`;

    // High capacity limit: Llama 3.3 70B supports 128k context (~500k chars). 45k chars allows full 100% academic history without truncation.
    const maxSysLength = 45000;
    const truncatedSysPrompt = combinedSysPrompt.length > maxSysLength
      ? combinedSysPrompt.slice(0, maxSysLength) + "\n[System prompt truncado]"
      : combinedSysPrompt;

    groqMessages.unshift({ role: "system", content: truncatedSysPrompt });

    // Inyectar imagen al último mensaje del usuario si existe
    const hasImage = Boolean(image && image.data);
    if (hasImage) {
      const cleanBase64 = image.data.includes(",") ? image.data.split(",")[1] : image.data;
      const dataUrl = `data:${image.mime_type || "image/jpeg"};base64,${cleanBase64}`;
      const lastUserIdx = groqMessages.map((m: any) => m.role).lastIndexOf("user");
      if (lastUserIdx !== -1) {
        const textContent = typeof groqMessages[lastUserIdx].content === "string" ? groqMessages[lastUserIdx].content : "";
        groqMessages[lastUserIdx].content = [
          { type: "text", text: textContent || "Analiza esta imagen y ayúdame con todo su contenido académico:" },
          { type: "image_url", image_url: { url: dataUrl } }
        ];
      }
    }

    let streamRes: Response | null = null;
    let lastError = "";
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    // ── Si el mensaje tiene imagen, usar Google Gemini Vision con soporte de Tools ──
    if (hasImage && GEMINI_API_KEY) {
      console.log("[AI] Mensaje con imagen detectado. Transmitiendo con Gemini Vision...");
      for (const geminiModel of ["gemini-2.0-flash", "gemini-1.5-flash-latest", "gemini-2.5-flash"]) {
        try {
          streamRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${GEMINI_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: geminiModel,
              messages: groqMessages,
              tools: tools,
              tool_choice: "auto",
              temperature: 0.4,
              max_tokens: 8192,
              stream: true
            })
          });

          // Si falla con tools en modo multimodal, reintentar sin tools
          if (!streamRes.ok) {
            const geminiErr1 = await streamRes.text();
            console.warn(`[Gemini Vision] Falló con tools (${streamRes.status}):`, geminiErr1);
            streamRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${GEMINI_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: geminiModel,
                messages: groqMessages,
                temperature: 0.4,
                max_tokens: 8192,
                stream: true
              })
            });
          }

          if (streamRes.ok) break;
        } catch (geminiErr: any) {
          lastError += ` | [Gemini Vision error] ${geminiErr.message}`;
        }
      }
    }



    // Prioridad de modelos de Groq según nivel de potencia (verificados y activos en Groq):
    // - openai/gpt-oss-120b: Modelo insignia SOTA de 120B parámetros, máxima capacidad analítica, razonamiento riguroso y respuesta ultra veloz (~470ms)
    // - openai/gpt-oss-20b: 20B parámetros, respuesta instantánea (~430ms) para consultas ágiles
    // - qwen/qwen3.8-27b: 27B parámetros, alta velocidad y precisión (~340ms)
    const candidateGroqModels = power_level === "bajo"
      ? ["openai/gpt-oss-20b", "qwen/qwen3.8-27b", "openai/gpt-oss-120b"]
      : ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];

    const temperature = power_level === "bajo" ? 0.2 : power_level === "alto" ? 0.35 : 0.25;

    if (!streamRes && GROQ_API_KEY) {
      for (const groqModel of candidateGroqModels) {
        try {
          const reqBodyObj: Record<string, unknown> = {
            model: groqModel,
            messages: groqMessages,
            temperature,
            max_tokens: 8192,
            stream: true,
          };

          if (shouldPassTools) {
            reqBodyObj.tools = tools;
            reqBodyObj.tool_choice = "auto";
          }

          streamRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${GROQ_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(reqBodyObj)
          });

          // Si falla con tools, reintentar el mismo modelo sin tools
          if (!streamRes.ok && shouldPassTools) {
            console.warn(`[Groq ${groqModel}] Falló con tools (${streamRes.status}), reintentando sin tools...`);
            streamRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: groqModel,
                messages: groqMessages,
                temperature,
                max_tokens: 8192,
                stream: true
              })
            });
          }

          if (streamRes.ok) {
            console.log(`[Groq] Streaming exitoso con modelo: ${groqModel} (tools: ${shouldPassTools})`);
            break;
          } else {
            const errBody = await streamRes.text().catch(() => "");
            lastError = `[Groq ${groqModel} ${streamRes.status}] ${errBody}`;
            console.warn(`[Groq] Modelo ${groqModel} falló (${streamRes.status}):`, errBody);
          }
        } catch (err: any) {
          lastError = `[Groq fetch error ${groqModel}] ${err.message}`;
          console.warn(`[Groq] Error de conexión con ${groqModel}:`, err.message);
        }
      }
    } else if (!GROQ_API_KEY) {
      lastError = "[Groq] GROQ_API_KEY no está configurada";
    }

    // Fallback 1: Google Gemini (si Groq no responde)
    if ((!streamRes || !streamRes.ok) && GEMINI_API_KEY) {
      console.warn("[AI] Usando Google Gemini como respaldo...");
      for (const geminiModel of ["gemini-2.0-flash", "gemini-1.5-flash-latest", "gemini-2.5-flash"]) {
        try {
          streamRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${GEMINI_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: geminiModel,
              messages: groqMessages,
              tools: tools,
              tool_choice: "auto",
              temperature: 0.5,
              max_tokens: 8192,
              stream: true
            })
          });

          if (!streamRes.ok) {
            streamRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${GEMINI_API_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: geminiModel,
                messages: groqMessages,
                temperature: 0.5,
                max_tokens: 8192,
                stream: true
              })
            });
          }

          if (streamRes.ok) break;
        } catch (geminiErr: any) {
          lastError += ` | [Gemini error] ${geminiErr.message}`;
        }
      }
    }

    // Fallback 2: OpenRouter
    if ((!streamRes || !streamRes.ok) && OPENROUTER_API_KEY) {
      console.warn(`[AI] Usando OpenRouter de respaldo...`);
      try {
        streamRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://tabe.software",
            "X-Title": "TABE"
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-001",
            messages: groqMessages,
            temperature: 0.5,
            max_tokens: 8192,
            stream: true
          })
        });
      } catch (_) {}
    }

    if (!streamRes || !streamRes.ok) {
      const errText = streamRes ? await streamRes.text() : (lastError || "No AI provider available");
      throw new Error(`[TABE-AI-v2] Error en proveedor de IA: ${streamRes?.status || 500} - ${errText} (Detalles: ${lastError})`);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const body = new ReadableStream({
      async start(ctrl) {
        const reader = streamRes?.body?.getReader();
        if (!reader) {
          ctrl.close();
          return;
        }

        let fullContent = "";
        let toolCallId = "";
        let toolCallName = "";
        let toolCallArgs = "";
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
              const data = JSON.parse(jsonStr);
              const delta = data.choices?.[0]?.delta;
              if (!delta) continue;

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
            } catch {
              // Partial JSON or keepalive
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
            else if (toolCallName === "delete_calendar_event") {
              const { error } = await serviceClient.from("calendar_events").delete().eq("id", args.id).eq("user_id", userId);
              toolResult = error ? `\nNo pude eliminar el evento: ${error.message}` : "\nEvento eliminado.";
            }
            else if (toolCallName === "update_calendar_event") {
              const updates: Record<string, unknown> = {};
              for (const key of ["titulo", "fecha", "hora", "tipo_examen", "notas"] ) {
                if (args[key] !== undefined) updates[key] = args[key];
              }
              if (updates.tipo_examen) updates.tipo_examen = mapET(String(updates.tipo_examen));
              const { error } = await serviceClient.from("calendar_events").update(updates).eq("id", args.id).eq("user_id", userId);
              toolResult = error ? `\nNo pude actualizar el evento: ${error.message}` : "\nEvento actualizado.";
            }
            else if (toolCallName === "create_flashcards" || toolCallName === "manage_flashcards") {
              const sid = resolveId(args.subject_id || args.deck_name);
              const action = args.action || (toolCallName === "create_flashcards" ? "create_deck" : "add_cards");

              if (action === "create_deck" || action === "add_cards" || toolCallName === "create_flashcards") {
                const targetDeckName = args.deck_name || args.deck_id || "Nuevo Mazo";
                let deck: any = null;
                if (args.deck_id) {
                  const { data: dById } = await serviceClient.from("flashcard_decks").select("*").eq("user_id", userId).eq("id", args.deck_id).maybeSingle();
                  deck = dById;
                }
                if (!deck && targetDeckName) {
                  const { data: dByName } = await serviceClient.from("flashcard_decks").select("*").eq("user_id", userId).ilike("nombre", targetDeckName).maybeSingle();
                  deck = dByName;
                }
                if (!deck) {
                  const { data: newDeck } = await serviceClient.from("flashcard_decks").insert({
                    user_id: userId, nombre: targetDeckName, total_cards: 0, subject_id: sid
                  }).select().single();
                  deck = newDeck;
                }

                if (deck) {
                  const cardsToCreate = args.cards || [];
                  let inserted = 0;
                  if (cardsToCreate.length > 0) {
                    const batchSize = 50;
                    for (let i = 0; i < cardsToCreate.length; i += batchSize) {
                      const { error: batchError } = await serviceClient.from("flashcards").insert(
                        cardsToCreate.slice(i, i + batchSize).map((c: any) => ({ deck_id: deck.id, user_id: userId, pregunta: c.pregunta, respuesta: c.respuesta }))
                      );
                      if (!batchError) inserted += Math.min(batchSize, cardsToCreate.length - i);
                    }
                  }
                  const { count: realCount } = await serviceClient.from("flashcards").select("id", { count: "exact", head: true }).eq("deck_id", deck.id);
                  const finalTotal = realCount ?? ((deck.total_cards || 0) + inserted);
                  await serviceClient.from("flashcard_decks").update({ total_cards: finalTotal }).eq("id", deck.id);
                  toolResult = `\nMazo "${deck.nombre}" actualizado con éxito: se guardaron ${inserted} cartas (total acumulado en el mazo: ${finalTotal}).`;
                } else {
                  toolResult = `\nNo se pudo crear o encontrar el mazo de flashcards.`;
                }
              }
              else if (action === "update_card" && args.card_id) {
                const updates: any = {};
                if (args.pregunta) updates.pregunta = args.pregunta;
                if (args.respuesta) updates.respuesta = args.respuesta;
                const { error: upErr } = await serviceClient.from("flashcards").update(updates).eq("id", args.card_id).eq("user_id", userId);
                toolResult = upErr ? `\nError al actualizar carta: ${upErr.message}` : `\nCarta actualizada correctamente.`;
              }
              else if (action === "delete_card" && args.card_id) {
                const { data: cardData } = await serviceClient.from("flashcards").select("deck_id").eq("id", args.card_id).eq("user_id", userId).maybeSingle();
                const { error: delErr } = await serviceClient.from("flashcards").delete().eq("id", args.card_id).eq("user_id", userId);
                if (!delErr && cardData?.deck_id) {
                  const { count: realCount } = await serviceClient.from("flashcards").select("id", { count: "exact", head: true }).eq("deck_id", cardData.deck_id);
                  await serviceClient.from("flashcard_decks").update({ total_cards: realCount || 0 }).eq("id", cardData.deck_id);
                }
                toolResult = delErr ? `\nError al eliminar carta: ${delErr.message}` : `\nCarta eliminada correctamente.`;
              }
              else if (action === "delete_deck" && (args.deck_id || args.deck_name)) {
                let targetId = args.deck_id;
                if (!targetId && args.deck_name) {
                  const { data: d } = await serviceClient.from("flashcard_decks").select("id").eq("user_id", userId).ilike("nombre", args.deck_name).maybeSingle();
                  targetId = d?.id;
                }
                if (targetId) {
                  await serviceClient.from("flashcards").delete().eq("deck_id", targetId).eq("user_id", userId);
                  const { error: dErr } = await serviceClient.from("flashcard_decks").delete().eq("id", targetId).eq("user_id", userId);
                  toolResult = dErr ? `\nError al eliminar mazo: ${dErr.message}` : `\nMazo de flashcards eliminado correctamente.`;
                } else {
                  toolResult = `\nNo se encontró el mazo para eliminar.`;
                }
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
            else if (toolCallName === "create_quiz" || toolCallName === "manage_quizzes") {
              const sid = resolveId(args.subject_id || args.quiz_name);
              const action = args.action || (toolCallName === "create_quiz" ? "create_quiz" : "add_questions");

              if (action === "create_quiz" || action === "add_questions" || toolCallName === "create_quiz") {
                const targetQuizName = args.quiz_name || args.quiz_id || "Nuevo Cuestionario";
                let quizDeck: any = null;
                if (args.quiz_id) {
                  const { data: qById } = await serviceClient.from("quiz_decks").select("*").eq("user_id", userId).eq("id", args.quiz_id).maybeSingle();
                  quizDeck = qById;
                }
                if (!quizDeck && targetQuizName) {
                  const { data: qByName } = await serviceClient.from("quiz_decks").select("*").eq("user_id", userId).ilike("nombre", targetQuizName).maybeSingle();
                  quizDeck = qByName;
                }
                if (!quizDeck) {
                  const { data: newQuiz } = await serviceClient.from("quiz_decks").insert({
                    user_id: userId, nombre: targetQuizName, total_questions: 0, subject_id: sid
                  }).select().single();
                  quizDeck = newQuiz;
                }

                if (quizDeck) {
                  const questionsToCreate = args.questions || [];
                  let inserted = 0;
                  for (const q of questionsToCreate) {
                    const { data: question } = await serviceClient.from("quiz_questions").insert({
                      deck_id: quizDeck.id, user_id: userId, pregunta: q.pregunta, explicacion: q.explicacion || null
                    }).select().single();
                    if (question) {
                      inserted++;
                      if (q.opciones && Array.isArray(q.opciones)) {
                        const opts = q.opciones.map((o: string, i: number) => ({
                          question_id: question.id, texto: o, es_correcta: i === (q.correcta || 0)
                        }));
                        await serviceClient.from("quiz_options").insert(opts);
                      }
                    }
                  }
                  const { count: realQCount } = await serviceClient.from("quiz_questions").select("id", { count: "exact", head: true }).eq("deck_id", quizDeck.id);
                  const finalTotal = realQCount ?? ((quizDeck.total_questions || 0) + inserted);
                  await serviceClient.from("quiz_decks").update({ total_questions: finalTotal }).eq("id", quizDeck.id);
                  toolResult = `\nCuestionario "${quizDeck.nombre}" guardado: se agregaron ${inserted} preguntas (total en cuestionario: ${finalTotal}).`;
                } else {
                  toolResult = `\nNo se pudo crear o encontrar el cuestionario.`;
                }
              }
              else if (action === "update_question" && args.question_id) {
                const updates: any = {};
                if (args.pregunta) updates.pregunta = args.pregunta;
                if (args.explicacion) updates.explicacion = args.explicacion;
                const { error: qUpErr } = await serviceClient.from("quiz_questions").update(updates).eq("id", args.question_id).eq("user_id", userId);
                if (args.opciones && Array.isArray(args.opciones)) {
                  await serviceClient.from("quiz_options").delete().eq("question_id", args.question_id);
                  const opts = args.opciones.map((o: string, i: number) => ({
                    question_id: args.question_id, texto: o, es_correcta: i === (args.correcta || 0)
                  }));
                  await serviceClient.from("quiz_options").insert(opts);
                }
                toolResult = qUpErr ? `\nError al actualizar pregunta: ${qUpErr.message}` : `\nPregunta actualizada correctamente.`;
              }
              else if (action === "delete_question" && args.question_id) {
                const { data: qData } = await serviceClient.from("quiz_questions").select("deck_id").eq("id", args.question_id).eq("user_id", userId).maybeSingle();
                await serviceClient.from("quiz_options").delete().eq("question_id", args.question_id);
                const { error: delQErr } = await serviceClient.from("quiz_questions").delete().eq("id", args.question_id).eq("user_id", userId);
                if (!delQErr && qData?.deck_id) {
                  const { count: realQCount } = await serviceClient.from("quiz_questions").select("id", { count: "exact", head: true }).eq("deck_id", qData.deck_id);
                  await serviceClient.from("quiz_decks").update({ total_questions: realQCount || 0 }).eq("id", qData.deck_id);
                }
                toolResult = delQErr ? `\nError al eliminar pregunta: ${delQErr.message}` : `\nPregunta eliminada correctamente.`;
              }
              else if (action === "delete_quiz" && (args.quiz_id || args.quiz_name)) {
                let targetQuizId = args.quiz_id;
                if (!targetQuizId && args.quiz_name) {
                  const { data: qd } = await serviceClient.from("quiz_decks").select("id").eq("user_id", userId).ilike("nombre", args.quiz_name).maybeSingle();
                  targetQuizId = qd?.id;
                }
                if (targetQuizId) {
                  const { data: qList } = await serviceClient.from("quiz_questions").select("id").eq("deck_id", targetQuizId);
                  if (qList && qList.length > 0) {
                    const qIds = qList.map((q: any) => q.id);
                    await serviceClient.from("quiz_options").delete().in("question_id", qIds);
                    await serviceClient.from("quiz_questions").delete().eq("deck_id", targetQuizId);
                  }
                  const { error: qdErr } = await serviceClient.from("quiz_decks").delete().eq("id", targetQuizId).eq("user_id", userId);
                  toolResult = qdErr ? `\nError al eliminar cuestionario: ${qdErr.message}` : `\nCuestionario eliminado correctamente.`;
                } else {
                  toolResult = `\nNo se encontró el cuestionario para eliminar.`;
                }
              }
            }
            else if (toolCallName === "create_notion_document") {
              const sid = resolveId(args.subject_id);
              const { data, error } = await serviceClient.from("notion_documents").insert({
                user_id: userId,
                titulo: args.titulo || "Apunte sin título",
                subject_id: sid,
                contenido: args.contenido ? { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: args.contenido }] }] } : { type: "doc", content: [{ type: "paragraph" }] },
              }).select("id, titulo").single();
              toolResult = error ? `\nNo pude crear el apunte: ${error.message}` : `\nApunte "${data?.titulo || args.titulo}" creado.`;
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
            else if (toolCallName === "manage_routines") {
              const routineId = args.id || null;
              if (args.action === "create") {
                const sid = resolveId(args.subject_id);
                const { data, error } = await serviceClient.from("routines").insert({
                  user_id: userId,
                  name: args.name || "Rutina de estudio",
                  description: args.description || null,
                  category: args.category || "estudio",
                  start_time: args.start_time || "09:00",
                  end_time: args.end_time || "10:00",
                  days_of_week: Array.isArray(args.days_of_week) ? args.days_of_week : [1, 2, 3, 4, 5],
                  start_date: args.start_date || new Date().toISOString().split("T")[0],
                  end_date: args.end_date || null,
                  subject_id: sid,
                  is_active: true,
                }).select("id, name").single();
                toolResult = error ? `\nNo pude crear la rutina: ${error.message}` : `\nRutina "${data?.name || args.name}" creada.`;
              } else if (routineId) {
                const routineQuery = serviceClient.from("routines").update({
                  ...(args.name !== undefined ? { name: args.name } : {}),
                  ...(args.description !== undefined ? { description: args.description } : {}),
                  ...(args.category !== undefined ? { category: args.category } : {}),
                  ...(args.start_time !== undefined ? { start_time: args.start_time } : {}),
                  ...(args.end_time !== undefined ? { end_time: args.end_time } : {}),
                  ...(Array.isArray(args.days_of_week) ? { days_of_week: args.days_of_week } : {}),
                  ...(args.start_date !== undefined ? { start_date: args.start_date } : {}),
                  ...(args.end_date !== undefined ? { end_date: args.end_date } : {}),
                  ...(args.action === "pause" ? { is_active: false } : {}),
                }).eq("id", routineId).eq("user_id", userId);
                const { error } = await routineQuery;
                if (error) toolResult = `\nNo pude actualizar la rutina: ${error.message}`;
                else if (args.action === "delete") {
                  const { error: deleteError } = await serviceClient.from("routines").delete().eq("id", routineId).eq("user_id", userId);
                  toolResult = deleteError ? `\nNo pude eliminar la rutina: ${deleteError.message}` : "\nRutina eliminada.";
                } else {
                  toolResult = args.action === "pause" ? "\nRutina pausada." : "\nRutina actualizada.";
                }
              } else {
                toolResult = "\nNecesito el ID de la rutina para modificarla.";
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

    return new Response(body, { headers: { ...getCorsHeaders(req), "Content-Type": "text/event-stream" } });
  } catch (e: any) {
    console.error("Global AI Error:", e.message || e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
});
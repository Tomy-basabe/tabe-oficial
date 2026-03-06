import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_EVENT_TYPES = ["P1", "P2", "Global", "Final", "Recuperatorio P1", "Recuperatorio P2", "Recuperatorio Global", "Estudio", "TP", "Entrega", "Clase", "Otro"] as const;
type VET = typeof VALID_EVENT_TYPES[number];

function mapET(t: string): VET {
  const n = t.toLowerCase().trim();
  const m: Record<string, VET> = {
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
  return m[n] || "Otro";
}

function colorFor(t: VET): string {
  const c: Record<VET, string> = {
    "P1": "#00d9ff", "P2": "#a855f7", "Global": "#fbbf24", "Final": "#22c55e",
    "Recuperatorio P1": "#ef4444", "Recuperatorio P2": "#ef4444", "Recuperatorio Global": "#ef4444",
    "Estudio": "#6b7280", "TP": "#ec4899", "Entrega": "#f97316", "Clase": "#3b82f6", "Otro": "#8b5cf6"
  };
  return c[t] || "#00d9ff";
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
        chatMemory = "\nMEMORIA CONVERSACIONES ANTERIORES:\n" + rm.reverse().map((m: any) => (m.role === "user" ? "Estudiante" : personaName) + ": " + m.content.slice(0, 150)).join("\n");
      }
    }

    const [sR, ussR, evR, stR, ssR, fdR, prR, allSessionsR] = await Promise.all([
      serviceClient.from("subjects").select("id, nombre, codigo, año"),
      serviceClient.from("user_subject_status").select("*").eq("user_id", userId),
      serviceClient.from("calendar_events").select("*").eq("user_id", userId).gte("fecha", new Date().toISOString().split("T")[0]).order("fecha", { ascending: true }).limit(15),
      serviceClient.from("user_stats").select("*").eq("user_id", userId).maybeSingle(),
      serviceClient.from("study_sessions").select("*").eq("user_id", userId).order("fecha", { ascending: false }).limit(5),
      serviceClient.from("flashcard_decks").select("id, nombre, total_cards, subject_id").eq("user_id", userId).limit(10),
      serviceClient.from("profiles").select("nombre, username, email").eq("user_id", userId).maybeSingle(),
      serviceClient.from("study_sessions").select("subject_id, duracion_segundos, fecha, tipo").eq("user_id", userId),
    ]);

    const subjects = sR.data || [];
    const uss = ussR.data || [];
    const events = evR.data || [];
    const stats = stR.data;
    const sessions = ssR.data || [];
    const decks = fdR.data || [];
    const profile = prR.data;
    const allSessions = allSessionsR.data || [];

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

    const contextLine = context_page ? "\nSECCION ACTUAL: " + context_page : "";

    const metricasSection = metricasStr
      ? "\n=== METRICAS ESTUDIO (EN CURSO) ===\n" + metricasStr + "\n"
      : "";

    const sysPrompt = "Sos " + personaName + ", asistente academico de " + userName + ".\n" +
      "Personalidad: " + personalityPrompt + "\n" +
      "Fecha actual: " + new Date().toISOString().split("T")[0] + contextLine + "\n\n" +
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
      "9. Para flashcards/cuestionarios masivos, crea TODAS las que te manden sin limite.";

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
                    tipo_examen: { type: "string", enum: VALID_EVENT_TYPES }, 
                    notas: { type: "string" }, 
                    subject_id: { type: "string", description: "Nombre de la materia" },
                    recurrence_rule: { type: "string", enum: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] },
                    recurrence_end: { type: "string", description: "YYYY-MM-DD" }
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
      { type: "function", function: { name: "update_calendar_event", description: "SOLO usar cuando el usuario PIDE EXPRESAMENTE modificar un evento.", parameters: { type: "object", properties: { id: { type: "string" }, titulo: { type: "string" }, fecha: { type: "string" }, hora: { type: "string" }, tipo_examen: { type: "string", enum: VALID_EVENT_TYPES }, notas: { type: "string" } }, required: ["id"] } } },
      { type: "function", function: { name: "create_flashcards", description: "SOLO usar cuando el usuario PIDE EXPRESAMENTE crear flashcards.", parameters: { type: "object", properties: { deck_name: { type: "string" }, subject_id: { type: "string", description: "Nombre materia" }, cards: { type: "array", items: { type: "object", properties: { pregunta: { type: "string" }, respuesta: { type: "string" } }, required: ["pregunta", "respuesta"] } } }, required: ["deck_name", "cards"] } } },
      { type: "function", function: { name: "update_subject_status", description: "SOLO usar cuando el usuario PIDE EXPRESAMENTE cambiar estado de una materia.", parameters: { type: "object", properties: { subject_id: { type: "string", description: "Nombre materia" }, estado: { type: "string", enum: ["sin_cursar", "en_curso", "regular", "aprobada", "libre"] }, nota: { type: "number" } }, required: ["subject_id", "estado"] } } },
      { type: "function", function: { name: "create_notion_document", description: "SOLO usar cuando el usuario PIDE EXPRESAMENTE crear un documento o apunte con palabras como 'creame un doc', 'haceme un apunte'. NUNCA usar para responder preguntas, saludos, ni conversacion.", parameters: { type: "object", properties: { titulo: { type: "string" }, contenido: { type: "string" }, subject_id: { type: "string" } }, required: ["titulo"] } } },
      { type: "function", function: { name: "search_library", description: "Busca archivos en la biblioteca.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
      { type: "function", function: { name: "create_quiz", description: "SOLO usar cuando el usuario PIDE EXPRESAMENTE crear un cuestionario.", parameters: { type: "object", properties: { quiz_name: { type: "string" }, subject_id: { type: "string", description: "Nombre materia" }, questions: { type: "array", items: { type: "object", properties: { pregunta: { type: "string" }, opciones: { type: "array", items: { type: "string" }, description: "5 opciones" }, correcta: { type: "integer", description: "Indice 0-4" }, explicacion: { type: "string" } }, required: ["pregunta", "opciones", "correcta"] } } }, required: ["quiz_name", "questions"] } } }
    ];

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    // LIMIT messages to last 12 to prevent 413 errors
    const trimmedMessages = trimMessages(messages, 12);
    const groqMessages = [
      ...trimmedMessages.map((m: any) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content.slice(0, 3000) : String(m.content).slice(0, 3000)
      }))
    ];

    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
    let ragContext = "";

    if (lastUserMsg) {
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

    const finalSysPrompt = sysPrompt + ragContext;
    
    // Safety: truncate system prompt if too large (max ~6000 chars)
    const maxSysLength = 6000;
    const truncatedSysPrompt = finalSysPrompt.length > maxSysLength 
      ? finalSysPrompt.slice(0, maxSysLength) + "\n[System prompt truncado por tamaño]"
      : finalSysPrompt;
    
    groqMessages.unshift({ role: "system", content: truncatedSysPrompt });

    let content = "";
    let toolCall: any = null;
    let provider = "";
    const errors: string[] = [];

    if (GROQ_API_KEY) {
      try {
        console.log("[AI] Usando GROQ API con Llama 3. Messages: " + groqMessages.length + ", SysPrompt chars: " + truncatedSysPrompt.length);
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
            max_tokens: 8192,
            stream: false
          })
        });

        const status = res.status;
        if (res.ok) {
          const data = await res.json();
          const choice = data.choices && data.choices[0];

          if (choice && choice.message) {
            if (choice.message.content) {
              content = choice.message.content;
            }
            if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
              const tc = choice.message.tool_calls[0];
              toolCall = {
                name: tc.function.name,
                args: JSON.parse(tc.function.arguments)
              };
            }
          }
          provider = "groq";
          console.log("[AI] Groq OK text:" + (content.length > 0) + " tool:" + (!!toolCall));
        } else {
          const errBody = await res.text();
          errors.push("groq:" + status);
          console.error("[AI] Groq failed:", status, errBody.slice(0, 300));
        }
      } catch (e: any) {
        errors.push("groq:" + (e.message || String(e)));
        console.error("[AI] Groq exception:", e.message || e);
      }
    } else {
      errors.push("No GROQ_API_KEY set in environment variables");
      console.error("[AI] No GROQ_API_KEY set");
    }

    if (!provider) {
      console.error("[AI] No provider. Errors:", errors.join(" | "));
      throw new Error("No AI provider available. Errors: " + errors.join(" | "));
    }

    const resolveId = (raw: string | null | undefined): string | null => {
      if (!raw) return null;
      if (/^[0-9a-f]{8}-/.test(raw)) return raw;
      const found = fuzzyFind(raw, subjects);
      if (found) { console.log("[Fuzzy] " + raw + " -> " + found.nombre); return found.id; }
      return null;
    };

    if (toolCall) {
      const args = toolCall.args;
      const fn = toolCall.name;
      console.log("[Tool] " + fn, JSON.stringify(args));

      if (fn === "create_calendar_events") {
        const agendados = [];
        if (args.eventos && Array.isArray(args.eventos)) {
          for (const evt of args.eventos) {
            const tipo = mapET(evt.tipo_examen || "Otro");
            const sid = resolveId(evt.subject_id);
            const { data, error } = await serviceClient.from("calendar_events").insert({
              user_id: userId, 
              titulo: evt.titulo, 
              fecha: evt.fecha, 
              hora: evt.hora || null,
              hora_fin: evt.hora_fin || null,
              tipo_examen: tipo, 
              color: colorFor(tipo), 
              notas: evt.notas || null, 
              subject_id: sid,
              recurrence_rule: evt.recurrence_rule || null,
              recurrence_end: evt.recurrence_end || null
            }).select().single();
            if (!error && data) agendados.push(data);
          }
        }
        
        if (agendados.length > 0) {
          content += `\nAgendé ${agendados.length} evento(s) exitosamente.`;
        } else {
          content += "\nNo se pudo agendar ningún evento. Verificá los datos.";
        }
      }
      else if (fn === "delete_calendar_event") {
        const { error } = await serviceClient.from("calendar_events").delete().eq("id", args.id).eq("user_id", userId);
        content += error ? "\nError al eliminar." : "\nEvento eliminado.";
      }
      else if (fn === "update_calendar_event") {
        const up: any = {};
        if (args.titulo) up.titulo = args.titulo;
        if (args.fecha) up.fecha = args.fecha;
        if (args.hora) up.hora = args.hora;
        if (args.tipo_examen) { up.tipo_examen = mapET(args.tipo_examen); up.color = colorFor(up.tipo_examen); }
        if (args.notas) up.notas = args.notas;
        const { error } = await serviceClient.from("calendar_events").update(up).eq("id", args.id).eq("user_id", userId);
        content += error ? "\nError: " + error.message : "\nEvento actualizado.";
      }
      else if (fn === "create_flashcards") {
        const sid = resolveId(args.subject_id || args.deck_name);
        const cardsToCreate = args.cards || [];
        console.log(`[Flashcards] Creating deck '${args.deck_name}' with ${cardsToCreate.length} cards`);
        const { data: deck, error } = await serviceClient.from("flashcard_decks").insert({
          user_id: userId, nombre: args.deck_name, total_cards: cardsToCreate.length, subject_id: sid
        }).select().single();
        if (deck && cardsToCreate.length > 0) {
          const batchSize = 50;
          let inserted = 0;
          for (let i = 0; i < cardsToCreate.length; i += batchSize) {
            const batch = cardsToCreate.slice(i, i + batchSize);
            const { error: batchError } = await serviceClient.from("flashcards").insert(
              batch.map((c: any) => ({ deck_id: deck.id, user_id: userId, pregunta: c.pregunta, respuesta: c.respuesta }))
            );
            if (!batchError) inserted += batch.length;
            else console.error(`[Flashcards] Batch insert error:`, batchError);
          }
          content += "\nMazo \"" + deck.nombre + "\" creado con " + inserted + " cartas.";
        } else if (error) { content += "\nError: " + error.message; }
      }
      else if (fn === "update_subject_status") {
        const rid = resolveId(args.subject_id);
        if (!rid) { content += "\nNo encontre esa materia."; }
        else {
          const up: any = { user_id: userId, subject_id: rid, estado: args.estado };
          if (args.nota) up.nota = args.nota;
          if (args.estado === "aprobada") up.fecha_aprobacion = new Date().toISOString().split("T")[0];
          const { error } = await serviceClient.from("user_subject_status").upsert(up, { onConflict: "user_id,subject_id" });
          content += error ? "\nError: " + error.message : "\n" + (nameById[rid] || args.subject_id) + " actualizada a " + args.estado.toUpperCase() + (args.nota ? " con nota " + args.nota : "") + ".";
        }
      }
      else if (fn === "create_notion_document") {
        const sid = resolveId(args.subject_id);
        const { data, error } = await serviceClient.from("notion_documents").insert({
          user_id: userId, titulo: args.titulo, emoji: "memo",
          contenido: args.contenido ? JSON.stringify([{ type: "paragraph", content: args.contenido }]) : "[]",
          subject_id: sid, is_favorite: false, total_time_seconds: 0
        }).select().single();
        content += error ? "\nError: " + error.message : "\nDocumento \"" + data.titulo + "\" creado.";
      }
      else if (fn === "search_library") {
        content += "\nBusqueda no disponible en este momento.";
      }
      else if (fn === "create_quiz") {
        const sid = resolveId(args.subject_id || args.quiz_name);
        const questionsToCreate = args.questions || [];
        console.log(`[Quiz] Creating quiz '${args.quiz_name}' with ${questionsToCreate.length} questions`);
        const { data: quizDeck, error: qdErr } = await serviceClient.from("quiz_decks").insert({
          user_id: userId, nombre: args.quiz_name, total_questions: questionsToCreate.length, subject_id: sid
        }).select().single();
        if (quizDeck && questionsToCreate.length > 0) {
          let createdCount = 0;
          for (const q of questionsToCreate) {
            const { data: question } = await serviceClient.from("quiz_questions").insert({
              deck_id: quizDeck.id, user_id: userId, pregunta: q.pregunta, explicacion: q.explicacion || null
            }).select().single();
            if (question && q.opciones) {
              const opts = q.opciones.map((o: string, i: number) => ({
                question_id: question.id, texto: o, es_correcta: i === (q.correcta || 0)
              }));
              await serviceClient.from("quiz_options").insert(opts);
              createdCount++;
            }
          }
          content += "\nCuestionario \"" + quizDeck.nombre + "\" creado con " + createdCount + " preguntas. Anda a Cuestionarios para practicarlo.";
        } else if (qdErr) { content += "\nError: " + qdErr.message; }
      }
    }

    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(encoder.encode("data: " + JSON.stringify({ choices: [{ delta: { content: content } }] }) + "\n\n"));
        ctrl.enqueue(encoder.encode("data: [DONE]\n\n"));
        ctrl.close();
      }
    });

    return new Response(body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e: any) {
    console.error("AI Error:", e.message || e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
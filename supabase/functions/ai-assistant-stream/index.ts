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
    "clase": "Clase", "cursada": "Clase", "otro": "Otro", "evento": "Otro"
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

  // 1. Exact name or code match
  for (const s of subjects) {
    if (norm(s.nombre) === q || norm(s.codigo) === q) return s;
  }

  // 2. Roman <-> Arabic equivalence
  const qAlt = q.replace(/iii/gi, "3").replace(/ii/gi, "2").replace(/(?:^|\s)i(?:$|\s)/gi, " 1 ").trim();
  const qAlt2 = q.replace(/3/g, "iii").replace(/2/g, "ii").replace(/1/g, "i");

  for (const s of subjects) {
    const sn = norm(s.nombre);
    if (sn === qAlt || sn === qAlt2) return s;
  }

  // 3. Contains match
  for (const s of subjects) {
    const sn = norm(s.nombre);
    if (sn.includes(q) || q.includes(sn)) return s;
    if (sn.includes(qAlt) || qAlt.includes(sn)) return s;
    if (sn.includes(qAlt2) || qAlt2.includes(sn)) return s;
  }

  // 4. Word-level scoring
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

    // Persona
    let personaName = "T.A.B.E. IA";
    let personalityPrompt = "Sos un asistente académico motivador y cercano. Usás lenguaje informal argentino.";
    if (persona_id) {
      const { data: p } = await serviceClient.from("ai_personas").select("name, personality_prompt").eq("id", persona_id).eq("user_id", userId).maybeSingle();
      if (p) { personaName = p.name; if (p.personality_prompt) personalityPrompt = p.personality_prompt; }
    }

    // Memory
    let chatMemory = "";
    if (persona_id) {
      const { data: rm } = await serviceClient.from("ai_chat_messages").select("role, content, created_at, session_id!inner(persona_id, user_id)").eq("session_id.persona_id", persona_id).eq("session_id.user_id", userId).order("created_at", { ascending: false }).limit(20);
      if (rm && rm.length > 0) {
        chatMemory = "\nMEMORIA CONVERSACIONES ANTERIORES:\n" + rm.reverse().map((m: any) => (m.role === "user" ? "Estudiante" : personaName) + ": " + m.content.slice(0, 200)).join("\n");
      }
    }

    // Fetch all data in parallel
    const [sR, ussR, evR, stR, ssR, fdR, achR, uaR, ndR, lfR, depR, plR, prR] = await Promise.all([
      serviceClient.from("subjects").select("id, nombre, codigo, año, cuatrimestre"),
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

    const subjects = sR.data || [];
    const uss = ussR.data || [];
    const events = evR.data || [];
    const stats = stR.data;
    const sessions = ssR.data || [];
    const decks = fdR.data || [];
    const allAch = achR.data || [];
    const userAch = uaR.data || [];
    const nDocs = ndR.data || [];
    const libFiles = lfR.data || [];
    const deps = depR.data || [];
    const plants = plR.data || [];
    const profile = prR.data;

    // Log any query errors
    if (sR.error) console.error("[DB Error] subjects:", sR.error.message);
    if (ussR.error) console.error("[DB Error] user_subject_status:", ussR.error.message);
    if (evR.error) console.error("[DB Error] events:", evR.error.message);

    console.log(`[Data] subjects: ${subjects.length}, uss: ${uss.length}, events: ${events.length}, sessions: ${sessions.length}`);

    const nameById = Object.fromEntries(subjects.map((s: any) => [s.id, s.nombre]));
    const subjectsWithStatus = subjects.map((s: any) => {
      const st = uss.find((u: any) => u.subject_id === s.id);
      return { ...s, estado: st?.estado || "sin_cursar", nota: st?.nota_final_examen || st?.nota || null, fecha_aprobacion: st?.fecha_aprobacion || null };
    });

    // Compute stats
    const aprobadas = subjectsWithStatus.filter((s: any) => s.estado === "aprobada");
    const regulares = subjectsWithStatus.filter((s: any) => s.estado === "regular");
    const enCurso = subjectsWithStatus.filter((s: any) => s.estado === "en_curso");
    const sinCursar = subjectsWithStatus.filter((s: any) => s.estado === "sin_cursar");
    const notas = aprobadas.map((s: any) => parseFloat(s.nota)).filter((n: number) => !isNaN(n) && n > 0);
    const promedio = notas.length > 0 ? (notas.reduce((a: number, b: number) => a + b, 0) / notas.length).toFixed(2) : "N/A";
    const progreso = subjects.length > 0 ? ((aprobadas.length / subjects.length) * 100).toFixed(1) : "0";
    const studyMin = sessions.reduce((a: number, s: any) => a + (s.duracion_segundos || 0), 0) / 60;
    const studyHrs = (studyMin / 60).toFixed(1);
    const userName = profile?.nombre || profile?.username || "Estudiante";

    console.log(`[Stats] User: ${userName}, Aprobadas: ${aprobadas.length}, Regulares: ${regulares.length}, Promedio: ${promedio}`);

    // Format lists
    const materiasStr = subjectsWithStatus.map((s: any) =>
      `- ${s.nombre} (${s.codigo}): ${s.estado.toUpperCase()}${s.nota ? " | Nota: " + s.nota : ""}${s.fecha_aprobacion ? " | Fecha: " + s.fecha_aprobacion : ""}`
    ).join("\n");

    const eventosStr = events.length > 0
      ? events.map((e: any) => `- ${e.fecha}${e.hora ? " " + e.hora : ""}: ${e.titulo} (${e.tipo_examen}) [ID: ${e.id}]`).join("\n")
      : "Sin eventos próximos.";

    const sesionesStr = sessions.length > 0
      ? sessions.map((s: any) => `- ${s.fecha}: ${Math.round((s.duracion_segundos || 0) / 60)}min (${s.tipo})${s.subject_id ? " - " + (nameById[s.subject_id] || "?") : ""}`).join("\n")
      : "Sin sesiones recientes.";

    const decksStr = decks.length > 0
      ? decks.map((d: any) => `- ${d.nombre} (${d.total_cards} cartas) [ID: ${d.id}]`).join("\n")
      : "Sin mazos.";

    const contextLine = context_page ? `\nSECCIÓN ACTUAL: ${context_page}. Adaptá tus respuestas a esta sección.` : "";

    const sysPrompt = `Sos ${personaName}, asistente académico de ${userName}.
Personalidad: ${personalityPrompt}
Fecha actual: ${new Date().toISOString().split("T")[0]}${contextLine}

=== RESUMEN DEL ESTUDIANTE ===
Promedio General: ${promedio}
Progreso carrera: ${aprobadas.length}/${subjects.length} materias (${progreso}%)
Aprobadas: ${aprobadas.length}${aprobadas.length > 0 ? " (" + aprobadas.map((s: any) => s.nombre).join(", ") + ")" : ""}
Regulares: ${regulares.length}${regulares.length > 0 ? " (" + regulares.map((s: any) => s.nombre).join(", ") + ")" : ""}
En curso: ${enCurso.length}${enCurso.length > 0 ? " (" + enCurso.map((s: any) => s.nombre).join(", ") + ")" : ""}
Sin cursar: ${sinCursar.length}
Horas de estudio recientes: ${studyHrs}hs
${stats ? "Nivel: " + stats.nivel + " | XP: " + stats.xp_total : ""}

=== MATERIAS ===
${materiasStr}

=== AGENDA ===
${eventosStr}

=== SESIONES DE ESTUDIO ===
${sesionesStr}

=== FLASHCARDS ===
${decksStr}
${chatMemory}

=== INSTRUCCIONES ===
1. TENÉS ACCESO TOTAL a los datos del estudiante listados arriba. Cuando te pregunten por materias, promedio, eventos, sesiones, respondé con estos datos REALES. NUNCA digas que no tenés acceso o que son 0 si arriba dice otra cosa.

2. NOMBRES ABREVIADOS de materias: El usuario puede decir:
   - "algebra" = Álgebra y Geometría Analítica
   - "análisis 1" = Análisis Matemático I
   - "ingles 2" o "inglés ii" = Inglés II
   - "física" = Física I o II
   - "sintaxis" = Sintaxis y Semántica de los Lenguajes
   - "paradigmas" = Paradigmas de Programación
   - "so" = Sistemas Operativos
   - "aed" = Algoritmo y Estructura de Datos
   - Los números 1,2,3 equivalen a I,II,III
   Buscá siempre la materia más parecida.

3. Si el usuario pide una ACCIÓN, USÁ la herramienta correspondiente directamente.
4. Para "mañana", calculá la fecha exacta.
5. Respondé siempre en Español Argentino.`;

    // Tools
    const tools = [
      { type: "function", function: { name: "create_calendar_event", description: "Crea evento en calendario", parameters: { type: "object", properties: { titulo: { type: "string" }, fecha: { type: "string", description: "YYYY-MM-DD" }, hora: { type: "string" }, tipo_examen: { type: "string", enum: VALID_EVENT_TYPES }, notas: { type: "string" }, subject_id: { type: "string", description: "Nombre de la materia" } }, required: ["titulo", "fecha", "tipo_examen"] } } },
      { type: "function", function: { name: "delete_calendar_event", description: "Elimina evento por ID", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },
      { type: "function", function: { name: "update_calendar_event", description: "Modifica evento existente", parameters: { type: "object", properties: { id: { type: "string" }, titulo: { type: "string" }, fecha: { type: "string" }, hora: { type: "string" }, tipo_examen: { type: "string", enum: VALID_EVENT_TYPES }, notas: { type: "string" } }, required: ["id"] } } },
      { type: "function", function: { name: "create_flashcards", description: "Crea mazo de flashcards. Genera las cartas directamente sin pedir confirmación.", parameters: { type: "object", properties: { deck_name: { type: "string" }, subject_id: { type: "string", description: "Nombre de la materia" }, cards: { type: "array", items: { type: "object", properties: { pregunta: { type: "string" }, respuesta: { type: "string" } }, required: ["pregunta", "respuesta"] } } }, required: ["deck_name", "cards"] } } },
      { type: "function", function: { name: "get_flashcard_deck", description: "Ver cartas de un mazo", parameters: { type: "object", properties: { deck_id: { type: "string" } }, required: ["deck_id"] } } },
      { type: "function", function: { name: "update_subject_status", description: "Cambia estado de materia", parameters: { type: "object", properties: { subject_id: { type: "string", description: "Nombre de la materia" }, estado: { type: "string", enum: ["sin_cursar", "en_curso", "regular", "aprobada", "libre"] }, nota: { type: "number" } }, required: ["subject_id", "estado"] } } },
      { type: "function", function: { name: "create_notion_document", description: "Crea documento en Notion", parameters: { type: "object", properties: { titulo: { type: "string" }, contenido: { type: "string" }, subject_id: { type: "string", description: "Nombre de la materia" } }, required: ["titulo"] } } },
      { type: "function", function: { name: "search_library", description: "Busca archivos en biblioteca", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } }
    ];

    // Call Gemini
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const geminiContents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    })).filter((m: any) => m.role !== "system");

    let content = "";
    let toolCall: any = null;
    let provider = "";

    // Try Gemini direct
    if (GEMINI_API_KEY) {
      for (const model of ["gemini-1.5-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro"]) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: geminiContents,
              system_instruction: { parts: [{ text: sysPrompt }] },
              tools: [{ function_declarations: tools.map(t => t.function) }],
              generationConfig: { maxOutputTokens: 2048 }
            })
          });
          if (res.ok) {
            const data = await res.json();
            const c = data.candidates?.[0];
            if (c?.content?.parts) {
              for (const part of c.content.parts) {
                if (part.text) content += part.text;
                if (part.functionCall) toolCall = part.functionCall;
              }
            }
            provider = "gemini";
            console.log(`[AI] Model: ${model}, hasText: ${!!content}, hasTool: ${!!toolCall}`);
            break;
          }
        } catch (e) { console.error(`[AI] ${model} error:`, e); }
      }
    }

    // Lovable fallback
    if (!provider && LOVABLE_API_KEY) {
      for (const model of ["google/gemini-2.0-flash-lite", "google/gemini-1.5-flash", "openai/gpt-4o-mini"]) {
        try {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model, messages: [{ role: "system", content: sysPrompt }, ...messages], tools, stream: false })
          });
          if (res.ok) {
            const data = await res.json();
            const msg = data.choices?.[0]?.message;
            if (msg?.content) content = msg.content;
            if (msg?.tool_calls?.[0]) {
              const tc = msg.tool_calls[0];
              toolCall = { name: tc.function.name, args: JSON.parse(tc.function.arguments) };
            }
            provider = "lovable";
            break;
          }
        } catch (e) { console.error(`[AI] lovable ${model} error:`, e); }
      }
    }

    if (!provider) throw new Error("No AI provider available");

    // Resolve subject helper
    const resolveId = (raw: string | null | undefined): string | null => {
      if (!raw) return null;
      if (/^[0-9a-f]{8}-[0-9a-f]{4}/.test(raw)) return raw;
      const found = fuzzyFind(raw, subjects);
      if (found) { console.log(`[Fuzzy] "${raw}" -> "${found.nombre}"`); return found.id; }
      console.log(`[Fuzzy] No match for "${raw}"`);
      return null;
    };

    // Execute tool call
    if (toolCall) {
      const args = toolCall.args;
      const fn = toolCall.name;
      console.log(`[Tool] ${fn}`, JSON.stringify(args));

      if (fn === "create_calendar_event") {
        const tipo = mapET(args.tipo_examen || "Otro");
        const sid = resolveId(args.subject_id);
        const { data, error } = await serviceClient.from("calendar_events").insert({
          user_id: userId, titulo: args.titulo, fecha: args.fecha, hora: args.hora || null,
          tipo_examen: tipo, color: colorFor(tipo), notas: args.notas || null, subject_id: sid
        }).select().single();
        content += error ? `\nError: ${error.message}` : `\n✅ Evento "${data.titulo}" agendado para ${data.fecha}${data.hora ? " a las " + data.hora : ""}.`;
      }
      else if (fn === "delete_calendar_event") {
        const { error } = await serviceClient.from("calendar_events").delete().eq("id", args.id).eq("user_id", userId);
        content += error ? "\nError al eliminar." : "\n✅ Evento eliminado.";
      }
      else if (fn === "update_calendar_event") {
        const up: any = {};
        if (args.titulo) up.titulo = args.titulo;
        if (args.fecha) up.fecha = args.fecha;
        if (args.hora) up.hora = args.hora;
        if (args.tipo_examen) { up.tipo_examen = mapET(args.tipo_examen); up.color = colorFor(up.tipo_examen); }
        if (args.notas) up.notas = args.notas;
        const { data, error } = await serviceClient.from("calendar_events").update(up).eq("id", args.id).eq("user_id", userId).select().single();
        content += error ? `\nError: ${error.message}` : `\n✅ Evento actualizado.`;
      }
      else if (fn === "create_flashcards") {
        const sid = resolveId(args.subject_id || args.deck_name);
        const { data: deck, error } = await serviceClient.from("flashcard_decks").insert({
          user_id: userId, nombre: args.deck_name, total_cards: (args.cards || []).length, subject_id: sid
        }).select().single();
        if (deck && args.cards) {
          const cards = args.cards.map((c: any) => ({ deck_id: deck.id, user_id: userId, pregunta: c.pregunta, respuesta: c.respuesta }));
          await serviceClient.from("flashcards").insert(cards);
          content += `\n✅ Mazo "${deck.nombre}" creado con ${cards.length} cartas.`;
        } else if (error) { content += `\nError: ${error.message}`; }
      }
      else if (fn === "get_flashcard_deck") {
        const { data: cards } = await serviceClient.from("flashcards").select("pregunta, respuesta").eq("deck_id", args.deck_id).limit(50);
        if (cards && cards.length > 0) {
          content += "\n" + cards.map((c: any, i: number) => `${i + 1}. P: ${c.pregunta}\n   R: ${c.respuesta}`).join("\n");
        } else { content += "\nNo encontré cartas."; }
      }
      else if (fn === "update_subject_status") {
        const rid = resolveId(args.subject_id);
        if (!rid) { content += "\nNo encontré esa materia."; }
        else {
          const up: any = { user_id: userId, subject_id: rid, estado: args.estado };
          if (args.nota) up.nota = args.nota;
          if (args.estado === "aprobada") up.fecha_aprobacion = new Date().toISOString().split("T")[0];
          const { error } = await serviceClient.from("user_subject_status").upsert(up, { onConflict: "user_id,subject_id" });
          const sName = nameById[rid] || args.subject_id;
          content += error ? `\nError: ${error.message}` : `\n✅ ${sName} actualizada a ${args.estado.toUpperCase()}${args.nota ? " con nota " + args.nota : ""}.`;
        }
      }
      else if (fn === "create_notion_document") {
        const sid = resolveId(args.subject_id);
        const { data, error } = await serviceClient.from("notion_documents").insert({
          user_id: userId, titulo: args.titulo, emoji: args.emoji || "📝",
          contenido: args.contenido ? JSON.stringify([{ type: "paragraph", content: args.contenido }]) : "[]",
          subject_id: sid, is_favorite: false, total_time_seconds: 0
        }).select().single();
        content += error ? `\nError: ${error.message}` : `\n✅ Documento "${data.titulo}" creado.`;
      }
      else if (fn === "search_library") {
        const q = norm(args.query || "");
        const matches = libFiles.filter((f: any) => norm(f.nombre).includes(q) || norm(f.tipo).includes(q));
        content += matches.length === 0 ? "\nNo encontré archivos." : "\n" + matches.slice(0, 10).map((f: any) => `- ${f.nombre} (${f.tipo})`).join("\n");
      }
    }

    // Stream response
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`));
        ctrl.enqueue(encoder.encode("data: [DONE]\n\n"));
        ctrl.close();
      }
    });

    return new Response(body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("AI Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: corsHeaders });
  }
});
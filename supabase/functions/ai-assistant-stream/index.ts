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

async function getAvailableGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.models) return [];
    const validModels = data.models
      .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m: any) => m.name.replace("models/", ""));
    const priority = [
      "gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash-8b",
      "gemini-2.0-flash-lite", "gemini-1.5-pro", "gemini-1.0-pro"
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
      const { data: rm } = await serviceClient.from("ai_chat_messages").select("role, content, created_at, session_id!inner(persona_id, user_id)").eq("session_id.persona_id", persona_id).eq("session_id.user_id", userId).order("created_at", { ascending: false }).limit(20);
      if (rm && rm.length > 0) {
        chatMemory = "\nMEMORIA CONVERSACIONES ANTERIORES:\n" + rm.reverse().map((m: any) => (m.role === "user" ? "Estudiante" : personaName) + ": " + m.content.slice(0, 200)).join("\n");
      }
    }

    const [sR, ussR, evR, stR, ssR, fdR, prR] = await Promise.all([
      serviceClient.from("subjects").select("id, nombre, codigo, cuatrimestre"),
      serviceClient.from("user_subject_status").select("*").eq("user_id", userId),
      serviceClient.from("calendar_events").select("*").eq("user_id", userId).gte("fecha", new Date().toISOString().split("T")[0]).order("fecha", { ascending: true }).limit(20),
      serviceClient.from("user_stats").select("*").eq("user_id", userId).maybeSingle(),
      serviceClient.from("study_sessions").select("*").eq("user_id", userId).order("fecha", { ascending: false }).limit(10),
      serviceClient.from("flashcard_decks").select("id, nombre, total_cards, subject_id").eq("user_id", userId).limit(20),
      serviceClient.from("profiles").select("nombre, username, email").eq("user_id", userId).maybeSingle(),
    ]);

    const subjects = sR.data || [];
    const uss = ussR.data || [];
    const events = evR.data || [];
    const stats = stR.data;
    const sessions = ssR.data || [];
    const decks = fdR.data || [];
    const profile = prR.data;

    const nameById: Record<string, string> = {};
    for (const s of subjects) nameById[s.id] = s.nombre;

    const swStatus = subjects.map((s: any) => {
      const st = uss.find((u: any) => u.subject_id === s.id);
      return { ...s, estado: st?.estado || "sin_cursar", nota: st?.nota_final_examen || st?.nota || null, fecha_aprobacion: st?.fecha_aprobacion || null };
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

    const materiasStr = swStatus.map((s: any) =>
      "- " + s.nombre + " (" + s.codigo + "): " + s.estado.toUpperCase() + (s.nota ? " | Nota: " + s.nota : "") + (s.fecha_aprobacion ? " | Fecha: " + s.fecha_aprobacion : "")
    ).join("\n");

    const eventosStr = events.length > 0
      ? events.map((e: any) => "- " + e.fecha + (e.hora ? " " + e.hora : "") + ": " + e.titulo + " (" + e.tipo_examen + ") [ID: " + e.id + "]").join("\n")
      : "Sin eventos proximos.";

    const sesionesStr = sessions.length > 0
      ? sessions.map((s: any) => "- " + s.fecha + ": " + Math.round((s.duracion_segundos || 0) / 60) + "min (" + s.tipo + ")" + (s.subject_id && nameById[s.subject_id] ? " - " + nameById[s.subject_id] : "")).join("\n")
      : "Sin sesiones recientes.";

    const contextLine = context_page ? "\nSECCION ACTUAL: " + context_page + ". Adapta tus respuestas a esta seccion." : "";

    const sysPrompt = "Sos " + personaName + ", asistente academico de " + userName + ".\n" +
      "Personalidad: " + personalityPrompt + "\n" +
      "Fecha actual: " + new Date().toISOString().split("T")[0] + contextLine + "\n\n" +
      "=== RESUMEN DEL ESTUDIANTE ===\n" +
      "Promedio General: " + promedio + "\n" +
      "Progreso carrera: " + aprobadas.length + "/" + subjects.length + " materias (" + progreso + "%)\n" +
      "Aprobadas: " + aprobadas.length + (aprobadas.length > 0 ? " (" + aprobadas.map((s: any) => s.nombre).join(", ") + ")" : "") + "\n" +
      "Regulares: " + regulares.length + (regulares.length > 0 ? " (" + regulares.map((s: any) => s.nombre).join(", ") + ")" : "") + "\n" +
      "En curso: " + enCurso.length + (enCurso.length > 0 ? " (" + enCurso.map((s: any) => s.nombre).join(", ") + ")" : "") + "\n" +
      "Sin cursar: " + sinCursar.length + "\n" +
      "Horas de estudio recientes: " + (studyMin / 60).toFixed(1) + "hs\n" +
      (stats ? "Nivel: " + stats.nivel + " | XP: " + stats.xp_total + "\n" : "") + "\n" +
      "=== MATERIAS ===\n" + materiasStr + "\n\n" +
      "=== AGENDA ===\n" + eventosStr + "\n\n" +
      "=== SESIONES DE ESTUDIO ===\n" + sesionesStr + "\n" +
      chatMemory + "\n\n" +
      "=== INSTRUCCIONES ===\n" +
      "1. TENES ACCESO TOTAL a los datos del estudiante listados arriba. Cuando te pregunten por materias, promedio, eventos, sesiones, responde con estos datos REALES. NUNCA digas que no tenes acceso o que son 0 si arriba dice otra cosa.\n" +
      "2. NOMBRES ABREVIADOS: algebra = Algebra y Geometria Analitica, analisis 1 = Analisis Matematico I, ingles 2 = Ingles II, fisica = Fisica I o II, sintaxis = Sintaxis y Semantica de los Lenguajes, paradigmas = Paradigmas de Programacion, so = Sistemas Operativos, aed = Algoritmo y Estructura de Datos. Los numeros 1,2,3 equivalen a I,II,III. Busca la materia mas parecida.\n" +
      "3. Si el usuario pide una ACCION, USA la herramienta correspondiente directamente.\n" +
      "4. Para 'maniana', calcula la fecha exacta.\n" +
      "5. Responde siempre en Espaniol Argentino.";

    const tools = [
      { type: "function", function: { name: "create_calendar_event", description: "Crea evento en calendario", parameters: { type: "object", properties: { titulo: { type: "string" }, fecha: { type: "string", description: "YYYY-MM-DD" }, hora: { type: "string" }, tipo_examen: { type: "string", enum: VALID_EVENT_TYPES }, notas: { type: "string" }, subject_id: { type: "string", description: "Nombre de la materia" } }, required: ["titulo", "fecha", "tipo_examen"] } } },
      { type: "function", function: { name: "delete_calendar_event", description: "Elimina evento por ID", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },
      { type: "function", function: { name: "update_calendar_event", description: "Modifica evento", parameters: { type: "object", properties: { id: { type: "string" }, titulo: { type: "string" }, fecha: { type: "string" }, hora: { type: "string" }, tipo_examen: { type: "string", enum: VALID_EVENT_TYPES }, notas: { type: "string" } }, required: ["id"] } } },
      { type: "function", function: { name: "create_flashcards", description: "Crea mazo de flashcards directamente sin pedir confirmacion", parameters: { type: "object", properties: { deck_name: { type: "string" }, subject_id: { type: "string", description: "Nombre de la materia" }, cards: { type: "array", items: { type: "object", properties: { pregunta: { type: "string" }, respuesta: { type: "string" } }, required: ["pregunta", "respuesta"] } } }, required: ["deck_name", "cards"] } } },
      { type: "function", function: { name: "update_subject_status", description: "Cambia estado de materia", parameters: { type: "object", properties: { subject_id: { type: "string", description: "Nombre de la materia" }, estado: { type: "string", enum: ["sin_cursar", "en_curso", "regular", "aprobada", "libre"] }, nota: { type: "number" } }, required: ["subject_id", "estado"] } } },
      { type: "function", function: { name: "create_notion_document", description: "Crea documento en Notion", parameters: { type: "object", properties: { titulo: { type: "string" }, contenido: { type: "string" }, subject_id: { type: "string" } }, required: ["titulo"] } } },
      { type: "function", function: { name: "search_library", description: "Busca archivos", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } }
    ];

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const geminiContents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    })).filter((m: any) => m.role !== "system");

    let content = "";
    let toolCall: any = null;
    let provider = "";
    const errors: string[] = [];

    if (GEMINI_API_KEY) {
      // DYNAMICALLY FETCH MODELS 
      const availableModels = await getAvailableGeminiModels(GEMINI_API_KEY);
      const models = availableModels.length > 0 ? availableModels : ["gemini-1.5-flash-8b", "gemini-1.5-flash-latest"];
      console.log("[AI] Dynamically selected models:", models);

      for (const model of models) {
        try {
          const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + GEMINI_API_KEY;
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: geminiContents,
              system_instruction: { parts: [{ text: sysPrompt }] },
              tools: [{ function_declarations: tools.map(t => t.function) }],
              generationConfig: { maxOutputTokens: 2048 }
            })
          });
          const status = res.status;
          if (res.ok) {
            const data = await res.json();
            const c = data.candidates && data.candidates[0];
            if (c && c.content && c.content.parts) {
              for (const part of c.content.parts) {
                if (part.text) content += part.text;
                if (part.functionCall) toolCall = part.functionCall;
              }
            }
            provider = "gemini";
            console.log("[AI] OK model:" + model + " text:" + (content.length > 0) + " tool:" + (!!toolCall));
            break;
          } else {
            const errBody = await res.text();
            errors.push(model + ":" + status); // only save code to avoid leaking huge strings
            console.error("[AI] " + model + " failed:", status, errBody.slice(0, 300));
            // if 429 quota limit, we skip immediately to Lovable instead of trying all local variants with same key
            if (status === 429) break;
          }
        } catch (e: any) {
          errors.push(model + ":" + (e.message || String(e)));
          console.error("[AI] " + model + " exception:", e.message || e);
        }
      }
    } else {
      errors.push("No GEMINI_API_KEY");
      console.error("[AI] No GEMINI_API_KEY set");
    }

    if (!provider && LOVABLE_API_KEY) {
      const models = ["google/gemini-2.0-flash-lite", "google/gemini-1.5-flash", "openai/gpt-4o-mini"];
      for (const model of models) {
        try {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: "Bearer " + LOVABLE_API_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ model: model, messages: [{ role: "system", content: sysPrompt }, ...messages], tools: tools, stream: false })
          });
          if (res.ok) {
            const data = await res.json();
            const msg = data.choices && data.choices[0] && data.choices[0].message;
            if (msg) {
              if (msg.content) content = msg.content;
              if (msg.tool_calls && msg.tool_calls[0]) {
                const tc = msg.tool_calls[0];
                toolCall = { name: tc.function.name, args: JSON.parse(tc.function.arguments) };
              }
            }
            provider = "lovable";
            console.log("[AI] Lovable OK:" + model);
            break;
          } else {
            const errBody = await res.text();
            errors.push("lovable-" + model + ":" + res.status);
            console.error("[AI] Lovable " + model + " failed:", res.status, errBody.slice(0, 200));
          }
        } catch (e: any) {
          errors.push("lovable-" + model + ":" + (e.message || String(e)));
        }
      }
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

      if (fn === "create_calendar_event") {
        const tipo = mapET(args.tipo_examen || "Otro");
        const sid = resolveId(args.subject_id);
        const { data, error } = await serviceClient.from("calendar_events").insert({
          user_id: userId, titulo: args.titulo, fecha: args.fecha, hora: args.hora || null,
          tipo_examen: tipo, color: colorFor(tipo), notas: args.notas || null, subject_id: sid
        }).select().single();
        content += error ? "\nError: " + error.message : "\nEvento \"" + data.titulo + "\" agendado para " + data.fecha + (data.hora ? " a las " + data.hora : "") + ".";
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
        const { data: deck, error } = await serviceClient.from("flashcard_decks").insert({
          user_id: userId, nombre: args.deck_name, total_cards: (args.cards || []).length, subject_id: sid
        }).select().single();
        if (deck && args.cards) {
          await serviceClient.from("flashcards").insert(args.cards.map((c: any) => ({ deck_id: deck.id, user_id: userId, pregunta: c.pregunta, respuesta: c.respuesta })));
          content += "\nMazo \"" + deck.nombre + "\" creado con " + args.cards.length + " cartas.";
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
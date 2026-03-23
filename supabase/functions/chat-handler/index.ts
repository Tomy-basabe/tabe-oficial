import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const VALID_EVENT_TYPES = ['P1', 'P2', 'Global', 'Final', 'Recuperatorio P1', 'Recuperatorio P2', 'Recuperatorio Global', 'Estudio'] as const;
type ValidEventType = typeof VALID_EVENT_TYPES[number];

function mapEventType(aiType: string): ValidEventType {
  const typeMap: Record<string, ValidEventType> = {
    'parcial1': 'P1', 'p1': 'P1', 'parcial2': 'P2', 'p2': 'P2',
    'global': 'Global', 'final': 'Final', 'estudio': 'Estudio', 'consulta': 'Estudio',
    'recuperatorio': 'Recuperatorio P1'
  };
  return typeMap[aiType.toLowerCase().trim()] || 'Estudio';
}

function getColorForType(tipo: ValidEventType): string {
  const colors: Record<ValidEventType, string> = {
    'P1': "#00d9ff", 'P2': "#a855f7", 'Global': "#fbbf24", 'Final': "#22c55e",
    'Recuperatorio P1': "#ef4444", 'Recuperatorio P2': "#ef4444", 'Recuperatorio Global': "#ef4444", 'Estudio': "#6b7280",
  };
  return colors[tipo] || "#00d9ff";
}

serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);


    const body = await req.json();
    let platform: 'telegram' | 'whatsapp' | null = null;
    let senderId: string | null = null;
    let text: string | null = null;

    if (body.message && body.message.chat) {
      platform = 'telegram';
      senderId = body.message.chat.id.toString();
      text = body.message.text;
    } else if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      platform = 'whatsapp';
      const msg = body.entry[0].changes[0].value.messages[0];
      senderId = msg.from;
      text = msg.text?.body;
    }

    if (!platform || !senderId || !text) return new Response("OK");

    const { data: botUser } = await supabase
      .from('user_bots')
      .select('user_id')
      .eq(platform === 'telegram' ? 'telegram_id' : 'whatsapp_number', senderId)
      .maybeSingle();

    if (!botUser) {
      const linkingCodeMatch = text.trim().match(/^\d{6}$/);
      if (linkingCodeMatch) {
        const { data: linkRequest } = await supabase.from('user_bots').select('user_id').eq('linking_code', linkingCodeMatch[0]).gt('linking_expires_at', new Date().toISOString()).maybeSingle();
        if (!linkRequest) return sendMessage(platform, senderId, "❌ Código inválido.").then(() => new Response("OK"));
        
        const updateData: any = { linking_code: null, linking_expires_at: null };
        if (platform === 'telegram') updateData.telegram_id = senderId;
        else updateData.whatsapp_number = senderId;
        
        await supabase.from('user_bots').update(updateData).eq('user_id', linkRequest.user_id);
        return sendMessage(platform, senderId, "✅ Vinculado exitosamente! Ya podés pedirme que gestione tus eventos, notas o consultas.").then(() => new Response("OK"));
      }
      return sendMessage(platform, senderId, "👋 ¡Hola! Soy el nuevo Tabe AI. Entrá a tu cuenta de T.A.B.E. > Configuración > Asistente Virtual y pasame el código de 6 dígitos que ahí te aparece.").then(() => new Response("OK"));
    }

    const userId = botUser.user_id;

    // Fetch Full Academic Context
    const [subjectsRes, subjectStatusRes, eventsRes, profilesRes, statsRes] = await Promise.all([
      supabase.from("subjects").select("id, nombre, año"),
      supabase.from("user_subject_status").select("subject_id, estado, nota").eq("user_id", userId),
      supabase.from("calendar_events").select("id, titulo, fecha, tipo_examen").eq("user_id", userId).gte("fecha", new Date().toISOString().split("T")[0]).order('fecha').limit(20),
      supabase.from("profiles").select("nombre").eq("id", userId).single(),
      supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle()
    ]);

    const subjects = subjectsRes.data || [];
    const statusMap = new Map((subjectStatusRes.data || []).map(s => [s.subject_id, s]));
    
    const enrichedSubjects = subjects
      .filter(s => statusMap.has(s.id))
      .map(s => {
        const st = statusMap.get(s.id);
        return `${s.nombre} - Estado: ${st?.estado || 'sin_cursar'} - Nota: ${st?.nota || '-'}`;
      });

    const events = (eventsRes.data || []).map(e => `${e.fecha} [ID: ${e.id}]: ${e.titulo} (${e.tipo_examen})`);
    const userName = profilesRes.data?.nombre || "Estudiante";
    const stats = statsRes.data || { nivel: 1, xp_total: 0, racha_actual: 0, horas_estudio_total: 0 };

    const systemPrompt = `Sos TABE AI (@tabeai_bot), el gestor total de la vida académica de ${userName}.
      Tenés acceso completo a su base de datos y podés gestionar todo a través de herramientas.
      
      -- CONTEXTO --
      Métricas: Nivel ${stats.nivel}, XP: ${stats.xp_total}, Racha: ${stats.racha_actual} días, Horas de estudio totales: ${stats.horas_estudio_total}.
      
      Próximos eventos (exámenes/estudio/consultas):
      ${events.length ? events.join("\\n") : "Ninguno."}
      
      Estado de las materias:
      ${enrichedSubjects.join("\\n")}
      
      -- INSTRUCCIONES --
      1. Entendé el lenguaje natural (ej. "Aprobé Sistemas con 9", "Agendame una consulta para mañana", "Estudié 2 horas").
      2. LLAMÁ DIRECTAMENTE A LAS HERRAMIENTAS (tools) para ejecutar lo que pida el usuario. NO SIMULES, EJECUTÁ utilizando function calls.
      3. Sé cálido, amigable, conciso y felicitá o alentá cuando sea oportuno. Usa Emojis.
      4. Si el usuario te pide agendar, modificar o referirse a una materia, pasa el NOMBRE de la materia como 'subject_id' si no tienes su ID.
      5. Las consultas y tutorías se guardan como 'create_calendar_event' con tipo 'Estudio'. Explica en el título qué es la consulta.
    `;

    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1024,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: text }],
        tools: [
          {
            type: "function",
            function: {
              name: "create_calendar_event",
              description: "Agrega un examen, sesión de estudio, o consulta al calendario. Úsalo para agendar eventos futuros.",
              parameters: {
                type: "object",
                properties: {
                  titulo: { type: "string", description: "El título claro del evento" },
                  fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
                  tipo: { type: "string", enum: ["P1", "P2", "Global", "Final", "Estudio"], description: "Usa Estudio para consultas o tutorías" },
                  subject_id: { type: "string", description: "Nombre de la materia" }
                },
                required: ["titulo", "fecha", "tipo"],
                additionalProperties: false
              }
            }
          },
          {
            type: "function",
            function: {
              name: "delete_calendar_event",
              description: "Elimina un evento del calendario dada su ID (sácala del contexto de Próximos eventos).",
              parameters: {
                type: "object",
                properties: {
                  event_id: { type: "string", description: "UUID del evento a eliminar" }
                },
                required: ["event_id"],
                additionalProperties: false
              }
            }
          },
          {
            type: "function",
            function: {
              name: "log_study_session",
              description: "Registra horas o minutos de estudio para sumar a las métricas e incrementar la XP/Racha.",
              parameters: {
                type: "object",
                properties: {
                  duracion_minutos: { type: "number", description: "Minutos de estudio reportados" },
                  subject_id: { type: "string", description: "ID de la materia (opcional)" }
                },
                required: ["duracion_minutos"],
                additionalProperties: false
              }
            }
          },
          {
            type: "function",
            function: {
              name: "update_subject_status",
              description: "Actualiza el estado y/o nota final de una materia (Aprobada, Regular, Libre).",
              parameters: {
                type: "object",
                properties: {
                  subject_id: { type: "string", description: "Nombre exacto o UUID de la materia" },
                  estado: { type: "string", enum: ["aprobada", "regular", "libre", "cursable", "sin_cursar"] },
                  nota: { type: "number", description: "Nota final entre 1 y 10 (opcional)" }
                },
                required: ["subject_id", "estado"],
                additionalProperties: false
              }
            }
          }
        ]
      })
    });

    if (!aiRes.ok) {
        const errorText = await aiRes.text();
        console.error("AI Gateway Error:", errorText);
        await sendMessage(platform, senderId, "❌ Error en el cerebro de LA IA:\\n" + errorText);
        return new Response("OK");
    }

    const aiData = await aiRes.json();
    const choice = aiData.choices?.[0];

    if (choice?.message?.tool_calls?.length > 0) {
      let actionResponseMsg = "";
      
      const resolveSubjectId = (nameOrId: string | null | undefined): string | null => {
        if (!nameOrId) return null;
        if (nameOrId.includes("-") && nameOrId.length > 20) return nameOrId;
        const normalized = nameOrId.toLowerCase().trim();
        const found = subjects.find(s => s.nombre.toLowerCase().includes(normalized));
        return found ? found.id : null;
      };

      for (const toolCall of choice.message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        
        switch (toolCall.function.name) {
          case "create_calendar_event": {
            const mappedType = mapEventType(args.tipo);
            const { error: insError } = await supabase.from("calendar_events").insert({
              user_id: userId,
              titulo: args.titulo,
              fecha: args.fecha,
              tipo_examen: mappedType,
              subject_id: resolveSubjectId(args.subject_id),
              color: getColorForType(mappedType)
            });
            if (!insError) {
              actionResponseMsg += `✅ **Agendado:** ${args.titulo} para el ${args.fecha}\\n`;
            } else {
              console.error(insError);
              actionResponseMsg += `❌ Error al agendar ${args.titulo}\\n`;
            }
            break;
          }
          case "delete_calendar_event": {
            const { error: delError } = await supabase.from("calendar_events").delete().eq("id", args.event_id).eq("user_id", userId);
            if (!delError) {
              actionResponseMsg += `🗑️ **Evento eliminado correctamente.**\\n`;
            } else {
              console.error(delError);
              actionResponseMsg += `❌ Error al eliminar evento.\\n`;
            }
            break;
          }
          case "log_study_session": {
            const duracionSegundos = args.duracion_minutos * 60;
            const { error: logError } = await supabase.from("study_sessions").insert({
              user_id: userId,
              duracion_segundos: duracionSegundos,
              fecha: new Date().toISOString(),
              tipo: 'focus',
              subject_id: resolveSubjectId(args.subject_id)
            });
            // Also need to manually update user_stats in this basic script, although DB triggers might handle XP
            // Currently assuming DB simple triggers handles the xp calculation from new study_sessions
            if (!logError) {
              actionResponseMsg += `⏱️ **Estudio registrado:** +${args.duracion_minutos} minutos añadidos a tus métricas. ¡Sigue así! 🚀\\n`;
            }
            break;
          }
          case "update_subject_status": {
            const resolvedId = resolveSubjectId(args.subject_id);
            if (!resolvedId) {
               actionResponseMsg += `❌ No pude encontrar la materia '${args.subject_id}'.\n`;
               break;
            }
            const upsertData: any = { user_id: userId, subject_id: resolvedId, estado: args.estado };
            if (args.nota !== undefined) upsertData.nota = args.nota;
            
            const { error: statError } = await supabase.from("user_subject_status").upsert(upsertData, { onConflict: "user_id,subject_id" });
            if (!statError) {
              actionResponseMsg += `🎓 **Materia actualizada:** Ahora estás en estado '${args.estado}'${args.nota ? ` con nota ${args.nota}` : ''}. ¡Felicitaciones! 🎉\\n`;
            } else {
               actionResponseMsg += `❌ Error al actualizar materia.\\n`;
            }
            break;
          }
        }
      }
      
      // Enviar la respuesta procesada
      if (actionResponseMsg !== "") {
         await sendMessage(platform, senderId, actionResponseMsg);
         return new Response("OK");
      }
    }

    // SI LA IA NO LLAMÓ A NINUNA HERRAMIENTA, RETORNAMOS LO QUE DIJO
    await sendMessage(platform, senderId, choice?.message?.content || "¿En qué te puedo ayudar con tus materias y agenda? 🎓");
    return new Response("OK");
  } catch (err) {
    console.error(err);
    return new Response("Error", { status: 500 });
  }
});

async function sendMessage(platform: 'telegram' | 'whatsapp', to: string, text: string) {
  if (platform === 'telegram') {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "8673034996:AAGWgOMtgwulbfMs-GtZ-r564KRM-YyMB-k";
    const cleanText = text.replace(/\\\\n/g, "\\n");
    
    // Attempt 1: With Markdown parsing
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: to, text: cleanText, parse_mode: "Markdown" })
    });
    
    // Si falla por culpa del parse_mode (ej. caracteres reservados no cerrados), intentar como texto puro
    if (!res.ok) {
      console.warn("Markdown failed, sending plain text. Reason:", await res.text());
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: to, text: cleanText })
      });
    }
  }
}

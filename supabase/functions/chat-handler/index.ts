import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "8673034996:AAGWgOMtgwulbfMs-GtZ-r564KRM-YyMB-k";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const VALID_EVENT_TYPES = ['P1', 'P2', 'Global', 'Final', 'Recuperatorio P1', 'Recuperatorio P2', 'Recuperatorio Global', 'Estudio'] as const;
type ValidEventType = typeof VALID_EVENT_TYPES[number];

function mapEventType(aiType: string): ValidEventType {
  const typeMap: Record<string, ValidEventType> = {
    'parcial1': 'P1', 'p1': 'P1', 'parcial2': 'P2', 'p2': 'P2',
    'global': 'Global', 'final': 'Final', 'estudio': 'Estudio',
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
        return sendMessage(platform, senderId, "✅ Vinculado!").then(() => new Response("OK"));
      }
      return sendMessage(platform, senderId, "👋 Vinculá tu cuenta en Configuración > Asistente Virtual.").then(() => new Response("OK"));
    }

    const userId = botUser.user_id;

    // Fetch Academic Context
    const [subjectsRes, eventsRes, profilesRes] = await Promise.all([
      supabase.from("subjects").select("id, nombre, año"),
      supabase.from("calendar_events").select("titulo, fecha, tipo_examen").eq("user_id", userId).gte("fecha", new Date().toISOString().split("T")[0]).limit(10),
      supabase.from("profiles").select("nombre").eq("id", userId).single()
    ]);

    const subjects = subjectsRes.data || [];
    const events = eventsRes.data || [];
    const userName = profilesRes.data?.nombre || "Estudiante";

    const systemPrompt = `Sos el asistente de T.A.B.E. para ${userName}.
      Materias: ${subjects.map(s => `${s.nombre} (ID: ${s.id})`).join(", ")}
      Eventos: ${events.map(e => `${e.fecha}: ${e.titulo}`).join(", ")}
      INSTRUCCIONES:
      - Sé breve. Usá emojis.
      - Si el usuario menciona una materia, usá su ID de la lista.
      - Para agendar, usá 'create_calendar_event'.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: text }],
        tools: [{
          type: "function",
          function: {
            name: "create_calendar_event",
            description: "Agrega un examen o sesión de estudio.",
            parameters: {
              type: "object",
              properties: {
                titulo: { type: "string" },
                fecha: { type: "string", description: "YYYY-MM-DD" },
                tipo: { type: "string", enum: ["P1", "P2", "Global", "Final", "Estudio"] },
                subject_id: { type: "string" }
              },
              required: ["titulo", "fecha", "tipo"]
            }
          }
        }]
      })
    });

    const aiData = await aiRes.json();
    const choice = aiData.choices?.[0];

    if (choice?.message?.tool_calls?.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      if (toolCall.function.name === "create_calendar_event") {
        const args = JSON.parse(toolCall.function.arguments);
        const mappedType = mapEventType(args.tipo);
        const { error: insError } = await supabase.from("calendar_events").insert({
          user_id: userId,
          titulo: args.titulo,
          fecha: args.fecha,
          tipo_examen: mappedType,
          subject_id: args.subject_id || null,
          color: getColorForType(mappedType)
        });

        if (insError) return sendMessage(platform, senderId, "❌ Error al agendar.").then(() => new Response("OK"));
        return sendMessage(platform, senderId, `✅ Agendado: ${args.titulo} para el ${args.fecha}`).then(() => new Response("OK"));
      }
    }

    await sendMessage(platform, senderId, choice?.message?.content || "No entiendo.");
    return new Response("OK");
  } catch (err) {
    console.error(err);
    return new Response("Error", { status: 500 });
  }
});

async function sendMessage(platform: 'telegram' | 'whatsapp', to: string, text: string) {
  if (platform === 'telegram') {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: to, text: text, parse_mode: "Markdown" })
    });
  }
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_EVENT_TYPES = ['P1', 'P2', 'Global', 'Final', 'Recuperatorio P1', 'Recuperatorio P2', 'Recuperatorio Global', 'Estudio'] as const;
type ValidEventType = typeof VALID_EVENT_TYPES[number];
type AIPersonality = "motivador" | "exigente" | "debatidor" | "profe_injusto" | "te_van_a_bochar";

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

function getPersonalityPrompt(personality: AIPersonality): string {
  const prompts: Record<AIPersonality, string> = {
    motivador: `PERSONALIDAD: Sos un coach motivador y alentador.
- Celebrá cada logro del usuario, por pequeño que sea
- Usá refuerzo positivo constantemente
- Usá emojis motivadores: 🌟💪🎯🔥✨`,
    exigente: `PERSONALIDAD: Sos un profesor exigente pero justo.
- Esperás excelencia, no aceptás respuestas mediocres
- Corregís errores de forma directa pero respetuosa`,
    debatidor: `PERSONALIDAD: Sos un debatidor socrático.
- Cuestioná TODO lo que dice el usuario
- Si su razonamiento es débil, destruilo (educativamente)`,
    profe_injusto: `PERSONALIDAD: Sos el profesor más exigente que existe.
- Evaluás MÁS DURO que cualquier cátedra real
- Nunca estás 100% satisfecho`,
    te_van_a_bochar: `PERSONALIDAD: Modo crisis total, realidad cruda.
- SIN FILTROS. Decí la verdad aunque duela.
- El objetivo es generar REACCIÓN y ACCIÓN`,
  };
  return prompts[personality] || prompts.motivador;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId, personality = "motivador" } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user context (simplified for streaming)
    const [subjectsResult, userSubjectStatusResult, existingEventsResult, userStatsResult] = await Promise.all([
      supabase.from("subjects").select("id, nombre, codigo, ano:año"),
      supabase.from("user_subject_status").select("*").eq("user_id", userId),
      supabase.from("calendar_events").select("titulo, fecha, tipo_examen, hora").eq("user_id", userId)
        .gte("fecha", new Date().toISOString().split("T")[0]).order("fecha", { ascending: true }).limit(10),
      supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const subjects = subjectsResult.data as Array<{ id: string; nombre: string; codigo: string; ano: number }> | null;
    const userSubjectStatus = userSubjectStatusResult.data;
    const existingEvents = existingEventsResult.data;
    const userStats = userStatsResult.data;

    const subjectsWithStatus = subjects?.map(s => {
      const status = userSubjectStatus?.find((us: { subject_id: string }) => us.subject_id === s.id);
      return { ...s, estado: status?.estado || "sin_cursar" };
    }) || [];

    const aprobadas = subjectsWithStatus.filter(s => s.estado === "aprobada").length;
    const totalMaterias = subjects?.length || 0;

    const subjectsList = subjectsWithStatus.map(s => 
      `${s.nombre} (${s.codigo}) - ID: ${s.id}`
    ).join("\n");

    const eventsList = existingEvents?.map(e => 
      `📅 ${e.fecha} - ${e.titulo} (${e.tipo_examen})`
    ).join("\n") || "Sin eventos";

    const personalityPrompt = getPersonalityPrompt(personality as AIPersonality);
    const todayStr = new Date().toISOString().split("T")[0];

    const systemPrompt = `Sos T.A.B.E. IA, asistente académico de Ingeniería en Sistemas.

${personalityPrompt}

PROGRESO: ${aprobadas}/${totalMaterias} materias aprobadas | Nivel: ${userStats?.nivel || 1}

MATERIAS:
${subjectsList}

EVENTOS:
${eventsList}

FECHA: ${todayStr}

CAPACIDADES: Explicar temas, simulacros, planes de estudio, agendar eventos, generar flashcards.
Respondé siempre en español argentino.`;

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
              fecha: { type: "string", description: "YYYY-MM-DD" },
              hora: { type: "string", description: "HH:MM (opcional)" },
              tipo_examen: { type: "string", enum: VALID_EVENT_TYPES },
              notas: { type: "string" },
              subject_id: { type: "string" }
            },
            required: ["titulo", "fecha", "tipo_examen"],
            additionalProperties: false
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_flashcards",
          description: "Genera un mazo de flashcards.",
          parameters: {
            type: "object",
            properties: {
              deck_name: { type: "string" },
              description: { type: "string" },
              subject_id: { type: "string" },
              cards: {
                type: "array",
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
            required: ["deck_name", "cards"],
            additionalProperties: false
          }
        }
      }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools,
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    // Stream the response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    let toolCalls: Array<{ id: string; function: { name: string; arguments: string } }> = [];
    let accumulatedArgs = "";
    let currentToolName = "";

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            // Handle tool calls if any
            if (toolCalls.length > 0) {
              const toolCall = toolCalls[0];
              let result;

              if (toolCall.function.name === "create_calendar_event") {
                const eventData = JSON.parse(toolCall.function.arguments);
                const mappedType = mapEventType(eventData.tipo_examen);
                
                const { data: newEvent, error } = await supabase
                  .from("calendar_events")
                  .insert({
                    user_id: userId,
                    titulo: eventData.titulo,
                    fecha: eventData.fecha,
                    hora: eventData.hora || null,
                    tipo_examen: mappedType,
                    notas: eventData.notas || null,
                    subject_id: eventData.subject_id || null,
                    color: getColorForType(mappedType),
                  })
                  .select()
                  .single();

                if (error) {
                  result = { tool_result: true, content: `Error al crear evento: ${error.message}` };
                } else {
                  const fechaFormateada = new Date(eventData.fecha + "T12:00:00").toLocaleDateString("es-AR", {
                    weekday: "long", day: "numeric", month: "long"
                  });
                  result = {
                    tool_result: true,
                    content: `✅ **Evento agendado:**\n\n📌 **${eventData.titulo}**\n📅 ${fechaFormateada}${eventData.hora ? `\n⏰ ${eventData.hora}` : ""}`,
                    event_created: newEvent
                  };
                }
              } else if (toolCall.function.name === "create_flashcards") {
                const flashcardData = JSON.parse(toolCall.function.arguments);
                
                const { data: newDeck, error: deckError } = await supabase
                  .from("flashcard_decks")
                  .insert({
                    user_id: userId,
                    nombre: flashcardData.deck_name,
                    description: flashcardData.description || null,
                    subject_id: flashcardData.subject_id || subjects?.[0]?.id || null,
                    total_cards: flashcardData.cards.length,
                    is_public: false,
                  })
                  .select()
                  .single();

                if (deckError) {
                  result = { tool_result: true, content: `Error al crear mazo: ${deckError.message}` };
                } else {
                  const flashcardsToInsert = flashcardData.cards.map((card: { pregunta: string; respuesta: string }) => ({
                    deck_id: newDeck.id,
                    user_id: userId,
                    pregunta: card.pregunta,
                    respuesta: card.respuesta,
                  }));

                  await supabase.from("flashcards").insert(flashcardsToInsert);

                  result = {
                    tool_result: true,
                    content: `🃏 **¡Mazo creado!**\n\n📚 **${flashcardData.deck_name}**\n📝 ${flashcardData.cards.length} tarjetas generadas`,
                    flashcards_created: { deck: newDeck, cards_count: flashcardData.cards.length }
                  };
                }
              }

              if (result) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            continue;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            
            // Handle tool calls
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (tc.function?.name) {
                  currentToolName = tc.function.name;
                  toolCalls = [{ id: tc.id || "0", function: { name: currentToolName, arguments: "" } }];
                }
                if (tc.function?.arguments) {
                  accumulatedArgs += tc.function.arguments;
                  if (toolCalls.length > 0) {
                    toolCalls[0].function.arguments = accumulatedArgs;
                  }
                }
              }
              continue; // Don't forward tool call chunks
            }

            // Forward regular content
            if (delta?.content) {
              controller.enqueue(encoder.encode(`data: ${jsonStr}\n\n`));
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    });

    return new Response(response.body?.pipeThrough(transformStream), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("AI streaming error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

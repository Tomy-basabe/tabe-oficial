import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Valid event types matching the database constraint
const VALID_EVENT_TYPES = ['P1', 'P2', 'Global', 'Final', 'Recuperatorio P1', 'Recuperatorio P2', 'Recuperatorio Global', 'Estudio'] as const;
type ValidEventType = typeof VALID_EVENT_TYPES[number];

const VALID_PERSONALITIES = ['motivador', 'exigente', 'debatidor', 'profe_injusto', 'te_van_a_bochar'] as const;
type AIPersonality = typeof VALID_PERSONALITIES[number];

interface CalendarEvent {
  titulo: string;
  fecha: string;
  hora?: string;
  tipo_examen: ValidEventType;
  notas?: string;
  subject_id?: string;
}

// Map AI-friendly types to database valid types
function mapEventType(aiType: string): ValidEventType {
  const typeMap: Record<string, ValidEventType> = {
    'parcial1': 'P1',
    'parcial 1': 'P1',
    'p1': 'P1',
    'primer parcial': 'P1',
    'parcial2': 'P2',
    'parcial 2': 'P2',
    'p2': 'P2',
    'segundo parcial': 'P2',
    'global': 'Global',
    'final': 'Final',
    'recuperatorio': 'Recuperatorio P1',
    'recuperatorio p1': 'Recuperatorio P1',
    'recuperatorio p2': 'Recuperatorio P2',
    'recuperatorio global': 'Recuperatorio Global',
    'estudio': 'Estudio',
  };
  
  const normalizedType = aiType.toLowerCase().trim();
  return typeMap[normalizedType] || 'Estudio';
}

function getColorForType(tipo: ValidEventType): string {
  const colors: Record<ValidEventType, string> = {
    'P1': "#00d9ff",
    'P2': "#a855f7",
    'Global': "#fbbf24",
    'Final': "#22c55e",
    'Recuperatorio P1': "#ef4444",
    'Recuperatorio P2': "#ef4444",
    'Recuperatorio Global': "#ef4444",
    'Estudio': "#6b7280",
  };
  return colors[tipo] || "#00d9ff";
}

// Get personality-specific system prompt
function getPersonalityPrompt(personality: AIPersonality): string {
  const prompts: Record<AIPersonality, string> = {
    motivador: `PERSONALIDAD: Sos un coach motivador y alentador.
- Celebrá cada logro del usuario, por pequeño que sea
- Usá refuerzo positivo constantemente
- Cuando el usuario se equivoca, reformulá constructivamente
- Usá emojis motivadores: 🌟💪🎯🔥✨
- Frases como "¡Excelente!", "¡Vas muy bien!", "¡Eso es!"
- Si el usuario está frustrado, motivalo a seguir
- Siempre cerrá con algo positivo`,

    exigente: `PERSONALIDAD: Sos un profesor exigente pero justo.
- Esperás excelencia, no aceptás respuestas mediocres
- Corregís errores de forma directa pero respetuosa
- Si algo está mal, decilo claramente: "Esto está mal porque..."
- No des las respuestas fácil, guiá al alumno a descubrirlas
- Usá frases como "Podés hacerlo mejor", "Repensá esto"
- Reconocé cuando algo está bien hecho, pero no exageres
- Siempre pedí que el alumno justifique sus respuestas`,

    debatidor: `PERSONALIDAD: Sos un debatidor socrático.
- Cuestioná TODO lo que dice el usuario
- Si su razonamiento es débil, destruilo (educativamente)
- Preguntá "¿Por qué?" constantemente
- Usá contra-ejemplos para desafiar sus ideas
- Frases como "¿Estás seguro?", "¿Y si...?", "Demostralo"
- No aceptes "porque sí" como respuesta
- Obligá al usuario a defender sus posiciones
- Si el usuario tiene razón, reconocelo pero seguí cuestionando desde otro ángulo`,

    profe_injusto: `PERSONALIDAD: Sos el profesor más exigente que existe.
- Evaluás MÁS DURO que cualquier cátedra real
- Buscás errores en TODO, hasta en lo correcto
- "Esto está bien, pero podrías haberlo explicado mejor"
- Nunca estás 100% satisfecho
- Si el usuario aprueba con vos, el final real es un paseo
- Usá frases como "En mi mesa te bochan con esto"
- Poné situaciones extremas de examen
- Pero siempre explicá POR QUÉ sos tan exigente: preparar mejor`,

    te_van_a_bochar: `PERSONALIDAD: Modo crisis total, realidad cruda.
- SIN FILTROS. Decí la verdad aunque duela.
- "Con este nivel de preparación, te bochan"
- Mostrá escenarios reales de qué pasa si no estudia
- Calculá cuánto tiempo falta y si es suficiente
- Usá datos concretos del usuario para mostrar la realidad
- "Tenés X materias atrasadas, Y exámenes cerca"
- NO seas cruel, pero sí DIRECTO
- El objetivo es generar REACCIÓN y ACCIÓN
- Después del shock, dá un plan concreto para mejorar`,
  };

  return prompts[personality] || prompts.motivador;
}

// Validate input length limits
function validateInputs(messages: unknown[], personality: string): void {
  if (!Array.isArray(messages)) {
    throw new Error("Invalid messages format");
  }
  if (messages.length > 50) {
    throw new Error("Too many messages");
  }
  for (const msg of messages) {
    if (typeof msg !== 'object' || msg === null) {
      throw new Error("Invalid message format");
    }
    const m = msg as { content?: unknown };
    if (typeof m.content === 'string' && m.content.length > 10000) {
      throw new Error("Message too long");
    }
  }
  if (!VALID_PERSONALITIES.includes(personality as AIPersonality)) {
    throw new Error("Invalid personality");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify authenticated user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Create client with user's auth token to verify identity
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the token and get the authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Use the authenticated user's ID - IGNORE any client-supplied userId
    const userId = claimsData.claims.sub as string;
    
    const { messages, personality = "motivador" } = await req.json();
    
    // Validate inputs
    validateInputs(messages, personality);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Use service role for read operations (fetching context)
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch comprehensive user data for context
    const subjectsResult = await supabase.from("subjects").select("id, nombre, codigo, ano:año");
    const userSubjectStatusResult = await supabase.from("user_subject_status").select("*").eq("user_id", userId);
    const existingEventsResult = await supabase.from("calendar_events")
      .select("titulo, fecha, tipo_examen, hora")
      .eq("user_id", userId)
      .gte("fecha", new Date().toISOString().split("T")[0])
      .order("fecha", { ascending: true })
      .limit(20);
    const userStatsResult = await supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle();
    const studySessionsResult = await supabase.from("study_sessions")
      .select("fecha, duracion_segundos, tipo, subject_id")
      .eq("user_id", userId)
      .order("fecha", { ascending: false })
      .limit(30);
    const flashcardDecksResult = await supabase.from("flashcard_decks")
      .select("id, nombre, total_cards, subject_id")
      .eq("user_id", userId);

    // Extract data
    const subjects = subjectsResult.data as Array<{ id: string; nombre: string; codigo: string; ano: number }> | null;
    const userSubjectStatus = userSubjectStatusResult.data as Array<{
      subject_id: string;
      estado: string;
      nota: number | null;
      nota_parcial_1: number | null;
      nota_parcial_2: number | null;
      nota_global: number | null;
      nota_rec_parcial_1: number | null;
      nota_rec_parcial_2: number | null;
      nota_rec_global: number | null;
    }> | null;
    const existingEvents = existingEventsResult.data as Array<{ titulo: string; fecha: string; tipo_examen: string; hora: string | null }> | null;
    const userStats = userStatsResult.data as { nivel: number; xp_total: number; racha_actual: number; mejor_racha: number; horas_estudio_total: number } | null;
    const studySessions = studySessionsResult.data as Array<{ fecha: string; duracion_segundos: number; tipo: string; subject_id: string | null }> | null;
    const flashcardDecks = flashcardDecksResult.data as Array<{ id: string; nombre: string; total_cards: number; subject_id: string | null }> | null;

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    
    // Build subject list with user status
    const subjectsWithStatus = subjects?.map(s => {
      const status = userSubjectStatus?.find(us => us.subject_id === s.id);
      return {
        ...s,
        estado: status?.estado || "sin_cursar",
        nota: status?.nota,
        notasParciales: status ? {
          p1: status.nota_parcial_1,
          p2: status.nota_parcial_2,
          global: status.nota_global,
          recP1: status.nota_rec_parcial_1,
          recP2: status.nota_rec_parcial_2,
          recGlobal: status.nota_rec_global,
        } : null,
      };
    }) || [];

    // Calculate stats
    const aprobadas = subjectsWithStatus.filter(s => s.estado === "aprobada").length;
    const regulares = subjectsWithStatus.filter(s => s.estado === "regular").length;
    const cursando = subjectsWithStatus.filter(s => s.estado === "cursable" || s.estado === "regular").length;
    const totalMaterias = subjects?.length || 0;
    
    const promedioNotas = subjectsWithStatus
      .filter(s => s.nota)
      .reduce((acc, s, _, arr) => acc + (s.nota! / arr.length), 0);
    
    // Study time this week
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const studyTimeThisWeek = studySessions
      ?.filter(s => new Date(s.fecha) >= oneWeekAgo)
      .reduce((acc, s) => acc + s.duracion_segundos, 0) || 0;
    const studyHoursThisWeek = Math.round(studyTimeThisWeek / 3600 * 10) / 10;
    
    // Upcoming events
    const upcomingExams = existingEvents?.filter(e => 
      ['P1', 'P2', 'Global', 'Final'].includes(e.tipo_examen)
    ) || [];
    
    // Format data for AI
    const subjectsList = subjectsWithStatus.map(s => {
      let statusEmoji = "⬜";
      if (s.estado === "aprobada") statusEmoji = "✅";
      else if (s.estado === "regular") statusEmoji = "🟡";
      else if (s.estado === "cursable") statusEmoji = "🔵";
      else if (s.estado === "bloqueada") statusEmoji = "🔒";
      
      let info = `${statusEmoji} ${s.nombre} (${s.codigo}) - Año ${s.ano}`;
      if (s.nota) info += ` - Nota final: ${s.nota}`;
      if (s.notasParciales?.p1) info += ` | P1: ${s.notasParciales.p1}`;
      if (s.notasParciales?.p2) info += ` | P2: ${s.notasParciales.p2}`;
      info += ` - ID: ${s.id}`;
      return info;
    }).join("\n");
    
    const eventsList = existingEvents?.map(e => 
      `📅 ${e.fecha}${e.hora ? ` ${e.hora}` : ""} - ${e.titulo} (${e.tipo_examen})`
    ).join("\n") || "Sin eventos programados";
    
    const flashcardsSummary = flashcardDecks?.map(d => 
      `📚 ${d.nombre}: ${d.total_cards} tarjetas`
    ).join("\n") || "Sin mazos creados";

    // Personality-specific prompt
    const personalityPrompt = getPersonalityPrompt(personality as AIPersonality);
    
    const systemPrompt = `Sos T.A.B.E. IA, el asistente académico de un estudiante de Ingeniería en Sistemas.

${personalityPrompt}

═══════════════════════════════════════════════
INFORMACIÓN DEL ESTUDIANTE
═══════════════════════════════════════════════

📊 RESUMEN DE PROGRESO:
- Materias aprobadas: ${aprobadas}/${totalMaterias}
- Materias regulares: ${regulares}
- Promedio general: ${promedioNotas ? promedioNotas.toFixed(2) : "N/A"}
- Nivel: ${userStats?.nivel || 1} | XP: ${userStats?.xp_total || 0}
- Racha actual: ${userStats?.racha_actual || 0} días
- Mejor racha: ${userStats?.mejor_racha || 0} días
- Horas de estudio esta semana: ${studyHoursThisWeek}h
- Total horas de estudio: ${userStats?.horas_estudio_total || 0}h

📚 MATERIAS DEL ESTUDIANTE:
${subjectsList}

📅 PRÓXIMOS EVENTOS:
${eventsList}

🃏 MAZOS DE FLASHCARDS:
${flashcardsSummary}

═══════════════════════════════════════════════
FECHA ACTUAL: ${todayStr}
═══════════════════════════════════════════════

CAPACIDADES:
1. Puedo explicar temas de cualquier materia de ingeniería
2. Puedo hacer simulacros de exámenes (parciales, finales, orales)
3. Puedo crear planes de estudio personalizados
4. Puedo agendar eventos en el calendario del usuario
5. Puedo analizar el progreso académico y dar recomendaciones
6. Puedo GENERAR FLASHCARDS automáticamente sobre temas que explico

INSTRUCCIONES PARA AGENDAR EVENTOS:
Cuando el usuario quiera agendar algo, usá la herramienta "create_calendar_event".
- Inferí la fecha según contexto ("el viernes" = próximo viernes)
- Tipos válidos: P1, P2, Global, Final, Recuperatorio P1/P2/Global, Estudio
- Si menciona una materia, usá su ID de la lista

INSTRUCCIONES PARA GENERAR FLASHCARDS:
- Cuando termines de explicar un tema, SIEMPRE preguntá: "¿Querés que te genere flashcards sobre este tema para repasar?"
- Si el usuario acepta, usá la herramienta "create_flashcards"
- Generá entre 5 y 15 flashcards dependiendo de la complejidad del tema
- Las preguntas deben ser claras y concisas
- Las respuestas deben ser completas pero no excesivamente largas
- Incluí variedad: definiciones, ejemplos, comparaciones, aplicaciones
- Si el usuario menciona una materia, asociá el mazo a esa materia

Respondé siempre en español argentino. Adaptá tu tono según tu personalidad asignada.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_calendar_event",
              description: "Crea un evento en el calendario académico del usuario. Úsalo cuando el usuario quiera agendar parciales, finales, entregas, sesiones de estudio, etc.",
              parameters: {
                type: "object",
                properties: {
                  titulo: {
                    type: "string",
                    description: "Título del evento (ej: 'Parcial 1 de Física II')"
                  },
                  fecha: {
                    type: "string",
                    description: "Fecha en formato YYYY-MM-DD"
                  },
                  hora: {
                    type: "string",
                    description: "Hora en formato HH:MM (opcional)"
                  },
                  tipo_examen: {
                    type: "string",
                    enum: ["P1", "P2", "Global", "Final", "Recuperatorio P1", "Recuperatorio P2", "Recuperatorio Global", "Estudio"],
                    description: "Tipo de evento"
                  },
                  notas: {
                    type: "string",
                    description: "Notas adicionales (opcional)"
                  },
                  subject_id: {
                    type: "string",
                    description: "ID de la materia asociada (usar los IDs de la lista de materias)"
                  }
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
              description: "Genera un mazo de flashcards sobre un tema específico. Úsalo SOLO cuando el usuario CONFIRME que quiere las flashcards después de que le preguntaste.",
              parameters: {
                type: "object",
                properties: {
                  deck_name: {
                    type: "string",
                    description: "Nombre del mazo (ej: 'Derivadas - Reglas básicas')"
                  },
                  description: {
                    type: "string",
                    description: "Descripción breve del contenido del mazo"
                  },
                  subject_id: {
                    type: "string",
                    description: "ID de la materia asociada (usar los IDs de la lista de materias si corresponde)"
                  },
                  cards: {
                    type: "array",
                    description: "Array de flashcards con pregunta y respuesta",
                    items: {
                      type: "object",
                      properties: {
                        pregunta: {
                          type: "string",
                          description: "La pregunta o concepto a memorizar"
                        },
                        respuesta: {
                          type: "string",
                          description: "La respuesta o explicación"
                        }
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
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Intenta de nuevo en unos segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados. Contacta al administrador." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Error en el servicio de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const choice = aiResponse.choices?.[0];
    
    // Check if AI wants to call a tool
    if (choice?.message?.tool_calls?.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      
      if (toolCall.function.name === "create_calendar_event") {
        const rawEventData = JSON.parse(toolCall.function.arguments);
        const mappedType = mapEventType(rawEventData.tipo_examen);
        
        // Validate event data
        if (!rawEventData.titulo || rawEventData.titulo.length > 200) {
          return new Response(JSON.stringify({ 
            content: "Error: título inválido",
            event_created: null,
            flashcards_created: null,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(rawEventData.fecha)) {
          return new Response(JSON.stringify({ 
            content: "Error: fecha inválida",
            event_created: null,
            flashcards_created: null,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Validate subject_id if provided
        let validSubjectId = null;
        if (rawEventData.subject_id) {
          const { data: subjectCheck } = await supabase
            .from("subjects")
            .select("id")
            .eq("id", rawEventData.subject_id)
            .maybeSingle();
          if (subjectCheck) {
            validSubjectId = rawEventData.subject_id;
          }
        }
        
        const eventData: CalendarEvent = {
          titulo: rawEventData.titulo.slice(0, 200),
          fecha: rawEventData.fecha,
          hora: rawEventData.hora || undefined,
          tipo_examen: mappedType,
          notas: rawEventData.notas?.slice(0, 1000),
          subject_id: validSubjectId,
        };
        
        const { data: newEvent, error: insertError } = await supabase
          .from("calendar_events")
          .insert({
            user_id: userId, // Uses authenticated user ID
            titulo: eventData.titulo,
            fecha: eventData.fecha,
            hora: eventData.hora || null,
            tipo_examen: eventData.tipo_examen,
            notas: eventData.notas || null,
            subject_id: eventData.subject_id || null,
            color: getColorForType(eventData.tipo_examen),
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating event:", insertError);
          return new Response(JSON.stringify({ 
            content: `Hubo un error al crear el evento: ${insertError.message}`,
            event_created: null,
            flashcards_created: null,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const fechaFormateada = new Date(eventData.fecha + "T12:00:00").toLocaleDateString("es-AR", {
          weekday: "long",
          day: "numeric",
          month: "long"
        });
        
        const tipoDisplay = eventData.tipo_examen === 'P1' ? 'Parcial 1' : 
                            eventData.tipo_examen === 'P2' ? 'Parcial 2' : 
                            eventData.tipo_examen;
        
        const confirmationMessage = `✅ **Evento agendado:**\n\n📌 **${eventData.titulo}**\n📅 ${fechaFormateada}${eventData.hora ? `\n⏰ ${eventData.hora}` : ""}\n🏷️ ${tipoDisplay}${eventData.notas ? `\n📝 ${eventData.notas}` : ""}\n\n¿Hay algo más en lo que pueda ayudarte?`;

        return new Response(JSON.stringify({ 
          content: confirmationMessage,
          event_created: newEvent,
          flashcards_created: null,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (toolCall.function.name === "create_flashcards") {
        const flashcardData = JSON.parse(toolCall.function.arguments) as {
          deck_name: string;
          description?: string;
          subject_id?: string;
          cards: Array<{ pregunta: string; respuesta: string }>;
        };
        
        // Validate flashcard data
        if (!flashcardData.deck_name || flashcardData.deck_name.length > 200) {
          return new Response(JSON.stringify({ 
            content: "Error: nombre del mazo inválido",
            event_created: null,
            flashcards_created: null,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!Array.isArray(flashcardData.cards) || flashcardData.cards.length === 0 || flashcardData.cards.length > 50) {
          return new Response(JSON.stringify({ 
            content: "Error: cantidad de tarjetas inválida",
            event_created: null,
            flashcards_created: null,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Validate subject_id if provided
        let validSubjectId = subjects?.[0]?.id || null;
        if (flashcardData.subject_id) {
          const { data: subjectCheck } = await supabase
            .from("subjects")
            .select("id")
            .eq("id", flashcardData.subject_id)
            .maybeSingle();
          if (subjectCheck) {
            validSubjectId = flashcardData.subject_id;
          }
        }
        
        // First, create the deck
        const { data: newDeck, error: deckError } = await supabase
          .from("flashcard_decks")
          .insert({
            user_id: userId, // Uses authenticated user ID
            nombre: flashcardData.deck_name.slice(0, 200),
            description: flashcardData.description?.slice(0, 500) || null,
            subject_id: validSubjectId,
            total_cards: flashcardData.cards.length,
            is_public: false,
          })
          .select()
          .single();

        if (deckError) {
          console.error("Error creating deck:", deckError);
          return new Response(JSON.stringify({ 
            content: `Hubo un error al crear el mazo: ${deckError.message}`,
            event_created: null,
            flashcards_created: null,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Then, create all the flashcards
        const flashcardsToInsert = flashcardData.cards.map(card => ({
          deck_id: newDeck.id,
          user_id: userId, // Uses authenticated user ID
          pregunta: (card.pregunta || "").slice(0, 1000),
          respuesta: (card.respuesta || "").slice(0, 2000),
          veces_correcta: 0,
          veces_incorrecta: 0,
        }));

        const { error: cardsError } = await supabase
          .from("flashcards")
          .insert(flashcardsToInsert);

        if (cardsError) {
          console.error("Error creating flashcards:", cardsError);
          // Cleanup: delete the deck if cards failed
          await supabase.from("flashcard_decks").delete().eq("id", newDeck.id);
          return new Response(JSON.stringify({ 
            content: `Hubo un error al crear las flashcards: ${cardsError.message}`,
            event_created: null,
            flashcards_created: null,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Build confirmation message with sample cards
        const sampleCards = flashcardData.cards.slice(0, 3);
        let cardsList = sampleCards.map((c, i) => 
          `${i + 1}. **${c.pregunta}**\n   → ${c.respuesta}`
        ).join("\n\n");
        
        if (flashcardData.cards.length > 3) {
          cardsList += `\n\n... y ${flashcardData.cards.length - 3} más`;
        }

        const confirmationMessage = `🃏 **¡Mazo de flashcards creado!**\n\n📚 **${flashcardData.deck_name}**\n📝 ${flashcardData.cards.length} tarjetas generadas\n\n**Vista previa:**\n${cardsList}\n\n¡Podés encontrar tu mazo en la sección de Flashcards para empezar a estudiar!`;

        return new Response(JSON.stringify({ 
          content: confirmationMessage,
          event_created: null,
          flashcards_created: {
            deck: newDeck,
            cards_count: flashcardData.cards.length,
          },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ 
      content: choice?.message?.content || "No pude generar una respuesta.",
      event_created: null 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("AI assistant error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Error desconocido" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
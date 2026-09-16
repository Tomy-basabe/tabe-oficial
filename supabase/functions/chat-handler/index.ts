import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Security: Restrict CORS to known origins
const ALLOWED_ORIGINS = ["https://www.tabe.software", "https://tabe.software", "https://tabe-oficial.vercel.app", "http://localhost:8080", "http://localhost:5173"];
function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return { "Access-Control-Allow-Origin": allowedOrigin, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "X-Content-Type-Options": "nosniff" };
}

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

// Convert Uint8Array to base64 in Deno safely
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Model configurations with safe max_tokens per model
interface ModelConfig {
  id: string;
  maxTokens: number;
}

const PREFERRED_MODELS: ModelConfig[] = [
  { id: "llama-3.3-70b-versatile", maxTokens: 800 },
  { id: "llama-3.1-70b-versatile", maxTokens: 800 },
  { id: "llama3-70b-8192", maxTokens: 800 },
  { id: "llama3-8b-8192", maxTokens: 800 },
  { id: "gemma2-9b-it", maxTokens: 800 },
  { id: "mixtral-8x7b-32768", maxTokens: 800 },
];

const BLACKLISTED_KEYWORDS = ["specdec", "guard", "whisper", "orpheus", "embed", "safeguard", "qwen"];

// ─── AUDIO TRANSCRIPTION (Groq Whisper) ──────────────────────────
async function transcribeAudioWithWhisper(audioBytes: Uint8Array, mimeType: string, groqKey: string): Promise<string | null> {
  if (!groqKey || audioBytes.byteLength === 0) return null;
  try {
    const formData = new FormData();
    const blob = new Blob([audioBytes], { type: mimeType || "audio/ogg" });
    const filename = mimeType.includes("mp4") || mimeType.includes("m4a") ? "audio.m4a" : (mimeType.includes("mp3") ? "audio.mp3" : "audio.ogg");
    formData.append("file", blob, filename);
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("language", "es");
    formData.append("response_format", "json");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}` },
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      return data.text?.trim() || null;
    }
    console.warn("[Whisper Error]:", await res.text());
  } catch (err) {
    console.error("[Whisper Exception]:", err);
  }
  return null;
}

// ─── VISION IMAGE ANALYSIS (Google Gemini) ────────────────────────
async function analyzeImageWithGemini(
  geminiKey: string,
  imageBytes: Uint8Array,
  mimeType: string,
  caption: string,
  systemPrompt: string
): Promise<string | null> {
  if (!geminiKey || imageBytes.byteLength === 0) return null;
  const base64Data = uint8ArrayToBase64(imageBytes);
  const models = ["gemini-1.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash"];

  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: "user",
              parts: [
                { text: caption || "Analiza esta imagen con detalle pedagógico y explícame todo su contenido académico:" },
                {
                  inline_data: {
                    mime_type: mimeType || "image/jpeg",
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      } else {
        console.warn(`[Gemini Vision Error ${model}]:`, await res.text());
      }
    } catch (e) {
      console.warn(`[Gemini Vision Exception ${model}]:`, e);
    }
  }
  return null;
}

async function callGroqAI(apiKey: string, systemPrompt: string, userText: string, tools: any[]): Promise<any> {
  // Step 1: Discover available models
  let availableModels: string[] = [];
  try {
    const modelsRes = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    if (modelsRes.ok) {
      const modelsData = await modelsRes.json();
      availableModels = (modelsData.data || [])
        .map((m: any) => m.id)
        .filter((id: string) => !BLACKLISTED_KEYWORDS.some(kw => id.toLowerCase().includes(kw)));
    }
  } catch (_) {}

  // Step 2: Build ordered list of models to try
  const modelsToTry: ModelConfig[] = [];
  for (const pref of PREFERRED_MODELS) {
    if (availableModels.length === 0 || availableModels.includes(pref.id)) {
      modelsToTry.push(pref);
    }
  }
  if (availableModels.length > 0) {
    for (const modelId of availableModels) {
      if (!modelsToTry.some(m => m.id === modelId)) {
        modelsToTry.push({ id: modelId, maxTokens: 512 });
      }
    }
  }
  if (modelsToTry.length === 0) {
    modelsToTry.push({ id: "llama3-8b-8192", maxTokens: 512 });
  }

  // Step 3: Try each model until one succeeds
  let lastError = "";
  for (const model of modelsToTry) {
    try {
      const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model.id,
          max_tokens: model.maxTokens,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userText }
          ],
          tools
        })
      });

      if (aiRes.ok) {
        const data = await aiRes.json();
        return { success: true, data, model: model.id };
      }

      const errorBody = await aiRes.text();
      lastError = errorBody;
      console.warn(`Model ${model.id} failed (${aiRes.status}): ${errorBody.substring(0, 200)}`);

      if (aiRes.status === 429 || aiRes.status === 400) continue;
      if (aiRes.status === 401 || aiRes.status === 403) break;
    } catch (fetchErr) {
      lastError = String(fetchErr);
      console.warn(`Network error with model ${model.id}:`, lastError);
      continue;
    }
  }

  return { success: false, error: lastError };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "TABE_SECRET_TOKEN";

    if (mode && token) {
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        return new Response(challenge, { status: 200 });
      }
      return new Response("Forbidden", { status: 403 });
    }
    return new Response("OK", { status: 200 });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
    const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID") || "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    let platform: 'telegram' | 'whatsapp' | null = null;
    let senderId: string | null = null;
    let text: string | null = null;
    let imageBytes: Uint8Array | null = null;
    let imageMimeType: string = "image/jpeg";
    let isVoiceNote: boolean = false;

    // ───────────────── TELEGRAM PARSING ─────────────────
    if (body.message && body.message.chat) {
      platform = 'telegram';
      senderId = body.message.chat.id.toString();
      text = body.message.text || body.message.caption || null;

      // 1. Audio / Voice in Telegram
      const voiceObj = body.message.voice || body.message.audio;
      if (voiceObj && TELEGRAM_BOT_TOKEN) {
        isVoiceNote = true;
        try {
          const fileInfoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${voiceObj.file_id}`);
          if (fileInfoRes.ok) {
            const fileInfo = await fileInfoRes.json();
            const filePath = fileInfo.result?.file_path;
            if (filePath) {
              const fileDownloadRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`);
              if (fileDownloadRes.ok) {
                const audioBuffer = await fileDownloadRes.arrayBuffer();
                const transcribed = await transcribeAudioWithWhisper(new Uint8Array(audioBuffer), voiceObj.mime_type || "audio/ogg", GROQ_API_KEY);
                if (transcribed) {
                  text = transcribed;
                }
              }
            }
          }
        } catch (audioErr) {
          console.error("Telegram audio download/transcribe error:", audioErr);
        }
      }

      // 2. Photo in Telegram
      if (body.message.photo && Array.isArray(body.message.photo) && body.message.photo.length > 0 && TELEGRAM_BOT_TOKEN) {
        try {
          const largestPhoto = body.message.photo[body.message.photo.length - 1];
          const fileInfoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${largestPhoto.file_id}`);
          if (fileInfoRes.ok) {
            const fileInfo = await fileInfoRes.json();
            const filePath = fileInfo.result?.file_path;
            if (filePath) {
              const fileDownloadRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`);
              if (fileDownloadRes.ok) {
                imageBytes = new Uint8Array(await fileDownloadRes.arrayBuffer());
                imageMimeType = "image/jpeg";
              }
            }
          }
        } catch (photoErr) {
          console.error("Telegram photo download error:", photoErr);
        }
      }
    }

    // ───────────────── WHATSAPP PARSING ─────────────────
    else if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      platform = 'whatsapp';
      const msg = body.entry[0].changes[0].value.messages[0];
      senderId = msg.from;
      text = msg.text?.body || msg.image?.caption || null;

      // 1. Audio / Voice in WhatsApp
      if ((msg.type === "audio" || msg.type === "voice") && WHATSAPP_ACCESS_TOKEN) {
        isVoiceNote = true;
        const mediaId = msg.audio?.id || msg.voice?.id;
        const mime = msg.audio?.mime_type || msg.voice?.mime_type || "audio/ogg";
        if (mediaId) {
          try {
            const mediaMetaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
              headers: { "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}` }
            });
            if (mediaMetaRes.ok) {
              const mediaMeta = await mediaMetaRes.json();
              if (mediaMeta.url) {
                const mediaRes = await fetch(mediaMeta.url, {
                  headers: { "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`, "User-Agent": "curl/8.0" }
                });
                if (mediaRes.ok) {
                  const audioBuffer = await mediaRes.arrayBuffer();
                  const transcribed = await transcribeAudioWithWhisper(new Uint8Array(audioBuffer), mime, GROQ_API_KEY);
                  if (transcribed) {
                    text = transcribed;
                  }
                }
              }
            }
          } catch (waAudioErr) {
            console.error("WhatsApp audio download/transcribe error:", waAudioErr);
          }
        }
      }

      // 2. Image in WhatsApp
      if (msg.type === "image" && WHATSAPP_ACCESS_TOKEN) {
        const mediaId = msg.image?.id;
        imageMimeType = msg.image?.mime_type || "image/jpeg";
        if (mediaId) {
          try {
            const mediaMetaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
              headers: { "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}` }
            });
            if (mediaMetaRes.ok) {
              const mediaMeta = await mediaMetaRes.json();
              if (mediaMeta.url) {
                const mediaRes = await fetch(mediaMeta.url, {
                  headers: { "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`, "User-Agent": "curl/8.0" }
                });
                if (mediaRes.ok) {
                  imageBytes = new Uint8Array(await mediaRes.arrayBuffer());
                }
              }
            }
          } catch (waImgErr) {
            console.error("WhatsApp image download error:", waImgErr);
          }
        }
      }
    }

    if (!platform || !senderId) return new Response("OK");

    // If audio was sent but could not be transcribed
    if (isVoiceNote && !text && !imageBytes) {
      await sendMessage(platform, senderId, "🎧 Recibí tu nota de voz, pero no pude transcribirla claramente. ¿Podrías intentar enviarla de nuevo o escribirla? ¡Gracias!");
      return new Response("OK");
    }

    // Default text fallback if empty
    if (!text && !imageBytes) return new Response("OK");

    let userQuery = supabase.from('user_bots').select('user_id');
    if (platform === 'telegram') {
      userQuery = userQuery.eq('telegram_id', senderId);
    } else {
      const altSender = senderId.startsWith('549') 
        ? senderId.replace(/^549/, '54') 
        : (senderId.startsWith('54') ? senderId.replace(/^54/, '549') : senderId);
      userQuery = userQuery.or(`whatsapp_number.eq.${senderId},whatsapp_number.eq.${altSender}`);
    }
    const { data: botUser } = await userQuery.maybeSingle();

    if (!botUser) {
      const linkingCodeMatch = text?.trim().match(/^\d{6}$/);
      if (linkingCodeMatch) {
        const { data: linkRequest } = await supabase.from('user_bots').select('user_id').eq('linking_code', linkingCodeMatch[0]).gt('linking_expires_at', new Date().toISOString()).maybeSingle();
        if (!linkRequest) return sendMessage(platform, senderId, "❌ Código inválido o expirado.").then(() => new Response("OK"));
        
        const updateData: any = { linking_code: null, linking_expires_at: null };
        if (platform === 'telegram') updateData.telegram_id = senderId;
        else updateData.whatsapp_number = senderId;
        
        await supabase.from('user_bots').update(updateData).eq('user_id', linkRequest.user_id);
        return sendMessage(platform, senderId, "✅ ¡Vinculado exitosamente! Ahora podés hablarme, enviarme fotos de tus apuntes/ejercicios, notas de voz o pedirme que gestione tus materias y exámenes.").then(() => new Response("OK"));
      }
      return sendMessage(platform, senderId, "👋 ¡Hola! Soy TABE AI. Entrá a tu cuenta de T.A.B.E. en el navegador > Configuración > Asistente Virtual y pasame el código de 6 dígitos que ahí te aparece.").then(() => new Response("OK"));
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
    
    // Academic Metrics
    const statusList = subjectStatusRes.data || [];
    const notasValidas = statusList
      .filter((s: any) => typeof s.nota === 'number' && s.nota > 0)
      .map((s: any) => s.nota);
    const promedio = notasValidas.length > 0
      ? (notasValidas.reduce((a: number, b: number) => a + b, 0) / notasValidas.length).toFixed(2)
      : "Sin notas cargadas";
    const aprobadas = statusList.filter((s: any) => s.estado === 'aprobada').length;
    const regulares = statusList.filter((s: any) => s.estado === 'regular').length;
    
    const enrichedSubjects = subjects
      .filter(s => statusMap.has(s.id))
      .map(s => {
        const st = statusMap.get(s.id);
        return `${s.nombre} - Estado: ${st?.estado || 'sin_cursar'} - Nota: ${st?.nota !== null && st?.nota !== undefined ? st.nota : '-'}`;
      });

    const events = (eventsRes.data || []).map(e => `${e.fecha} [ID: ${e.id}]: ${e.titulo} (${e.tipo_examen})`);
    const userName = profilesRes.data?.nombre || "Estudiante";
    const stats = statsRes.data || { nivel: 1, xp_total: 0, racha_actual: 0, horas_estudio_total: 0 };

    const systemPrompt = `Sos TABE AI (@tabeai_bot), el asistente inteligente de la vida universitaria de ${userName}.
      Tenés acceso completo al 100% de sus datos académicos.
      
      -- DATOS ACADÉMICOS DE ${userName.toUpperCase()} --
      Promedio actual: ${promedio} (sobre ${notasValidas.length} materias con nota)
      Materias aprobadas: ${aprobadas}
      Materias regulares: ${regulares}
      Métricas de Gamificación: Nivel ${stats.nivel}, XP: ${stats.xp_total}, Racha: ${stats.racha_actual} días, Horas de estudio: ${stats.horas_estudio_total}h.
      
      Próximos exámenes y eventos:
      ${events.length ? events.join("\\n") : "Ninguno agendado próximamente."}
      
      Materias y estados:
      ${enrichedSubjects.length ? enrichedSubjects.join("\\n") : "Sin materias cargadas."}
      
      -- INSTRUCCIONES --
      1. Si te pregunta sobre su promedio, notas, materias o exámenes, respondé directamente con los datos de arriba.
      2. Si te pide agendar fechas, eliminar eventos, registrar estudio o cambiar estados de materias, EJECUTÁ LAS HERRAMIENTAS (tools).
      3. Si te manda fotos de exámenes, ejercicios, apuntes o gráficos, explicaselos paso a paso con máxima claridad pedagógica.
      4. Sé cálido, claro, conciso y usá emojis. Respondé en español argentino.
    `;

    // ───────────────── MULTIMODAL: VISION HANDLER ─────────────────
    if (imageBytes && imageBytes.byteLength > 0) {
      const userPrompt = text || "Analiza esta imagen y ayúdame con todo su contenido académico:";
      const visionResult = await analyzeImageWithGemini(GEMINI_API_KEY, imageBytes, imageMimeType, userPrompt, systemPrompt);
      if (visionResult) {
        await sendMessage(platform, senderId, visionResult);
        return new Response("OK");
      } else {
        await sendMessage(platform, senderId, "📸 Pude ver tu imagen, pero tuve un inconveniente analizando los detalles. ¿Podrías enviarla con mejor iluminación o preguntarme algo específico?");
        return new Response("OK");
      }
    }

    // ───────────────── TEXT / TRANSCRIBED AUDIO LLM ─────────────────
    const tools = [
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
    ];

    const result = await callGroqAI(GROQ_API_KEY, systemPrompt, text || "Hola", tools);

    if (!result.success) {
      console.error("All AI models failed. Last error:", result.error);
      await sendMessage(platform, senderId, "⚠️ Estoy teniendo problemas técnicos en este momento. Intentá de nuevo en unos segundos. 🔄");
      return new Response("OK");
    }

    const aiData = result.data;
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
              actionResponseMsg += `✅ *Agendado:* ${args.titulo} para el ${args.fecha}\n`;
            } else {
              console.error(insError);
              actionResponseMsg += `❌ Error al agendar ${args.titulo}\n`;
            }
            break;
          }
          case "delete_calendar_event": {
            const { error: delError } = await supabase.from("calendar_events").delete().eq("id", args.event_id).eq("user_id", userId);
            if (!delError) {
              actionResponseMsg += `🗑️ *Evento eliminado correctamente.*\n`;
            } else {
              console.error(delError);
              actionResponseMsg += `❌ Error al eliminar evento.\n`;
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
            if (!logError) {
              actionResponseMsg += `⏱️ *Estudio registrado:* +${args.duracion_minutos} minutos añadidos a tus métricas. ¡Sigue así! 🚀\n`;
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
              actionResponseMsg += `🎓 *Materia actualizada:* Ahora estás en estado '${args.estado}'${args.nota ? ` con nota ${args.nota}` : ''}. ¡Felicitaciones! 🎉\n`;
            } else {
               actionResponseMsg += `❌ Error al actualizar materia.\n`;
            }
            break;
          }
        }
      }
      
      if (actionResponseMsg !== "") {
         await sendMessage(platform, senderId, actionResponseMsg);
         return new Response("OK");
      }
    }

    await sendMessage(platform, senderId, choice?.message?.content || "¿En qué te puedo ayudar con tus materias y agenda? 🎓");
    return new Response("OK");
  } catch (err) {
    console.error(err);
    return new Response("Error", { status: 500 });
  }
});

async function sendMessage(platform: 'telegram' | 'whatsapp', to: string, text: string) {
  const cleanText = text.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n");

  if (platform === 'telegram') {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
    if (!TELEGRAM_BOT_TOKEN) return;

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: to, text: cleanText, parse_mode: "Markdown" })
    });
    
    if (!res.ok) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: to, text: cleanText })
      });
    }
  } else if (platform === 'whatsapp') {
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_ID) {
      console.error("Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_ID");
      return;
    }

    const sendReq = async (recipient: string) => {
      return await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipient,
          type: "text",
          text: { body: cleanText }
        })
      });
    };

    let res = await sendReq(to);
    if (!res.ok && to.startsWith("549")) {
      res = await sendReq(to.replace(/^549/, "54"));
    }
    if (!res.ok) {
      console.error("WhatsApp message failed. Reason:", await res.text());
    }
  }
}

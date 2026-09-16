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

// Convert Uint8Array to base64 in Deno safely and blazingly fast
function uint8ArrayToBase64(bytes: Uint8Array): string {
  try {
    return btoa(new TextDecoder("latin1").decode(bytes));
  } catch (_) {
    let binary = "";
    const len = bytes.byteLength;
    const CHUNK_SIZE = 8192;
    for (let i = 0; i < len; i += CHUNK_SIZE) {
      const slice = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
      binary += String.fromCharCode.apply(null, slice as any);
    }
    return btoa(binary);
  }
}

// Model configurations with safe max_tokens per model
interface ModelConfig {
  id: string;
  maxTokens: number;
}

const PREFERRED_MODELS: ModelConfig[] = [
  { id: "llama-3.3-70b-versatile", maxTokens: 2048 },
  { id: "llama-3.1-70b-versatile", maxTokens: 2048 },
  { id: "llama3-70b-8192", maxTokens: 2048 },
  { id: "llama3-8b-8192", maxTokens: 1500 },
  { id: "gemma2-9b-it", maxTokens: 1500 },
  { id: "mixtral-8x7b-32768", maxTokens: 2048 },
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

// ─── CLASS AUDIO SUMMARY ENGINE (Groq + Gemini + OpenRouter) ────────
async function summarizeClassAudio(
  groqKey: string,
  geminiKey: string,
  openrouterKey: string,
  transcription: string,
  subjects: Array<{ id: string; nombre: string }>,
  userName: string
): Promise<{ summary: string; detectedSubjectId: string | null; detectedTitle: string } | null> {
  const subjectsList = subjects.map(s => s.nombre).join(", ") || "General";
  
  const systemInstruction = `Sos TABE AI, el sintetizador y tutor académico universitario de ${userName}.
El estudiante te envió el audio o la grabación de una clase/explicación universitaria.
Tu tarea es generar un RESUMEN ESTRUCTURADO UNIVERSITARIO de altísimo valor pedagógico.

Materias cursadas por el estudiante: [${subjectsList}].

Tu respuesta DEBE seguir estrictamente esta estructura con emojis y negritas:

🎙️ *RESUMEN ESTRUCTURADO DE CLASE*
📚 *Materia/Tema:* [Identificá con precisión la materia de la lista o el tema principal]
────────────────────────────

📌 *PUNTOS CLAVE DE LA CLASE:*
• [Idea central 1 explicada claramente]
• [Idea central 2...]
• [Idea central 3...]
• [Idea central 4...]

🧠 *CONCEPTOS Y DEFINICIONES PRINCIPALES:*
• *[Concepto 1]:* Definición clara, fórmulas si corresponden y cómo aplicarlo.
• *[Concepto 2]:* ...
• *[Concepto 3]:* ...

📅 *FECHAS, ENTREGAS O EXÁMENES MENCIONADOS:*
• [Si se mencionaron fechas de parcial, entregas, TP, recuperatorios o clases de consulta, listalas destacadas con emoji ⚠️. Si no hubo fechas mencionadas, indicá: "No se detectaron fechas específicas en la grabación."]

📝 *CONCLUSIÓN Y RECOMENDACIÓN DE ESTUDIO:*
• [Breve recomendación didáctica de qué profundizar para el examen o siguiente clase]

Directivas:
- Sé riguroso, claro y pedagógico.
- Usá español rioplatense (argentino) cálido y profesional.
- No omitas detalles técnicos, nombres de autores, algoritmos ni fórmulas importantes.`;

  let summaryText: string | null = null;

  // Estrategia 1: Groq llama-3.3-70b-versatile
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: `Transcripción del audio de la clase:\n\n${transcription}` }
          ],
          max_tokens: 2048,
          temperature: 0.2
        })
      });
      if (res.ok) {
        const data = await res.json();
        summaryText = data.choices?.[0]?.message?.content?.trim() || null;
      }
    } catch (e) {
      console.warn("[summarizeClassAudio Groq failed]:", e);
    }
  }

  // Estrategia 2: Fallback Google Gemini
  if (!summaryText && geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemInstruction}\n\nTranscripción de la clase:\n${transcription}` }]
            }
          ]
        })
      });
      if (res.ok) {
        const data = await res.json();
        summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
      }
    } catch (e) {
      console.warn("[summarizeClassAudio Gemini failed]:", e);
    }
  }

  // Estrategia 3: Fallback OpenRouter
  if (!summaryText && openrouterKey) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openrouterKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: `Transcripción del audio de la clase:\n\n${transcription}` }
          ],
          max_tokens: 2048
        })
      });
      if (res.ok) {
        const data = await res.json();
        summaryText = data.choices?.[0]?.message?.content?.trim() || null;
      }
    } catch (e) {
      console.warn("[summarizeClassAudio OpenRouter failed]:", e);
    }
  }

  if (!summaryText) return null;

  // Deducir materia o título
  let detectedSubjectId: string | null = null;
  let detectedTitle = "Clase Grabada";
  for (const s of subjects) {
    if (summaryText.toLowerCase().includes(s.nombre.toLowerCase()) || transcription.toLowerCase().includes(s.nombre.toLowerCase())) {
      detectedSubjectId = s.id;
      detectedTitle = `Clase de ${s.nombre}`;
      break;
    }
  }

  return { summary: summaryText, detectedSubjectId, detectedTitle };
}

// ─── MULTIMODAL VISION ENGINE (Groq Vision + Gemini + OpenRouter) ────────
async function analyzeImageMultimodal(
  groqKey: string,
  geminiKey: string,
  openrouterKey: string,
  imageBytes: Uint8Array,
  mimeType: string,
  caption: string,
  systemPrompt: string
): Promise<string | null> {
  if (!imageBytes || imageBytes.byteLength === 0) return null;

  const base64Data = uint8ArrayToBase64(imageBytes);
  const dataUrl = `data:${mimeType || "image/jpeg"};base64,${base64Data}`;
  const question = caption?.trim() || "Analizá detalladamente todo lo que hay en esta imagen académica:";

  const promptForVision = `${systemPrompt}

-- INSTRUCCIÓN DE VISIÓN MULTIMODAL --
El estudiante te envió una imagen/foto con la siguiente consulta: "${question}".
Tareas requeridas:
1. Describí con precisión todo lo que ves: textos, apuntes manuscritos, consignas de examen, ejercicios, fórmulas, esquemas, fechas o gráficos.
2. Si la imagen contiene un ejercicio o pregunta práctica, resolvelo paso a paso con máxima claridad y rigor pedagógico.
3. Si contiene fechas de exámenes o datos de cursada, destacalos con claridad.
4. Respondé en español argentino, de forma directa, cálida y usando emojis.`;

  // 1. ESTRATEGIA 1: Groq Vision (llama-3.2-11b-vision-preview y 90b)
  if (groqKey) {
    const groqModels = ["llama-3.2-11b-vision-preview", "llama-3.2-90b-vision-preview"];
    for (const model of groqModels) {
      try {
        console.log(`[Vision] Consultando Groq Vision (${model})...`);
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: promptForVision },
                  { type: "image_url", image_url: { url: dataUrl } }
                ]
              }
            ],
            max_tokens: 1500,
            temperature: 0.2
          })
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text && text.length > 0) {
            console.log(`[Vision] Respuesta exitosa con Groq Vision (${model})`);
            return text;
          }
        } else {
          console.warn(`[Vision] Groq ${model} falló con status ${res.status}:`, (await res.text()).substring(0, 200));
        }
      } catch (err) {
        console.warn(`[Vision] Excepción en Groq ${model}:`, err);
      }
    }
  }

  // 2. ESTRATEGIA 2: Google Gemini (OpenAI-compatible & Native endpoints)
  if (geminiKey) {
    const geminiModels = [
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-2.5-flash",
      "gemini-1.5-flash-8b",
      "gemini-2.0-flash-lite"
    ];

    // 2.A: Endpoint OpenAI de Gemini
    for (const model of geminiModels) {
      try {
        console.log(`[Vision] Consultando Gemini OpenAI (${model})...`);
        const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${geminiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: promptForVision },
                  { type: "image_url", image_url: { url: dataUrl } }
                ]
              }
            ],
            max_tokens: 1500,
            temperature: 0.3
          })
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) {
            console.log(`[Vision] Respuesta exitosa con Gemini OpenAI (${model})`);
            return text;
          }
        }
      } catch (e) {
        console.warn(`[Vision] Excepción Gemini OpenAI ${model}:`, e);
      }
    }

    // 2.B: Endpoint Native GenerateContent de Gemini
    for (const model of geminiModels) {
      try {
        console.log(`[Vision] Consultando Gemini Native (${model})...`);
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: promptForVision },
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
              temperature: 0.3,
              maxOutputTokens: 1500
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            console.log(`[Vision] Respuesta exitosa con Gemini Native (${model})`);
            return text;
          }
        }
      } catch (e) {
        console.warn(`[Vision] Excepción Gemini Native ${model}:`, e);
      }
    }
  }

  // 3. ESTRATEGIA 3: OpenRouter
  if (openrouterKey) {
    const openrouterModels = [
      "google/gemini-2.0-flash-001",
      "meta-llama/llama-3.2-11b-vision-instruct",
      "google/gemini-flash-1.5-exp"
    ];

    for (const model of openrouterModels) {
      try {
        console.log(`[Vision] Consultando OpenRouter (${model})...`);
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: promptForVision },
                  { type: "image_url", image_url: { url: dataUrl } }
                ]
              }
            ],
            max_tokens: 1500,
            temperature: 0.3
          })
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim();
          if (text) {
            console.log(`[Vision] Respuesta exitosa con OpenRouter (${model})`);
            return text;
          }
        }
      } catch (e) {
        console.warn(`[Vision] Excepción OpenRouter ${model}:`, e);
      }
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
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
    const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID") || "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();

    // ───────────────── PROACTIVE NOTIFICATIONS & REMINDERS ─────────────────
    if (body && body.action === "send_proactive_reminders") {
      const targetUserId = body.target_user_id;
      let botsQuery = supabase.from('user_bots').select('user_id, telegram_id, whatsapp_number');
      if (targetUserId) {
        botsQuery = botsQuery.eq('user_id', targetUserId);
      } else {
        botsQuery = botsQuery.or('telegram_id.not.is.null,whatsapp_number.not.is.null');
      }

      const { data: botUsers, error: botErr } = await botsQuery;
      if (botErr || !botUsers || botUsers.length === 0) {
        return new Response(JSON.stringify({ success: false, message: "No se encontraron usuarios vinculados" }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
        });
      }

      const results = [];
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      const todayStr = now.toISOString().split("T")[0];

      for (const bot of botUsers) {
        try {
          const uId = bot.user_id;
          const { data: profile } = await supabase.from('profiles').select('nombre').eq('id', uId).maybeSingle();
          const studentName = profile?.nombre || "estudiante";

          // Buscar exámenes de mañana en el calendario
          const { data: tomorrowExams } = await supabase
            .from('calendar_events')
            .select('id, titulo, tipo_examen, fecha, subject_id, subjects(nombre)')
            .eq('user_id', uId)
            .eq('fecha', tomorrowStr)
            .neq('tipo_examen', 'Estudio');

          // Buscar estadísticas de racha y sesiones del día
          const { data: stats } = await supabase.from('user_stats').select('racha_actual').eq('user_id', uId).maybeSingle();
          const { data: todaySessions } = await supabase
            .from('study_sessions')
            .select('id')
            .eq('user_id', uId)
            .eq('fecha', todayStr)
            .limit(1);

          let reminderMessage = "";

          if (tomorrowExams && tomorrowExams.length > 0) {
            const ex = tomorrowExams[0];
            const examType = ex.tipo_examen || "parcial";
            const subjectName = (ex as any).subjects?.nombre || ex.titulo || "tu materia";
            reminderMessage = `👋 ¡Hola ${studentName}! 🎓 Vi en TABE que mañana tenés el ${examType} de *${subjectName}*.\n\n¿Querés que te haga unas preguntas de repaso rápido para afianzar conceptos o preferís descansar? Escribime *"quiz de ${subjectName}"* o lo que necesites y lo preparamos al instante. ¡Muchos éxitos mañana! 💪📚`;
          } else if (stats && stats.racha_actual >= 2 && (!todaySessions || todaySessions.length === 0)) {
            reminderMessage = `🔥 ¡Hola ${studentName}! Venís con una gran racha de *${stats.racha_actual} días seguidos* de estudio en TABE.\n\nTodavía no registraste ninguna sesión hoy y tu racha está en juego. ¿Le dedicamos 15 minutitos a repasar con un quiz o registrar lo que estudiaste hoy? 🎯`;
          } else if (body.force_test) {
            reminderMessage = `🔔 ¡Hola ${studentName}! Este es un mensaje de prueba del sistema de *Recordatorios Proactivos de TABE AI*.\n\nCuando tengas un parcial, entrega o tu racha de estudio esté en juego, te voy a avisar por acá con anticipación y sugerirte repasos interactivos. ¡Todo listo y conectado! 🎓🚀`;
          }

          if (reminderMessage) {
            let sentTelegram = false;
            let sentWhatsapp = false;

            if (bot.telegram_id) {
              await sendMessage('telegram', bot.telegram_id.toString(), reminderMessage);
              sentTelegram = true;
            }
            if (bot.whatsapp_number) {
              await sendMessage('whatsapp', bot.whatsapp_number.toString(), reminderMessage);
              sentWhatsapp = true;
            }

            results.push({
              user_id: uId,
              studentName,
              sentTelegram,
              sentWhatsapp,
              reminderMessage
            });
          }
        } catch (botLoopErr) {
          console.error("Error enviando recordatorio proactivo al usuario:", bot.user_id, botLoopErr);
        }
      }

      return new Response(JSON.stringify({ success: true, count: results.length, results }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
      });
    }

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

      // 1. Audio / Voice in Telegram (voice, audio note or forwarded audio document)
      const voiceObj = body.message.voice || body.message.audio || (body.message.document && (body.message.document.mime_type?.startsWith("audio/") || body.message.document.file_name?.match(/\.(mp3|wav|m4a|ogg|aac|opus)$/i)) ? body.message.document : null);
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

      // 1. Audio / Voice in WhatsApp (voice, audio note or forwarded audio document)
      const isAudioDoc = msg.type === "document" && (msg.document?.mime_type?.startsWith("audio/") || msg.document?.filename?.match(/\.(mp3|wav|m4a|ogg|aac|opus)$/i));
      if ((msg.type === "audio" || msg.type === "voice" || isAudioDoc) && WHATSAPP_ACCESS_TOKEN) {
        isVoiceNote = true;
        const mediaId = msg.audio?.id || msg.voice?.id || msg.document?.id;
        const mime = msg.audio?.mime_type || msg.voice?.mime_type || msg.document?.mime_type || "audio/ogg";
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
    const [subjectsRes, subjectStatusRes, eventsRes, profilesRes, statsRes, quizDecksRes] = await Promise.all([
      supabase.from("subjects").select("id, nombre, año"),
      supabase.from("user_subject_status").select("subject_id, estado, nota").eq("user_id", userId),
      supabase.from("calendar_events").select("id, titulo, fecha, tipo_examen").eq("user_id", userId).gte("fecha", new Date().toISOString().split("T")[0]).order('fecha').limit(20),
      supabase.from("profiles").select("nombre").eq("id", userId).single(),
      supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("quiz_decks").select("id, nombre, subject_id, total_questions, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5)
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
    const recentQuizzes = (quizDecksRes.data || []).map(q => {
      const subj = subjects.find(s => s.id === q.subject_id);
      return `[ID: ${q.id}] "${q.nombre}" (${subj?.nombre || 'General'}) - ${q.total_questions || '?'} preguntas`;
    });

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

      Quizzes recientes del estudiante:
      ${recentQuizzes.length ? recentQuizzes.join("\\n") : "Ningún quiz creado aún."}
      
      -- INSTRUCCIONES --
      1. Si te pregunta sobre su promedio, notas, materias o exámenes, respondé directamente con los datos de arriba.
      2. Si te pide agendar fechas, eliminar eventos, registrar estudio o cambiar estados de materias, EJECUTÁ LAS HERRAMIENTAS (tools).
      3. Si te manda fotos de exámenes, ejercicios, apuntes o gráficos, explicaselos paso a paso con máxima claridad pedagógica.
      4. Sé cálido, claro, conciso y usá emojis. Respondé en español argentino.
      
      -- MODO TUTOR / EVALUADOR --
      5. Si el usuario pide que lo evalúes, le tomes prueba, quiz, simulacro, flashcards, examen de práctica o similar, SIEMPRE usá la herramienta "generate_quiz". Generá entre 5 y 8 preguntas de opción múltiple (a,b,c,d) de dificultad progresiva sobre la materia indicada.
      6. Si el usuario responde con letras separadas por coma (ej: "b, a, c, d, a" o "b,a,c,d,a" o "babca") Y existe un quiz reciente en su historial, usá la herramienta "evaluate_quiz_response" con el ID del quiz más reciente y las letras del usuario.
      7. Al generar preguntas, asegurate de que sean relevantes para el nivel universitario argentino y cubran temas variados de la materia.

      -- RESÚMENES DE CLASES Y AUDIOS --
      8. Si el usuario te pide resumir una clase, transcripción de audio o apuntes de cursada, estructurá tu respuesta didácticamente con: Puntos Clave, Conceptos y Definiciones, Fechas/Entregas Mencionadas y Recomendaciones de Estudio.
    `;


    // ───────────────── MULTIMODAL: VISION HANDLER ─────────────────
    if (imageBytes && imageBytes.byteLength > 0) {
      console.log(`[Vision] Imagen detectada en ${platform}. Tamaño: ${imageBytes.byteLength} bytes, tipo: ${imageMimeType}`);
      const userPrompt = text || "Analizá esta imagen detalladamente y decime qué hay acá:";
      const visionResult = await analyzeImageMultimodal(
        GROQ_API_KEY,
        GEMINI_API_KEY,
        OPENROUTER_API_KEY,
        imageBytes,
        imageMimeType,
        userPrompt,
        systemPrompt
      );

      if (visionResult) {
        await sendMessage(platform, senderId, visionResult);
        return new Response("OK");
      } else {
        await sendMessage(
          platform,
          senderId,
          "📸 Recibí tu imagen, pero en este momento los servicios de análisis visual están con alta demanda o la imagen no pudo ser procesada. ¿Podrías enviarla nuevamente o consultarme lo que necesitas por texto o audio?"
        );
        return new Response("OK");
      }
    }

    // ───────────── AUDIO SUMMARY: CLASES & AUDIOS LARGOS ─────────────
    const isClassAudio = isVoiceNote && text && (
      text.length >= 140 || 
      /(resum(en|ir|eme|i)|clase|apunte|explicacion|teorica|practica|tema|unidad|profesor|profe)/i.test(text)
    );

    if (isClassAudio && text) {
      console.log(`[Audio Summary] Procesando audio de clase (${text.length} caracteres) para usuario ${userId}`);
      const audioResult = await summarizeClassAudio(
        GROQ_API_KEY,
        GEMINI_API_KEY,
        OPENROUTER_API_KEY,
        text,
        subjects,
        userName
      );

      if (audioResult) {
        // Guardar automáticamente como Apunte en notion_documents
        try {
          const docTitle = `🎙️ ${audioResult.detectedTitle} (${new Date().toLocaleDateString('es-AR')})`;
          await supabase.from("notion_documents").insert({
            user_id: userId,
            subject_id: audioResult.detectedSubjectId,
            titulo: docTitle,
            emoji: "🎙️",
            contenido: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: audioResult.summary }]
                }
              ]
            }
          });
        } catch (notionErr) {
          console.warn("[Notion save warning]:", notionErr);
        }

        let replyMsg = `${audioResult.summary}\n\n`;
        replyMsg += `────────────────────────────\n`;
        replyMsg += `💾 _Este resumen se guardó automáticamente en tus Apuntes de TABE (sección Notion)._ 📚`;

        await sendMessage(platform, senderId, replyMsg);
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
      },
      {
        type: "function",
        function: {
          name: "generate_quiz",
          description: "Genera un quiz/cuestionario de opción múltiple sobre una materia o tema. Úsalo cuando el usuario pida que lo evalúes, le tomes prueba, quiz, simulacro, examen de práctica, flashcards de evaluación o similar. Generá entre 5 y 8 preguntas de dificultad progresiva.",
          parameters: {
            type: "object",
            properties: {
              materia: { type: "string", description: "Nombre de la materia (debe coincidir con las materias del estudiante)" },
              titulo: { type: "string", description: "Título descriptivo del quiz, ej: 'Quiz de Álgebra Lineal - Matrices'" },
              preguntas: {
                type: "array",
                description: "Array de 5-8 preguntas de opción múltiple",
                items: {
                  type: "object",
                  properties: {
                    pregunta: { type: "string", description: "Texto de la pregunta" },
                    opciones: { type: "array", items: { type: "string" }, description: "Exactamente 4 opciones de respuesta" },
                    respuesta_correcta: { type: "number", description: "Índice de la opción correcta (0=a, 1=b, 2=c, 3=d)" },
                    explicacion: { type: "string", description: "Explicación pedagógica de por qué esa es la respuesta correcta" }
                  },
                  required: ["pregunta", "opciones", "respuesta_correcta", "explicacion"]
                }
              }
            },
            required: ["materia", "titulo", "preguntas"],
            additionalProperties: false
          }
        }
      },
      {
        type: "function",
        function: {
          name: "evaluate_quiz_response",
          description: "Evalúa las respuestas del usuario a un quiz existente. Úsalo cuando el usuario envíe letras de respuesta como 'b, a, c, d, a' o 'bacda' para un quiz que le generaste recientemente.",
          parameters: {
            type: "object",
            properties: {
              quiz_deck_id: { type: "string", description: "UUID del quiz a evaluar (sacalo del contexto de Quizzes recientes)" },
              respuestas: { type: "array", items: { type: "string" }, description: "Array de letras de respuesta del usuario, ej: ['b','a','c','d','a']" }
            },
            required: ["quiz_deck_id", "respuestas"],
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
          case "generate_quiz": {
            try {
              const resolvedSubjId = resolveSubjectId(args.materia);
              const numQuestions = Array.isArray(args.preguntas) ? args.preguntas.length : 0;
              const quizTitle = args.titulo || `Quiz de ${args.materia}`;

              const { data: deck, error: deckErr } = await supabase.from("quiz_decks").insert({
                user_id: userId,
                nombre: quizTitle,
                subject_id: resolvedSubjId,
                total_questions: numQuestions
              }).select("id").single();

              if (deckErr || !deck) {
                console.error("[generate_quiz deck error]:", deckErr);
                actionResponseMsg += `❌ Ocurrió un error al guardar el quiz en el sistema.\n`;
                break;
              }

              const letras = ["a", "b", "c", "d"];
              let quizFormatted = `🧠 *${quizTitle.toUpperCase()}*\n`;
              quizFormatted += `📚 Materia: ${args.materia}\n`;
              quizFormatted += `🎯 Cantidad: ${numQuestions} preguntas\n`;
              quizFormatted += `────────────────────────────\n\n`;

              for (let i = 0; i < numQuestions; i++) {
                const p = args.preguntas[i];
                const { data: qData, error: qErr } = await supabase.from("quiz_questions").insert({
                  deck_id: deck.id,
                  pregunta: p.pregunta,
                  explicacion: p.explicacion,
                  user_id: userId
                }).select("id").single();

                if (qErr || !qData) {
                  console.error("[generate_quiz question error]:", qErr);
                  continue;
                }

                if (Array.isArray(p.opciones)) {
                  const optionsToInsert = p.opciones.map((optText: string, idx: number) => ({
                    question_id: qData.id,
                    texto: optText,
                    es_correcta: idx === p.respuesta_correcta
                  }));
                  await supabase.from("quiz_options").insert(optionsToInsert);
                }

                quizFormatted += `*${i + 1}.* ${p.pregunta}\n`;
                if (Array.isArray(p.opciones)) {
                  p.opciones.forEach((optText: string, idx: number) => {
                    quizFormatted += `   ${letras[idx] || idx + 1}) ${optText}\n`;
                  });
                }
                quizFormatted += `\n`;
              }

              quizFormatted += `────────────────────────────\n`;
              quizFormatted += `📩 *Para responder:* enviame solo las letras en orden (ejemplo: \`${letras.slice(0, Math.min(numQuestions, 4)).join(", ")}\`).\n`;
              quizFormatted += `💾 _Guardado en TABE: ID \`${deck.id}\`_`;

              actionResponseMsg += quizFormatted;
            } catch (qEx) {
              console.error("[generate_quiz exception]:", qEx);
              actionResponseMsg += `❌ Hubo un inconveniente al armar el quiz. Por favor, reintenta en un momento.\n`;
            }
            break;
          }
          case "evaluate_quiz_response": {
            try {
              let targetDeckId = args.quiz_deck_id;
              if (!targetDeckId && quizDecksRes?.data && quizDecksRes.data.length > 0) {
                targetDeckId = quizDecksRes.data[0].id;
              }

              if (!targetDeckId) {
                actionResponseMsg += `⚠️ No encontré ningún quiz activo para corregir. Pídeme: "Tomame un quiz de [materia]" para comenzar. 🎓\n`;
                break;
              }

              const { data: deckData } = await supabase
                .from("quiz_decks")
                .select("nombre, subject_id")
                .eq("id", targetDeckId)
                .single();

              const { data: questions, error: fetchErr } = await supabase
                .from("quiz_questions")
                .select("id, pregunta, explicacion, created_at, quiz_options(id, texto, es_correcta)")
                .eq("deck_id", targetDeckId)
                .order("created_at", { ascending: true });

              if (fetchErr || !questions || questions.length === 0) {
                actionResponseMsg += `⚠️ No pude cargar las preguntas del quiz con ID \`${targetDeckId}\`.\n`;
                break;
              }

              const userAnswers: string[] = (Array.isArray(args.respuestas) ? args.respuestas : [])
                .map((r: any) => String(r).trim().toLowerCase().replace(/[^a-d]/g, ""))
                .filter(Boolean);

              const letrasMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
              let correctCount = 0;
              const totalQ = questions.length;

              let evalText = `📊 *CORRECCIÓN DE QUIZ: ${deckData?.nombre || 'EVALUACIÓN'}*\n`;
              evalText += `────────────────────────────\n\n`;

              for (let i = 0; i < totalQ; i++) {
                const q = questions[i];
                const options = (q.quiz_options || []) as Array<{ id: string; texto: string; es_correcta: boolean }>;
                const correctIdx = options.findIndex(o => o.es_correcta);
                const userLetter = userAnswers[i] || "-";
                const userIdx = letrasMap[userLetter] !== undefined ? letrasMap[userLetter] : -1;

                const isCorrect = userIdx !== -1 && userIdx === correctIdx;
                if (isCorrect) correctCount++;

                const statusEmoji = isCorrect ? "✅" : "❌";
                const correctLetter = ["a", "b", "c", "d"][correctIdx] || "?";
                const correctOptionText = correctIdx !== -1 && options[correctIdx] ? options[correctIdx].texto : "";

                evalText += `${statusEmoji} *Pregunta ${i + 1}:* ${q.pregunta}\n`;
                evalText += `   Tu respuesta: *${userLetter.toUpperCase()}* ${isCorrect ? '(¡Correcta!)' : `(Incorrecta)`}\n`;
                if (!isCorrect && correctIdx !== -1) {
                  evalText += `   👉 Correcta: *${correctLetter.toUpperCase()}*) ${correctOptionText}\n`;
                }
                if (q.explicacion) {
                  evalText += `   💡 _Explicación:_ ${q.explicacion}\n`;
                }
                evalText += `\n`;
              }

              const porcentaje = Math.round((correctCount / totalQ) * 100);
              let calificacion = "";
              if (porcentaje >= 90) calificacion = "🏆 ¡Sobresaliente! Dominás el tema al 100%.";
              else if (porcentaje >= 70) calificacion = "👏 ¡Muy buen trabajo! Aprobado con solvencia.";
              else if (porcentaje >= 40) calificacion = "📖 Bien encaminado, pero repasemos los temas donde hubo dudas.";
              else calificacion = "💪 A no desanimar: repasa la teoría y volvemos a intentarlo.";

              evalText += `────────────────────────────\n`;
              evalText += `🎯 *Resultado Final:* ${correctCount}/${totalQ} correctas (${porcentaje}%)\n`;
              evalText += `${calificacion}\n\n`;
              evalText += `✨ _Tu sesión de práctica fue computada en tus estadísticas de estudio._ 🚀`;

              // Registrar sesión de estudio en study_sessions
              await supabase.from("study_sessions").insert({
                user_id: userId,
                duracion_segundos: Math.max(120, totalQ * 45),
                fecha: new Date().toISOString().split("T")[0],
                tipo: 'quiz',
                subject_id: deckData?.subject_id || null
              });

              actionResponseMsg += evalText;
            } catch (evalEx) {
              console.error("[evaluate_quiz_response exception]:", evalEx);
              actionResponseMsg += `❌ Hubo un error procesando la evaluación. Intentá nuevamente.\n`;
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

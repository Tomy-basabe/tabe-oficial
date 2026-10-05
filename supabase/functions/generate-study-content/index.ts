import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Security: Restrict CORS to known origins
const ALLOWED_ORIGINS = [
  "https://tabe.com.ar",
  "https://www.tabe.com.ar",
  "https://tabe-oficial.vercel.app",
  "http://localhost:8080",
  "http://localhost:5173"
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "X-Content-Type-Options": "nosniff"
  };
}

interface RequestBody {
  fileUrl?: string;
  storagePath?: string;
  fileName: string;
  content?: string;
  type: 'flashcards' | 'summary' | 'quiz' | 'roadmap' | 'level_pack';
  count?: number;
  /** Contexto personalizado (materia, evento, meta, preferencia, plan de niveles) */
  instructions?: string;
}

// Modelos ultrarrápidos especializados en extracción y estructuración JSON
const ULTRA_FAST_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite"
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error("Unauthorized: Missing Bearer token");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Invalid token: User verification failed");
    }

    const requestBody = await req.json();
    const { fileUrl, storagePath, fileName, content, type, count, instructions } = requestBody as RequestBody;

    if (!fileName && !content) throw new Error("fileName or content is required");
    const validTypes = ['flashcards', 'summary', 'quiz', 'roadmap', 'level_pack'];
    if (!type || !validTypes.includes(type)) throw new Error("Invalid generation type");

    // --- PASO 1: OBTENCIÓN DE CONTENIDO ---
    let base64Content = "";
    let mimeType = "text/plain";
    const hasRawText = typeof content === "string" && content.trim().length > 0;

    if (!hasRawText) {
      let fileBuffer: ArrayBuffer;
      if (storagePath) {
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
        const { data: fileData, error: downloadError } = await serviceClient.storage
          .from('library-files')
          .download(storagePath);

        if (downloadError || !fileData) {
          throw new Error(`Failed to download file: ${downloadError?.message || 'Unknown error'}`);
        }
        fileBuffer = await fileData.arrayBuffer();
      } else if (fileUrl) {
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
        fileBuffer = await fileResponse.arrayBuffer();
      } else {
        throw new Error("Either content, fileUrl or storagePath is required");
      }

      if (fileBuffer.byteLength > 20 * 1024 * 1024) {
        throw new Error("File too large (max 20MB)");
      }

      const ext = (fileName || "").toLowerCase().split(".").pop();
      switch (ext) {
        case "pdf": mimeType = "application/pdf"; break;
        case "txt": mimeType = "text/plain"; break;
        case "md": mimeType = "text/plain"; break;
        case "docx": mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"; break;
        case "jpg": case "jpeg": mimeType = "image/jpeg"; break;
        case "png": mimeType = "image/png"; break;
      }

      base64Content = btoa(
        new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
    }

    // --- PASO 2: SYSTEM PROMPT ESTRICTO Y JSON SCHEMA (STRUCTURED OUTPUTS) ---
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY missing");

    let systemPrompt = "";
    let responseSchema: any = null;
    const generationCount = count || (type === 'flashcards' ? 10 : 5);

    if (type === 'flashcards') {
      systemPrompt = `Eres un tutor experto. Analiza el texto proporcionado y extrae los conceptos más importantes para estudiar.
Genera exactamente ${generationCount} Flashcards de alta calidad.
Reglas:
1. Preguntas cortas y directas.
2. Respuestas precisas y fáciles de memorizar.
3. Devuelve ÚNICAMENTE un array JSON con el formato: [{ "question": "...", "answer": "..." }]. Ninguna palabra adicional.`;

      responseSchema = {
        type: "ARRAY",
        description: "Array de flashcards de estudio",
        items: {
          type: "OBJECT",
          properties: {
            question: { type: "STRING", description: "Pregunta corta y directa" },
            answer: { type: "STRING", description: "Respuesta concisa y fácil de memorizar" }
          },
          required: ["question", "answer"]
        }
      };
    } else if (type === 'quiz') {
      systemPrompt = `Eres un tutor experto. Analiza el texto proporcionado y extrae los conceptos más importantes para evaluar conocimientos.
Genera exactamente ${generationCount} preguntas de opción múltiple de alta calidad.
Reglas:
1. Preguntas claras, directas y enfocadas en conceptos clave.
2. Cada pregunta debe tener exactamente 4 opciones de respuesta ("opciones").
3. Especifica el índice de la respuesta correcta ("correcta": 0, 1, 2 o 3).
4. Incluye una breve explicación pedagógica ("explicacion").
5. Devuelve ÚNICAMENTE un array JSON con el formato: [{ "pregunta": "...", "opciones": ["...", "...", "...", "..."], "correcta": 0, "explicacion": "..." }]. Ninguna palabra adicional.`;

      responseSchema = {
        type: "ARRAY",
        description: "Array de preguntas de cuestionario",
        items: {
          type: "OBJECT",
          properties: {
            pregunta: { type: "STRING" },
            opciones: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            correcta: { type: "INTEGER" },
            explicacion: { type: "STRING" }
          },
          required: ["pregunta", "opciones", "correcta", "explicacion"]
        }
      };
    } else if (type === 'roadmap') {
      systemPrompt = `Eres un planificador de estudios universitario experto y diseñador curricular. Analiza el material del estudiante y genera una ruta de aprendizaje secuencial por niveles.
Devuelve ÚNICAMENTE un objeto JSON con el formato: { "roadmap": [{ "level": 1, "title": "...", "summary": "...", "keyTopics": ["..."], "sourceFiles": ["..."], "estimatedMinutes": 30 }] }. Ninguna palabra adicional.`;

      responseSchema = {
        type: "OBJECT",
        properties: {
          roadmap: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                level: { type: "INTEGER" },
                title: { type: "STRING" },
                summary: { type: "STRING" },
                keyTopics: { type: "ARRAY", items: { type: "STRING" } },
                sourceFiles: { type: "ARRAY", items: { type: "STRING" } },
                estimatedMinutes: { type: "INTEGER" }
              },
              required: ["level", "title", "summary", "keyTopics"]
            }
          }
        },
        required: ["roadmap"]
      };
    } else if (type === 'level_pack') {
      systemPrompt = `Eres un catedrático universitario titular y mentor académico de excelencia. Tu misión es construir el paquete de estudio completo más riguroso, didáctico y enriquecido del nivel asignado.

REGLAS PEDAGÓGICAS ESTRICTAS (CERO COPY-PASTE):
1. PROHIBIDO cortar y pegar frases sueltas del apunte. Debes EXPLICAR la materia con pedagogía y criterio docente universitario: desglosar el porqué de los conceptos, ilustrar con analogías claras, explicar cómo se deducen los modelos y completar con tu conocimiento experto cualquier laguna o hueco que tenga el apunte del estudiante.
2. ESTRUCTURA DE LA GUÍA TEÓRICA ('studyGuide'): Debe contener exactamente 4 o 5 módulos pedagógicos extensos y sustanciosos:
   - Módulo 1: Marco Teórico, Principios y Axiomas Nucleares (definiciones formales, supuestos de validez).
   - Módulo 2: Procedimiento Analítico y Deducción Paso a Paso (resolución detallada, metodología).
   - Módulo 3: Casos de Examen y Planteos Típicos de Parcial/Final (ejercicios modelo explicados a fondo).
   - Módulo 4: Trampas Comunes, Errores que Desaprueban y Criterios Evaluativos (alertas de examen).
   - Módulo 5: Glosario Técnico de Cátedra y Articulación Temática.
3. PODCAST DE CLASE MAGISTRAL ('podcastScript'):
   - Redacta un guion de locución hablada natural, fluida, humana y envolvente, como un profesor apasionado que da una clase de audio individual a su alumno.
   - En 'chapters', desarrolla la explicación conversacional de cada módulo teórico (sin leer listas aburridas ni usar caracteres extraños).
   - 'fullNarration': une introducción, capítulos y conclusión en una clase hablada completa y magistral.
4. FLASHCARDS ('flashcards'): Mazo de tarjetas que desafían la comprensión conceptual y práctica del estudiante.
5. CUESTIONARIO ESCRITO ('questions'): Preguntas rigurosas de opción múltiple con 4 alternativas verosímiles y justificación teórica paso a paso en 'explicacion'.
6. EXAMEN ORAL ('oralQuestions'): 3 a 4 preguntas de tribunal evaluador que exigen al alumno formular y defender su respuesta hablando, con criterios de corrección claros y respuesta modelo.

Devuelve ÚNICAMENTE un objeto JSON válido con la estructura solicitada.`;

      responseSchema = {
        type: "OBJECT",
        properties: {
          studyGuide: {
            type: "OBJECT",
            properties: {
              overview: { type: "STRING", description: "Resumen conceptual denso del nivel" },
              sections: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    heading: { type: "STRING" },
                    content: { type: "STRING" },
                    keyPoints: { type: "ARRAY", items: { type: "STRING" } }
                  },
                  required: ["heading", "content", "keyPoints"]
                }
              },
              examTips: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: ["overview", "sections", "examTips"]
          },
          podcastScript: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              episodeNumber: { type: "INTEGER" },
              introduction: { type: "STRING" },
              chapters: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    heading: { type: "STRING" },
                    narration: { type: "STRING" },
                    keyTakeaway: { type: "STRING" }
                  },
                  required: ["heading", "narration", "keyTakeaway"]
                }
              },
              conclusion: { type: "STRING" },
              fullNarration: { type: "STRING" }
            },
            required: ["title", "introduction", "chapters", "conclusion", "fullNarration"]
          },
          flashcards: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                question: { type: "STRING" },
                answer: { type: "STRING" }
              },
              required: ["question", "answer"]
            }
          },
          questions: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                pregunta: { type: "STRING" },
                opciones: { type: "ARRAY", items: { type: "STRING" } },
                correcta: { type: "INTEGER" },
                explicacion: { type: "STRING" },
                dificultad: { type: "STRING" }
              },
              required: ["pregunta", "opciones", "correcta", "explicacion"]
            }
          },
          oralQuestions: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                pregunta: { type: "STRING" },
                criterios: { type: "ARRAY", items: { type: "STRING" } },
                respuestaModelo: { type: "STRING" },
                puntosClave: { type: "ARRAY", items: { type: "STRING" } }
              },
              required: ["id", "pregunta", "criterios", "respuestaModelo", "puntosClave"]
            }
          }
        },
        required: ["studyGuide", "podcastScript", "flashcards", "questions", "oralQuestions"]
      };
    } else {
      systemPrompt = `Eres un tutor experto. Analiza el texto proporcionado y extrae las ideas principales, estructura y conclusiones clave.
Genera un resumen completo, estructurado y de alta calidad usando formato Markdown (títulos, listas con viñetas, negritas).
Devuelve ÚNICAMENTE un objeto JSON con el formato: { "summary": "..." }. Ninguna palabra adicional.`;

      responseSchema = {
        type: "OBJECT",
        properties: {
          summary: { type: "STRING", description: "Resumen completo en formato Markdown" }
        },
        required: ["summary"]
      };
    }

    // Contexto personalizado por usuario/evento (materia, meta de dominio, preferencia, plan de niveles)
    if (typeof instructions === "string" && instructions.trim()) {
      systemPrompt += `\n\nCONTEXTO Y REGLAS ADICIONALES (obligatorias):\n${instructions.trim().slice(0, 6000)}`;
    }

    // --- PASO 3: EJECUCIÓN CON STRUCTURED OUTPUTS Y MODELO FLASH ---
    let aiResponseData: any = null;
    const errorLog: string[] = [];

    const userParts: any[] = [];
    if (hasRawText) {
      userParts.push({ text: `Texto a procesar:\n\n${content}` });
    } else {
      userParts.push({ text: `Analiza el documento adjunto (${fileName || 'documento'}) y genera el contenido solicitado:` });
      userParts.push({ inline_data: { mime_type: mimeType, data: base64Content } });
    }

    // Iteramos directamente sobre los modelos ultra rápidos sin consultas previas de red
    for (const model of ULTRA_FAST_MODELS) {
      try {
        console.log(`[generate-study-content] Invocando modelo rápido: ${model}`);
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

        // Intentar primero con Structured Outputs estricto (responseSchema)
        const requestPayload = {
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [{
            role: "user",
            parts: userParts
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema: responseSchema
          }
        };

        let res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload)
        });

        // Si el modelo rechaza responseSchema, reintentar en modo json_object puro
        if (!res.ok) {
          const firstErr = await res.text();
          console.warn(`[${model}] Error con responseSchema (${res.status}): ${firstErr}. Reintentando con json_object básico.`);
          
          const fallbackPayload = {
            contents: [{
              parts: [
                { text: `${systemPrompt}\n\nIMPORTANTE: Responde ÚNICAMENTE con JSON puro válido sin texto conversacional ni backticks.` },
                ...userParts
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192,
              responseMimeType: "application/json"
            }
          };

          res = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fallbackPayload)
          });

          if (!res.ok) {
            const retryErr = await res.text();
            throw new Error(`Status ${res.status}: ${retryErr}`);
          }
        }

        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error("Respuesta vacía del modelo");

        let cleanText = rawText.trim();
        if (cleanText.startsWith("```json")) {
          cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        aiResponseData = JSON.parse(cleanText);
        console.log(`[generate-study-content] Éxito con ${model}`);
        break;
      } catch (err: any) {
        console.warn(`[generate-study-content] Falló ${model}: ${err.message}`);
        errorLog.push(`${model}: ${err.message}`);
      }
    }

    if (!aiResponseData) {
      throw new Error(`No se pudo generar el contenido con los modelos disponibles: ${errorLog.join("; ")}`);
    }

    // --- PASO 4: NORMALIZACIÓN DE RESPUESTA ---
    let finalData: any;
    let extraCards: any = undefined;
    let extraQuestions: any = undefined;

    if (type === 'flashcards') {
      const rawList = Array.isArray(aiResponseData)
        ? aiResponseData
        : (aiResponseData?.cards || aiResponseData?.flashcards || []);

      const normalizedCards = rawList.map((c: any) => ({
        question: c.question || c.pregunta || "",
        answer: c.answer || c.respuesta || "",
        pregunta: c.pregunta || c.question || "",
        respuesta: c.respuesta || c.answer || ""
      }));

      finalData = normalizedCards;
      extraCards = normalizedCards;
    } else if (type === 'quiz') {
      const rawQuestions = Array.isArray(aiResponseData)
        ? aiResponseData
        : (aiResponseData?.questions || aiResponseData?.cuestionario || []);

      finalData = rawQuestions;
      extraQuestions = rawQuestions;
    } else {
      finalData = aiResponseData;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: finalData,
        cards: extraCards,
        questions: extraQuestions
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Critical Error generate-study-content:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown error" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

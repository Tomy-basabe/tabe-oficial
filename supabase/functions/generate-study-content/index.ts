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
  type: 'flashcards' | 'summary' | 'quiz';
  count?: number;
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
    const { fileUrl, storagePath, fileName, content, type, count } = requestBody as RequestBody;

    if (!fileName && !content) throw new Error("fileName or content is required");
    const validTypes = ['flashcards', 'summary', 'quiz'];
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

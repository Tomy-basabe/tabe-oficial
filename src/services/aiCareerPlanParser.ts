import * as XLSX from "xlsx";
import { extractTextFromPdf } from "@/lib/pdf-utils";
import { supabase } from "@/integrations/supabase/client";
import { GEMINI_API_KEY, OPENROUTER_API_KEY } from "@/config/aiModels";

export interface ParsedSubject {
  id?: string;
  nombre: string;
  codigo: string;
  año: number;
  numero_materia: number;
  requiere_regular: string[];
  requiere_aprobada: string[];
}

export interface CareerPlanAIResult {
  careerName: string;
  facultad?: string;
  subjects: ParsedSubject[];
}

/**
 * Extracts clean, compact text from an Excel file (.xlsx, .xls, .csv).
 * Trims empty rows/columns and trailing separators for instant, error-free parsing.
 */
export async function extractTextFromExcel(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  let fullText = "";

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv && csv.trim().length > 0) {
      // Filter out lines that only contain commas or whitespace
      const cleanLines = csv
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.replace(/,/g, "").trim().length > 0);

      if (cleanLines.length > 0) {
        fullText += `\n=== HOJA: "${sheetName}" ===\n${cleanLines.join("\n")}\n`;
      }
    }
  });

  return fullText.trim();
}

/**
 * Optimizes an image for AI vision models:
 * Resizes high-res phone/scanner photos (e.g. 4000x3000) to max 1200px
 * and compresses as crisp JPEG (0.80 quality), shrinking 15MB files to ~220KB
 * so network transfer is instant and AI vision completes in 2-3 seconds.
 */
export async function optimizeImageForAI(
  file: File,
  maxDimension = 1200,
  quality = 0.80
): Promise<{ data: string; mime_type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          const raw = (e.target?.result as string) || "";
          resolve({ data: raw.includes(",") ? raw.split(",")[1] : raw, mime_type: file.type || "image/jpeg" });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const cleanBase64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
        resolve({ data: cleanBase64, mime_type: "image/jpeg" });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
/**
 * Optimizes an array of images independently: resizes high-res images to max 1400px,
 * keeping crisp text without distorting aspect ratios or horizontal squeezing.
 */
export async function optimizeMultipleImages(
  imageFiles: File[]
): Promise<Array<{ data: string; mime_type: string }>> {
  return Promise.all(imageFiles.map((file) => optimizeImageForAI(file, 1400, 0.85)));
}

/**
 * Backward compatibility alias for single-image cases
 */
export async function stitchImagesVertically(imageFiles: File[]): Promise<{ data: string; mime_type: string }> {
  if (imageFiles.length === 0) return { data: "", mime_type: "image/jpeg" };
  const optimized = await optimizeMultipleImages(imageFiles);
  return optimized[0];
}

/**
 * System Prompt strictly instructing the AI to output TABE Career Plan JSON
 */
const CAREER_PLAN_SYSTEM_PROMPT = `Sos un experto universitario en digitalización y estructuración de planes de estudio universitarios y mallas curriculares académicas (especialmente de universidades de Argentina y Latinoamérica como UTN, UBA, UNCUYO, UNC, UNLP, UNSJ, etc.).
Tu objetivo es analizar minuciosamente los documentos provistos (planillas Excel, PDFs o imágenes de planes de estudio) y extraer la lista COMPLETA de todas las materias de la carrera académica con sus dos tipos fundamentales de correlatividades: REGULARES y APROBADAS.

REGLAS OBLIGATORIAS:
1. Responde ÚNICAMENTE con un bloque JSON válido dentro de triple tilde invertida: \`\`\`json { ... } \`\`\`.
2. NO incluyas introducciones, despedidas ni comentarios. Solo el bloque JSON.
3. El JSON debe tener exactamente esta estructura:
{
  "carrera": "Nombre Oficial de la Carrera",
  "facultad": "Nombre de la Facultad o Universidad (o vacío si no figura)",
  "materias": [
    {
      "nombre": "Nombre de la Materia",
      "codigo": "CÓDIGO_O_SIGLA",
      "año": 1,
      "numero_materia": 1,
      "requiere_regular": ["AM1", "AGA"],
      "requiere_aprobada": ["F1"]
    }
  ]
}

DETALLES DE CAMPOS Y CORRELATIVIDADES:
- "nombre": Nombre completo y limpio de la materia (ej: "Análisis Matemático I", "Física I", "Algoritmos y Estructuras de Datos"). Sin números de correlatividad pegados al texto.
- "codigo": Código, número oficial o sigla de la materia (ej: "AM1", "FIS1", "95-0201", "101"). Si no hay códigos explícitos, inventá una sigla de 2 a 5 letras mayúsculas única y consistente para cada materia.
- "año": Número entero positivo del año de cursado (1, 2, 3, 4, 5, 6...). NUNCA 0 ni nulo. Si la materia figura por cuatrimestre, asignala al año correspondiente (1er y 2do cuatrimestre = Año 1; 3er y 4to cuatrimestre = Año 2, etc.).
- "numero_materia": Número secuencial o de orden de la materia en el plan (1, 2, 3... hasta N).

GUÍA CRÍTICA PARA CORRELATIVIDADES (REGULARES VS APROBADAS):
En las universidades existen dos grupos claros de correlatividades en tablas y programas:

1. "requiere_regular" (Correlativas para Cursar / Materias Regulares):
   - Materias que deben estar "REGULARIZADAS", "CURSADAS", con "TRABAJOS PRÁCTICOS FIRMADOS", "R" o "C".
   - Encabezados típicos en las tablas: "Para Cursar (Tener Regular)", "Cursada", "Cursadas", "Regulares", "Tener Cursada", "R", "C".
   - Colocá en este arreglo los códigos o nombres de las materias correspondientes.

2. "requiere_aprobada" (Correlativas para Rendir / Materias Aprobadas):
   - ¡MUY IMPORTANTE! Materias que deben estar totalmente "APROBADAS" (con examen final rendido o promoción).
   - Encabezados típicos en las tablas: "Para Rendir (Tener Aprobada)", "Para Rendir Final", "Para Rendir", "Tener Aprobada", "Aprobadas", "Examen Final", "A", "Final", o "Para Cursar debe tener Aprobada".
   - Si una columna o celda indica requisitos bajo "Para Rendir", "Final" o "Aprobadas", esas materias van OBLIGATORIAMENTE en "requiere_aprobada".
   - ¡NUNCA dejes "requiere_aprobada" vacío si el documento tiene correlativas para rendir o columnas de materias aprobadas!

3. RESOLUCIÓN DE NÚMEROS DE ASIGNATURA:
   - En muchos planes, las correlativas están escritas como números que apuntan a materias previas del listado (por ejemplo: "1, 2" o "3, 5, 7").
   - En ese caso, reemplazá esos números por el código o nombre de la materia a la que apuntan (ej: si la materia 1 es "Análisis Matemático I", poné "AM1" o "Análisis Matemático I"). Si no podés resolver el código, colocá el número ("1").

INSTRUCCIONES CLAVE PARA IMÁGENES:
- Se pueden adjuntar una o múltiples imágenes (capturas de pantalla, fotos del plan o del portal de la facultad).
- Analizá minuciosamente CADA UNA de las imágenes adjuntas. Si una imagen contiene unas materias y otra imagen contiene otras, COMBINA todas las materias en la lista final "materias".
- Si en las imágenes hay tablas, listas o nombres de materias, EXTRAELAS SIEMPRE.
- ÚNICAMENTE responde con el bloque de error DOCUMENTO_INVALIDO si las imágenes o documentos adjuntos NO contienen absolutamente ninguna materia ni nada académico (por ejemplo: memes, selfies, paisajes o fotos personales sin materias). Si hay asignaturas visibles, extraé todas las materias que veas.

Asegurate de incluir TODAS las materias del plan académico sin omitir ninguna.`;

/**
 * Main function: Processes files (Excel, PDF, Images) and extracts a career plan using AI
 */
export async function parseCareerPlanWithAI(
  files: File[],
  additionalNotes?: string,
  onProgress?: (step: string) => void
): Promise<CareerPlanAIResult> {
  if (files.length === 0) {
    throw new Error("Por favor selecciona al menos un archivo Excel, PDF o imagen.");
  }

  onProgress?.("Extrayendo contenido de los archivos...");

  let combinedText = "";
  const imageFiles: File[] = [];

  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isExcel = ["xlsx", "xls", "csv"].includes(ext || "");
    const isPdf = ext === "pdf" || file.type === "application/pdf";
    const isImage = ["png", "jpg", "jpeg", "webp"].includes(ext || "") || file.type.startsWith("image/");

    if (isExcel) {
      onProgress?.(`Leyendo planilla Excel: ${file.name}...`);
      const excelText = await extractTextFromExcel(file);
      combinedText += `\n--- ARCHIVO EXCEL: ${file.name} ---\n${excelText}\n`;
    } else if (isPdf) {
      onProgress?.(`Extrayendo texto del PDF: ${file.name}...`);
      const pdfText = await extractTextFromPdf(file);
      combinedText += `\n--- ARCHIVO PDF: ${file.name} ---\n${pdfText}\n`;
    } else if (isImage) {
      imageFiles.push(file);
    } else {
      throw new Error(`El archivo "${file.name}" tiene un formato no válido. Solo se admiten archivos Excel, PDF o Imágenes.`);
    }
  }

  if (combinedText.trim().length === 0 && imageFiles.length === 0) {
    throw new Error("No se pudo leer ningún archivo. Asegurate de subir un archivo Excel, PDF o imagen válido.");
  }

  if (imageFiles.length === 0 && combinedText.trim().length < 25) {
    throw new Error("No se pudo extraer texto del archivo adjunto o está vacío. Asegurate de subir un archivo Excel o PDF con el plan de estudios.");
  }

  let imagePayloads: Array<{ data: string; mime_type: string }> = [];
  if (imageFiles.length > 0) {
    onProgress?.(`Optimizando ${imageFiles.length} imagen(es) para análisis ultrarrápido...`);
    imagePayloads = await optimizeMultipleImages(imageFiles);
  }

  let userPrompt = "Analizá minuciosamente el contenido adjunto y extraé el Plan de Carrera completo con todas sus materias, años y correlatividades.";
  if (additionalNotes && additionalNotes.trim().length > 0) {
    userPrompt += `\nNotas adicionales del estudiante: ${additionalNotes.trim()}`;
  }

  if (combinedText.trim().length > 0) {
    userPrompt += `\n\nCONTENIDO DE DOCUMENTOS:\n${combinedText.slice(0, 45000)}`;
  }

  onProgress?.("La Inteligencia Artificial está analizando las materias y correlativas...");

  const rawAIResponse = await callAIService({
    systemPrompt: CAREER_PLAN_SYSTEM_PROMPT,
    userPrompt,
    image: imagePayloads[0],
    images: imagePayloads,
  });

  onProgress?.("Estructurando plan y ordenando correlatividades...");

  return parseAndSanitizeAIResponse(rawAIResponse);
}

/**
 * Calls AI service via Supabase Edge Function (ai-assistant-stream), with fallback to Gemini or OpenRouter
 */
async function callAIService(params: {
  systemPrompt: string;
  userPrompt: string;
  image?: { data: string; mime_type: string };
  images?: Array<{ data: string; mime_type: string }>;
}): Promise<string> {
  const { systemPrompt, userPrompt, image, images } = params;

  // 1. Try Supabase Edge Function ai-assistant-stream
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    let authToken = session?.access_token;
    if (session?.expires_at && session.expires_at * 1000 < Date.now() + 30000) {
      try {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed.session?.access_token) authToken = refreshed.session.access_token;
      } catch (_) {}
    }

    const token = authToken || anonKey;

    if (token && supabaseUrl) {
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-assistant-stream`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: userPrompt }],
          system_prompt: systemPrompt,
          context_page: "CAREER_PLAN_IMPORT",
          requested_model_id: "tabe-ai",
          requested_provider: "local",
          power_level: "alto",
          image: image || (images && images[0]),
          images,
        }),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullOutput = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);
              const chunk = parsed.choices?.[0]?.delta?.content || parsed.content || "";
              fullOutput += chunk;
            } catch (_) {}
          }
        }

        if (fullOutput.trim().length > 0) {
          return fullOutput;
        }
      }
    }
  } catch (err) {
    console.warn("Edge function stream failed, trying fallback:", err);
  }

  // 2. Direct Gemini fallback if key is configured
  if (GEMINI_API_KEY) {
    try {
      const contents: any[] = [];
      const parts: any[] = [{ text: userPrompt }];

      if (image) {
        parts.push({
          inlineData: {
            mimeType: image.mime_type,
            data: image.data,
          },
        });
      }

      contents.push({ role: "user", parts });

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (gErr) {
      console.warn("Direct Gemini fallback failed:", gErr);
    }
  }

  // 3. Direct OpenRouter fallback
  if (OPENROUTER_API_KEY) {
    try {
      const messages: any[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ];

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin || "https://tabe.com.ar",
          "X-Title": "TABE",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages,
          temperature: 0.2,
          max_tokens: 8192,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch (orErr) {
      console.warn("OpenRouter fallback failed:", orErr);
    }
  }

  throw new Error("No se pudo conectar con el servicio de IA para analizar los archivos. Por favor intentá nuevamente.");
}

/**
 * Extracts JSON block from AI output and standardizes every subject
 */
function parseAndSanitizeAIResponse(rawText: string): CareerPlanAIResult {
  let jsonString = rawText.trim();

  // Try extracting markdown code block ```json ... ```
  const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    jsonString = codeBlockMatch[1].trim();
  } else {
    // Look for outermost { ... }
    const firstBrace = jsonString.indexOf("{");
    const lastBrace = jsonString.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = jsonString.slice(firstBrace, lastBrace + 1);
    }
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    console.error("Failed to parse JSON from AI output:", rawText);
    throw new Error("La IA no devolvió un formato de plan reconocible. Intentá con imágenes más nítidas o un archivo Excel/PDF.");
  }

  const rawSubjects = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.materias)
    ? parsed.materias
    : Array.isArray(parsed.subjects)
    ? parsed.subjects
    : [];

  // Solo mostrar error de documento inválido si realmente no se extrajo ninguna materia
  if ((parsed.error || parsed.error === "DOCUMENTO_INVALIDO") && rawSubjects.length === 0) {
    throw new Error(
      parsed.mensaje ||
      "El archivo adjunto no parece contener un plan de estudios o materias universitarias. Por favor subí una foto nítida o archivo con el listado de materias."
    );
  }

  if (rawSubjects.length === 0) {
    throw new Error("No se detectaron materias legibles en las imágenes o archivos adjuntos. Asegurate de que la imagen sea nítida y muestre los nombres de las materias.");
  }

  const careerName = (parsed.carrera || parsed.career_name || "Mi Carrera").trim();
  const facultad = (parsed.facultad || "").trim();

  // Clean and validate subjects
  const subjects: ParsedSubject[] = rawSubjects.map((s: any, idx: number) => {
    const rawName = String(s.nombre || s.name || `Materia ${idx + 1}`).trim();
    let rawCode = String(s.codigo || s.code || "").trim().toUpperCase();

    // If code is missing, generate abbreviation from name
    if (!rawCode || rawCode.length < 2) {
      const words = rawName.split(/\s+/).filter((w) => w.length > 2);
      if (words.length >= 2) {
        rawCode = words.slice(0, 3).map((w) => w[0].toUpperCase()).join("");
      } else {
        rawCode = rawName.slice(0, 4).toUpperCase();
      }
    }

    let yearNum = parseInt(String(s.año || s.year || 1), 10);
    if (isNaN(yearNum) || yearNum < 1) yearNum = 1;
    if (yearNum > 10) yearNum = 1; // Sanity limit

    let orderNum = parseInt(String(s.numero_materia || s.numero || idx + 1), 10);
    if (isNaN(orderNum) || orderNum < 1) orderNum = idx + 1;

    const toStrArray = (val: any): string[] => {
      if (!val) return [];
      const rawList = Array.isArray(val) ? val : [val];
      const result: string[] = [];
      rawList.forEach((item) => {
        if (!item) return;
        String(item)
          .split(/[,;\n/&]|\by\b|\be\b/i)
          .map((x) => x.trim())
          .filter((x) => x.length > 0 && !["ninguna", "no tiene", "-", "none", "sin correlativas"].includes(x.toLowerCase()))
          .forEach((cleaned) => result.push(cleaned));
      });
      return result;
    };

    return {
      id: crypto.randomUUID(),
      nombre: rawName,
      codigo: rawCode,
      año: yearNum,
      numero_materia: orderNum,
      requiere_regular: toStrArray(
        s.requiere_regular ||
        s.correlativas_regular ||
        s.regulares ||
        s.para_cursar ||
        s.cursadas ||
        s.regular ||
        s.cursada ||
        s.correlativas_para_cursar ||
        s.prerequisites
      ),
      requiere_aprobada: toStrArray(
        s.requiere_aprobada ||
        s.correlativas_aprobada ||
        s.aprobadas ||
        s.para_rendir ||
        s.final ||
        s.finales ||
        s.aprobada ||
        s.rendir ||
        s.correlativas_para_rendir ||
        s.para_rendir_final
      ),
    };
  });

  // Sort by year and numero_materia
  subjects.sort((a, b) => {
    if (a.año !== b.año) return a.año - b.año;
    return a.numero_materia - b.numero_materia;
  });

  return {
    careerName,
    facultad,
    subjects,
  };
}

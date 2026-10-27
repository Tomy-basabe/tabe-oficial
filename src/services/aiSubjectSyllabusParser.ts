import { extractTextFromExcel, optimizeMultipleImages, callAIService } from "./aiCareerPlanParser";
import { extractTextFromPdf } from "@/lib/pdf-utils";

export interface SyllabusDetectedEvent {
  id: string;
  titulo: string;
  fecha: string; // YYYY-MM-DD
  hora?: string | null;
  tipo_examen: string;
  descripcion?: string;
  selected?: boolean;
}

export interface SyllabusDetectedPartial {
  id: string; // "P3", "P4", etc.
  nombre: string;
  incluyeRecuperatorio: boolean;
  selected?: boolean;
}

export interface SyllabusParsedResult {
  materiaNombre?: string;
  totalParcialesDetectados: number;
  parcialesExtraSugeridos: SyllabusDetectedPartial[];
  globalesExtraSugeridos: number;
  pesosSugeridos: Record<string, number>;
  eventosDetectados: SyllabusDetectedEvent[];
  resumenRegimen?: string;
}

const SYLLABUS_SYSTEM_PROMPT = `Sos el motor de análisis académico de TABE. Tu tarea es analizar con máxima precisión y objetividad los documentos provistos (programas de asignaturas, reglamentos de cátedra, planificaciones, cronogramas y notas del estudiante) para extraer la estructura exacta de cursada y evaluación de la materia especificada.

REGLAS FUNDAMENTALES DE PRECISIÓN Y CONSISTENCIA:
1. CONSISTENCIA E IDEMPOTENCIA TOTAL:
   - El resultado DEBE ser coherente e idéntico sin importar si la información proviene de 1 único archivo consolidado o de múltiples archivos separados (ej. programa + cronograma + reglamento).
   - NUNCA cambies la cantidad de parciales ni inventes evaluaciones según la cantidad de archivos provistos.

2. DEDUPLICACIÓN ESTRICTA:
   - Si una misma evaluación aparece nombrada en varios documentos o páginas (por ejemplo: "1° Parcial", "Primer Parcial", "Parcial 1"), es UN SOLO evento evaluativo, NUNCA dos.
   - Consolida la fecha, hora y descripción en un único evento unificado.

3. ESTRUCTURA REAL DE PARCIALES:
   - Determina con fidelidad cuántos parciales exige la cátedra:
     * Si la cátedra toma 2 parciales: "total_parciales": 2, "parciales_extra": [].
     * Si la cátedra toma 3 parciales (P1, P2, P3): "total_parciales": 3, "parciales_extra": [{ "id": "P3", "nombre": "3° Parcial", "incluye_recuperatorio": true }].
     * Si la cátedra toma 4 parciales (P1, P2, P3, P4): "total_parciales": 4, "parciales_extra": [{ "id": "P3", "nombre": "3° Parcial", "incluye_recuperatorio": true }, { "id": "P4", "nombre": "4° Parcial", "incluye_recuperatorio": true }].
     * Aplica la misma regla para 5 o más parciales.
   - Si en los documentos no se especifica explícitamente un número mayor a 2, asume 2 parciales estándar.

4. CALENDARIO Y FECHAS:
   - Extrae únicamente fechas reales de evaluaciones (parciales, recuperatorios, entregas de TPs, coloquios, finales) que figuren explícitamente en el material o cronograma.
   - Si un documento no contiene fechas exactas, NO inventes fechas arbitrarias. Devuelve un array vacío o solo los eventos con fechas comprobables.
   - Formato de fecha obligatorio: YYYY-MM-DD.

5. PONDERACIÓN PORCENTUAL (%):
   - Extrae el porcentaje (%) que la cátedra asigna a cada parcial para la regularidad o promoción (ej: P1=30, P2=30, P3=40).
   - Si no hay porcentajes explícitos pero hay N parciales, distribuye el 100% equitativamente. La suma siempre debe ser exactamente 100.

FORMATO DE SALIDA REQUERIDO:
Responde ÚNICAMENTE con un bloque JSON válido dentro de triple comilla invertida: \`\`\`json { ... } \`\`\`. Sin introducciones ni texto fuera del bloque.

Estructura JSON exacta:
{
  "total_parciales": 3,
  "resumen_regimen": "Breve síntesis de 1 o 2 oraciones del régimen de aprobación y cursado de la materia",
  "parciales_extra": [
    {
      "id": "P3",
      "nombre": "3° Parcial",
      "incluye_recuperatorio": true
    }
  ],
  "globales_extra": 0,
  "pesos_parciales": {
    "P1": 33,
    "P2": 33,
    "P3": 34
  },
  "eventos": [
    {
      "titulo": "1° Parcial",
      "fecha": "2025-05-15",
      "hora": "18:00",
      "tipo_examen": "P1",
      "descripcion": "Contenidos de unidades 1 a 3"
    }
  ]
}

TIPOS VÁLIDOS DE EXAMEN:
- "P1", "P2", "P3", "P4", "P5"
- "Recuperatorio P1", "Recuperatorio P2", "Recuperatorio P3"
- "TP", "Entrega"
- "Global", "Recuperatorio Global"
- "Final"
- "Clase", "Otro"`;

/**
 * Smart extractor for long academic documents (Syllabus, cátedra regulations, chronograms).
 * Preserves high-value sections (evaluation, regime, dates, grading) even in large 30+ page PDFs.
 */
function extractRelevantAcademicSections(fullText: string, maxChars: number = 45000): string {
  if (fullText.length <= maxChars) {
    return fullText;
  }

  const pageDelimiter = /--- Página \d+ ---/g;
  const rawParts = fullText.split(pageDelimiter);

  if (rawParts.length <= 1) {
    return fullText.slice(0, maxChars);
  }

  const academicKeywords = [
    /evaluaci[oó]n/i,
    /r[eé]gimen/i,
    /cursad[ao]/i,
    /parcial/i,
    /recuperator/i,
    /promoci[oó]n/i,
    /regular/i,
    /aprobac/i,
    /cronograma/i,
    /calendario/i,
    /fecha/i,
    /coloquio/i,
    /ponderac/i,
    /porcent/i,
    /trabajo\s+pr[aá]ctico/i,
    /\btp\b/i,
    /entrega/i,
    /asistencia/i,
    /condici[oó]n/i,
    /final/i,
  ];

  interface ScoredPart {
    index: number;
    text: string;
    score: number;
  }

  const scoredParts: ScoredPart[] = rawParts.map((text, idx) => {
    let score = 0;
    const lower = text.toLowerCase();
    for (const kw of academicKeywords) {
      const match = lower.match(kw);
      if (match) score += match.length * 3;
    }
    // Boost first 2 pages for subject metadata/header
    if (idx <= 2) score += 6;
    return { index: idx, text, score };
  });

  const selectedIndices = new Set<number>([0, 1]);
  let currentLength = (rawParts[0] || "").length + (rawParts[1] || "").length;

  const prioritySorted = [...scoredParts]
    .filter(p => !selectedIndices.has(p.index))
    .sort((a, b) => b.score - a.score);

  for (const item of prioritySorted) {
    if (currentLength + item.text.length > maxChars) {
      if (item.score >= 5 && maxChars - currentLength > 500) {
        selectedIndices.add(item.index);
      }
      break;
    }
    selectedIndices.add(item.index);
    currentLength += item.text.length;
  }

  const output: string[] = [];
  scoredParts.forEach(p => {
    if (selectedIndices.has(p.index)) {
      output.push(`--- Página ${p.index} ---\n${p.text.trim()}`);
    }
  });

  return output.join("\n\n");
}

/**
 * Parses a subject syllabus / plan de materia from files or raw text using AI
 */
export async function parseSubjectSyllabusWithAI(params: {
  subjectName: string;
  files: File[];
  pastedText?: string;
  onProgress?: (step: string) => void;
}): Promise<SyllabusParsedResult> {
  const { subjectName, files, pastedText, onProgress } = params;

  if (files.length === 0 && (!pastedText || pastedText.trim().length === 0)) {
    throw new Error("Por favor sube al menos un archivo (PDF, Excel, Imagen) o pega el texto del plan de la materia.");
  }

  onProgress?.("Leyendo y procesando todos los archivos y notas...");

  const textSections: string[] = [];
  const imageFiles: File[] = [];

  // 1. User notes
  if (pastedText && pastedText.trim().length > 0) {
    textSections.push(`=== NOTAS Y COMENTARIOS DEL ESTUDIANTE ===\n${pastedText.trim()}\n`);
  }

  // 2. Process documents
  let fileIndex = 1;
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isExcel = ["xlsx", "xls", "csv"].includes(ext);
    const isPdf = ext === "pdf" || file.type === "application/pdf";
    const isImage = ["png", "jpg", "jpeg", "webp"].includes(ext) || file.type.startsWith("image/");

    if (isExcel) {
      onProgress?.(`Analizando planilla [${fileIndex}/${files.length}]: ${file.name}...`);
      const excelText = await extractTextFromExcel(file);
      const cleanExcel = excelText.slice(0, 40000);
      textSections.push(`=== DOCUMENTO ${fileIndex} (EXCEL): "${file.name}" ===\n${cleanExcel}\n`);
      fileIndex++;
    } else if (isPdf) {
      onProgress?.(`Extrayendo contenido de [${fileIndex}/${files.length}]: ${file.name}...`);
      const rawPdfText = await extractTextFromPdf(file);
      // Smart extraction preserving evaluation & chronogram
      const optimizedPdfText = extractRelevantAcademicSections(rawPdfText, 45000);
      textSections.push(`=== DOCUMENTO ${fileIndex} (PDF): "${file.name}" ===\n${optimizedPdfText}\n`);
      fileIndex++;
    } else if (isImage) {
      imageFiles.push(file);
    }
  }

  // 3. Process images
  let imagePayloads: Array<{ data: string; mime_type: string }> = [];
  if (imageFiles.length > 0) {
    onProgress?.(`Procesando ${imageFiles.length} imagen(es) para análisis visual...`);
    imagePayloads = await optimizeMultipleImages(imageFiles);
    textSections.push(`=== IMÁGENES ADJUNTAS (${imageFiles.length} imagen(es)) ===\nArchivos: ${imageFiles.map((f, i) => `[Foto ${i + 1}: ${f.name}]`).join(", ")}\n(Inspecciona en detalle cada imagen buscando fechas, parciales y ponderación)`);
  }

  const combinedContent = textSections.join("\n\n");

  const sourcesSummary: string[] = [];
  if (pastedText && pastedText.trim().length > 0) sourcesSummary.push("Notas escritas por el estudiante");
  const docFiles = files.filter(f => !["png", "jpg", "jpeg", "webp"].includes(f.name.split(".").pop()?.toLowerCase() || ""));
  if (docFiles.length > 0) sourcesSummary.push(`${docFiles.length} documento(s) (PDF/Excel)`);
  if (imageFiles.length > 0) sourcesSummary.push(`${imageFiles.length} imagen(es) adjunta(s)`);

  const userPrompt = `Materia universitaria: "${subjectName}".

FUENTES PROVISTAS:
${sourcesSummary.map(s => `- ${s}`).join("\n")}

INSTRUCCIONES CLAVE DE CONSOLIDACIÓN:
1. Extrae y consolida en un único plan todas las evaluaciones de la cátedra sin duplicar eventos.
2. Identifica con precisión la cantidad real de parciales requeridos (P1, P2, P3, etc.).
3. Pondera el porcentaje (%) de cada parcial para que sumen exactamente 100%.
4. Si hay fechas en cualquiera de los documentos o imágenes, incorpóralas con formato YYYY-MM-DD.

${combinedContent.length > 0 ? `CONTENIDO EXTRAÍDO DE LOS DOCUMENTOS:\n${combinedContent.slice(0, 95000)}` : ""}`;

  onProgress?.("Consolidando régimen, evaluaciones y parciales...");

  const rawAIResponse = await callAIService({
    systemPrompt: SYLLABUS_SYSTEM_PROMPT,
    userPrompt,
    images: imagePayloads,
    contextPage: "SUBJECT_SYLLABUS_PARSER",
  });

  return sanitizeSyllabusAIResponse(rawAIResponse, subjectName);
}

function sanitizeSyllabusAIResponse(raw: string, subjectName: string): SyllabusParsedResult {
  let cleanJson = raw.trim();
  const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match && match[1]) {
    cleanJson = match[1].trim();
  } else {
    const firstBrace = cleanJson.indexOf("{");
    const lastBrace = cleanJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanJson = cleanJson.slice(firstBrace, lastBrace + 1);
    }
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleanJson);
  } catch (err) {
    console.error("Error parsing JSON from syllabus AI response:", cleanJson);
    throw new Error("No se pudo interpretar el resultado. Por favor intenta nuevamente o verifica los archivos.");
  }

  const rawTotalParciales = Number(parsed.total_parciales);
  const rawParcialesExtra = Array.isArray(parsed.parciales_extra) ? parsed.parciales_extra : [];
  const parcialesExtraSugeridos: SyllabusDetectedPartial[] = [];

  // Parse extra partials
  if (Array.isArray(rawParcialesExtra) && rawParcialesExtra.length > 0) {
    rawParcialesExtra.forEach((p: any, idx: number) => {
      const pId = p.id || `P${idx + 3}`;
      parcialesExtraSugeridos.push({
        id: pId,
        nombre: p.nombre || `${idx + 3}° Parcial`,
        incluyeRecuperatorio: p.incluye_recuperatorio !== false,
        selected: true,
      });
    });
  } else if (!isNaN(rawTotalParciales) && rawTotalParciales > 2) {
    for (let i = 3; i <= rawTotalParciales; i++) {
      parcialesExtraSugeridos.push({
        id: `P${i}`,
        nombre: `${i}° Parcial`,
        incluyeRecuperatorio: true,
        selected: true,
      });
    }
  }

  const totalCalculated = Math.max(
    !isNaN(rawTotalParciales) ? rawTotalParciales : 2,
    2 + parcialesExtraSugeridos.length
  );

  // Parse grade weights
  const rawPesos = parsed.pesos_parciales && typeof parsed.pesos_parciales === "object" ? parsed.pesos_parciales : {};
  const pesosSugeridos: Record<string, number> = {};
  const allIds = ["P1", "P2", ...parcialesExtraSugeridos.map(p => p.id)];
  let sum = 0;

  for (const id of allIds) {
    const val = Number(rawPesos[id]);
    if (!isNaN(val) && val > 0) {
      pesosSugeridos[id] = val;
      sum += val;
    }
  }

  if (sum !== 100) {
    const count = allIds.length;
    const baseWeight = Math.floor(100 / count);
    const remainder = 100 - baseWeight * count;
    allIds.forEach((id, i) => {
      pesosSugeridos[id] = baseWeight + (i < remainder ? 1 : 0);
    });
  }

  // Parse and deduplicate events
  const rawEventos = Array.isArray(parsed.eventos) ? parsed.eventos : [];
  const eventosDetectados: SyllabusDetectedEvent[] = [];
  const seenEventKeys = new Set<string>();

  rawEventos.forEach((ev: any, i: number) => {
    if (!ev.titulo || !ev.fecha) return;
    const dateMatch = String(ev.fecha).match(/^\d{4}-\d{2}-\d{2}$/);
    if (!dateMatch) return;

    // Deduplication key: date + sanitized type
    const normalizedType = String(ev.tipo_examen || "Otro").trim().toLowerCase();
    const dedupKey = `${ev.fecha}_${normalizedType}`;
    if (seenEventKeys.has(dedupKey)) {
      return; // Skip duplicate event
    }
    seenEventKeys.add(dedupKey);

    let timeStr: string | null = null;
    if (ev.hora && String(ev.hora).trim().match(/^\d{1,2}:\d{2}$/)) {
      const parts = String(ev.hora).trim().split(":");
      timeStr = `${parts[0].padStart(2, "0")}:${parts[1]}`;
    }

    const cleanTitle = ev.titulo.includes(subjectName)
      ? ev.titulo
      : `${ev.titulo} - ${subjectName}`;

    eventosDetectados.push({
      id: `syllabus-ev-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      titulo: cleanTitle,
      fecha: ev.fecha,
      hora: timeStr,
      tipo_examen: ev.tipo_examen || "Otro",
      descripcion: ev.descripcion || undefined,
      selected: true,
    });
  });

  // Sort chronologically
  eventosDetectados.sort((a, b) => a.fecha.localeCompare(b.fecha));

  return {
    materiaNombre: subjectName,
    totalParcialesDetectados: totalCalculated,
    parcialesExtraSugeridos,
    globalesExtraSugeridos: Number(parsed.globales_extra) || 0,
    pesosSugeridos,
    eventosDetectados,
    resumenRegimen: parsed.resumen_regimen || undefined,
  };
}

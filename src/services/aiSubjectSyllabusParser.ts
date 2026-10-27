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

const SYLLABUS_SYSTEM_PROMPT = `Sos un asistente universitario de TABE AI especializado en analizar programas de asignaturas, reglamentos de cátedra, planificaciones, cronogramas y syllabus.
Tu objetivo es analizar minuciosamente TODOS los documentos provistos (PDFs, planillas Excel, imágenes/fotos y texto escrito) para una materia universitaria específica y consolidar un ÚNICO plan unificado.

REGLAS DE ORO PARA EL ANÁLISIS:
1. EVENTOS DE EVALUACIÓN Y CALENDARIO:
   - Extrae fechas de parciales (1°, 2°, 3°, etc.), recuperatorios correspondientes, entregas de trabajos prácticos (TPs), exámenes globales/integradores o coloquios, y llamados a final.
   - Si en una imagen hay fechas de parciales y en otro archivo hay fechas de TPs o recuperatorios, DEBES INCLUIR TODOS los eventos encontrados en ambas fuentes.
2. ESTRUCTURA DE PARCIALES:
   - TABE incluye por defecto 2 parciales (P1 y P2) y 1 examen global.
   - Si la cátedra exige más de 2 parciales (por ejemplo 3, 4, 5 parciales, o 2 parciales teóricos y 2 prácticos = 4 parciales en total), debes listar los parciales adicionales en "parciales_extra" a partir de P3 en adelante.
3. PESO PORCENTUAL DE CADA PARCIAL (% para el promedio):
   - Extrae la ponderación o porcentaje que la cátedra asigna a cada parcial para regularizar o promocionar (por ejemplo: P1=30%, P2=30%, P3=40%, o P1=25%, P2=25%, P3=25%, P4=25%).
   - Si el programa no indica porcentajes explícitos pero exige N parciales iguales, distribuye el 100% equitativamente entre todos los parciales activos de la materia.
   - La suma de todos los pesos DEBE DAR EXACTAMENTE 100.

⚠️ REGLA SUPREMA DE FUSIÓN MULTIFUENTE OBLIGATORIA:
- El estudiante suele subir MATERIAL COMBINADO: por ejemplo, una planilla Excel con las fechas de cursada, una o varias fotos del pizarrón/apuntes con los recuperatorios, y texto aclaratorio donde explica requisitos especiales.
- ES ESTRICTAMENTE OBLIGATORIO PROCESAR Y FUSIONAR CADA UNO DE LOS ARCHIVOS, IMÁGENES Y TEXTOS ADJUNTOS.
- NUNCA ignores un archivo ni una imagen porque ya leíste el primero. Cada fuente complementa a las demás.
- Si hay notas escritas por el estudiante, dale máxima prioridad a las aclaraciones que él mismo redactó.

FORMATO DE SALIDA REQUERIDO:
Responde ÚNICAMENTE con un bloque JSON válido dentro de triple tilde invertida: \`\`\`json { ... } \`\`\`.
Sin texto introductorio ni conclusiones fuera del JSON.

Estructura exacta:
{
  "total_parciales": 4,
  "resumen_regimen": "Breve resumen claro de 1 o 2 oraciones del régimen de evaluación integrando todas las fuentes provistas",
  "parciales_extra": [
    {
      "id": "P3",
      "nombre": "3° Parcial (o Parcial Teórico 2)",
      "incluye_recuperatorio": true
    }
  ],
  "globales_extra": 0,
  "pesos_parciales": {
    "P1": 25,
    "P2": 25,
    "P3": 25,
    "P4": 25
  },
  "eventos": [
    {
      "titulo": "1° Parcial - [Nombre Materia]",
      "fecha": "2025-05-15",
      "hora": "18:00",
      "tipo_examen": "P1",
      "descripcion": "Unidades 1 a 3"
    },
    {
      "titulo": "Recuperatorio 1° Parcial - [Nombre Materia]",
      "fecha": "2025-05-29",
      "hora": null,
      "tipo_examen": "Recuperatorio P1",
      "descripcion": "Recuperatorio parcial 1"
    },
    {
      "titulo": "Entrega TP 1 - [Nombre Materia]",
      "fecha": "2025-04-20",
      "hora": "23:59",
      "tipo_examen": "TP",
      "descripcion": "Entrega informe de laboratorio"
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

  onProgress?.("Leyendo y procesando todos los archivos y notas provistas...");

  const textSections: string[] = [];
  const imageFiles: File[] = [];

  // 1. Prioritize user notes if provided
  if (pastedText && pastedText.trim().length > 0) {
    textSections.push(`=== NOTAS Y COMENTARIOS DEL ESTUDIANTE ===\n${pastedText.trim()}\n`);
  }

  // 2. Process each file independently with clear attribution
  let fileIndex = 1;
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isExcel = ["xlsx", "xls", "csv"].includes(ext);
    const isPdf = ext === "pdf" || file.type === "application/pdf";
    const isImage = ["png", "jpg", "jpeg", "webp"].includes(ext) || file.type.startsWith("image/");

    if (isExcel) {
      onProgress?.(`Leyendo planilla Excel [${fileIndex}/${files.length}]: ${file.name}...`);
      const excelText = await extractTextFromExcel(file);
      // Give each Excel file ample budget (up to 35k chars)
      const cleanExcel = excelText.slice(0, 35000);
      textSections.push(`=== ARCHIVO ${fileIndex} (EXCEL): "${file.name}" ===\n${cleanExcel}\n`);
      fileIndex++;
    } else if (isPdf) {
      onProgress?.(`Extrayendo texto de PDF [${fileIndex}/${files.length}]: ${file.name}...`);
      const pdfText = await extractTextFromPdf(file);
      // Filter out repetitive bibliography if document is huge, but preserve evaluation & dates
      const cleanPdf = pdfText.slice(0, 35000);
      textSections.push(`=== ARCHIVO ${fileIndex} (PDF): "${file.name}" ===\n${cleanPdf}\n`);
      fileIndex++;
    } else if (isImage) {
      imageFiles.push(file);
    }
  }

  // 3. Process all images
  let imagePayloads: Array<{ data: string; mime_type: string }> = [];
  if (imageFiles.length > 0) {
    onProgress?.(`Optimizando ${imageFiles.length} imagen(es) para análisis de visión...`);
    imagePayloads = await optimizeMultipleImages(imageFiles);
    textSections.push(`=== IMÁGENES ADJUNTAS (${imageFiles.length} imagen(es)) ===\nArchivos de imagen provistos: ${imageFiles.map((f, i) => `[Foto ${i + 1}: ${f.name}]`).join(", ")}\n(Analiza detalladamente todas las imágenes adjuntas buscando fechas, parciales, porcentajes y entregas)`);
  }

  const combinedContent = textSections.join("\n\n");

  const sourcesSummary: string[] = [];
  if (pastedText && pastedText.trim().length > 0) sourcesSummary.push("Texto/Notas del estudiante");
  const docFiles = files.filter(f => !["png", "jpg", "jpeg", "webp"].includes(f.name.split(".").pop()?.toLowerCase() || ""));
  if (docFiles.length > 0) sourcesSummary.push(`${docFiles.length} documento(s) (PDF/Excel)`);
  if (imageFiles.length > 0) sourcesSummary.push(`${imageFiles.length} imagen(es)/captura(s)`);

  const userPrompt = `Materia universitaria a analizar: "${subjectName}".

ATENCIÓN: Se han adjuntado MÚLTIPLES FUENTES DE INFORMACIÓN:
${sourcesSummary.map(s => `- ${s}`).join("\n")}

DEBES ANALIZAR, INTEGRAR Y CONSOLIDAR TODAS LAS FUENTES EN UN ÚNICO PLAN DE MATERIA:
1. Extrae TODOS los eventos de evaluación (parciales, recuperatorios, TPs, entregas de laboratorio, globales, coloquios y finales) encontrados en CUALQUIERA de las fuentes.
2. Identifica la cantidad total de parciales (si son más de 2 estándar de TABE, agrega P3, P4, etc.).
3. Determina el peso porcentual (%) de cada parcial para el promedio de la cursada asegurando que sumen exactamente 100%.
4. No omitas ningún dato presente en las imágenes, textos o archivos adjuntos.

${combinedContent.length > 0 ? `CONTENIDO EXTRAÍDO DE LOS DOCUMENTOS Y NOTAS:\n${combinedContent.slice(0, 100000)}` : ""}`;

  onProgress?.("TABE AI está analizando e integrando todas las fuentes...");

  const rawAIResponse = await callAIService({
    systemPrompt: SYLLABUS_SYSTEM_PROMPT,
    userPrompt,
    images: imagePayloads,
    contextPage: "SUBJECT_SYLLABUS_PARSER",
  });

  onProgress?.("Consolidando eventos, parciales y ponderación...");

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
    throw new Error("No se pudo interpretar el resultado de la IA. Por favor intenta nuevamente o sube un texto más claro.");
  }

  const totalParciales = Number(parsed.total_parciales) || 2;
  const rawParcialesExtra = Array.isArray(parsed.parciales_extra) ? parsed.parciales_extra : [];
  const parcialesExtraSugeridos: SyllabusDetectedPartial[] = [];

  // If AI did not list extra partials explicitly but total is > 2, generate them
  if (totalParciales > 2 && rawParcialesExtra.length === 0) {
    for (let i = 3; i <= totalParciales; i++) {
      parcialesExtraSugeridos.push({
        id: `P${i}`,
        nombre: `${i}° Parcial`,
        incluyeRecuperatorio: true,
        selected: true,
      });
    }
  } else {
    rawParcialesExtra.forEach((p: any, idx: number) => {
      const pId = p.id || `P${idx + 3}`;
      parcialesExtraSugeridos.push({
        id: pId,
        nombre: p.nombre || `${pId}`,
        incluyeRecuperatorio: p.incluye_recuperatorio !== false,
        selected: true,
      });
    });
  }

  // Parse raw weights
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

  // If weights don't sum to 100 or were missing, distribute evenly
  if (sum !== 100) {
    const count = allIds.length;
    const baseWeight = Math.floor(100 / count);
    const remainder = 100 - baseWeight * count;
    allIds.forEach((id, i) => {
      pesosSugeridos[id] = baseWeight + (i < remainder ? 1 : 0);
    });
  }

  // Parse events
  const rawEventos = Array.isArray(parsed.eventos) ? parsed.eventos : [];
  const eventosDetectados: SyllabusDetectedEvent[] = [];

  rawEventos.forEach((ev: any, i: number) => {
    if (!ev.titulo || !ev.fecha) return;
    const dateMatch = String(ev.fecha).match(/^\d{4}-\d{2}-\d{2}$/);
    if (!dateMatch) return;

    let timeStr: string | null = null;
    if (ev.hora && String(ev.hora).trim().match(/^\d{1,2}:\d{2}$/)) {
      const parts = String(ev.hora).trim().split(":");
      timeStr = `${parts[0].padStart(2, "0")}:${parts[1]}`;
    }

    eventosDetectados.push({
      id: `syllabus-ev-${i}-${Date.now()}`,
      titulo: ev.titulo.includes(subjectName) ? ev.titulo : `${ev.titulo} - ${subjectName}`,
      fecha: ev.fecha,
      hora: timeStr,
      tipo_examen: ev.tipo_examen || "Otro",
      descripcion: ev.descripcion || undefined,
      selected: true,
    });
  });

  return {
    materiaNombre: subjectName,
    totalParcialesDetectados: Math.max(totalParciales, 2 + parcialesExtraSugeridos.length),
    parcialesExtraSugeridos,
    globalesExtraSugeridos: Number(parsed.globales_extra) || 0,
    pesosSugeridos,
    eventosDetectados,
    resumenRegimen: parsed.resumen_regimen || undefined,
  };
}

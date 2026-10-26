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

const SYLLABUS_SYSTEM_PROMPT = `Sos un asistente universitario de TABE AI especializado en analizar programas de asignaturas, reglamentos de cátedra, planificaciones y cronogramas (syllabus).
Tu objetivo es analizar minuciosamente los documentos provistos (PDFs, Excel, imágenes o texto) para una materia universitaria específica y extraer:
1. EVENTOS DE EVALUACIÓN Y CALENDARIO: Fechas de parciales, recuperatorios, entregas de trabajos prácticos (TP), exámenes globales/integradores o coloquios, y llamados a final.
2. ESTRUCTURA DE PARCIALES: Cuántos parciales tiene en total la materia. La plataforma TABE viene por defecto con 2 parciales (P1 y P2) y 1 examen global. Si la materia tiene más de 2 parciales (por ejemplo 3, 4, 5 parciales, o 2 parciales teóricos y 2 prácticos = 4 parciales), debes listar los parciales adicionales (P3, P4, etc.).
3. PESO PORCENTUAL DE CADA PARCIAL (% para el promedio): Extrae la ponderación o porcentaje que la cátedra asigna a cada parcial para regularizar o promocionar (por ejemplo: P1=30%, P2=30%, P3=40%, o P1=25%, P2=25%, P3=25%, P4=25%). Si el programa no indica porcentajes exactos pero exige N parciales iguales, distribuye el 100% equitativamente entre todos los parciales de la materia. La suma de todos los pesos DEBE DAR EXACTAMENTE 100.

REGLAS OBLIGATORIAS:
1. Responde ÚNICAMENTE con un bloque JSON válido dentro de triple tilde invertida: \`\`\`json { ... } \`\`\`.
2. NO incluyas introducciones ni explicaciones fuera del bloque JSON.
3. El formato de fecha DEBE ser estrictamente "YYYY-MM-DD". Si el documento no especifica el año, utiliza el año calendario en curso (${new Date().getFullYear()}).
4. Si hay horas explicitadas (ej: "18:30 hs", "08:00"), indícalas en formato "HH:mm". Si no figuran, pon null.
5. El JSON debe tener exactamente esta estructura:
{
  "total_parciales": 4,
  "resumen_regimen": "Breve resumen de 1 o 2 oraciones del régimen de evaluación según el programa",
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
      "descripcion": "Recuperatorio para quienes no alcanzaron la nota mínima"
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

  onProgress?.("Procesando información y archivos del plan...");

  let combinedText = pastedText && pastedText.trim().length > 0
    ? `\n=== TEXTO PROVISTO POR EL ESTUDIANTE ===\n${pastedText.trim()}\n`
    : "";

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
    }
  }

  let imagePayloads: Array<{ data: string; mime_type: string }> = [];
  if (imageFiles.length > 0) {
    onProgress?.(`Optimizando ${imageFiles.length} imagen(es) para análisis de visión...`);
    imagePayloads = await optimizeMultipleImages(imageFiles);
  }

  const userPrompt = `Materia a analizar: "${subjectName}".
Analiza detalladamente el plan de cátedra, cronograma o programa adjunto para esta materia y extrae todos los eventos de calendario (parciales, recuperatorios, TPs, globales), la estructura de parciales (si son más de los 2 estándar de TABE) y los pesos porcentuales (%) de cada parcial para el promedio.

${combinedText.trim().length > 0 ? `DOCUMENTOS Y CONTENIDO:\n${combinedText.slice(0, 45000)}` : ""}`;

  onProgress?.("TABE AI está analizando el régimen de cursado y fechas clave...");

  const rawAIResponse = await callAIService({
    systemPrompt: SYLLABUS_SYSTEM_PROMPT,
    userPrompt,
    image: imagePayloads[0],
    images: imagePayloads,
  });

  onProgress?.("Estructurando eventos y pesos...");

  return sanitizeSyllabusAIResponse(rawAIResponse, subjectName);
}

function sanitizeSyllabusAIResponse(raw: string, subjectName: string): SyllabusParsedResult {
  let cleanJson = raw.trim();
  const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match && match[1]) {
    cleanJson = match[1].trim();
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
    totalParcialesDetectados: totalParciales,
    parcialesExtraSugeridos,
    globalesExtraSugeridos: Number(parsed.globales_extra) || 0,
    pesosSugeridos,
    eventosDetectados,
    resumenRegimen: parsed.resumen_regimen || undefined,
  };
}

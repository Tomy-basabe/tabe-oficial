import { supabase } from "@/integrations/supabase/client";
import { invalidateSubjectsCache } from "@/hooks/useSubjects";
import { invalidateDashboardStatsCache } from "@/hooks/useDashboardStats";
import { invalidateStudentContextCache } from "@/lib/aiClientService";
import sistemasTemplate from "@/data/sistemas_template.json";
import electronicaTemplate from "@/data/electronica_template.json";
import civilTemplate from "@/data/civil_template.json";
import electromecanicaTemplate from "@/data/electromecanica_template.json";
import quimicaTemplate from "@/data/quimica_template.json";

export interface BulkGradeItem {
  subjectName: string;
  grade: number;
  estado?: "aprobada" | "regular" | "cursable";
  fechaAprobacion?: string;
  source?: string;
}

export interface BulkGradeResult {
  ok: boolean;
  appliedCount: number;
  updatedSubjects: Array<{ name: string; grade: number; estado: string }>;
  average: number;
  totalAprobadas: number;
  totalMaterias: number;
  progressPercent: number;
}

// Normalizador de texto para matching
function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Normalizador fonético/stemming para singular/plural y contracciones comunes
function normStem(s: string): string {
  return norm(s)
    .replace(/\bbases\b/g, "base")
    .replace(/\balgoritmos\b/g, "algoritmo")
    .replace(/\bestructuras\b/g, "estructura")
    .replace(/\bsistemas\b/g, "sistema")
    .replace(/\blenguajes\b/g, "lenguaje")
    .replace(/\bprocesos\b/g, "proceso")
    .replace(/\bparadigmas\b/g, "paradigma")
    .replace(/\bcomputadoras\b/g, "computadora")
    .replace(/\bcomunicaciones\b/g, "comunicacion")
    .replace(/\bmatematicos\b/g, "matematico")
    .replace(/\s+(de|y|e|los|las|el|la|en)\s+/g, " ");
}

const ACRONYM_MAP: Record<string, string> = {
  bd: "base de datos",
  bases: "base de datos",
  gestiondedatos: "base de datos",
  aed: "algoritmo y estructura de datos",
  am1: "analisis matematico 1",
  am2: "analisis matematico 2",
  aga: "algebra y geometria analitica",
  algebra: "algebra y geometria analitica",
  f1: "fisica 1",
  f2: "fisica 2",
  iys: "ingenieria y sociedad",
  sociedad: "ingenieria y sociedad",
  ssl: "sintaxis y semantica de los lenguajes",
  sintaxis: "sintaxis y semantica de los lenguajes",
  pp: "paradigmas de programacion",
  paradigmas: "paradigmas de programacion",
  so: "sistemas operativos",
  asi: "analisis de sistemas de informacion",
  spn: "sistemas y procesos de negocio",
  syo: "sistemas y procesos de negocio",
  pye: "probabilidad y estadistica",
  probabilidad: "probabilidad y estadistica",
  cd: "comunicacion de datos",
  redes: "comunicacion de datos",
  redesdedatos: "comunicacion de datos",
  ac: "arquitectura de computadoras",
  arquitectura: "arquitectura de computadoras",
  ing1: "ingles 1",
  ing2: "ingles 2",
  eco: "economia",
  ds: "desarrollo de software",
  is: "desarrollo de software",
  ingdesoftware: "desarrollo de software",
  ingenieriadesoftware: "desarrollo de software",
  dss: "diseno de sistemas",
  tc: "teoria de control",
  teoriadecontrol: "teoria de control",
  adsi: "administracion de sistemas de informacion",
  legislacion: "legislacion y practica profesional",
  quimica: "quimica general",
  quimicageneral: "quimica general",
  proyectofinal: "proyecto final",
  proyecto: "proyecto final",
  simulacion: "modelos y simulacion",
};

const WORD_TO_GRADE: Record<string, number> = {
  uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
};

function cleanGradeNum(val: string): number | null {
  if (!val) return null;
  const v = val.trim().toLowerCase();
  if (WORD_TO_GRADE[v]) return WORD_TO_GRADE[v];
  const n = parseFloat(v.replace(",", "."));
  if (!isNaN(n) && n >= 1 && n <= 10) return n;
  return null;
}

/**
 * Parsea un texto del chat para extraer pares de [Materia]: [Nota].
 * Soporta de forma robusta e inteligente:
 * - "Comunicación de Datos: 10"
 * - "1. Bases de Datos - 9"
 * - "• Física I = 8 (Final del 15/12/2023)"
 * - "Álgebra y Geometría Analítica\t8 (Ocho)\t15/12/2023\tAprobado" (copiado de tabla web de Sysacad)
 * - "Análisis 1: 8, Álgebra: 7, Física 1: 9" (en una sola línea)
 * - "Química con 8" / "En Sistemas Operativos saqué 7"
 * - "Física 1 (8)" / "Nota 9: Inglés I"
 */
export function parseBulkSubjectGradesFromText(text: string): BulkGradeItem[] {
  if (!text || typeof text !== "string") return [];

  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const segments: string[] = [];

  for (const rawLine of rawLines) {
    // Si la línea contiene varias materias separadas por comas o punto y coma con notas:
    const hasMultiplePairs =
      /(?:[:=–—\-]\s*\d{1,2}| con \d{1,2}| nota \d{1,2}).*?[,;]\s*[a-zA-ZáéíóúÁÉÍÓÚñÑ]/i.test(rawLine);

    if (hasMultiplePairs) {
      const parts = rawLine.split(/[,;]\s*(?=[a-zA-ZáéíóúÁÉÍÓÚñÑ])/);
      segments.push(...parts.map((p) => p.trim()).filter(Boolean));
    } else {
      segments.push(rawLine);
    }
  }

  const items: BulkGradeItem[] = [];
  const seenSubjects = new Set<string>();

  for (const line of segments) {
    // Descartar encabezados o saludos sin números
    if (
      /^(cargame|cargar|hola|buen|por\s+favor|las\s+siguientes|materias|notas|resumen|aprobadas|asignatura|calificacion|folio|libro|acta)\b/i.test(line) &&
      !/\d{1,2}/.test(line)
    ) {
      continue;
    }

    // Limpiar viñetas o numeraciones de lista iniciales (ej: "1. ", "2) ", "10. ", "• ", "- ")
    // manteniendo la integridad si la línea es simplemente "8 - Materia"
    const cleanedLine = line
      .replace(/^[-*•🔹🔸👉✓✔#\s]+/, "")
      .replace(/^\d{1,3}[.)\]]\s*/, "")
      .trim();

    let rawName = "";
    let rawGrade: number | null = null;
    let rawDate = "";

    // CASO 1: Copiado de tabla web de Sysacad / Excel (separada por tabuladores, pipes o múltiples espacios)
    if (cleanedLine.includes("\t") || cleanedLine.includes("|") || /\s{3,}/.test(cleanedLine)) {
      const cells = cleanedLine
        .split(/[\t|]|\s{3,}/)
        .map((c) => c.trim())
        .filter(Boolean);

      if (cells.length >= 2) {
        for (let i = 0; i < cells.length; i++) {
          const c = cells[i];
          const gradeMatch =
            c.match(/^(?:nota[:\s]*)?(\d{1,2}(?:[.,]\d{1,2})?)(?:\s*\([a-záéíóúñA-ZÁÉÍÓÚÑ]+\))?(?:\s*\/10|\s*pts)?$/i) ||
            c.match(/^([a-záéíóúñA-ZÁÉÍÓÚÑ]+)\s*\((\d{1,2})\)$/i);

          if (gradeMatch) {
            const num = cleanGradeNum(gradeMatch[1] || gradeMatch[2]);
            if (num !== null) {
              rawGrade = num;
              const candidateNames = cells
                .filter((_, idx) => idx !== i)
                .filter((cell) => /[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3,}/.test(cell))
                .filter(
                  (cell) =>
                    !/^(aprobado|regular|promocion|final|examen|libre|firma|acta|tomo|folio|plan|libro)$/i.test(cell)
                )
                .filter((cell) => !/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(cell));

              if (candidateNames.length > 0) {
                rawName = candidateNames.reduce((prev, curr) => (curr.length > prev.length ? curr : prev));
              }
              break;
            }
          }
        }

        const dateCell = cells.find((c) => /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(c));
        if (dateCell) rawDate = dateCell;
      }
    }

    // CASO 2: Formato estándar con delimitador (: = - – — | /)
    if (rawGrade === null) {
      const matchStandard = cleanedLine.match(
        /^(?:[-*•🔹🔸👉✓✔\d.)\][#]+\s*)?(?:[a-zA-Z0-9]{3,7}\s*[-–—:]\s*)?([a-záéíóúñA-ZÁÉÍÓÚÑ0-9\s.,/'"°-]+?)\s*[:=–—\-/\t]\s*(\d{1,2}(?:[.,]\d{1,2})?)(?:\s*\([a-záéíóúñA-ZÁÉÍÓÚÑ\s]+\))?(?:\s*\/10|\s*pts)?(?:\s*\(.*?\))?(?:\s*[-–—]\s*.*)?$/i
      );
      if (matchStandard) {
        rawName = matchStandard[1].trim();
        rawGrade = cleanGradeNum(matchStandard[2]);
      }
    }

    // CASO 3: Formato con conectores (con, nota, calificacion, obtuve, saque)
    if (rawGrade === null) {
      const matchConnector = cleanedLine.match(
        /^(?:[-*•\d.)\]\s]*)?([a-záéíóúñA-ZÁÉÍÓÚÑ0-9\s.,/'"°-]+?)\s+(?:con|nota|calificacion|obtuve|saque|calif)\s*[:=]?\s*(\d{1,2}(?:[.,]\d{1,2})?)/i
      );
      if (matchConnector) {
        rawName = matchConnector[1].trim();
        rawGrade = cleanGradeNum(matchConnector[2]);
      }
    }

    // CASO 4: Formato con nota entre paréntesis o corchetes al final
    if (rawGrade === null) {
      const matchParen = cleanedLine.match(
        /^(?:[-*•\d.)\]\s]*)?([a-záéíóúñA-ZÁÉÍÓÚÑ0-9\s.,/'"°-]+?)\s*[([({](\d{1,2}(?:[.,]\d{1,2})?)[)\]}]/i
      );
      if (matchParen) {
        rawName = matchParen[1].trim();
        rawGrade = cleanGradeNum(matchParen[2]);
      }
    }

    // CASO 5: Formato inverso ("8 - Álgebra", "Nota 9: Análisis")
    if (rawGrade === null) {
      const matchInverse = cleanedLine.match(
        /^(?:nota\s*)?(\d{1,2}(?:[.,]\d{1,2})?)\s*[:=–—\-]\s*([a-záéíóúñA-ZÁÉÍÓÚÑ0-9\s.,/'"°-]+)$/i
      );
      if (matchInverse) {
        rawGrade = cleanGradeNum(matchInverse[1]);
        rawName = matchInverse[2].trim();
      }
    }

    // Limpieza y validación de materia
    if (rawName && rawGrade !== null) {
      let cleanName = rawName
        .replace(/^[-*•🔹🔸👉✓✔\d.)\][#]+\s*/, "")
        .replace(/^(?:\d{5,8}|08\d{4}|K\d{2}|[A-Z0-9]{2,6})\s*[-–—:]\s*/i, "")
        .replace(/^(?:materia|asignatura|curso)\s*[:=–—\-]\s*/i, "")
        .replace(/\s*\((?:aprobada?|regular|promocion(?:ada)?|final|examen|libre|nota).*?\)$/i, "")
        .replace(/\s*[-–—]\s*(?:aprobada?|regular|promocion|final|examen|fecha).*$/i, "")
        .trim();

      const lower = cleanName.toLowerCase();
      const isBlacklisted = [
        "promedio", "total", "fecha", "año", "ano", "hora", "nota", "materia",
        "alumno", "estudiante", "calificacion", "libro", "folio", "acta", "tomo",
      ].includes(lower);

      if (cleanName.length >= 3 && !isBlacklisted && rawGrade >= 1 && rawGrade <= 10) {
        const key = norm(cleanName);
        if (!seenSubjects.has(key)) {
          seenSubjects.add(key);
          items.push({
            subjectName: cleanName,
            grade: rawGrade,
            estado: rawGrade >= 6 ? "aprobada" : "regular",
            fechaAprobacion: rawDate || new Date().toISOString().split("T")[0],
          });
        }
      }
    }
  }

  return items;
}

/**
 * Extrae materias aprobadas con su nota desde las tablas de Sysacad
 * (consultas 'aprobados', 'historico_examenes', 'estado_academico' o texto crudo).
 */
export function extractApprovedSubjectsFromSysacad(snapshotOrConsultas: any): BulkGradeItem[] {
  if (!snapshotOrConsultas) return [];

  const consultas = snapshotOrConsultas.consultas || snapshotOrConsultas.sysacad?.consultas || snapshotOrConsultas;
  const items: BulkGradeItem[] = [];
  const seenSubjects = new Set<string>();

  const candidateTables: any[] = [];
  if (consultas && typeof consultas === "object") {
    if (consultas.aprobados) candidateTables.push(consultas.aprobados);
    if (consultas.historico_examenes) candidateTables.push(consultas.historico_examenes);
    if (consultas.estado_academico) candidateTables.push(consultas.estado_academico);

    for (const [k, v] of Object.entries(consultas)) {
      if (
        !["aprobados", "historico_examenes", "estado_academico"].includes(k) &&
        v &&
        typeof v === "object" &&
        /examen|aprob|calific|nota|academico|regular/i.test(k)
      ) {
        candidateTables.push(v);
      }
    }
  }

  for (const table of candidateTables) {
    if (!table) continue;

    let tableRowsCount = 0;

    // 1. Procesar filas estructuradas si existen
    if (Array.isArray(table.rows) && table.rows.length > 0) {
      for (const row of table.rows) {
        if (!row || typeof row !== "object") continue;

        const nameKey = Object.keys(row).find((k) =>
          /materia|asignatura|nombre|actividad|descripcion|descripci[oó]n|asig/i.test(k)
        );
        const gradeKey = Object.keys(row).find((k) =>
          /nota|calificaci|calif|resultado|promedio|final|nota_examen/i.test(k)
        );
        const dateKey = Object.keys(row).find((k) => /fecha|dia|fec/i.test(k));
        const estadoKey = Object.keys(row).find((k) =>
          /estado|condicion|condici[oó]n|situacion|situaci[oó]n/i.test(k)
        );

        if (nameKey && gradeKey) {
          const rawName = String(row[nameKey] || "").trim();
          const rawGradeStr = String(row[gradeKey] || "").trim();
          const numGrade = cleanGradeNum(rawGradeStr.replace(/[^\d.,]/g, ""));
          const rawDate = dateKey ? String(row[dateKey] || "").trim() : "";
          const estadoStr = estadoKey ? String(row[estadoKey] || "").toLowerCase() : "";

          // Descartar si el estado explícito es reprobado/aplazo/ausente/libre
          const isFailed = /aplaz|reprob|insuf|desaprob|ausente|libre/i.test(estadoStr);
          // En exámenes finales de UTN FRM se aprueba con nota 6 o superior (1 a 5 son aplazos/reprobados)
          const isApprovedGrade = numGrade >= 6 && !isFailed;

          if (rawName && numGrade !== null && isApprovedGrade) {
            const normKey = norm(rawName);
            const existingIdx = items.findIndex((it) => norm(it.subjectName) === normKey);

            if (existingIdx >= 0) {
              // Si ya fue registrada en una fecha previa, conservar la nota aprobada más alta
              if (numGrade > items[existingIdx].grade) {
                items[existingIdx].grade = numGrade;
                items[existingIdx].fechaAprobacion = rawDate || items[existingIdx].fechaAprobacion;
              }
            } else {
              tableRowsCount++;
              items.push({
                subjectName: rawName,
                grade: numGrade,
                estado: "aprobada",
                fechaAprobacion: rawDate || new Date().toISOString().split("T")[0],
                source: "Autogestión Sysacad",
              });
            }
          }
        }
      }
    }

    // 2. Fallback inteligente: Si la tabla no devolvió filas estructuradas pero contiene texto crudo
    if (tableRowsCount === 0 && typeof table.text === "string" && table.text.trim()) {
      const parsedFromText = parseBulkSubjectGradesFromText(table.text);
      for (const it of parsedFromText) {
        const normKey = norm(it.subjectName);
        if (!seenSubjects.has(normKey)) {
          seenSubjects.add(normKey);
          items.push({
            ...it,
            source: "Autogestión Sysacad",
          });
        }
      }
    }
  }

  return items;
}

// Consolidado de todas las plantillas oficiales de UTN FRM
const ALL_OFFICIAL_SUBJECTS: any[] = [
  ...((sistemasTemplate as any)?.subjects || []),
  ...((electronicaTemplate as any)?.subjects || []),
  ...((civilTemplate as any)?.subjects || []),
  ...((electromecanicaTemplate as any)?.subjects || []),
  ...((quimicaTemplate as any)?.subjects || []),
];

/**
 * Aplica una lista de materias aprobadas con sus notas en la base de datos de TABE:
 * - Localiza o crea la materia en `subjects`.
 * - Actualiza o inserta en `user_subject_status` como 'aprobada' con su nota y fecha.
 * - Invalida cachés y notifica a los componentes en tiempo real.
 */
export async function applyBulkSubjectGrades(
  userId: string,
  items: BulkGradeItem[]
): Promise<BulkGradeResult> {
  if (!userId || items.length === 0) {
    return {
      ok: false,
      appliedCount: 0,
      updatedSubjects: [],
      average: 0,
      totalAprobadas: 0,
      totalMaterias: 0,
      progressPercent: 0,
    };
  }

  // 1. Obtener materias actuales del usuario
  const { data: currentSubjects } = await (supabase as any)
    .from("subjects")
    .select("id, nombre, codigo, año, numero_materia")
    .or(`user_id.eq.${userId},user_id.is.null`);

  const userSubjects: any[] = currentSubjects || [];

  const resolveSubject = (rawName: string, list: any[]) => {
    const nq = norm(rawName);
    const nqStem = normStem(rawName);

    // 1. Coincidencia exacta por nombre o código
    let found = list.find((s) => norm(s.nombre) === nq || norm(s.codigo) === nq);
    if (found) return found;

    // 2. Acrónimo directo (ej: "BD", "AED", "SyO", "Redes")
    const cleanedKey = nq.replace(/\s+/g, "");
    if (ACRONYM_MAP[nq] || ACRONYM_MAP[cleanedKey]) {
      const target = ACRONYM_MAP[nq] || ACRONYM_MAP[cleanedKey];
      found = list.find((s) => normStem(s.nombre) === normStem(target));
      if (found) return found;
    }

    // 3. Normalización con números romanos / arábigos (1..5 <-> I..V)
    const toRoman = (str: string) =>
      str
        .replace(/\b5\b/g, "v")
        .replace(/\b4\b/g, "iv")
        .replace(/\b3\b/g, "iii")
        .replace(/\b2\b/g, "ii")
        .replace(/\b1\b/g, "i");

    const toArabic = (str: string) =>
      str
        .replace(/\bv\b/g, "5")
        .replace(/\biv\b/g, "4")
        .replace(/\biii\b/g, "3")
        .replace(/\bii\b/g, "2")
        .replace(/\bi\b/g, "1");

    const nqRoman = toRoman(nq);
    const nqArabic = toArabic(nq);

    found = list.find((s) => {
      const sn = norm(s.nombre);
      return sn === nqRoman || sn === nqArabic || toRoman(sn) === nqRoman || toArabic(sn) === nqArabic;
    });
    if (found) return found;

    // 4. Stemming / Singular-Plural match (ej: "Bases de Datos" === "Base de Datos")
    found = list.find((s) => normStem(s.nombre) === nqStem);
    if (found) return found;

    // 5. Inclusión parcial respetando ordinales
    found = list.find((s) => {
      const sn = norm(s.nombre);
      const nqRom = toRoman(nq);
      const snRom = toRoman(sn);

      // Si una tiene número y la otra tiene otro número diferente, no coinciden
      const nNum = nqRom.match(/\b(i|ii|iii|iv|v)\b/)?.[1];
      const sNum = snRom.match(/\b(i|ii|iii|iv|v)\b/)?.[1];
      if (nNum && sNum && nNum !== sNum) return false;

      return (
        sn.includes(nq) ||
        nq.includes(sn) ||
        normStem(sn).includes(nqStem) ||
        nqStem.includes(normStem(sn)) ||
        snRom.includes(nqRom) ||
        nqRom.includes(snRom)
      );
    });

    return found || null;
  };

  const updatedList: Array<{ name: string; grade: number; estado: string }> = [];

  for (const item of items) {
    let sub = resolveSubject(item.subjectName, userSubjects);

    // Si la materia no existe aún en las materias del usuario, buscar en todas las plantillas de UTN FRM
    if (!sub) {
      const officialRef = resolveSubject(item.subjectName, ALL_OFFICIAL_SUBJECTS);
      const subName = officialRef ? officialRef.nombre : item.subjectName;
      const subCode = officialRef
        ? officialRef.codigo
        : `MAT-${Math.floor(1000 + Math.random() * 9000)}`;
      const subYear = officialRef ? officialRef.año : 1;
      const subNum = officialRef ? officialRef.numero_materia : userSubjects.length + 1;

      try {
        const { data: newSub } = await (supabase as any)
          .from("subjects")
          .insert({
            user_id: userId,
            nombre: subName,
            codigo: subCode,
            año: subYear,
            numero_materia: subNum,
          })
          .select()
          .single();

        if (newSub) {
          sub = newSub;
          userSubjects.push(newSub);
        }
      } catch (err) {
        console.warn("No se pudo crear materia en subjects:", err);
      }
    }

    if (!sub) continue;

    // Consultar estado actual
    const { data: existingStatus } = await (supabase as any)
      .from("user_subject_status")
      .select("*")
      .eq("user_id", userId)
      .eq("subject_id", sub.id)
      .maybeSingle();

    const targetEstado = item.estado || (item.grade >= 6 ? "aprobada" : "regular");
    const updates = {
      estado: targetEstado,
      nota: item.grade,
      nota_final_examen: item.grade,
      fecha_aprobacion: item.fechaAprobacion || new Date().toISOString().split("T")[0],
    };

    if (existingStatus) {
      await (supabase as any)
        .from("user_subject_status")
        .update(updates)
        .eq("id", existingStatus.id);
    } else {
      await (supabase as any)
        .from("user_subject_status")
        .insert({
          user_id: userId,
          subject_id: sub.id,
          ...updates,
        });
    }

    updatedList.push({
      name: sub.nombre,
      grade: item.grade,
      estado: targetEstado,
    });
  }

  // 2. Calcular nuevo promedio y progreso
  const { data: allStatuses } = await (supabase as any)
    .from("user_subject_status")
    .select("estado, nota")
    .eq("user_id", userId);

  const statuses = allStatuses || [];
  const aprobadas = statuses.filter((s: any) => s.estado === "aprobada" && s.nota != null && s.nota > 0);
  const sumNotas = aprobadas.reduce((acc: number, curr: any) => acc + Number(curr.nota), 0);
  const avg = aprobadas.length > 0 ? parseFloat((sumNotas / aprobadas.length).toFixed(2)) : 0;
  const totalSubs = userSubjects.length || 37;
  const progressPct = parseFloat(((aprobadas.length / totalSubs) * 100).toFixed(1));

  // 3. Invalidar cachés y emitir evento en tiempo real
  invalidateSubjectsCache();
  invalidateDashboardStatsCache();
  invalidateStudentContextCache(userId);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tabe-subjects-updated"));
  }

  return {
    ok: true,
    appliedCount: updatedList.length,
    updatedSubjects: updatedList,
    average: avg,
    totalAprobadas: aprobadas.length,
    totalMaterias: totalSubs,
    progressPercent: progressPct,
  };
}

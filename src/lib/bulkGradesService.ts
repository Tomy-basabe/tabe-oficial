import { supabase } from "@/integrations/supabase/client";
import { invalidateSubjectsCache } from "@/hooks/useSubjects";
import { invalidateDashboardStatsCache } from "@/hooks/useDashboardStats";
import { invalidateStudentContextCache } from "@/lib/aiClientService";

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

/**
 * Parsea un texto del chat para extraer pares de [Materia]: [Nota].
 * Soporta formatos como:
 * - "Comunicación de Datos: 10"
 * - "Bases de Datos - 9"
 * - "Física I = 8"
 * - "• Análisis Matemático I: 6 (Aprobada)"
 */
export function parseBulkSubjectGradesFromText(text: string): BulkGradeItem[] {
  if (!text || typeof text !== "string") return [];

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: BulkGradeItem[] = [];

  for (const line of lines) {
    // Ignorar líneas de saludos, encabezados o instrucciones generales
    if (/^(cargame|cargar|hola|buen|por\s+favor|las\s+siguientes|materias|notas|resumen|aprobadas)/i.test(line)) {
      continue;
    }

    // Patrón 1: "Nombre de materia : Nota" o "Nombre de materia - Nota" o "Nombre de materia = Nota"
    const match = line.match(/^[-*•]?\s*([a-záéíóúñA-ZÁÉÍÓÚÑ0-9\s.,()/'"°-]+?)\s*[:=–—\-]\s*(\d{1,2}(?:[.,]\d{1,2})?)(?:\s*\/10|\s*pts)?(?:\s*\(.*?\))?$/);
    if (match) {
      const rawName = match[1].trim();
      const rawGrade = parseFloat(match[2].replace(",", "."));
      if (rawName.length >= 3 && !isNaN(rawGrade) && rawGrade >= 1 && rawGrade <= 10) {
        // Filtrar falsos positivos de palabras comunes
        const lower = rawName.toLowerCase();
        if (!["promedio", "total", "fecha", "año", "ano", "hora", "nota", "materia", "alumno", "estudiante"].includes(lower)) {
          items.push({
            subjectName: rawName,
            grade: rawGrade,
            estado: rawGrade >= 6 ? "aprobada" : "regular",
            fechaAprobacion: new Date().toISOString().split("T")[0],
          });
        }
      }
    }
  }

  return items;
}

/**
 * Extrae materias aprobadas con su nota desde las tablas de Sysacad
 * (consultas 'aprobados', 'historico_examenes' o 'estado_academico').
 */
export function extractApprovedSubjectsFromSysacad(snapshotOrConsultas: any): BulkGradeItem[] {
  if (!snapshotOrConsultas) return [];

  const consultas = snapshotOrConsultas.consultas || snapshotOrConsultas.sysacad?.consultas || snapshotOrConsultas;
  const items: BulkGradeItem[] = [];
  const seenSubjects = new Set<string>();

  const tablesToCheck = [consultas.aprobados, consultas.historico_examenes, consultas.estado_academico];

  for (const table of tablesToCheck) {
    if (!table || !Array.isArray(table.rows)) continue;

    for (const row of table.rows) {
      if (!row || typeof row !== "object") continue;

      // Buscar columna de nombre de materia
      const nameKey = Object.keys(row).find((k) => /materia|asignatura|nombre|actividad/i.test(k));
      // Buscar columna de nota
      const gradeKey = Object.keys(row).find((k) => /nota|calificaci|calif|resultado/i.test(k));
      // Buscar fecha
      const dateKey = Object.keys(row).find((k) => /fecha|dia/i.test(k));

      if (nameKey && gradeKey) {
        const rawName = String(row[nameKey] || "").trim();
        const rawGradeStr = String(row[gradeKey] || "").replace(",", ".").trim();
        const numGrade = parseFloat(rawGradeStr);
        const rawDate = dateKey ? String(row[dateKey] || "").trim() : "";

        if (rawName && !isNaN(numGrade) && numGrade >= 4) {
          const normKey = norm(rawName);
          if (!seenSubjects.has(normKey)) {
            seenSubjects.add(normKey);
            items.push({
              subjectName: rawName,
              grade: numGrade,
              estado: numGrade >= 6 ? "aprobada" : "regular",
              fechaAprobacion: rawDate || new Date().toISOString().split("T")[0],
              source: "Autogestión Sysacad",
            });
          }
        }
      }
    }
  }

  return items;
}

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

  const resolveSubject = (rawName: string) => {
    const nq = norm(rawName);
    // 1. Coincidencia exacta
    let found = userSubjects.find((s) => norm(s.nombre) === nq || norm(s.codigo) === nq);
    if (found) return found;

    // 2. Romanos vs arábigos
    const nqRoman = nq.replace(/\b1\b/g, "i").replace(/\b2\b/g, "ii").replace(/\b3\b/g, "iii");
    const nqArabic = nq.replace(/\biii\b/g, "3").replace(/\bii\b/g, "2").replace(/\bi\b/g, "1");
    found = userSubjects.find((s) => {
      const sn = norm(s.nombre);
      return sn === nqRoman || sn === nqArabic;
    });
    if (found) return found;

    // 3. Inclusión parcial
    found = userSubjects.find((s) => {
      const sn = norm(s.nombre);
      return sn.includes(nq) || nq.includes(sn);
    });
    return found || null;
  };

  const updatedList: Array<{ name: string; grade: number; estado: string }> = [];

  for (const item of items) {
    let sub = resolveSubject(item.subjectName);

    // Si la materia no existe en el plan de TABE, la creamos automáticamente para el alumno
    if (!sub) {
      try {
        const { data: newSub } = await (supabase as any)
          .from("subjects")
          .insert({
            user_id: userId,
            nombre: item.subjectName,
            codigo: item.subjectName.slice(0, 4).toUpperCase(),
            año: 1,
            numero_materia: userSubjects.length + 1,
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

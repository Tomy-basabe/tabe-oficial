import { NotionDocument } from "@/hooks/useNotionDocuments";

export interface SubjectItem {
  id: string;
  nombre: string;
  codigo?: string;
  año: number;
}

export interface ResolvedSubject {
  id?: string;
  nombre: string;
  codigo: string;
  año: number;
  isLinkedToMyPlan: boolean;
}

/**
 * Normaliza nombres de materias para comparaciones seguras.
 * Remueve tildes, números romanos a arábigos, caracteres especiales y espacios.
 */
export function normalizeSubjectName(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bi\b/g, "1")
    .replace(/\bii\b/g, "2")
    .replace(/\biii\b/g, "3")
    .replace(/\biv\b/g, "4")
    .replace(/\bv\b/g, "5")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Resuelve la materia y año de un documento (propio o de un amigo).
 * Si el documento es de un amigo, intenta vincularlo inteligentemente con
 * las materias del plan del usuario actual por código o por nombre de materia.
 */
export function resolveDocSubject(
  doc: NotionDocument,
  userSubjects: SubjectItem[]
): ResolvedSubject | null {
  if (!doc) return null;

  // 1. Coincidencia directa por ID en el plan del usuario actual
  if (doc.subject_id) {
    const direct = userSubjects.find((s) => s.id === doc.subject_id);
    if (direct) {
      return {
        id: direct.id,
        nombre: direct.nombre,
        codigo: direct.codigo || direct.nombre.substring(0, 4).toUpperCase(),
        año: direct.año || 1,
        isLinkedToMyPlan: true,
      };
    }
  }

  // 2. Si el doc tiene datos de materia (cargados en doc.subject)
  const docSub = doc.subject;
  if (docSub) {
    const subName = docSub.nombre || "";
    const subCode = docSub.codigo || "";
    const subYear = docSub.year || (docSub as any).año || 1;

    // Buscar coincidencia en el plan del usuario por código
    if (subCode) {
      const matchByCode = userSubjects.find(
        (s) => s.codigo && s.codigo.trim().toLowerCase() === subCode.trim().toLowerCase()
      );
      if (matchByCode) {
        return {
          id: matchByCode.id,
          nombre: matchByCode.nombre,
          codigo: matchByCode.codigo || subCode,
          año: matchByCode.año || subYear,
          isLinkedToMyPlan: true,
        };
      }
    }

    // Buscar coincidencia en el plan del usuario por nombre normalizado
    const normSubName = normalizeSubjectName(subName);
    if (normSubName) {
      const matchByName = userSubjects.find((s) => {
        const normUser = normalizeSubjectName(s.nombre);
        if (normUser === normSubName) return true;
        // Ignorar sufijo '1' si una viene como 'algebra 1' y la otra 'algebra'
        if (normUser.replace(/1$/, "") === normSubName.replace(/1$/, "")) return true;
        // Coincidencia de prefijo si tienen longitud suficiente
        if (normUser.length >= 6 && normSubName.length >= 6) {
          if (normUser.startsWith(normSubName) || normSubName.startsWith(normUser)) return true;
        }
        return false;
      });
      if (matchByName) {
        return {
          id: matchByName.id,
          nombre: matchByName.nombre,
          codigo: matchByName.codigo || subCode || matchByName.nombre.substring(0, 4).toUpperCase(),
          año: matchByName.año || subYear,
          isLinkedToMyPlan: true,
        };
      }
    }

    // 3. Si no coincide con ninguna materia del usuario, devolver los datos del amigo
    return {
      id: doc.subject_id || undefined,
      nombre: subName || "Materia",
      codigo: subCode || (subName ? subName.substring(0, 4).toUpperCase() : "MAT"),
      año: subYear,
      isLinkedToMyPlan: false,
    };
  }

  return null;
}

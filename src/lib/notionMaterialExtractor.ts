import { supabase } from "@/integrations/supabase/client";
import type { MaterialSection, NotionDocOption } from "@/types/studyRoadmap";

/**
 * Extractor recursivo de apuntes creados en TABE (Notion documents).
 * Extrae:
 * - Páginas principales y todas sus subpáginas recursivas (/pagina y páginas de páginas).
 * - Bloques desplegables / toggles (details + detailsSummary + detailsContent).
 * - Diagramas Mermaid (codeBlock con language: 'mermaid').
 * - Tablas, listas, citas, fórmulas matemáticas y texto estructurado.
 */

interface RawNotionDoc {
  id: string;
  user_id?: string;
  subject_id?: string | null;
  parent_id?: string | null;
  titulo: string;
  emoji?: string | null;
  contenido?: any;
  updated_at?: string;
}

/**
 * Obtiene la lista de apuntes del usuario para mostrarlos en el selector del Wizard.
 */
export async function fetchUserNotionDocs(
  userId: string,
  subjectId?: string | null
): Promise<NotionDocOption[]> {
  if (!userId) return [];

  try {
    let query = supabase
      .from("notion_documents" as any)
      .select("id, titulo, emoji, subject_id, parent_id, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (subjectId) {
      // Priorizar apuntes de la materia seleccionada o generales (sin subject_id)
      query = query.or(`subject_id.eq.${subjectId},subject_id.is.null`);
    }

    const { data, error } = await query;
    if (error || !data) {
      console.warn("[notionMaterialExtractor] Error listando apuntes:", error?.message);
      return [];
    }

    // Identificar conteo de subpáginas por apunte
    const docs = data as RawNotionDoc[];
    const parentCountMap = new Map<string, number>();

    for (const d of docs) {
      if (d.parent_id) {
        parentCountMap.set(d.parent_id, (parentCountMap.get(d.parent_id) || 0) + 1);
      }
    }

    return docs.map((d) => ({
      id: d.id,
      title: d.titulo || "Apunte sin título",
      emoji: d.emoji || "📝",
      subject_id: d.subject_id,
      parent_id: d.parent_id,
      updated_at: d.updated_at,
      subpagesCount: parentCountMap.get(d.id) || 0,
    }));
  } catch (err) {
    console.warn("[notionMaterialExtractor] Excepción buscando apuntes:", err);
    return [];
  }
}

/**
 * Extrae los IDs de subpáginas referenciadas dentro del árbol JSON de TipTap.
 */
function findSubpageIdsInJson(content: any): string[] {
  const ids: string[] = [];
  function walk(node: any) {
    if (!node) return;
    if (node.type === "subPage" && node.attrs?.pageId) {
      ids.push(node.attrs.pageId);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
    }
  }
  walk(content);
  return ids;
}

/**
 * Convierte el contenido JSON de TipTap a texto académico estructurado,
 * extrayendo diagramas Mermaid, toggles/desplegables, tablas, citas y código.
 */
export function parseTipTapToAcademicMarkdown(content: any, docTitle: string): string {
  if (!content) return "";

  const lines: string[] = [];

  function parseNode(node: any): string {
    if (!node) return "";

    // Nodos de texto simple
    if (node.type === "text") {
      let t = node.text || "";
      if (node.marks && Array.isArray(node.marks)) {
        for (const mark of node.marks) {
          if (mark.type === "bold") t = `**${t}**`;
          else if (mark.type === "italic") t = `*${t}*`;
          else if (mark.type === "code") t = `\`${t}\``;
        }
      }
      return t;
    }

    const childrenText = Array.isArray(node.content)
      ? node.content.map(parseNode).join("")
      : "";

    switch (node.type) {
      case "paragraph":
        return childrenText.trim() ? `\n${childrenText}\n` : "\n";

      case "heading": {
        const level = Number(node.attrs?.level || 1);
        const prefix = "#".repeat(Math.min(6, Math.max(1, level)));
        return `\n\n${prefix} ${childrenText}\n`;
      }

      // Bloques de código y diagramas Mermaid
      case "codeBlock": {
        const lang = (node.attrs?.language || "").toLowerCase().trim();
        const codeText = Array.isArray(node.content)
          ? node.content.map((c: any) => c.text || "").join("")
          : childrenText;

        if (lang === "mermaid") {
          return [
            "\n\n[DIAGRAMA CONCEPTUAL MERMAID]:",
            "```mermaid",
            codeText.trim(),
            "```",
            "[ESTRUCTURA DEL DIAGRAMA: Flujo y relaciones para comprender el concepto en el examen]\n",
          ].join("\n");
        }

        return `\n\n\`\`\`${lang || "texto"}\n${codeText.trim()}\n\`\`\`\n`;
      }

      // Desplegables / Toggles
      case "details": {
        let summary = "Detalle";
        let innerContent = "";

        if (Array.isArray(node.content)) {
          for (const child of node.content) {
            if (child.type === "detailsSummary") {
              summary = parseNode(child).trim();
            } else if (child.type === "detailsContent") {
              innerContent = parseNode(child).trim();
            } else {
              innerContent += "\n" + parseNode(child).trim();
            }
          }
        }

        return [
          `\n\n[DESPLEGABLE / TOGGLE REVELADO: ${summary}]`,
          innerContent || "(Sin contenido desplegable)",
          "[FIN DE DESPLEGABLE]\n",
        ].join("\n");
      }

      case "detailsSummary":
        return childrenText;

      case "detailsContent":
        return childrenText;

      // Subpáginas referenciadas dentro del documento
      case "subPage": {
        const subTitle = node.attrs?.title || "Subpágina";
        return `\n[ENLACE A SUBPÁGINA: "${subTitle}"]\n`;
      }

      // Tablas
      case "table": {
        if (!Array.isArray(node.content)) return "";
        const rows = node.content.map((row: any) => {
          if (!Array.isArray(row.content)) return "";
          const cells = row.content.map((cell: any) =>
            parseNode(cell).replace(/\n+/g, " ").trim()
          );
          return `| ${cells.join(" | ")} |`;
        });
        if (rows.length === 0) return "";
        // Insertar divisor Markdown después de la primera fila
        const firstRowCols = (node.content[0]?.content || []).length;
        const separator = `| ${Array(firstRowCols).fill("---").join(" | ")} |`;
        return `\n\n${rows[0]}\n${separator}\n${rows.slice(1).join("\n")}\n\n`;
      }

      case "tableRow":
      case "tableHeader":
      case "tableCell":
        return childrenText;

      // Citas y Callouts
      case "blockquote":
      case "callout":
        return `\n\n> 📌 NOTA/CITA: ${childrenText.trim()}\n`;

      // Listas
      case "bulletList":
        return `\n${childrenText}\n`;

      case "orderedList":
        return `\n${childrenText}\n`;

      case "listItem":
        return `• ${childrenText.trim()}\n`;

      case "taskList":
        return `\n${childrenText}\n`;

      case "taskItem": {
        const checked = node.attrs?.checked ? "[x]" : "[ ]";
        return `${checked} ${childrenText.trim()}\n`;
      }

      // Fórmulas matemáticas
      case "mathBlock": {
        const formula = node.attrs?.formula || childrenText;
        return `\n\n$$ ${formula.trim()} $$\n\n`;
      }

      case "inlineMath":
        return `$ ${node.attrs?.formula || childrenText} $`;

      case "horizontalRule":
        return "\n\n---\n\n";

      default:
        return childrenText;
    }
  }

  const raw = parseNode(content);
  // Limpieza de saltos múltiples
  return raw.replace(/\n{4,}/g, "\n\n\n").trim();
}

/**
 * Consulta recursivamente en Supabase los documentos seleccionados y todas sus subpáginas,
 * descendiendo por todas las ramas de páginas y sub-subpáginas.
 */
export async function extractNotionDocuments(
  selectedDocIds: string[],
  userId?: string
): Promise<{ sections: MaterialSection[]; totalChars: number; docCount: number }> {
  if (!selectedDocIds || selectedDocIds.length === 0) {
    return { sections: [], totalChars: 0, docCount: 0 };
  }

  const visitedIds = new Set<string>();
  const allDocsMap = new Map<string, RawNotionDoc>();
  const idQueue: string[] = [...selectedDocIds];

  // 1. Recorrido recursivo en Supabase por lotes
  while (idQueue.length > 0) {
    const batch = idQueue.splice(0, 30);
    const needed = batch.filter((id) => !visitedIds.has(id));
    if (needed.length === 0) continue;

    needed.forEach((id) => visitedIds.add(id));

    try {
      // Consultar documentos por ID
      let query = supabase
        .from("notion_documents" as any)
        .select("id, titulo, emoji, contenido, parent_id, subject_id, updated_at")
        .in("id", needed);

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data: directDocs, error } = await query;
      if (error) {
        console.warn("[notionMaterialExtractor] Error cargando lote:", error.message);
        continue;
      }

      const foundDocs = (directDocs || []) as RawNotionDoc[];
      for (const d of foundDocs) {
        allDocsMap.set(d.id, d);

        // Buscar subpáginas anidadas en el contenido TipTap
        const linkedSubIds = findSubpageIdsInJson(d.contenido);
        for (const subId of linkedSubIds) {
          if (!visitedIds.has(subId) && !idQueue.includes(subId)) {
            idQueue.push(subId);
          }
        }
      }

      // Además, buscar todas las subpáginas en Supabase que tengan `parent_id` en este lote
      let childQuery = supabase
        .from("notion_documents" as any)
        .select("id, titulo, emoji, contenido, parent_id, subject_id, updated_at")
        .in("parent_id", needed);

      if (userId) {
        childQuery = childQuery.eq("user_id", userId);
      }

      const { data: childDocs } = await childQuery;
      if (childDocs && childDocs.length > 0) {
        for (const cd of childDocs as RawNotionDoc[]) {
          if (!visitedIds.has(cd.id) && !idQueue.includes(cd.id)) {
            idQueue.push(cd.id);
          }
          allDocsMap.set(cd.id, cd);
        }
      }
    } catch (e) {
      console.warn("[notionMaterialExtractor] Excepción en recursión de apuntes:", e);
    }
  }

  // 2. Construir la jerarquía y migrar a MaterialSection
  const sections: MaterialSection[] = [];

  // Helper para construir el breadcrumb jerárquico (Padre > Subpágina > Sub-subpágina)
  function buildBreadcrumb(docId: string, visitedChain = new Set<string>()): string {
    if (visitedChain.has(docId)) return "";
    visitedChain.add(docId);

    const doc = allDocsMap.get(docId);
    if (!doc) return "";

    const currentTitle = `${doc.emoji || "📄"} ${doc.titulo || "Sin título"}`;
    if (doc.parent_id && allDocsMap.has(doc.parent_id)) {
      const parentCrumb = buildBreadcrumb(doc.parent_id, visitedChain);
      return parentCrumb ? `${parentCrumb} > ${currentTitle}` : currentTitle;
    }
    return currentTitle;
  }

  for (const [id, doc] of allDocsMap.entries()) {
    const textContent = parseTipTapToAcademicMarkdown(doc.contenido, doc.titulo);
    if (!textContent || textContent.length < 15) continue;

    const breadcrumb = buildBreadcrumb(id);
    const sectionTitle = `Apunte TABE: ${breadcrumb}`;

    const formattedText = [
      `=== APUNTE DE LA APP: ${breadcrumb} ===`,
      `Título: ${doc.titulo || "Sin título"}`,
      textContent,
      `=== FIN DEL APUNTE: ${doc.titulo} ===\n`,
    ].join("\n\n");

    sections.push({
      source: sectionTitle,
      text: formattedText,
    });
  }

  const totalChars = sections.reduce((acc, s) => acc + s.text.length, 0);

  return {
    sections,
    totalChars,
    docCount: allDocsMap.size,
  };
}

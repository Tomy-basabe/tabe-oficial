import type { MaterialSection } from "@/types/studyRoadmap";

/**
 * Extractor de material de estudio 100% en el navegador (cero costo en Vercel/Supabase).
 * Soporta múltiples archivos: PDF, TXT, MD, CSV, DOCX y PPTX.
 */

export const ACCEPTED_MATERIAL = ".pdf,.txt,.md,.csv,.docx,.pptx";
export const MAX_FILES = 25;
export const MAX_FILE_MB = 30;
const MAX_PDF_PAGES = 150;

type ProgressFn = (done: number, total: number, fileName: string) => void;

const getExt = (name: string) => (name.toLowerCase().split(".").pop() || "").trim();

async function extractPdf(file: File): Promise<string> {
  const pdfjsLib: any = await import("pdfjs-dist");
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  }
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = Math.min(pdf.numPages, MAX_PDF_PAGES);
  let out = "";
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Reconstruye líneas usando el eje Y para conservar títulos y párrafos
    let lastY: number | null = null;
    let line = "";
    const lines: string[] = [];
    for (const item of content.items as any[]) {
      const y = item.transform?.[5];
      if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 4) {
        if (line.trim()) lines.push(line.trim());
        line = "";
      }
      line += (item.str || "") + " ";
      if (y !== undefined) lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
    out += `--- Página ${i} ---\n${lines.join("\n")}\n\n`;
  }
  return out;
}

async function extractZipXml(file: File, matcher: RegExp, sortNumeric: boolean, label: string): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const names = Object.keys(zip.files).filter((n) => matcher.test(n));
  if (sortNumeric) {
    names.sort((a, b) => Number(a.match(/(\d+)\.xml$/)?.[1] || 0) - Number(b.match(/(\d+)\.xml$/)?.[1] || 0));
  }
  let out = "";
  let idx = 1;
  for (const n of names) {
    const xml = await zip.files[n].async("string");
    const text = xml
      .replace(/<\/a:p>|<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (text) out += `--- ${label} ${idx} ---\n${text}\n\n`;
    idx++;
  }
  return out;
}

async function extractOne(file: File): Promise<string> {
  const ext = getExt(file.name);
  if (ext === "pdf") return extractPdf(file);
  if (ext === "docx") return extractZipXml(file, /^word\/document\.xml$/, false, "Sección");
  if (ext === "pptx") return extractZipXml(file, /^ppt\/slides\/slide\d+\.xml$/, true, "Diapositiva");
  return file.text(); // txt, md, csv
}

export interface ExtractionResult {
  sections: MaterialSection[];
  failed: string[];
  totalChars: number;
}

export async function extractMaterial(
  files: File[],
  pastedText: string,
  onProgress?: ProgressFn
): Promise<ExtractionResult> {
  const sections: MaterialSection[] = [];
  const failed: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    onProgress?.(i, files.length, f.name);
    try {
      const text = (await extractOne(f)).replace(/\u0000/g, "").trim();
      if (text.length > 30) sections.push({ source: f.name, text });
      else failed.push(`${f.name} (sin texto legible — ¿es un escaneo?)`);
    } catch (e) {
      console.warn("[materialExtractor] fallo con", f.name, e);
      failed.push(f.name);
    }
  }
  onProgress?.(files.length, files.length, "");

  if (pastedText.trim()) sections.push({ source: "Texto pegado", text: pastedText.trim() });

  return {
    sections,
    failed,
    totalChars: sections.reduce((a, s) => a + s.text.length, 0),
  };
}

/** Arma el contenido para la IA repartiendo un presupuesto de caracteres entre todos los archivos. */
export function buildAIContent(sections: MaterialSection[], budget = 140000): string {
  const total = sections.reduce((a, s) => a + s.text.length, 0);
  if (total === 0) return "";
  return sections
    .map((s) => {
      const share = total <= budget ? s.text.length : Math.max(4000, Math.floor((s.text.length / total) * budget));
      return `=== ARCHIVO: ${s.source} ===\n${s.text.slice(0, share)}`;
    })
    .join("\n\n");
}

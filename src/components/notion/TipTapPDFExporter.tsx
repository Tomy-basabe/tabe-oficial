import { useState, useRef, useEffect } from "react";
import { Download, Loader2, Library, ChevronDown, FileText, Sparkles, Check, Settings2, BookOpen, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { JSONContent } from "@tiptap/core";
import jsPDF from "jspdf";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ComicBadge } from "@/components/comic/ComicBadge";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { sanitizeMermaidCode } from "./extensions/CodeBlockExtension";
import { getIconById, TabeIconRenderer } from "./TabeIcons";

interface TipTapPDFExporterProps {
  documentTitle: string;
  documentEmoji: string;
  coverUrl?: string | null;
  getContent: () => JSONContent | null;
  subjectId: string | null;
  userId: string;
  onExported?: () => void;
}

/* ─── Constantes de layout para A4 ─── */
const PAGE_W = 210; // mm
const PAGE_H = 297;
const MARGIN_L = 18;
const MARGIN_R = 18;
const MARGIN_T = 20;
const MARGIN_B = 20;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

/* ─── Colores ─── */
const C = {
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  link: "#2563eb",
  codeBg: "#18181b",
  codeText: "#f4f4f5",
  blockquoteBorder: "#3b82f6",
  blockquoteBg: "#f8fafc",
  taskCheck: "#3b82f6",
  taskMuted: "#94a3b8",
  tableBorderColor: "#cbd5e1",
  tableHeaderBg: "#f1f5f9",
};

/* ─── Helpers para colores hex → RGB ─── */
function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const n = parseInt(hex, 16);
  if (isNaN(n)) return [15, 23, 42];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function cssColorToHex(color: string): string {
  if (!color) return "#0f172a";
  if (color.startsWith("#")) return color;
  if (color.startsWith("rgb")) {
    const m = color.match(/\d+/g);
    if (m && m.length >= 3) {
      const r = parseInt(m[0]).toString(16).padStart(2, "0");
      const g = parseInt(m[1]).toString(16).padStart(2, "0");
      const b = parseInt(m[2]).toString(16).padStart(2, "0");
      return `#${r}${g}${b}`;
    }
  }
  const namedColors: Record<string, string> = {
    red: "#ef4444", blue: "#3b82f6", green: "#22c55e", yellow: "#eab308",
    purple: "#a855f7", orange: "#f97316", pink: "#ec4899", white: "#ffffff",
    black: "#000000", gray: "#6b7280", grey: "#6b7280",
  };
  return namedColors[color.toLowerCase()] || "#0f172a";
}

/**
 * Sanitiza texto para fuentes estándar de jsPDF (WinAnsiEncoding).
 * Reemplaza caracteres Unicode problemáticos que se convierten en basura como "%" o "¼".
 */
function cleanTextForPdf(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\u2018\u2019\u0060\u00B4]/g, "'")
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    .replace(/↔/g, "<->")
    .replace(/⇒/g, "=>")
    .replace(/⇐/g, "<=")
    .replace(/•/g, "-")
    .replace(/▶/g, ">")
    .replace(/▼/g, "v")
    .replace(/▲/g, "^")
    .replace(/►/g, ">")
    .replace(/◄/g, "<")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/≠/g, "!=")
    .replace(/±/g, "+/-")
    .replace(/×/g, "x")
    .replace(/÷/g, "/")
    .replace(/√/g, "sqrt")
    .replace(/∞/g, "inf")
    .replace(/°/g, "deg")
    .replace(/©/g, "(c)")
    .replace(/®/g, "(R)")
    .replace(/™/g, "(TM)")
    .replace(/\u200B/g, "") // zero-width space
    .replace(/\u200C/g, "") // zero-width non-joiner
    .replace(/\u200D/g, "") // zero-width joiner
    .replace(/\uFEFF/g, "") // BOM
    // Eliminar caracteres de control y Unicode no imprimibles que corrompen la fuente courier
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");
}

/**
 * Sanitiza código fuente para que sea 100% ASCII seguro para jsPDF y la fuente Courier.
 * Esto erradica de raíz el bug donde jsPDF inserta bytes nulos causando letras separadas ("H o l a")
 * o símbolos corruptos ("%%°"), y permite que el PDF sea 100% vectorial y ultra liviano (< 150 KB).
 */
function sanitizeCodeToAscii(text: string): string {
  if (!text) return "";
  return text
    // Flechas y diagramas
    .replace(/[→⇒▶►]/g, "->")
    .replace(/[←⇐◀◄]/g, "<-")
    .replace(/[↔⇔]/g, "<->")
    // Box drawings (diagramas de flujo tipo javac / JVM)
    .replace(/[─━┄┅┈┉]/g, "-")
    .replace(/[│┃┆┇┊┋]/g, "|")
    .replace(/[┌┏┐┓└┗┘┛├┣┤┫┬┳┴┻┼╋]/g, "+")
    // Comillas y guiones
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’`´]/g, "'")
    .replace(/[–—―]/g, "-")
    .replace(/…/g, "...")
    .replace(/•/g, "*")
    // Sanitizar cualquier caracter fuera de ASCII 32-126
    .replace(/[^\x20-\x7E\t\r\n]/g, (match) => {
      const map: Record<string, string> = {
        á: "a", é: "e", í: "i", ó: "o", ú: "u", ñ: "n",
        Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U", Ñ: "N",
        ü: "u", Ü: "U", "°": "", "©": "(c)", "®": "(R)"
      };
      return map[match] || " ";
    });
}

/**
 * Cede el control de ejecución al event loop del navegador de manera cooperativa.
 * Esto permite que el navegador procese entradas del usuario (clicks, scroll, teclado),
 * dibuje a 60 FPS y ejecute microtareas mientras la exportación avanza en segundo plano.
 */
function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Cuenta la cantidad total aproximada de nodos para calcular el porcentaje de progreso.
 */
function countTotalNodes(nodes: JSONContent[]): number {
  let count = 0;
  for (const n of nodes) {
    count++;
    if (n.content && Array.isArray(n.content)) {
      count += countTotalNodes(n.content);
    }
  }
  return count;
}

/**
 * Resuelve el identificador de icono de Tabe o emoji a un caracter Unicode válido para jsPDF.
 * Ejemplo: "lightning" -> "⚡", "book" -> "📖", o conserva el emoji original.
 */
function resolveSafeEmoji(iconIdOrEmoji?: string | null): string {
  if (!iconIdOrEmoji) return "📝";
  const custom = getIconById(iconIdOrEmoji);
  if (custom?.fallback) return custom.fallback;
  if (iconIdOrEmoji === "lightning") return "⚡";
  if (iconIdOrEmoji.length > 4 && !/\p{Emoji}/u.test(iconIdOrEmoji)) {
    return "📝";
  }
  return iconIdOrEmoji;
}

/**
 * Renderiza emojis a imagen PNG para que no se corrompan en jsPDF.
 */
function renderEmojiToDataUrl(emoji: string): string | null {
  const safeEmoji = resolveSafeEmoji(emoji);
  if (!safeEmoji) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.font = "44px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(safeEmoji, 32, 35);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

/**
 * Comprime y redimensiona una imagen o Blob para que el PDF sea sumamente liviano y rápido de descargar.
 * Reduce fotos gigantes a un tamaño óptimo para A4 (máx 720px) y formato JPEG 65%.
 */
async function compressImageSource(
  source: Blob | HTMLImageElement,
  maxDim: number = 720,
  quality: number = 0.65
): Promise<{ dataUrl: string; width: number; height: number; format: "JPEG" }> {
  // 1. Usar createImageBitmap si la fuente es un Blob (asíncrono, súper veloz y no traba el hilo de UI)
  if (typeof createImageBitmap !== "undefined" && source instanceof Blob) {
    try {
      const bitmap = await createImageBitmap(source);
      let w = bitmap.width;
      let h = bitmap.height;

      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bitmap, 0, 0, w, h);

      // Liberar de inmediato la memoria nativa del bitmap
      bitmap.close?.();

      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      return { dataUrl, width: w, height: h, format: "JPEG" };
    } catch {
      // Continuar al fallback
    }
  }

  // 2. Si es HTMLImageElement
  if (source instanceof HTMLImageElement) {
    let w = source.naturalWidth || 800;
    let h = source.naturalHeight || 600;

    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(source, 0, 0, w, h);

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return { dataUrl, width: w, height: h, format: "JPEG" };
  }

  throw new Error("Formato de imagen no compatible");
}

const imageCache = new Map<string, { dataUrl: string; width: number; height: number; format: "JPEG" }>();

/**
 * Combina señales de AbortSignal para cancelar peticiones pendientes si el usuario aborta.
 */
function mergeAbortSignals(signals: (AbortSignal | undefined)[]): AbortSignal {
  const controller = new AbortController();
  for (const sig of signals) {
    if (!sig) continue;
    if (sig.aborted) {
      controller.abort();
      break;
    }
    sig.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

/**
 * Carga una imagen real y la comprime para incrustarla liviana en jsPDF sin saturar la RAM.
 */
async function fetchImageDataUrl(
  src: string,
  abortSignal?: AbortSignal
): Promise<{ dataUrl: string; width: number; height: number; format: "JPEG" } | null> {
  if (!src) return null;
  if (abortSignal?.aborted) return null;
  if (imageCache.has(src)) return imageCache.get(src)!;

  // 0. Si la imagen ya está cargada en el DOM de la aplicación, reusarla al instante sin red (0ms)
  try {
    const existingImg = Array.from(document.images).find(
      (img) => (img.src === src || img.currentSrc === src) && img.complete && img.naturalWidth > 0
    );
    if (existingImg) {
      const res = await compressImageSource(existingImg);
      imageCache.set(src, res);
      return res;
    }
  } catch {
    // Continuar si hay restricción de canvas
  }

  // 1. Data URL
  if (src.startsWith("data:image/")) {
    try {
      const byteString = atob(src.split(",")[1] || "");
      const mimeString = src.split(",")[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const res = await compressImageSource(blob);
      imageCache.set(src, res);
      return res;
    } catch {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const res = await compressImageSource(img);
            imageCache.set(src, res);
            resolve(res);
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = src;
      });
    }
  }

  // 2. Fetch con timeout de 6 segundos y abortSignal para evitar cuelgues
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 6000);
  const combinedSignal = mergeAbortSignals([abortSignal, timeoutController.signal]);

  try {
    const res = await fetch(src, { mode: "cors", signal: combinedSignal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const blob = await res.blob();
      const compressed = await compressImageSource(blob);
      imageCache.set(src, compressed);
      return compressed;
    }
  } catch (err) {
    if (abortSignal?.aborted) return null;
    console.warn("Fetch image failed, trying Image fallback:", err);
  } finally {
    clearTimeout(timeoutId);
  }

  // 3. Fallback con new Image() y Canvas
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      try {
        const res = await compressImageSource(img);
        imageCache.set(src, res);
        resolve(res);
      } catch (e) {
        console.warn("Image compression failed:", e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Convierte un SVG (elemento o string) a imagen JPEG de forma ultra rápida (10-30ms)
 * usando Canvas nativo en vez de html2canvas. Esto evita por completo clonar el DOM
 * y elimina los cuelgues en documentos de 90.000+ palabras.
 */
async function svgToDataUrl(
  svgContent: SVGElement | string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    let svgString = typeof svgContent === "string"
      ? svgContent
      : new XMLSerializer().serializeToString(svgContent);

    if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
      svgString = svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    if (!svgEl) return null;

    const viewBox = svgEl.getAttribute("viewBox");
    let width = 800;
    let height = 600;

    if (viewBox) {
      const parts = viewBox.trim().split(/[\s,]+/).map(Number);
      if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
        width = parts[2];
        height = parts[3];
      }
    } else {
      const wAttr = parseFloat(svgEl.getAttribute("width") || "0");
      const hAttr = parseFloat(svgEl.getAttribute("height") || "0");
      if (wAttr > 0 && hAttr > 0) {
        width = wAttr;
        height = hAttr;
      }
    }

    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    return await new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve(null);
      }, 2500);

      img.onload = () => {
        clearTimeout(timeout);
        try {
          const scale = 2;
          const canvas = document.createElement("canvas");
          canvas.width = Math.min(2200, Math.max(300, Math.round(width * scale)));
          canvas.height = Math.min(2200, Math.max(200, Math.round(height * scale)));
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve(null);
            return;
          }

          ctx.fillStyle = "#18181b";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          URL.revokeObjectURL(url);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.90);
          resolve({ dataUrl, width: canvas.width, height: canvas.height });
        } catch {
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    });
  } catch (err) {
    console.warn("svgToDataUrl error:", err);
    return null;
  }
}

/**
 * Renderiza diagramas Mermaid a imagen de alta resolución para incrustar en el PDF.
 * Procesa SVG de forma nativa sin html2canvas, con timeout estricto de 3.5 segundos
 * para asegurar que nunca se congele el proceso.
 */
async function renderMermaidDiagramToImage(
  code: string,
  abortSignal?: AbortSignal
): Promise<{ dataUrl: string; widthMm: number; heightMm: number } | null> {
  if (!code || !code.trim()) return null;
  if (abortSignal?.aborted) return null;

  const renderPromise = (async () => {
    try {
      const cleanCode = sanitizeMermaidCode(code);

      // 1. Intentar capturar desde el SVG ya renderizado en el DOM del editor (<10ms)
      const mermaidContainers = Array.from(document.querySelectorAll(".mermaid-rendered"));
      for (const container of mermaidContainers) {
        if (abortSignal?.aborted) return null;
        const svg = container.querySelector("svg");
        if (svg) {
          const parentBlock = container.closest(".code-block-wrapper");
          const codeText = parentBlock?.querySelector("pre code")?.textContent?.trim();
          const rawText = parentBlock?.textContent || "";
          if (
            (codeText && (codeText === code.trim() || codeText === cleanCode)) ||
            rawText.includes(cleanCode.slice(0, 30))
          ) {
            const res = await svgToDataUrl(svg as SVGElement);
            if (res) {
              let widthMm = CONTENT_W;
              let heightMm = (res.height / res.width) * widthMm;
              const maxH = PAGE_H - MARGIN_T - MARGIN_B - 25;
              if (heightMm > maxH) {
                heightMm = maxH;
                widthMm = (res.width / res.height) * heightMm;
              }
              return { dataUrl: res.dataUrl, widthMm, heightMm };
            }
          }
        }
      }

      // 2. Si no está en el DOM, renderizar con mermaid directamente offscreen (sin html2canvas)
      if (abortSignal?.aborted) return null;
      const mermaid = (await import("mermaid")).default;
      const id = `mmd_pdf_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

      const tempContainer = document.createElement("div");
      tempContainer.id = "c_" + id;
      tempContainer.style.position = "fixed";
      tempContainer.style.top = "-9999px";
      tempContainer.style.left = "-9999px";
      document.body.appendChild(tempContainer);

      try {
        const { svg } = await mermaid.render(id, cleanCode, tempContainer);
        const res = await svgToDataUrl(svg);
        if (res) {
          let widthMm = CONTENT_W;
          let heightMm = (res.height / res.width) * widthMm;
          const maxH = PAGE_H - MARGIN_T - MARGIN_B - 25;
          if (heightMm > maxH) {
            heightMm = maxH;
            widthMm = (res.width / res.height) * heightMm;
          }
          return { dataUrl: res.dataUrl, widthMm, heightMm };
        }
      } finally {
        tempContainer.remove();
      }
    } catch (err) {
      console.warn("Mermaid rendering for PDF failed:", err);
      return null;
    }
    return null;
  })();

  // Timeout de seguridad total de 3.5 segundos: si un diagrama se demora, continúa fluidamente
  const timeoutPromise = new Promise<{ dataUrl: string; widthMm: number; heightMm: number } | null>((resolve) => {
    setTimeout(() => {
      console.warn("Mermaid render timed out after 3.5s, skipping to code block fallback");
      resolve(null);
    }, 3500);
  });

  return Promise.race([renderPromise, timeoutPromise]);
}


/**
 * Motor de renderizado PDF directo con jsPDF.
 * Renderiza textos, resaltados, imágenes reales y bloques de código con total fidelidad.
 */
interface PDFRendererOptions {
  onProgress?: (percent: number, statusText: string) => void;
  abortSignal?: AbortSignal;
}

class PDFRenderer {
  private doc: jsPDF;
  private y: number;
  private pageNum: number;
  private onProgress?: (percent: number, statusText: string) => void;
  private abortSignal?: AbortSignal;
  private totalNodes: number = 1;
  private processedNodes: number = 0;

  constructor(options?: PDFRendererOptions) {
    this.doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true, // Comprime streams de texto y vectores con FlateDecode, reduciendo megabytes a kilobytes
    });
    this.y = MARGIN_T;
    this.pageNum = 1;
    this.onProgress = options?.onProgress;
    this.abortSignal = options?.abortSignal;
  }

  private checkAbort() {
    if (this.abortSignal?.aborted) {
      throw new Error("EXPORT_CANCELLED");
    }
  }

  private getCurrentProgressPct(): number {
    if (this.totalNodes <= 0) return 10;
    return Math.min(95, Math.max(5, Math.round((this.processedNodes / this.totalNodes) * 90) + 5));
  }

  /* ── Gestión de página ── */
  private ensureSpace(needed: number) {
    if (this.y + needed > PAGE_H - MARGIN_B) {
      this.doc.addPage();
      this.pageNum++;
      this.y = MARGIN_T;
    }
  }

  private addFooter() {
    const totalPages = this.doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.setTextColor(...hexToRgb(C.muted));
      this.doc.text(`TABE Apuntes — Página ${i} de ${totalPages}`, PAGE_W / 2, PAGE_H - 10, { align: "center" });
    }
  }

  /* ── Texto con wrapping ── */
  private writeText(
    text: string,
    x: number,
    maxWidth: number,
    opts: {
      fontSize?: number;
      fontStyle?: string;
      color?: string;
      lineHeight?: number;
      indent?: number;
    } = {}
  ): number {
    const {
      fontSize = 10,
      fontStyle = "normal",
      color = C.text,
      lineHeight = 1.5,
      indent = 0,
    } = opts;

    const safeText = cleanTextForPdf(text);
    this.doc.setFontSize(fontSize);
    this.doc.setFont("helvetica", fontStyle);
    this.doc.setTextColor(...hexToRgb(cssColorToHex(color)));

    const lines = this.doc.splitTextToSize(safeText, maxWidth - indent);
    const lineH = (fontSize * lineHeight) / 2.835;

    for (const line of lines) {
      this.ensureSpace(lineH);
      this.doc.text(line, x + indent, this.y);
      this.y += lineH;
    }

    return lines.length * lineH;
  }

  /* ── Procesar inline marks ── */
  private getInlineSegments(content: JSONContent[] | undefined): Array<{
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    code?: boolean;
    color?: string;
    bgColor?: string;
    link?: string;
    highlight?: string;
  }> {
    if (!content) return [];
    const segments: Array<{
      text: string;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      strike?: boolean;
      code?: boolean;
      color?: string;
      bgColor?: string;
      link?: string;
      highlight?: string;
    }> = [];

    for (const node of content) {
      if (node.type !== "text" || !node.text) continue;

      const seg: (typeof segments)[0] = { text: cleanTextForPdf(node.text) };

      for (const mark of node.marks || []) {
        switch (mark.type) {
          case "bold": seg.bold = true; break;
          case "italic": seg.italic = true; break;
          case "underline": seg.underline = true; break;
          case "strike": seg.strike = true; break;
          case "code": seg.code = true; break;
          case "link": seg.link = mark.attrs?.href; break;
          case "highlight": seg.highlight = mark.attrs?.color || "#fef08a"; break;
          case "textStyle":
            if (mark.attrs?.color) seg.color = mark.attrs.color;
            if (mark.attrs?.backgroundColor && mark.attrs.backgroundColor !== "transparent")
              seg.bgColor = mark.attrs.backgroundColor;
            break;
        }
      }

      segments.push(seg);
    }
    return segments;
  }

  /**
   * Renderiza contenido inline con formato (negrita, cursiva, resaltados, enlaces).
   */
  private writeRichInline(
    content: JSONContent[] | undefined,
    x: number,
    maxWidth: number,
    baseFontSize: number = 10,
    baseColor: string = C.text,
    lineHeightMult: number = 1.5,
  ): number {
    const segments = this.getInlineSegments(content);
    if (segments.length === 0) return 0;

    const plainText = segments.map(s => s.text).join("");
    const hasSpecialMarks = segments.some(s => s.bold || s.italic || s.color || s.highlight || s.bgColor || s.link || s.code);

    if (!hasSpecialMarks) {
      return this.writeText(plainText, x, maxWidth, {
        fontSize: baseFontSize,
        color: baseColor,
        lineHeight: lineHeightMult,
      });
    }

    const lineH = (baseFontSize * lineHeightMult) / 2.835;
    let curX = x;
    const availW = maxWidth;

    for (const seg of segments) {
      const fontStyle = seg.bold && seg.italic ? "bolditalic" : seg.bold ? "bold" : seg.italic ? "italic" : "normal";
      const color = seg.color || (seg.link ? C.link : baseColor);

      this.doc.setFontSize(seg.code ? baseFontSize * 0.9 : baseFontSize);
      this.doc.setFont(seg.code ? "courier" : "helvetica", fontStyle);
      this.doc.setTextColor(...hexToRgb(cssColorToHex(color)));

      const words = seg.text.split(/(\s+)/);
      for (const word of words) {
        if (!word) continue;
        const wordW = this.doc.getTextWidth(word);

        if (curX + wordW > x + availW && curX > x) {
          curX = x;
          this.y += lineH;
          this.ensureSpace(lineH);
        }

        // Resaltado / Fondo
        if (seg.highlight || seg.bgColor) {
          const bgHex = cssColorToHex(seg.highlight || seg.bgColor || "#fef08a");
          this.doc.setFillColor(...hexToRgb(bgHex));
          this.doc.roundedRect(curX - 0.3, this.y - lineH * 0.72, wordW + 0.6, lineH * 0.95, 0.5, 0.5, "F");
          this.doc.setTextColor(...hexToRgb(cssColorToHex(color)));
        }

        this.doc.text(word, curX, this.y);

        // Subrayado
        if (seg.underline || seg.link) {
          this.doc.setDrawColor(...hexToRgb(cssColorToHex(color)));
          this.doc.setLineWidth(0.15);
          this.doc.line(curX, this.y + 0.5, curX + wordW, this.y + 0.5);
        }

        // Tachado
        if (seg.strike) {
          this.doc.setDrawColor(...hexToRgb(cssColorToHex(C.muted)));
          this.doc.setLineWidth(0.15);
          this.doc.line(curX, this.y - lineH * 0.25, curX + wordW, this.y - lineH * 0.25);
        }

        curX += wordW;
      }
    }

    this.y += lineH;
    return lineH;
  }

  /* ── Encabezado del documento ── */
  async renderHeader(title: string, emoji: string, coverUrl?: string | null) {
    this.checkAbort();
    this.onProgress?.(5, "Iniciando encabezado y portada...");
    await yieldToMainThread();

    // Portada si existe
    if (coverUrl) {
      try {
        const coverImg = await fetchImageDataUrl(coverUrl, this.abortSignal);
        this.checkAbort();
        if (coverImg) {
          const coverH = 40;
          this.doc.addImage(coverImg.dataUrl, coverImg.format, MARGIN_L, this.y, CONTENT_W, coverH);
          this.y += coverH + 6;
        }
      } catch (e) {
        if (this.abortSignal?.aborted) throw new Error("EXPORT_CANCELLED");
        console.warn("Cover image failed to load:", e);
      }
    }

    // Emoji del documento renderizado en canvas para evitar basura Unicode
    // Se renderiza arriba del título (estilo Notion oficial) con espacio vertical garantizado
    if (emoji) {
      const emojiDataUrl = renderEmojiToDataUrl(emoji);
      if (emojiDataUrl) {
        this.doc.addImage(emojiDataUrl, "PNG", MARGIN_L, this.y, 11, 11);
        this.y += 22; // Espacio vertical garantizado: previene que la parte superior del título toque el icono
      }
    }

    this.writeText(title || "Sin título", MARGIN_L, CONTENT_W, {
      fontSize: 22,
      fontStyle: "bold",
      color: C.text,
      lineHeight: 1.3,
    });

    this.y += 2;

    const dateStr = `Exportado el ${new Date().toLocaleDateString("es-AR", {
      day: "numeric", month: "long", year: "numeric",
    })} • TABE Apuntes`;
    this.writeText(dateStr, MARGIN_L, CONTENT_W, {
      fontSize: 8,
      color: C.muted,
    });

    this.y += 3;
    this.doc.setDrawColor(...hexToRgb(C.border));
    this.doc.setLineWidth(0.3);
    this.doc.line(MARGIN_L, this.y, PAGE_W - MARGIN_R, this.y);
    this.y += 8;
  }

  /* ── Procesar nodos con yielding cooperativo y reporte de progreso ── */
  async processNodes(nodes: JSONContent[], isRoot: boolean = true) {
    if (isRoot) {
      this.totalNodes = Math.max(1, countTotalNodes(nodes));
      this.processedNodes = 0;
    }

    for (const node of nodes) {
      this.checkAbort();
      this.processedNodes++;

      const pct = this.getCurrentProgressPct();
      this.onProgress?.(pct, `Procesando contenido (${pct}%)...`);

      // Ceder el hilo de ejecución al event loop para que el usuario pueda seguir usando la app sin trabas
      await yieldToMainThread();

      await this.processNode(node);
    }
  }

  private async processNode(node: JSONContent) {
    switch (node.type) {
      case "paragraph":
        this.renderParagraph(node);
        break;
      case "heading":
        this.renderHeading(node);
        break;
      case "bulletList":
        await this.renderBulletList(node);
        break;
      case "orderedList":
        await this.renderOrderedList(node);
        break;
      case "taskList":
        this.renderTaskList(node);
        break;
      case "blockquote":
        await this.renderBlockquote(node);
        break;
      case "codeBlock":
        await this.renderCodeBlock(node);
        break;
      case "horizontalRule":
        this.renderHR();
        break;
      case "callout":
        await this.renderCallout(node);
        break;
      case "table":
        this.renderTable(node);
        break;
      case "details":
        await this.renderDetails(node);
        break;
      case "math":
        this.renderMath(node);
        break;
      case "image":
        await this.renderImage(node);
        break;
      default:
        if (node.content) await this.processNodes(node.content, false);
        break;
    }
  }

  /* ── Párrafo ── */
  private renderParagraph(node: JSONContent) {
    const segments = this.getInlineSegments(node.content);
    if (segments.length === 0) {
      this.y += 3;
      return;
    }
    this.writeRichInline(node.content, MARGIN_L, CONTENT_W, 10, C.text, 1.6);
    this.y += 2;
  }

  /* ── Encabezados ── */
  private renderHeading(node: JSONContent) {
    const level = node.attrs?.level || 2;
    const sizes: Record<number, number> = { 1: 18, 2: 15, 3: 13 };
    const gaps: Record<number, number> = { 1: 8, 2: 6, 3: 5 };
    const fontSize = sizes[level] || 12;

    this.y += gaps[level] || 4;
    this.ensureSpace(fontSize / 2.835 * 1.3 + 4);

    this.writeRichInline(node.content, MARGIN_L, CONTENT_W, fontSize, C.text, 1.3);
    this.y += 3;
  }

  /* ── Lista con viñetas (vectoriales y limpias) ── */
  private async renderBulletList(node: JSONContent, depth: number = 0) {
    const indent = depth * 6;
    for (const item of node.content || []) {
      this.ensureSpace(6);

      // Dibujar punto vectorial para que nunca falle con fuentes
      this.doc.setFillColor(...hexToRgb(C.text));
      if (depth === 0) {
        this.doc.circle(MARGIN_L + indent + 2.5, this.y - 1.2, 0.8, "F");
      } else {
        this.doc.setDrawColor(...hexToRgb(C.text));
        this.doc.setLineWidth(0.2);
        this.doc.circle(MARGIN_L + indent + 2.5, this.y - 1.2, 0.7, "S");
      }

      for (const child of item.content || []) {
        if (child.type === "paragraph") {
          this.writeRichInline(child.content, MARGIN_L + indent + 6, CONTENT_W - indent - 6, 10, C.text, 1.5);
        } else if (child.type === "bulletList") {
          await this.renderBulletList(child, depth + 1);
        } else if (child.type === "orderedList") {
          await this.renderOrderedList(child, depth + 1);
        } else {
          await this.processNode(child);
        }
      }
      this.y += 1;
    }
    this.y += 2;
  }

  /* ── Lista numerada ── */
  private async renderOrderedList(node: JSONContent, depth: number = 0) {
    const indent = depth * 6;
    let idx = 1;
    for (const item of node.content || []) {
      this.ensureSpace(6);
      this.doc.setFontSize(10);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(...hexToRgb(C.text));
      this.doc.text(`${idx}.`, MARGIN_L + indent + 1, this.y);

      for (const child of item.content || []) {
        if (child.type === "paragraph") {
          this.writeRichInline(child.content, MARGIN_L + indent + 7, CONTENT_W - indent - 7, 10, C.text, 1.5);
        } else if (child.type === "bulletList") {
          await this.renderBulletList(child, depth + 1);
        } else if (child.type === "orderedList") {
          await this.renderOrderedList(child, depth + 1);
        } else {
          await this.processNode(child);
        }
      }
      idx++;
      this.y += 1;
    }
    this.y += 2;
  }

  /* ── Lista de tareas (Checkboxes vectoriales perfectos) ── */
  private renderTaskList(node: JSONContent) {
    for (const item of node.content || []) {
      const checked = item.attrs?.checked === true;
      this.ensureSpace(6);

      // Dibujar checkbox vectorial limpio sin depender de caracteres Unicode
      const boxX = MARGIN_L + 1;
      const boxY = this.y - 3.2;
      const boxSize = 3.6;

      this.doc.setDrawColor(...hexToRgb(checked ? C.taskCheck : C.muted));
      this.doc.setLineWidth(0.3);

      if (checked) {
        this.doc.setFillColor(...hexToRgb(C.taskCheck));
        this.doc.roundedRect(boxX, boxY, boxSize, boxSize, 0.5, 0.5, "FD");
        // Checkmark blanco
        this.doc.setDrawColor(255, 255, 255);
        this.doc.setLineWidth(0.4);
        this.doc.line(boxX + 0.8, boxY + 1.9, boxX + 1.5, boxY + 2.7);
        this.doc.line(boxX + 1.5, boxY + 2.7, boxX + 2.8, boxY + 0.9);
      } else {
        this.doc.setFillColor(255, 255, 255);
        this.doc.roundedRect(boxX, boxY, boxSize, boxSize, 0.5, 0.5, "S");
      }

      const textColor = checked ? C.taskMuted : C.text;
      for (const child of item.content || []) {
        if (child.type === "paragraph") {
          this.writeRichInline(child.content, MARGIN_L + 7, CONTENT_W - 7, 10, textColor, 1.5);
          if (checked) {
            const plainText = cleanTextForPdf(this.flattenText(child));
            this.doc.setFontSize(10);
            const tw = Math.min(this.doc.getTextWidth(plainText), CONTENT_W - 7);
            this.doc.setDrawColor(...hexToRgb(C.taskMuted));
            this.doc.setLineWidth(0.2);
            this.doc.line(MARGIN_L + 7, this.y - 3.5 * 0.6, MARGIN_L + 7 + tw, this.y - 3.5 * 0.6);
          }
        } else {
          this.processNode(child);
        }
      }
      this.y += 1.5;
    }
    this.y += 2;
  }

  /* ── Cita ── */
  private async renderBlockquote(node: JSONContent) {
    this.ensureSpace(12);
    const startY = this.y;

    const plainText = cleanTextForPdf(this.flattenText(node));
    this.doc.setFontSize(10);
    const lines = this.doc.splitTextToSize(plainText, CONTENT_W - 10);
    const blockH = Math.max(lines.length * 4.5 + 4, 10);

    this.doc.setFillColor(...hexToRgb(C.blockquoteBg));
    this.doc.roundedRect(MARGIN_L + 3, this.y - 2, CONTENT_W - 3, blockH, 1, 1, "F");

    this.doc.setFillColor(...hexToRgb(C.blockquoteBorder));
    this.doc.rect(MARGIN_L + 3, this.y - 2, 1.2, blockH, "F");

    for (const child of node.content || []) {
      if (child.type === "paragraph") {
        this.writeRichInline(child.content, MARGIN_L + 8, CONTENT_W - 12, 10, "#334155", 1.5);
      } else {
        await this.processNode(child);
      }
    }

    this.y = Math.max(this.y, startY + blockH) + 3;
  }



  /* ── Bloque de código con soporte para diagramas Mermaid y texto vectorial ultra ligero ── */
  private async renderCodeBlock(node: JSONContent) {
    this.checkAbort();
    const code = node.content?.[0]?.text || "";
    const language = node.attrs?.language || "text";

    // Si es un bloque Mermaid o sintaxis de diagrama reconocida
    const isMermaidSyntax = /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|mindmap|timeline)\b/i.test(code.trim());
    const isMermaid = language === "mermaid" || isMermaidSyntax;

    if (isMermaid && code.trim()) {
      this.onProgress?.(this.getCurrentProgressPct(), "Renderizando diagrama...");
      await yieldToMainThread();
      try {
        const diagram = await renderMermaidDiagramToImage(code, this.abortSignal);
        this.checkAbort();
        if (diagram) {
          this.ensureSpace(diagram.heightMm + 6);
          const x = MARGIN_L + (CONTENT_W - diagram.widthMm) / 2;
          this.doc.addImage(diagram.dataUrl, "JPEG", x, this.y, diagram.widthMm, diagram.heightMm);
          this.y += diagram.heightMm + 6;
          return;
        }
      } catch (err) {
        if (this.abortSignal?.aborted) throw new Error("EXPORT_CANCELLED");
        console.warn("Fallback to code block for mermaid:", err);
      }
    }

    // Código nativo vectorial ultra liviano (0 imágenes pesadas, peso < 150 KB, texto 100% copiable)
    this.renderNativeCodeBlock(code, language);
  }

  /* ── Bloque de código vectorial nativo ultra liviano (PDF ligero y descarga instantánea) ── */
  private renderNativeCodeBlock(rawCode: string, language: string = "text") {
    const code = sanitizeCodeToAscii(rawCode);
    const rawLines = code.split(/\r?\n/);
    if (rawLines.length === 0) return;

    // Envolver líneas largas para que nunca se corten (72 caracteres en Courier 8pt)
    const maxChars = 72;
    const wrappedLines: string[] = [];
    for (const line of rawLines) {
      if (!line || line.length <= maxChars) {
        wrappedLines.push(line || "");
        continue;
      }
      let rem = line;
      let isFirst = true;
      while (rem.length > maxChars) {
        let breakAt = maxChars;
        for (let i = maxChars; i >= Math.floor(maxChars * 0.65); i--) {
          const ch = rem[i];
          if (ch === " " || ch === "," || ch === ";" || ch === ")" || ch === "}" || ch === "]" || ch === ">") {
            breakAt = i + 1;
            break;
          }
        }
        wrappedLines.push((isFirst ? "" : "  ") + rem.substring(0, breakAt));
        rem = rem.substring(breakAt).trimStart();
        isFirst = false;
      }
      if (rem) wrappedLines.push("  " + rem);
    }

    const fontSize = 8;
    const lineH = 3.6; // mm
    const padX = 4;
    const padY = 3.5;
    const hasHeader = language && language !== "text";
    const headerH = hasHeader ? 6.5 : 2;
    const totalBlockH = headerH + wrappedLines.length * lineH + padY * 2;

    // Si cabe en la página actual
    if (this.y + totalBlockH <= PAGE_H - MARGIN_B) {
      this.ensureSpace(totalBlockH + 3);

      this.doc.setFillColor(24, 24, 27);
      this.doc.roundedRect(MARGIN_L, this.y, CONTENT_W, totalBlockH, 1.5, 1.5, "F");
      this.doc.setDrawColor(45, 45, 50);
      this.doc.setLineWidth(0.2);
      this.doc.roundedRect(MARGIN_L, this.y, CONTENT_W, totalBlockH, 1.5, 1.5, "S");

      let curY = this.y + padY;

      if (hasHeader) {
        this.doc.setFont("helvetica", "bold");
        this.doc.setFontSize(7.5);
        this.doc.setTextColor(148, 163, 184);
        this.doc.text(language.toUpperCase(), MARGIN_L + padX, curY + 2.8);

        this.doc.setDrawColor(39, 39, 42);
        this.doc.setLineWidth(0.15);
        this.doc.line(MARGIN_L + padX, curY + 4.5, MARGIN_L + CONTENT_W - padX, curY + 4.5);

        curY += headerH;
      }

      this.doc.setFont("courier", "normal");
      this.doc.setFontSize(fontSize);
      this.doc.setTextColor(244, 244, 245);

      for (const line of wrappedLines) {
        if (line) {
          this.doc.text(line, MARGIN_L + padX, curY + 2.6);
        }
        curY += lineH;
      }

      this.y += totalBlockH + 3;
    } else {
      // Bloque extenso dividido entre páginas
      let startIdx = 0;
      let isFirstPage = true;

      while (startIdx < wrappedLines.length) {
        this.checkAbort();
        const currentHeaderH = isFirstPage && hasHeader ? headerH : 2;
        const availH = PAGE_H - MARGIN_B - this.y;

        if (availH < currentHeaderH + lineH * 3 + padY * 2) {
          this.doc.addPage();
          this.pageNum++;
          this.y = MARGIN_T;
          continue;
        }

        const linesFit = Math.max(1, Math.floor((availH - currentHeaderH - padY * 2) / lineH));
        const chunk = wrappedLines.slice(startIdx, startIdx + linesFit);
        const chunkH = currentHeaderH + chunk.length * lineH + padY * 2;

        this.doc.setFillColor(24, 24, 27);
        this.doc.roundedRect(MARGIN_L, this.y, CONTENT_W, chunkH, 1.5, 1.5, "F");
        this.doc.setDrawColor(45, 45, 50);
        this.doc.setLineWidth(0.2);
        this.doc.roundedRect(MARGIN_L, this.y, CONTENT_W, chunkH, 1.5, 1.5, "S");

        let curY = this.y + padY;

        if (isFirstPage && hasHeader) {
          this.doc.setFont("helvetica", "bold");
          this.doc.setFontSize(7.5);
          this.doc.setTextColor(148, 163, 184);
          this.doc.text(language.toUpperCase(), MARGIN_L + padX, curY + 2.8);

          this.doc.setDrawColor(39, 39, 42);
          this.doc.setLineWidth(0.15);
          this.doc.line(MARGIN_L + padX, curY + 4.5, MARGIN_L + CONTENT_W - padX, curY + 4.5);

          curY += currentHeaderH;
          isFirstPage = false;
        }

        this.doc.setFont("courier", "normal");
        this.doc.setFontSize(fontSize);
        this.doc.setTextColor(244, 244, 245);

        for (const line of chunk) {
          if (line) {
            this.doc.text(line, MARGIN_L + padX, curY + 2.6);
          }
          curY += lineH;
        }

        startIdx += chunk.length;
        this.y += chunkH + 2.5;

        if (startIdx < wrappedLines.length) {
          this.doc.addPage();
          this.pageNum++;
          this.y = MARGIN_T;
        }
      }
      this.y += 1.5;
    }
  }

  /* ── Línea horizontal ── */
  private renderHR() {
    this.y += 4;
    this.ensureSpace(4);
    this.doc.setDrawColor(...hexToRgb(C.border));
    this.doc.setLineWidth(0.3);
    this.doc.line(MARGIN_L, this.y, PAGE_W - MARGIN_R, this.y);
    this.y += 6;
  }

  /* ── Callout ── */
  private async renderCallout(node: JSONContent) {
    const calloutType = node.attrs?.type || "info";
    const palette: Record<string, { bg: string; border: string; label: string; text: string }> = {
      info:    { bg: "#eff6ff", border: "#3b82f6", label: "i", text: "#1e3a8a" },
      success: { bg: "#f0fdf4", border: "#22c55e", label: "v", text: "#14532d" },
      warning: { bg: "#fefce8", border: "#eab308", label: "!", text: "#713f12" },
      danger:  { bg: "#fef2f2", border: "#ef4444", label: "x", text: "#7f1d1d" },
      tip:     { bg: "#faf5ff", border: "#a855f7", label: "*", text: "#581c87" },
    };
    const colors = palette[calloutType] || palette.info;

    const plainText = cleanTextForPdf(this.flattenText(node));
    this.doc.setFontSize(10);
    const lines = this.doc.splitTextToSize(plainText, CONTENT_W - 14);
    const blockH = Math.max(lines.length * 4.5 + 6, 12);

    this.ensureSpace(blockH + 4);

    // Fondo
    this.doc.setFillColor(...hexToRgb(colors.bg));
    this.doc.roundedRect(MARGIN_L, this.y - 2, CONTENT_W, blockH, 2, 2, "F");

    // Borde izquierdo
    this.doc.setFillColor(...hexToRgb(colors.border));
    this.doc.rect(MARGIN_L, this.y - 2, 1.2, blockH, "F");

    // Badge circular para el icono
    const badgeX = MARGIN_L + 5;
    const badgeY = this.y + 2.5;
    this.doc.setFillColor(...hexToRgb(colors.border));
    this.doc.circle(badgeX, badgeY, 2.5, "F");

    this.doc.setFontSize(7.5);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(colors.label, badgeX, badgeY + 0.8, { align: "center" });

    // Contenido
    this.y += 1;
    for (const child of node.content || []) {
      if (child.type === "paragraph") {
        this.writeRichInline(child.content, MARGIN_L + 10, CONTENT_W - 14, 10, colors.text, 1.5);
      } else {
        await this.processNode(child);
      }
    }

    this.y += 4;
  }

  /* ── Tabla Proporcional y Estilizada ── */
  private renderTable(node: JSONContent) {
    const rows = node.content || [];
    if (rows.length === 0) return;

    const numCols = rows[0]?.content?.length || 1;
    const cellPad = 2.5;
    const cellFontSize = 8.5;

    // Calcular proporciones dinámicas de columnas según el largo del texto
    const colMaxChars = new Array(numCols).fill(1);
    for (const row of rows) {
      const cells = row.content || [];
      for (let ci = 0; ci < numCols; ci++) {
        const text = cleanTextForPdf(this.flattenText(cells[ci]));
        colMaxChars[ci] = Math.max(colMaxChars[ci], text.length);
      }
    }

    // Ponderación: asegurar un peso mínimo razonable para cada columna
    const colWeights = colMaxChars.map((chars) => Math.max(chars, 8));
    const totalWeight = colWeights.reduce((a, b) => a + b, 0);

    // Ancho mínimo por columna según número de columnas
    const minColW = Math.max(16, CONTENT_W / (numCols * 2.5));
    let colWidths = colWeights.map((w) => (w / totalWeight) * CONTENT_W);

    // Ajustar columnas que queden por debajo del ancho mínimo
    let needsAdjustment = false;
    let allocatedW = 0;
    for (let ci = 0; ci < numCols; ci++) {
      if (colWidths[ci] < minColW) {
        colWidths[ci] = minColW;
        needsAdjustment = true;
      }
      allocatedW += colWidths[ci];
    }
    if (needsAdjustment && allocatedW > 0) {
      colWidths = colWidths.map((w) => (w / allocatedW) * CONTENT_W);
    }

    // Coordenadas acumuladas X para cada columna
    const colXPositions: number[] = [];
    let curXAccum = MARGIN_L;
    for (let ci = 0; ci < numCols; ci++) {
      colXPositions.push(curXAccum);
      curXAccum += colWidths[ci];
    }

    this.y += 2;

    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      const cells = row.content || [];
      const isHeader = cells.some((c) => c.type === "tableHeader") || ri === 0;

      let maxCellH = 6;
      const cellLinesList: string[][] = [];
      const cellIsCodeList: boolean[] = [];

      for (let ci = 0; ci < numCols; ci++) {
        const cell = cells[ci];
        const text = cleanTextForPdf(this.flattenText(cell));
        const colW = colWidths[ci];

        // Detectar si el texto parece código (%s, System.out, println, etc.)
        const isCode = text.includes("%") || text.includes("System.") || text.includes("();") || text.includes("println");
        cellIsCodeList.push(isCode);

        this.doc.setFont(isCode ? "courier" : "helvetica", isHeader ? "bold" : "normal");
        this.doc.setFontSize(cellFontSize);
        const wrapped = this.doc.splitTextToSize(text, colW - cellPad * 2);
        cellLinesList.push(wrapped);

        const h = wrapped.length * ((cellFontSize * 1.35) / 2.835) + cellPad * 2;
        maxCellH = Math.max(maxCellH, h);
      }

      this.ensureSpace(maxCellH + 2);

      for (let ci = 0; ci < numCols; ci++) {
        const cx = colXPositions[ci];
        const cw = colWidths[ci];

        if (isHeader) {
          this.doc.setFillColor(...hexToRgb(C.tableHeaderBg));
          this.doc.rect(cx, this.y, cw, maxCellH, "F");
        } else if (ri % 2 === 1) {
          // Fondo cebra muy sutil para facilitar la lectura de filas
          this.doc.setFillColor(250, 250, 252);
          this.doc.rect(cx, this.y, cw, maxCellH, "F");
        }

        this.doc.setDrawColor(...hexToRgb(C.tableBorderColor));
        this.doc.setLineWidth(0.2);
        this.doc.rect(cx, this.y, cw, maxCellH, "S");

        const isCode = cellIsCodeList[ci];
        this.doc.setFont(isCode ? "courier" : "helvetica", isHeader ? "bold" : "normal");
        this.doc.setFontSize(cellFontSize);
        this.doc.setTextColor(...hexToRgb(isHeader ? "#0f172a" : isCode ? "#1e293b" : C.text));

        const lines = cellLinesList[ci] || [];
        const lineH = (cellFontSize * 1.35) / 2.835;
        for (let li = 0; li < lines.length; li++) {
          this.doc.text(lines[li], cx + cellPad, this.y + cellPad + lineH * (li + 0.75));
        }
      }

      this.y += maxCellH;
    }

    this.y += 4;
  }

  /* ── Desplegables / Details (SIEMPRE ABIERTOS Y VISIBLES) ── */
  private async renderDetails(node: JSONContent) {
    this.ensureSpace(10);

    for (const child of node.content || []) {
      if (child.type === "detailsSummary") {
        const summaryText = cleanTextForPdf(this.flattenText(child));
        this.doc.setFontSize(10.5);
        this.doc.setFont("helvetica", "bold");
        const lines = this.doc.splitTextToSize(summaryText, CONTENT_W - 14);
        const lineH = (10.5 * 1.3) / 2.835;
        const summaryH = Math.max(8, lines.length * lineH + 4);

        this.ensureSpace(summaryH + 4);

        const boxY = this.y;

        // Fondo suave y estilizado
        this.doc.setFillColor(...hexToRgb("#f8fafc"));
        this.doc.roundedRect(MARGIN_L, boxY, CONTENT_W, summaryH, 1.2, 1.2, "F");
        this.doc.setDrawColor(...hexToRgb(C.border));
        this.doc.setLineWidth(0.2);
        this.doc.roundedRect(MARGIN_L, boxY, CONTENT_W, summaryH, 1.2, 1.2, "S");

        // Triángulo hacia abajo ▼ vectorial perfectamente centrado con la primera línea de texto
        // Con texto 10.5pt, la línea base estará en boxY + 5.4. El centro óptico de las letras está en boxY + 4.1.
        // Un triángulo con base en boxY + 2.9 y punta en boxY + 5.3 tiene su centro en boxY + 4.1.
        const arrowX = MARGIN_L + 3.5;
        const arrowTop = boxY + 2.9;
        this.doc.setFillColor(...hexToRgb(C.taskCheck));
        this.doc.triangle(
          arrowX, arrowTop,
          arrowX + 3.2, arrowTop,
          arrowX + 1.6, arrowTop + 2.4,
          "F"
        );

        // Texto del título del desplegable posicionado con su línea base exacta
        this.y = boxY + 5.4;
        this.writeRichInline(child.content, MARGIN_L + 9, CONTENT_W - 14, 10.5, C.text, 1.3);
        this.y = boxY + summaryH + 2.5;
      } else if (child.type === "detailsContent") {
        // Contenido desplegado (siempre visible en el apunte PDF)
        this.y += 1.5;
        for (const innerChild of child.content || []) {
          await this.processNode(innerChild);
        }
      }
    }

    this.y += 3;
  }

  /* ── Fórmula matemática ── */
  private renderMath(node: JSONContent) {
    const formula = cleanTextForPdf(node.attrs?.formula || "");
    this.ensureSpace(12);

    this.doc.setFillColor(...hexToRgb("#f8fafc"));
    const lines = this.doc.splitTextToSize(formula, CONTENT_W - 8);
    const blockH = lines.length * 4 + 6;
    this.doc.roundedRect(MARGIN_L, this.y - 2, CONTENT_W, blockH, 1, 1, "F");
    this.doc.setDrawColor(...hexToRgb(C.border));
    this.doc.roundedRect(MARGIN_L, this.y - 2, CONTENT_W, blockH, 1, 1, "S");

    this.doc.setFont("courier", "normal");
    this.writeText(formula, MARGIN_L + 4, CONTENT_W - 8, {
      fontSize: 10,
      color: C.text,
    });
    this.doc.setFont("helvetica", "normal");
    this.y += 4;
  }

  /* ── Renderizado de Imágenes Reales ── */
  private async renderImage(node: JSONContent) {
    this.checkAbort();
    const src = node.attrs?.src;
    const alt = cleanTextForPdf(node.attrs?.alt || "");
    if (!src) return;

    this.onProgress?.(this.getCurrentProgressPct(), "Optimizando imagen pesada...");
    await yieldToMainThread();

    try {
      const imgData = await fetchImageDataUrl(src, this.abortSignal);
      this.checkAbort();
      if (!imgData) {
        this.renderImageFallback(alt || "Imagen adjunta");
        return;
      }

      // Dimensiones proporcionales dentro del margen de A4
      const maxW = CONTENT_W;
      const maxH = PAGE_H - MARGIN_T - MARGIN_B - 25; // ~230 mm
      let w = CONTENT_W;
      let h = (imgData.height / imgData.width) * w;

      if (h > maxH) {
        h = maxH;
        w = (imgData.width / imgData.height) * h;
      }

      // Si la imagen es pequeña, no sobreescalarla
      if (imgData.width < 450 && imgData.height < 450) {
        const naturalW = imgData.width * 0.264583;
        const naturalH = imgData.height * 0.264583;
        if (naturalW < w) {
          w = naturalW;
          h = naturalH;
        }
      }

      this.ensureSpace(h + 6);
      const x = MARGIN_L + (CONTENT_W - w) / 2;

      this.doc.addImage(imgData.dataUrl, imgData.format, x, this.y, w, h);
      this.y += h + 3;

      if (alt && alt !== "Imagen" && alt.trim() !== "") {
        this.writeText(alt, MARGIN_L, CONTENT_W, {
          fontSize: 8,
          color: C.muted,
          lineHeight: 1.2,
        });
        this.y += 2;
      }
    } catch (err) {
      if (this.abortSignal?.aborted) throw new Error("EXPORT_CANCELLED");
      console.warn("Image rendering error in PDF:", err);
      this.renderImageFallback(alt || "Imagen adjunta");
    }
  }

  /* ── Fallback de imagen limpio sin caracteres corruptos ── */
  private renderImageFallback(title: string) {
    this.ensureSpace(14);
    this.doc.setFillColor(...hexToRgb("#f8fafc"));
    this.doc.roundedRect(MARGIN_L, this.y, CONTENT_W, 12, 1.5, 1.5, "F");
    this.doc.setDrawColor(...hexToRgb(C.border));
    this.doc.roundedRect(MARGIN_L, this.y, CONTENT_W, 12, 1.5, 1.5, "S");

    this.doc.setFontSize(8.5);
    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(...hexToRgb(C.muted));
    this.doc.text(`[ Imagen: ${title} ]`, MARGIN_L + CONTENT_W / 2, this.y + 7.5, { align: "center" });
    this.y += 16;
  }

  /* ── Utilidades ── */
  private flattenText(node: JSONContent): string {
    if (node.type === "text") return node.text || "";
    if (!node.content) return "";
    return node.content.map((c) => this.flattenText(c)).join("");
  }

  /* ── Finalizar PDF ── */
  finalize(): jsPDF {
    this.addFooter();
    return this.doc;
  }
}

interface BackgroundTaskState {
  active: boolean;
  title: string;
  progress: number;
  statusText: string;
  isComplete: boolean;
  error?: string | null;
  abortController: AbortController | null;
}

export function TipTapPDFExporter({
  documentTitle,
  documentEmoji,
  coverUrl,
  getContent,
  subjectId,
  userId,
  onExported
}: TipTapPDFExporterProps) {
  const [exporting, setExporting] = useState(false);
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [includeCover, setIncludeCover] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ blob: Blob; fileName: string } | null>(null);

  const [backgroundTask, setBackgroundTask] = useState<BackgroundTaskState | null>(null);
  const activeTaskRef = useRef<BackgroundTaskState | null>(null);
  activeTaskRef.current = backgroundTask;
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  const cancelExport = () => {
    if (activeTaskRef.current?.abortController) {
      activeTaskRef.current.abortController.abort();
    }
    setBackgroundTask(null);
    setExporting(false);
    toast.info("Descarga en segundo plano cancelada");
  };

  const dismissTask = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setBackgroundTask(null);
  };

  const uploadFile = async (blob: Blob, fileName: string, upsert: boolean) => {
    try {
      const storagePath = `${userId}/${fileName}.pdf`;
      const finalBlob = blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });

      if (upsert) {
        const { error: removeError } = await supabase.storage
          .from("library-files")
          .remove([storagePath]);

        if (removeError) console.warn("Remove failed (might not exist):", removeError);
      }

      const { error: uploadError } = await supabase.storage
        .from("library-files")
        .upload(storagePath, finalBlob, {
          contentType: "application/pdf",
          upsert: true,
          cacheControl: "0",
        });

      if (uploadError) throw uploadError;

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("library-files")
        .createSignedUrl(storagePath, 3600);

      if (signedUrlError) throw signedUrlError;

      const { error: dbError } = await supabase
        .from("library_files")
        .upsert(
          {
            user_id: userId,
            subject_id: subjectId,
            nombre: `${fileName}.pdf`,
            tipo: "pdf",
            url: signedUrlData.signedUrl,
            storage_path: storagePath,
            tamaño_bytes: finalBlob.size,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "storage_path" }
        );

      if (dbError) throw dbError;

      toast.success(upsert ? "Archivo actualizado en Biblioteca" : "Guardado en biblioteca exitosamente");
      onExported?.();
    } catch (error) {
      console.error("Error uploading file:", error);
      const errMsg = (error as any)?.message || "Desconocido";

      // Si excede el tamaño del bucket de Supabase, descargar automáticamente a la PC
      if (errMsg.toLowerCase().includes("exceeded") || errMsg.toLowerCase().includes("size") || errMsg.includes("413")) {
        toast.warning("El archivo es demasiado grande para la nube de la biblioteca. Se ha descargado automáticamente a tu equipo.");
        try {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${fileName}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (downloadErr) {
          console.error("Fallback download error:", downloadErr);
        }
      } else {
        toast.error("Error al guardar en biblioteca: " + errMsg);
      }
    } finally {
      setExporting(false);
      setShowOverwriteDialog(false);
      setPendingFile(null);
    }
  };

  const handleOverwrite = () => {
    if (pendingFile) uploadFile(pendingFile.blob, pendingFile.fileName, true);
  };

  const handleSaveAsCopy = () => {
    if (pendingFile) {
      const newName = `${pendingFile.fileName}-${Date.now()}`;
      uploadFile(pendingFile.blob, newName, false);
    }
  };

  const exportToPDF = async (options?: { forceLibrary?: boolean; forceDownload?: boolean }) => {
    const shouldSaveToLibrary = options?.forceLibrary ?? (options?.forceDownload ? false : saveToLibrary);
    const shouldDownload = options?.forceDownload ?? !options?.forceLibrary;

    const content = getContent();
    if (!content || !content.content || content.content.length === 0) {
      toast.error("El documento está vacío");
      return;
    }

    if (backgroundTask?.active) {
      toast.info("Ya hay una exportación en segundo plano en curso");
      return;
    }

    // Cerrar el modal de inmediato para no bloquear la pantalla del usuario
    setShowExportModal(false);

    const abortController = new AbortController();
    const taskTitle = documentTitle || "Apunte sin título";

    setBackgroundTask({
      active: true,
      title: taskTitle,
      progress: 5,
      statusText: "Iniciando descarga en segundo plano...",
      isComplete: false,
      error: null,
      abortController,
    });

    setExporting(true);
    ComicAudio.playPop();

    try {
      const renderer = new PDFRenderer({
        abortSignal: abortController.signal,
        onProgress: (pct, status) => {
          setBackgroundTask((prev) =>
            prev && prev.active
              ? { ...prev, progress: pct, statusText: status }
              : prev
          );
        },
      });

      // Header del documento (título, emoji y portada si existe)
      const safeEmoji = resolveSafeEmoji(documentEmoji);
      await renderer.renderHeader(documentTitle, safeEmoji, includeCover ? coverUrl : null);

      // Renderizar todos los nodos del contenido asíncronamente con yielding cooperativo
      await renderer.processNodes(content.content);

      if (abortController.signal.aborted) {
        throw new Error("EXPORT_CANCELLED");
      }

      setBackgroundTask((prev) =>
        prev ? { ...prev, progress: 95, statusText: "Generando archivo PDF..." } : prev
      );
      await yieldToMainThread();

      const doc = renderer.finalize();

      const cleanTitle = (documentTitle || "apunte")
        .replace(/[\n\r\t\/\\]/g, " ")
        .replace(/[^a-zA-Z0-9 \-_áéíóúñÁÉÍÓÚÑüÜ]/g, "")
        .replace(/\s+/g, " ")
        .trim() || "apunte";
      const fileName = cleanTitle;

      // Si el usuario eligió guardar una copia en la biblioteca
      if (shouldSaveToLibrary && subjectId) {
        setBackgroundTask((prev) =>
          prev ? { ...prev, progress: 97, statusText: "Guardando copia en la nube..." } : prev
        );
        await yieldToMainThread();

        const pdfBlob = doc.output("blob");

        const { data: existingFiles } = await supabase.storage
          .from("library-files")
          .list(userId, {
            limit: 100,
            search: `${fileName}.pdf`,
          });

        const exists = existingFiles?.some((f) => f.name === `${fileName}.pdf`);

        if (exists) {
          setPendingFile({ blob: pdfBlob, fileName });
          setShowOverwriteDialog(true);
          if (shouldDownload) {
            doc.save(`${fileName}.pdf`);
            ComicAudio.playPowerUp();
          }
          setBackgroundTask((prev) =>
            prev
              ? {
                  ...prev,
                  active: false,
                  isComplete: true,
                  progress: 100,
                  statusText: "¡Descargado! Confirma la copia en biblioteca.",
                }
              : prev
          );
          setExporting(false);
          return;
        } else {
          await uploadFile(pdfBlob, fileName, false);
        }
      }

      // ACCIÓN PRINCIPAL Y POR DEFECTO: Descargar el archivo al equipo del usuario
      if (shouldDownload) {
        doc.save(`${fileName}.pdf`);
        ComicAudio.playPowerUp();
      }

      setBackgroundTask({
        active: false,
        title: taskTitle,
        progress: 100,
        statusText: "¡Descarga completada con éxito!",
        isComplete: true,
        error: null,
        abortController: null,
      });

      toast.success("💥 ¡BAM! Tu apunte se descargó exitosamente");
      onExported?.();

      // Auto-ocultar widget tras 5 segundos
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setBackgroundTask(null);
      }, 5000);
    } catch (error: any) {
      if (error?.message === "EXPORT_CANCELLED" || abortController.signal.aborted) {
        console.log("PDF export was cancelled by user");
        setBackgroundTask(null);
      } else {
        console.error("Error exporting PDF:", error);
        setBackgroundTask({
          active: false,
          title: taskTitle,
          progress: 0,
          statusText: "Error: " + (error?.message || "Desconocido"),
          isComplete: false,
          error: error?.message || "Ocurrió un error al generar el PDF",
          abortController: null,
        });
        toast.error("Error al exportar el PDF: " + (error?.message || "Desconocido"));
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center">
      {/* Comic styled PDF export button group */}
      <div className="inline-flex items-center rounded-lg border-2 border-black dark:border-white shadow-[2.5px_2.5px_0_0_#000] dark:shadow-[2.5px_2.5px_0_0_#fff] overflow-hidden transition-all hover:-translate-y-0.5 active:translate-y-0.5">
        {/* Main button: DIRECT BACKGROUND DOWNLOAD */}
        <button
          onClick={() => exportToPDF({ forceDownload: true })}
          disabled={exporting && !backgroundTask?.active}
          title="Descargar PDF en tu equipo (Descarga en segundo plano)"
          className="flex items-center gap-1.5 px-3 py-1 bg-[#FFE600] hover:bg-[#FFD600] text-black font-black text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer select-none"
        >
          {backgroundTask?.active ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin stroke-[2.5]" />
              <span className="hidden sm:inline">Descargando ({backgroundTask.progress}%)</span>
              <span className="sm:hidden">{backgroundTask.progress}%</span>
            </>
          ) : exporting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin stroke-[2.5]" />
              <span className="hidden sm:inline">Generando...</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Exportar PDF</span>
              <span className="sm:hidden">PDF</span>
            </>
          )}
        </button>

        {/* Options trigger button: OPENS COMIC EXPORT MODAL */}
        <button
          onClick={() => {
            ComicAudio.playPop();
            setShowExportModal(true);
          }}
          disabled={exporting && !backgroundTask?.active}
          title="Opciones de exportación cómic (portada, biblioteca)"
          className="px-1.5 py-1 bg-[#FFE600] hover:bg-[#FFD600] text-black border-l-2 border-black transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
        >
          <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>

      {/* Comic Export Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="comic-panel max-w-md bg-background border-[3px] border-black dark:border-white shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#fff] p-0 overflow-hidden rounded-2xl">
          {/* Header con Halftone Comic */}
          <div className="relative bg-[#FFE600] border-b-[3px] border-black p-5 text-black overflow-hidden">
            <div className="absolute inset-0 comic-dots-overlay opacity-30 pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between mb-2">
              <ComicBadge variant="pink" rotate="left" size="sm">
                ¡COMIC EDITION!
              </ComicBadge>
              <ComicBadge variant="cyan" rotate="right" size="sm">
                A4 • ALTA CALIDAD
              </ComicBadge>
            </div>
            <DialogTitle className="comic-title text-2xl text-black tracking-wide">
              💥 EXPORTAR APUNTE
            </DialogTitle>
            <DialogDescription className="text-black/80 font-bold text-xs uppercase mt-0.5">
              Descargá tu apunte en segundo plano mientras seguís usando Tabe
            </DialogDescription>
          </div>

          <div className="p-5 space-y-4">
            {/* Preview Card */}
            <div className="comic-panel bg-card p-3.5 rounded-xl flex items-center gap-3 border-2 border-black dark:border-white shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#fff]">
              <div className="w-12 h-12 bg-[#00E5FF] text-black rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center justify-center shrink-0 select-none overflow-hidden">
                <TabeIconRenderer iconId={documentEmoji || "lightning"} size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-sm text-foreground truncate">
                  {documentTitle || "Apunte sin título"}
                </h4>
                <p className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#00FF66] inline-block border border-black" />
                  Descarga fluida sin trabas
                </p>
              </div>
            </div>

            {/* Opciones */}
            <div className="space-y-2.5">
              {coverUrl && (
                <label className="flex items-center justify-between p-3 rounded-xl border-2 border-border hover:border-black dark:hover:border-white transition-all cursor-pointer bg-card/60">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#FFE600]" />
                    <div>
                      <p className="text-xs font-black text-foreground">Incluir portada del apunte</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Añade la imagen de portada al inicio del PDF</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeCover}
                    onChange={(e) => setIncludeCover(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-black accent-[#FFE600] cursor-pointer"
                  />
                </label>
              )}

              {subjectId && (
                <label className="flex items-center justify-between p-3 rounded-xl border-2 border-border hover:border-black dark:hover:border-white transition-all cursor-pointer bg-card/60">
                  <div className="flex items-center gap-2.5">
                    <Library className="w-4 h-4 text-[#00E5FF]" />
                    <div>
                      <p className="text-xs font-black text-foreground">Guardar copia en mi Biblioteca</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Sube también una copia a la nube de Tabe</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={saveToLibrary}
                    onChange={(e) => setSaveToLibrary(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-black accent-[#FFE600] cursor-pointer"
                  />
                </label>
              )}
            </div>

            {/* Hint cómic no bloqueante */}
            <div className="p-2.5 rounded-lg bg-muted/50 border border-black/10 dark:border-white/10 text-[11px] text-muted-foreground flex items-center gap-2">
              <span className="text-base">⚡</span>
              <span>
                <strong>Descarga en segundo plano:</strong> Podés cerrar esta ventana y seguir leyendo o editando notas mientras tu archivo se prepara.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => exportToPDF({ forceDownload: true, forceLibrary: saveToLibrary })}
                disabled={exporting && !backgroundTask?.active}
                className="w-full bg-[#FFE600] text-black hover:bg-[#FFD600] font-black text-sm uppercase py-3 border-2 border-black shadow-[4px_4px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 select-none"
              >
                {backgroundTask?.active ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                    <span>DESCARGANDO ({backgroundTask.progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>💥 ¡DESCARGAR PDF A MI EQUIPO!</span>
                  </>
                )}
              </button>

              {subjectId && (
                <button
                  type="button"
                  onClick={() => exportToPDF({ forceLibrary: true, forceDownload: false })}
                  disabled={exporting && !backgroundTask?.active}
                  className="w-full bg-secondary hover:bg-secondary/80 text-foreground font-black text-xs uppercase py-2.5 border-2 border-black dark:border-white shadow-[2.5px_2.5px_0_0_#000] dark:shadow-[2.5px_2.5px_0_0_#fff] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 select-none"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Solo guardar en la Biblioteca</span>
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comic Overwrite Confirmation Dialog */}
      <Dialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <DialogContent className="comic-panel max-w-md bg-background border-[3px] border-black dark:border-white shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#fff] p-6 rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <ComicBadge variant="orange" size="sm" rotate="left">
                ¡ATENCIÓN!
              </ComicBadge>
            </div>
            <DialogTitle className="comic-title text-xl text-foreground">
              ⚠️ EL ARCHIVO YA EXISTE
            </DialogTitle>
            <DialogDescription className="font-medium text-xs text-muted-foreground mt-2">
              Ya tienes un archivo llamado <strong className="text-foreground">"{pendingFile?.fileName}.pdf"</strong> en tu biblioteca. ¿Qué deseas hacer con la copia en la nube?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-2 mt-4 flex-col sm:flex-row">
            <button
              type="button"
              onClick={() => setShowOverwriteDialog(false)}
              className="px-3 py-2 bg-secondary hover:bg-secondary/80 font-black text-xs uppercase border-2 border-black dark:border-white shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff] rounded-lg active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveAsCopy}
              className="px-3 py-2 bg-[#00E5FF] text-black font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0_0_#000] rounded-lg hover:bg-[#00cbeb] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              Guardar Copia
            </button>
            <button
              type="button"
              onClick={handleOverwrite}
              className="px-3 py-2 bg-[#FF2E93] text-white font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0_0_#000] rounded-lg hover:bg-[#e02680] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              Sobrescribir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Widget Flotante de Descarga Cómic en Segundo Plano (Estilo Chrome / Google Docs) ─── */}
      {backgroundTask && (
        <div className="fixed bottom-5 right-5 z-[9999] max-w-sm w-[92vw] sm:w-96 pointer-events-auto transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
          <div className="comic-panel bg-card border-[3px] border-black dark:border-white shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#fff] overflow-hidden rounded-2xl">
            {/* Header del widget con halftone cómic */}
            <div
              className={`relative px-4 py-2.5 border-b-[3px] border-black flex items-center justify-between overflow-hidden ${
                backgroundTask.isComplete
                  ? "bg-[#00FF66] text-black"
                  : backgroundTask.error
                  ? "bg-[#FF2E93] text-white"
                  : "bg-[#FFE600] text-black"
              }`}
            >
              <div className="absolute inset-0 comic-dots-overlay opacity-25 pointer-events-none" />
              <div className="relative z-10 flex items-center gap-2">
                {backgroundTask.isComplete ? (
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                ) : backgroundTask.error ? (
                  <AlertCircle className="w-4 h-4 stroke-[3]" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin stroke-[3]" />
                )}
                <span className="font-black text-xs uppercase tracking-wider">
                  {backgroundTask.isComplete
                    ? "¡Descarga Lista!"
                    : backgroundTask.error
                    ? "Error en descarga"
                    : "Descarga en segundo plano"}
                </span>
              </div>

              {/* Botón de cerrar o cancelar */}
              <button
                type="button"
                onClick={backgroundTask.isComplete || backgroundTask.error ? dismissTask : cancelExport}
                className="relative z-10 w-6 h-6 rounded-md bg-black/10 hover:bg-black/20 text-current flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                title={backgroundTask.isComplete ? "Cerrar notificación" : "Cancelar descarga"}
              >
                <X className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>

            {/* Contenido del widget */}
            <div className="p-4 space-y-3 bg-background">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#00E5FF] text-black border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center justify-center shrink-0 select-none overflow-hidden">
                  <TabeIconRenderer iconId={documentEmoji || "lightning"} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-black text-xs text-foreground truncate">
                    {backgroundTask.title}
                  </h5>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`w-2 h-2 rounded-full inline-block border border-black ${
                        backgroundTask.isComplete
                          ? "bg-[#00FF66]"
                          : backgroundTask.error
                          ? "bg-[#FF2E93]"
                          : "bg-[#FFE600] animate-pulse"
                      }`}
                    />
                    {backgroundTask.statusText}
                  </p>
                </div>
                <span className="font-black text-xs text-foreground font-mono">
                  {backgroundTask.progress}%
                </span>
              </div>

              {/* Barra de progreso Cómic */}
              <div className="relative w-full h-3.5 bg-muted rounded-full border-2 border-black dark:border-white overflow-hidden p-[1px]">
                <div
                  className={`h-full rounded-full transition-all duration-200 border-r border-black ${
                    backgroundTask.isComplete
                      ? "bg-[#00FF66]"
                      : backgroundTask.error
                      ? "bg-[#FF2E93]"
                      : "bg-[#00E5FF]"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, backgroundTask.progress))}%` }}
                />
              </div>

              {/* Footer info o acciones */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-[10px] font-medium text-muted-foreground italic truncate max-w-[210px]">
                  {backgroundTask.isComplete
                    ? "🎉 Guardado en tu carpeta de descargas"
                    : backgroundTask.error
                    ? "Podés reintentar cuando gustes"
                    : "⚡ Podés seguir usando Tabe con fluidez"}
                </p>
                {!backgroundTask.isComplete && !backgroundTask.error ? (
                  <button
                    type="button"
                    onClick={cancelExport}
                    className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase underline cursor-pointer"
                  >
                    Cancelar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={dismissTask}
                    className="text-[10px] font-black text-foreground hover:underline uppercase cursor-pointer"
                  >
                    Cerrar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

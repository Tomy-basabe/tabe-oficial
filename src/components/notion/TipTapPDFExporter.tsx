import { useState } from "react";
import { Download, Loader2, Library } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { JSONContent } from "@tiptap/core";
import jsPDF from "jspdf";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    .replace(/↔/g, "<->")
    .replace(/⇒/g, "=>")
    .replace(/⇐/g, "<=")
    .replace(/•/g, "-");
}

/**
 * Renderiza emojis a imagen PNG para que no se corrompan en jsPDF.
 */
function renderEmojiToDataUrl(emoji: string): string | null {
  if (!emoji) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.font = "44px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(emoji, 32, 35);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

/**
 * Comprime y redimensiona una imagen para que el PDF no sea excesivamente pesado.
 * Reduce fotos gigantes a un tamaño óptimo para A4 (máx 1000px) y formato JPEG 80%.
 */
function compressImageToDataUrl(
  img: HTMLImageElement,
  maxDim: number = 1000,
  quality: number = 0.80
): { dataUrl: string; width: number; height: number; format: "JPEG" } {
  let w = img.naturalWidth || 800;
  let h = img.naturalHeight || 600;

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
  ctx.drawImage(img, 0, 0, w, h);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { dataUrl, width: w, height: h, format: "JPEG" };
}

/**
 * Carga una imagen real y la comprime para incrustarla liviana en jsPDF.
 */
async function fetchImageDataUrl(src: string): Promise<{ dataUrl: string; width: number; height: number; format: "JPEG" } | null> {
  if (!src) return null;

  // 1. Data URL
  if (src.startsWith("data:image/")) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve(compressImageToDataUrl(img));
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // 2. Fetch Blob (Supabase Storage y URLs CORS)
  try {
    const res = await fetch(src, { mode: "cors" });
    if (res.ok) {
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resBlob, rejBlob) => {
        const reader = new FileReader();
        reader.onloadend = () => resBlob(reader.result as string);
        reader.onerror = rejBlob;
        reader.readAsDataURL(blob);
      });

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(compressImageToDataUrl(img));
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      });
    }
  } catch (err) {
    console.warn("Fetch blob failed, trying HTMLImageElement fallback:", err);
  }

  // 3. Fallback con new Image() y Canvas
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        resolve(compressImageToDataUrl(img));
      } catch (e) {
        console.warn("Image compression failed:", e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

interface RenderedCodeChunk {
  dataUrl: string;
  widthMm: number;
  heightMm: number;
}

/**
 * Renderiza bloques de código usando HTML Canvas optimizado en formato JPEG.
 * Esto garantiza que:
 * 1. Todos los caracteres Unicode (box drawing ┌─┐│└┘, flechas ↑↓→, etc.) se vean perfectos.
 * 2. La fuente sea exactamente monoespaciada con alineación horizontal precisa.
 * 3. Se mantenga el fondo oscuro idéntico al editor de la app.
 * 4. El tamaño del archivo sea mínimo (utiliza JPEG 82% en lugar de PNG raw).
 */
function renderCodeBlockToImages(code: string, language: string = "text"): RenderedCodeChunk[] {
  const lines = code.split(/\r?\n/);
  if (lines.length === 0) return [];

  const maxLinesPerChunk = 34;
  const chunks: RenderedCodeChunk[] = [];
  const totalChunks = Math.ceil(lines.length / maxLinesPerChunk);

  for (let c = 0; c < totalChunks; c++) {
    const start = c * maxLinesPerChunk;
    const end = Math.min(start + maxLinesPerChunk, lines.length);
    const chunkLines = lines.slice(start, end);
    const isFirst = c === 0;

    const scale = 1.3; // Nitidez equilibrada con peso ultra liviano
    const fontSize = 11.5 * scale;
    const lineHeight = 17 * scale;
    const padX = 14 * scale;
    const headerH = isFirst ? 24 * scale : 8 * scale;
    const padBottom = 10 * scale;

    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.font = `${fontSize}px "Consolas", "Cascadia Code", "Courier New", monospace`;

    let maxLineW = 0;
    for (const l of chunkLines) {
      const w = tempCtx.measureText(l).width;
      if (w > maxLineW) maxLineW = w;
    }

    const canvasW = Math.max(700, Math.min(1100, maxLineW + padX * 2));
    const canvasH = headerH + chunkLines.length * lineHeight + padBottom;

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d")!;

    // Fondo oscuro (#18181b - igual al tema dark de Tabe)
    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Cabecera en el primer fragmento
    if (isFirst) {
      ctx.fillStyle = "#71717a";
      ctx.font = `600 ${10 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      const label = language || "text";
      ctx.fillText(label, padX, 15 * scale);

      // Línea divisoria suave
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(padX, headerH - 3 * scale);
      ctx.lineTo(canvasW - padX, headerH - 3 * scale);
      ctx.stroke();
    }

    // Dibujar texto con fuente monoespaciada exacta
    ctx.fillStyle = "#f4f4f5";
    ctx.font = `${fontSize}px "Consolas", "Cascadia Code", "Courier New", monospace`;
    ctx.textBaseline = "middle";

    for (let i = 0; i < chunkLines.length; i++) {
      const lineText = chunkLines[i];
      const y = headerH + (i + 0.5) * lineHeight;
      ctx.fillText(lineText, padX, y);
    }

    // Exportar como JPEG con calidad 82% (pesa 95% menos que PNG)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    const widthMm = CONTENT_W;
    const heightMm = (canvasH / canvasW) * widthMm;

    chunks.push({ dataUrl, widthMm, heightMm });
  }

  return chunks;
}

/**
 * Motor de renderizado PDF directo con jsPDF.
 * Renderiza textos, resaltados, imágenes reales y bloques de código con total fidelidad.
 */
class PDFRenderer {
  private doc: jsPDF;
  private y: number;
  private pageNum: number;

  constructor() {
    this.doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true, // Compresión interna zlib
    });
    this.y = MARGIN_T;
    this.pageNum = 1;
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
    // Portada si existe
    if (coverUrl) {
      try {
        const coverImg = await fetchImageDataUrl(coverUrl);
        if (coverImg) {
          const coverH = 40;
          this.doc.addImage(coverImg.dataUrl, coverImg.format, MARGIN_L, this.y, CONTENT_W, coverH);
          this.y += coverH + 6;
        }
      } catch (e) {
        console.warn("Cover image failed to load:", e);
      }
    }

    // Emoji del documento renderizado en canvas para evitar basura Unicode
    if (emoji) {
      const emojiDataUrl = renderEmojiToDataUrl(emoji);
      if (emojiDataUrl) {
        this.doc.addImage(emojiDataUrl, "PNG", MARGIN_L, this.y, 10, 10);
        this.y += 12;
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

  /* ── Procesar nodos ── */
  async processNodes(nodes: JSONContent[]) {
    for (const node of nodes) {
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
        this.renderCodeBlock(node);
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
        if (node.content) await this.processNodes(node.content);
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

  /* ── Bloque de código con alta fidelidad gráfica ── */
  private renderCodeBlock(node: JSONContent) {
    const code = node.content?.[0]?.text || "";
    const language = node.attrs?.language || "text";

    // Usar motor de canvas 2x para renderizar exactamente el bloque de código
    const chunks = renderCodeBlockToImages(code, language);
    if (chunks.length === 0) return;

    for (const chunk of chunks) {
      this.ensureSpace(chunk.heightMm + 4);
      this.doc.addImage(chunk.dataUrl, "PNG", MARGIN_L, this.y, chunk.widthMm, chunk.heightMm);
      this.y += chunk.heightMm + 4;
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

  /* ── Tabla ── */
  private renderTable(node: JSONContent) {
    const rows = node.content || [];
    if (rows.length === 0) return;

    const numCols = rows[0]?.content?.length || 1;
    const colW = CONTENT_W / numCols;
    const cellPad = 2;
    const cellFontSize = 9;

    this.y += 2;

    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      const cells = row.content || [];
      const isHeader = cells.some((c) => c.type === "tableHeader") || ri === 0;

      let maxCellH = 6;
      const cellTexts: string[][] = [];
      for (const cell of cells) {
        const text = cleanTextForPdf(this.flattenText(cell));
        this.doc.setFontSize(cellFontSize);
        const wrapped = this.doc.splitTextToSize(text, colW - cellPad * 2);
        cellTexts.push(wrapped);
        const h = wrapped.length * (cellFontSize * 1.4 / 2.835) + cellPad * 2;
        maxCellH = Math.max(maxCellH, h);
      }

      this.ensureSpace(maxCellH + 2);

      for (let ci = 0; ci < cells.length; ci++) {
        const cx = MARGIN_L + ci * colW;

        if (isHeader) {
          this.doc.setFillColor(...hexToRgb(C.tableHeaderBg));
          this.doc.rect(cx, this.y - 1, colW, maxCellH, "F");
        }

        this.doc.setDrawColor(...hexToRgb(C.tableBorderColor));
        this.doc.setLineWidth(0.2);
        this.doc.rect(cx, this.y - 1, colW, maxCellH, "S");

        this.doc.setFontSize(cellFontSize);
        this.doc.setFont("helvetica", isHeader ? "bold" : "normal");
        this.doc.setTextColor(...hexToRgb(C.text));

        const lines = cellTexts[ci] || [];
        const lineH = cellFontSize * 1.4 / 2.835;
        for (let li = 0; li < lines.length; li++) {
          this.doc.text(lines[li], cx + cellPad, this.y + cellPad + lineH * (li + 0.7));
        }
      }

      this.y += maxCellH;
    }

    this.y += 4;
  }

  /* ── Desplegables / Details (SIEMPRE ABIERTOS Y CON FLECHA VECTORIAL) ── */
  private async renderDetails(node: JSONContent) {
    this.ensureSpace(12);

    for (const child of node.content || []) {
      if (child.type === "detailsSummary") {
        const summaryText = cleanTextForPdf(this.flattenText(child));
        this.doc.setFontSize(10);
        const lines = this.doc.splitTextToSize(summaryText, CONTENT_W - 14);
        const summaryH = lines.length * 4.2 + 5;

        // Fondo de cabecera del desplegable
        this.doc.setFillColor(...hexToRgb("#f8fafc"));
        this.doc.roundedRect(MARGIN_L, this.y - 2, CONTENT_W, summaryH, 1.5, 1.5, "F");
        this.doc.setDrawColor(...hexToRgb(C.border));
        this.doc.roundedRect(MARGIN_L, this.y - 2, CONTENT_W, summaryH, 1.5, 1.5, "S");

        // Triángulo desplegado hacia abajo ▼ dibujado como VECTOR (¡adiós al bug de %1/4!)
        const arrowX = MARGIN_L + 3.5;
        const arrowY = this.y - 0.5;
        this.doc.setFillColor(...hexToRgb(C.taskCheck));
        this.doc.triangle(
          arrowX, arrowY,
          arrowX + 3.4, arrowY,
          arrowX + 1.7, arrowY + 2.6,
          "F"
        );

        // Texto del título del desplegable
        this.writeRichInline(child.content, MARGIN_L + 9, CONTENT_W - 14, 10, C.text, 1.4);
        this.y += 3;
      } else if (child.type === "detailsContent") {
        // Contenido desplegado (siempre visible en el apunte PDF)
        this.y += 1;
        for (const innerChild of child.content || []) {
          await this.processNode(innerChild);
        }
      }
    }

    this.y += 4;
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
    const src = node.attrs?.src;
    const alt = cleanTextForPdf(node.attrs?.alt || "");
    if (!src) return;

    try {
      const imgData = await fetchImageDataUrl(src);
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
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ blob: Blob; fileName: string } | null>(null);

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

      toast.success(upsert ? "Archivo actualizado exitosamente" : "Guardado en biblioteca exitosamente");
      onExported?.();
    } catch (error) {
      console.error("Error uploading file:", error);
      const errMsg = (error as any)?.message || "Desconocido";

      // Si excede el tamaño del bucket de Supabase, descargar automáticamente a la PC
      if (errMsg.toLowerCase().includes("exceeded") || errMsg.toLowerCase().includes("size") || errMsg.includes("413")) {
        toast.warning("El archivo es demasiado grande para la nube de la biblioteca. Se ha descargado automáticamente a tu equipo.");
        try {
          const url = URL.createObjectURL(finalBlob);
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

  const exportToPDF = async () => {
    const content = getContent();
    if (!content || !content.content || content.content.length === 0) {
      toast.error("El documento está vacío");
      return;
    }

    setExporting(true);

    try {
      const renderer = new PDFRenderer();

      // Header del documento (título, emoji y portada si existe)
      await renderer.renderHeader(documentTitle, documentEmoji, coverUrl);

      // Renderizar todos los nodos del contenido asíncronamente
      await renderer.processNodes(content.content);

      const doc = renderer.finalize();

      const cleanTitle = (documentTitle || "apunte")
        .replace(/[\n\r\t\/\\]/g, " ")
        .replace(/[^a-zA-Z0-9 \-_áéíóúñÁÉÍÓÚÑüÜ]/g, "")
        .replace(/\s+/g, " ")
        .trim() || "apunte";
      const fileName = cleanTitle;

      if (saveToLibrary && subjectId) {
        const pdfBlob = doc.output("blob");

        console.log("PDF generado para biblioteca:", pdfBlob?.size, "bytes");

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
          setExporting(false);
        } else {
          await uploadFile(pdfBlob, fileName, false);
        }
      } else {
        doc.save(`${fileName}.pdf`);
        toast.success("PDF descargado exitosamente");
        setExporting(false);
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Error al exportar el PDF: " + ((error as any)?.message || "Desconocido"));
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {subjectId && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={saveToLibrary}
            onChange={(e) => setSaveToLibrary(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-secondary accent-primary"
          />
          <Library className="w-4 h-4" />
          <span className="hidden sm:inline">Guardar en Biblioteca</span>
        </label>
      )}

      <button
        onClick={exportToPDF}
        disabled={exporting}
        className="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        {exporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Exportando...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar PDF</span>
          </>
        )}
      </button>

      <Dialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>El archivo ya existe</DialogTitle>
            <DialogDescription>
              Ya tienes un archivo llamado "{pendingFile?.fileName}.pdf" en tu biblioteca.
              ¿Qué deseas hacer?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="secondary" onClick={() => setShowOverwriteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={handleSaveAsCopy}>
              Guardar Copia
            </Button>
            <Button onClick={handleOverwrite}>
              Sobrescribir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

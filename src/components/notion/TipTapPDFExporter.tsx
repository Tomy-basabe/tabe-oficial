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
  codeBg: "#0f172a",
  codeText: "#f1f5f9",
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
  // Named colors fallback
  const namedColors: Record<string, string> = {
    red: "#ef4444", blue: "#3b82f6", green: "#22c55e", yellow: "#eab308",
    purple: "#a855f7", orange: "#f97316", pink: "#ec4899", white: "#ffffff",
    black: "#000000", gray: "#6b7280", grey: "#6b7280",
  };
  return namedColors[color.toLowerCase()] || "#0f172a";
}

/**
 * Motor de renderizado PDF directo con jsPDF.
 * No usa html2canvas — dibuja cada elemento programáticamente.
 */
class PDFRenderer {
  private doc: jsPDF;
  private y: number;
  private pageNum: number;

  constructor() {
    this.doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
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
    // Pie de página con número
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

    this.doc.setFontSize(fontSize);
    this.doc.setFont("helvetica", fontStyle);
    this.doc.setTextColor(...hexToRgb(cssColorToHex(color)));

    const lines = this.doc.splitTextToSize(text, maxWidth - indent);
    const lineH = (fontSize * lineHeight) / 2.835; // pt → mm approx

    for (const line of lines) {
      this.ensureSpace(lineH);
      this.doc.text(line, x + indent, this.y);
      this.y += lineH;
    }

    return lines.length * lineH;
  }

  /* ── Procesar inline marks y extraer texto plano con segmentos ── */
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

      const seg: (typeof segments)[0] = { text: node.text };

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
   * Renderiza contenido inline con formato (bold, italic, colores, highlights).
   * Usa un approach de segmentos para manejar cambios de estilo mid-line.
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

    // Para texto simple (sin marcas especiales), usar writeText directamente
    const plainText = segments.map(s => s.text).join("");
    const hasSpecialMarks = segments.some(s => s.bold || s.italic || s.color || s.highlight || s.bgColor || s.link || s.code);

    if (!hasSpecialMarks) {
      return this.writeText(plainText, x, maxWidth, {
        fontSize: baseFontSize,
        color: baseColor,
        lineHeight: lineHeightMult,
      });
    }

    // Renderizado segmento por segmento en una sola línea lógica
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
          // Salto de línea
          curX = x;
          this.y += lineH;
          this.ensureSpace(lineH);
        }

        // Dibujar highlight/background detrás del texto
        if (seg.highlight || seg.bgColor) {
          const bgHex = cssColorToHex(seg.highlight || seg.bgColor || "#fef08a");
          this.doc.setFillColor(...hexToRgb(bgHex));
          this.doc.roundedRect(curX - 0.3, this.y - lineH * 0.7, wordW + 0.6, lineH * 0.9, 0.5, 0.5, "F");
          // Restaurar color de texto
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

  /* ── Bloque: Encabezado del documento ── */
  renderHeader(title: string, emoji: string) {
    if (emoji) {
      this.doc.setFontSize(28);
      this.doc.text(emoji, MARGIN_L, this.y + 5);
      this.y += 12;
    }

    this.writeText(title || "Sin título", MARGIN_L, CONTENT_W, {
      fontSize: 22,
      fontStyle: "bold",
      color: C.text,
      lineHeight: 1.3,
    });

    this.y += 2;

    // Fecha
    const dateStr = `Exportado el ${new Date().toLocaleDateString("es-AR", {
      day: "numeric", month: "long", year: "numeric",
    })} • TABE Apuntes`;
    this.writeText(dateStr, MARGIN_L, CONTENT_W, {
      fontSize: 8,
      color: C.muted,
    });

    // Línea separadora
    this.y += 3;
    this.doc.setDrawColor(...hexToRgb(C.border));
    this.doc.setLineWidth(0.3);
    this.doc.line(MARGIN_L, this.y, PAGE_W - MARGIN_R, this.y);
    this.y += 8;
  }

  /* ── Procesar nodos del JSON ── */
  processNodes(nodes: JSONContent[]) {
    for (const node of nodes) {
      this.processNode(node);
    }
  }

  private processNode(node: JSONContent) {
    switch (node.type) {
      case "paragraph":
        this.renderParagraph(node);
        break;
      case "heading":
        this.renderHeading(node);
        break;
      case "bulletList":
        this.renderBulletList(node);
        break;
      case "orderedList":
        this.renderOrderedList(node);
        break;
      case "taskList":
        this.renderTaskList(node);
        break;
      case "blockquote":
        this.renderBlockquote(node);
        break;
      case "codeBlock":
        this.renderCodeBlock(node);
        break;
      case "horizontalRule":
        this.renderHR();
        break;
      case "callout":
        this.renderCallout(node);
        break;
      case "table":
        this.renderTable(node);
        break;
      case "details":
        this.renderDetails(node);
        break;
      case "math":
        this.renderMath(node);
        break;
      case "image":
        // Las imágenes son complejas de manejar con jsPDF puro (necesitan fetch + decode).
        // Dejamos un placeholder estilizado.
        this.renderImagePlaceholder(node);
        break;
      default:
        if (node.content) this.processNodes(node.content);
        break;
    }
  }

  /* ── Párrafo ── */
  private renderParagraph(node: JSONContent) {
    const segments = this.getInlineSegments(node.content);
    if (segments.length === 0) {
      this.y += 3; // Párrafo vacío = espaciado
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

  /* ── Lista con viñetas ── */
  private renderBulletList(node: JSONContent, depth: number = 0) {
    const indent = depth * 6;
    for (const item of node.content || []) {
      const bulletChars = ["•", "◦", "▪"];
      const bullet = bulletChars[Math.min(depth, bulletChars.length - 1)];
      this.ensureSpace(6);
      this.doc.setFontSize(10);
      this.doc.setTextColor(...hexToRgb(C.text));
      this.doc.text(bullet, MARGIN_L + indent + 2, this.y);

      // Procesar contenido del item
      for (const child of item.content || []) {
        if (child.type === "paragraph") {
          this.writeRichInline(child.content, MARGIN_L + indent + 6, CONTENT_W - indent - 6, 10, C.text, 1.5);
        } else if (child.type === "bulletList") {
          this.renderBulletList(child, depth + 1);
        } else if (child.type === "orderedList") {
          this.renderOrderedList(child, depth + 1);
        } else {
          this.processNode(child);
        }
      }
      this.y += 1;
    }
    this.y += 2;
  }

  /* ── Lista numerada ── */
  private renderOrderedList(node: JSONContent, depth: number = 0) {
    const indent = depth * 6;
    let idx = 1;
    for (const item of node.content || []) {
      this.ensureSpace(6);
      this.doc.setFontSize(10);
      this.doc.setTextColor(...hexToRgb(C.text));
      this.doc.text(`${idx}.`, MARGIN_L + indent + 1, this.y);

      for (const child of item.content || []) {
        if (child.type === "paragraph") {
          this.writeRichInline(child.content, MARGIN_L + indent + 7, CONTENT_W - indent - 7, 10, C.text, 1.5);
        } else if (child.type === "bulletList") {
          this.renderBulletList(child, depth + 1);
        } else if (child.type === "orderedList") {
          this.renderOrderedList(child, depth + 1);
        } else {
          this.processNode(child);
        }
      }
      idx++;
      this.y += 1;
    }
    this.y += 2;
  }

  /* ── Lista de tareas ── */
  private renderTaskList(node: JSONContent) {
    for (const item of node.content || []) {
      const checked = item.attrs?.checked === true;
      this.ensureSpace(6);

      // Checkbox
      this.doc.setFontSize(10);
      const checkSymbol = checked ? "☑" : "☐";
      this.doc.setTextColor(...hexToRgb(C.taskCheck));
      this.doc.text(checkSymbol, MARGIN_L + 1, this.y);

      const textColor = checked ? C.taskMuted : C.text;
      for (const child of item.content || []) {
        if (child.type === "paragraph") {
          this.writeRichInline(child.content, MARGIN_L + 7, CONTENT_W - 7, 10, textColor, 1.5);
          // Tachado visual si está completado
          if (checked) {
            const plainText = this.getInlineSegments(child.content).map(s => s.text).join("");
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
  private renderBlockquote(node: JSONContent) {
    this.ensureSpace(12);
    const startY = this.y;

    // Fondo
    const plainText = this.flattenText(node);
    this.doc.setFontSize(10);
    const lines = this.doc.splitTextToSize(plainText, CONTENT_W - 10);
    const blockH = Math.max(lines.length * 4.5 + 4, 10);

    this.doc.setFillColor(...hexToRgb(C.blockquoteBg));
    this.doc.roundedRect(MARGIN_L + 3, this.y - 2, CONTENT_W - 3, blockH, 1, 1, "F");

    // Borde izquierdo azul
    this.doc.setFillColor(...hexToRgb(C.blockquoteBorder));
    this.doc.rect(MARGIN_L + 3, this.y - 2, 1.2, blockH, "F");

    // Texto
    for (const child of node.content || []) {
      if (child.type === "paragraph") {
        this.writeRichInline(child.content, MARGIN_L + 8, CONTENT_W - 12, 10, "#334155", 1.5);
      } else {
        this.processNode(child);
      }
    }

    this.y = Math.max(this.y, startY + blockH) + 3;
  }

  /* ── Bloque de código ── */
  private renderCodeBlock(node: JSONContent) {
    const code = node.content?.[0]?.text || "";
    this.doc.setFontSize(8.5);
    this.doc.setFont("courier", "normal");
    const lines = this.doc.splitTextToSize(code, CONTENT_W - 10);
    const blockH = lines.length * 3.5 + 8;

    this.ensureSpace(Math.min(blockH, PAGE_H - MARGIN_T - MARGIN_B));

    // Fondo oscuro
    this.doc.setFillColor(...hexToRgb(C.codeBg));
    this.doc.roundedRect(MARGIN_L, this.y - 2, CONTENT_W, Math.min(blockH, PAGE_H - MARGIN_T - MARGIN_B - 4), 2, 2, "F");

    // Texto claro
    this.doc.setTextColor(...hexToRgb(C.codeText));
    this.doc.setFontSize(8.5);
    this.doc.setFont("courier", "normal");

    const lineH = 3.5;
    this.y += 3;
    for (const line of lines) {
      this.ensureSpace(lineH);
      this.doc.text(line, MARGIN_L + 5, this.y);
      this.y += lineH;
    }
    this.y += 5;
    this.doc.setFont("helvetica", "normal");
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
  private renderCallout(node: JSONContent) {
    const calloutType = node.attrs?.type || "info";
    const palette: Record<string, { bg: string; border: string; icon: string; text: string }> = {
      info:    { bg: "#eff6ff", border: "#3b82f6", icon: "ℹ", text: "#1e3a8a" },
      success: { bg: "#f0fdf4", border: "#22c55e", icon: "✓", text: "#14532d" },
      warning: { bg: "#fefce8", border: "#eab308", icon: "⚠", text: "#713f12" },
      danger:  { bg: "#fef2f2", border: "#ef4444", icon: "✕", text: "#7f1d1d" },
      tip:     { bg: "#faf5ff", border: "#a855f7", icon: "💡", text: "#581c87" },
    };
    const colors = palette[calloutType] || palette.info;

    const plainText = this.flattenText(node);
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

    // Icono
    this.doc.setFontSize(12);
    this.doc.setTextColor(...hexToRgb(colors.border));
    this.doc.text(colors.icon, MARGIN_L + 4, this.y + 2);

    // Contenido
    this.y += 1;
    for (const child of node.content || []) {
      if (child.type === "paragraph") {
        this.writeRichInline(child.content, MARGIN_L + 10, CONTENT_W - 14, 10, colors.text, 1.5);
      } else {
        this.processNode(child);
      }
    }

    this.y += 4;
  }

  /* ── Tabla ── */
  private renderTable(node: JSONContent) {
    const rows = node.content || [];
    if (rows.length === 0) return;

    // Calcular número de columnas
    const numCols = rows[0]?.content?.length || 1;
    const colW = CONTENT_W / numCols;
    const cellPad = 2;
    const cellFontSize = 9;

    this.y += 2;

    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri];
      const cells = row.content || [];
      const isHeader = cells.some((c) => c.type === "tableHeader") || ri === 0;

      // Calcular la altura máxima de la fila
      let maxCellH = 6;
      const cellTexts: string[][] = [];
      for (const cell of cells) {
        const text = this.flattenText(cell);
        this.doc.setFontSize(cellFontSize);
        const wrapped = this.doc.splitTextToSize(text, colW - cellPad * 2);
        cellTexts.push(wrapped);
        const h = wrapped.length * (cellFontSize * 1.4 / 2.835) + cellPad * 2;
        maxCellH = Math.max(maxCellH, h);
      }

      this.ensureSpace(maxCellH + 2);

      // Dibujar celdas
      for (let ci = 0; ci < cells.length; ci++) {
        const cx = MARGIN_L + ci * colW;

        // Fondo de header
        if (isHeader) {
          this.doc.setFillColor(...hexToRgb(C.tableHeaderBg));
          this.doc.rect(cx, this.y - 1, colW, maxCellH, "F");
        }

        // Borde
        this.doc.setDrawColor(...hexToRgb(C.tableBorderColor));
        this.doc.setLineWidth(0.2);
        this.doc.rect(cx, this.y - 1, colW, maxCellH, "S");

        // Texto
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

  /* ── Details / Toggles (siempre abiertos) ── */
  private renderDetails(node: JSONContent) {
    this.ensureSpace(12);
    const startY = this.y;

    for (const child of node.content || []) {
      if (child.type === "detailsSummary") {
        // Fondo del summary
        const summaryText = this.flattenText(child);
        this.doc.setFontSize(10);
        const lines = this.doc.splitTextToSize(summaryText, CONTENT_W - 12);
        const summaryH = lines.length * 4.2 + 4;

        this.doc.setFillColor(...hexToRgb("#f8fafc"));
        this.doc.roundedRect(MARGIN_L, this.y - 2, CONTENT_W, summaryH, 1.5, 1.5, "F");

        // Triángulo ▼
        this.doc.setFontSize(8);
        this.doc.setTextColor(...hexToRgb(C.taskCheck));
        this.doc.text("▼", MARGIN_L + 3, this.y + 1);

        // Texto del summary
        this.writeRichInline(child.content, MARGIN_L + 8, CONTENT_W - 12, 10, C.text, 1.4);
        this.y += 2;

        // Borde inferior del summary
        this.doc.setDrawColor(...hexToRgb(C.border));
        this.doc.setLineWidth(0.2);
        this.doc.line(MARGIN_L, this.y - 1, PAGE_W - MARGIN_R, this.y - 1);
      } else if (child.type === "detailsContent") {
        // Contenido del toggle
        this.y += 1;
        for (const innerChild of child.content || []) {
          this.processNode(innerChild);
        }
      }
    }

    // Borde del toggle completo
    const endY = this.y;
    this.doc.setDrawColor(...hexToRgb(C.border));
    this.doc.setLineWidth(0.2);
    this.doc.roundedRect(MARGIN_L, startY - 2, CONTENT_W, endY - startY + 2, 1.5, 1.5, "S");
    this.y += 4;
  }

  /* ── Fórmula matemática ── */
  private renderMath(node: JSONContent) {
    const formula = node.attrs?.formula || "";
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

  /* ── Placeholder de imagen ── */
  private renderImagePlaceholder(node: JSONContent) {
    const alt = node.attrs?.alt || "Imagen";
    this.ensureSpace(20);

    this.doc.setFillColor(...hexToRgb("#f1f5f9"));
    this.doc.roundedRect(MARGIN_L + 20, this.y, CONTENT_W - 40, 16, 2, 2, "F");
    this.doc.setDrawColor(...hexToRgb(C.border));
    this.doc.roundedRect(MARGIN_L + 20, this.y, CONTENT_W - 40, 16, 2, 2, "S");

    this.doc.setFontSize(9);
    this.doc.setTextColor(...hexToRgb(C.muted));
    this.doc.text(`🖼  ${alt}`, MARGIN_L + CONTENT_W / 2, this.y + 9, { align: "center" });

    this.y += 20;
  }

  /* ── Utilidades ── */
  private flattenText(node: JSONContent): string {
    if (node.type === "text") return node.text || "";
    if (!node.content) return "";
    return node.content.map((c) => this.flattenText(c)).join("");
  }

  /* ── Exportar ── */
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

      if (uploadError) {
        throw uploadError;
      }

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
      toast.error("Error al guardar en biblioteca: " + (error as any)?.message);
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
      // Generar PDF programáticamente con jsPDF (sin html2canvas)
      const renderer = new PDFRenderer();

      // Header del documento
      renderer.renderHeader(documentTitle, documentEmoji);

      // Contenido
      renderer.processNodes(content.content);

      const doc = renderer.finalize();

      const cleanTitle = (documentTitle || "apunte").replace(/[^a-zA-Z0-9\s\-_áéíóúñÁÉÍÓÚÑ]/g, "").trim() || "apunte";
      const fileName = cleanTitle;

      if (saveToLibrary && subjectId) {
        // Obtener blob directamente de jsPDF — 100% confiable
        const pdfBlob = doc.output("blob");

        console.log("PDF generado para biblioteca:", pdfBlob?.size, "bytes");

        // Comprobar si el archivo ya existe en la biblioteca
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

import { useState } from "react";
import { Download, Loader2, Library } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { JSONContent } from "@tiptap/core";

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

  /**
   * Fallback: Convertidor de JSONContent a HTML completo en caso de que
   * el elemento DOM del editor no se encuentre en pantalla.
   */
  const convertToHtml = (data: JSONContent): string => {
    if (!data || !data.content) return "";

    const processContent = (content: JSONContent[]): string => {
      let result = "";

      content.forEach((node) => {
        const alignStyle = node.attrs?.textAlign ? `text-align: ${node.attrs.textAlign};` : "";

        switch (node.type) {
          case "paragraph":
            result += `<p style="line-height: 1.7; margin-bottom: 12px; font-size: 15px; color: #1f2937; ${alignStyle}">${renderInlineContent(node.content)}</p>`;
            break;

          case "heading": {
            const level = node.attrs?.level || 2;
            const headerSizes: Record<number, string> = {
              1: "font-size: 26px; font-weight: 700; margin: 28px 0 14px; color: #0f172a; line-height: 1.3;",
              2: "font-size: 21px; font-weight: 600; margin: 24px 0 12px; color: #0f172a; line-height: 1.3;",
              3: "font-size: 17px; font-weight: 600; margin: 20px 0 10px; color: #0f172a; line-height: 1.3;",
            };
            result += `<h${level} style="${headerSizes[level] || ""} ${alignStyle}">${renderInlineContent(node.content)}</h${level}>`;
            break;
          }

          case "bulletList":
            result += `<ul style="list-style-type: disc; padding-left: 24px; margin-bottom: 14px;">`;
            (node.content || []).forEach((item) => {
              result += `<li style="margin-bottom: 6px; line-height: 1.6; color: #1f2937;">${processContent(item.content || [])}</li>`;
            });
            result += `</ul>`;
            break;

          case "orderedList":
            result += `<ol style="list-style-type: decimal; padding-left: 24px; margin-bottom: 14px;">`;
            (node.content || []).forEach((item) => {
              result += `<li style="margin-bottom: 6px; line-height: 1.6; color: #1f2937;">${processContent(item.content || [])}</li>`;
            });
            result += `</ol>`;
            break;

          case "taskList":
            result += `<div style="margin-bottom: 14px;">`;
            (node.content || []).forEach((item) => {
              const checked = item.attrs?.checked;
              const checkbox = checked ? "☑" : "☐";
              const textStyle = checked ? "text-decoration: line-through; color: #94a3b8;" : "color: #1f2937;";
              result += `<div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 6px;">
                <span style="font-size: 16px; line-height: 1.5; color: #3b82f6;">${checkbox}</span>
                <div style="${textStyle} flex: 1;">${processContent(item.content || [])}</div>
              </div>`;
            });
            result += `</div>`;
            break;

          case "blockquote":
            result += `<blockquote style="border-left: 4px solid #3b82f6; padding: 8px 16px; margin: 16px 0; font-style: italic; background: #f8fafc; color: #475569; border-radius: 0 6px 6px 0;">`;
            result += processContent(node.content || []);
            result += `</blockquote>`;
            break;

          case "codeBlock":
            result += `<pre style="background: #0f172a; color: #f1f5f9; padding: 14px 18px; border-radius: 8px; overflow-x: auto; font-family: 'Fira Code', Consolas, Monaco, monospace; font-size: 13px; line-height: 1.5; margin: 16px 0;"><code>${node.content?.[0]?.text || ""}</code></pre>`;
            break;

          case "horizontalRule":
            result += `<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />`;
            break;

          case "callout": {
            const calloutType = node.attrs?.type || "info";
            const calloutColors: Record<string, { bg: string; border: string; icon: string; text: string }> = {
              info: { bg: "#eff6ff", border: "#3b82f6", icon: "ℹ️", text: "#1e3a8a" },
              success: { bg: "#f0fdf4", border: "#22c55e", icon: "✅", text: "#14532d" },
              warning: { bg: "#fefce8", border: "#eab308", icon: "⚠️", text: "#713f12" },
              danger: { bg: "#fef2f2", border: "#ef4444", icon: "🚫", text: "#7f1d1d" },
              tip: { bg: "#faf5ff", border: "#a855f7", icon: "💡", text: "#581c87" },
            };
            const colors = calloutColors[calloutType] || calloutColors.info;
            result += `<div style="display: flex; gap: 12px; background: ${colors.bg}; border-left: 4px solid ${colors.border}; border-radius: 8px; padding: 14px 16px; margin: 14px 0; color: ${colors.text};">
              <span style="font-size: 18px; flex-shrink: 0;">${colors.icon}</span>
              <div style="flex: 1;">${processContent(node.content || [])}</div>
            </div>`;
            break;
          }

          case "table":
            result += `<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">`;
            (node.content || []).forEach((row) => {
              result += `<tr>`;
              (row.content || []).forEach((cell) => {
                const isHeader = cell.type === "tableHeader";
                const cellStyle = isHeader
                  ? "background: #f1f5f9; font-weight: 600; padding: 8px 12px; border: 1px solid #cbd5e1; color: #0f172a;"
                  : "padding: 8px 12px; border: 1px solid #cbd5e1; color: #1f2937;";
                result += `<td style="${cellStyle}">${processContent(cell.content || [])}</td>`;
              });
              result += `</tr>`;
            });
            result += `</table>`;
            break;

          case "image":
            result += `<figure style="margin: 18px 0; text-align: center;">
              <img src="${node.attrs?.src || ""}" alt="${node.attrs?.alt || ""}" style="max-width: 100%; height: auto; border-radius: 8px;" crossorigin="anonymous" />
              ${node.attrs?.alt ? `<figcaption style="color: #64748b; font-size: 13px; margin-top: 6px;">${node.attrs.alt}</figcaption>` : ""}
            </figure>`;
            break;

          // DESPLEGABLES / TOGGLES: SIEMPRE ABIERTOS EN EL PDF
          case "details":
            result += `<details open style="margin: 12px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">`;
            (node.content || []).forEach((child) => {
              if (child.type === "detailsSummary") {
                result += `<summary style="padding: 10px 14px; background: #f8fafc; font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 8px; list-style: none; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-size: 10px; color: #64748b;">▼</span>
                  <span>${renderInlineContent(child.content)}</span>
                </summary>`;
              } else if (child.type === "detailsContent") {
                result += `<div style="padding: 14px 18px; background: #ffffff;">${processContent(child.content || [])}</div>`;
              }
            });
            result += `</details>`;
            break;

          case "math":
            result += `<div style="margin: 12px 0; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-family: monospace; text-align: center; color: #0f172a;">${node.attrs?.formula || ""}</div>`;
            break;

          default:
            if (node.content) {
              result += processContent(node.content);
            }
            break;
        }
      });

      return result;
    };

    const renderInlineContent = (content: JSONContent[] | undefined): string => {
      if (!content) return "";

      return content
        .map((node) => {
          if (node.type === "text") {
            let text = node.text || "";
            const marks = node.marks || [];

            marks.forEach((mark) => {
              switch (mark.type) {
                case "bold":
                  text = `<strong>${text}</strong>`;
                  break;
                case "italic":
                  text = `<em>${text}</em>`;
                  break;
                case "underline":
                  text = `<u>${text}</u>`;
                  break;
                case "strike":
                  text = `<s>${text}</s>`;
                  break;
                case "subscript":
                  text = `<sub>${text}</sub>`;
                  break;
                case "superscript":
                  text = `<sup>${text}</sup>`;
                  break;
                case "code":
                  text = `<code style="background: #f1f5f9; color: #0f172a; padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 0.9em;">${text}</code>`;
                  break;
                case "highlight": {
                  const hlColor = mark.attrs?.color || "#fef08a";
                  text = `<mark style="background-color: ${hlColor}; color: inherit; padding: 1px 4px; border-radius: 3px; font-weight: 500;">${text}</mark>`;
                  break;
                }
                case "textStyle": {
                  let inlineStyles = "";
                  if (mark.attrs?.color) {
                    inlineStyles += `color: ${mark.attrs.color}; `;
                  }
                  if (mark.attrs?.backgroundColor && mark.attrs.backgroundColor !== "transparent") {
                    inlineStyles += `background-color: ${mark.attrs.backgroundColor}; padding: 1px 4px; border-radius: 3px; `;
                  }
                  if (mark.attrs?.fontSize) {
                    inlineStyles += `font-size: ${mark.attrs.fontSize}; `;
                  }
                  if (inlineStyles) {
                    text = `<span style="${inlineStyles}">${text}</span>`;
                  }
                  break;
                }
                case "link":
                  text = `<a href="${mark.attrs?.href || ""}" style="color: #2563eb; text-decoration: underline;">${text}</a>`;
                  break;
              }
            });

            return text;
          }
          return "";
        })
        .join("");
    };

    return processContent(data.content);
  };

  /**
   * Construye el nodo DOM de alta fidelidad que se enviará a html2pdf.
   * Clona el editor vivo en pantalla para preservar colores, KaTeX, tablas,
   * callouts, y abre forzosamente todos los desplegables (<details>).
   */
  const buildExportElement = (content: JSONContent): HTMLElement => {
    const liveEditor =
      document.querySelector<HTMLElement>(".notion-advanced-editor .ProseMirror") ||
      document.querySelector<HTMLElement>(".notion-editor-content.ProseMirror") ||
      document.querySelector<HTMLElement>(".ProseMirror");

    const exportWrapper = document.createElement("div");
    exportWrapper.id = "tabe-pdf-export-content";
    exportWrapper.style.width = "794px"; // Ancho A4
    exportWrapper.style.maxWidth = "794px";
    exportWrapper.style.padding = "40px 48px";
    exportWrapper.style.margin = "0 auto";
    exportWrapper.style.background = "#ffffff";
    exportWrapper.style.color = "#1f2937";
    exportWrapper.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    exportWrapper.style.lineHeight = "1.65";
    exportWrapper.style.boxSizing = "border-box";

    // Estilos CSS inyectados para el PDF
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      #tabe-pdf-export-content * {
        box-sizing: border-box;
      }
      #tabe-pdf-export-content p {
        margin: 0 0 12px 0;
        line-height: 1.7;
        color: #1f2937;
        font-size: 15px;
      }
      #tabe-pdf-export-content h1 {
        font-size: 26px;
        font-weight: 700;
        color: #0f172a;
        margin: 28px 0 14px 0;
        line-height: 1.3;
        page-break-after: avoid;
      }
      #tabe-pdf-export-content h2 {
        font-size: 21px;
        font-weight: 600;
        color: #0f172a;
        margin: 24px 0 12px 0;
        line-height: 1.3;
        page-break-after: avoid;
      }
      #tabe-pdf-export-content h3 {
        font-size: 17px;
        font-weight: 600;
        color: #0f172a;
        margin: 20px 0 10px 0;
        line-height: 1.3;
        page-break-after: avoid;
      }
      #tabe-pdf-export-content ul:not([data-type="taskList"]) {
        list-style-type: disc;
        padding-left: 24px;
        margin: 0 0 14px 0;
      }
      #tabe-pdf-export-content ol {
        list-style-type: decimal;
        padding-left: 24px;
        margin: 0 0 14px 0;
      }
      #tabe-pdf-export-content li {
        margin-bottom: 6px;
        line-height: 1.6;
        color: #1f2937;
      }
      #tabe-pdf-export-content blockquote {
        border-left: 4px solid #3b82f6;
        padding: 8px 16px;
        margin: 16px 0;
        background: #f8fafc;
        color: #475569;
        font-style: italic;
        border-radius: 0 6px 6px 0;
        page-break-inside: avoid;
      }
      #tabe-pdf-export-content mark {
        border-radius: 3px;
        padding: 1px 4px;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
        font-weight: 500;
      }
      #tabe-pdf-export-content pre {
        background: #0f172a !important;
        color: #f1f5f9 !important;
        padding: 14px 18px !important;
        border-radius: 8px !important;
        font-family: 'Fira Code', Consolas, Monaco, monospace !important;
        font-size: 13px !important;
        line-height: 1.5 !important;
        overflow-x: auto !important;
        margin: 16px 0 !important;
        page-break-inside: avoid !important;
      }
      #tabe-pdf-export-content code {
        font-family: 'Fira Code', Consolas, Monaco, monospace;
        font-size: 0.9em;
        background: #f1f5f9;
        color: #0f172a;
        padding: 2px 5px;
        border-radius: 4px;
      }
      #tabe-pdf-export-content pre code {
        background: transparent !important;
        color: inherit !important;
        padding: 0 !important;
      }
      #tabe-pdf-export-content table {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;
        page-break-inside: avoid;
      }
      #tabe-pdf-export-content th,
      #tabe-pdf-export-content td {
        border: 1px solid #cbd5e1;
        padding: 8px 12px;
        text-align: left;
        font-size: 14px;
        color: #1f2937;
      }
      #tabe-pdf-export-content th {
        background: #f1f5f9;
        font-weight: 600;
        color: #0f172a;
      }
      #tabe-pdf-export-content img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        margin: 12px 0;
        page-break-inside: avoid;
      }
      #tabe-pdf-export-content figure {
        margin: 16px 0;
        text-align: center;
        page-break-inside: avoid;
      }
      #tabe-pdf-export-content hr {
        border: none;
        border-top: 1px solid #e2e8f0;
        margin: 24px 0;
      }

      /* === DESPLEGABLES / TOGGLE DETAILS: SIEMPRE ABIERTOS EN EL PDF === */
      #tabe-pdf-export-content details,
      #tabe-pdf-export-content details.notion-details {
        display: block !important;
        margin: 12px 0 !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 8px !important;
        background: #ffffff !important;
        overflow: hidden !important;
        page-break-inside: avoid !important;
      }
      #tabe-pdf-export-content details summary,
      #tabe-pdf-export-content details.notion-details summary,
      #tabe-pdf-export-content .notion-details-summary {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 10px 14px !important;
        background: #f8fafc !important;
        font-weight: 600 !important;
        color: #0f172a !important;
        cursor: default !important;
        list-style: none !important;
        border-bottom: 1px solid #e2e8f0 !important;
      }
      #tabe-pdf-export-content details summary::-webkit-details-marker,
      #tabe-pdf-export-content .notion-details-summary::-webkit-details-marker {
        display: none !important;
      }
      #tabe-pdf-export-content details summary::before,
      #tabe-pdf-export-content .notion-details-summary::before {
        content: "▼" !important;
        display: inline-block !important;
        font-size: 10px !important;
        color: #64748b !important;
        transform: none !important;
      }
      #tabe-pdf-export-content details .notion-details-content,
      #tabe-pdf-export-content details > div {
        display: block !important;
        visibility: visible !important;
        padding: 14px 18px !important;
        background: #ffffff !important;
      }

      /* === CALLOUTS === */
      #tabe-pdf-export-content .notion-callout {
        display: flex !important;
        gap: 12px !important;
        padding: 14px 16px !important;
        border-radius: 8px !important;
        margin: 14px 0 !important;
        border-left: 4px solid #3b82f6 !important;
        background: #eff6ff !important;
        color: #1e3a8a !important;
        page-break-inside: avoid !important;
      }
      #tabe-pdf-export-content .notion-callout-info { background: #eff6ff !important; border-left-color: #3b82f6 !important; color: #1e3a8a !important; }
      #tabe-pdf-export-content .notion-callout-success { background: #f0fdf4 !important; border-left-color: #22c55e !important; color: #14532d !important; }
      #tabe-pdf-export-content .notion-callout-warning { background: #fefce8 !important; border-left-color: #eab308 !important; color: #713f12 !important; }
      #tabe-pdf-export-content .notion-callout-danger { background: #fef2f2 !important; border-left-color: #ef4444 !important; color: #7f1d1d !important; }
      #tabe-pdf-export-content .notion-callout-tip { background: #faf5ff !important; border-left-color: #a855f7 !important; color: #581c87 !important; }

      /* === LISTA DE TAREAS === */
      #tabe-pdf-export-content ul[data-type="taskList"],
      #tabe-pdf-export-content .notion-task-list {
        list-style: none !important;
        padding-left: 0 !important;
        margin: 10px 0 !important;
      }
      #tabe-pdf-export-content ul[data-type="taskList"] li,
      #tabe-pdf-export-content .notion-task-list li {
        display: flex !important;
        align-items: flex-start !important;
        gap: 10px !important;
        margin: 6px 0 !important;
      }
      #tabe-pdf-export-content ul[data-type="taskList"] input[type="checkbox"],
      #tabe-pdf-export-content .notion-task-list input[type="checkbox"] {
        margin-top: 4px !important;
        width: 16px !important;
        height: 16px !important;
        accent-color: #3b82f6 !important;
        pointer-events: none !important;
      }

      /* === FORMULAS KATEX === */
      #tabe-pdf-export-content .katex {
        font-size: 1.05em !important;
        color: #0f172a !important;
      }
    `;
    exportWrapper.appendChild(styleEl);

    // Encabezado del documento (Cover + Emoji + Título + Meta)
    const headerContainer = document.createElement("div");
    headerContainer.style.marginBottom = "32px";
    headerContainer.style.borderBottom = "1px solid #e2e8f0";
    headerContainer.style.paddingBottom = "20px";

    if (coverUrl) {
      const coverDiv = document.createElement("div");
      coverDiv.style.width = "100%";
      coverDiv.style.height = "180px";
      coverDiv.style.borderRadius = "8px";
      coverDiv.style.overflow = "hidden";
      coverDiv.style.marginBottom = "24px";
      const coverImg = document.createElement("img");
      coverImg.src = coverUrl;
      coverImg.crossOrigin = "anonymous";
      coverImg.style.width = "100%";
      coverImg.style.height = "100%";
      coverImg.style.objectFit = "cover";
      coverDiv.appendChild(coverImg);
      headerContainer.appendChild(coverDiv);
    }

    const titleRow = document.createElement("div");
    titleRow.style.display = "flex";
    titleRow.style.flexDirection = "column";
    titleRow.style.gap = "8px";

    if (documentEmoji) {
      const emojiSpan = document.createElement("span");
      emojiSpan.style.fontSize = "44px";
      emojiSpan.style.lineHeight = "1";
      emojiSpan.textContent = documentEmoji;
      titleRow.appendChild(emojiSpan);
    }

    const titleH1 = document.createElement("h1");
    titleH1.style.fontSize = "32px";
    titleH1.style.fontWeight = "800";
    titleH1.style.color = "#0f172a";
    titleH1.style.margin = "8px 0 4px 0";
    titleH1.style.lineHeight = "1.25";
    titleH1.style.letterSpacing = "-0.02em";
    titleH1.textContent = documentTitle || "Sin título";
    titleRow.appendChild(titleH1);

    const metaP = document.createElement("p");
    metaP.style.color = "#64748b";
    metaP.style.fontSize = "13px";
    metaP.style.margin = "0";
    metaP.textContent = `Exportado el ${new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })} • TABE Apuntes`;
    titleRow.appendChild(metaP);

    headerContainer.appendChild(titleRow);
    exportWrapper.appendChild(headerContainer);

    // Contenido del apunte
    if (liveEditor) {
      // Clonar el DOM del editor con máxima fidelidad
      const cloned = liveEditor.cloneNode(true) as HTMLElement;
      cloned.classList.remove("dark:prose-invert");
      cloned.style.outline = "none";
      cloned.style.color = "#1f2937";
      cloned.style.background = "#ffffff";

      // 1. FORZAR TODOS LOS DESPLEGABLES ABIERTOS
      const allDetails = cloned.querySelectorAll<HTMLDetailsElement>("details");
      allDetails.forEach((det) => {
        det.setAttribute("open", "");
        det.open = true;
        const content = det.querySelector<HTMLElement>(".notion-details-content") || det.querySelector<HTMLElement>("div");
        if (content) {
          content.style.display = "block";
          content.style.visibility = "visible";
        }
      });

      // 2. Preservar estado de checkboxes en listas de tareas
      const liveBoxes = liveEditor.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
      const cloneBoxes = cloned.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
      liveBoxes.forEach((lb, i) => {
        if (cloneBoxes[i]) {
          cloneBoxes[i].checked = lb.checked;
          if (lb.checked) cloneBoxes[i].setAttribute("checked", "checked");
          else cloneBoxes[i].removeAttribute("checked");
        }
      });

      // 3. Remover elementos de edición, drag handles y menús
      cloned.querySelectorAll(".drag-handle, .notion-drag-handle, [data-drag-handle], .notion-bubble-menu, .table-resizer, .image-resizer").forEach((el) => el.remove());

      // 4. Limpiar placeholders interactivos
      cloned.querySelectorAll("[data-placeholder]").forEach((el) => el.removeAttribute("data-placeholder"));

      // 5. Soporte CORS para imágenes
      cloned.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
        img.crossOrigin = "anonymous";
      });

      exportWrapper.appendChild(cloned);
    } else {
      // Fallback a HTML generado desde el JSON
      const fallbackDiv = document.createElement("div");
      fallbackDiv.innerHTML = convertToHtml(content);
      exportWrapper.appendChild(fallbackDiv);
    }

    return exportWrapper;
  };

  const uploadFile = async (blob: Blob, fileName: string, upsert: boolean) => {
    try {
      const storagePath = `${userId}/${fileName}.pdf`;

      if (upsert) {
        const { error: removeError } = await supabase.storage
          .from("library-files")
          .remove([storagePath]);

        if (removeError) console.warn("Remove failed (might not exist):", removeError);
      }

      const { error: uploadError } = await supabase.storage
        .from("library-files")
        .upload(storagePath, blob, {
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
            tamaño_bytes: blob.size,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "storage_path" }
        );

      if (dbError) throw dbError;

      toast.success(upsert ? "Archivo actualizado exitosamente" : "Copia guardada exitosamente");
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
      // Dynamic import de html2pdf.js
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default;

      // Crear contenedor de captura temporal
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.top = "0";
      container.style.left = "0";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.zIndex = "99999";
      container.style.background = "rgba(15, 23, 42, 0.75)";
      container.style.backdropFilter = "blur(4px)";
      container.style.overflow = "auto";
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.alignItems = "center";
      container.style.justifyContent = "flex-start";
      container.style.padding = "40px 0";

      // Overlay visual de progreso
      const loadingOverlay = document.createElement("div");
      loadingOverlay.innerHTML = `
        <div style="margin-bottom: 24px; padding: 12px 24px; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 12px;">
          <div style="width: 20px; height: 20px; border: 3px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <span style="font-size: 15px; font-weight: 600; color: #1e293b;">Preparando tu apunte en PDF...</span>
        </div>
        <style>
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      `;

      const contentNode = buildExportElement(content);

      container.appendChild(loadingOverlay);
      container.appendChild(contentNode);
      document.body.appendChild(container);

      // Esperar a que las imágenes se carguen si existen
      const imgs = Array.from(contentNode.querySelectorAll("img"));
      if (imgs.length > 0) {
        await Promise.all(
          imgs.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.onload = () => resolve(true);
              img.onerror = () => resolve(true);
              setTimeout(resolve, 2000);
            });
          })
        );
      }

      // Pequeña pausa para asegurar el cálculo completo de layout y fuentes
      await new Promise((resolve) => setTimeout(resolve, 800));

      const cleanTitle = (documentTitle || "apunte").replace(/[^a-zA-Z0-9\s-_]/g, "").trim() || "apunte";
      const fileName = cleanTitle;

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${fileName}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        },
        jsPDF: {
          unit: "mm" as const,
          format: "a4" as const,
          orientation: "portrait" as const,
        },
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"],
          avoid: ["table", "pre", "blockquote", ".notion-callout", "details", "figure", "img", ".katex"],
        },
      };

      if (saveToLibrary && subjectId) {
        const worker = html2pdf().set(opt).from(contentNode);
        const pdfBlob = await worker.output("blob", "blob");

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
        await html2pdf().set(opt).from(contentNode).save();
        toast.success("PDF descargado tal cual tu apunte");
        setExporting(false);
      }

      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Error al exportar el PDF: " + ((error as any)?.message || "Desconocido"));
      setExporting(false);

      const container = document.getElementById("tabe-pdf-export-content")?.parentElement;
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
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

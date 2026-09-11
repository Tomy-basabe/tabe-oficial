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
   * Genera el HTML completo, limpio y autónomo para el PDF
   * preservando estilos, colores, tablas, listas y abriendo forzosamente todos los desplegables.
   */
  const convertToHtml = (data: JSONContent): string => {
    if (!data || !data.content) return "";

    const processContent = (content: JSONContent[]): string => {
      let result = "";

      content.forEach((node) => {
        const alignStyle = node.attrs?.textAlign ? `text-align: ${node.attrs.textAlign};` : "";

        switch (node.type) {
          case "paragraph":
            result += `<p style="line-height: 1.7; margin: 0 0 12px 0; font-size: 15px; color: #0f172a; ${alignStyle}">${renderInlineContent(node.content)}</p>`;
            break;

          case "heading": {
            const level = node.attrs?.level || 2;
            const headerSizes: Record<number, string> = {
              1: "font-size: 26px; font-weight: 700; margin: 26px 0 12px; color: #0f172a; line-height: 1.3;",
              2: "font-size: 21px; font-weight: 600; margin: 22px 0 10px; color: #0f172a; line-height: 1.3;",
              3: "font-size: 17px; font-weight: 600; margin: 18px 0 8px; color: #0f172a; line-height: 1.3;",
            };
            result += `<h${level} style="${headerSizes[level] || ""} ${alignStyle}">${renderInlineContent(node.content)}</h${level}>`;
            break;
          }

          case "bulletList":
            result += `<ul style="list-style-type: disc; padding-left: 24px; margin: 0 0 14px 0;">`;
            (node.content || []).forEach((item) => {
              result += `<li style="margin-bottom: 6px; line-height: 1.6; color: #0f172a;">${processContent(item.content || [])}</li>`;
            });
            result += `</ul>`;
            break;

          case "orderedList":
            result += `<ol style="list-style-type: decimal; padding-left: 24px; margin: 0 0 14px 0;">`;
            (node.content || []).forEach((item) => {
              result += `<li style="margin-bottom: 6px; line-height: 1.6; color: #0f172a;">${processContent(item.content || [])}</li>`;
            });
            result += `</ol>`;
            break;

          case "taskList":
            result += `<div style="margin: 0 0 14px 0;">`;
            (node.content || []).forEach((item) => {
              const checked = item.attrs?.checked;
              const checkbox = checked ? "☑" : "☐";
              const textStyle = checked ? "text-decoration: line-through; color: #94a3b8;" : "color: #0f172a;";
              result += `<div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 6px;">
                <span style="font-size: 16px; line-height: 1.5; color: #3b82f6; font-weight: bold;">${checkbox}</span>
                <div style="${textStyle} flex: 1;">${processContent(item.content || [])}</div>
              </div>`;
            });
            result += `</div>`;
            break;

          case "blockquote":
            result += `<blockquote style="border-left: 4px solid #3b82f6; padding: 10px 16px; margin: 16px 0; font-style: italic; background: #f8fafc; color: #334155; border-radius: 0 6px 6px 0;">`;
            result += processContent(node.content || []);
            result += `</blockquote>`;
            break;

          case "codeBlock":
            result += `<pre style="background: #0f172a; color: #f1f5f9; padding: 14px 18px; border-radius: 8px; overflow-x: auto; font-family: 'Fira Code', Consolas, Monaco, monospace; font-size: 13px; line-height: 1.5; margin: 16px 0;"><code style="color: #f1f5f9; background: transparent;">${node.content?.[0]?.text || ""}</code></pre>`;
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
              <span style="font-size: 18px; flex-shrink: 0; line-height: 1;">${colors.icon}</span>
              <div style="flex: 1; color: ${colors.text};">${processContent(node.content || [])}</div>
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
                  : "padding: 8px 12px; border: 1px solid #cbd5e1; color: #0f172a;";
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

          // DESPLEGABLES / TOGGLES: SIEMPRE ABIERTOS EN EL PDF CON INDICADOR
          case "details":
            result += `<details open style="display: block; margin: 14px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #ffffff;">`;
            (node.content || []).forEach((child) => {
              if (child.type === "detailsSummary") {
                result += `<summary style="padding: 10px 14px; background: #f8fafc; font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 8px; list-style: none; border-bottom: 1px solid #e2e8f0;">
                  <span style="font-size: 11px; color: #3b82f6;">▼</span>
                  <span style="color: #0f172a;">${renderInlineContent(child.content)}</span>
                </summary>`;
              } else if (child.type === "detailsContent") {
                result += `<div style="display: block; padding: 14px 18px; background: #ffffff; color: #0f172a;">${processContent(child.content || [])}</div>`;
              }
            });
            result += `</details>`;
            break;

          case "math":
            result += `<div style="margin: 14px 0; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-family: monospace; text-align: center; color: #0f172a; font-size: 15px;">${node.attrs?.formula || ""}</div>`;
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
                  text = `<mark style="background-color: ${hlColor}; color: #0f172a; padding: 1px 4px; border-radius: 3px; font-weight: 500;">${text}</mark>`;
                  break;
                }
                case "textStyle": {
                  let inlineStyles = "";
                  if (mark.attrs?.color) {
                    inlineStyles += `color: ${mark.attrs.color}; `;
                  }
                  if (mark.attrs?.backgroundColor && mark.attrs.backgroundColor !== "transparent") {
                    inlineStyles += `background-color: ${mark.attrs.backgroundColor}; color: #0f172a; padding: 1px 4px; border-radius: 3px; `;
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

    const bodyHtml = processContent(data.content);

    return `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 800px; max-width: 800px; margin: 0 auto; padding: 40px 48px; color: #0f172a; background: #ffffff; box-sizing: border-box;">
        ${coverUrl ? `
          <div style="width: 100%; height: 180px; overflow: hidden; border-radius: 8px; margin-bottom: 24px;">
            <img src="${coverUrl}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />
          </div>
        ` : ""}

        <div style="margin-bottom: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px;">
          ${documentEmoji ? `<div style="font-size: 44px; line-height: 1; margin-bottom: 8px;">${documentEmoji}</div>` : ""}
          <h1 style="font-size: 30px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; line-height: 1.25; letter-spacing: -0.02em;">${documentTitle || "Sin título"}</h1>
          <p style="color: #64748b; font-size: 13px; margin: 0;">Exportado el ${new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })} • TABE Apuntes</p>
        </div>

        <div>
          ${bodyHtml}
        </div>
      </div>
    `;
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
      // Dynamic import de html2pdf.js
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default;

      // Generar el HTML completo y autónomo
      const htmlContent = convertToHtml(content);

      // Crear contenedor temporal fuera de pantalla
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
      container.style.padding = "40px 0";

      // Overlay visual de progreso
      const loadingOverlay = document.createElement("div");
      loadingOverlay.innerHTML = `
        <div style="margin: 0 auto 24px auto; width: fit-content; padding: 14px 28px; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 12px;">
          <div style="width: 22px; height: 22px; border: 3px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: tabe-pdf-spin 1s linear infinite;"></div>
          <span style="font-size: 15px; font-weight: 600; color: #0f172a;">Generando tu apunte en PDF...</span>
        </div>
        <style>
          @keyframes tabe-pdf-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      `;

      // Contenedor blanco donde se monta el documento
      const contentDiv = document.createElement("div");
      contentDiv.innerHTML = htmlContent;
      contentDiv.style.width = "800px";
      contentDiv.style.margin = "0 auto";
      contentDiv.style.background = "#ffffff";
      contentDiv.style.color = "#0f172a";
      contentDiv.style.boxShadow = "0 20px 40px rgba(0,0,0,0.15)";
      contentDiv.style.borderRadius = "8px";
      contentDiv.id = "tabe-pdf-content-export";

      container.appendChild(loadingOverlay);
      container.appendChild(contentDiv);
      document.body.appendChild(container);

      // Esperar a que las imágenes se carguen si existen
      const imgs = Array.from(contentDiv.querySelectorAll("img"));
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

      // Pausa para renderizado completo
      await new Promise((resolve) => setTimeout(resolve, 800));

      const cleanTitle = (documentTitle || "apunte").replace(/[^a-zA-Z0-9\s-_]/g, "").trim() || "apunte";
      const fileName = cleanTitle;

      // Opciones limpias y estándar sin plugins destructivos como avoid-all
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
      };

      const worker = html2pdf().set(opt).from(contentDiv);

      if (saveToLibrary && subjectId) {
        const pdfBlob: Blob = await worker.outputPdf("blob");

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
        await worker.save();
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

      const container = document.getElementById("tabe-pdf-content-export")?.parentElement;
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

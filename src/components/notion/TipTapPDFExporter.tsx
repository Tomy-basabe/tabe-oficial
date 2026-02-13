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
  getContent: () => JSONContent | null;
  subjectId: string | null;
  userId: string;
  onExported?: () => void;
}

export function TipTapPDFExporter({
  documentTitle,
  documentEmoji,
  getContent,
  subjectId,
  userId,
  onExported
}: TipTapPDFExporterProps) {
  const [exporting, setExporting] = useState(false);
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ blob: Blob; fileName: string } | null>(null);

  const convertToHtml = (data: JSONContent): string => {
    if (!data || !data.content) return "";

    let html = `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a;">
        <div style="text-align: center; margin-bottom: 40px;">
          <span style="font-size: 48px;">${documentEmoji}</span>
          <h1 style="font-size: 28px; font-weight: 700; margin-top: 16px; color: #0f0f0f;">${documentTitle || "Sin título"}</h1>
          <p style="color: #666; font-size: 14px; margin-top: 8px;">Exportado el ${new Date().toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    })}</p>
        </div>
    `;

    const processContent = (content: JSONContent[]): string => {
      let result = "";

      content.forEach((node) => {
        switch (node.type) {
          case "paragraph":
            result += `<p style="line-height: 1.8; margin-bottom: 16px; font-size: 16px;">${renderInlineContent(node.content)}</p>`;
            break;

          case "heading":
            const level = node.attrs?.level || 2;
            const headerSizes: Record<number, string> = {
              1: "font-size: 32px; font-weight: 700; margin: 32px 0 16px;",
              2: "font-size: 24px; font-weight: 600; margin: 28px 0 14px;",
              3: "font-size: 20px; font-weight: 600; margin: 24px 0 12px;",
            };
            result += `<h${level} style="${headerSizes[level]}">${renderInlineContent(node.content)}</h${level}>`;
            break;

          case "bulletList":
            result += `<ul style="list-style: disc; padding-left: 24px; margin-bottom: 16px;">`;
            (node.content || []).forEach((item) => {
              result += `<li style="margin-bottom: 8px; line-height: 1.6;">${renderInlineContent(item.content?.[0]?.content)}</li>`;
            });
            result += `</ul>`;
            break;

          case "orderedList":
            result += `<ol style="list-style: decimal; padding-left: 24px; margin-bottom: 16px;">`;
            (node.content || []).forEach((item) => {
              result += `<li style="margin-bottom: 8px; line-height: 1.6;">${renderInlineContent(item.content?.[0]?.content)}</li>`;
            });
            result += `</ol>`;
            break;

          case "taskList":
            result += `<div style="margin-bottom: 16px;">`;
            (node.content || []).forEach((item) => {
              const checked = item.attrs?.checked;
              const checkbox = checked ? "☑" : "☐";
              const textStyle = checked ? "text-decoration: line-through; color: #888;" : "";
              result += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 16px;">${checkbox}</span>
                <span style="${textStyle}">${renderInlineContent(item.content?.[0]?.content)}</span>
              </div>`;
            });
            result += `</div>`;
            break;

          case "blockquote":
            result += `<blockquote style="border-left: 4px solid #00d9ff; padding-left: 16px; margin: 24px 0; font-style: italic; color: #555;">`;
            (node.content || []).forEach((p) => {
              result += `<p style="margin-bottom: 8px;">${renderInlineContent(p.content)}</p>`;
            });
            result += `</blockquote>`;
            break;

          case "codeBlock":
            result += `<pre style="background: #1a1a2e; color: #e0e0e0; padding: 16px; border-radius: 8px; overflow-x: auto; font-family: 'Fira Code', monospace; font-size: 14px; margin-bottom: 16px;"><code>${node.content?.[0]?.text || ""}</code></pre>`;
            break;

          case "horizontalRule":
            result += `<hr style="border: none; border-top: 2px solid #eee; margin: 32px 0;" />`;
            break;

          case "callout":
            const calloutType = node.attrs?.type || "info";
            const calloutColors: Record<string, { bg: string; border: string; icon: string }> = {
              info: { bg: "#e3f2fd", border: "#2196f3", icon: "ℹ️" },
              success: { bg: "#e8f5e9", border: "#4caf50", icon: "✅" },
              warning: { bg: "#fff3cd", border: "#ffc107", icon: "⚠️" },
              danger: { bg: "#ffebee", border: "#f44336", icon: "🚫" },
              tip: { bg: "#f3e5f5", border: "#9c27b0", icon: "💡" },
            };
            const colors = calloutColors[calloutType] || calloutColors.info;
            result += `<div style="display: flex; gap: 12px; background: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <span style="font-size: 20px;">${colors.icon}</span>
              <div>${processContent(node.content || [])}</div>
            </div>`;
            break;

          case "table":
            result += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">`;
            (node.content || []).forEach((row, rowIndex) => {
              result += `<tr>`;
              (row.content || []).forEach((cell) => {
                const isHeader = cell.type === "tableHeader";
                const cellStyle = isHeader
                  ? "background: #f5f5f5; font-weight: 600; padding: 12px; border: 1px solid #ddd;"
                  : "padding: 12px; border: 1px solid #ddd;";
                result += `<td style="${cellStyle}">${renderInlineContent(cell.content?.[0]?.content)}</td>`;
              });
              result += `</tr>`;
            });
            result += `</table>`;
            break;

          case "image":
            result += `<figure style="margin: 24px 0; text-align: center;">
              <img src="${node.attrs?.src || ""}" alt="${node.attrs?.alt || ""}" style="max-width: 100%; border-radius: 8px;" />
              ${node.attrs?.alt ? `<figcaption style="color: #888; font-size: 14px; margin-top: 8px;">${node.attrs.alt}</figcaption>` : ""}
            </figure>`;
            break;

          case "details":
            result += `<details style="margin: 16px 0; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">`;
            (node.content || []).forEach((child) => {
              if (child.type === "detailsSummary") {
                result += `<summary style="padding: 12px 16px; background: #f5f5f5; cursor: pointer; font-weight: 500;">${renderInlineContent(child.content)}</summary>`;
              } else if (child.type === "detailsContent") {
                result += `<div style="padding: 16px;">${processContent(child.content || [])}</div>`;
              }
            });
            result += `</details>`;
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
                case "code":
                  text = `<code style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${text}</code>`;
                  break;
                case "highlight":
                  text = `<mark style="background: #ffeb3b;">${text}</mark>`;
                  break;
                case "link":
                  text = `<a href="${mark.attrs?.href || ""}" style="color: #2196f3; text-decoration: underline;">${text}</a>`;
                  break;
              }
            });

            return text;
          }
          return "";
        })
        .join("");
    };

    html += processContent(data.content);
    html += `</div>`;
    return html;
  };

  const uploadFile = async (blob: Blob, fileName: string, upsert: boolean) => {
    try {
      console.log("Uploading file...", { fileName, upsert });
      const storagePath = `${userId}/${fileName}.pdf`;

      // V3: Explicitly delete if overwriting to force refresh and avoid cache/upsert issues
      if (upsert) {
        console.log("Deleting existing file:", storagePath);
        const { error: removeError } = await supabase.storage
          .from("library-files")
          .remove([storagePath]);

        if (removeError) console.warn("Remove failed (might not exist):", removeError);
      }

      const { error: uploadError } = await supabase.storage
        .from("library-files")
        .upload(storagePath, blob, {
          contentType: "application/pdf",
          upsert: true, // Always true if we want to ensure write
          cacheControl: '0' // Prevent caching
        });

      if (uploadError) {
        console.error("Upload error details:", uploadError);
        throw uploadError;
      }

      // Get signed URL for private bucket (1 hour expiry)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("library-files")
        .createSignedUrl(storagePath, 3600);

      if (signedUrlError) throw signedUrlError;

      // Upsert into database record as well
      const { error: dbError } = await supabase
        .from("library_files")
        .upsert({
          user_id: userId,
          subject_id: subjectId,
          nombre: `${fileName}.pdf`,
          tipo: "pdf",
          url: signedUrlData.signedUrl,
          storage_path: storagePath,
          tamaño_bytes: blob.size,
          updated_at: new Date().toISOString()
        }, { onConflict: 'storage_path' });

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
    console.log("Starting PDF export...");
    const content = getContent();
    if (!content || !content.content || content.content.length === 0) {
      toast.error("El documento está vacío");
      return;
    }

    setExporting(true);

    try {
      // Dynamic import
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default;
      console.log("html2pdf loaded");

      const htmlContent = convertToHtml(content);

      // Create main container (Full screen visible overlay)
      const container = document.createElement("div");

      // VISIBLE OVERLAY STRATEGY (V3)
      container.style.position = "fixed";
      container.style.top = "0";
      container.style.left = "0";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.zIndex = "9999";
      container.style.background = "white";
      container.style.overflow = "auto";

      // Create loading overlay
      const loadingOverlay = document.createElement("div");
      loadingOverlay.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.9); z-index: 10000; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #333;">Generando PDF...</h2>
          <p style="color: #666;">Por favor espere un momento.</p>
        </div>
      `;

      // Create content wrapper
      const contentDiv = document.createElement("div");
      contentDiv.innerHTML = htmlContent;
      contentDiv.style.width = "800px";
      contentDiv.style.margin = "0 auto";
      contentDiv.style.background = "white";
      contentDiv.id = "pdf-content-export";

      container.appendChild(loadingOverlay);
      container.appendChild(contentDiv);
      document.body.appendChild(container);
      console.log("Container mounted");

      // Wait a moment for rendering (fonts, images)
      await new Promise(resolve => setTimeout(resolve, 1500));

      const cleanTitle = (documentTitle || "apunte").replace(/[^a-zA-Z0-9\s-_]/g, "").trim();
      const fileName = cleanTitle;

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${fileName}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: true // Enable logging for debug
        },
        jsPDF: {
          unit: "mm" as const,
          format: "a4" as const,
          orientation: "portrait" as const
        }
      };

      if (saveToLibrary && subjectId) {
        console.log("Generating Blob...");
        // Use .output('blob') instead of .outputPdf('blob') for safety
        const worker = html2pdf().set(opt).from(contentDiv);
        const pdfBlob = await worker.output('blob', 'blob'); // Specify type 'blob'

        console.log("Blob generated", pdfBlob.size);

        // Check if file exists
        const { data: existingFiles } = await supabase.storage
          .from("library-files")
          .list(userId, {
            limit: 100,
            search: `${fileName}.pdf`
          });

        const exists = existingFiles?.some(f => f.name === `${fileName}.pdf`);

        if (exists) {
          console.log("File exists, prompting overwrite");
          setPendingFile({ blob: pdfBlob, fileName });
          setShowOverwriteDialog(true);
          setExporting(false);
        } else {
          // Upload directly
          await uploadFile(pdfBlob, fileName, false);
        }

      } else {
        console.log("Saving locally...");
        await html2pdf().set(opt).from(contentDiv).save();
        toast.success("PDF descargado");
        setExporting(false);
      }

      document.body.removeChild(container);

    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Error al exportar el PDF: " + (error as any)?.message || "Desconocido");
      setExporting(false);
      // Ensure we clean up if we crash
      const container = document.getElementById("pdf-content-export")?.parentElement;
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
    </div >
  );
}

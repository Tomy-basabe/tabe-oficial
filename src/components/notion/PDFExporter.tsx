import { useState } from "react";
import { Download, Loader2, Library } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OutputData } from "@editorjs/editorjs";

interface PDFExporterProps {
  documentTitle: string;
  documentEmoji: string;
  getContent: () => OutputData | null;
  subjectId: string | null;
  userId: string;
  onExported?: () => void;
}

export function PDFExporter({ 
  documentTitle, 
  documentEmoji,
  getContent, 
  subjectId, 
  userId,
  onExported 
}: PDFExporterProps) {
  const [exporting, setExporting] = useState(false);
  const [saveToLibrary, setSaveToLibrary] = useState(true);

  const convertToHtml = (data: OutputData): string => {
    if (!data || !data.blocks) return "";

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

    data.blocks.forEach((block) => {
      switch (block.type) {
        case "paragraph":
          html += `<p style="line-height: 1.8; margin-bottom: 16px; font-size: 16px;">${block.data.text}</p>`;
          break;

        case "header":
          const headerSizes: Record<number, string> = {
            1: "font-size: 32px; font-weight: 700; margin: 32px 0 16px;",
            2: "font-size: 24px; font-weight: 600; margin: 28px 0 14px;",
            3: "font-size: 20px; font-weight: 600; margin: 24px 0 12px;",
            4: "font-size: 18px; font-weight: 500; margin: 20px 0 10px;"
          };
          html += `<h${block.data.level} style="${headerSizes[block.data.level]}">${block.data.text}</h${block.data.level}>`;
          break;

        case "list":
          const listTag = block.data.style === "ordered" ? "ol" : "ul";
          const listStyle = block.data.style === "ordered" 
            ? "list-style: decimal; padding-left: 24px; margin-bottom: 16px;"
            : "list-style: disc; padding-left: 24px; margin-bottom: 16px;";
          html += `<${listTag} style="${listStyle}">`;
          block.data.items.forEach((item: string) => {
            html += `<li style="margin-bottom: 8px; line-height: 1.6;">${item}</li>`;
          });
          html += `</${listTag}>`;
          break;

        case "checklist":
          html += `<div style="margin-bottom: 16px;">`;
          block.data.items.forEach((item: { text: string; checked: boolean }) => {
            const checkbox = item.checked 
              ? "☑" 
              : "☐";
            const textStyle = item.checked 
              ? "text-decoration: line-through; color: #888;" 
              : "";
            html += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 16px;">${checkbox}</span>
              <span style="${textStyle}">${item.text}</span>
            </div>`;
          });
          html += `</div>`;
          break;

        case "quote":
          html += `<blockquote style="border-left: 4px solid #00d9ff; padding-left: 16px; margin: 24px 0; font-style: italic; color: #555;">
            <p style="margin-bottom: 8px;">${block.data.text}</p>
            ${block.data.caption ? `<cite style="font-size: 14px; color: #888;">— ${block.data.caption}</cite>` : ""}
          </blockquote>`;
          break;

        case "code":
          html += `<pre style="background: #1a1a2e; color: #e0e0e0; padding: 16px; border-radius: 8px; overflow-x: auto; font-family: 'Fira Code', monospace; font-size: 14px; margin-bottom: 16px;"><code>${block.data.code}</code></pre>`;
          break;

        case "delimiter":
          html += `<hr style="border: none; border-top: 2px solid #eee; margin: 32px 0;" />`;
          break;

        case "warning":
          html += `<div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <strong style="display: block; margin-bottom: 8px; color: #856404;">${block.data.title}</strong>
            <p style="color: #856404; margin: 0;">${block.data.message}</p>
          </div>`;
          break;

        case "table":
          html += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">`;
          block.data.content.forEach((row: string[], rowIndex: number) => {
            html += `<tr>`;
            row.forEach((cell: string) => {
              const cellStyle = rowIndex === 0 && block.data.withHeadings
                ? "background: #f5f5f5; font-weight: 600; padding: 12px; border: 1px solid #ddd;"
                : "padding: 12px; border: 1px solid #ddd;";
              html += `<td style="${cellStyle}">${cell}</td>`;
            });
            html += `</tr>`;
          });
          html += `</table>`;
          break;

        case "image":
          html += `<figure style="margin: 24px 0; text-align: center;">
            <img src="${block.data.file.url}" alt="${block.data.caption || ""}" style="max-width: 100%; border-radius: 8px;" />
            ${block.data.caption ? `<figcaption style="color: #888; font-size: 14px; margin-top: 8px;">${block.data.caption}</figcaption>` : ""}
          </figure>`;
          break;

        default:
          if (block.data.text) {
            html += `<p style="line-height: 1.8; margin-bottom: 16px;">${block.data.text}</p>`;
          }
      }
    });

    html += `</div>`;
    return html;
  };

  const exportToPDF = async () => {
    const content = getContent();
    if (!content || !content.blocks || content.blocks.length === 0) {
      toast.error("El documento está vacío");
      return;
    }

    setExporting(true);

    try {
      // Dynamically import html2pdf
      const html2pdf = (await import("html2pdf.js")).default;

      const htmlContent = convertToHtml(content);
      
      // Create a temporary container
      const container = document.createElement("div");
      container.innerHTML = htmlContent;
      container.style.position = "absolute";
      container.style.left = "-9999px";
      document.body.appendChild(container);

      const fileName = `${documentTitle || "apunte"}-${Date.now()}`;

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${fileName}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false
        },
        jsPDF: { 
          unit: "mm" as const, 
          format: "a4" as const, 
          orientation: "portrait" as const
        }
      };

      if (saveToLibrary && subjectId) {
        // Generate PDF as blob
        const pdfBlob = await html2pdf().set(opt).from(container).outputPdf("blob");
        
        // Upload to Supabase Storage
        const storagePath = `${userId}/${fileName}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("library-files")
          .upload(storagePath, pdfBlob, {
            contentType: "application/pdf",
            upsert: true
          });

        if (uploadError) throw uploadError;

        // Get signed URL for private bucket (1 hour expiry)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from("library-files")
          .createSignedUrl(storagePath, 3600);

        if (signedUrlError) throw signedUrlError;

        // Create library file record - store signed URL (will be regenerated on access)
        const { error: dbError } = await supabase
          .from("library_files")
          .insert({
            user_id: userId,
            subject_id: subjectId,
            nombre: `${documentTitle || "Apunte"}.pdf`,
            tipo: "pdf",
            url: signedUrlData.signedUrl,
            storage_path: storagePath,
            tamaño_bytes: pdfBlob.size
          });

        if (dbError) throw dbError;

        toast.success("PDF guardado en la Biblioteca");
      } else {
        // Just download the PDF
        await html2pdf().set(opt).from(container).save();
        toast.success("PDF descargado");
      }

      // Cleanup
      document.body.removeChild(container);
      onExported?.();

    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Error al exportar el PDF");
    } finally {
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
    </div>
  );
}

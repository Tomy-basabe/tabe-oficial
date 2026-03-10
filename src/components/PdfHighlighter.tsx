import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import { Button } from './ui/button';
import { Download, Highlighter, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Configurar el worker de pdf.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PdfPageProps {
  pdfDoc: any;
  pageNumber: number;
  scale: number;
  highlights: any[];
}

const PdfPage: React.FC<PdfPageProps> = ({ pdfDoc, pageNumber, scale, highlights }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<any>(null);

  useEffect(() => {
    let renderTask: any;
    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const vp = page.getViewport({ scale });
        setViewport(vp);

        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          canvas.height = vp.height;
          canvas.width = vp.width;

          renderTask = page.render({ canvasContext: context!, viewport: vp });
          await renderTask.promise;

          // Render text layer
          if (textLayerRef.current) {
            textLayerRef.current.innerHTML = '';
            const textContent = await page.getTextContent();
            await (pdfjs as any).renderTextLayer({
              textContent,
              container: textLayerRef.current,
              viewport: vp,
              enhanceTextSelection: true,
            }).promise;
          }
        }
      } catch (error) {
        if (error.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNumber}:`, error);
        }
      }
    };
    render();
    return () => {
      if (renderTask) renderTask.cancel();
    };
  }, [pdfDoc, pageNumber, scale]);

  const pageHighlights = useMemo(() => 
    highlights.filter(h => h.position_data?.page === pageNumber),
  [highlights, pageNumber]);

  return (
    <div 
      className="relative mb-8 shadow-2xl bg-white mx-auto border border-slate-200"
      style={{ 
        width: viewport ? `${viewport.width}px` : 'auto', 
        height: viewport ? `${viewport.height}px` : '800px' 
      }}
      data-page={pageNumber}
    >
      <canvas ref={canvasRef} className="block" />
      <div 
        ref={textLayerRef} 
        className="textLayer absolute top-0 left-0" 
        style={{ width: viewport?.width, height: viewport?.height }}
      />
      {/* Render highlights overlay */}
      {pageHighlights.map((h) => (
        <div
          key={h.id}
          className="absolute pointer-events-none opacity-40 mix-blend-multiply"
          style={{
            backgroundColor: h.color,
            left: `${h.position_data.rect.left}px`,
            top: `${h.position_data.rect.top}px`,
            width: `${h.position_data.rect.width}px`,
            height: `${h.position_data.rect.height}px`,
          }}
        />
      ))}
    </div>
  );
};

interface PdfHighlighterProps {
  url: string;
  highlights: any[];
  onAddHighlight: (text: string, rects: any[], page: number) => void;
  fileName: string;
}

export const PdfHighlighter: React.FC<PdfHighlighterProps> = ({ url, highlights, onAddHighlight, fileName }) => {
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [scale, setScale] = useState(1.5);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (error) {
        console.error('Error loading PDF:', error);
        toast.error('Error al cargar el PDF');
        setLoading(false);
      }
    };
    loadPdf();
  }, [url]);

  const handleMouseUp = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();
    if (!text) return;

    const rects = Array.from(range.getClientRects());
    
    // Find page container
    let node: any = range.startContainer;
    while (node && !(node instanceof HTMLElement && node.hasAttribute('data-page'))) {
      node = node.parentNode;
    }
    if (!node) return;

    const pageRect = node.getBoundingClientRect();
    const pageNumber = parseInt(node.getAttribute('data-page') || '1');

    const relativeRects = rects.map(r => ({
      left: r.left - pageRect.left,
      top: r.top - pageRect.top,
      width: r.width,
      height: r.height,
    }));

    // If multiple rects (wrapped text), we might want to save them all, 
    // but for now we take the first or combine.
    onAddHighlight(text, relativeRects, pageNumber);
    selection.removeAllRanges();
  };

  const exportPdfWithHighlights = async () => {
    const exportToast = toast.loading('Preparando exportación...');
    try {
      const response = await fetch(url);
      const existingPdfBytes = await response.arrayBuffer();
      const pdfDocLib = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDocLib.getPages();

      // Need to handle coordinate conversion accurately
      // pdf.js uses pixels at 92dpi usually, pdf-lib uses points (1 point = 1/72 inch).
      // Standard PDF resolution is 72 dpi.
      // So if scale is 1.0, 1 pixel = 1 point.
      
      for (const h of highlights) {
        if (h.position_data?.page && h.position_data?.rect) {
          const pageIdx = h.position_data.page - 1;
          if (pageIdx >= pages.length) continue;
          
          const page = pages[pageIdx];
          const { width: pdfWidth, height: pdfHeight } = page.getSize();
          
          // Get the viewport for this page at scale 1.0 to find the original dimensions in pixels
          const pdfJsPage = await pdfDoc.getPage(h.position_data.page);
          const originalViewport = pdfJsPage.getViewport({ scale: 1.0 });
          
          // Scale factor between our current view (at 'scale') and the PDF points
          const currentScale = scale;
          const r = h.position_data.rect;
          
          // Convert view pixels (at currentScale) back to PDF points
          const x = r.left / currentScale;
          const yFromTop = r.top / currentScale;
          const w = r.width / currentScale;
          const h_rect = r.height / currentScale;

          // pdf-lib's origin is bottom-left
          const y = pdfHeight - yFromTop - h_rect;

          // Define color based on hex
          const hex = h.color.replace('#', '');
          const r_col = parseInt(hex.substring(0, 2), 16) / 255;
          const g_col = parseInt(hex.substring(2, 4), 16) / 255;
          const b_col = parseInt(hex.substring(4, 6), 16) / 255;

          page.drawRectangle({
            x,
            y,
            width: w,
            height: h_rect,
            color: rgb(r_col, g_col, b_col),
            opacity: 0.5,
          });
        }
      }

      const pdfBytes = await pdfDocLib.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `TABE_${fileName.replace('.pdf', '')}_resaltado.pdf`;
      link.click();
      toast.success('PDF exportado correctamente', { id: exportToast });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Error al exportar el PDF', { id: exportToast });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-200/80 overflow-hidden">
      {/* Tool panel */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full">
            <Highlighter className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider">Lector Interactivo</span>
          </div>
          <div className="h-4 w-[1px] bg-slate-300" />
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button 
              onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
              className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded transition-all font-bold"
            >−</button>
            <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
            <button 
              onClick={() => setScale(s => Math.min(3, s + 0.25))}
              className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded transition-all font-bold"
            >+</button>
          </div>
        </div>

        <Button 
          variant="outline" 
          onClick={exportPdfWithHighlights}
          className="bg-primary/5 border-primary/20 text-primary hover:bg-primary hover:text-white transition-all gap-2 h-9 px-4 rounded-xl"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-semibold">Guardar Copia Resaltada</span>
        </Button>
      </div>

      {/* Pages container */}
      <div 
        onMouseUp={handleMouseUp}
        className="flex-1 overflow-auto p-4 md:p-12 scroll-smooth"
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-primary/10 rounded-full animate-pulse" />
              </div>
            </div>
            <p className="text-sm font-display font-medium text-slate-600 animate-pulse">
              Interpretando documento original...
            </p>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto flex flex-col items-center">
            {Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
              <PdfPage 
                key={page}
                pdfDoc={pdfDoc}
                pageNumber={page}
                scale={scale}
                highlights={highlights}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {!loading && (
        <div className="bg-slate-900/90 text-white py-1.5 px-4 text-center text-[10px] font-medium tracking-wide backdrop-blur-sm">
          💡 Seleccioná texto con el cursor para guardar un nuevo resaltado
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import { Button } from './ui/button';
import { Download, Highlighter, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Configurar el worker de pdf.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface Highlight {
  id: string;
  page: number;
  rects: { left: number; top: number; width: number; height: number }[];
  text: string;
  color: string;
}

interface PdfHighlighterProps {
  url: string;
  highlights: any[];
  onAddHighlight: (text: string, rects: any[], page: number) => void;
  fileName: string;
}

export const PdfHighlighter: React.FC<PdfHighlighterProps> = ({ url, highlights, onAddHighlight, fileName }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const loadingTask = pdfjs.getDocument(url);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (error) {
        console.error('Error loading PDF:', error);
        toast.error('Error al cargar el PDF');
      }
    };
    loadPdf();
  }, [url]);

  const renderPage = async (pageNumber: number) => {
    if (!pdfDoc || !containerRef.current) return;

    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });

    const pageContainer = document.createElement('div');
    pageContainer.className = 'relative mb-8 shadow-xl bg-white mx-auto';
    pageContainer.style.width = `${viewport.width}px`;
    pageContainer.style.height = `${viewport.height}px`;
    pageContainer.setAttribute('data-page', pageNumber.toString());

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    pageContainer.appendChild(canvas);

    await page.render({ canvasContext: context!, viewport }).promise;

    // Text layer for selection
    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'textLayer absolute top-0 left-0';
    textLayerDiv.style.width = `${viewport.width}px`;
    textLayerDiv.style.height = `${viewport.height}px`;
    pageContainer.appendChild(textLayerDiv);

    const textContent = await page.getTextContent();
    (pdfjs as any).renderTextLayer({
      textContent,
      container: textLayerDiv,
      viewport,
      enhanceTextSelection: true,
    });

    // Render existing highlights
    const pageHighlights = highlights.filter(h => h.position_data?.page === pageNumber);
    pageHighlights.forEach(h => {
      const highlightDiv = document.createElement('div');
      highlightDiv.className = 'absolute pointer-events-none opacity-40';
      highlightDiv.style.backgroundColor = h.color;
      highlightDiv.style.left = `${h.position_data.rect.left}px`;
      highlightDiv.style.top = `${h.position_data.rect.top}px`;
      highlightDiv.style.width = `${h.position_data.rect.width}px`;
      highlightDiv.style.height = `${h.position_data.rect.height}px`;
      pageContainer.appendChild(highlightDiv);
    });

    containerRef.current.appendChild(pageContainer);
  };

  useEffect(() => {
    if (!loading && pdfDoc) {
      if (containerRef.current) containerRef.current.innerHTML = '';
      for (let i = 1; i <= numPages; i++) {
        renderPage(i);
      }
    }
  }, [loading, pdfDoc, highlights]);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const text = selection.toString();
    const rects = Array.from(range.getClientRects());
    
    // Find page container
    let node: any = range.startContainer;
    while (node && !node.classList?.contains('relative')) {
      node = node.parentNode;
    }
    if (!node) return;

    const pageRect = node.getBoundingClientRect();
    const pageNumber = parseInt(node.dataset.page || '1');

    const relativeRects = rects.map(r => ({
      left: r.left - pageRect.left,
      top: r.top - pageRect.top,
      width: r.width,
      height: r.height,
    }));

    onAddHighlight(text, relativeRects, pageNumber);
    selection.removeAllRanges();
  };

  const exportPdfWithHighlights = async () => {
    try {
      const response = await fetch(url);
      const existingPdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();

      highlights.forEach(h => {
        if (h.position_data?.page) {
          const page = pages[h.position_data.page - 1];
          const { height } = page.getSize();
          
          // pdf-lib uses 0,0 for bottom-left, we need to convert
          const r = h.position_data.rect;
          // Note: scale conversion might be needed between canvas and pdf-lib
          // This is a simplified version
          page.drawRectangle({
            x: r.left,
            y: height - r.top - r.height,
            width: r.width,
            height: r.height,
            color: rgb(1, 1, 0), // Default yellow, can be dynamic
            opacity: 0.4,
          });
        }
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `resaltado_${fileName}`;
      link.click();
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Error al exportar el PDF');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100/50">
      <div className="bg-white/80 backdrop-blur-sm border-b p-2 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <Highlighter className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-slate-600">Modo Resaltado</span>
        </div>
        <Button size="sm" variant="outline" onClick={exportPdfWithHighlights} className="h-8 gap-1.5 border-primary/20 hover:border-primary/50 text-primary">
          <Download className="w-3.5 h-3.5" />
          Exportar PDF resaltado
        </Button>
      </div>
      
      <div 
        ref={containerRef} 
        onMouseUp={handleMouseUp}
        className="flex-1 overflow-auto p-4 md:p-8"
      />

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
          <p className="text-sm font-medium text-slate-600">Preparando visor interactivo...</p>
        </div>
      )}
    </div>
  );
};

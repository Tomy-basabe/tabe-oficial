import React from 'react';
import { Editor } from '@tiptap/react';
import { 
  FileText, 
  Clock, 
  Printer, 
  ZoomIn, 
  ZoomOut, 
  Eye, 
  Layout, 
  Maximize2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WordStatusBarProps {
  editor: Editor | null;
  viewMode: 'notion' | 'word-a4' | 'full';
  onViewModeChange: (mode: 'notion' | 'word-a4' | 'full') => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onPrint: () => void;
}

export const WordStatusBar: React.FC<WordStatusBarProps> = ({
  editor,
  viewMode,
  onViewModeChange,
  zoom,
  onZoomChange,
  onPrint,
}) => {
  if (!editor) return null;

  // Real-time calculations
  const text = editor.getText();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const characters = text.length;
  // Estimated reading time (~200 words per min)
  const readingTimeMinutes = Math.ceil(words / 200);

  const handleZoomOut = () => {
    if (zoom > 75) onZoomChange(Math.max(75, zoom - 10));
  };

  const handleZoomIn = () => {
    if (zoom < 150) onZoomChange(Math.min(150, zoom + 10));
  };

  return (
    <TooltipProvider delayDuration={200}>
      <footer className="h-8 border-t border-border/60 bg-muted/40 backdrop-blur-md px-3 text-xs text-muted-foreground flex items-center justify-between select-none z-20 shrink-0 print:hidden">
        {/* Left: Document Metrics */}
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-default">
                <FileText className="w-3.5 h-3.5 text-primary/80" />
                <span className="font-medium text-foreground">{words}</span> palabras
                <span className="text-muted-foreground/50">•</span>
                <span>{characters}</span> caracteres
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Total de palabras y caracteres en el documento</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hidden sm:flex items-center gap-1.5 hover:text-foreground transition-colors cursor-default">
                <Clock className="w-3.5 h-3.5 text-amber-500/80" />
                <span>~{readingTimeMinutes} min de lectura</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Tiempo estimado de lectura (~200 palabras/min)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Right: View mode, Zoom & Print */}
        <div className="flex items-center gap-2">
          {/* View Mode Buttons */}
          <div className="flex items-center rounded-md border border-border/50 bg-background/50 p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onViewModeChange('notion')}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    viewMode === 'notion'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <Layout className="w-3 h-3" />
                  <span className="hidden md:inline">Notion</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Vista fluida tipo Notion</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onViewModeChange('word-a4')}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    viewMode === 'word-a4'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span className="hidden md:inline">Hoja Word (A4)</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Vista de página A4 con márgenes de Word</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onViewModeChange('full')}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    viewMode === 'full'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <Maximize2 className="w-3 h-3" />
                  <span className="hidden md:inline">Ancho total</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Ancho completo sin márgenes laterales</TooltipContent>
            </Tooltip>
          </div>

          <div className="h-3.5 w-px bg-border/60 mx-1 hidden sm:block" />

          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-muted"
              onClick={handleZoomOut}
              disabled={zoom <= 75}
              title="Reducir zoom"
            >
              <ZoomOut className="w-3 h-3" />
            </Button>
            <span className="min-w-[36px] text-center font-mono text-[11px]">
              {zoom}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-muted"
              onClick={handleZoomIn}
              disabled={zoom >= 150}
              title="Aumentar zoom"
            >
              <ZoomIn className="w-3 h-3" />
            </Button>
          </div>

          <div className="h-3.5 w-px bg-border/60 mx-1" />

          {/* Print / Export to PDF */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={onPrint}
              >
                <Printer className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Imprimir o guardar como PDF (Ctrl + P)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </footer>
    </TooltipProvider>
  );
};

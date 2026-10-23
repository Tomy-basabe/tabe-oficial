import React from "react";
import { Editor } from "@tiptap/react";
import { 
  FileText, 
  Clock, 
  ZoomIn, 
  ZoomOut, 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WordStatusBarProps {
  editor: Editor | null;
  viewMode?: 'notion' | 'word-a4' | 'full';
  onViewModeChange?: (mode: 'notion' | 'word-a4' | 'full') => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onPrint?: () => void;
}

export const WordStatusBar: React.FC<WordStatusBarProps> = ({
  editor,
  zoom,
  onZoomChange,
}) => {
  if (!editor) return null;

  // Calculate words and characters
  const text = editor.getText();
  const characters = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  
  // Calculate reading time (approx 200 words per minute)
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

  const handleZoomIn = () => {
    if (zoom < 150) onZoomChange(Math.min(150, zoom + 10));
  };

  const handleZoomOut = () => {
    if (zoom > 75) onZoomChange(Math.max(75, zoom - 10));
  };

  return (
    <TooltipProvider delayDuration={200}>
      <footer className="h-7 border-t border-border/40 bg-background/80 backdrop-blur-md px-3 text-[11px] text-muted-foreground flex items-center justify-between select-none z-20 shrink-0 print:hidden">
        {/* Left: Document Metrics */}
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-default hover:text-foreground transition-colors">
                <FileText className="w-3 h-3 text-muted-foreground/70" />
                <span>
                  <strong className="font-semibold text-foreground/90">{words.toLocaleString()}</strong> palabras
                  <span className="mx-1 text-muted-foreground/40">•</span>
                  {characters.toLocaleString()} caracteres
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Conteo en tiempo real</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hidden sm:flex items-center gap-1 cursor-default hover:text-foreground transition-colors">
                <Clock className="w-3 h-3 text-muted-foreground/70" />
                <span>~{readingTimeMinutes} min de lectura</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Calculado a 200 palabras por minuto</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Right: Zoom Controls */}
        <div className="hidden sm:flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-muted text-muted-foreground hover:text-foreground"
            onClick={handleZoomOut}
            disabled={zoom <= 75}
            title="Reducir zoom"
          >
            <ZoomOut className="w-3 h-3" />
          </Button>
          <span className="min-w-[36px] text-center font-mono text-[10px]">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-muted text-muted-foreground hover:text-foreground"
            onClick={handleZoomIn}
            disabled={zoom >= 150}
            title="Aumentar zoom"
          >
            <ZoomIn className="w-3 h-3" />
          </Button>
        </div>
      </footer>
    </TooltipProvider>
  );
};

import React, { useState, useEffect, useRef, useId } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import katex from 'katex';
import { cn } from '@/lib/utils';
import { Sigma, Check, X, Trash2, Calculator } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const MathNodeView = ({ node, updateAttributes, selected, deleteNode }: NodeViewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(node.attrs.formula || '');
  const containerRef = useRef<HTMLSpanElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uniqueId = useId();

  // Renderizar la fórmula KaTeX principal
  useEffect(() => {
    if (containerRef.current && !isEditing) {
      try {
        katex.render(node.attrs.formula || '?', containerRef.current, {
          throwOnError: false,
          displayMode: false,
        });
      } catch (e) {
        containerRef.current.textContent = node.attrs.formula || '?';
      }
    }
  }, [node.attrs.formula, isEditing]);

  // Sincronizar input con atributos externos
  useEffect(() => {
    setInputValue(node.attrs.formula || '');
  }, [node.attrs.formula]);

  // Renderizar la vista previa en vivo en el popover de edición
  useEffect(() => {
    if (isEditing && previewRef.current) {
      try {
        katex.render(inputValue.trim() || '\\text{Escribe tu fórmula aquí}', previewRef.current, {
          throwOnError: false,
          displayMode: true,
        });
      } catch (e) {
        if (previewRef.current) {
          previewRef.current.textContent = inputValue;
        }
      }
    }
  }, [isEditing, inputValue]);

  // Enfocar input al abrir edición y escuchar inserciones externas
  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }

    // Escuchar inserción de símbolos desde MathMenu
    const handleExternalInsert = (e: CustomEvent<string>) => {
      if (isEditing) {
        const latex = e.detail;
        const start = inputRef.current?.selectionStart ?? inputValue.length;
        const end = inputRef.current?.selectionEnd ?? inputValue.length;
        const newVal = inputValue.substring(0, start) + latex + inputValue.substring(end);
        setInputValue(newVal);

        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            const newCursor = start + latex.length;
            inputRef.current.setSelectionRange(newCursor, newCursor);
          }
        }, 10);
      }
    };

    window.addEventListener('notion-insert-math' as any, handleExternalInsert);
    return () => window.removeEventListener('notion-insert-math' as any, handleExternalInsert);
  }, [isEditing, inputValue]);

  // Escuchar evento para abrir edición vía Ctrl + M
  useEffect(() => {
    const handleTriggerEdit = () => {
      if (selected) {
        setIsEditing(true);
      }
    };

    window.addEventListener('notion-trigger-math-edit', handleTriggerEdit);
    return () => window.removeEventListener('notion-trigger-math-edit', handleTriggerEdit);
  }, [selected]);

  const handleSave = () => {
    const cleanFormula = inputValue.trim();
    if (!cleanFormula) {
      // Si el usuario borró todo, eliminar el nodo o restaurar por defecto
      if (deleteNode) {
        deleteNode();
      } else {
        updateAttributes({ formula: '?' });
      }
    } else {
      updateAttributes({ formula: cleanFormula });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setInputValue(node.attrs.formula || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <NodeViewWrapper as="span" contentEditable={false} className="notion-math-node-wrapper inline-block align-middle mx-0.5 select-none">
      <Popover open={isEditing} onOpenChange={(open) => {
        if (!open) {
          handleSave();
        } else {
          setIsEditing(true);
        }
      }}>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <span
                  ref={containerRef}
                  onClick={() => setIsEditing(true)}
                  className={cn(
                    "notion-math-render inline-flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded text-sm transition-all duration-150 border border-transparent",
                    "hover:bg-muted/80 hover:border-border/60 hover:shadow-xs",
                    selected && "bg-primary/15 border-primary/40 shadow-xs ring-1 ring-primary/30",
                    isEditing && "bg-primary/10 border-primary/50"
                  )}
                  aria-label="Fórmula matemática (KaTeX)"
                />
              </PopoverTrigger>
            </TooltipTrigger>
            
            {!isEditing && (
              <TooltipContent
                side="top"
                align="center"
                sideOffset={6}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-popover/95 backdrop-blur-md text-popover-foreground border border-border shadow-lg rounded-lg text-xs animate-in fade-in-50 zoom-in-95"
              >
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Sigma className="w-3.5 h-3.5 text-primary" />
                  <span>Ecuación matemática</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-muted border border-border/80 rounded text-muted-foreground shadow-2xs">
                    Ctrl + M
                  </kbd>
                </div>
                <span className="text-[11px] text-muted-foreground">· Haz clic para editar</span>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {/* Popover editor Notion Style */}
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={8}
          className="w-[360px] p-3.5 bg-background border border-border shadow-2xl rounded-xl z-50 text-foreground animate-in zoom-in-95 duration-150"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
            <div className="flex items-center gap-1.5">
              <span className="flex items-center justify-center w-5 h-5 rounded bg-primary/10 text-primary">
                <Sigma className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-semibold tracking-tight text-foreground">
                Ecuación matemática
              </span>
              <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground font-medium">
                KaTeX
              </span>
            </div>

            <div className="flex items-center gap-1">
              {deleteNode && (
                <button
                  type="button"
                  onClick={() => deleteNode()}
                  title="Eliminar ecuación"
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleCancel}
                title="Cerrar (Esc)"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
              Vista previa en vivo
            </div>
            <div
              ref={previewRef}
              className="min-h-[48px] max-h-[120px] overflow-x-auto p-2.5 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-center text-foreground font-serif text-base custom-scrollbar"
            />
          </div>

          {/* LaTeX Input */}
          <div className="space-y-1.5 mb-3">
            <label htmlFor={`math-input-${uniqueId}`} className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Código LaTeX
            </label>
            <div className="relative">
              <input
                id={`math-input-${uniqueId}`}
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ej: E = mc^2  o  \frac{-b \pm \sqrt{b^2-4ac}}{2a}"
                className="w-full h-8 px-2.5 text-xs font-mono bg-muted/30 border border-border rounded-md text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('notion-open-math-menu'));
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                title="Abrir catálogo de símbolos matemáticos"
              >
                <Calculator className="w-3 h-3 text-primary" />
                <span>Símbolos</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCancel}
                className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md shadow-xs transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Listo</span>
                <kbd className="ml-1 text-[9px] font-mono opacity-70">↵</kbd>
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
};

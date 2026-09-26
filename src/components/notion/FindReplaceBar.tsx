import React, { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { Search, Replace, ChevronUp, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FindReplaceBarProps {
  editor: Editor | null;
  isOpen?: boolean;
  onClose: () => void;
}

interface MatchRange {
  from: number;
  to: number;
}

export function FindReplaceBar({ editor, isOpen = true, onClose }: FindReplaceBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [matches, setMatches] = useState<MatchRange[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Inicializar con la palabra seleccionada en el documento si existe
  useEffect(() => {
    if (isOpen) {
      if (editor && !editor.isDestroyed) {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          const selectedText = editor.state.doc.textBetween(from, to, " ").trim();
          if (selectedText && selectedText.length <= 60) {
            setSearchTerm(selectedText);
          }
        }
      }
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
  }, [isOpen, editor]);

  // Buscar todas las coincidencias en el documento de TipTap
  const findMatches = useCallback(() => {
    if (!editor || editor.isDestroyed || !searchTerm.trim()) {
      setMatches([]);
      setCurrentMatchIndex(0);
      return [];
    }

    const found: MatchRange[] = [];
    const query = searchTerm.toLowerCase();

    try {
      editor.state.doc.descendants((node, pos) => {
        if (node.isText && node.text) {
          const text = node.text.toLowerCase();
          let index = text.indexOf(query);
          while (index !== -1) {
            found.push({
              from: pos + index,
              to: pos + index + query.length,
            });
            index = text.indexOf(query, index + 1);
          }
        }
      });
    } catch (err) {
      console.warn("Error buscando coincidencias:", err);
    }

    setMatches(found);
    if (found.length > 0 && currentMatchIndex >= found.length) {
      setCurrentMatchIndex(0);
    }
    return found;
  }, [editor, searchTerm, currentMatchIndex]);

  useEffect(() => {
    const list = findMatches();
    if (list.length > 0) {
      highlightMatch(0, list);
    }
  }, [searchTerm]);

  // Resaltar y scrollear hacia la coincidencia seleccionada
  const highlightMatch = useCallback(
    (index: number, matchArray = matches) => {
      if (!editor || editor.isDestroyed || matchArray.length === 0 || index < 0 || index >= matchArray.length) return;
      const match = matchArray[index];
      try {
        editor.chain().focus().setTextSelection({ from: match.from, to: match.to }).scrollIntoView().run();
      } catch (err) {
        console.warn("Error resaltando coincidencia:", err);
      }
    },
    [editor, matches]
  );

  const handleNext = () => {
    if (matches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIdx);
    highlightMatch(nextIdx);
  };

  const handlePrev = () => {
    if (matches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIdx);
    highlightMatch(prevIdx);
  };

  const handleReplace = () => {
    if (!editor || editor.isDestroyed || matches.length === 0) return;
    const current = matches[currentMatchIndex];
    if (!current) return;

    editor.chain().focus().setTextSelection({ from: current.from, to: current.to }).insertContent(replaceTerm).run();
    toast.success("Palabra reemplazada");

    setTimeout(() => {
      const updated = findMatches();
      if (updated.length > 0) {
        const nextIdx = Math.min(currentMatchIndex, updated.length - 1);
        setCurrentMatchIndex(nextIdx);
        highlightMatch(nextIdx, updated);
      }
    }, 50);
  };

  const handleReplaceAll = () => {
    if (!editor || editor.isDestroyed || matches.length === 0) return;
    const total = matches.length;

    editor.chain().focus().command(({ tr }) => {
      for (let i = matches.length - 1; i >= 0; i--) {
        tr.insertText(replaceTerm, matches[i].from, matches[i].to);
      }
      return true;
    }).run();

    toast.success(`Se reemplazaron ${total} coincidencias`);
    setMatches([]);
    setCurrentMatchIndex(0);
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-card border-b-2 border-foreground shadow-[0_4px_10px_rgba(0,0,0,0.08)] text-foreground text-xs animate-in slide-in-from-top-1 duration-150 z-20">
      {/* Campo de Búsqueda de Palabras */}
      <div className="flex items-center gap-1.5 bg-background border-2 border-foreground px-2.5 py-1 rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))]">
        <Search className="w-3.5 h-3.5 text-primary shrink-0 stroke-[2.5]" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (e.shiftKey) handlePrev();
              else handleNext();
            }
            if (e.key === "Escape") onClose();
          }}
          placeholder="Buscar palabra en el apunte..."
          className="bg-transparent outline-none w-36 sm:w-56 font-bold text-foreground placeholder:text-muted-foreground placeholder:font-normal text-xs"
        />

        {/* Contador de coincidencias */}
        {matches.length > 0 ? (
          <span className="text-[10px] font-black px-1.5 py-0.5 bg-[#FFD700] text-black border border-black rounded shadow-[1px_1px_0_0_#000] shrink-0">
            {currentMatchIndex + 1}/{matches.length}
          </span>
        ) : searchTerm.trim() ? (
          <span className="text-[10px] font-black px-1.5 py-0.5 bg-destructive/15 text-destructive border border-destructive/30 rounded shrink-0">
            0 halladas
          </span>
        ) : null}

        {/* Botones de navegación Anterior / Siguiente */}
        <div className="flex items-center gap-0.5 pl-1 border-l border-border/80">
          <button
            type="button"
            onClick={handlePrev}
            disabled={matches.length === 0}
            className="p-1 hover:bg-muted rounded text-foreground disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
            title="Anterior coincidencia (Shift + Enter)"
          >
            <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={matches.length === 0}
            className="p-1 hover:bg-muted rounded text-foreground disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
            title="Siguiente coincidencia (Enter)"
          >
            <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Botón para alternar Reemplazar */}
      <button
        type="button"
        onClick={() => setShowReplace(!showReplace)}
        className={cn(
          "px-2 py-1 rounded-lg border-2 border-foreground text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer",
          showReplace
            ? "bg-[#00E5FF] text-black shadow-[2px_2px_0_0_hsl(var(--foreground))]"
            : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted shadow-[1.5px_1.5px_0_0_hsl(var(--foreground))]"
        )}
        title="Alternar reemplazar texto"
      >
        <span className="flex items-center gap-1">
          <Replace className="w-3 h-3 stroke-[2.5]" />
          <span className="hidden sm:inline">Reemplazar</span>
        </span>
      </button>

      {/* Campo Reemplazar (Opcional) */}
      {showReplace && (
        <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 bg-background border-2 border-foreground px-2 py-1 rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))]">
            <input
              type="text"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              placeholder="Reemplazar con..."
              className="bg-transparent outline-none w-28 sm:w-44 font-medium text-foreground text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleReplace();
                }
                if (e.key === "Escape") onClose();
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleReplace}
            disabled={matches.length === 0}
            className="px-2 py-1 bg-secondary text-foreground font-black border-2 border-foreground rounded-lg shadow-[1.5px_1.5px_0_0_hsl(var(--foreground))] hover:bg-muted disabled:opacity-40 text-[10px] uppercase cursor-pointer"
            title="Reemplazar coincidencia actual"
          >
            Uno
          </button>
          <button
            type="button"
            onClick={handleReplaceAll}
            disabled={matches.length === 0}
            className="px-2 py-1 bg-[#BFFF00] text-black font-black border-2 border-foreground rounded-lg shadow-[1.5px_1.5px_0_0_hsl(var(--foreground))] hover:bg-[#a8e600] disabled:opacity-40 text-[10px] uppercase cursor-pointer"
            title="Reemplazar todas las coincidencias"
          >
            Todos
          </button>
        </div>
      )}

      {/* Botón Cerrar */}
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded-lg border-2 border-foreground bg-card text-muted-foreground hover:text-black hover:bg-[#FF5C5C] shadow-[1.5px_1.5px_0_0_hsl(var(--foreground))] transition-all ml-auto cursor-pointer"
        title="Cerrar búsqueda (Esc)"
      >
        <X className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>
    </div>
  );
}

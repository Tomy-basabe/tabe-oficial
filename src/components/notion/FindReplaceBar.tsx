import React, { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { Search, Replace, ChevronUp, ChevronDown, X, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FindReplaceBarProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

interface MatchRange {
  from: number;
  to: number;
}

export function FindReplaceBar({ editor, isOpen, onClose }: FindReplaceBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [matches, setMatches] = useState<MatchRange[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find all matches in document
  const findMatches = useCallback(() => {
    if (!editor || !searchTerm.trim()) {
      setMatches([]);
      setCurrentMatchIndex(0);
      return [];
    }

    const found: MatchRange[] = [];
    const query = searchTerm.toLowerCase();

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

    setMatches(found);
    if (found.length > 0 && currentMatchIndex >= found.length) {
      setCurrentMatchIndex(0);
    }
    return found;
  }, [editor, searchTerm, currentMatchIndex]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    findMatches();
  }, [searchTerm, findMatches]);

  // Highlight and scroll to current match
  const highlightMatch = useCallback((index: number, matchArray = matches) => {
    if (!editor || matchArray.length === 0 || index < 0 || index >= matchArray.length) return;
    const match = matchArray[index];
    editor.chain().focus().setTextSelection({ from: match.from, to: match.to }).scrollIntoView().run();
  }, [editor, matches]);

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
    if (!editor || matches.length === 0) return;
    const current = matches[currentMatchIndex];
    if (!current) return;

    editor.chain().focus().setTextSelection({ from: current.from, to: current.to }).insertContent(replaceTerm).run();
    toast.success("Texto reemplazado");

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
    if (!editor || matches.length === 0) return;
    const total = matches.length;

    // Replace from bottom to top so positions do not shift
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
    <div className="flex flex-wrap items-center gap-2 p-2.5 bg-card border-b-2 border-foreground/30 shadow-[0_4px_12px_rgba(0,0,0,0.1)] text-foreground text-xs animate-in slide-in-from-top-2 duration-200 z-20">
      {/* Search Field */}
      <div className="flex items-center gap-1.5 bg-background border-2 border-foreground/50 px-2 py-1 rounded-md shadow-[2px_2px_0_0_hsl(var(--foreground)/0.2)]">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
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
          placeholder="Buscar..."
          className="bg-transparent outline-none w-28 sm:w-36 font-medium text-foreground"
        />
        {matches.length > 0 && (
          <span className="text-[10px] font-bold text-muted-foreground px-1 bg-muted rounded">
            {currentMatchIndex + 1}/{matches.length}
          </span>
        )}
        {searchTerm && matches.length === 0 && (
          <span className="text-[10px] font-bold text-destructive px-1 bg-destructive/10 rounded">
            0
          </span>
        )}
        <button
          onClick={handlePrev}
          disabled={matches.length === 0}
          className="p-0.5 hover:bg-muted rounded text-muted-foreground disabled:opacity-30"
          title="Anterior (Shift+Enter)"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleNext}
          disabled={matches.length === 0}
          className="p-0.5 hover:bg-muted rounded text-muted-foreground disabled:opacity-30"
          title="Siguiente (Enter)"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Replace Field */}
      <div className="flex items-center gap-1.5 bg-background border-2 border-foreground/50 px-2 py-1 rounded-md shadow-[2px_2px_0_0_hsl(var(--foreground)/0.2)]">
        <Replace className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          value={replaceTerm}
          onChange={(e) => setReplaceTerm(e.target.value)}
          placeholder="Reemplazar con..."
          className="bg-transparent outline-none w-28 sm:w-36 font-medium text-foreground"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleReplace();
            }
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleReplace}
          disabled={matches.length === 0}
          className="px-2.5 py-1 bg-secondary text-secondary-foreground font-bold border border-foreground/40 rounded hover:bg-secondary/80 disabled:opacity-30 transition-all text-[11px]"
          title="Reemplazar coincidencia actual"
        >
          Reemplazar
        </button>
        <button
          onClick={handleReplaceAll}
          disabled={matches.length === 0}
          className="px-2.5 py-1 bg-primary text-primary-foreground font-bold border border-foreground/40 rounded hover:bg-primary/90 disabled:opacity-30 transition-all text-[11px]"
          title="Reemplazar todas las coincidencias"
        >
          Todos
        </button>
        <button
          onClick={onClose}
          className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors ml-auto"
          title="Cerrar búsqueda (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Layers, Play, Plus, Sparkles, Trash2, MoreVertical, BookOpen, Check, X, Zap, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Deck {
  id: string;
  nombre: string;
  subject_id: string;
  total_cards: number;
  subject?: { nombre: string; codigo: string; año: number };
}

interface FlashcardDeckProps {
  deck: Deck;
  onStartStudy: (deck: Deck, filter: 'all' | 'known' | 'partial' | 'unknown') => void;
  onAddCard: (deck: Deck) => void;
  onDeleteDeck: (deck: Deck) => void;
  onManageCards: (deck: Deck) => void;
  onEditDeck: (deck: Deck) => void;
  onImportCards: (deck: Deck) => void;
  onPublishDeck: (deck: Deck) => void;
  index: number;
}

export function FlashcardDeck({ deck, onStartStudy, onAddCard, onDeleteDeck, onManageCards, onEditDeck, onImportCards, onPublishDeck, index }: FlashcardDeckProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      className={cn(
        "relative group cursor-pointer transition-all duration-300",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main card */}
      <div className={cn(
        "relative bg-card border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-6 transition-all duration-300 overflow-hidden",
        isHovered && "shadow-[6px_6px_0_0_hsl(var(--foreground))] -translate-y-1 bg-secondary"
      )}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "w-14 h-14 rounded-xl bg-[#1475e5] border-[3px] border-foreground shadow-[2px_2px_0_0_#000] flex items-center justify-center transition-all duration-300 relative",
            isHovered && "-translate-y-1 shadow-[4px_4px_0_0_#000]"
          )}>
            <Layers className="w-7 h-7 text-white relative z-10" />
            {isHovered && (
              <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-[#ffd21c] animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-3 py-1.5 bg-background border-[2px] border-foreground shadow-[2px_2px_0_0_#000] rounded-xl font-black uppercase tracking-widest">
              Año {deck.subject?.año}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 bg-background border-[2px] border-foreground shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-y-0.5 rounded-xl transition-all"
                >
                  <MoreVertical className="w-4 h-4 text-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl p-1">
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onManageCards(deck); }}
                  className="cursor-pointer font-bold uppercase tracking-wider text-xs focus:bg-background focus:text-foreground rounded-lg p-3"
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Gestionar tarjetas
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onEditDeck(deck); }}
                  className="cursor-pointer font-bold uppercase tracking-wider text-xs focus:bg-background focus:text-foreground rounded-lg p-3"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Editar materia
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onImportCards(deck); }}
                  className="cursor-pointer font-bold uppercase tracking-wider text-xs focus:bg-background focus:text-foreground rounded-lg p-3"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Importar cartas
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onPublishDeck(deck); }}
                  className="cursor-pointer font-bold uppercase tracking-wider text-xs text-[#00ffcc] focus:bg-background focus:text-[#00ffcc] rounded-lg p-3"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Publicar en Marketplace
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDeleteDeck(deck); }}
                  className="cursor-pointer font-bold uppercase tracking-wider text-xs text-[#ef4444] focus:bg-background focus:text-[#ef4444] rounded-lg p-3"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar mazo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <h3 className="font-display font-black uppercase text-xl mb-1 line-clamp-1 truncate">{deck.nombre}</h3>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 line-clamp-1">{deck.subject?.nombre}</p>

        {/* Card count visualization */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex -space-x-2">
            {[...Array(Math.min(deck.total_cards, 5))].map((_, i) => (
              <div
                key={i}
                className="w-6 h-8 rounded-md bg-background border-[2px] border-foreground shadow-[1px_1px_0_0_#000]"
                style={{ transform: `rotate(${(i - 2) * 5}deg)` }}
              />
            ))}
            {deck.total_cards === 0 && (
              <div className="w-6 h-8 rounded-md bg-secondary border-[2px] border-dashed border-foreground" />
            )}
          </div>
          <span className={cn(
            "text-xs font-black uppercase tracking-widest transition-colors",
            isHovered ? "text-foreground" : "text-muted-foreground"
          )}>
            {deck.total_cards} {deck.total_cards === 1 ? "tarjeta" : "tarjetas"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={deck.total_cards === 0}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-[3px] border-foreground font-black uppercase tracking-widest text-[10px] transition-all",
                  deck.total_cards > 0
                    ? "bg-[#00ffcc] text-black shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-y-1"
                    : "bg-secondary text-muted-foreground cursor-not-allowed border-muted-foreground shadow-none"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <Play className="w-4 h-4" />
                ESTUDIAR
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-card border-[3px] border-foreground shadow-[4px_4px_0_0_#000] rounded-xl p-1 w-56">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStartStudy(deck, 'all'); }} className="cursor-pointer font-bold uppercase tracking-wider text-xs p-3">
                <Play className="w-4 h-4 mr-2" /> Normal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStartStudy(deck, 'unknown'); }} className="cursor-pointer font-bold uppercase tracking-wider text-xs p-3 text-[#ef4444] focus:text-[#ef4444]">
                <X className="w-4 h-4 mr-2" /> No sabidas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStartStudy(deck, 'partial'); }} className="cursor-pointer font-bold uppercase tracking-wider text-xs p-3 text-[#ffd21c] focus:text-[#ffd21c]">
                <Zap className="w-4 h-4 mr-2" /> A medias
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStartStudy(deck, 'known'); }} className="cursor-pointer font-bold uppercase tracking-wider text-xs p-3 text-[#25d06c] focus:text-[#25d06c]">
                <Check className="w-4 h-4 mr-2" /> Sabidas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={(e) => { e.stopPropagation(); onPublishDeck(deck); }}
            className="px-3 py-3 bg-[#00ffcc] text-black rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-y-1 transition-all"
            title="Publicar en Marketplace"
          >
            <ShoppingBag className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAddCard(deck); }}
            className="px-3 py-3 bg-background text-foreground rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-y-1 transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

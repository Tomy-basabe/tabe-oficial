import { useState, useEffect } from "react";
import { Layers, Play, Plus, Sparkles, Trash2, MoreVertical } from "lucide-react";
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
  onStartStudy: (deck: Deck) => void;
  onAddCard: (deck: Deck) => void;
  onDeleteDeck: (deck: Deck) => void;
  onManageCards: (deck: Deck) => void;
  index: number;
}

export function FlashcardDeck({ deck, onStartStudy, onAddCard, onDeleteDeck, onManageCards, index }: FlashcardDeckProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      className={cn(
        "relative group cursor-pointer transition-all duration-500",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Stacked cards effect - behind */}
      <div className={cn(
        "absolute inset-0 rounded-2xl bg-gradient-to-br from-neon-purple/20 to-neon-cyan/10 border border-neon-purple/20 transition-all duration-300",
        isHovered ? "translate-x-3 translate-y-3 rotate-3" : "translate-x-1 translate-y-1 rotate-1"
      )} />
      <div className={cn(
        "absolute inset-0 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/10 border border-neon-cyan/20 transition-all duration-300",
        isHovered ? "translate-x-1.5 translate-y-1.5 rotate-1" : "translate-x-0.5 translate-y-0.5 rotate-0.5"
      )} />

      {/* Main card */}
      <div className={cn(
        "relative card-gamer rounded-2xl p-6 transition-all duration-300 overflow-hidden",
        isHovered && "glow-cyan -translate-y-1"
      )}>
        {/* Animated background particles */}
        {isHovered && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-neon-cyan rounded-full animate-float"
                style={{
                  left: `${15 + i * 15}%`,
                  top: `${20 + (i % 3) * 25}%`,
                  animationDelay: `${i * 0.2}s`,
                  opacity: 0.6
                }}
              />
            ))}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "w-14 h-14 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center transition-all duration-300 relative",
            isHovered && "scale-110 glow-cyan"
          )}>
            <Layers className="w-7 h-7 text-background relative z-10" />
            {isHovered && (
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-neon-gold animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1.5 bg-secondary/80 backdrop-blur rounded-lg border border-border/50 font-medium">
              Año {deck.subject?.año}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onManageCards(deck); }}
                  className="cursor-pointer"
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Gestionar tarjetas
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDeleteDeck(deck); }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar mazo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <h3 className="font-display font-bold text-lg mb-1 line-clamp-1">{deck.nombre}</h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-1">{deck.subject?.nombre}</p>

        {/* Card count visualization */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex -space-x-2">
            {[...Array(Math.min(deck.total_cards, 5))].map((_, i) => (
              <div
                key={i}
                className="w-6 h-8 rounded bg-gradient-to-br from-secondary to-muted border border-border/50 shadow-sm"
                style={{ transform: `rotate(${(i - 2) * 5}deg)` }}
              />
            ))}
            {deck.total_cards === 0 && (
              <div className="w-6 h-8 rounded bg-secondary/50 border border-dashed border-border" />
            )}
          </div>
          <span className={cn(
            "text-sm font-medium transition-colors",
            isHovered ? "text-neon-cyan" : "text-muted-foreground"
          )}>
            {deck.total_cards} {deck.total_cards === 1 ? "tarjeta" : "tarjetas"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onStartStudy(deck); }}
            disabled={deck.total_cards === 0}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300",
              deck.total_cards > 0
                ? "bg-gradient-to-r from-neon-cyan to-neon-purple text-background hover:shadow-lg hover:shadow-neon-cyan/25 hover:scale-[1.02]"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            <Play className="w-4 h-4" />
            Estudiar
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onAddCard(deck); }}
            className="px-3 py-2.5 bg-secondary rounded-xl hover:bg-secondary/80 transition-all hover:scale-105 border border-border/50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

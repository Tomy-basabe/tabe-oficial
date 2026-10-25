import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Layers, Play, Plus, Trash2, MoreVertical, BookOpen, Check, X, Zap, ShoppingBag, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

const getYearAccent = (year?: number) => {
  switch (year) {
    case 1:
      return {
        badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/60",
        icon: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-800/60",
      };
    case 2:
      return {
        badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60",
        icon: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60",
      };
    case 3:
      return {
        badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60",
        icon: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60",
      };
    case 4:
      return {
        badge: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60",
        icon: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200/60 dark:border-purple-800/60",
      };
    case 5:
      return {
        badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60",
        icon: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60",
      };
    default:
      return {
        badge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-700/60",
        icon: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60",
      };
  }
};

export function FlashcardDeck({
  deck,
  onStartStudy,
  onAddCard,
  onDeleteDeck,
  onManageCards,
  onEditDeck,
  onImportCards,
  onPublishDeck,
  index,
}: FlashcardDeckProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), Math.min(index * 25, 200));
    return () => clearTimeout(timer);
  }, [index]);

  const accent = getYearAccent(deck.subject?.año);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, y: -10, filter: "blur(5px)", transition: { duration: 0.2, ease: [0.32, 0, 0.67, 0] } }}
      transition={{
        layout: { type: "spring", stiffness: 360, damping: 28, mass: 0.72 },
        duration: 0.28,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative group cursor-pointer h-full flex flex-col"
      onClick={() => onManageCards(deck)}
    >
      {/* Tarjeta refinada estilo Notion / ChatGPT */}
      <div className="relative bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700/90 rounded-xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-[border-color,box-shadow] duration-150 flex flex-col justify-between flex-1">
        <div>
          {/* Cabecera de la tarjeta */}
          <div className="flex items-start justify-between mb-3">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08 + Math.min(index * 0.03, 0.2), duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={cn("w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors shadow-2xs", accent.icon)}
            >
              <Layers className="w-4 h-4" />
            </motion.div>

            <div className="flex items-center gap-1.5">
              {deck.subject?.año ? (
                <span className={cn("text-[11px] font-mono px-2 py-0.5 rounded-md border font-medium", accent.badge)}>
                  {deck.subject.año}° Año
                </span>
              ) : (
                <span className="bg-zinc-100 text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400 text-[11px] px-2 py-0.5 rounded-md border border-zinc-200/60 dark:border-zinc-700/60 font-medium">
                  General
                </span>
              )}

              {/* Menú contextual de opciones */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Opciones del mazo"
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-1 shadow-lg w-52 text-xs"
                >
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onManageCards(deck);
                    }}
                    className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg px-2.5 py-1.5 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5 mr-2 text-zinc-500" />
                    Gestionar tarjetas
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddCard(deck);
                    }}
                    className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg px-2.5 py-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 mr-2 text-zinc-500" />
                    Nueva tarjeta
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditDeck(deck);
                    }}
                    className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg px-2.5 py-1.5 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 mr-2 text-zinc-500" />
                    Editar materia
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onImportCards(deck);
                    }}
                    className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg px-2.5 py-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 mr-2 text-zinc-500" />
                    Importar tarjetas
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 bg-zinc-100 dark:bg-zinc-800" />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onPublishDeck(deck);
                    }}
                    className="cursor-pointer font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg px-2.5 py-1.5 transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 mr-2" />
                    Publicar en la Comunidad
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDeck(deck);
                    }}
                    className="cursor-pointer font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg px-2.5 py-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Eliminar mazo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Información principal */}
          <h3 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 tracking-tight line-clamp-1 mb-0.5" title={deck.nombre}>
            {deck.nombre}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mb-3.5" title={deck.subject?.nombre || "Sin materia vinculada"}>
            {deck.subject?.nombre || "Sin materia vinculada"}
          </p>
        </div>

        <div>
          {/* Contador y mini visualizador de tarjetas apiladas */}
          <div className="flex items-center justify-between gap-2 mb-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1 items-center">
                {[...Array(Math.min(deck.total_cards, 3))].map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-4 rounded-[2px] bg-zinc-200 dark:bg-zinc-700 border border-white dark:border-zinc-800 shadow-2xs"
                    style={{ transform: `rotate(${(i - 1) * 6}deg)` }}
                  />
                ))}
                {deck.total_cards === 0 && (
                  <div className="w-3 h-4 rounded-[2px] border border-dashed border-zinc-300 dark:border-zinc-700 bg-transparent" />
                )}
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {deck.total_cards} {deck.total_cards === 1 ? "tarjeta" : "tarjetas"}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onManageCards(deck);
              }}
              className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors flex items-center gap-1 font-medium"
              title="Abrir editor de tarjetas"
            >
              <Edit3 className="w-3 h-3" />
              Editar
            </button>
          </div>

          {/* Botones de acción inferiores */}
          <div className="flex items-center gap-1.5">
            {/* Botón de estudiar con selector de modo */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={deck.total_cards === 0}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer",
                    deck.total_cards > 0
                      ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                      : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800/50 dark:text-zinc-600 cursor-not-allowed border border-zinc-200/50 dark:border-zinc-800/50 shadow-none"
                  )}
                >
                  <Play className="w-3 h-3 fill-current" />
                  Estudiar
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-1 shadow-lg w-52 text-xs"
              >
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartStudy(deck, "all");
                  }}
                  className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg px-2.5 py-1.5 transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Play className="w-3 h-3 text-zinc-500 fill-current" />
                    Todas las tarjetas
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">{deck.total_cards}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartStudy(deck, "unknown");
                  }}
                  className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg px-2.5 py-1.5 transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    No sabidas
                  </span>
                  <X className="w-3 h-3 text-rose-500" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartStudy(deck, "partial");
                  }}
                  className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg px-2.5 py-1.5 transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    A medias
                  </span>
                  <Zap className="w-3 h-3 text-amber-500" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartStudy(deck, "known");
                  }}
                  className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg px-2.5 py-1.5 transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Sabidas
                  </span>
                  <Check className="w-3 h-3 text-emerald-500" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Botón rápido para agregar tarjeta */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddCard(deck);
              }}
              title="Añadir tarjeta"
              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Botón de publicar en comunidad */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPublishDeck(deck);
              }}
              title="Publicar en la Comunidad"
              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

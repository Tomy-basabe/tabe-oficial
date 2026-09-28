import React, { useState } from "react";
import { PLANT_TYPES, PlantType } from "@/hooks/useForest";
import { ForestTreeArtwork } from "./ForestTreeArtwork";
import { ComicBadge } from "@/components/comic/ComicBadge";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { Sprout, Sparkles, Check, Info, Flame, Zap, Shield, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ForestSpeciesNurseryProps {
  selectedSpecies: string;
  onSelectSpecies: (speciesId: string) => void;
  hasActivePlant: boolean;
  onConfirmPlant?: () => void;
}

export const ForestSpeciesNursery: React.FC<ForestSpeciesNurseryProps> = ({
  selectedSpecies,
  onSelectSpecies,
  hasActivePlant,
  onConfirmPlant,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<number | "all">("all");

  const filteredTypes = PLANT_TYPES.filter((type) => {
    if (selectedLevel === "all") return true;
    return type.level === selectedLevel;
  });

  const rarityBadgeVariant: Record<string, "green" | "pink" | "cyan" | "yellow"> = {
    comun: "green",
    raro: "pink",
    epico: "cyan",
    legendario: "yellow",
  };

  const LEVEL_TABS = [
    { id: "all", label: `Todas (${PLANT_TYPES.length})`, emoji: "🌟" },
    { id: 1, label: "Muy Fácil (20-30m)", emoji: "🍄" },
    { id: 2, label: "Fácil (45-60m)", emoji: "🌻" },
    { id: 3, label: "Normal (2-3h)", emoji: "🌳" },
    { id: 4, label: "Difícil (4-6h)", emoji: "🌲" },
    { id: 5, label: "Épico (8-10h)", emoji: "🔥" },
    { id: 6, label: "Legendario (16-24h)", emoji: "💎" },
  ] as const;

  const COMIC_LEVEL_STYLES: Record<string | number, { selected: string; unselected: string }> = {
    all: {
      selected: "bg-[#FFE600] text-black border-3 border-black shadow-[3px_3px_0_0_#000]",
      unselected: "bg-muted/70 text-foreground/80 border-2 border-foreground/30 hover:border-foreground hover:bg-muted",
    },
    1: {
      selected: "bg-[#BFFF00] text-black border-3 border-black shadow-[3px_3px_0_0_#000]",
      unselected: "bg-[#BFFF00]/15 text-lime-700 dark:text-lime-300 border-2 border-[#BFFF00]/60 hover:bg-[#BFFF00]/30 hover:border-[#BFFF00]",
    },
    2: {
      selected: "bg-[#00E5FF] text-black border-3 border-black shadow-[3px_3px_0_0_#000]",
      unselected: "bg-[#00E5FF]/15 text-cyan-700 dark:text-cyan-300 border-2 border-[#00E5FF]/60 hover:bg-[#00E5FF]/30 hover:border-[#00E5FF]",
    },
    3: {
      selected: "bg-[#FFD21C] text-black border-3 border-black shadow-[3px_3px_0_0_#000]",
      unselected: "bg-[#FFD21C]/15 text-amber-700 dark:text-amber-300 border-2 border-[#FFD21C]/60 hover:bg-[#FFD21C]/30 hover:border-[#FFD21C]",
    },
    4: {
      selected: "bg-[#FF9415] text-black border-3 border-black shadow-[3px_3px_0_0_#000]",
      unselected: "bg-[#FF9415]/15 text-orange-700 dark:text-orange-300 border-2 border-[#FF9415]/60 hover:bg-[#FF9415]/30 hover:border-[#FF9415]",
    },
    5: {
      selected: "bg-[#FF5C5C] text-white border-3 border-black shadow-[3px_3px_0_0_#000]",
      unselected: "bg-[#FF5C5C]/15 text-rose-700 dark:text-rose-300 border-2 border-[#FF5C5C]/60 hover:bg-[#FF5C5C]/30 hover:border-[#FF5C5C]",
    },
    6: {
      selected: "bg-gradient-to-r from-[#FFD21C] via-[#FF5C5C] to-[#A855F7] text-white border-3 border-black shadow-[4px_4px_0_0_#000] ring-2 ring-yellow-400 animate-pulse",
      unselected: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-2 border-purple-500/50 hover:bg-purple-500/30 hover:border-purple-500",
    },
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Header with Level & Difficulty Filters */}
      <div className="bg-card text-foreground border-4 border-foreground rounded-2xl p-4 sm:p-6 shadow-[6px_6px_0_0_hsl(var(--foreground))] flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h3 className="text-xl sm:text-2xl font-black uppercase text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" /> Vivero de Especies & Dificultades
            </h3>
            <p className="text-xs font-bold text-muted-foreground mt-0.5">
              {PLANT_TYPES.length} árboles únicos organizados por nivel de concentración. Cada especie cuenta con diseño y personalidad propia.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#BFFF00]/20 border-2 border-foreground rounded-xl text-xs font-black uppercase self-start md:self-auto shadow-[2px_2px_0_0_hsl(var(--foreground))]">
            <span>🌱 {filteredTypes.length} especies mostradas</span>
          </div>
        </div>

        {/* Level Filter Pills (Full Comic Colors) */}
        <div className="flex items-center gap-2.5 p-2 bg-muted/40 border-3 border-foreground rounded-2xl overflow-x-auto w-full">
          {LEVEL_TABS.map((tab) => {
            const isSelected = selectedLevel === tab.id;
            const style = COMIC_LEVEL_STYLES[tab.id] || COMIC_LEVEL_STYLES.all;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  ComicAudio.playPop();
                  setSelectedLevel(tab.id);
                }}
                className={cn(
                  "px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer hover:translate-y-[-1px] active:translate-y-[1px]",
                  isSelected ? style.selected : style.unselected
                )}
              >
                <span className="text-base">{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Species Cards Grid (Expanded 5-Column Grid on Desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4.5">
        {filteredTypes.map((type) => {
          const isSelected = selectedSpecies === type.id;
          return (
            <div
              key={type.id}
              onClick={() => {
                ComicAudio.playPop();
                onSelectSpecies(type.id);
              }}
              style={{
                borderColor: isSelected ? "#BFFF00" : undefined,
              }}
              className={cn(
                "relative bg-card text-foreground rounded-2xl border-4 transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between cursor-pointer group hover:translate-y-[-3px]",
                isSelected
                  ? "border-[#BFFF00] shadow-[6px_6px_0_0_#BFFF00] bg-[#BFFF00]/5 ring-2 ring-black"
                  : "border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))]"
              )}
            >
              {/* Selected Marker */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-8 h-8 bg-[#BFFF00] text-black border-3 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_0_#000] z-20">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
              )}

              {/* Badges row: Level Badge + Rarity + Emoji */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-lg border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0_0_#000]",
                    type.level === 1 && "bg-[#BFFF00] text-black",
                    type.level === 2 && "bg-[#00E5FF] text-black",
                    type.level === 3 && "bg-[#FFD21C] text-black",
                    type.level === 4 && "bg-[#FF9415] text-black",
                    type.level === 5 && "bg-[#FF5C5C] text-white",
                    type.level === 6 && "bg-gradient-to-r from-[#FFD21C] via-[#FF5C5C] to-[#A855F7] text-white ring-1 ring-yellow-300"
                  )}
                >
                  {type.level === 6 ? "👑 LEGENDARIO" : type.difficultyLabel}
                </span>

                <ComicBadge variant={rarityBadgeVariant[type.rarity] || "green"} size="sm">
                  {type.rarity}
                </ComicBadge>

                <span className="text-xl ml-auto">{type.emoji}</span>
              </div>

              {/* Illustrated Showcase */}
              <div
                className="my-2.5 py-3 flex items-center justify-center rounded-xl border-2 border-foreground/30 group-hover:scale-105 transition-transform duration-200"
                style={{
                  backgroundColor: `${type.color}15`,
                }}
              >
                <ForestTreeArtwork species={type.id} stage="full" size="md" animated={type.level >= 5} />
              </div>

              {/* Species Name & Lore */}
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-black uppercase text-foreground leading-tight">
                    {type.name}
                  </h4>
                </div>

                {/* RPG Difficulty Notch Meter (1 to 6 bars) */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-muted-foreground">
                    <span>Dificultad de Crecimiento</span>
                    <span className="font-mono text-foreground font-black">{type.level}/6</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6].map((step) => {
                      const isFilled = step <= type.level;
                      return (
                        <div
                          key={step}
                          className={cn(
                            "h-2 flex-1 rounded-sm border border-foreground/40 transition-all",
                            isFilled
                              ? type.level >= 5
                                ? "bg-fuchsia-500 shadow-[0_0_4px_rgba(217,70,239,0.8)]"
                                : type.level >= 3
                                ? "bg-amber-400"
                                : "bg-emerald-400"
                              : "bg-muted/40"
                          )}
                        />
                      );
                    })}
                  </div>
                </div>

                <p className="text-[11px] font-bold text-muted-foreground line-clamp-2 mt-1">
                  {type.description}
                </p>

                {/* Difficulty & Speed Metrics Card */}
                <div className="mt-2 p-2.5 bg-muted/50 rounded-xl border-2 border-foreground/20 text-[10px] font-black uppercase text-foreground/90 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tiempo total:</span>
                    <span className="text-[#00E5FF] font-mono font-bold">
                      {type.requiredMinutes >= 60
                        ? `${(type.requiredMinutes / 60).toFixed(1)}h (${type.requiredMinutes}m)`
                        : `${type.requiredMinutes} min`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Velocidad:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{type.speedMultiplierDescription}</span>
                  </div>
                </div>

                <p className="text-[10px] italic text-amber-600 dark:text-amber-300 line-clamp-1 mt-1">
                  "{type.lore}"
                </p>
              </div>

              {/* Selection button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  ComicAudio.playPop();
                  onSelectSpecies(type.id);
                  if (onConfirmPlant && !hasActivePlant) {
                    onConfirmPlant();
                  }
                }}
                disabled={hasActivePlant && !isSelected}
                className={cn(
                  "mt-4 w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider border-2 transition-all flex items-center justify-center gap-1.5 shadow-[2px_2px_0_0_hsl(var(--foreground))]",
                  isSelected
                    ? "bg-[#BFFF00] text-black border-black"
                    : "bg-muted text-foreground border-foreground/50 hover:border-foreground hover:bg-card"
                )}
              >
                {isSelected ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Seleccionado
                  </>
                ) : (
                  <>
                    <Sprout className="w-3.5 h-3.5" /> Elegir Especie
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

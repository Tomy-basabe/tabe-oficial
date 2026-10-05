import React, { useState, useMemo } from "react";
import { PLANT_TYPES, PlantType, Plant } from "@/hooks/useForest";
import { ForestTreeArtwork } from "./ForestTreeArtwork";
import { ComicBadge } from "@/components/comic/ComicBadge";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { Sprout, Sparkles, Check, Info, Flame, Zap, Shield, Crown, Trophy, Lock, Award, Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ForestSpeciesNurseryProps {
  selectedSpecies: string;
  onSelectSpecies: (speciesId: string) => void;
  hasActivePlant: boolean;
  onConfirmPlant?: () => void;
  plants?: Plant[];
}

export const ForestSpeciesNursery: React.FC<ForestSpeciesNurseryProps> = ({
  selectedSpecies,
  onSelectSpecies,
  hasActivePlant,
  onConfirmPlant,
  plants = [],
}) => {
  const [selectedLevel, setSelectedLevel] = useState<number | "all">("all");

  // Calculate unlocked species from user's plants
  const unlockedSpeciesSet = useMemo(() => {
    const set = new Set<string>();
    plants.forEach((p) => {
      if (p.plant_type) {
        set.add(p.plant_type);
      }
    });
    return set;
  }, [plants]);

  const unlockedCount = useMemo(() => {
    return PLANT_TYPES.filter((t) => unlockedSpeciesSet.has(t.id)).length;
  }, [unlockedSpeciesSet]);

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
      {/* Header with Level & Difficulty Filters + Gamification Progress */}
      <div className="bg-card text-foreground border-4 border-foreground rounded-2xl p-4 sm:p-6 shadow-[6px_6px_0_0_hsl(var(--foreground))] flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-xl sm:text-2xl font-black uppercase text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" /> Vivero de Especies & Colección
            </h3>
            <p className="text-xs font-bold text-muted-foreground mt-0.5">
              {PLANT_TYPES.length} árboles únicos para cultivar con concentración. Desbloquea cada especie plantándola y cuidándola.
            </p>
          </div>

          {/* Gamification Progress Badge */}
          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#ffd21c] text-black border-2 border-black rounded-xl text-xs font-black uppercase shadow-[3px_3px_0_0_#000]">
              <Trophy className="w-4 h-4 fill-black stroke-black shrink-0" />
              <span>{unlockedCount} / {PLANT_TYPES.length} Desbloqueadas</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-muted/60 border-2 border-foreground rounded-xl text-xs font-black uppercase shadow-[2px_2px_0_0_hsl(var(--foreground))]">
              <span>🌱 {filteredTypes.length} mostradas</span>
            </div>
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

      {/* Species Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4.5">
        {filteredTypes.map((type) => {
          const isSelected = selectedSpecies === type.id;
          const matchingPlants = plants.filter((p) => p.plant_type === type.id);
          const isUnlocked = matchingPlants.length > 0;
          const completedCount = matchingPlants.filter((p) => p.is_completed).length;

          return (
            <div
              key={type.id}
              onClick={() => {
                ComicAudio.playPop();
                onSelectSpecies(type.id);
              }}
              className={cn(
                "relative bg-card text-foreground rounded-2xl border-4 transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between cursor-pointer group hover:translate-y-[-3px]",
                isUnlocked
                  ? isSelected
                    ? "border-[#ffd21c] shadow-[6px_6px_0_0_#ffd21c] bg-[#ffd21c]/10 ring-2 ring-black"
                    : "border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:shadow-[6px_6px_0_0_#ffd21c] hover:border-amber-400"
                  : isSelected
                  ? "border-[#00E5FF] shadow-[6px_6px_0_0_#00E5FF] bg-muted/30"
                  : "border-foreground/50 opacity-90 shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:border-foreground hover:opacity-100"
              )}
            >
              {/* Selected Marker */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-8 h-8 bg-[#BFFF00] text-black border-3 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_0_#000] z-20">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
              )}

              {/* Status Header: Achievement Unlocked vs Locked */}
              <div className="mb-2">
                {isUnlocked ? (
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black border-2 border-black shadow-[2px_2px_0_0_#000] animate-pulse">
                      <Trophy className="w-3 h-3 fill-black stroke-black shrink-0" />
                      <span className="text-[9px] font-black uppercase tracking-wider">¡Logro Desbloqueado!</span>
                    </div>
                    {completedCount > 0 && (
                      <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                        {completedCount}★
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted border-2 border-foreground/30 text-muted-foreground text-[9px] font-black uppercase">
                      <Lock className="w-2.5 h-2.5 shrink-0" />
                      <span>Especie Bloqueada</span>
                    </div>
                  </div>
                )}

                {/* Badges row: Level Badge + Rarity + Emoji */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-lg border-2 border-black text-[9px] font-black uppercase shadow-[1px_1px_0_0_#000]",
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

                  <span className="text-lg ml-auto">{type.emoji}</span>
                </div>
              </div>

              {/* Illustrated Artwork Showcase with Locked / Unlocked FX */}
              <div
                className={cn(
                  "relative my-2.5 py-3 flex items-center justify-center rounded-xl border-2 transition-transform duration-200 overflow-hidden",
                  isUnlocked
                    ? "border-amber-400/50 group-hover:scale-105"
                    : "border-foreground/30 bg-muted/40"
                )}
                style={{
                  backgroundColor: isUnlocked ? `${type.color}15` : undefined,
                }}
              >
                {!isUnlocked && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-[0.5px] flex flex-col items-center justify-center z-10 p-2">
                    <div className="w-8 h-8 rounded-full bg-background border-2 border-foreground flex items-center justify-center shadow-[2px_2px_0_0_#000] mb-1">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-[9px] font-black uppercase text-foreground/80 bg-background/90 px-2 py-0.5 rounded border border-foreground/30">
                      Sin cultivar
                    </span>
                  </div>
                )}

                <ForestTreeArtwork
                  species={type.id}
                  stage="full"
                  size="md"
                  animated={isUnlocked && type.level >= 5}
                  className={!isUnlocked ? "grayscale contrast-75 opacity-30" : undefined}
                />
              </div>

              {/* Species Name & Lore */}
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center justify-between">
                  <h4 className={cn(
                    "text-base font-black uppercase leading-tight",
                    isUnlocked ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {type.name}
                  </h4>
                </div>

                {/* RPG Difficulty Notch Meter */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-muted-foreground">
                    <span>Dificultad</span>
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
                    : isUnlocked
                    ? "bg-amber-400/20 text-foreground border-foreground/60 hover:border-black hover:bg-amber-400/30"
                    : "bg-muted text-foreground/90 border-foreground/40 hover:border-foreground hover:bg-card"
                )}
              >
                {isSelected ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Seleccionado
                  </>
                ) : isUnlocked ? (
                  <>
                    <Sprout className="w-3.5 h-3.5 text-emerald-600" /> Cultivar Nuevamente
                  </>
                ) : (
                  <>
                    <Sprout className="w-3.5 h-3.5" /> Plantar y Desbloquear
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

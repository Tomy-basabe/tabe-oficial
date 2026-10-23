import React, { useState, useMemo } from "react";
import { PLANT_TYPES, PlantType, Plant } from "@/hooks/useForest";
import { ForestTreeArtwork } from "./ForestTreeArtwork";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { Sprout, Check, Info, Trophy, Lock, Clock, Award, Layers } from "lucide-react";
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

  const LEVEL_TABS = [
    { id: "all", label: `Todas (${PLANT_TYPES.length})` },
    { id: 1, label: "Muy Fácil (20-30m)" },
    { id: 2, label: "Fácil (45-60m)" },
    { id: 3, label: "Normal (2-3h)" },
    { id: 4, label: "Difícil (4-6h)" },
    { id: 5, label: "Épico (8-10h)" },
    { id: 6, label: "Legendario (16-24h)" },
  ] as const;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Header with Level & Difficulty Filters + Progress */}
      <div className="bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                Catálogo Botánico
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Vivero de Especies & Colección
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {PLANT_TYPES.length} árboles únicos para cultivar con concentración. Desbloquea cada especie plantándola y cuidándola.
            </p>
          </div>

          {/* Gamification Progress Badge */}
          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs font-medium">
              <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{unlockedCount} / {PLANT_TYPES.length} Desbloqueadas</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium">
              <span>{filteredTypes.length} mostradas</span>
            </span>
          </div>
        </div>

        {/* Level Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-x-auto w-full scrollbar-none">
          {LEVEL_TABS.map((tab) => {
            const isSelected = selectedLevel === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  ComicAudio.playPop();
                  setSelectedLevel(tab.id);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer",
                  isSelected
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Species Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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
                "relative bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between cursor-pointer group",
                isSelected
                  ? "border-emerald-500/80 ring-1 ring-emerald-500 shadow-sm"
                  : isUnlocked
                  ? "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 shadow-xs"
                  : "border-zinc-200/60 dark:border-zinc-800/60 opacity-80 hover:opacity-100 hover:border-zinc-300 dark:hover:border-zinc-700"
              )}
            >
              {/* Selected Marker */}
              {isSelected && (
                <div className="absolute top-3.5 right-3.5 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xs z-20">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}

              {/* Status Header: Achievement Unlocked vs Locked */}
              <div className="mb-2">
                {isUnlocked ? (
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-medium border border-amber-200 dark:border-amber-800/60">
                      <Trophy className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Desbloqueada</span>
                    </span>
                    {completedCount > 0 && (
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {completedCount}x
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-medium border border-zinc-200 dark:border-zinc-700">
                      <Lock className="w-2.5 h-2.5 shrink-0" />
                      <span>Bloqueada</span>
                    </span>
                  </div>
                )}

                {/* Badges row: Level Badge + Rarity */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium border",
                      type.level === 1 && "bg-lime-50 text-lime-700 dark:bg-lime-950/30 dark:text-lime-300 border-lime-200 dark:border-lime-800/60",
                      type.level === 2 && "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60",
                      type.level === 3 && "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
                      type.level === 4 && "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300 border-orange-200 dark:border-orange-800/60",
                      type.level === 5 && "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
                      type.level === 6 && "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border-purple-200 dark:border-purple-800/60"
                    )}
                  >
                    {type.difficultyLabel}
                  </span>

                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 capitalize">
                    {type.rarity}
                  </span>
                </div>
              </div>

              {/* Illustrated Artwork Showcase */}
              <div
                className={cn(
                  "relative my-2.5 py-4 flex items-center justify-center rounded-xl border transition-transform duration-200 overflow-hidden",
                  isUnlocked
                    ? "border-zinc-200/80 dark:border-zinc-700 group-hover:scale-102"
                    : "border-zinc-200/60 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30"
                )}
                style={{
                  backgroundColor: isUnlocked ? `${type.color}15` : undefined,
                }}
              >
                {!isUnlocked && (
                  <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 p-2">
                    <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-xs mb-1">
                      <Lock className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                    <span className="text-[10px] text-zinc-600 dark:text-zinc-300 font-medium">
                      Sin cultivar
                    </span>
                  </div>
                )}

                <ForestTreeArtwork
                  species={type.id}
                  stage="full"
                  size="md"
                  animated={isUnlocked && type.level >= 5}
                  className={!isUnlocked ? "grayscale opacity-30" : undefined}
                />
              </div>

              {/* Species Name & Lore */}
              <div className="space-y-1.5 mt-1">
                <div className="flex items-center justify-between">
                  <h4 className={cn(
                    "text-sm font-semibold truncate",
                    isUnlocked ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"
                  )}>
                    {type.name}
                  </h4>
                </div>

                {/* Difficulty Notch Meter */}
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                    <span>Nivel</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">{type.level}/6</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6].map((step) => {
                      const isFilled = step <= type.level;
                      return (
                        <div
                          key={step}
                          className={cn(
                            "h-1.5 flex-1 rounded-full transition-all",
                            isFilled
                              ? type.level >= 5
                                ? "bg-purple-500"
                                : type.level >= 3
                                ? "bg-amber-400"
                                : "bg-emerald-500"
                              : "bg-zinc-100 dark:bg-zinc-800"
                          )}
                        />
                      );
                    })}
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                  {type.description}
                </p>

                {/* Metrics Card */}
                <div className="mt-2 p-2 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-[10px] text-zinc-700 dark:text-zinc-300 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Tiempo total:</span>
                    <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {type.requiredMinutes >= 60
                        ? `${(type.requiredMinutes / 60).toFixed(1)}h (${type.requiredMinutes}m)`
                        : `${type.requiredMinutes} min`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Velocidad:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{type.speedMultiplierDescription}</span>
                  </div>
                </div>

                <p className="text-[10px] italic text-zinc-400 line-clamp-1 mt-1">
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
                  "mt-3 w-full py-2 rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer",
                  isSelected
                    ? "bg-emerald-600 text-white shadow-xs"
                    : isUnlocked
                    ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
                    : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-xs"
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

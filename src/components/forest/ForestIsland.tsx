import React, { useState, useMemo } from "react";
import { Plant, PLANT_TYPES } from "@/hooks/useForest";
import { ForestTreeArtwork } from "./ForestTreeArtwork";
import { TreeInspectionModal } from "./TreeInspectionModal";
import { ComicBadge } from "@/components/comic/ComicBadge";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { Sun, Moon, Sparkles, Trophy, Calendar, Eye, Compass, Info, CloudSun, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

type TimeRange = "today" | "week" | "month" | "year" | "all";

interface ForestIslandProps {
  plants: Plant[];
  onRemoveDeadPlant?: (plantId: string) => void;
  onPlantNewTree?: () => void;
  studyActivity?: {
    studyMinutesToday: number;
    studyMinutesThisWeek: number;
    totalStudyMinutesAllTime?: number;
  };
}

export const ForestIsland: React.FC<ForestIslandProps> = ({
  plants,
  onRemoveDeadPlant,
  onPlantNewTree,
  studyActivity,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [selectedLevel, setSelectedLevel] = useState<number | "all">("all");
  const [isNightMode, setIsNightMode] = useState<boolean>(false);
  const [inspectedPlant, setInspectedPlant] = useState<Plant | null>(null);

  // Filter plants by the selected time period AND level
  const filteredPlants = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return plants.filter((plant) => {
      const plantTime = new Date(plant.planted_at).getTime();

      // 1. Time range filter
      if (timeRange === "today" && plantTime < todayStart) return false;
      if (timeRange === "week" && plantTime < now.getTime() - 7 * 24 * 60 * 60 * 1000) return false;
      if (timeRange === "month" && plantTime < now.getTime() - 30 * 24 * 60 * 60 * 1000) return false;
      if (timeRange === "year" && plantTime < now.getTime() - 365 * 24 * 60 * 60 * 1000) return false;

      // 2. Level filter
      if (selectedLevel !== "all") {
        const typeInfo = PLANT_TYPES.find((t) => t.id === plant.plant_type);
        if ((typeInfo?.level || 3) !== selectedLevel) return false;
      }

      return true;
    });
  }, [plants, timeRange, selectedLevel]);

  const healthyTrees = filteredPlants.filter((p) => p.is_completed);
  const growingTrees = filteredPlants.filter((p) => p.is_alive && !p.is_completed);
  const deadTrees = filteredPlants.filter((p) => !p.is_alive);

  // Calculate focus minutes based on real study sessions or filtered trees
  const totalStudyMinutes = useMemo(() => {
    if (selectedLevel === "all") {
      if (timeRange === "today" && studyActivity?.studyMinutesToday !== undefined && studyActivity.studyMinutesToday > 0) {
        return studyActivity.studyMinutesToday;
      }
      if (timeRange === "week" && studyActivity?.studyMinutesThisWeek !== undefined && studyActivity.studyMinutesThisWeek > 0) {
        return studyActivity.studyMinutesThisWeek;
      }
      if (timeRange === "all" && studyActivity?.totalStudyMinutesAllTime !== undefined && studyActivity.totalStudyMinutesAllTime > 0) {
        return studyActivity.totalStudyMinutesAllTime;
      }
    }
    return filteredPlants.reduce((acc, p) => {
      const typeInfo = PLANT_TYPES.find((t) => t.id === p.plant_type) || PLANT_TYPES[0];
      return acc + Math.round((p.growth_percentage / 100) * (typeInfo.requiredMinutes || 120));
    }, 0);
  }, [filteredPlants, timeRange, selectedLevel, studyActivity]);

  const successRate = useMemo(() => {
    const totalFinished = healthyTrees.length + deadTrees.length;
    if (totalFinished === 0) return 100;
    return Math.round((healthyTrees.length / totalFinished) * 100);
  }, [healthyTrees.length, deadTrees.length]);

  const LEVEL_FILTERS = [
    { id: "all", label: "Todas las Dificultades", badge: "🌟", color: "hover:bg-[#BFFF00]/20" },
    { id: 1, label: "Muy Fácil", badge: "🍄", color: "hover:bg-lime-400/20" },
    { id: 2, label: "Fácil", badge: "🌻", color: "hover:bg-emerald-400/20" },
    { id: 3, label: "Normal", badge: "🌳", color: "hover:bg-sky-400/20" },
    { id: 4, label: "Difícil", badge: "🌲", color: "hover:bg-amber-400/20" },
    { id: 5, label: "Épico", badge: "🔥", color: "hover:bg-fuchsia-400/20" },
    { id: 6, label: "Legendario", badge: "💎", color: "hover:bg-purple-400/20" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Island Top Bar with Filters and Ambience Switch */}
      <div className="bg-card text-foreground border-4 border-foreground rounded-2xl p-4 shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Time Range Pills (Like Forest App) */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 border-2 border-foreground rounded-xl w-full md:w-auto overflow-x-auto">
            {(
              [
                { id: "today", label: "Hoy" },
                { id: "week", label: "Semana" },
                { id: "month", label: "Mes" },
                { id: "year", label: "Año" },
                { id: "all", label: "Todo" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  ComicAudio.playPop();
                  setTimeRange(t.id);
                }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
                  timeRange === t.id
                    ? "bg-[#BFFF00] text-black border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Ambience & Summary Badges */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2">
              <ComicBadge variant="green" size="sm">
                🌲 {healthyTrees.length} {healthyTrees.length === 1 ? "Árbol" : "Árboles"}
              </ComicBadge>
              <ComicBadge variant="cyan" size="sm">
                ⏱️ {Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}m
              </ComicBadge>
              {deadTrees.length > 0 && (
                <ComicBadge variant="pink" size="sm">
                  💀 {deadTrees.length}
                </ComicBadge>
              )}
            </div>

            {/* Day / Night Theme Button */}
            <button
              onClick={() => {
                ComicAudio.playBoing();
                setIsNightMode(!isNightMode);
              }}
              title={isNightMode ? "Cambiar a Día Soleado" : "Cambiar a Noche Mística"}
              className={cn(
                "w-10 h-10 rounded-xl border-3 border-foreground flex items-center justify-center shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] active:translate-y-[1px] transition-all",
                isNightMode ? "bg-indigo-950 text-amber-300" : "bg-amber-300 text-amber-950"
              )}
            >
              {isNightMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Difficulty Filter Bar with Comic Gaming Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 border-2 border-foreground/40 rounded-xl overflow-x-auto">
          <span className="text-[10px] font-black uppercase text-muted-foreground px-2 whitespace-nowrap">
            Dificultad:
          </span>
          {LEVEL_FILTERS.map((f) => {
            const isSelected = selectedLevel === f.id;
            return (
              <button
                key={f.id}
                onClick={() => {
                  ComicAudio.playPop();
                  setSelectedLevel(f.id);
                }}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1",
                  isSelected
                    ? "bg-foreground text-background border-2 border-foreground shadow-[2px_2px_0_0_#BFFF00]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                )}
              >
                <span>{f.badge}</span>
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* THE ISOMETRIC / 2.5D COMIC FLOATING ISLAND */}
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border-4 border-foreground shadow-[10px_10px_0_0_hsl(var(--foreground))] transition-colors duration-700 min-h-[480px] p-6 lg:p-10 flex flex-col justify-between",
          isNightMode
            ? "bg-gradient-to-b from-[#090d16] via-[#111827] to-[#1e1b4b]"
            : "bg-gradient-to-b from-[#7dd3fc] via-[#bae6fd] to-[#e0f2fe]"
        )}
      >
        {/* Sky Background Elements */}
        {isNightMode ? (
          <>
            {/* Stars & Moon */}
            <div className="absolute top-6 right-10 w-16 h-16 rounded-full bg-amber-200 border-4 border-black shadow-[0_0_30px_rgba(253,230,138,0.4)] flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 opacity-80" />
            </div>
            {/* Twinkling Star Pixels */}
            <div className="absolute top-12 left-16 w-2 h-2 bg-white rounded-full animate-ping opacity-75" />
            <div className="absolute top-24 left-1/3 w-1.5 h-1.5 bg-amber-200 rounded-full animate-pulse" />
            <div className="absolute top-8 left-2/3 w-2 h-2 bg-cyan-200 rounded-full animate-ping" />
            <div className="absolute top-28 right-1/4 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <div className="absolute top-36 left-12 w-1.5 h-1.5 bg-amber-100 rounded-full animate-pulse" />
          </>
        ) : (
          <>
            {/* Comic Golden Sun */}
            <div className="absolute top-6 right-10 w-20 h-20 rounded-full bg-[#FFE600] border-4 border-black shadow-[4px_4px_0_0_#000] flex items-center justify-center animate-spin-slow">
              <Sun className="w-10 h-10 text-black" />
            </div>
            {/* Floating Comic Clouds */}
            <div className="absolute top-10 left-10 flex items-center gap-1 opacity-90 animate-bounce duration-1000">
              <div className="w-16 h-8 bg-white border-3 border-black rounded-full shadow-[3px_3px_0_0_#000]" />
              <div className="w-20 h-10 bg-white border-3 border-black rounded-full shadow-[3px_3px_0_0_#000] -ml-6 -mt-3" />
            </div>
            <div className="absolute top-16 left-1/2 -translate-x-1/2 opacity-70 hidden md:flex items-center">
              <div className="w-24 h-10 bg-white border-3 border-black rounded-full shadow-[3px_3px_0_0_#000]" />
            </div>
          </>
        )}

        {/* Header Ribbon / Island Title */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-card text-foreground border-3 border-foreground rounded-2xl shadow-[4px_4px_0_0_hsl(var(--foreground))]">
            <Compass className="w-5 h-5 text-emerald-500" />
            <span className="font-black uppercase tracking-wider text-sm">
              {timeRange === "today" && "Bosque de Hoy"}
              {timeRange === "week" && "Bosque de Esta Semana"}
              {timeRange === "month" && "Bosque de Este Mes"}
              {timeRange === "year" && "Bosque del Año"}
              {timeRange === "all" && "Bosque Completo"}
            </span>
            <span className="text-xs font-bold text-muted-foreground ml-2">
              ({filteredPlants.length} en este período)
            </span>
          </div>

          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 bg-black/60 text-white border-2 border-black rounded-xl text-xs font-black uppercase backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Tasa de Supervivencia: {successRate}%</span>
          </div>
        </div>

        {/* THE MAIN MEADOW & FLOATING LAND MASS */}
        <div className="relative z-10 my-8 flex-1 flex flex-col items-center justify-center">
          {/* Grassy Island Platform */}
          <div
            className={cn(
              "relative w-full mx-auto transition-all duration-300",
              filteredPlants.length > 50 ? "max-w-6xl" : filteredPlants.length > 25 ? "max-w-5xl" : "max-w-4xl"
            )}
          >
            {/* 3D Earth Base Slices */}
            <div
              className={cn(
                "relative rounded-[40px] border-4 border-black shadow-[0_16px_0_0_#3F2E1E,0_28px_0_0_#2B1E12,12px_36px_0_0_#000] p-4 sm:p-6 md:p-8 transition-colors duration-500",
                isNightMode ? "bg-[#1E3A1A] border-black" : "bg-[#65A30D] border-black"
              )}
            >
              {/* Grass Highlight Border */}
              <div
                className={cn(
                  "absolute inset-x-4 top-2 h-4 rounded-full pointer-events-none opacity-40",
                  isNightMode ? "bg-[#4D7C0F]" : "bg-[#A3E635]"
                )}
              />

              {/* Decorative Flowers and Stepping Stones scattered */}
              <div className="absolute top-4 left-8 text-xs select-none opacity-80">🌼</div>
              <div className="absolute top-6 right-12 text-xs select-none opacity-80">🌸</div>
              <div className="absolute bottom-6 left-16 text-xs select-none opacity-80">🍄</div>
              <div className="absolute bottom-5 right-20 text-xs select-none opacity-80">🌼</div>
              <div className="absolute top-1/2 left-4 text-xs select-none opacity-60">🪨</div>

              {/* TREES DISPLAY GRID */}
              {filteredPlants.length === 0 ? (
                <div className="text-center py-16 px-4 bg-black/15 rounded-3xl border-3 border-dashed border-black/30">
                  <div className="w-16 h-16 mx-auto mb-3 bg-[#BFFF00] border-3 border-black rounded-2xl flex items-center justify-center shadow-[4px_4px_0_0_#000] -rotate-3">
                    <Leaf className="w-8 h-8 text-black" />
                  </div>
                  <h4 className="text-xl font-black uppercase text-white drop-shadow-[2px_2px_0_#000]">
                    Este terreno aún espera por ti
                  </h4>
                  <p className="text-white/90 text-sm font-bold mt-1 max-w-md mx-auto drop-shadow-[1px_1px_0_#000]">
                    No hay árboles plantados en este período ({timeRange}). ¡Comienza una sesión de estudio para que crezca tu primer árbol!
                  </p>
                  {onPlantNewTree && (
                    <button
                      onClick={() => {
                        ComicAudio.playSprout();
                        onPlantNewTree();
                      }}
                      className="mt-5 px-6 py-3 bg-[#BFFF00] hover:bg-[#a6e000] text-black font-black uppercase text-xs rounded-xl border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] transition-all inline-flex items-center gap-2"
                    >
                      🌱 Plantar una semilla aquí
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className={cn(
                    "grid gap-2 sm:gap-2.5 justify-items-center items-end min-h-[220px]",
                    filteredPlants.length > 60
                      ? "grid-cols-5 sm:grid-cols-7 md:grid-cols-10 lg:grid-cols-12"
                      : filteredPlants.length > 25
                      ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10"
                      : "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"
                  )}
                >
                  {filteredPlants.map((plant, index) => {
                    const plantInfo = PLANT_TYPES.find((t) => t.id === plant.plant_type) || PLANT_TYPES[0];
                    return (
                      <div
                        key={plant.id}
                        onClick={() => {
                          ComicAudio.playPop();
                          setInspectedPlant(plant);
                        }}
                        className="group relative flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-125 hover:z-30 active:scale-95"
                      >
                        {/* Clean Comic Tooltip without Nv text */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg border-2 border-white shadow-[3px_3px_0_0_#000] whitespace-nowrap pointer-events-none z-50 flex flex-col items-center gap-0.5">
                          <span>{plantInfo.emoji} {plantInfo.name} ({plant.growth_percentage}%)</span>
                          <span className="text-[9px] text-[#BFFF00] font-mono">
                            {plantInfo.difficultyLabel} · {plantInfo.requiredMinutes}m
                          </span>
                        </div>

                        {/* Difficulty Dot Indicator on Tree */}
                        <div
                          title={plantInfo.difficultyLabel}
                          className={cn(
                            "absolute -top-0.5 -right-0.5 z-20 w-3 h-3 rounded-full border-[1.5px] border-black shadow-[1px_1px_0_0_#000] select-none",
                            plantInfo.level === 1 && "bg-lime-400",
                            plantInfo.level === 2 && "bg-emerald-400",
                            plantInfo.level === 3 && "bg-sky-400",
                            plantInfo.level === 4 && "bg-amber-400",
                            plantInfo.level === 5 && "bg-fuchsia-400",
                            plantInfo.level === 6 && "bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.9)]"
                          )}
                        />

                        {/* Tree Vector Artwork */}
                        <ForestTreeArtwork
                          species={plant.plant_type}
                          growth={plant.growth_percentage}
                          isAlive={plant.is_alive}
                          size={filteredPlants.length > 25 ? "sm" : "md"}
                          animated={false}
                        />

                        {/* Tree Base Marker */}
                        <div className="w-7 h-2 -mt-1 rounded-full bg-black/40 blur-[1px]" />
                      </div>
                    );
                  })}

                  {/* Future empty soil plots to encourage growth */}
                  {filteredPlants.length < 8 &&
                    Array.from({ length: Math.min(4, 8 - filteredPlants.length) }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        onClick={onPlantNewTree}
                        className="flex flex-col items-center justify-center p-2 opacity-60 hover:opacity-100 cursor-pointer group transition-opacity"
                        title="Espacio disponible para tu próximo árbol"
                      >
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-black/60 bg-black/20 flex items-center justify-center group-hover:bg-[#BFFF00]/40 transition-colors">
                          <span className="text-xs font-black text-white drop-shadow-[1px_1px_0_#000]">+</span>
                        </div>
                        <div className="w-8 h-2 rounded-full bg-black/30 mt-1" />
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Island Footer Ribbon with Quick Advice */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-black uppercase text-white drop-shadow-[2px_2px_0_#000] bg-black/40 p-3 rounded-2xl border-2 border-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#BFFF00]" />
            <span>Toca cualquier árbol para ver su certificado de estudio</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[#BFFF00]">🌱 Verde = Completado</span>
            <span className="text-[#FF5C5C]">💀 Gris = Abandonado</span>
          </div>
        </div>
      </div>

      {/* Tree Inspection Modal */}
      <TreeInspectionModal
        plant={inspectedPlant}
        isOpen={!!inspectedPlant}
        onClose={() => setInspectedPlant(null)}
        onRemove={onRemoveDeadPlant}
      />
    </div>
  );
};

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plant, PLANT_TYPES } from "@/hooks/useForest";
import { FOREST_ISLANDS, IslandId } from "@/hooks/forestIslandsData";
import { ForestTreeArtwork } from "./ForestTreeArtwork";
import { TreeInspectionModal } from "./TreeInspectionModal";
import { ForestRetroSky } from "./ForestRetroSky";
import { IslandUnderhang, IslandSurfaceDetails } from "./ForestIslandDetails";
import { ForestIslandScenery } from "./ForestIslandScenery";
import { IslandAmbientLife } from "./IslandAmbientLife";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { Sun,
  Moon,
  
  Compass,
  Info,
  Trees,
  Flame,
  Gamepad2,
  BookOpen,
  Orbit,
  Clock,
  Skull,
  Plus,
  CheckCircle2,
  Shield,
  Layers, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type TimeRange = "today" | "week" | "month" | "year" | "all";

const ISLAND_ICONS: Record<IslandId, React.ComponentType<{ className?: string }>> = {
  classic: Trees,
  pizza: Flame,
  gaming: Gamepad2,
  study: BookOpen,
  cosmic: Orbit,
};

interface ForestIslandProps {
  plants: Plant[];
  onRemoveDeadPlant?: (plantId: string) => void;
  onPlantNewTree?: (islandId?: string) => void;
  studyActivity?: {
    studyMinutesToday: number;
    studyMinutesThisWeek: number;
    totalStudyMinutesAllTime?: number;
  };
  selectedIslandId?: IslandId;
  onSelectIsland?: (islandId: IslandId) => void;
}

export const ForestIsland: React.FC<ForestIslandProps> = ({
  plants,
  onRemoveDeadPlant,
  onPlantNewTree,
  studyActivity,
  selectedIslandId,
  onSelectIsland,
}) => {
  const [localIslandId, setLocalIslandId] = useState<IslandId>(selectedIslandId || "classic");
  const activeIslandId = selectedIslandId || localIslandId;

  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [selectedLevel, setSelectedLevel] = useState<number | "all">("all");
  const [isNightMode, setIsNightMode] = useState<boolean>(false);
  const [inspectedPlant, setInspectedPlant] = useState<Plant | null>(null);

  const currentIsland = useMemo(() => {
    return FOREST_ISLANDS.find((i) => i.id === activeIslandId) || FOREST_ISLANDS[0];
  }, [activeIslandId]);

  const handleIslandChange = (id: IslandId) => {
    ComicAudio.playPop();
    setLocalIslandId(id);
    onSelectIsland?.(id);
  };

  // Filter plants by the active island
  const islandPlants = useMemo(() => {
    return plants.filter((plant) => {
      const plantIsland = plant.island_id || "classic";
      return plantIsland === activeIslandId;
    });
  }, [plants, activeIslandId]);

  // Filter island plants by time period and level
  const filteredPlants = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return islandPlants.filter((plant) => {
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
  }, [islandPlants, timeRange, selectedLevel]);

  const healthyTrees = filteredPlants.filter((p) => p.is_completed);
  const growingTrees = filteredPlants.filter((p) => p.is_alive && !p.is_completed);
  const deadTrees = filteredPlants.filter((p) => !p.is_alive);

  // Calculate focus minutes for the trees in this island
  const totalStudyMinutes = useMemo(() => {
    return filteredPlants.reduce((acc, p) => {
      const typeInfo = PLANT_TYPES.find((t) => t.id === p.plant_type) || PLANT_TYPES[0];
      return acc + Math.round((p.growth_percentage / 100) * (typeInfo.requiredMinutes || 120));
    }, 0);
  }, [filteredPlants]);

  const successRate = useMemo(() => {
    const totalFinished = healthyTrees.length + deadTrees.length;
    if (totalFinished === 0) return 100;
    return Math.round((healthyTrees.length / totalFinished) * 100);
  }, [healthyTrees.length, deadTrees.length]);

  const LEVEL_FILTERS = [
    { id: "all", label: "Todas" },
    { id: 1, label: "Muy Fácil" },
    { id: 2, label: "Fácil" },
    { id: 3, label: "Normal" },
    { id: 4, label: "Difícil" },
    { id: 5, label: "Épico" },
    { id: 6, label: "Legendario" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* 1. SELECTOR DE 5 ISLAS TEMÁTICAS (Estilo Notion / ChatGPT Cards) */}
      <div className="bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs space-y-4">
        {/* Banner de Selección de Mundos */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">5 Ecosistemas</span>
              </div>
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Islas de Concentración
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{currentIsland.tagline}</span>
            </span>
          </div>
        </div>

        {/* Tarjetas de Selección de Isla */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {FOREST_ISLANDS.map((island) => {
            const isSelected = activeIslandId === island.id;
            const countForIsland = plants.filter((p) => (p.island_id || "classic") === island.id).length;
            const IslandIcon = ISLAND_ICONS[island.id] || Compass;

            return (
              <button
                key={island.id}
                type="button"
                onClick={() => handleIslandChange(island.id)}
                className={cn(
                  "relative p-3 rounded-xl border font-normal transition-colors flex flex-col items-start justify-between gap-2 cursor-pointer text-left group active:scale-[0.965]",
                  isSelected
                    ? "border-transparent text-white dark:text-zinc-900 shadow-xs"
                    : "bg-zinc-50/50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-100/60 dark:hover:bg-zinc-800"
                )}
              >
                {isSelected && (
                  <motion.span
                    layoutId="forest-island-card-pill"
                    transition={{ type: "spring", stiffness: 480, damping: 34, mass: 0.7 }}
                    className="absolute inset-0 rounded-xl bg-zinc-900 dark:bg-zinc-100 shadow-xs z-0"
                  />
                )}
                {/* Cabecera de la tarjeta: Icono y Contador */}
                <div className="relative z-10 flex items-center justify-between w-full">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                      isSelected
                        ? "bg-white/10 text-white dark:bg-black/10 dark:text-zinc-900"
                        : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700"
                    )}
                  >
                    <IslandIcon className="w-4 h-4" />
                  </div>
                  <span
                    className={cn(
                      "text-[11px] px-2 py-0.5 rounded-md font-mono font-medium",
                      isSelected
                        ? "bg-white/20 text-white dark:bg-black/10 dark:text-zinc-900"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    {countForIsland}
                  </span>
                </div>

                {/* Nombre de la isla */}
                <div className="relative z-10 w-full">
                  <div className="text-xs sm:text-sm font-semibold truncate leading-tight">
                    {island.name}
                  </div>
                  <div
                    className={cn(
                      "text-[11px] truncate mt-0.5",
                      isSelected ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400 dark:text-zinc-500"
                    )}
                  >
                    {island.id === "pizza" && "Gastronomía"}
                    {island.id === "classic" && "Naturaleza"}
                    {island.id === "gaming" && "Digital"}
                    {island.id === "study" && "Académica"}
                    {island.id === "cosmic" && "Estelar"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Top Bar with Filters and Ambience Switch */}
      <div className="bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Time Range Pills */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl w-full md:w-auto overflow-x-auto scrollbar-none">
            {(
              [
                { id: "today", label: "Hoy" },
                { id: "week", label: "Semana" },
                { id: "month", label: "Mes" },
                { id: "year", label: "Año" },
                { id: "all", label: "Todo" },
              ] as const
            ).map((t) => {
              const isSelected = timeRange === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    ComicAudio.playPop();
                    setTimeRange(t.id);
                  }}
                  className={cn(
                    "relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer active:scale-[0.965]",
                    isSelected
                      ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  )}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="forest-island-timerange-pill"
                      transition={{ type: "spring", stiffness: 520, damping: 36, mass: 0.7 }}
                      className="absolute inset-0 rounded-lg bg-white dark:bg-zinc-900 shadow-xs"
                    />
                  )}
                  <span className="relative z-10">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Ambience & Summary Badges */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end flex-wrap">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <Trees className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {healthyTrees.length} {healthyTrees.length === 1 ? "Árbol" : "Árboles"}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60">
                <Clock className="w-3.5 h-3.5 text-cyan-600" />
                <span>
                  {Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}m
                </span>
              </span>
              {deadTrees.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                  <Skull className="w-3.5 h-3.5 text-rose-600" />
                  <span>{deadTrees.length}</span>
                </span>
              )}
            </div>

            {/* Day / Night Theme Button */}
            <button
              onClick={() => {
                ComicAudio.playBoing();
                setIsNightMode(!isNightMode);
              }}
              title={isNightMode ? "Cambiar a Día Soleado" : "Cambiar a Noche Mística"}
              className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300"
            >
              {isNightMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            </button>
          </div>
        </div>

        {/* Difficulty Filter Bar */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 px-1 whitespace-nowrap">
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
                  "relative px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer active:scale-[0.965]",
                  isSelected
                    ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                {isSelected && (
                  <motion.span
                    layoutId="forest-island-level-pill"
                    transition={{ type: "spring", stiffness: 520, damping: 36, mass: 0.7 }}
                    className="absolute inset-0 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 shadow-xs"
                  />
                )}
                <span className={cn("relative z-10", isSelected && "text-white dark:text-zinc-900 font-semibold")}>{f.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. THE ISOMETRIC / 2.5D FLOATING ISLAND WITH DYNAMIC THEME */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs transition-colors duration-700 min-h-[480px] p-6 lg:p-10 flex flex-col justify-between bg-gradient-to-b",
          isNightMode ? currentIsland.skyNight : currentIsland.skyDay
        )}
      >
        {/* Sky Background Elements - Retro Pixel Animated Sky */}
        <ForestRetroSky isNightMode={isNightMode} currentIsland={currentIsland} />

        {/* Header Ribbon / Island Title */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pr-24 sm:pr-28">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl shadow-xs">
            {React.createElement(ISLAND_ICONS[currentIsland.id] || Compass, { className: "w-4 h-4 text-emerald-600 dark:text-emerald-400" })}
            <span className="font-semibold text-xs sm:text-sm">
              {currentIsland.name} • {timeRange === "today" ? "Hoy" : timeRange === "week" ? "Semana" : timeRange === "month" ? "Mes" : timeRange === "year" ? "Año" : "Todo"}
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 ml-1">
              ({filteredPlants.length} árboles)
            </span>
          </div>

          {/* Badge de Tasa de Supervivencia */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 dark:bg-black/80 text-white border border-zinc-700 rounded-xl text-xs font-medium backdrop-blur-md shadow-xs">
            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>Supervivencia: {successRate}%</span>
          </div>
        </div>

        {/* THE MAIN MEADOW & FLOATING LAND MASS */}
        <div className="relative z-10 my-8 flex-1 flex flex-col items-center justify-center">
          {/* Island Platform */}
          <div
            className={cn(
              "relative w-full mx-auto transition-all duration-300 pb-10 sm:pb-14",
              filteredPlants.length > 50 ? "max-w-6xl" : filteredPlants.length > 25 ? "max-w-5xl" : "max-w-4xl"
            )}
          >
            {/* 3D Earth Base Slices with Theme Colors */}
            <div
              className={cn(
                "relative rounded-[36px] border-2 border-black/40 p-4 sm:p-6 md:p-8 transition-colors duration-500",
                isNightMode ? currentIsland.groundNight : currentIsland.groundDay,
                isNightMode ? currentIsland.crustShadowNight : currentIsland.crustShadowDay
              )}
            >
              {/* Surface Highlight Rim */}
              <div
                className={cn(
                  "absolute inset-x-4 top-2 h-4 rounded-full pointer-events-none opacity-40",
                  isNightMode ? currentIsland.groundHighlightNight : currentIsland.groundHighlightDay
                )}
              />

              {/* Detailed Surface Texture Elements */}
              <IslandSurfaceDetails islandId={activeIslandId} isNightMode={isNightMode} />

              {/* Permanent Scenery Props */}
              <ForestIslandScenery islandId={activeIslandId} isNightMode={isNightMode} />

              {/* Motor de Vida Ambiental & Sprites Animados Pasivos por Isla */}
              <IslandAmbientLife activeIslandId={activeIslandId} />

              {/* TREES DISPLAY GRID */}
              {filteredPlants.length === 0 ? (
                <div className="relative py-12 px-4 flex flex-col items-center justify-center text-center z-10">
                  {/* Banner Central de Reino Activo */}
                  <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-lg max-w-md mx-auto flex flex-col items-center">
                    <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-center mb-3">
                      {React.createElement(ISLAND_ICONS[currentIsland.id] || Compass, { className: "w-7 h-7 text-emerald-600 dark:text-emerald-400" })}
                    </div>
                    <h4 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                      {currentIsland.name} sin árboles aún
                    </h4>
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                      {currentIsland.emptyStateAdvice}
                    </p>

                    {/* Parcelas de cultivo listas */}
                    <div className="flex items-center justify-center gap-2.5 my-4">
                      {[1, 2, 3, 4].map((slot) => (
                        <div
                          key={slot}
                          onClick={() => onPlantNewTree?.(activeIslandId)}
                          className="w-10 h-10 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-100/50 dark:bg-zinc-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-500 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105"
                          title="Toca para plantar aquí"
                        >
                          <Plus className="w-4 h-4 text-zinc-400 hover:text-emerald-600" />
                        </div>
                      ))}
                    </div>

                    {onPlantNewTree && (
                      <button
                        type="button"
                        onClick={() => {
                          ComicAudio.playSprout();
                          onPlantNewTree(activeIslandId);
                        }}
                        className="mt-1 px-5 py-2.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-medium text-xs sm:text-sm rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-emerald-500" />
                        <span>Plantar Primera Semilla</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <motion.div
                  layout
                  className={cn(
                    "grid gap-2 sm:gap-2.5 justify-items-center items-end min-h-[220px]",
                    filteredPlants.length > 60
                      ? "grid-cols-5 sm:grid-cols-7 md:grid-cols-10 lg:grid-cols-12"
                      : filteredPlants.length > 25
                      ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10"
                      : "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"
                  )}
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {filteredPlants.map((plant) => {
                      const plantInfo = PLANT_TYPES.find((t) => t.id === plant.plant_type) || PLANT_TYPES[0];
                      return (
                        <motion.div
                          layout
                          key={plant.id}
                          initial={{ opacity: 0, scale: 0.65, filter: "blur(4px)" }}
                          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                          exit={{
                            opacity: 0,
                            scale: 0.55,
                            filter: "blur(4px)",
                            transition: { duration: 0.18, ease: [0.32, 0, 0.67, 0] },
                          }}
                          transition={{
                            layout: { type: "spring", stiffness: 360, damping: 28, mass: 0.7 },
                            duration: 0.22,
                          }}
                          onClick={() => {
                            ComicAudio.playPop();
                            setInspectedPlant(plant);
                          }}
                          className="island-tree-node group relative flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-125 hover:z-30 active:scale-95"
                        >
                          {/* Notion Style Tooltip */}
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg border border-zinc-700 shadow-md whitespace-nowrap pointer-events-none z-50 flex flex-col items-center gap-0.5">
                            <span>{plantInfo.name} ({plant.growth_percentage}%)</span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {plantInfo.difficultyLabel} • {plantInfo.requiredMinutes}m
                            </span>
                          </div>

                          {/* Difficulty Dot Indicator on Tree */}
                          <div
                            title={plantInfo.difficultyLabel}
                            className={cn(
                              "absolute -top-0.5 -right-0.5 z-20 w-2.5 h-2.5 rounded-full border border-white shadow-xs select-none",
                              plantInfo.level === 1 && "bg-lime-400",
                              plantInfo.level === 2 && "bg-cyan-400",
                              plantInfo.level === 3 && "bg-amber-400",
                              plantInfo.level === 4 && "bg-orange-400",
                              plantInfo.level === 5 && "bg-rose-400",
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

                          {/* Tree Base Shadow */}
                          <div className="w-7 h-2 -mt-1 rounded-full bg-black/40 blur-[1px]" />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Future empty soil plots to encourage growth */}
                  {filteredPlants.length < 8 &&
                    Array.from({ length: Math.min(4, 8 - filteredPlants.length) }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        onClick={() => onPlantNewTree?.(activeIslandId)}
                        className="flex flex-col items-center justify-center p-2 opacity-60 hover:opacity-100 cursor-pointer group transition-opacity"
                        title={`Espacio disponible para plantar en ${currentIsland.name}`}
                      >
                        <div className="w-9 h-9 rounded-full border border-dashed border-white/60 bg-black/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                          <Plus className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="w-7 h-2 rounded-full bg-black/30 mt-1" />
                      </div>
                    ))}
                </motion.div>
              )}

              {/* Hanging Underhang Details */}
              <IslandUnderhang islandId={activeIslandId} isNightMode={isNightMode} />
            </div>
          </div>
        </div>

        {/* Island Footer Ribbon with Quick Advice */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium text-white/90 bg-black/60 p-3 rounded-xl border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-400" />
            <span>Toca cualquier árbol para ver su detalle o gestionarlo</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              Completado
            </span>
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" />
              Marchito
            </span>
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

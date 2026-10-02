import React, { useState, useMemo } from "react";
import { Plant, PLANT_TYPES } from "@/hooks/useForest";
import { FOREST_ISLANDS, IslandId, IslandTheme } from "@/hooks/forestIslandsData";
import { ForestTreeArtwork } from "./ForestTreeArtwork";
import { TreeInspectionModal } from "./TreeInspectionModal";
import { ForestRetroSky } from "./ForestRetroSky";
import { IslandUnderhang, IslandSurfaceDetails } from "./ForestIslandDetails";
import { ForestIslandScenery } from "./ForestIslandScenery";
import { IslandAmbientLife } from "./IslandAmbientLife";
import { ComicBadge } from "@/components/comic/ComicBadge";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { Sun, Moon, Sparkles, Compass, Info, Leaf, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type TimeRange = "today" | "week" | "month" | "year" | "all";

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
    { id: "all", label: "Todas las Dificultades", badge: "🌟" },
    { id: 1, label: "Muy Fácil", badge: "🍄" },
    { id: 2, label: "Fácil", badge: "🌻" },
    { id: 3, label: "Normal", badge: "🌳" },
    { id: 4, label: "Difícil", badge: "🌲" },
    { id: 5, label: "Épico", badge: "🔥" },
    { id: 6, label: "Legendario", badge: "💎" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* 1. SELECTOR DE 5 ISLAS TEMÁTICAS (Estilo World Select Arcade) */}
      <div className="bg-card text-foreground border-4 border-foreground rounded-3xl p-4 sm:p-5 shadow-[8px_8px_0_0_hsl(var(--foreground))] space-y-4">
        {/* Banner de Selección de Mundos */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b-2 border-foreground/20">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FFE600] border-3 border-black flex items-center justify-center shadow-[3px_3px_0_0_#000] -rotate-3 shrink-0">
              <Compass className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#BFFF00] bg-black px-2 py-0.5 rounded-md border border-black shadow-[1px_1px_0_0_#000]">
                  World Select · 5 Mundos
                </span>
                <span className="text-xs font-bold text-muted-foreground hidden md:inline">
                  Archipiélago de Estudio TABE
                </span>
              </div>
              <h2 className="font-display font-black text-lg sm:text-xl md:text-2xl uppercase tracking-wider text-foreground">
                Archipiélago de Estudio • 5 Islas Temáticas
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#BFFF00] text-black border-2 border-black rounded-xl font-black text-xs uppercase shadow-[2px_2px_0_0_#000]">
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>{currentIsland.tagline}</span>
            </div>
          </div>
        </div>

        {/* Tarjetas de Selección de Isla (Grandes, claras y legibles) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
          {FOREST_ISLANDS.map((island) => {
            const isSelected = activeIslandId === island.id;
            const countForIsland = plants.filter((p) => (p.island_id || "classic") === island.id).length;
            return (
              <button
                key={island.id}
                type="button"
                onClick={() => handleIslandChange(island.id)}
                className={cn(
                  "p-3 sm:p-4 rounded-2xl border-3 sm:border-4 font-black transition-all flex flex-col items-center justify-between gap-2.5 cursor-pointer relative text-left group",
                  isSelected
                    ? "bg-[#BFFF00] text-black border-black shadow-[5px_5px_0_0_#000] scale-[1.03] ring-2 ring-black"
                    : "bg-muted/40 text-foreground border-foreground/30 hover:border-foreground hover:bg-muted/80 hover:translate-y-[-2px] active:translate-y-[1px] shadow-[2px_2px_0_0_hsl(var(--foreground)/30)]"
                )}
              >
                {/* Cabecera de la tarjeta: Emoji y Contador */}
                <div className="flex items-center justify-between w-full">
                  <span className="text-3xl sm:text-4xl filter drop-shadow-[2px_2px_0_rgba(0,0,0,0.4)] group-hover:scale-110 transition-transform">
                    {island.emoji}
                  </span>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border-2 border-black font-mono font-black shadow-[1px_1px_0_0_#000]",
                      isSelected ? "bg-black text-white" : "bg-card text-foreground"
                    )}
                  >
                    {countForIsland} {countForIsland === 1 ? "árbol" : "árboles"}
                  </span>
                </div>

                {/* Nombre de la isla (Grande y muy legible) */}
                <div className="w-full text-center">
                  <div className="text-sm sm:text-base font-black uppercase tracking-wide truncate">
                    {island.name}
                  </div>
                  <div className={cn(
                    "text-[11px] font-bold truncate mt-0.5",
                    isSelected ? "text-black/80" : "text-muted-foreground"
                  )}>
                    {island.id === "pizza" && "Masa & Mozzarella"}
                    {island.id === "classic" && "Bosque Silvestre"}
                    {island.id === "gaming" && "Arcade & Neón"}
                    {island.id === "study" && "Roble & Biblioteca"}
                    {island.id === "cosmic" && "Gravedad Cero"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Top Bar with Filters and Ambience Switch */}
      <div className="bg-card text-foreground border-4 border-foreground rounded-2xl p-4 shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Time Range Pills */}
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
                  "px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
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
                "w-10 h-10 rounded-xl border-3 border-foreground flex items-center justify-center shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] active:translate-y-[1px] transition-all cursor-pointer",
                isNightMode ? "bg-indigo-950 text-amber-300" : "bg-amber-300 text-amber-950"
              )}
            >
              {isNightMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Difficulty Filter Bar */}
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
                  "px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer",
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

      {/* 3. THE ISOMETRIC / 2.5D COMIC FLOATING ISLAND WITH DYNAMIC THEME */}
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border-4 border-foreground shadow-[10px_10px_0_0_hsl(var(--foreground))] transition-colors duration-700 min-h-[480px] p-6 lg:p-10 flex flex-col justify-between bg-gradient-to-b",
          isNightMode ? currentIsland.skyNight : currentIsland.skyDay
        )}
      >
        {/* Sky Background Elements - Retro Pixel Animated Sky */}
        <ForestRetroSky isNightMode={isNightMode} currentIsland={currentIsland} />

        {/* Header Ribbon / Island Title - Con padding derecho amplio (pr-24 sm:pr-28) para despejar el Sol / Luna */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pr-24 sm:pr-28">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-card text-foreground border-3 border-foreground rounded-2xl shadow-[4px_4px_0_0_hsl(var(--foreground))]">
            <span className="text-lg">{currentIsland.emoji}</span>
            <span className="font-black uppercase tracking-wider text-xs sm:text-sm">
              {currentIsland.name} • {timeRange === "today" ? "Hoy" : timeRange === "week" ? "Semana" : timeRange === "month" ? "Mes" : timeRange === "year" ? "Año" : "Todo"}
            </span>
            <span className="text-[11px] font-bold text-muted-foreground ml-1">
              ({filteredPlants.length} árboles)
            </span>
          </div>

          {/* Badge de Tasa de Supervivencia: Ubicado a la izquierda del Sol / Luna sin superponerse */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/75 text-white border-2 border-black rounded-xl text-xs font-black uppercase backdrop-blur-sm shadow-[2px_2px_0_0_#000]">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
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
                "relative rounded-[40px] border-4 border-black p-4 sm:p-6 md:p-8 transition-colors duration-500",
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

              {/* Permanent 3D Comic Scenery Props (Never empty!) */}
              <ForestIslandScenery islandId={activeIslandId} isNightMode={isNightMode} />

              {/* Motor de Vida Ambiental & Sprites Animados Pasivos por Isla */}
              <IslandAmbientLife activeIslandId={activeIslandId} />

              {/* Thematic Surface Decorations (Toppings, Gemstones, Scrolls, etc.) */}
              {currentIsland.decorations.map((deco, idx) => (
                <div
                  key={idx}
                  title={deco.label}
                  className={cn("absolute select-none pointer-events-none", deco.className)}
                >
                  {deco.emoji}
                </div>
              ))}

              {/* TREES DISPLAY GRID */}
              {filteredPlants.length === 0 ? (
                <div className="relative py-12 px-4 flex flex-col items-center justify-center text-center z-10">
                  {/* Banner Central de Reino Activo */}
                  <div className="bg-black/85 backdrop-blur-md p-6 sm:p-8 rounded-3xl border-4 border-black shadow-[8px_8px_0_0_#000] max-w-lg mx-auto flex flex-col items-center">
                    <div className="w-20 h-20 bg-[#BFFF00] border-4 border-black rounded-2xl flex items-center justify-center shadow-[4px_4px_0_0_#000] -rotate-6 text-4xl mb-3">
                      {currentIsland.emoji}
                    </div>
                    <h4 className="text-xl sm:text-2xl font-black uppercase text-[#BFFF00] tracking-wide" style={{ WebkitTextStroke: "1px black" }}>
                      ¡{currentIsland.name} Lista para Florecer!
                    </h4>
                    <p className="text-white text-xs sm:text-sm font-bold mt-2 leading-relaxed">
                      {currentIsland.emptyStateAdvice}
                    </p>

                    {/* Parcelas de cultivo listas */}
                    <div className="flex items-center justify-center gap-3 my-4">
                      {[1, 2, 3, 4].map((slot) => (
                        <div
                          key={slot}
                          onClick={() => onPlantNewTree?.(activeIslandId)}
                          className="w-12 h-12 rounded-xl border-3 border-dashed border-[#BFFF00]/70 bg-white/10 hover:bg-[#BFFF00]/30 hover:border-[#BFFF00] flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-110 group"
                          title="Toca para plantar aquí"
                        >
                          <span className="text-base text-[#BFFF00] font-black group-hover:scale-125 transition-transform">+</span>
                          <span className="text-[8px] font-mono text-white/70">#{slot}</span>
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
                        className="mt-2 px-6 py-3.5 bg-[#BFFF00] hover:bg-[#a6e000] text-black font-black uppercase text-xs sm:text-sm rounded-xl border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] active:translate-y-[1px] transition-all inline-flex items-center gap-2.5 cursor-pointer"
                      >
                        <span>🌱 Plantar Primera Semilla</span>
                      </button>
                    )}
                  </div>
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
                  {filteredPlants.map((plant) => {
                    const plantInfo = PLANT_TYPES.find((t) => t.id === plant.plant_type) || PLANT_TYPES[0];
                    return (
                      <div
                        key={plant.id}
                        onClick={() => {
                          ComicAudio.playPop();
                          setInspectedPlant(plant);
                        }}
                        className="island-tree-node group relative flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-125 hover:z-30 active:scale-95"
                      >
                        {/* Clean Comic Tooltip */}
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

                        {/* Tree Base Shadow */}
                        <div className="w-7 h-2 -mt-1 rounded-full bg-black/40 blur-[1px]" />
                      </div>
                    );
                  })}

                  {/* Future empty soil plots to encourage growth */}
                  {filteredPlants.length < 8 &&
                    Array.from({ length: Math.min(4, 8 - filteredPlants.length) }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        onClick={() => onPlantNewTree?.(activeIslandId)}
                        className="flex flex-col items-center justify-center p-2 opacity-60 hover:opacity-100 cursor-pointer group transition-opacity"
                        title={`Espacio disponible para plantar en ${currentIsland.name}`}
                      >
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-black/60 bg-black/20 flex items-center justify-center group-hover:bg-[#BFFF00]/40 transition-colors">
                          <span className="text-xs font-black text-white drop-shadow-[1px_1px_0_#000]">+</span>
                        </div>
                        <div className="w-8 h-2 rounded-full bg-black/30 mt-1" />
                      </div>
                    ))}
                </div>
              )}

              {/* Hanging Underhang Details (Cheese drips, hanging roots, cyber cables, bookmark ribbons, floating asteroids) */}
              <IslandUnderhang islandId={activeIslandId} isNightMode={isNightMode} />
            </div>
          </div>
        </div>

        {/* Island Footer Ribbon with Quick Advice */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-black uppercase text-white drop-shadow-[2px_2px_0_#000] bg-black/50 p-3 rounded-2xl border-2 border-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#BFFF00]" />
            <span>Toca cualquier árbol para ver su certificado o eliminarlo</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[#BFFF00]">🌱 Verde = Completado</span>
            <span className="text-[#FF5C5C]">💀 Gris = Marchito</span>
          </div>
        </div>
      </div>

      {/* Tree Inspection Modal (Allows inspection and quick deletion of any plant) */}
      <TreeInspectionModal
        plant={inspectedPlant}
        isOpen={!!inspectedPlant}
        onClose={() => setInspectedPlant(null)}
        onRemove={onRemoveDeadPlant}
      />
    </div>
  );
};

import React, { useState, useMemo } from "react";
import { useForest } from "@/hooks/useForest";
import { FOREST_ISLANDS, IslandId } from "@/hooks/forestIslandsData";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ForestIsland } from "@/components/forest/ForestIsland";
import { ForestFocusStage } from "@/components/forest/ForestFocusStage";
import { ForestSpeciesNursery } from "@/components/forest/ForestSpeciesNursery";
import { ForestTimelineStats } from "@/components/forest/ForestTimelineStats";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { TreeDeciduous,
  Sprout,
  Compass,
  BarChart3,
  Plus,
  
  Flame,
  Info,
  Trees,
  Gamepad2,
  BookOpen,
  Orbit,
  Layers,
  Clock,
  Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ForestTreeArtwork } from "@/components/forest/ForestTreeArtwork";
import { cn } from "@/lib/utils";

type ForestTab = "island" | "active" | "nursery" | "stats";

export const ISLAND_ICONS: Record<IslandId, React.ComponentType<{ className?: string }>> = {
  classic: Trees,
  pizza: Flame,
  gaming: Gamepad2,
  study: BookOpen,
  cosmic: Orbit,
};

const MODAL_LEVEL_FILTERS = [
  { id: "all", label: "Todas" },
  { id: 1, label: "Muy Fácil" },
  { id: 2, label: "Fácil" },
  { id: 3, label: "Normal" },
  { id: 4, label: "Difícil" },
  { id: 5, label: "Épico" },
  { id: 6, label: "Legendario" },
] as const;

export default function Forest() {
  const {
    plants,
    currentPlant,
    studyActivity,
    forestStats,
    loading,
    plantNewTree,
    removeDeadPlant,
    abandonPlant,
    waterPlantWithStudy,
    plantTypes,
  } = useForest();

  const [activeTab, setActiveTab] = useState<ForestTab>("island");
  const [activeIslandId, setActiveIslandId] = useState<IslandId>("classic");
  const [targetIslandForPlant, setTargetIslandForPlant] = useState<IslandId>("classic");
  const [selectedPlantType, setSelectedPlantType] = useState<string>("oak");
  const [isPlantModalOpen, setIsPlantModalOpen] = useState<boolean>(false);
  const [modalFilterLevel, setModalFilterLevel] = useState<number | "all">("all");

  const modalFilteredPlantTypes = useMemo(() => {
    if (modalFilterLevel === "all") return plantTypes;
    return plantTypes.filter((t) => (t.level || 1) === modalFilterLevel);
  }, [plantTypes, modalFilterLevel]);

  const selectedTypeInfo = useMemo(() => {
    return plantTypes.find((t) => t.id === selectedPlantType) || plantTypes[0];
  }, [plantTypes, selectedPlantType]);

  const handleConfirmPlant = (typeId?: string, islandId?: IslandId) => {
    const toPlant = typeId || selectedPlantType;
    const island = islandId || targetIslandForPlant || activeIslandId;
    ComicAudio.playSprout();
    plantNewTree(toPlant, island);
    setIsPlantModalOpen(false);
    setActiveIslandId(island);
    setActiveTab("active");
  };

  if (loading) {
    return (
      <LoadingScreen
        message="Cargando tu Bosque..."
        submessage="Cultivando tus árboles con tu esfuerzo..."
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* HEADER HERO BANNER */}
      <div className="bg-white dark:bg-[#212121] rounded-2xl p-6 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 rounded-xl flex items-center justify-center shrink-0">
            <TreeDeciduous className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            {forestStats.hasActivePlant && (
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/60">
                  <Sprout className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                  Árbol en Crecimiento
                </span>
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Mi Bosque de Estudio
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-normal text-xs sm:text-sm mt-0.5 max-w-xl">
              Planta árboles con sesiones de concentración y haz crecer tu ecosistema de productividad académica.
            </p>
          </div>
        </div>

        {/* Quick Plant Button */}
        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => {
              ComicAudio.playSprout();
              setTargetIslandForPlant(activeIslandId);
              setIsPlantModalOpen(true);
            }}
            disabled={forestStats.hasActivePlant}
            className="w-full md:w-auto px-4 py-2.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-medium text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Plantar Semilla</span>
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl overflow-x-auto scrollbar-none">
        {[
          { id: "island", label: "El Bosque (5 Islas)", icon: Compass },
          {
            id: "active",
            label: currentPlant ? `Árbol Activo (${currentPlant.growth_percentage}%)` : "Árbol Activo",
            icon: Sprout,
          },
          { id: "nursery", label: "Vivero de Especies", icon: Sprout },
          { id: "stats", label: "Estadísticas y Registro", icon: BarChart3 },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                ComicAudio.playPop();
                setActiveTab(tab.id as ForestTab);
              }}
              className={cn(
                "flex-1 min-w-[140px] sm:min-w-fit px-3.5 py-2 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer",
                isActive
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT VIEWS */}
      {activeTab === "island" && (
        <div className="tour-forest-tree">
          <ForestIsland
            plants={plants}
            studyActivity={studyActivity}
            onRemoveDeadPlant={removeDeadPlant}
            selectedIslandId={activeIslandId}
            onSelectIsland={setActiveIslandId}
            onPlantNewTree={(islandId) => {
              if (islandId) setTargetIslandForPlant(islandId as IslandId);
              setIsPlantModalOpen(true);
            }}
          />
        </div>
      )}

      {activeTab === "active" && (
        <ForestFocusStage
          currentPlant={currentPlant}
          studyActivity={studyActivity}
          onPlantNewTree={() => setIsPlantModalOpen(true)}
          onAbandonPlant={abandonPlant}
          onRemoveDeadPlant={removeDeadPlant}
          onWaterWithStudy={waterPlantWithStudy}
        />
      )}

      {activeTab === "nursery" && (
        <ForestSpeciesNursery
          selectedSpecies={selectedPlantType}
          onSelectSpecies={setSelectedPlantType}
          hasActivePlant={forestStats.hasActivePlant}
          onConfirmPlant={() => handleConfirmPlant(selectedPlantType)}
          plants={plants}
        />
      )}

      {activeTab === "stats" && (
        <ForestTimelineStats
          plants={plants}
          studyActivity={studyActivity}
          onRemoveDeadPlant={removeDeadPlant}
        />
      )}

      {/* MODAL: PLANT NEW SEED DIALOG (NOTION / CHATGPT CLEAN STYLE) */}
      <Dialog open={isPlantModalOpen} onOpenChange={setIsPlantModalOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl rounded-2xl p-6 sm:p-7 flex flex-col gap-5">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 rounded-xl flex items-center justify-center shrink-0">
                  <Sprout className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Plantar Nuevo Árbol
                  </DialogTitle>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Selecciona una especie y la isla destino para iniciar tu ciclo de concentración.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                {modalFilteredPlantTypes.length} especies
              </span>
            </div>
          </DialogHeader>

          {/* Selector de Isla Destino (5 Islas con iconos propios) */}
          <div className="space-y-2 p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-zinc-500" />
                <span>Isla Destino:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {FOREST_ISLANDS.find((i) => i.id === targetIslandForPlant)?.name}
                </span>
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden sm:inline">
                Elige la isla donde echará raíces
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-0.5">
              {FOREST_ISLANDS.map((island) => {
                const isSelected = targetIslandForPlant === island.id;
                const IslandIcon = ISLAND_ICONS[island.id] || Compass;
                return (
                  <button
                    key={island.id}
                    type="button"
                    onClick={() => {
                      ComicAudio.playPop();
                      setTargetIslandForPlant(island.id);
                    }}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer",
                      isSelected
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs"
                        : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                    )}
                  >
                    <IslandIcon className="w-3.5 h-3.5" />
                    <span className="truncate">{island.shortName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl overflow-x-auto w-full scrollbar-none">
            {MODAL_LEVEL_FILTERS.map((lvl) => {
              const isLvlActive = modalFilterLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    ComicAudio.playPop();
                    setModalFilterLevel(lvl.id);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer",
                    isLvlActive
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  )}
                >
                  <span>{lvl.label}</span>
                </button>
              );
            })}
          </div>

          {/* Species Selector Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[48vh] overflow-y-auto pr-1">
            {modalFilteredPlantTypes.map((type) => {
              const isSelected = selectedPlantType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    ComicAudio.playPop();
                    setSelectedPlantType(type.id);
                  }}
                  className={cn(
                    "p-3 rounded-xl border transition-all flex flex-col items-center justify-between gap-2 cursor-pointer relative text-left group",
                    isSelected
                      ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/80 ring-1 ring-emerald-500 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  )}
                >
                  {/* Top Level Tag */}
                  <div className="w-full flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-medium border",
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
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                  </div>

                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-lg my-1 group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: `${type.color}15` }}
                  >
                    <ForestTreeArtwork species={type.id} stage="full" size="md" animated={type.level >= 5} />
                  </div>

                  <span className="text-xs font-medium text-center leading-tight truncate w-full text-zinc-900 dark:text-zinc-100">
                    {type.name}
                  </span>

                  <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 w-full">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    <span>
                      {type.requiredMinutes >= 60
                        ? `${(type.requiredMinutes / 60).toFixed(1)}h`
                        : `${type.requiredMinutes}m`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Species Summary Card */}
          {selectedTypeInfo && (
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <ForestTreeArtwork species={selectedTypeInfo.id} stage="full" size="sm" animated={false} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{selectedTypeInfo.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-200/70 dark:bg-zinc-700/70 text-zinc-700 dark:text-zinc-300">
                      {selectedTypeInfo.difficultyLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{selectedTypeInfo.description}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold font-mono text-emerald-600 dark:text-emerald-400">{selectedTypeInfo.requiredMinutes} min</p>
                <p className="text-[10px] text-zinc-400">tiempo objetivo</p>
              </div>
            </div>
          )}

          <DialogFooter className="mt-1 flex flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsPlantModalOpen(false)}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200/70 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 font-medium text-xs rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleConfirmPlant(selectedPlantType, targetIslandForPlant)}
              className="px-5 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sprout className="w-4 h-4 text-emerald-500" />
              <span>
                Plantar {selectedTypeInfo?.name || "Semilla"} en {FOREST_ISLANDS.find((i) => i.id === targetIslandForPlant)?.shortName || "Isla"}
              </span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

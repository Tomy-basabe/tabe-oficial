import React, { useState, useMemo } from "react";
import { useForest } from "@/hooks/useForest";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ForestIsland } from "@/components/forest/ForestIsland";
import { ForestFocusStage } from "@/components/forest/ForestFocusStage";
import { ForestSpeciesNursery } from "@/components/forest/ForestSpeciesNursery";
import { ForestTimelineStats } from "@/components/forest/ForestTimelineStats";
import { ComicBadge } from "@/components/comic/ComicBadge";
import { ComicAudio } from "@/components/comic/ComicAudio";
import {
  TreeDeciduous,
  Sprout,
  Compass,
  BarChart3,
  Plus,
  Sparkles,
  Flame,
  Info,
} from "lucide-react";
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

const MODAL_LEVEL_FILTERS = [
  { id: "all", label: "Todas", emoji: "🌟" },
  { id: 1, label: "Muy Fácil", emoji: "🍄" },
  { id: 2, label: "Fácil", emoji: "🌻" },
  { id: 3, label: "Normal", emoji: "🌳" },
  { id: 4, label: "Difícil", emoji: "🌲" },
  { id: 5, label: "Épico", emoji: "🔥" },
  { id: 6, label: "Legendario", emoji: "💎" },
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

  const handleConfirmPlant = (typeId?: string) => {
    const toPlant = typeId || selectedPlantType;
    ComicAudio.playSprout();
    plantNewTree(toPlant);
    setIsPlantModalOpen(false);
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
      {/* HEADER HERO BANNER (Gaming Comic Style) */}
      <div className="bg-[#1B4332] rounded-3xl p-6 sm:p-8 border-4 border-black shadow-[8px_8px_0_0_#000] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#BFFF00] opacity-15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4 sm:gap-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#BFFF00] border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#000] flex items-center justify-center -rotate-6 shrink-0">
            <TreeDeciduous className="w-9 h-9 sm:w-11 sm:h-11 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ComicBadge variant="green" size="sm">
                Focus Forest • TABE
              </ComicBadge>
              {forestStats.hasActivePlant && (
                <ComicBadge variant="cyan" size="sm">
                  🌱 Árbol en Crecimiento
                </ComicBadge>
              )}
            </div>
            <h1
              className="font-display text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-wider text-[#BFFF00]"
              style={{ WebkitTextStroke: "1px black" }}
            >
              Mi Bosque de Estudio
            </h1>
            <p className="text-[#BFFF00]/90 font-bold text-xs sm:text-sm mt-0.5 max-w-xl">
              Inspirado en Forest App: planta árboles, concéntrate en tus materias y mira cómo tu esfuerzo florece en un bosque legendario.
            </p>
          </div>
        </div>

        {/* Quick Plant Button */}
        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => {
              ComicAudio.playSprout();
              setIsPlantModalOpen(true);
            }}
            disabled={forestStats.hasActivePlant}
            className="w-full md:w-auto px-6 py-3.5 bg-[#BFFF00] hover:bg-[#a6e000] text-black font-black uppercase text-xs sm:text-sm rounded-2xl border-4 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-[4px_4px_0_0_#000]"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>Plantar Semilla</span>
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS (Gaming Comic Pill Navigation) */}
      <div className="flex items-center gap-2 p-1.5 bg-card border-4 border-foreground rounded-2xl shadow-[4px_4px_0_0_hsl(var(--foreground))] overflow-x-auto">
        {[
          { id: "island", label: "El Bosque (Isla 3D)", icon: Compass },
          {
            id: "active",
            label: currentPlant ? `Árbol Activo (${currentPlant.growth_percentage}%)` : "Árbol Activo",
            icon: Sprout,
          },
          { id: "nursery", label: "Vivero de Especies", icon: Sparkles },
          { id: "stats", label: "Estadísticas y Cementerio", icon: BarChart3 },
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
                "flex-1 min-w-[140px] sm:min-w-fit px-4 py-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                isActive
                  ? "bg-[#BFFF00] text-black border-2 border-foreground shadow-[2.5px_2.5px_0_0_hsl(var(--foreground))] translate-y-[-1px]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-black" : "text-foreground")} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT VIEWS */}
      {activeTab === "island" && (
        <ForestIsland
          plants={plants}
          studyActivity={studyActivity}
          onRemoveDeadPlant={removeDeadPlant}
          onPlantNewTree={() => setIsPlantModalOpen(true)}
        />
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
        />
      )}

      {activeTab === "stats" && (
        <ForestTimelineStats
          plants={plants}
          studyActivity={studyActivity}
          onRemoveDeadPlant={removeDeadPlant}
        />
      )}

      {/* MODAL: PLANT NEW SEED DIALOG (WIDER ON PC, COMIC STYLED) */}
      <Dialog open={isPlantModalOpen} onOpenChange={setIsPlantModalOpen}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] bg-card text-foreground border-4 border-foreground shadow-[10px_10px_0_0_hsl(var(--foreground))] rounded-3xl p-5 sm:p-7 flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-black uppercase text-foreground flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-[#BFFF00] border-2 border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0_0_#000]">
                  <Sprout className="w-5 h-5 text-black" />
                </div>
                <span>Elige tu Próximo Árbol a Plantar</span>
              </div>
              <ComicBadge variant="green" size="sm">
                {modalFilteredPlantTypes.length} disponibles
              </ComicBadge>
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs font-bold text-muted-foreground -mt-1">
            Filtra por dificultad para elegir el desafío ideal según las horas que vas a dedicar:
          </p>

          {/* Level Filter Pills (Full Comic Colors) */}
          <div className="flex items-center gap-2 p-2 bg-muted/40 border-3 border-foreground rounded-2xl overflow-x-auto w-full">
            {MODAL_LEVEL_FILTERS.map((lvl) => {
              const isLvlActive = modalFilterLevel === lvl.id;
              const style = COMIC_LEVEL_STYLES[lvl.id] || COMIC_LEVEL_STYLES.all;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    ComicAudio.playPop();
                    setModalFilterLevel(lvl.id);
                  }}
                  className={cn(
                    "px-3 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer hover:translate-y-[-1px] active:translate-y-[1px]",
                    isLvlActive ? style.selected : style.unselected
                  )}
                >
                  <span className="text-sm">{lvl.emoji}</span>
                  <span>{lvl.label}</span>
                </button>
              );
            })}
          </div>

          {/* Species Selector Grid (Spacious 6-column Grid on PC) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 my-2 max-h-[52vh] overflow-y-auto pr-2">
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
                    "p-3 rounded-2xl border-3 transition-all flex flex-col items-center justify-between gap-1.5 cursor-pointer relative group text-left",
                    isSelected
                      ? "bg-[#BFFF00] text-black border-black shadow-[4px_4px_0_0_#000] scale-[1.02] ring-2 ring-black"
                      : "bg-muted/40 text-foreground border-foreground/30 hover:border-foreground hover:bg-muted/70 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))]"
                  )}
                >
                  {/* Top Level Pill */}
                  <div className="w-full flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-black uppercase border border-black",
                        type.level === 1 && "bg-[#BFFF00] text-black",
                        type.level === 2 && "bg-[#00E5FF] text-black",
                        type.level === 3 && "bg-[#FFD21C] text-black",
                        type.level === 4 && "bg-[#FF9415] text-black",
                        type.level === 5 && "bg-[#FF5C5C] text-white",
                        type.level === 6 && "bg-gradient-to-r from-[#FFD21C] via-[#FF5C5C] to-[#A855F7] text-white"
                      )}
                    >
                      {type.level === 6 ? "LEGEND" : type.difficultyLabel}
                    </span>
                    <span className="text-base">{type.emoji}</span>
                  </div>

                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-xl my-1 group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: `${type.color}15` }}
                  >
                    <ForestTreeArtwork species={type.id} stage="full" size="md" animated={type.level >= 5} />
                  </div>

                  <span className="text-xs font-black uppercase text-center leading-tight truncate w-full">
                    {type.name}
                  </span>

                  <div className="flex items-center justify-center gap-1 text-[9px] font-mono font-bold text-muted-foreground uppercase w-full">
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
            <div className="p-3 bg-muted/40 border-2 border-foreground/30 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-card border-2 border-foreground rounded-xl">
                  <ForestTreeArtwork species={selectedTypeInfo.id} stage="full" size="sm" animated={false} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black uppercase truncate text-foreground">{selectedTypeInfo.name}</span>
                    <ComicBadge variant="green" size="sm">
                      {selectedTypeInfo.difficultyLabel}
                    </ComicBadge>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-bold truncate mt-0.5">{selectedTypeInfo.description}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-black font-mono text-[#16A34A]">{selectedTypeInfo.requiredMinutes} min</p>
                <p className="text-[9px] font-bold text-muted-foreground">tiempo total</p>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2 flex flex-row gap-3">
            <button
              type="button"
              onClick={() => setIsPlantModalOpen(false)}
              className="flex-1 py-3 bg-muted hover:bg-muted/80 text-foreground font-black uppercase text-xs rounded-xl border-2 border-foreground cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleConfirmPlant()}
              className="flex-1 py-3 bg-[#BFFF00] hover:bg-[#a6e000] text-black font-black uppercase text-xs rounded-xl border-3 border-black shadow-[3px_3px_0_0_#000] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sprout className="w-4 h-4" />
              <span>Plantar {selectedTypeInfo?.name || "Semilla"}</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

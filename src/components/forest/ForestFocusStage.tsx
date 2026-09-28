import React, { useState } from "react";
import { Plant, PLANT_TYPES } from "@/hooks/useForest";
import { ForestTreeArtwork, getTreeStage, getStageLabel } from "./ForestTreeArtwork";
import { ComicBadge } from "@/components/comic/ComicBadge";
import { ComicAudio } from "@/components/comic/ComicAudio";
import {
  Sprout,
  Sun,
  Droplets,
  Clock,
  Skull,
  TrendingUp,
  XCircle,
  Play,
  Sparkles,
  Flame,
  Award,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ForestFocusStageProps {
  currentPlant: Plant | null;
  studyActivity: {
    hasStudiedToday: boolean;
    hasStudiedThisWeek: boolean;
    daysSinceLastStudy: number;
    studyMinutesToday: number;
    studyMinutesThisWeek: number;
  };
  onPlantNewTree: () => void;
  onAbandonPlant: (plantId: string) => void;
  onRemoveDeadPlant: (plantId: string) => void;
  onWaterWithStudy?: (minutes: number) => void;
}

const COMIC_MOTIVATIONS = [
  "¡La concentración es tu superpoder!",
  "Cada minuto de estudio alimenta las raíces de tu árbol.",
  "¡No toques el celular! Tu bosque te necesita.",
  "La disciplina académica florece con paciencia.",
  "Un árbol a la vez, una materia a la vez.",
  "Tu mente es tierra fértil para el conocimiento.",
];

export const ForestFocusStage: React.FC<ForestFocusStageProps> = ({
  currentPlant,
  studyActivity,
  onPlantNewTree,
  onAbandonPlant,
  onRemoveDeadPlant,
  onWaterWithStudy,
}) => {
  const navigate = useNavigate();
  const [sloganIdx, setSloganIdx] = useState(0);
  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
  const [isAbandonDialogOpen, setIsAbandonDialogOpen] = useState(false);
  const [manualMinutes, setManualMinutes] = useState(25);

  const cycleSlogan = () => {
    ComicAudio.playPop();
    setSloganIdx((prev) => (prev + 1) % COMIC_MOTIVATIONS.length);
  };

  // If there is NO active plant
  if (!currentPlant) {
    return (
      <div className="bg-card text-foreground rounded-3xl border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] p-8 sm:p-12 text-center space-y-6">
        <div className="w-24 h-24 mx-auto bg-[#BFFF00] border-4 border-black rounded-3xl flex items-center justify-center shadow-[6px_6px_0_0_#000] -rotate-3 animate-bounce">
          <Sprout className="w-12 h-12 text-black" />
        </div>

        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-3xl font-black uppercase text-foreground">
            ¡Tu parcela está lista!
          </h3>
          <p className="text-muted-foreground font-bold text-sm">
            No tienes ninguna planta creciendo en este momento. Elige una especie y plántala para comenzar a regarla con tus horas de estudio.
          </p>
        </div>

        <button
          onClick={() => {
            ComicAudio.playSprout();
            onPlantNewTree();
          }}
          className="px-8 py-4 bg-[#BFFF00] hover:bg-[#a6e000] text-black font-black uppercase text-base rounded-2xl border-4 border-black shadow-[6px_6px_0_0_#000] hover:translate-y-[-2px] active:translate-y-[1px] transition-all inline-flex items-center gap-3"
        >
          <Sprout className="w-6 h-6" />
          Plantar Nueva Semilla
        </button>
      </div>
    );
  }

  // Active or Dead Plant
  const plantInfo = PLANT_TYPES.find((t) => t.id === currentPlant.plant_type) || PLANT_TYPES[0];
  const stage = getTreeStage(currentPlant.growth_percentage, currentPlant.is_alive);
  const stageLabel = getStageLabel(stage);

  // Life & Death countdown calculations
  const plantedDate = new Date(currentPlant.planted_at);
  const now = new Date();
  const msSincePlanted = now.getTime() - plantedDate.getTime();
  const daysAlive = Math.floor(msSincePlanted / (1000 * 60 * 60 * 24));

  const gracePeriodDays = 2;
  const deathThresholdDays = 7;
  const daysUntilVulnerable = Math.max(0, gracePeriodDays - msSincePlanted / (1000 * 60 * 60 * 24));

  const lastWateredDate = new Date(currentPlant.last_watered_at);
  const daysSinceWatered = (now.getTime() - lastWateredDate.getTime()) / (1000 * 60 * 60 * 24);

  const daysUntilDeath =
    daysUntilVulnerable > 0
      ? daysUntilVulnerable + deathThresholdDays
      : Math.max(0, deathThresholdDays - daysSinceWatered);

  const hoursUntilDeath = Math.floor((daysUntilDeath % 1) * 24);
  const fullDaysUntilDeath = Math.floor(daysUntilDeath);
  const isInGracePeriod = daysUntilVulnerable > 0;

  // Circular progress ring math
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (currentPlant.growth_percentage / 100) * circumference;

  const plantReqMinutes = plantInfo?.requiredMinutes || 120;
  const hasActiveFertilizer = currentPlant?.fertilizer_ends_at && new Date(currentPlant.fertilizer_ends_at) > now;
  const activeMultiplier = hasActiveFertilizer ? (currentPlant?.growth_multiplier || 2) : 1;
  const calculatedGrowthToAdd = Math.max(1, Math.round((manualMinutes / plantReqMinutes) * 100 * activeMultiplier));
  const expectedFinalGrowth = Math.min(100, (currentPlant?.growth_percentage || 0) + calculatedGrowthToAdd);

  const difficultyBadgeVariant: Record<string, "green" | "pink" | "cyan" | "yellow"> = {
    muy_facil: "green",
    facil: "green",
    normal: "cyan",
    dificil: "yellow",
    epico: "pink",
    legendario: "yellow",
  };

  return (
    <div className="bg-card text-foreground rounded-3xl border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] p-6 sm:p-10 relative overflow-hidden">
      {/* Slogan Banner at the top (Clickable) */}
      <div className="flex justify-center mb-6">
        <button
          onClick={cycleSlogan}
          title="Toca para otra frase motivacional"
          className="px-4 py-2 bg-muted/60 hover:bg-muted border-2 border-foreground rounded-xl text-xs font-black uppercase text-foreground/90 shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] transition-all flex items-center gap-2 group cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
          <span>"{COMIC_MOTIVATIONS[sloganIdx]}"</span>
        </button>
      </div>

      {/* CENTRAL FOCUS RING & TREE SHOWCASE (Like Forest App) */}
      <div className="relative mx-auto w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center my-4">
        {/* SVG Circular Progress Ring */}
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 260 260">
          {/* Background Track */}
          <circle
            cx="130"
            cy="130"
            r={radius}
            className="stroke-muted"
            strokeWidth="12"
            fill="none"
          />
          {/* Active Animated Progress Arc */}
          <circle
            cx="130"
            cy="130"
            r={radius}
            stroke={currentPlant.is_alive ? plantInfo.color : "#94a3b8"}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: currentPlant.is_alive ? "drop-shadow(0 0 8px rgba(74, 222, 128, 0.4))" : "none",
            }}
          />
        </svg>

        {/* Central Tree Artwork and Grassy Podium */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
          <ForestTreeArtwork
            species={currentPlant.plant_type}
            growth={currentPlant.growth_percentage}
            isAlive={currentPlant.is_alive}
            size="hero"
            animated={currentPlant.is_alive}
          />
        </div>

        {/* Top Floating Badge with Percentage */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-foreground text-background font-black text-sm uppercase rounded-full border-2 border-background shadow-[2px_2px_0_0_rgba(0,0,0,0.2)]">
          {currentPlant.growth_percentage}%
        </div>

        {/* Sun Badge if studied today */}
        {currentPlant.is_alive && studyActivity.hasStudiedToday && (
          <div
            className="absolute top-4 right-4 w-10 h-10 bg-[#FFE600] border-3 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0_0_#000] animate-spin-slow"
            title="¡Regado hoy con tu sesión de estudio!"
          >
            <Sun className="w-5 h-5 text-black" />
          </div>
        )}
      </div>

      {/* Plant Name & Stage info */}
      <div className="text-center space-y-1.5 mt-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-foreground">
            {plantInfo.name}
          </h2>
          <ComicBadge variant="green" size="sm">
            {stageLabel}
          </ComicBadge>
          <ComicBadge variant={difficultyBadgeVariant[plantInfo.difficulty] || "cyan"} size="sm">
            🎯 {plantInfo.difficultyLabel} ({plantInfo.requiredMinutes} min)
          </ComicBadge>
        </div>
        <p className="text-xs font-bold text-muted-foreground uppercase">
          {daysAlive === 0 ? "Plantada hoy" : `${daysAlive} días creciendo con tu estudio`} • {plantInfo.speedMultiplierDescription}
        </p>
      </div>

      {/* VITAL STATUS / DEATH WARNING BAR */}
      <div className="max-w-lg mx-auto mt-6">
        {!currentPlant.is_alive ? (
          <div className="bg-rose-500/15 border-3 border-rose-500 rounded-2xl p-4 text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-rose-600 font-black uppercase text-sm">
              <Skull className="w-5 h-5" />
              <span>Esta planta se ha marchitado</span>
            </div>
            <p className="text-xs font-bold text-rose-500/90">
              Estuvo 7 días sin registrar sesiones de estudio. Límpiala para comenzar de nuevo.
            </p>
          </div>
        ) : currentPlant.is_completed ? (
          <div className="bg-[#BFFF00]/20 border-3 border-[#BFFF00] rounded-2xl p-4 text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-emerald-600 font-black uppercase text-sm">
              <Award className="w-5 h-5" />
              <span>¡Árbol 100% Crecido y Florecido!</span>
            </div>
            <p className="text-xs font-bold text-muted-foreground">
              Ha alcanzado su tamaño máximo y ya vive en tu bosque permanente. ¡Planta uno nuevo!
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "rounded-2xl p-4 border-3 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] transition-colors",
              isInGracePeriod
                ? "bg-[#00E5FF]/20 border-[#00E5FF] text-foreground"
                : daysUntilDeath <= 2
                ? "bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300 animate-pulse"
                : "bg-muted/60 text-foreground"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="font-black text-xs uppercase tracking-wider">
                  {isInGracePeriod ? "Escudo de Gracia (Inmune)" : "Vitalidad de Riego"}
                </span>
              </div>
              <span className="font-black text-xs uppercase">
                {isInGracePeriod
                  ? "Protegida"
                  : `${fullDaysUntilDeath}d ${hoursUntilDeath}h para marchitar`}
              </span>
            </div>
            <p className="text-[11px] font-bold text-muted-foreground mt-1.5">
              {studyActivity.hasStudiedToday
                ? "✓ Ya estudiaste hoy. El contador de riego está reiniciado y seguro."
                : "Estudia 25 minutos para ganar crecimiento (+15%) y mantenerla viva."}
            </p>
          </div>
        )}
      </div>

      {/* ACTION BUTTONS (GAMING COMIC STYLE) */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {currentPlant.is_alive && !currentPlant.is_completed && (
          <>
            {/* Primary Study CTA -> Links to Pomodoro */}
            <button
              onClick={() => {
                ComicAudio.playPowerUp();
                navigate("/pomodoro");
              }}
              className="px-6 py-3.5 bg-[#BFFF00] hover:bg-[#a6e000] text-black font-black uppercase text-xs sm:text-sm rounded-xl border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] active:translate-y-[1px] transition-all flex items-center gap-2"
            >
              <Flame className="w-4 h-4 text-orange-600" />
              Estudiar con Pomodoro
            </button>

            {/* Custom Water Dialog Trigger */}
            {onWaterWithStudy && (
              <button
                onClick={() => {
                  ComicAudio.playPop();
                  setIsWaterModalOpen(true);
                }}
                className="px-5 py-3.5 bg-[#00E5FF] hover:bg-[#00cce6] text-black font-black uppercase text-xs sm:text-sm rounded-xl border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] active:translate-y-[1px] transition-all flex items-center gap-2"
                title="Elegir cantidad de minutos de estudio a mano para regar"
              >
                <Droplets className="w-4 h-4 text-blue-700" />
                Cargar Tiempo / Regar
              </button>
            )}

            {/* Abandon Button */}
            <button
              type="button"
              onClick={() => {
                ComicAudio.playPop();
                setIsAbandonDialogOpen(true);
              }}
              className="px-4 py-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-black uppercase text-xs sm:text-sm rounded-xl border-3 border-rose-500/50 hover:border-rose-600 shadow-[4px_4px_0_0_rgba(244,63,94,0.25)] hover:translate-y-[-2px] active:translate-y-[1px] transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Abandonar</span>
            </button>
          </>
        )}

        {/* Completed Plant CTA */}
        {currentPlant.is_completed && (
          <button
            onClick={() => {
              ComicAudio.playSprout();
              onPlantNewTree();
            }}
            className="px-8 py-4 bg-[#BFFF00] hover:bg-[#a6e000] text-black font-black uppercase text-sm rounded-2xl border-4 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] transition-all flex items-center gap-2.5"
          >
            <Sprout className="w-5 h-5" />
            ¡Plantar mi siguiente árbol!
          </button>
        )}

        {/* Dead Plant CTA */}
        {!currentPlant.is_alive && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                ComicAudio.playPop();
                onRemoveDeadPlant(currentPlant.id);
              }}
              className="px-5 py-3.5 bg-muted hover:bg-muted/80 text-foreground font-black uppercase text-xs rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]"
            >
              Limpiar Terreno
            </button>
            <button
              onClick={() => {
                ComicAudio.playSprout();
                onRemoveDeadPlant(currentPlant.id);
                onPlantNewTree();
              }}
              className="px-6 py-3.5 bg-[#BFFF00] text-black font-black uppercase text-xs rounded-xl border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] transition-all flex items-center gap-2"
            >
              <Sprout className="w-4 h-4" />
              Nueva Semilla
            </button>
          </div>
        )}
      </div>

      {/* Custom Study Minutes Dialog */}
      <Dialog open={isWaterModalOpen} onOpenChange={setIsWaterModalOpen}>
        <DialogContent className="max-w-md bg-card text-foreground border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-wider text-foreground flex items-center gap-2">
              <Droplets className="w-6 h-6 text-[#00E5FF]" />
              Cargar Tiempo de Estudio Manual
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="p-3 bg-muted/40 border-2 border-foreground/30 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs font-black uppercase">
                <span>Árbol: {plantInfo.name}</span>
                <ComicBadge variant={difficultyBadgeVariant[plantInfo.difficulty] || "green"} size="sm">
                  {plantInfo.difficultyLabel}
                </ComicBadge>
              </div>
              <p className="text-[11px] font-bold text-muted-foreground">
                Requiere {plantInfo.requiredMinutes} minutos totales de estudio para florecer al 100%.
              </p>
            </div>

            {/* Preset Pills */}
            <div>
              <label className="text-xs font-black uppercase text-foreground block mb-1.5">
                Presets Rápidos de Estudio
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 25, 45, 60, 90, 120, 180, 240].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      ComicAudio.playPop();
                      setManualMinutes(mins);
                    }}
                    className={cn(
                      "py-2 rounded-xl text-xs font-black uppercase border-2 transition-all",
                      manualMinutes === mins
                        ? "bg-[#BFFF00] text-black border-black shadow-[2px_2px_0_0_#000]"
                        : "bg-muted/70 text-foreground border-foreground/40 hover:border-foreground"
                    )}
                  >
                    {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black uppercase text-foreground">
                  O escribe la cantidad exacta de minutos:
                </label>
                <span className="text-xs font-black text-[#00E5FF]">{manualMinutes} min</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 px-4 py-2.5 bg-background border-2 border-foreground rounded-xl font-black text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#00E5FF]"
                  placeholder="Ej: 35"
                />
                <span className="text-xs font-black uppercase text-muted-foreground">minutos</span>
              </div>
            </div>

            {/* Live Simulation Card */}
            <div className="p-3.5 bg-[#BFFF00]/10 border-2 border-[#BFFF00] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-foreground">Impacto en crecimiento:</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  +{calculatedGrowthToAdd}%
                </span>
              </div>

              <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden border border-black/40">
                <div
                  className="bg-[#BFFF00] h-full transition-all duration-300"
                  style={{ width: `${expectedFinalGrowth}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                <span>Progreso actual: {currentPlant.growth_percentage}%</span>
                <span>➔ Llegará a: {expectedFinalGrowth}%</span>
              </div>

              {hasActiveFertilizer && (
                <p className="text-[11px] font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> ¡Bonus x2 de Fertilizante activo aplicado!
                </p>
              )}

              {expectedFinalGrowth >= 100 && (
                <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                  🎉 ¡Esta sesión completará el árbol al 100% y se sumará a tu Isla!
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setIsWaterModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border-2 border-foreground font-black uppercase text-xs hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                ComicAudio.playWater();
                setIsWaterModalOpen(false);
                if (onWaterWithStudy) {
                  onWaterWithStudy(manualMinutes);
                }
              }}
              className="flex-1 px-5 py-2.5 bg-[#00E5FF] hover:bg-[#00cce6] text-black font-black uppercase text-xs rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-1.5"
            >
              <Droplets className="w-4 h-4 text-blue-900" />
              Regar ({manualMinutes} min)
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Abandon Confirmation Dialog */}
      <AlertDialog open={isAbandonDialogOpen} onOpenChange={setIsAbandonDialogOpen}>
        <AlertDialogContent className="no-comic bg-card text-foreground border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase text-foreground flex items-center gap-2">
              <Skull className="w-6 h-6 text-rose-500" />
              ¿Abandonar este árbol?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-bold text-sm mt-2">
              Tu planta actual se marchitará y quedará en tu bosque como un árbol seco. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2">
            <AlertDialogCancel
              onClick={() => setIsAbandonDialogOpen(false)}
              className="px-5 py-2.5 rounded-xl border-2 border-foreground font-black uppercase text-xs cursor-pointer"
            >
              Continuar Cuidando
            </AlertDialogCancel>
            <button
              type="button"
              onClick={() => {
                setIsAbandonDialogOpen(false);
                document.body.style.pointerEvents = "";
                ComicAudio.playBoing();
                setTimeout(() => {
                  onAbandonPlant(currentPlant.id);
                }, 50);
              }}
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-xs rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] cursor-pointer"
            >
              Sí, Abandonar
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

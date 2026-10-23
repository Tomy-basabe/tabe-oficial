import React, { useState } from "react";
import { Plant, PLANT_TYPES } from "@/hooks/useForest";
import { ForestTreeArtwork, getTreeStage, getStageLabel } from "./ForestTreeArtwork";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { Sprout,
  Sun,
  Droplets,
  Clock,
  Skull,
  TrendingUp,
  XCircle,
  Play,
  
  Flame,
  Award,
  CheckCircle2,
  AlertCircle,
  Timer,
  Shield,
  ArrowRight, Zap } from "lucide-react";
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

const MOTIVATIONAL_PHRASES = [
  "La concentración es un hábito que se cultiva día a día.",
  "Cada minuto de estudio alimenta las raíces de tu árbol.",
  "La disciplina académica florece con paciencia y perseverancia.",
  "Un árbol a la vez, una materia a la vez.",
  "Tu mente es tierra fértil para el aprendizaje.",
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
    setSloganIdx((prev) => (prev + 1) % MOTIVATIONAL_PHRASES.length);
  };

  // If there is NO active plant
  if (!currentPlant) {
    return (
      <div className="bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs p-8 sm:p-14 text-center space-y-6">
        <div className="w-16 h-16 mx-auto bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 rounded-2xl flex items-center justify-center">
          <Sprout className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>

        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Parcela lista para sembrar
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
            No tienes ninguna planta creciendo en este momento. Elige una especie y comenza a regarla con tus sesiones de estudio y pomodoro.
          </p>
        </div>

        <button
          onClick={() => {
            ComicAudio.playSprout();
            onPlantNewTree();
          }}
          className="px-5 py-2.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-medium text-xs sm:text-sm rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <Sprout className="w-4 h-4 text-emerald-500" />
          <span>Plantar Nueva Semilla</span>
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

  return (
    <div className="bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs p-6 sm:p-10 relative overflow-hidden space-y-6">
      {/* Slogan Banner at the top (Clickable) */}
      <div className="flex justify-center">
        <button
          onClick={cycleSlogan}
          title="Toca para cambiar de frase"
          className="px-3.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 rounded-full text-xs text-zinc-600 dark:text-zinc-300 transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>"{MOTIVATIONAL_PHRASES[sloganIdx]}"</span>
        </button>
      </div>

      {/* CENTRAL FOCUS RING & TREE SHOWCASE */}
      <div className="relative mx-auto w-64 h-64 sm:w-76 sm:h-76 flex items-center justify-center my-2">
        {/* SVG Circular Progress Ring */}
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 260 260">
          {/* Background Track */}
          <circle
            cx="130"
            cy="130"
            r={radius}
            className="stroke-zinc-100 dark:stroke-zinc-800"
            strokeWidth="10"
            fill="none"
          />
          {/* Active Animated Progress Arc */}
          <circle
            cx="130"
            cy="130"
            r={radius}
            stroke={currentPlant.is_alive ? (plantInfo.color || "#10b981") : "#94a3b8"}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-1000 ease-out"
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
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono font-medium text-xs rounded-full shadow-xs">
          {currentPlant.growth_percentage}%
        </div>

        {/* Sun Badge if studied today */}
        {currentPlant.is_alive && studyActivity.hasStudiedToday && (
          <div
            className="absolute top-4 right-4 w-9 h-9 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400"
            title="Regado hoy con tu sesión de estudio"
          >
            <Sun className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Plant Name & Stage info */}
      <div className="text-center space-y-1.5">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {plantInfo.name}
          </h2>
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            {stageLabel}
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            {plantInfo.difficultyLabel} ({plantInfo.requiredMinutes} min)
          </span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {daysAlive === 0 ? "Plantada hoy" : `${daysAlive} días creciendo con tu estudio`} • {plantInfo.speedMultiplierDescription}
        </p>
      </div>

      {/* VITAL STATUS / DEATH WARNING BAR */}
      <div className="max-w-md mx-auto">
        {!currentPlant.is_alive ? (
          <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 rounded-xl p-4 text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-rose-600 dark:text-rose-400 font-medium text-xs sm:text-sm">
              <Skull className="w-4 h-4" />
              <span>Esta planta se ha marchitado</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Estuvo 7 días sin registrar sesiones de estudio. Límpiala para comenzar de nuevo.
            </p>
          </div>
        ) : currentPlant.is_completed ? (
          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-xl p-4 text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300 font-medium text-xs sm:text-sm">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Árbol 100% Crecido y Florecido</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Ha alcanzado su tamaño máximo y ya vive en tu bosque permanente. ¡Planta uno nuevo!
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "rounded-xl p-3.5 border transition-colors",
              isInGracePeriod
                ? "bg-cyan-50/60 dark:bg-cyan-950/20 border-cyan-200/80 dark:border-cyan-900/50 text-cyan-900 dark:text-cyan-200"
                : daysUntilDeath <= 2
                ? "bg-rose-50/60 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-300"
                : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
            )}
          >
            <div className="flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {isInGracePeriod ? "Escudo de Gracia (Inmune)" : "Vitalidad de Riego"}
                </span>
              </div>
              <span className="font-mono text-[11px]">
                {isInGracePeriod
                  ? "Protegida"
                  : `${fullDaysUntilDeath}d ${hoursUntilDeath}h restantes`}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              {studyActivity.hasStudiedToday
                ? "Ya registraste estudio hoy. El contador de riego está reiniciado y seguro."
                : "Estudia 25 minutos con Pomodoro para ganar crecimiento y mantenerla viva."}
            </p>
          </div>
        )}
      </div>

      {/* ACTION BUTTONS (NOTION / CHATGPT CLEAN STYLE) */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
        {currentPlant.is_alive && !currentPlant.is_completed && (
          <>
            {/* Primary Study CTA -> Links to Pomodoro */}
            <button
              onClick={() => {
                ComicAudio.playPowerUp();
                navigate("/pomodoro");
              }}
              className="px-5 py-2.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-medium text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Timer className="w-4 h-4 text-emerald-500" />
              <span>Estudiar con Pomodoro</span>
            </button>

            {/* Custom Water Dialog Trigger */}
            {onWaterWithStudy && (
              <button
                onClick={() => {
                  ComicAudio.playPop();
                  setIsWaterModalOpen(true);
                }}
                className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200/80 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/80 font-medium text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                title="Cargar minutos de estudio para regar"
              >
                <Droplets className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Cargar Tiempo / Regar</span>
              </button>
            )}

            {/* Abandon Button */}
            <button
              type="button"
              onClick={() => {
                ComicAudio.playPop();
                setIsAbandonDialogOpen(true);
              }}
              className="px-3.5 py-2.5 bg-transparent hover:bg-rose-50 text-rose-600 dark:hover:bg-rose-950/30 dark:text-rose-400 font-medium text-xs sm:text-sm rounded-xl border border-rose-200/80 dark:border-rose-900/50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
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
            className="px-5 py-2.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-medium text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Sprout className="w-4 h-4 text-emerald-500" />
            <span>Plantar siguiente árbol</span>
          </button>
        )}

        {/* Dead Plant CTA */}
        {!currentPlant.is_alive && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                ComicAudio.playPop();
                onRemoveDeadPlant(currentPlant.id);
              }}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 font-medium text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
            >
              Limpiar Terreno
            </button>
            <button
              onClick={() => {
                ComicAudio.playSprout();
                onRemoveDeadPlant(currentPlant.id);
                onPlantNewTree();
              }}
              className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Sprout className="w-4 h-4 text-emerald-500" />
              <span>Nueva Semilla</span>
            </button>
          </div>
        )}
      </div>

      {/* Custom Study Minutes Dialog */}
      <Dialog open={isWaterModalOpen} onOpenChange={setIsWaterModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span>Cargar Tiempo de Estudio Manual</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>Árbol: {plantInfo.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-200/70 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                  {plantInfo.difficultyLabel}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Requiere {plantInfo.requiredMinutes} minutos totales de estudio para florecer.
              </p>
            </div>

            {/* Preset Pills */}
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
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
                      "py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                      manualMinutes === mins
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                        : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-400"
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
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  O escribe la cantidad exacta de minutos:
                </label>
                <span className="text-xs font-mono font-semibold text-cyan-600 dark:text-cyan-400">{manualMinutes} min</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  placeholder="Ej: 35"
                />
                <span className="text-xs text-zinc-400">minutos</span>
              </div>
            </div>

            {/* Live Simulation Card */}
            <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Impacto en crecimiento:</span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                  +{calculatedGrowthToAdd}%
                </span>
              </div>

              <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${expectedFinalGrowth}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                <span>Progreso actual: {currentPlant.growth_percentage}%</span>
                <span className="flex items-center gap-1">
                  <span>Llegará a:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{expectedFinalGrowth}%</span>
                </span>
              </div>

              {hasActiveFertilizer && (
                <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Bonus x2 de Fertilizante aplicado
                </p>
              )}

              {expectedFinalGrowth >= 100 && (
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  Esta sesión completará el árbol al 100% y se sumará a tu Isla.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setIsWaterModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-zinc-200/80 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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
              className="flex-1 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-medium text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Droplets className="w-4 h-4 text-cyan-400" />
              <span>Regar ({manualMinutes} min)</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Abandon Confirmation Dialog */}
      <AlertDialog open={isAbandonDialogOpen} onOpenChange={setIsAbandonDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Skull className="w-5 h-5 text-rose-500" />
              <span>¿Abandonar este árbol?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mt-1">
              Tu planta actual se marchitará y quedará en tu bosque como un árbol seco. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2">
            <AlertDialogCancel
              onClick={() => setIsAbandonDialogOpen(false)}
              className="px-4 py-2 rounded-xl border border-zinc-200/80 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs cursor-pointer"
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
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Sí, Abandonar
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

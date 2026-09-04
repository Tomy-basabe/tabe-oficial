import { useState } from "react";
import {
  TreeDeciduous,
  Sprout,
  Leaf,
  Sun,
  Droplets,
  Clock,
  Skull,
  Plus,
  Trash2,
  Calendar,
  TrendingUp,
  Loader2,
  XCircle,
  Flower2,
  TreePine,
  Palmtree,
  Map as MapleIcon,
  Flower
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useForest, Plant } from "@/hooks/useForest";
import { cn } from "@/lib/utils";

// Mapping plant types to Lucide Icons
const PLANT_ICONS: Record<string, React.ElementType> = {
  oak: TreeDeciduous,
  cherry: Flower,
  pine: TreePine,
  palm: Palmtree,
  maple: Flower2
};

// Plant growth stages with visual representation
const getPlantStage = (growth: number, isAlive: boolean, plantType: string) => {
  if (!isAlive) {
    return { icon: <Skull className="w-full h-full text-black/50" />, label: "Muerta", color: "text-gray-500", animation: "" };
  }

  if (growth < 10) {
    return {
      icon: <Sprout className="w-full h-full text-[#FF9B71]" />,
      label: "Semilla",
      color: "text-[#FF9B71]",
      animation: "animate-plant-pulse"
    };
  } else if (growth < 30) {
    return {
      icon: <Sprout className="w-full h-full text-[#BFFF00]" />,
      label: "Brote",
      color: "text-[#BFFF00]",
      animation: "animate-plant-bounce-soft"
    };
  } else if (growth < 50) {
    return {
      icon: <Sprout className="w-full h-full text-green-500 scale-125" />,
      label: "Plántula",
      color: "text-green-500",
      animation: "animate-plant-bounce-soft"
    };
  } else if (growth < 70) {
    return {
      icon: <TreeDeciduous className="w-full h-full text-green-600 scale-75" />,
      label: "Arbusto",
      color: "text-green-600",
      animation: "animate-plant-sway"
    };
  } else if (growth < 90) {
    return {
      icon: <TreeDeciduous className="w-full h-full text-emerald-500" />,
      label: "Árbol joven",
      color: "text-emerald-500",
      animation: "animate-plant-sway"
    };
  } else {
    // Full grown tree based on type
    const PlantIcon = PLANT_ICONS[plantType] || TreeDeciduous;

    return {
      icon: <PlantIcon className="w-full h-full text-[#BFFF00]" style={{ filter: 'drop-shadow(2px 2px 0px #000)' }} />,
      label: "Árbol completo",
      color: "text-[#BFFF00]",
      animation: "animate-plant-grow-pulse"
    };
  }
};

function PlantCard({ plant, onRemove }: { plant: Plant; onRemove?: () => void }) {
  const stage = getPlantStage(plant.growth_percentage, plant.is_alive, plant.plant_type);
  const plantedDate = new Date(plant.planted_at).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className={cn(
      "relative overflow-hidden bg-white rounded-xl border-4 border-black shadow-[4px_4px_0_0_#000] p-4 transition-transform hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000]",
      !plant.is_alive && "bg-[#2D3748] shadow-[4px_4px_0_0_#000] opacity-90",
      plant.is_completed && "bg-[#BFFF00] shadow-[4px_4px_0_0_#000]"
    )}>
      {plant.is_completed && (
        <div className="absolute top-0 right-0 bg-[#00E5FF] text-black font-black uppercase text-[10px] px-2 py-1 border-b-4 border-l-4 border-black z-10">
          Completado
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          "w-12 h-12 bg-white rounded-lg border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#000]",
          !plant.is_alive && "bg-gray-300"
        )}>
          {stage.icon}
        </div>
        {!plant.is_alive && onRemove && (
          <button
            onClick={onRemove}
            className="w-8 h-8 flex items-center justify-center bg-[#FF5C5C] rounded-lg border-2 border-black shadow-[2px_2px_0_0_#000] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all text-black"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-col">
          <span className={cn(
            "text-lg font-black uppercase leading-tight",
            plant.is_alive ? "text-black" : "text-white"
          )}>
            {stage.label}
          </span>
        </div>

        <div className="flex justify-between items-end border-t-2 border-black/20 pt-2">
          <div className="flex items-center gap-1 text-[10px] font-black uppercase text-black/60">
            <Calendar className="w-3 h-3" />
            <span className={!plant.is_alive ? "text-white/70" : ""}>{plantedDate}</span>
          </div>
          <span className={cn(
            "text-sm font-black uppercase",
            plant.is_alive ? (plant.is_completed ? "text-black" : "text-[#00E5FF]") : "text-[#FF5C5C]"
          )}>
            {plant.growth_percentage}%
          </span>
        </div>
      </div>
    </div>
  );
}

function CurrentPlantDisplay({ plant, studyActivity }: {
  plant: Plant | null;
  studyActivity: ReturnType<typeof useForest>['studyActivity'];
}) {
  if (!plant) {
    return (
      <div className="text-center py-16 bg-[#FFF7E6] rounded-xl border-4 border-black shadow-[8px_8px_0_0_#000]">
        <div className="w-20 h-20 mx-auto mb-4 bg-white border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0_0_#000]">
          <Sprout className="w-10 h-10 text-black opacity-50" />
        </div>
        <p className="text-xl font-black uppercase text-black">No hay planta activa</p>
        <p className="text-black/70 font-bold mt-2">
          ¡Planta una semilla para comenzar a cultivar!
        </p>
      </div>
    );
  }

  const stage = getPlantStage(plant.growth_percentage, plant.is_alive, plant.plant_type);
  const plantedDate = new Date(plant.planted_at);
  const now = new Date();
  const msSincePlanted = now.getTime() - plantedDate.getTime();
  const daysAlive = Math.floor(msSincePlanted / (1000 * 60 * 60 * 24));

  const gracePeriodDays = 2;
  const deathThresholdDays = 7;
  const daysUntilVulnerable = Math.max(0, gracePeriodDays - (msSincePlanted / (1000 * 60 * 60 * 24)));
  
  const lastWateredDate = new Date(plant.last_watered_at);
  const daysSinceWatered = (now.getTime() - lastWateredDate.getTime()) / (1000 * 60 * 60 * 24);
  
  const daysUntilDeath = daysUntilVulnerable > 0
    ? daysUntilVulnerable + deathThresholdDays
    : Math.max(0, deathThresholdDays - daysSinceWatered);

  const hoursUntilDeath = Math.floor((daysUntilDeath % 1) * 24);
  const fullDaysUntilDeath = Math.floor(daysUntilDeath);
  const isInGracePeriod = daysUntilVulnerable > 0;

  const isFertilized = plant.fertilizer_ends_at && new Date(plant.fertilizer_ends_at) > now;
  const fertilizerMsLeft = isFertilized ? new Date(plant.fertilizer_ends_at!).getTime() - now.getTime() : 0;
  const fertilizerHoursLeft = Math.floor(fertilizerMsLeft / (1000 * 60 * 60));
  const fertilizerMinutesLeft = Math.floor((fertilizerMsLeft % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="text-center space-y-6">
      {/* Main plant visualization */}
      <div className="relative mx-auto w-48 h-48 sm:w-64 sm:h-64 mt-4 mb-8">
        <div className={cn(
          "absolute inset-0 bg-[#FFF7E6] border-4 border-black rounded-3xl shadow-[8px_8px_0_0_#000] flex items-center justify-center p-8 transition-all duration-500",
          plant.is_alive ? "scale-100" : "grayscale bg-gray-200"
        )}>
          <div className={cn("w-full h-full transition-all duration-500", plant.is_alive ? stage.animation : "opacity-50")}>
            {stage.icon}
          </div>
        </div>

        {/* Dirt/Pot base indicator */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-[#8B5A2B] border-4 border-black rounded-full shadow-[4px_4px_0_0_#000] z-[-1]"></div>

        {plant.is_alive && studyActivity.hasStudiedToday && (
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-[#BFFF00] border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0_0_#000] animate-spin-slow">
            <Sun className="w-6 h-6 text-black" />
          </div>
        )}

        {isFertilized && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#00E5FF] text-black px-4 py-1 rounded-full text-xs font-black uppercase border-4 border-black shadow-[4px_4px_0_0_#000] animate-pulse">
            <Leaf className="w-4 h-4" />
            2x Crecimiento
          </div>
        )}
      </div>

      {/* Status & Name */}
      <div className="bg-white p-4 rounded-xl border-4 border-black shadow-[4px_4px_0_0_#000] inline-block min-w-[200px]">
        <h3 className={cn("text-2xl font-black uppercase tracking-widest", plant.is_alive ? "text-black" : "text-gray-500")}>
          {stage.label}
        </h3>
        <p className="text-black/60 font-bold text-sm mt-1 uppercase">
          {daysAlive === 0 ? "Plantada hoy" : `${daysAlive} días creciendo`}
        </p>

        {isFertilized && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-black font-black uppercase bg-[#00E5FF] py-1 px-2 border-2 border-black rounded">
            <Droplets className="w-3 h-3" />
            Vence en {fertilizerHoursLeft}h {fertilizerMinutesLeft}m
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="max-w-md mx-auto space-y-3 bg-white p-5 rounded-xl border-4 border-black shadow-[4px_4px_0_0_#000]">
        <div className="flex justify-between text-sm font-black uppercase">
          <span className="text-black">Progreso</span>
          <span className={plant.is_alive ? "text-[#00E5FF]" : "text-gray-500"}>
            {plant.growth_percentage}%
          </span>
        </div>
        <div className="h-6 bg-gray-200 border-4 border-black rounded-full overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]">
          <div
            className={cn("h-full transition-all duration-1000", plant.is_alive ? "bg-[#BFFF00]" : "bg-gray-400")}
            style={{ width: `${plant.growth_percentage}%` }}
          />
          {/* Grid lines to make it blocky */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex-1 border-r-2 border-black/20" />
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {!plant.is_alive && (
        <div className="bg-[#FF5C5C] border-4 border-black rounded-xl p-4 shadow-[4px_4px_0_0_#000] inline-block">
          <div className="flex items-center gap-2 text-black font-black uppercase">
            <Skull className="w-6 h-6" />
            <span>Tu planta ha muerto</span>
          </div>
          <p className="text-sm text-black/80 font-bold mt-1">
            No estudiaste durante una semana
          </p>
        </div>
      )}

      {/* Death countdown timer */}
      {plant.is_alive && !plant.is_completed && (
        <div className={cn(
          "max-w-md mx-auto rounded-xl p-4 border-4 border-black shadow-[4px_4px_0_0_#000]",
          isInGracePeriod
            ? "bg-[#00E5FF]"
            : daysUntilDeath <= 2
              ? "bg-[#FF5C5C] animate-pulse"
              : daysUntilDeath <= 4
                ? "bg-[#FFE66D]"
                : "bg-white"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-black" />
              <span className="font-black uppercase text-black">
                {isInGracePeriod ? "Período de gracia" : "Tiempo de vida"}
              </span>
            </div>
            <div className="text-xl font-black text-black">
              {fullDaysUntilDeath}d {hoursUntilDeath}h
            </div>
          </div>
          <p className="text-xs text-black/80 font-bold mt-2 uppercase">
            {isInGracePeriod
              ? "Tu planta está protegida por ahora."
              : studyActivity.hasStudiedToday
                ? "¡Bien! Estudiaste hoy."
                : "Estudia para reiniciar el contador."
            }
          </p>
        </div>
      )}
    </div>
  );
}

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
    plantTypes
  } = useForest();

  const [selectedPlantType, setSelectedPlantType] = useState("oak");
  const [isPlantDialogOpen, setIsPlantDialogOpen] = useState(false);

  const completedTrees = plants.filter(p => p.is_completed);
  const deadPlants = plants.filter(p => !p.is_alive);

  const handlePlantTree = () => {
    plantNewTree(selectedPlantType);
    setIsPlantDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando tu bosque...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Header */}
      <div className="bg-[#1B4332] rounded-2xl p-6 lg:p-8 border-4 border-black shadow-[8px_8px_0_0_#000] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#BFFF00] opacity-20 rounded-full blur-3xl translate-x-10 -translate-y-10" />

        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-[#BFFF00] border-4 border-black rounded-xl shadow-[4px_4px_0_0_#000] flex items-center justify-center -rotate-6 flex-shrink-0">
            <TreeDeciduous className="w-8 h-8 text-black" />
          </div>
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-widest text-[#BFFF00]" style={{ WebkitTextStroke: '1px black' }}>
              Mi Bosque de Estudio
            </h1>
            <p className="text-[#BFFF00]/80 font-bold mt-1">
              Cultiva tu bosque estudiando cada día
            </p>
          </div>
        </div>

        <Dialog open={isPlantDialogOpen} onOpenChange={setIsPlantDialogOpen}>
          <DialogTrigger asChild>
            <button
              disabled={forestStats.hasActivePlant}
              className="relative z-10 flex items-center justify-center gap-2 px-6 py-4 bg-[#BFFF00] border-4 border-black rounded-xl font-black uppercase text-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_0_#000]"
            >
              <Plus className="w-5 h-5" />
              Plantar Semilla
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-[#FFF7E6] border-4 border-black shadow-[8px_8px_0_0_#000] rounded-xl p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase text-black flex items-center gap-2">
                <Sprout className="w-6 h-6 text-green-600" /> Elige tu planta
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
              {plantTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedPlantType(type.id)}
                  className={cn(
                    "p-4 rounded-xl border-4 border-black transition-all flex flex-col items-center justify-center gap-2",
                    selectedPlantType === type.id
                      ? "bg-[#BFFF00] shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.1)] translate-y-[2px]"
                      : "bg-white hover:bg-black/5 shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000]"
                  )}
                >
                  {(() => {
                    const Icon = PLANT_ICONS[type.id] || TreeDeciduous;
                    return <Icon className="w-10 h-10 text-black mb-1" />;
                  })()}
                  <span className="text-sm font-black uppercase text-black">{type.name}</span>
                </button>
              ))}
            </div>
            <DialogFooter className="mt-6 flex gap-3">
              <button onClick={() => setIsPlantDialogOpen(false)} className="px-6 py-3 rounded-xl border-4 border-black font-black uppercase bg-white text-black hover:bg-black/5 transition-colors w-full">
                Cancelar
              </button>
              <button onClick={handlePlantTree} className="px-6 py-3 rounded-xl border-4 border-black font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all bg-[#BFFF00] text-black w-full flex justify-center items-center gap-2">
                <Sprout className="w-5 h-5" /> Plantar
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: TreeDeciduous, val: forestStats.totalTrees, label: "Árboles completos", color: "bg-[#BFFF00]" },
          { icon: TrendingUp, val: `${forestStats.currentGrowth}%`, label: "Crecimiento actual", color: "bg-[#00E5FF]" },
          { icon: Clock, val: `${studyActivity.studyMinutesThisWeek}m`, label: "Estudio esta semana", color: "bg-[#FFE66D]" },
          { icon: Sun, val: `${studyActivity.studyMinutesToday}m`, label: "Estudio hoy", color: "bg-[#FF9B71]" }
        ].map((s, i) => (
          <div key={i} className={cn("rounded-xl p-4 border-4 border-black shadow-[4px_4px_0_0_#000] flex items-center gap-4 transition-transform hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000]", s.color)}>
            <div className="w-12 h-12 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0_0_#000] flex items-center justify-center flex-shrink-0 -rotate-3">
              <s.icon className="w-6 h-6 text-black" />
            </div>
            <div>
              <p className="text-2xl lg:text-3xl font-black text-black leading-none drop-shadow-[2px_2px_0_#fff]">{s.val}</p>
              <p className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-black/80 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Current Plant */}
        <div className="lg:col-span-2 bg-[#FFF7E6] rounded-xl border-4 border-black shadow-[8px_8px_0_0_#000] p-6 tour-forest-tree">
          <div className="flex items-center gap-2 mb-6 border-b-4 border-black pb-4">
            <Leaf className="w-8 h-8 text-green-600" />
            <h2 className="text-2xl font-black uppercase text-black">Planta Actual</h2>
          </div>
          
          <CurrentPlantDisplay
            plant={currentPlant}
            studyActivity={studyActivity}
          />

          {!currentPlant && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setIsPlantDialogOpen(true)}
                className="flex items-center gap-2 px-6 py-4 rounded-xl border-4 border-black bg-[#BFFF00] font-black uppercase shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all text-black"
              >
                <Sprout className="w-5 h-5" />
                Plantar mi primera semilla
              </button>
            </div>
          )}

          {currentPlant && !currentPlant.is_alive && (
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => removeDeadPlant(currentPlant.id)}
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-4 border-black bg-white font-black uppercase shadow-[4px_4px_0_0_#000] hover:bg-gray-100 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all text-black"
              >
                <Trash2 className="w-5 h-5" />
                Eliminar
              </button>
              <button
                onClick={() => {
                  removeDeadPlant(currentPlant.id);
                  setIsPlantDialogOpen(true);
                }}
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-4 border-black bg-[#BFFF00] font-black uppercase shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all text-black"
              >
                <Sprout className="w-5 h-5" />
                Plantar nueva
              </button>
            </div>
          )}

          {currentPlant?.is_completed && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setIsPlantDialogOpen(true)}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-4 border-black bg-[#00E5FF] font-black uppercase shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all text-black"
              >
                <Plus className="w-6 h-6" />
                Plantar nuevo árbol
              </button>
            </div>
          )}

          {currentPlant && currentPlant.is_alive && !currentPlant.is_completed && (
            <div className="mt-8 flex justify-center border-t-4 border-black pt-6">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="flex items-center gap-2 px-6 py-3 rounded-xl border-4 border-black bg-[#FF5C5C] font-black uppercase shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all text-black"
                  >
                    <XCircle className="w-5 h-5" />
                    Abandonar planta
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#FFF7E6] border-4 border-black shadow-[8px_8px_0_0_#000] rounded-xl p-6">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-black uppercase text-black flex items-center gap-2">
                      <Skull className="w-8 h-8 text-[#FF5C5C]" />
                      ¿Abandonar tu planta?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-black/80 font-bold mt-2 text-base">
                      Esta acción no se puede deshacer. Tu planta morirá inmediatamente y tendrás que empezar de cero con una nueva semilla.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-6 flex gap-3">
                    <AlertDialogCancel className="px-6 py-3 rounded-xl border-4 border-black font-black uppercase bg-white text-black hover:bg-black/5 transition-colors w-full m-0">
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => abandonPlant(currentPlant.id)}
                      className="px-6 py-3 rounded-xl border-4 border-black font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all bg-[#FF5C5C] text-black w-full m-0 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-5 h-5" /> Sí, abandonar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Study Tips */}
        <div className="bg-[#FFE66D] rounded-xl border-4 border-black shadow-[8px_8px_0_0_#000] p-6 h-fit">
          <div className="flex items-center gap-2 mb-6 border-b-4 border-black pb-4">
            <Droplets className="w-8 h-8 text-[#00E5FF]" />
            <h2 className="text-2xl font-black uppercase text-black">Cómo Crecer</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-4 bg-white p-4 rounded-xl border-4 border-black shadow-[4px_4px_0_0_#000]">
              <Sprout className="w-8 h-8 text-[#1B4332]" />
              <div>
                <p className="font-black uppercase text-black">Estudia cada día</p>
                <p className="text-black/80 font-bold text-sm mt-1">
                  Tu planta crece 15-50% por día según cuánto estudies
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white p-4 rounded-xl border-4 border-black shadow-[4px_4px_0_0_#000]">
              <Clock className="w-8 h-8 text-[#1B4332]" />
              <div>
                <p className="font-black uppercase text-black">Usa el Pomodoro</p>
                <p className="text-black/80 font-bold text-sm mt-1">
                  +5% extra por cada 30 min de estudio
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-[#FF5C5C] p-4 rounded-xl border-4 border-black shadow-[4px_4px_0_0_#000]">
              <Skull className="w-8 h-8 text-black" />
              <div>
                <p className="font-black uppercase text-black">No abandones</p>
                <p className="text-black/80 font-bold text-sm mt-1">
                  7 días sin estudiar = planta muerta
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-[#00E5FF] p-4 rounded-xl border-4 border-black shadow-[4px_4px_0_0_#000]">
              <TrendingUp className="w-8 h-8 text-black" />
              <div>
                <p className="font-black uppercase text-black">Completa tu bosque</p>
                <p className="text-black/80 font-bold text-sm mt-1">
                  Cada árbol al 100% se suma a tu colección
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Completed Forest */}
      {completedTrees.length > 0 && (
        <div className="bg-[#BFFF00] rounded-xl border-4 border-black shadow-[8px_8px_0_0_#000] p-6 mt-8">
          <div className="flex items-center gap-2 mb-6 border-b-4 border-black pb-4">
            <TreeDeciduous className="w-8 h-8 text-black" />
            <h2 className="text-2xl font-black uppercase text-black">
              Mi Bosque ({completedTrees.length} {completedTrees.length === 1 ? 'árbol' : 'árboles'})
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {completedTrees.map((tree) => (
              <PlantCard key={tree.id} plant={tree} />
            ))}
          </div>
        </div>
      )}

      {/* Dead Plants Cemetery */}
      {deadPlants.length > 0 && (
        <div className="bg-[#2D3748] rounded-xl border-4 border-black shadow-[8px_8px_0_0_#000] p-6 mt-8 opacity-95">
          <div className="flex items-center gap-2 mb-6 border-b-4 border-black/50 pb-4">
            <Skull className="w-8 h-8 text-[#FF5C5C]" />
            <h2 className="text-2xl font-black uppercase text-white">
              Cementerio ({deadPlants.length})
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {deadPlants.map((plant) => (
              <PlantCard
                key={plant.id}
                plant={plant}
                onRemove={() => removeDeadPlant(plant.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

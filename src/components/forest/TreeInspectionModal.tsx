import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plant, PLANT_TYPES } from "@/hooks/useForest";
import { ForestTreeArtwork } from "./ForestTreeArtwork";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { Calendar,
  Clock,
  
  Trophy,
  Trash2,
  Award,
  AlertCircle,
  Sprout,
  CheckCircle2,
  X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreeInspectionModalProps {
  plant: Plant | null;
  isOpen: boolean;
  onClose: () => void;
  onRemove?: (plantId: string) => void;
}

export const TreeInspectionModal: React.FC<TreeInspectionModalProps> = ({
  plant,
  isOpen,
  onClose,
  onRemove,
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    setIsConfirmingDelete(false);
  }, [plant?.id, isOpen]);

  if (!plant) return null;

  const typeInfo = PLANT_TYPES.find((t) => t.id === plant.plant_type) || PLANT_TYPES[0];

  const plantedDate = new Date(plant.planted_at).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const completedDate = plant.completed_at
    ? new Date(plant.completed_at).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const diedDate = plant.died_at
    ? new Date(plant.died_at).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const estimatedMinutes = Math.round((plant.growth_percentage / 100) * (typeInfo.requiredMinutes || 120));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl rounded-2xl p-6 space-y-4">
        <DialogHeader className="flex flex-col items-center text-center space-y-2">
          {/* Status & Difficulty Badges */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 capitalize">
              {typeInfo.rarity}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              {typeInfo.difficultyLabel} ({typeInfo.requiredMinutes}m)
            </span>
            {plant.is_completed ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completado
              </span>
            ) : !plant.is_alive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80">
                <AlertCircle className="w-3 h-3 text-rose-600" /> Marchito
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-800/80">
                <Sprout className="w-3 h-3 text-cyan-600" /> En crecimiento ({plant.growth_percentage}%)
              </span>
            )}
          </div>

          <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {typeInfo.name}
          </DialogTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{typeInfo.description}</p>
        </DialogHeader>

        {/* Central Tree Showcase */}
        <div className="relative py-4 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl">
          <ForestTreeArtwork
            species={plant.plant_type}
            growth={plant.growth_percentage}
            isAlive={plant.is_alive}
            size="lg"
            animated
          />
          <div className="mt-3 text-center">
            <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {plant.growth_percentage}%
            </span>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block">
              Progreso de Concentración
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/80 dark:border-zinc-800 rounded-xl flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase block font-medium">Plantado</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{plantedDate}</span>
            </div>
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/80 dark:border-zinc-800 rounded-xl flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase block font-medium">Tiempo Dedicado</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">~{estimatedMinutes} minutos</span>
            </div>
          </div>

          {completedDate && (
            <div className="col-span-2 p-3 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl flex items-center gap-2.5">
              <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase block font-medium">Completado</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{completedDate}</span>
              </div>
            </div>
          )}

          {diedDate && (
            <div className="col-span-2 p-3 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/60 rounded-xl flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <div>
                <span className="text-[10px] text-rose-700 dark:text-rose-300 uppercase block font-medium">Fecha de Inactividad</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{diedDate}</span>
              </div>
            </div>
          )}
        </div>

        {/* Lore Note */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs text-zinc-600 dark:text-zinc-300 italic flex items-start gap-2">
          <Award className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <span>"{typeInfo.lore}"</span>
        </div>

        <DialogFooter className="mt-2 flex flex-row items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          {onRemove && (
            <div>
              {!isConfirmingDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    ComicAudio.playPop();
                    setIsConfirmingDelete(true);
                  }}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 dark:text-rose-400 font-medium text-xs rounded-lg border border-rose-200 dark:border-rose-900/50 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Eliminar esta planta de la isla"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Planta</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                  <button
                    type="button"
                    onClick={() => {
                      ComicAudio.playPop();
                      onRemove(plant.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 font-medium text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-medium text-xs rounded-xl transition-colors cursor-pointer ml-auto"
          >
            Cerrar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

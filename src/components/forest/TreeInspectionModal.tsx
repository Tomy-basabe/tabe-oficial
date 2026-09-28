import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plant, PLANT_TYPES } from "@/hooks/useForest";
import { ForestTreeArtwork } from "./ForestTreeArtwork";
import { ComicBadge } from "@/components/comic/ComicBadge";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { Calendar, Clock, Sparkles, Trophy, Trash2, Heart, Award, Skull } from "lucide-react";
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

  const rarityBadgeVariant: Record<string, "green" | "pink" | "cyan" | "yellow"> = {
    comun: "green",
    raro: "pink",
    epico: "cyan",
    legendario: "yellow",
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-card text-foreground border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-2xl p-6 overflow-hidden">
        <DialogHeader className="flex flex-col items-center text-center space-y-2">
          {/* Rarity, Difficulty & Status Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <ComicBadge variant={rarityBadgeVariant[typeInfo.rarity] || "green"} size="sm">
              {typeInfo.rarity}
            </ComicBadge>
            <ComicBadge variant="cyan" size="sm">
              🎯 {typeInfo.difficultyLabel} ({typeInfo.requiredMinutes}m)
            </ComicBadge>
            {plant.is_completed ? (
              <ComicBadge variant="yellow" size="sm">
                <Trophy className="w-3 h-3 inline mr-1" /> Completado
              </ComicBadge>
            ) : !plant.is_alive ? (
              <ComicBadge variant="pink" size="sm">
                <Skull className="w-3 h-3 inline mr-1" /> Marchito
              </ComicBadge>
            ) : (
              <ComicBadge variant="green" size="sm">
                🌱 Creciendo ({plant.growth_percentage}%)
              </ComicBadge>
            )}
          </div>

          <DialogTitle className="text-2xl font-black uppercase tracking-wider text-foreground">
            {typeInfo.name}
          </DialogTitle>
          <p className="text-xs font-bold text-muted-foreground">{typeInfo.description}</p>
        </DialogHeader>

        {/* Central Tree Showcase */}
        <div className="relative my-4 py-4 flex flex-col items-center justify-center bg-muted/30 border-4 border-foreground rounded-2xl shadow-[inset_0_4px_8px_rgba(0,0,0,0.06)]">
          <ForestTreeArtwork
            species={plant.plant_type}
            growth={plant.growth_percentage}
            isAlive={plant.is_alive}
            size="lg"
            animated
          />
          <div className="mt-3 text-center">
            <span className="text-3xl font-black text-foreground drop-shadow-[2px_2px_0_hsl(var(--background))]">
              {plant.growth_percentage}%
            </span>
            <span className="text-[10px] font-black uppercase text-muted-foreground block">
              Vitalidad de Concentración
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 bg-card border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-green-500 shrink-0" />
            <div>
              <span className="font-bold text-[10px] text-muted-foreground uppercase block">Plantado</span>
              <span className="font-black text-foreground">{plantedDate}</span>
            </div>
          </div>

          <div className="p-3 bg-card border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))] flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-500 shrink-0" />
            <div>
              <span className="font-bold text-[10px] text-muted-foreground uppercase block">Estudio Dedicado</span>
              <span className="font-black text-foreground">~{estimatedMinutes} minutos</span>
            </div>
          </div>

          {completedDate && (
            <div className="col-span-2 p-3 bg-[#BFFF00]/15 border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))] flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-[10px] text-emerald-700 uppercase block">Crecimiento Completo</span>
                <span className="font-black text-foreground">{completedDate}</span>
              </div>
            </div>
          )}

          {diedDate && (
            <div className="col-span-2 p-3 bg-rose-500/15 border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))] flex items-center gap-2">
              <Skull className="w-4 h-4 text-rose-500 shrink-0" />
              <div>
                <span className="font-bold text-[10px] text-rose-600 uppercase block">Fecha de Pérdida</span>
                <span className="font-black text-foreground">{diedDate} (Inactividad)</span>
              </div>
            </div>
          )}
        </div>

        {/* Comic Lore Note */}
        <div className="p-3 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl text-xs font-medium text-amber-900 dark:text-amber-200 italic flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>"{typeInfo.lore}"</span>
        </div>

        <DialogFooter className="mt-4 flex flex-row items-center justify-between gap-2">
          {!plant.is_alive && onRemove && (
            <button
              onClick={() => {
                ComicAudio.playPop();
                onRemove(plant.id);
                onClose();
              }}
              className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Limpiar Terreno
            </button>
          )}
          <button
            onClick={() => {
              ComicAudio.playPop();
              onClose();
            }}
            className="ml-auto px-5 py-2.5 bg-card hover:bg-muted text-foreground font-black text-xs uppercase rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] transition-all"
          >
            Cerrar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import React, { useMemo } from "react";
import { Plant, PLANT_TYPES } from "@/hooks/useForest";
import { ForestTreeArtwork } from "./ForestTreeArtwork";
import { ComicBadge } from "@/components/comic/ComicBadge";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { Trophy, TrendingUp, Clock, Flame, Skull, Sparkles, Award, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ForestTimelineStatsProps {
  plants: Plant[];
  studyActivity: {
    studyMinutesToday: number;
    studyMinutesThisWeek: number;
    daysSinceLastStudy: number;
  };
  onRemoveDeadPlant?: (plantId: string) => void;
}

export const ForestTimelineStats: React.FC<ForestTimelineStatsProps> = ({
  plants,
  studyActivity,
  onRemoveDeadPlant,
}) => {
  const completedTrees = useMemo(() => plants.filter((p) => p.is_completed), [plants]);
  const deadTrees = useMemo(() => plants.filter((p) => !p.is_alive), [plants]);
  const growingTrees = useMemo(() => plants.filter((p) => p.is_alive && !p.is_completed), [plants]);

  const totalStudyMinutesAllTime = useMemo(() => {
    return plants.reduce((acc, p) => {
      const pInfo = PLANT_TYPES.find((t) => t.id === p.plant_type);
      const req = pInfo?.requiredMinutes || 120;
      return acc + Math.round((p.growth_percentage / 100) * req);
    }, 0);
  }, [plants]);

  const successRate = useMemo(() => {
    const totalFinished = completedTrees.length + deadTrees.length;
    if (totalFinished === 0) return 100;
    return Math.round((completedTrees.length / totalFinished) * 100);
  }, [completedTrees.length, deadTrees.length]);

  // Species distribution breakdown
  const speciesCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    completedTrees.forEach((t) => {
      counts[t.plant_type] = (counts[t.plant_type] || 0) + 1;
    });
    return counts;
  }, [completedTrees]);

  return (
    <div className="space-y-6">
      {/* Top 4 KPI Cards (Gaming Comic Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Trophy,
            val: completedTrees.length,
            label: "Árboles Florecidos",
            color: "bg-[#BFFF00]",
            border: "border-black",
          },
          {
            icon: Clock,
            val: `${Math.floor(totalStudyMinutesAllTime / 60)}h ${totalStudyMinutesAllTime % 60}m`,
            label: "Enfoque en Bosque",
            color: "bg-[#00E5FF]",
            border: "border-black",
          },
          {
            icon: TrendingUp,
            val: `${successRate}%`,
            label: "Tasa de Supervivencia",
            color: "bg-[#FFE66D]",
            border: "border-black",
          },
          {
            icon: Flame,
            val: `${studyActivity.studyMinutesThisWeek}m`,
            label: "Estudio Esta Semana",
            color: "bg-[#FF9B71]",
            border: "border-black",
          },
        ].map((card, i) => (
          <div
            key={i}
            className={cn(
              "rounded-2xl p-4 sm:p-5 border-4 shadow-[4px_4px_0_0_#000] flex items-center gap-3.5 transition-transform hover:translate-y-[-2px]",
              card.color,
              card.border
            )}
          >
            <div className="w-12 h-12 bg-white border-3 border-black rounded-xl shadow-[2px_2px_0_0_#000] flex items-center justify-center shrink-0 -rotate-3">
              <card.icon className="w-6 h-6 text-black" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-black leading-none drop-shadow-[2px_2px_0_#fff]">
                {card.val}
              </p>
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-black/80 mt-1">
                {card.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Species Distribution & Lore Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Species Breakdown */}
        <div className="lg:col-span-2 bg-card text-foreground rounded-3xl border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] p-6 space-y-4">
          <div className="flex items-center justify-between border-b-3 border-foreground pb-4">
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-500" />
              <h3 className="text-xl font-black uppercase text-foreground">
                Biodiversidad de tu Bosque
              </h3>
            </div>
            <ComicBadge variant="green" size="sm">
              {completedTrees.length} Completados
            </ComicBadge>
          </div>

          {completedTrees.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground font-bold text-sm">
              Aún no has completado ningún árbol. ¡Estudia 25 minutos para ver florecer tu primera especie!
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              {PLANT_TYPES.filter((type) => (speciesCounts[type.id] || 0) > 0)
                .sort((a, b) => (speciesCounts[b.id] || 0) - (speciesCounts[a.id] || 0))
                .map((type) => {
                const count = speciesCounts[type.id] || 0;
                const percentage =
                  completedTrees.length > 0
                    ? Math.round((count / completedTrees.length) * 100)
                    : 0;

                return (
                  <div
                    key={type.id}
                    className="p-3 bg-muted/40 border-2 border-foreground rounded-2xl flex items-center gap-3 shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                  >
                    <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-card border-2 border-foreground rounded-xl">
                      <ForestTreeArtwork species={type.id} stage="full" size="sm" animated={false} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs font-black uppercase">
                        <span className="truncate">{type.name}</span>
                        <span className="text-emerald-600 dark:text-emerald-400">{count}x</span>
                      </div>
                      <div className="h-2.5 bg-muted border border-foreground rounded-full overflow-hidden mt-1.5">
                        <div
                          className="h-full bg-[#BFFF00] transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cemetery / Dead Trees Cleaner */}
        <div className="bg-[#2D3748] text-white rounded-3xl border-4 border-black shadow-[8px_8px_0_0_#000] p-6 space-y-4">
          <div className="flex items-center justify-between border-b-3 border-black/60 pb-4">
            <div className="flex items-center gap-2">
              <Skull className="w-6 h-6 text-rose-400" />
              <h3 className="text-xl font-black uppercase text-white">
                Cementerio ({deadTrees.length})
              </h3>
            </div>
          </div>

          <p className="text-xs text-white/80 font-bold">
            Árboles que se secaron tras 7 días de inactividad o fueron abandonados.
          </p>

          {deadTrees.length === 0 ? (
            <div className="text-center py-8 text-white/60 font-black text-xs uppercase bg-black/20 rounded-2xl border-2 border-dashed border-white/20">
              ¡Cementerio vacío! Gran constancia de estudio.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {deadTrees.map((dead) => {
                const info = PLANT_TYPES.find((t) => t.id === dead.plant_type) || PLANT_TYPES[0];
                return (
                  <div
                    key={dead.id}
                    className="p-3 bg-black/30 border-2 border-black rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                        <ForestTreeArtwork species={dead.plant_type} stage="dead" size="sm" animated={false} />
                      </div>
                      <div>
                        <span className="font-black text-xs uppercase block text-white">
                          {info.name}
                        </span>
                        <span className="text-[10px] text-white/60 font-bold">
                          {dead.died_at ? new Date(dead.died_at).toLocaleDateString("es-ES") : "Marchito"}
                        </span>
                      </div>
                    </div>

                    {onRemoveDeadPlant && (
                      <button
                        onClick={() => {
                          ComicAudio.playPop();
                          onRemoveDeadPlant(dead.id);
                        }}
                        className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg border border-black shadow-[1px_1px_0_0_#000]"
                        title="Limpiar del cementerio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

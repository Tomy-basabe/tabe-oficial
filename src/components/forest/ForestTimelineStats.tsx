import React, { useMemo } from "react";
import { Plant, PLANT_TYPES } from "@/hooks/useForest";
import { ForestTreeArtwork } from "./ForestTreeArtwork";
import { ComicAudio } from "@/components/comic/ComicAudio";
import { Trophy, TrendingUp, Clock, Flame, Skull, Award, Trash2, AlertCircle, Trees } from "lucide-react";
import { cn } from "@/lib/utils";

interface ForestTimelineStatsProps {
  plants: Plant[];
  studyActivity: {
    studyMinutesToday: number;
    studyMinutesThisWeek: number;
    daysSinceLastStudy: number;
    totalStudyMinutesAllTime?: number;
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
    if (studyActivity.totalStudyMinutesAllTime !== undefined && studyActivity.totalStudyMinutesAllTime > 0) {
      return studyActivity.totalStudyMinutesAllTime;
    }
    return plants.reduce((acc, p) => {
      const pInfo = PLANT_TYPES.find((t) => t.id === p.plant_type);
      const req = pInfo?.requiredMinutes || 120;
      return acc + Math.round((p.growth_percentage / 100) * req);
    }, 0);
  }, [plants, studyActivity.totalStudyMinutesAllTime]);

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
      {/* Top 4 KPI Cards (Notion / ChatGPT Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          {
            icon: Trophy,
            val: completedTrees.length,
            label: "Árboles Florecidos",
            iconColor: "text-emerald-600 dark:text-emerald-400",
            iconBg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/80",
          },
          {
            icon: Clock,
            val: `${Math.floor(totalStudyMinutesAllTime / 60)}h ${totalStudyMinutesAllTime % 60}m`,
            label: "Enfoque Total",
            iconColor: "text-cyan-600 dark:text-cyan-400",
            iconBg: "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-800/80",
          },
          {
            icon: TrendingUp,
            val: `${successRate}%`,
            label: "Tasa de Supervivencia",
            iconColor: "text-amber-600 dark:text-amber-400",
            iconBg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/80",
          },
          {
            icon: Flame,
            val: `${studyActivity.studyMinutesThisWeek}m`,
            label: "Estudio Esta Semana",
            iconColor: "text-orange-600 dark:text-orange-400",
            iconBg: "bg-orange-50 dark:bg-orange-950/40 border-orange-200/80 dark:border-orange-800/80",
          },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 rounded-2xl p-4 sm:p-5 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs flex items-center gap-3.5 transition-colors"
          >
            <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", card.iconBg)}>
              <card.icon className={cn("w-5 h-5", card.iconColor)} />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono leading-none">
                {card.val}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-1">
                {card.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Species Distribution & Lore Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Species Breakdown */}
        <div className="lg:col-span-2 bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                <Trees className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Biodiversidad de tu Bosque
              </h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              {completedTrees.length} Completados
            </span>
          </div>

          {completedTrees.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 dark:text-zinc-500 text-xs sm:text-sm">
              Aún no has completado ningún árbol. ¡Completa 25 minutos de concentración para ver florecer tu primera especie!
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2.5 pt-1">
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
                    className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl flex items-center gap-3"
                  >
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                      <ForestTreeArtwork species={type.id} stage="full" size="sm" animated={false} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="truncate text-zinc-800 dark:text-zinc-200">{type.name}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">{count}x</span>
                      </div>
                      <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden mt-1.5">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
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
        <div className="bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center">
                <Skull className="w-4 h-4 text-rose-500" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Registro de Inactividad ({deadTrees.length})
              </h3>
            </div>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Árboles secados tras 7 días sin registrar sesiones de estudio o abandonados.
          </p>

          {deadTrees.length === 0 ? (
            <div className="text-center py-10 text-zinc-400 dark:text-zinc-500 text-xs bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
              ¡Sin árboles marchitos! Excelente constancia académica.
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {deadTrees.map((dead) => {
                const info = PLANT_TYPES.find((t) => t.id === dead.plant_type) || PLANT_TYPES[0];
                return (
                  <div
                    key={dead.id}
                    className="p-2.5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                        <ForestTreeArtwork species={dead.plant_type} stage="dead" size="sm" animated={false} />
                      </div>
                      <div>
                        <span className="text-xs font-medium block text-zinc-800 dark:text-zinc-200">
                          {info.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
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
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Limpiar del registro"
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

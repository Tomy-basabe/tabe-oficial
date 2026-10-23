import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy,
  
  Award,
  CheckCircle2,
  Lock,
  ChevronRight,
  TrendingUp, Zap } from "lucide-react";
import { Achievement } from "@/hooks/useAchievements";
import {
  calculateUserRank,
  RANKS,
  categoryThemes,
} from "./achievementUtils";

interface AchievementRankModalProps {
  open: boolean;
  onClose: () => void;
  achievements: Achievement[];
  isUnlocked: (id: string) => boolean;
  totalXP: number;
}

export function AchievementRankModal({
  open,
  onClose,
  achievements,
  isUnlocked,
  totalXP,
}: AchievementRankModalProps) {
  const { rank, nextRank, progressPercent, currentLevelXP, levelTargetXP } =
    calculateUserRank(totalXP);

  const unlockedCount = achievements.filter((a) => isUnlocked(a.id)).length;
  const totalCount = achievements.length;
  const overallPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-2xl rounded-2xl max-h-[88vh] overflow-y-auto">
        {/* Header estilo Bento */}
        <div className="p-6 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-linear-to-b from-zinc-50 to-white dark:from-zinc-900/60 dark:to-[#18181b]">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Award className="w-3.5 h-3.5" />
              Prestigio y Progresión
            </span>
            <div className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{totalXP} XP acumulados</span>
            </div>
          </div>

          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              Nivel {rank.level} · {rank.title}
            </DialogTitle>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-normal">
              Acumula experiencia desbloqueando logros para ascender de categoría y ganar prestigio en Tabe.
            </p>
          </DialogHeader>

          {/* Barra de Progreso al Siguiente Nivel */}
          <div className="mt-5 p-4 rounded-xl bg-white dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-medium mb-2">
              <span className="text-zinc-700 dark:text-zinc-300">
                Progreso hacia Nivel {nextRank ? nextRank.level : rank.level} ({nextRank?.title || "Máximo"})
              </span>
              <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
                {nextRank ? `${currentLevelXP} / ${levelTargetXP} XP (${progressPercent}%)` : "¡Rango máximo!"}
              </span>
            </div>
            <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-amber-500 to-amber-400 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {nextRank && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-amber-500" />
                Faltan {levelTargetXP - currentLevelXP} XP para alcanzar el rango de <strong>{nextRank.title}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Cuerpo de Estadísticas */}
        <div className="p-6 space-y-6">
          {/* Desglose por Categoría */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Distribución por Áreas ({unlockedCount}/{totalCount} logros · {overallPercent}%)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(categoryThemes).map(([catKey, theme]) => {
                const catAchievements = achievements.filter((a) => a.categoria === catKey);
                const catUnlocked = catAchievements.filter((a) => isUnlocked(a.id)).length;
                const catPercent =
                  catAchievements.length > 0
                    ? Math.round((catUnlocked / catAchievements.length) * 100)
                    : 0;

                return (
                  <div
                    key={catKey}
                    className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${theme.dotColor}`} />
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {theme.label}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {catUnlocked} / {catAchievements.length}
                      </span>
                    </div>

                    <div className="h-1.5 bg-zinc-200/70 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${theme.accentClass} transition-all duration-500 rounded-full`}
                        style={{ width: `${catPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Escalera de Rangos */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
              Escala de Prestigio Tabe
            </h4>

            <div className="space-y-1.5">
              {RANKS.map((r) => {
                const isCurrent = r.level === rank.level;
                const isPassed = rank.level > r.level;

                return (
                  <div
                    key={r.level}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                      isCurrent
                        ? "bg-amber-500/10 border-amber-500/30 text-zinc-900 dark:text-zinc-100 font-semibold"
                        : isPassed
                        ? "bg-zinc-50/60 dark:bg-zinc-900/30 border-zinc-200/50 dark:border-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                        : "bg-transparent border-transparent text-zinc-400 dark:text-zinc-600"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : isCurrent ? (
                        <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-zinc-400/60 dark:text-zinc-600 shrink-0" />
                      )}
                      <div>
                        <span className="font-medium">
                          Nivel {r.level}: {r.title}
                        </span>
                        {isCurrent && (
                          <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold">
                            ACTUAL
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] tabular-nums font-mono opacity-80">
                      {r.minXP} XP
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-end bg-zinc-50/40 dark:bg-zinc-900/30">
          <Button
            variant="default"
            size="sm"
            onClick={onClose}
            className="text-xs font-medium"
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

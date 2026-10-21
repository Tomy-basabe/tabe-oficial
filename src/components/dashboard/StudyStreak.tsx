import { useMemo } from "react";
import { Flame, Trophy, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudyStreakProps {
  currentStreak: number;
  bestStreak: number;
  weekData: { day: string; studied: boolean; minutes: number; isToday?: boolean }[];
}

export function StudyStreak({ currentStreak = 0, bestStreak = 0, weekData = [] }: StudyStreakProps) {
  // Calcular racha activa consecutiva directamente desde los días de la semana
  const computedWeekStreak = useMemo(() => {
    if (!weekData || weekData.length === 0) return 0;

    const todayIndex = weekData.findIndex((d) => d.isToday);
    if (todayIndex === -1) {
      // Fallback: si no hay isToday explícito, verificar desde el último día estudiado
      let count = 0;
      for (let i = weekData.length - 1; i >= 0; i--) {
        if (weekData[i]?.studied) count++;
        else if (count > 0) break;
      }
      return count;
    }

    let streak = 0;
    const studiedToday = !!weekData[todayIndex]?.studied;
    // Si estudió hoy, contar hacia atrás desde hoy. Si no estudió hoy todavía, verificar desde ayer
    const startIndex = studiedToday ? todayIndex : todayIndex - 1;

    for (let i = startIndex; i >= 0; i--) {
      if (weekData[i]?.studied) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [weekData]);

  // La racha efectiva es la mayor entre la guardada en BD/stats y la consecutiva verificada
  const effectiveCurrentStreak = Math.max(currentStreak || 0, computedWeekStreak);
  const effectiveBestStreak = Math.max(bestStreak || 0, effectiveCurrentStreak);

  const paddedWeekData = [...weekData];
  while (paddedWeekData.length < 7) {
    paddedWeekData.push({ day: "-", studied: false, minutes: 0 });
  }
  const last7Days = paddedWeekData.slice(-7);

  return (
    <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">Asistencia</h3>
        </div>
        <div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 font-medium text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
          Racha de Estudio
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 p-3 rounded-lg flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xl font-semibold tracking-tight leading-none text-zinc-900 dark:text-zinc-100">
              {effectiveCurrentStreak}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5">
              {effectiveCurrentStreak === 1 ? "Día actual" : "Días seguidos"}
            </p>
          </div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 p-3 rounded-lg flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xl font-semibold tracking-tight leading-none text-zinc-900 dark:text-zinc-100">
              {effectiveBestStreak}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5">
              Mejor racha
            </p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl p-3">
        <p className="text-[10px] font-medium uppercase text-center mb-2.5 text-zinc-400 dark:text-zinc-500 tracking-wider">
          Registro Semanal
        </p>
        <div className="flex justify-between items-center w-full px-1">
          {last7Days.map((day, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                  day.studied
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                    : day.isToday
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100"
                    : "bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-400"
                )}
              >
                {day.studied ? (
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                )}
              </div>
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase",
                    day.isToday ? "text-zinc-900 dark:text-zinc-100 font-semibold" : "text-zinc-400"
                  )}
                >
                  {day.day}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

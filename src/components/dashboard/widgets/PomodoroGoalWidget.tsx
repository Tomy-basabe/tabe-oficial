import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Target, Flame, TrendingUp } from "lucide-react";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { Skeleton } from "@/components/ui/skeleton";

interface PomodoroGoalWidgetProps {
  weekData?: any[];
  loading?: boolean;
}

export function PomodoroGoalWidget(props: PomodoroGoalWidgetProps) {
  if (props.weekData !== undefined && props.loading !== undefined) {
    return <PomodoroGoalWidgetContent weekData={props.weekData} loading={props.loading} />;
  }
  return <PomodoroGoalWidgetConnected />;
}

function PomodoroGoalWidgetConnected() {
  const { weekData, loading } = useDashboardStats();
  return <PomodoroGoalWidgetContent weekData={weekData} loading={loading} />;
}

function PomodoroGoalWidgetContent({ weekData, loading }: { weekData: any[]; loading: boolean }) {
  if (loading) {
    return <Skeleton className="w-full h-36 rounded-xl" />;
  }

  const todayData = weekData && weekData.length > 0 
    ? (weekData.find(d => d.isToday) || weekData[weekData.length - 1]) 
    : { minutes: 0 };
  const todayMinutes = todayData.minutes || 0;
  const dailyGoalMinutes = 120;
  const progressPercentage = Math.min(Math.round((todayMinutes / dailyGoalMinutes) * 100), 100);
  const isGoalReached = todayMinutes >= dailyGoalMinutes;

  return (
    <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 sm:p-5 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
            <Target className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">Meta Diaria</h3>
        </div>
        {isGoalReached && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60 uppercase tracking-wider">
            <Flame className="w-3 h-3" /> Lograda
          </span>
        )}
      </div>

      {/* Compact Horizontal Layout: Ring on left, metrics on right */}
      <div className="flex items-center gap-4 py-1">
        <div className="shrink-0">
          <ProgressRing progress={progressPercentage} size={76} strokeWidth={6}>
            <div className="text-center">
              <p className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 leading-none">{progressPercentage}%</p>
            </div>
          </ProgressRing>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-zinc-400 text-[11px] block">Hoy</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{todayMinutes} min</span>
            </div>
            <div className="text-right">
              <span className="text-zinc-400 text-[11px] block">Objetivo</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{dailyGoalMinutes} min</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            <TrendingUp className="w-3 h-3 text-zinc-400 shrink-0" />
            <span className="truncate">
              {isGoalReached ? "¡Meta superada!" : `Faltan ${dailyGoalMinutes - todayMinutes}m para la meta`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Target, Flame, TrendingUp } from "lucide-react";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { Skeleton } from "@/components/ui/skeleton";

export function PomodoroGoalWidget() {
  const { weekData, loading } = useDashboardStats();
  
  if (loading) {
    return <Skeleton className="w-full h-48 rounded-2xl" />;
  }

  const todayData = weekData && weekData.length > 0 ? weekData[weekData.length - 1] : { minutes: 0 };
  const todayMinutes = todayData.minutes;
  const dailyGoalMinutes = 120;
  const progressPercentage = Math.min(Math.round((todayMinutes / dailyGoalMinutes) * 100), 100);
  const isGoalReached = todayMinutes >= dailyGoalMinutes;

  return (
    <div className="neo-bento-card bento-hover-orange p-6">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#ff9415]/12 rounded-xl">
              <Target className="w-5 h-5 text-[#ff9415]" />
            </div>
            <h3 className="font-extrabold text-lg">Meta Diaria</h3>
          </div>
          {isGoalReached && (
            <span className="flex items-center gap-1 text-[10px] font-extrabold text-[#ff9415] bg-[#ff9415]/10 px-2 py-1 rounded-full uppercase tracking-wider">
              <Flame className="w-3 h-3" /> Lograda
            </span>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center py-4">
          <ProgressRing progress={progressPercentage} size={110} strokeWidth={8}>
            <div className="text-center flex flex-col items-center justify-center mt-1">
              <p className="text-2xl font-black text-[#ff9415]">{progressPercentage}%</p>
              <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mt-0.5">Focus</p>
            </div>
          </ProgressRing>
        </div>

        <div className="mt-auto">
          <div className="flex items-center justify-between text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs font-bold">Progreso hoy</span>
              <span className="font-extrabold">{todayMinutes} min</span>
            </div>
            <div className="h-6 w-px bg-border mx-2" />
            <div className="flex flex-col text-right">
              <span className="text-muted-foreground text-xs font-bold">Objetivo</span>
              <span className="font-extrabold">{dailyGoalMinutes} min</span>
            </div>
          </div>
          
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-muted-foreground bg-secondary/50 rounded-xl px-2.5 py-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#ff9415]" />
            <p>
              {isGoalReached 
                ? "¡Imparable! Has superado tu meta." 
                : `Faltan ${dailyGoalMinutes - todayMinutes} min para alcanzar la meta.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

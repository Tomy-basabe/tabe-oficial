import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Zap, Trophy, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function NextMilestoneWidget() {
  const { userStats, loading } = useDashboardStats();

  if (loading) {
    return <Skeleton className="w-full h-48 rounded-xl" />;
  }

  const xp = userStats?.xp_total || 0;
  // Fallback simple level calculation if 'nivel' is not in userStats
  const currentLevel = userStats?.nivel || Math.floor(xp / 1000) + 1;
  const xpForNextLevel = currentLevel * 1000;
  const xpCurrentLevel = (currentLevel - 1) * 1000;
  const xpProgress = xp - xpCurrentLevel;
  const xpRequiredSegment = xpForNextLevel - xpCurrentLevel;
  const percentage = Math.min(Math.round((xpProgress / xpRequiredSegment) * 100), 100);

  const rewards = [
    "Nueva Insignia",
    "Marco de Avatar Épico",
    "Color de Tema Exclusivo"
  ];
  const nextReward = rewards[(currentLevel - 1) % rewards.length];

  return (
    <div className="card-gamer rounded-xl p-5 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Zap className="w-5 h-5 text-neon-gold" />
              </div>
              <h3 className="font-display font-semibold text-lg">Próximo Nivel</h3>
            </div>
            <span className="flex items-center gap-1 font-display font-bold text-xl text-neon-gold drop-shadow-md">
              Lvl {currentLevel}
            </span>
          </div>
          
          <div className="space-y-2 mt-6">
            <div className="flex justify-between items-end">
              <span className="text-2xl font-bold">{xp} <span className="text-sm font-normal text-muted-foreground uppercase tracking-widest">XP</span></span>
              <span className="text-sm font-medium text-muted-foreground">{xpForNextLevel} XP</span>
            </div>
            
            <div className="relative h-3 bg-secondary rounded-full overflow-hidden border border-white/5">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-200 transition-all duration-1000 ease-out"
                style={{ width: `${percentage}%` }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[shimmer_1s_linear_infinite]" />
              </div>
            </div>
            <p className="text-xs text-right text-muted-foreground mt-1">
              Faltan {xpForNextLevel - xp} XP para subir
            </p>
          </div>
        </div>

        <div className="mt-6 p-3 bg-secondary/40 rounded-xl border border-white/5 flex items-start gap-3">
          <div className="p-1.5 bg-yellow-500/20 rounded-md shrink-0">
            <Trophy className="w-4 h-4 text-neon-gold" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Recompensa Sig. Nivel</p>
            <p className="text-sm font-semibold flex items-center gap-1.5">
              {nextReward} <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

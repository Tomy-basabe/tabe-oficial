import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Zap, Trophy, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function NextMilestoneWidget() {
  const { userStats, loading } = useDashboardStats();

  if (loading) {
    return <Skeleton className="w-full h-48 rounded-2xl" />;
  }

  const xp = userStats?.xp_total || 0;
  const currentLevel = Math.max(1, Math.floor(xp / 1000) + 1);
  const xpForNextLevel = currentLevel * 1000;
  const xpCurrentLevel = (currentLevel - 1) * 1000;
  const xpProgress = xp - xpCurrentLevel;
  const xpRequiredSegment = xpForNextLevel - xpCurrentLevel;
  const percentage = Math.min(Math.round((xpProgress / xpRequiredSegment) * 100), 100);

  const rewards = ["Nueva Insignia", "Marco de Avatar Épico", "Color de Tema Exclusivo"];
  const nextReward = rewards[(currentLevel - 1) % rewards.length];

  return (
    <div className="neo-bento-card bento-hover-yellow p-6">
      <div className="flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#ffd21c]/12 rounded-xl">
                <Zap className="w-5 h-5 text-[#ffd21c]" />
              </div>
              <h3 className="font-extrabold text-lg">Próximo Nivel</h3>
            </div>
            <span className="font-black text-xl text-[#ffd21c]">
              Lvl {currentLevel}
            </span>
          </div>
          
          <div className="space-y-2 mt-6">
            <div className="flex justify-between items-end">
              <span className="text-2xl font-black">{xp} <span className="text-sm font-extrabold text-muted-foreground uppercase tracking-widest">XP</span></span>
              <span className="text-sm font-bold text-muted-foreground">{xpForNextLevel} XP</span>
            </div>
            
            {/* Clean progress bar — solid color, no gradient stripes */}
            <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-[#ffd21c] rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-xs font-bold text-right text-muted-foreground mt-1">
              Faltan {xpForNextLevel - xp} XP para subir
            </p>
          </div>
        </div>

        <div className="mt-6 p-3 bg-secondary/40 rounded-xl flex items-start gap-3">
          <div className="p-1.5 bg-[#ffd21c]/15 rounded-lg shrink-0">
            <Trophy className="w-4 h-4 text-[#ffd21c]" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-0.5">Recompensa Sig. Nivel</p>
            <p className="text-sm font-extrabold flex items-center gap-1.5">
              {nextReward} <Star className="w-3 h-3 text-[#ffd21c] fill-[#ffd21c]" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useDashboardStats } from "@/hooks/useDashboardStats";
import { User, Shield, Sword, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

  const rewards = ["Nueva Insignia", "Marco de Avatar Épico", "Color Exclusivo"];
  const nextReward = rewards[(currentLevel - 1) % rewards.length];

  return (
    <div className="neo-bento-card bg-[#2b2b2b] text-white p-0 overflow-hidden border-[4px] border-foreground hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#ffd21c] transition-all">
      {/* RPG Card Header */}
      <div className="bg-[#1a1a1a] p-4 flex items-center justify-between border-b-[4px] border-foreground">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-md border-2 border-foreground flex items-center justify-center overflow-hidden shadow-[inset_0_-4px_0_rgba(0,0,0,0.1)]">
            <User className="w-8 h-8 text-black mt-2" />
          </div>
          <div>
            <h3 className="font-black text-xl leading-none uppercase text-[#ffd21c]">Estudiante</h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Clase: Ingeniero</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-white italic drop-shadow-[2px_2px_0_#ef4444]">
            LVL {currentLevel}
          </div>
        </div>
      </div>

      {/* RPG Stats & XP */}
      <div className="p-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMyYjJiMmIiPjwvcmVjdD48cmVjdCB3aWR0aD0iMiIgaGVpZ2h0PSIyIiBmaWxsPSIjMzMzMzMzIj48L3JlY3Q+PC9zdmc+')]">
        
        {/* Fake Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center gap-2 bg-[#1a1a1a] p-1.5 rounded border-2 border-foreground/50">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold font-mono">INT: 99</span>
          </div>
          <div className="flex items-center gap-2 bg-[#1a1a1a] p-1.5 rounded border-2 border-foreground/50">
            <Sword className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold font-mono">FOC: {Math.floor(xp / 200)}</span>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mb-1 flex justify-between items-end">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#ffd21c]">Experiencia</span>
          <span className="text-xs font-bold font-mono text-gray-300">{xp} / {xpForNextLevel}</span>
        </div>
        <div className="h-4 bg-[#1a1a1a] rounded-sm border-2 border-foreground relative overflow-hidden p-0.5">
          <div 
            className="h-full bg-gradient-to-r from-[#ffd21c] to-[#ff9415] rounded-sm relative"
            style={{ width: `${percentage}%` }}
          >
            {/* Glossy top effect */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/30"></div>
          </div>
        </div>
        <p className="text-[9px] font-bold text-right text-gray-400 mt-1 uppercase">
          Faltan {xpForNextLevel - xp} XP
        </p>

        {/* Loot Box */}
        <div className="mt-4 flex items-center gap-3 bg-[#ffd21c] p-2 rounded-lg border-2 border-foreground text-black">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center border-2 border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,1)] shrink-0">
            <Trophy className="w-4 h-4 text-black" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase text-black/80">Loot al subir de nivel</span>
            <span className="text-xs font-black">{nextReward}</span>
          </div>
        </div>

      </div>
    </div>
  );
}

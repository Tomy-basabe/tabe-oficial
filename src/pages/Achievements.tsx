import { useState, useEffect } from "react";
import {
  Trophy, GraduationCap, Star, Clock, BookOpen, Flame,
  Layers, Compass, FilePlus, Library, Lock, Sparkles, RefreshCw,
  Target, Users, MessageCircle, FolderOpen, Sprout, Brain, Calendar, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAchievements } from "@/hooks/useAchievements";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

const iconMap: Record<string, any> = {
  trophy: Trophy,
  "graduation-cap": GraduationCap,
  star: Star,
  clock: Clock,
  "book-open": BookOpen,
  flame: Flame,
  layers: Layers,
  compass: Compass,
  "file-plus": FilePlus,
  library: Library,
  target: Target,
  users: Users,
  "message-circle": MessageCircle,
  folder: FolderOpen,
  sprout: Sprout,
  brain: Brain,
  calendar: Calendar,
};

const categoryConfig = {
  academico: {
    label: "Académicos",
    colorHex: "#BFFF00",
    bgColor: "bg-[#BFFF00]",
    borderColor: "border-[#BFFF00]",
  },
  estudio: {
    label: "Estudio",
    colorHex: "#00E5FF",
    bgColor: "bg-[#00E5FF]",
    borderColor: "border-[#00E5FF]",
  },
  uso: {
    label: "Uso",
    colorHex: "#FF9B71",
    bgColor: "bg-[#FF9B71]",
    borderColor: "border-[#FF9B71]",
  },
};

export default function Achievements() {
  const {
    achievements,
    loading,
    stats,
    isUnlocked,
    getUnlockDate,
    checkAndUnlockAchievements
  } = useAchievements();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Verificar logros al cargar la página
  useEffect(() => {
    const checkOnLoad = async () => {
      setChecking(true);
      await checkAndUnlockAchievements();
      setChecking(false);
    };
    checkOnLoad();
  }, []);

  const handleRefreshAchievements = async () => {
    setChecking(true);
    await checkAndUnlockAchievements();
    setChecking(false);
  };

  const filteredAchievements = achievements.filter(
    a => !selectedCategory || a.categoria === selectedCategory
  );

  if (loading && achievements.length === 0) {
    return <LoadingScreen message="Cargando Logros..." submessage="Revisando tus metas alcanzadas..." />;
  }

  const groupedAchievements = {
    academico: filteredAchievements.filter(a => a.categoria === "academico"),
    estudio: filteredAchievements.filter(a => a.categoria === "estudio"),
    uso: filteredAchievements.filter(a => a.categoria === "uso"),
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black uppercase tracking-widest text-foreground">
            Logros
          </h1>
          <p className="text-muted-foreground font-bold mt-1 uppercase text-sm">
            Desbloquea logros y gana XP mientras estudias
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRefreshAchievements}
            disabled={checking}
            className="bg-[#C688EB] border-4 border-foreground !text-black font-black uppercase text-sm rounded-xl px-4 py-2 flex items-center gap-2 hover:translate-y-[-2px] shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4 !text-black", checking && "animate-spin")} />
            <span className="!text-black">Verificar</span>
          </button>
          <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl px-4 py-2 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-foreground" />
            <span className="font-black text-foreground text-lg">{stats.unlocked}</span>
            <span className="text-sm font-bold text-muted-foreground">/ {stats.total}</span>
          </div>
          <div className="bg-[#BFFF00] border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl px-4 py-2 flex items-center gap-2 !text-black">
            <Sparkles className="w-5 h-5 !text-black" />
            <span className="font-black !text-black text-lg">{stats.totalXP}</span>
            <span className="text-sm font-bold !text-black/75">XP</span>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-card border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-2xl p-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h2 className="font-black uppercase text-xl text-foreground">Progreso General</h2>
          <span className="text-sm font-bold text-muted-foreground uppercase">
            {stats.total > 0 ? Math.round((stats.unlocked / stats.total) * 100) : 0}% completado
          </span>
        </div>
        
        <div className="h-6 bg-muted border-4 border-foreground rounded-full overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] z-10">
          <div
            className="h-full bg-[#BFFF00] transition-all duration-1000"
            style={{ width: `${stats.total > 0 ? (stats.unlocked / stats.total) * 100 : 0}%` }}
          />
          {/* Grid lines to make it blocky */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex-1 border-r-2 border-foreground/20" />
            ))}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 relative z-10">
          {Object.entries(categoryConfig).map(([key, config]) => {
            const categoryAchievements = achievements.filter(a => a.categoria === key);
            const unlockedCount = categoryAchievements.filter(a => isUnlocked(a.id)).length;
            const isSelected = selectedCategory === key;

            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(isSelected ? null : key)}
                className={cn(
                  "p-4 rounded-xl border-4 transition-all text-center group border-foreground",
                  isSelected
                    ? cn(config.bgColor, "!text-black shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.25)] scale-[0.98]")
                    : "bg-card text-foreground hover:translate-y-[-2px] shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] hover:bg-muted"
                )}
              >
                <p className={cn("text-3xl font-black", isSelected ? "!text-black" : "text-foreground")}>
                  {unlockedCount}/{categoryAchievements.length}
                </p>
                <p className={cn(
                  "text-sm font-bold uppercase mt-1 transition-colors",
                  isSelected ? "!text-black/85" : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {config.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Achievements by Category */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-card border-4 border-foreground/30 rounded-xl p-6 animate-pulse shadow-[4px_4px_0_0_hsl(var(--foreground)/0.2)]">
              <div className="w-16 h-16 bg-muted border-2 border-foreground/20 rounded-xl mb-4" />
              <div className="h-4 bg-muted rounded-sm mb-2" />
              <div className="h-3 bg-muted rounded-sm w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8 tour-achievements-list">
          {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => {
            if (selectedCategory && selectedCategory !== category) return null;
            if (categoryAchievements.length === 0) return null;

            const config = categoryConfig[category as keyof typeof categoryConfig];

            return (
              <div key={category}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-4 h-4 rounded-full border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]", config.bgColor)} />
                  <h2 className="font-black uppercase text-xl text-foreground">{config.label}</h2>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryAchievements.map(achievement => {
                    const unlocked = isUnlocked(achievement.id);
                    const Icon = iconMap[achievement.icono] || Trophy;
                    const unlockDate = getUnlockDate(achievement.id);

                    if (unlocked) {
                      return (
                        <div
                          key={achievement.id}
                          className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] rounded-2xl p-6 transition-all relative overflow-hidden flex flex-col justify-between"
                        >
                          {/* Top colored accent line */}
                          <div className={cn("absolute top-0 left-0 right-0 h-2", config.bgColor)} />

                          <div className="relative z-10 flex-1 flex flex-col">
                            <div className="flex items-start justify-between mb-4">
                              <div className={cn(
                                "w-14 h-14 rounded-xl border-4 border-foreground flex items-center justify-center shadow-[3px_3px_0_0_hsl(var(--foreground))]",
                                config.bgColor
                              )}>
                                <Icon className="w-7 h-7 !text-black" />
                              </div>
                              <div className={cn(
                                "px-3 py-1 text-xs font-black uppercase border-2 border-foreground rotate-[5deg] shadow-[2px_2px_0_0_hsl(var(--foreground))] !text-black",
                                config.bgColor
                              )}>
                                +{achievement.xp_reward} XP
                              </div>
                            </div>

                            <h3 className="font-black text-lg uppercase mb-2 text-foreground">
                              {achievement.nombre}
                            </h3>
                            <p className="text-sm font-bold leading-relaxed text-muted-foreground flex-1">
                              {achievement.descripcion}
                            </p>

                            {unlockDate && (
                              <div className="text-xs mt-4 font-black uppercase flex items-center gap-1.5 text-foreground/80 pt-3 border-t border-border">
                                <Sparkles className="w-3.5 h-3.5 text-[#BFFF00]" />
                                <span>Desbloqueado: {unlockDate}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Locked achievement card
                    return (
                      <div
                        key={achievement.id}
                        className="bg-card/40 dark:bg-card/30 border-4 border-foreground/30 shadow-[4px_4px_0_0_hsl(var(--foreground)/0.15)] rounded-2xl p-6 transition-all relative overflow-hidden flex flex-col justify-between opacity-70 hover:opacity-100"
                      >
                        <div className="relative z-10 flex-1 flex flex-col">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-14 h-14 rounded-xl border-4 border-foreground/30 flex items-center justify-center bg-muted text-foreground/70 shadow-[2px_2px_0_0_hsl(var(--foreground)/0.15)]">
                              <Lock className="w-7 h-7 text-muted-foreground" />
                            </div>
                            <div className="px-3 py-1 text-xs font-black uppercase border-2 border-foreground/30 rotate-[5deg] bg-muted text-muted-foreground shadow-[2px_2px_0_0_hsl(var(--foreground)/0.15)]">
                              +{achievement.xp_reward} XP
                            </div>
                          </div>

                          <h3 className="font-black text-lg uppercase mb-2 text-foreground/70">
                            {achievement.nombre}
                          </h3>
                          <p className="text-sm font-bold leading-relaxed text-muted-foreground/80 flex-1">
                            {achievement.descripcion}
                          </p>

                          <div className="text-xs mt-4 font-black uppercase flex items-center gap-1.5 text-muted-foreground/60 pt-3 border-t border-border/40">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Bloqueado</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

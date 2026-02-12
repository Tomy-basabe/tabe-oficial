import { useState, useEffect } from "react";
import {
  Trophy, GraduationCap, Star, Clock, BookOpen, Flame,
  Layers, Compass, FilePlus, Library, Lock, Sparkles, RefreshCw,
  Target, Users, MessageCircle, FolderOpen, Sprout, Brain, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAchievements } from "@/hooks/useAchievements";

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
    color: "text-neon-gold",
    bgColor: "bg-neon-gold/10",
    borderColor: "border-neon-gold/30",
  },
  estudio: {
    label: "Estudio",
    color: "text-neon-cyan",
    bgColor: "bg-neon-cyan/10",
    borderColor: "border-neon-cyan/30",
  },
  uso: {
    label: "Uso",
    color: "text-neon-purple",
    bgColor: "bg-neon-purple/10",
    borderColor: "border-neon-purple/30",
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
          <h1 className="font-display text-2xl lg:text-3xl font-bold gradient-text">
            Logros
          </h1>
          <p className="text-muted-foreground mt-1">
            Desbloquea logros y gana XP mientras estudias
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAchievements}
            disabled={checking}
            className="card-gamer rounded-xl px-4 py-2 flex items-center gap-2 hover:bg-secondary/80 transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", checking && "animate-spin")} />
            <span className="text-sm">Verificar</span>
          </button>
          <div className="card-gamer rounded-xl px-4 py-2 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-neon-gold" />
            <span className="font-display font-bold text-neon-gold">{stats.unlocked}</span>
            <span className="text-sm text-muted-foreground">/ {stats.total}</span>
          </div>
          <div className="card-gamer rounded-xl px-4 py-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-neon-cyan" />
            <span className="font-display font-bold text-neon-cyan">{stats.totalXP}</span>
            <span className="text-sm text-muted-foreground">XP</span>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="card-gamer rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold">Progreso General</h2>
          <span className="text-sm text-muted-foreground">
            {Math.round((stats.unlocked / stats.total) * 100)}% completado
          </span>
        </div>
        <div className="h-4 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-gold transition-all duration-1000"
            style={{ width: `${(stats.unlocked / stats.total) * 100}%` }}
          />
        </div>

        {/* Category breakdown */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {Object.entries(categoryConfig).map(([key, config]) => {
            const categoryAchievements = achievements.filter(a => a.categoria === key);
            const unlockedCount = categoryAchievements.filter(a => isUnlocked(a.id)).length;

            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                className={cn(
                  "p-4 rounded-xl border transition-all text-center",
                  selectedCategory === key
                    ? cn(config.bgColor, config.borderColor)
                    : "bg-secondary border-transparent hover:bg-secondary/80"
                )}
              >
                <p className={cn("text-2xl font-display font-bold", config.color)}>
                  {unlockedCount}/{categoryAchievements.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{config.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Achievements by Category */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card-gamer rounded-xl p-6 animate-pulse">
              <div className="w-16 h-16 bg-secondary rounded-xl mb-4" />
              <div className="h-4 bg-secondary rounded mb-2" />
              <div className="h-3 bg-secondary rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedAchievements).map(([category, categoryAchievements]) => {
            if (selectedCategory && selectedCategory !== category) return null;
            if (categoryAchievements.length === 0) return null;

            const config = categoryConfig[category as keyof typeof categoryConfig];

            return (
              <div key={category}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-3 h-3 rounded-full", config.bgColor.replace("/10", ""))} />
                  <h2 className="font-display font-semibold text-lg">{config.label}</h2>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryAchievements.map(achievement => {
                    const unlocked = isUnlocked(achievement.id);
                    const Icon = iconMap[achievement.icono] || Trophy;
                    const unlockDate = getUnlockDate(achievement.id);

                    return (
                      <div
                        key={achievement.id}
                        className={cn(
                          "card-gamer rounded-xl p-6 transition-all relative overflow-hidden",
                          unlocked
                            ? cn(config.bgColor, "border", config.borderColor)
                            : "opacity-60 grayscale"
                        )}
                      >
                        {/* Unlocked glow effect */}
                        {unlocked && (
                          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white/5 pointer-events-none" />
                        )}

                        <div className="relative">
                          <div className="flex items-start justify-between mb-4">
                            <div className={cn(
                              "w-14 h-14 rounded-xl flex items-center justify-center",
                              unlocked
                                ? cn(config.bgColor.replace("/10", "/30"), config.color)
                                : "bg-secondary text-muted-foreground"
                            )}>
                              {unlocked ? (
                                <Icon className="w-7 h-7" />
                              ) : (
                                <Lock className="w-6 h-6" />
                              )}
                            </div>
                            <div className={cn(
                              "px-2 py-1 rounded-lg text-xs font-medium",
                              unlocked
                                ? cn(config.bgColor, config.color)
                                : "bg-secondary text-muted-foreground"
                            )}>
                              +{achievement.xp_reward} XP
                            </div>
                          </div>

                          <h3 className={cn(
                            "font-display font-semibold mb-1",
                            unlocked ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {achievement.nombre}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {achievement.descripcion}
                          </p>

                          {unlocked && unlockDate && (
                            <p className={cn("text-xs mt-3", config.color)}>
                              Desbloqueado el {unlockDate}
                            </p>
                          )}
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

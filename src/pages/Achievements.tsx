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
    color: "text-black",
    bgColor: "bg-[#BFFF00]",
    borderColor: "border-black",
  },
  estudio: {
    label: "Estudio",
    color: "text-black",
    bgColor: "bg-[#00E5FF]",
    borderColor: "border-black",
  },
  uso: {
    label: "Uso",
    color: "text-black",
    bgColor: "bg-[#FF9B71]",
    borderColor: "border-black",
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
          <h1 className="text-3xl lg:text-4xl font-black uppercase tracking-widest text-black">
            Logros
          </h1>
          <p className="text-black/60 font-bold mt-1 uppercase text-sm">
            Desbloquea logros y gana XP mientras estudias
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRefreshAchievements}
            disabled={checking}
            className="bg-[#C688EB] border-4 border-black text-black font-black uppercase text-sm rounded-xl px-4 py-2 flex items-center gap-2 hover:translate-y-[-2px] shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000] transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", checking && "animate-spin")} />
            <span>Verificar</span>
          </button>
          <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl px-4 py-2 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-black" />
            <span className="font-black text-black text-lg">{stats.unlocked}</span>
            <span className="text-sm font-bold text-black/60">/ {stats.total}</span>
          </div>
          <div className="bg-[#BFFF00] border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl px-4 py-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-black" />
            <span className="font-black text-black text-lg">{stats.totalXP}</span>
            <span className="text-sm font-bold text-black/60">XP</span>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white border-4 border-black shadow-[8px_8px_0_0_#000] rounded-2xl p-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h2 className="font-black uppercase text-xl text-black">Progreso General</h2>
          <span className="text-sm font-bold text-black/60 uppercase">
            {Math.round((stats.unlocked / stats.total) * 100)}% completado
          </span>
        </div>
        
        <div className="h-6 bg-gray-200 border-4 border-black rounded-full overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] z-10">
          <div
            className="h-full bg-[#BFFF00] transition-all duration-1000"
            style={{ width: `${(stats.unlocked / stats.total) * 100}%` }}
          />
          {/* Grid lines to make it blocky */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex-1 border-r-2 border-black/20" />
            ))}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 relative z-10">
          {Object.entries(categoryConfig).map(([key, config]) => {
            const categoryAchievements = achievements.filter(a => a.categoria === key);
            const unlockedCount = categoryAchievements.filter(a => isUnlocked(a.id)).length;

            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                className={cn(
                  "p-4 rounded-xl border-4 transition-all text-center group",
                  selectedCategory === key
                    ? cn(config.bgColor, config.borderColor, "shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.2)] scale-[0.98]")
                    : "bg-white border-black hover:translate-y-[-2px] shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000]"
                )}
              >
                <p className={cn("text-3xl font-black", selectedCategory === key ? config.color : "text-black")}>
                  {unlockedCount}/{categoryAchievements.length}
                </p>
                <p className="text-sm font-bold uppercase mt-1 text-black/60 group-hover:text-black transition-colors">{config.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Achievements by Category */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-gray-200 border-4 border-black rounded-xl p-6 animate-pulse shadow-[4px_4px_0_0_#000]">
              <div className="w-16 h-16 bg-gray-300 border-2 border-black rounded-xl mb-4" />
              <div className="h-4 bg-gray-300 rounded-sm mb-2" />
              <div className="h-3 bg-gray-300 rounded-sm w-3/4" />
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
                  <div className={cn("w-4 h-4 rounded-full border-2 border-black shadow-[2px_2px_0_0_#000]", config.bgColor)} />
                  <h2 className="font-black uppercase text-xl text-black">{config.label}</h2>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryAchievements.map(achievement => {
                    const unlocked = isUnlocked(achievement.id);
                    const Icon = iconMap[achievement.icono] || Trophy;
                    const unlockDate = getUnlockDate(achievement.id);

                    return (
                      <div
                        key={achievement.id}
                        className={cn(
                          "rounded-2xl p-6 transition-all relative overflow-hidden border-4 border-black",
                          unlocked
                            ? cn(config.bgColor, "shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000]")
                            : "bg-gray-200 grayscale shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] opacity-80"
                        )}
                      >
                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-4">
                            <div className={cn(
                              "w-14 h-14 rounded-xl border-4 border-black flex items-center justify-center shadow-[4px_4px_0_0_#000]",
                              unlocked
                                ? "bg-white text-black"
                                : "bg-gray-300 text-black/50"
                            )}>
                              {unlocked ? (
                                <Icon className="w-7 h-7" />
                              ) : (
                                <Lock className="w-6 h-6" />
                              )}
                            </div>
                            <div className={cn(
                              "px-3 py-1 text-xs font-black uppercase border-2 border-black rotate-[5deg] shadow-[2px_2px_0_0_#000]",
                              unlocked
                                ? "bg-[#BFFF00] text-black"
                                : "bg-gray-400 text-white"
                            )}>
                              +{achievement.xp_reward} XP
                            </div>
                          </div>

                          <h3 className={cn(
                            "font-black text-lg uppercase mb-2",
                            unlocked ? "text-black" : "text-black/60"
                          )}>
                            {achievement.nombre}
                          </h3>
                          <p className="text-sm font-bold text-black/70 leading-relaxed">
                            {achievement.descripcion}
                          </p>

                          {unlocked && unlockDate && (
                            <p className="text-xs mt-4 font-bold text-black/60 uppercase">
                              Desbloqueado: {unlockDate}
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

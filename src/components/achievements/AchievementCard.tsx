import React from "react";
import { Trophy,
  CheckCircle2,
  Lock,
  
  ChevronRight,
  Calendar,
  MoreHorizontal,
  Info,
  Share2,
  Copy,
  ExternalLink, Zap } from "lucide-react";
import { Achievement } from "@/hooks/useAchievements";
import {
  achievementIconMap,
  categoryThemes,
  getAchievementActionGuide,
} from "./achievementUtils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface AchievementCardProps {
  achievement: Achievement;
  unlocked: boolean;
  unlockDate: string | null;
  onSelect: (achievement: Achievement) => void;
  onShare?: (achievement: Achievement, unlockDate: string | null) => void;
  viewMode?: "grid" | "list";
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  unlocked,
  unlockDate,
  onSelect,
  onShare,
  viewMode = "grid",
}) => {
  const navigate = useNavigate();
  const Icon = achievementIconMap[achievement.icono] || Trophy;
  const theme = categoryThemes[achievement.categoria] || categoryThemes.uso;
  const actionGuide = getAchievementActionGuide(achievement);

  const handleCopyText = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `🏆 Logro: "${achievement.nombre}" (+${achievement.xp_reward} XP) - ${achievement.descripcion}`;
    navigator.clipboard.writeText(text);
    toast.success("Información copiada al portapapeles");
  };

  const handleOpenAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(actionGuide.route);
  };

  const handleOpenShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShare) {
      onShare(achievement, unlockDate);
    }
  };

  if (viewMode === "list") {
    return (
      <div
        onClick={() => onSelect(achievement)}
        className={`group p-3 sm:p-3.5 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 select-none ${
          unlocked
            ? "bg-white dark:bg-[#212121] border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-2xs hover:shadow-xs"
            : "bg-zinc-50/60 dark:bg-zinc-900/30 border-zinc-200/50 dark:border-zinc-800/50 opacity-75 hover:opacity-100 hover:border-zinc-300 dark:hover:border-zinc-700"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
              unlocked
                ? `${theme.iconBgClass}`
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
            }`}
          >
            {unlocked ? (
              <Icon className="w-5 h-5" />
            ) : (
              <Lock className="w-4 h-4 text-zinc-400" />
            )}
          </div>

          {/* Details */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className={`text-sm font-semibold truncate ${
                  unlocked
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {achievement.nombre}
              </h3>
              <span
                className={`hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${theme.badgeClass}`}
              >
                {theme.label}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
              {achievement.descripcion}
            </p>
          </div>
        </div>

        {/* Right Info */}
        <div className="flex items-center gap-2.5 shrink-0">
          {unlocked && unlockDate && (
            <span className="hidden md:flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              <Calendar className="w-3 h-3" />
              {unlockDate}
            </span>
          )}

          <div
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
              unlocked
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50"
            }`}
          >
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>+{achievement.xp_reward} XP</span>
          </div>

          {/* Dropdown de opciones */}
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none cursor-pointer">
                <MoreHorizontal className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg rounded-xl p-1"
              >
                <DropdownMenuItem
                  onClick={() => onSelect(achievement)}
                  className="text-xs font-medium gap-2 cursor-pointer rounded-lg py-1.5 focus:bg-zinc-100 dark:focus:bg-zinc-800"
                >
                  <Info className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Ver detalles completos</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleCopyText}
                  className="text-xs font-medium gap-2 cursor-pointer rounded-lg py-1.5 focus:bg-zinc-100 dark:focus:bg-zinc-800"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Copiar información</span>
                </DropdownMenuItem>
                {unlocked && onShare && (
                  <>
                    <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 my-1" />
                    <DropdownMenuItem
                      onClick={handleOpenShare}
                      className="text-xs font-medium gap-2 cursor-pointer rounded-lg py-1.5 focus:bg-zinc-100 dark:focus:bg-zinc-800 text-amber-600 dark:text-amber-400"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Compartir insignia</span>
                    </DropdownMenuItem>
                  </>
                )}
                {!unlocked && (
                  <>
                    <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 my-1" />
                    <DropdownMenuItem
                      onClick={handleOpenAction}
                      className="text-xs font-medium gap-2 cursor-pointer rounded-lg py-1.5 focus:bg-zinc-100 dark:focus:bg-zinc-800 text-blue-600 dark:text-blue-400"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{actionGuide.label}</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  }

  // Grid Mode (Bento Card Notion Style)
  return (
    <div
      onClick={() => onSelect(achievement)}
      className={`group neo-bento-card p-5 flex flex-col justify-between cursor-pointer select-none transition-all duration-200 ${
        unlocked
          ? "hover:border-zinc-300 dark:hover:border-zinc-600"
          : "bg-zinc-50/50 dark:bg-zinc-900/40 opacity-80 hover:opacity-100"
      }`}
    >
      <div>
        {/* Header de la tarjeta */}
        <div className="flex items-start justify-between gap-2 mb-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 relative ${
              unlocked
                ? `${theme.iconBgClass} shadow-2xs`
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
            }`}
          >
            <Icon className="w-6 h-6" />
            {!unlocked && (
              <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white dark:bg-[#212121] border border-zinc-200 dark:border-zinc-700">
                <Lock className="w-3 h-3 text-zinc-400" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${theme.badgeClass}`}
            >
              {theme.label}
            </span>
            <div
              className={`px-2 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1 ${
                unlocked
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50"
              }`}
            >
              <span>+{achievement.xp_reward}</span>
              <span className="text-[10px] opacity-75">XP</span>
            </div>

            {/* Menú Desplegable Notion Style */}
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none cursor-pointer">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 bg-white dark:bg-[#1f1f1f] border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg rounded-xl p-1"
                >
                  <DropdownMenuItem
                    onClick={() => onSelect(achievement)}
                    className="text-xs font-medium gap-2 cursor-pointer rounded-lg py-1.5 focus:bg-zinc-100 dark:focus:bg-zinc-800"
                  >
                    <Info className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Ver detalles</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleCopyText}
                    className="text-xs font-medium gap-2 cursor-pointer rounded-lg py-1.5 focus:bg-zinc-100 dark:focus:bg-zinc-800"
                  >
                    <Copy className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Copiar información</span>
                  </DropdownMenuItem>
                  {unlocked && onShare && (
                    <>
                      <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 my-1" />
                      <DropdownMenuItem
                        onClick={handleOpenShare}
                        className="text-xs font-medium gap-2 cursor-pointer rounded-lg py-1.5 focus:bg-zinc-100 dark:focus:bg-zinc-800 text-amber-600 dark:text-amber-400"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Compartir tarjeta</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  {!unlocked && (
                    <>
                      <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800 my-1" />
                      <DropdownMenuItem
                        onClick={handleOpenAction}
                        className="text-xs font-medium gap-2 cursor-pointer rounded-lg py-1.5 focus:bg-zinc-100 dark:focus:bg-zinc-800 text-blue-600 dark:text-blue-400"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{actionGuide.label}</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Textos */}
        <div className="space-y-1">
          <h3
            className={`text-sm font-semibold tracking-tight transition-colors ${
              unlocked
                ? "text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                : "text-zinc-700 dark:text-zinc-300"
            }`}
          >
            {achievement.nombre}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
            {achievement.descripcion}
          </p>
        </div>
      </div>

      {/* Footer de la tarjeta */}
      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
        {unlocked ? (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{unlockDate ? `Conseguido ${unlockDate}` : "Desbloqueado"}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 text-[11px]">
            <Lock className="w-3 h-3" />
            <span>
              {achievement.condicion_valor > 0
                ? `Meta: ${achievement.condicion_valor}`
                : "Bloqueado"}
            </span>
          </div>
        )}

        <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors flex items-center gap-0.5">
          <span>Ver</span>
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
};

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy,
  CheckCircle2,
  Lock,
  
  Share2,
  ArrowRight,
  Calendar,
  Check,
  Target,
  Lightbulb, Zap } from "lucide-react";
import { Achievement } from "@/hooks/useAchievements";
import {
  achievementIconMap,
  categoryThemes,
  getAchievementActionGuide,
} from "./achievementUtils";
import { toast } from "sonner";

interface AchievementDetailModalProps {
  achievement: Achievement | null;
  unlocked: boolean;
  unlockDate: string | null;
  open: boolean;
  onClose: () => void;
  onOpenShare?: (achievement: Achievement, unlockDate: string | null) => void;
}

export function AchievementDetailModal({
  achievement,
  unlocked,
  unlockDate,
  open,
  onClose,
  onOpenShare,
}: AchievementDetailModalProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!achievement) return null;

  const Icon = achievementIconMap[achievement.icono] || Trophy;
  const theme = categoryThemes[achievement.categoria] || categoryThemes.uso;
  const actionGuide = getAchievementActionGuide(achievement);

  const handleCopyShare = () => {
    const shareText = `🏆 ¡Desbloqueé el logro "${achievement.nombre}" en Tabe! (+${achievement.xp_reward} XP) - ${achievement.descripcion}`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    toast.success("Copiado al portapapeles", {
      description: "Puedes compartir tu logro con tus compañeros.",
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNavigate = () => {
    onClose();
    navigate(actionGuide.route);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-2xl rounded-2xl">
        {/* Cover decorativo sutil estilo Notion */}
        <div className="h-24 w-full bg-linear-to-r from-zinc-100 via-zinc-50 to-zinc-100 dark:from-zinc-900 dark:via-zinc-800/80 dark:to-zinc-900 border-b border-zinc-200/60 dark:border-zinc-800/60 relative">
          <div className="absolute top-4 left-6 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${theme.badgeClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor}`} />
              {theme.label}
            </span>
            {unlocked ? (
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-medium gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Desbloqueado
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300/40 dark:border-zinc-700/40 text-xs font-medium gap-1"
              >
                <Lock className="w-3.5 h-3.5" />
                Bloqueado
              </Badge>
            )}
          </div>
        </div>

        {/* Contenido principal */}
        <div className="p-6 pt-0 relative">
          {/* Avatar / Icono flotante */}
          <div className="-mt-10 mb-4 flex items-end justify-between">
            <div
              className={`w-20 h-20 rounded-2xl border-2 border-white dark:border-[#18181b] shadow-md flex items-center justify-center transition-transform ${
                unlocked
                  ? `${theme.iconBgClass}`
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
              }`}
            >
              <Icon className="w-10 h-10" />
            </div>

            {/* Recompensa XP Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-sm font-semibold shadow-2xs">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>+{achievement.xp_reward} XP</span>
            </div>
          </div>

          <DialogHeader className="text-left space-y-1.5">
            <DialogTitle className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {achievement.nombre}
            </DialogTitle>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
              {achievement.descripcion}
            </p>
          </DialogHeader>

          {/* Tarjeta Bento de Meta / Requisito */}
          <div className="mt-5 space-y-3">
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-zinc-400" />
                  Condición del logro
                </span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {achievement.condicion_valor > 0
                    ? `Objetivo: ${achievement.condicion_valor}`
                    : "Acción única"}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                {achievement.condicion_tipo.replace(/_/g, " ").toUpperCase()}
              </p>
            </div>

            {/* Fecha o Tip */}
            {unlocked && unlockDate ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                <Calendar className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Desbloqueado con éxito el {unlockDate}</span>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 text-xs text-zinc-600 dark:text-zinc-400 font-normal">
                <Lightbulb className="w-4 h-4 shrink-0 text-blue-500 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200 block">
                    Cómo conseguirlo:
                  </span>
                  <span>{actionGuide.tip}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer de Acciones estilo ChatGPT/Notion */}
          <div className="mt-6 pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-full sm:w-auto text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Cerrar
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {unlocked ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyShare}
                    className="w-full sm:w-auto text-xs font-medium gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Copiar logro</span>
                      </>
                    )}
                  </Button>
                  {onOpenShare && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        onClose();
                        onOpenShare(achievement, unlockDate);
                      }}
                      className="w-full sm:w-auto text-xs font-medium gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Compartir tarjeta</span>
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleNavigate}
                  className="w-full sm:w-auto text-xs font-medium gap-1.5"
                >
                  <span>{actionGuide.label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy,
  
  Check,
  Copy,
  Share2,
  Calendar, Zap } from "lucide-react";
import { Achievement } from "@/hooks/useAchievements";
import { achievementIconMap, categoryThemes } from "./achievementUtils";
import { toast } from "sonner";

interface AchievementShareModalProps {
  achievement: Achievement | null;
  unlockDate: string | null;
  open: boolean;
  onClose: () => void;
}

export function AchievementShareModal({
  achievement,
  unlockDate,
  open,
  onClose,
}: AchievementShareModalProps) {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!achievement) return null;

  const Icon = achievementIconMap[achievement.icono] || Trophy;
  const theme = categoryThemes[achievement.categoria] || categoryThemes.uso;

  const shareText = `🎓 ¡He desbloqueado el logro "${achievement.nombre}" (+${achievement.xp_reward} XP) en Tabe! "${achievement.descripcion}". ¡Sigue mi progreso de estudio!`;

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedText(true);
    toast.success("Mensaje copiado", {
      description: "Listo para pegar en WhatsApp, Discord o tus redes sociales.",
    });
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + "/logros");
    setCopiedLink(true);
    toast.success("Enlace copiado", {
      description: "Enlace a la sección de logros copiado al portapapeles.",
    });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#18181b] shadow-2xl rounded-2xl">
        <div className="p-6">
          <DialogHeader className="text-center space-y-1 mb-5">
            <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-2">
              <Share2 className="w-4 h-4 text-zinc-500" />
              Compartir Logro
            </DialogTitle>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
              Comparte tu dedicación y progreso de estudio con tus amigos
            </p>
          </DialogHeader>

          {/* Tarjeta de Preview tipo Credencial Notion */}
          <div className="p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-linear-to-b from-zinc-50/80 to-zinc-100/50 dark:from-zinc-900/80 dark:to-zinc-900/40 relative overflow-hidden shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>TABE · LOGRO OFICIAL</span>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${theme.badgeClass}`}>
                {theme.label}
              </span>
            </div>

            <div className="flex items-center gap-4 my-2">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${theme.iconBgClass}`}
              >
                <Icon className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {achievement.nombre}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-2">
                  {achievement.descripcion}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 text-[11px]">
                <Calendar className="w-3.5 h-3.5" />
                <span>{unlockDate || "Desbloqueado recientemente"}</span>
              </div>
              <div className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>+{achievement.xp_reward} XP</span>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="mt-5 space-y-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleCopyText}
              className="w-full text-xs font-medium gap-1.5 h-9"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>¡Mensaje copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar texto para compartir</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="w-full text-xs font-medium gap-1.5 h-9"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>¡Enlace copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Copiar enlace directo</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/40 dark:bg-zinc-900/30 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs font-medium"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React from "react";
import { Play, Pause, RotateCcw, SkipForward, BellOff, ExternalLink, X, BookOpen, Coffee, Sparkles } from "lucide-react";
import { usePomodoro } from "@/contexts/PomodoroContext";
import { cn } from "@/lib/utils";

interface PomodoroPipWidgetProps {
  pipWindow: Window;
}

export function PomodoroPipWidget({ pipWindow }: PomodoroPipWidgetProps) {
  const {
    mode,
    timeLeft,
    isActive,
    isRinging,
    toggleTimer,
    resetTimer,
    stopAlarm,
    changeMode,
    formatTime,
    progress,
  } = usePomodoro();

  const handleFocusOpener = () => {
    try {
      window.focus();
    } catch (e) {
      console.warn("Could not focus opener window:", e);
    }
  };

  const handleClose = () => {
    try {
      pipWindow.close();
    } catch (e) {
      console.warn("Could not close PiP window:", e);
    }
  };

  return (
    <div className="w-full h-full bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 p-3 flex flex-col justify-between font-sans select-none overflow-hidden box-border">
      {/* Top Bar: Badge and Window Actions */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          {isRinging ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse">
              ⏰ ¡Tiempo!
            </span>
          ) : mode === "work" ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <BookOpen className="w-3 h-3" /> Foco
            </span>
          ) : mode === "shortBreak" ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Coffee className="w-3 h-3" /> Descanso
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Sparkles className="w-3 h-3" /> Pausa Larga
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleFocusOpener}
            title="Volver a enfocar TABE"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            title="Cerrar ventana flotante"
            className="p-1.5 rounded-md text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Clean Digital Clock & Progress Bar */}
      <div className="flex flex-col items-center justify-center my-auto py-1">
        <div
          className={cn(
            "font-mono font-semibold text-4xl sm:text-[42px] tracking-tight leading-none tabular-nums",
            isRinging ? "text-rose-500 animate-pulse" : "text-zinc-900 dark:text-zinc-100"
          )}
        >
          {formatTime(timeLeft)}
        </div>

        <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-2.5">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              mode === "work" ? "bg-rose-500" : mode === "shortBreak" ? "bg-teal-500" : "bg-amber-500"
            )}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

      {/* Bottom Bar: Action buttons */}
      <div className="flex items-center gap-1.5 shrink-0 pt-1">
        {isRinging ? (
          <button
            type="button"
            onClick={stopAlarm}
            className="flex-1 py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs animate-pulse cursor-pointer"
          >
            <BellOff className="w-3.5 h-3.5" />
            <span>Detener Alarma</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleTimer}
            className={cn(
              "flex-1 py-1.5 px-2 font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer",
              isActive
                ? "bg-zinc-200 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200"
                : "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900"
            )}
          >
            {isActive ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Iniciar</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => changeMode(mode === "work" ? "shortBreak" : "work")}
          title={mode === "work" ? "Saltar a descanso" : "Saltar a foco"}
          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer shadow-2xs"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={resetTimer}
          title="Reiniciar ciclo"
          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

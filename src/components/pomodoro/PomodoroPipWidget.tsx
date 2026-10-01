import React from "react";
import { Play, Pause, RotateCcw, SkipForward, BellOff, ExternalLink, X } from "lucide-react";
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
    <div className="w-full h-full bg-white text-black p-2.5 flex flex-col justify-between border-4 border-black box-border font-sans select-none overflow-hidden">
      {/* Top Bar: Badge and Window Actions */}
      <div className="flex items-center justify-between gap-1 shrink-0">
        <div className="flex items-center gap-1.5">
          {isRinging ? (
            <span className="px-2 py-0.5 rounded-md bg-[#ff3366] text-black font-black text-[11px] uppercase tracking-wider border-2 border-black shadow-[2px_2px_0_#000] animate-bounce">
              ⏰ ¡TIEMPO!
            </span>
          ) : mode === "work" ? (
            <span className="px-2 py-0.5 rounded-md bg-[#FF6B6B] text-black font-black text-[11px] uppercase tracking-wider border-2 border-black shadow-[2px_2px_0_#000]">
              🍅 FOCO
            </span>
          ) : mode === "shortBreak" ? (
            <span className="px-2 py-0.5 rounded-md bg-[#4ECDC4] text-black font-black text-[11px] uppercase tracking-wider border-2 border-black shadow-[2px_2px_0_#000]">
              ☕ DESCANSO
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-[#FFE66D] text-black font-black text-[11px] uppercase tracking-wider border-2 border-black shadow-[2px_2px_0_#000]">
              🎯 DESCANSO LARGO
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleFocusOpener}
            title="Volver a enfocar TABE"
            className="p-1 rounded bg-white hover:bg-neutral-100 text-black border-2 border-black shadow-[1.5px_1.5px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            title="Cerrar ventana flotante"
            className="p-1 rounded bg-[#FF6B6B] hover:bg-[#ff5252] text-black border-2 border-black shadow-[1.5px_1.5px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Center: Big Timer & Progress Bar */}
      <div className="flex flex-col items-center justify-center my-auto py-1">
        <div
          className={cn(
            "font-black text-4xl sm:text-[44px] tracking-tight font-mono leading-none drop-shadow-[2px_2px_0_#FFE600]",
            isRinging ? "text-[#ff3366] animate-pulse" : "text-black"
          )}
        >
          {formatTime(timeLeft)}
        </div>

        <div className="w-full h-2 bg-neutral-200 border-2 border-black rounded-full overflow-hidden mt-1.5 shadow-[1px_1px_0_#000]">
          <div
            className={cn(
              "h-full transition-all duration-300",
              mode === "work" ? "bg-[#FF6B6B]" : "bg-[#4ECDC4]"
            )}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

      {/* Bottom Bar: Action buttons */}
      <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
        {isRinging ? (
          <button
            type="button"
            onClick={stopAlarm}
            className="flex-1 py-1.5 px-2 bg-[#ff3366] text-black font-black text-xs uppercase tracking-wider border-2 border-black rounded-lg shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1 animate-pulse cursor-pointer"
          >
            <BellOff className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>APAGAR</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleTimer}
            className={cn(
              "flex-1 py-1.5 px-2 font-black text-xs uppercase tracking-wider border-2 border-black rounded-lg shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1.5 cursor-pointer text-black",
              isActive ? "bg-[#FFE600] hover:bg-[#ffd21c]" : "bg-[#10B981] hover:bg-[#059669]"
            )}
          >
            {isActive ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-black stroke-black" />
                <span>PAUSAR</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-black stroke-black" />
                <span>INICIAR</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => changeMode(mode === "work" ? "shortBreak" : "work")}
          title={mode === "work" ? "Saltar a descanso" : "Saltar a foco"}
          className="py-1.5 px-2 bg-white hover:bg-neutral-100 text-black font-black text-xs uppercase tracking-wider border-2 border-black rounded-lg shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center gap-1 cursor-pointer"
        >
          <SkipForward className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="text-[10px]">SALTAR</span>
        </button>

        <button
          type="button"
          onClick={resetTimer}
          title="Reiniciar cronómetro"
          className="py-1.5 px-2 bg-white hover:bg-neutral-100 text-black font-black text-xs uppercase tracking-wider border-2 border-black rounded-lg shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-center cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}

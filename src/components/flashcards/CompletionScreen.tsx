import { useEffect, useState } from "react";
import { Trophy, Clock, Target, CheckCircle2, RotateCcw, ArrowRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompletionScreenProps {
  deckName: string;
  totalCards: number;
  correctCount: number;
  studyTime: number;
  onRestart: () => void;
  onExit: () => void;
}

export function CompletionScreen({
  deckName,
  totalCards,
  correctCount,
  studyTime,
  onRestart,
  onExit,
}: CompletionScreenProps) {
  const [showStats, setShowStats] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  const accuracy = totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;
  const isExcellent = accuracy >= 80;
  const isGood = accuracy >= 60 && accuracy < 80;

  useEffect(() => {
    const statsTimer = setTimeout(() => setShowStats(true), 200);
    const buttonsTimer = setTimeout(() => setShowButtons(true), 450);
    return () => {
      clearTimeout(statsTimer);
      clearTimeout(buttonsTimer);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#191919]">
      {/* Tarjeta Notion centrada */}
      <div
        className={cn(
          "bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-sm max-w-md w-full transition-all duration-300",
          showStats ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}
      >
        {/* Ícono de felicitación sobrio */}
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
          {isExcellent ? (
            <Trophy className="w-6 h-6 text-amber-500" />
          ) : isGood ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          ) : (
            <Target className="w-6 h-6 text-zinc-600 dark:text-zinc-300" />
          )}
        </div>

        {/* Título y subtítulo */}
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 text-center mb-1">
          {isExcellent ? "¡Excelente sesión!" : isGood ? "¡Buen trabajo!" : "¡Sesión finalizada!"}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 text-center mb-6">
          Completaste el mazo <span className="font-medium text-zinc-800 dark:text-zinc-200">"{deckName}"</span>
        </p>

        {/* Métricas con números mono y pills limpios */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          <div className="bg-zinc-50/70 dark:bg-zinc-800/50 rounded-xl p-3 text-center border border-zinc-200/60 dark:border-zinc-700/50">
            <span className="font-mono text-xl font-semibold text-zinc-900 dark:text-zinc-100 block">
              {accuracy}%
            </span>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5 block">
              Precisión
            </span>
          </div>

          <div className="bg-zinc-50/70 dark:bg-zinc-800/50 rounded-xl p-3 text-center border border-zinc-200/60 dark:border-zinc-700/50">
            <span className="font-mono text-xl font-semibold text-zinc-900 dark:text-zinc-100 block">
              {correctCount}/{totalCards}
            </span>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5 block">
              Aciertos
            </span>
          </div>

          <div className="bg-zinc-50/70 dark:bg-zinc-800/50 rounded-xl p-3 text-center border border-zinc-200/60 dark:border-zinc-700/50">
            <span className="font-mono text-xl font-semibold text-zinc-900 dark:text-zinc-100 block">
              {formatTime(studyTime)}
            </span>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5 block">
              Tiempo
            </span>
          </div>
        </div>

        {/* XP o reconocimiento sutil */}
        {isExcellent && (
          <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 text-amber-700 dark:text-amber-300 text-xs font-medium mb-6 mx-auto w-fit">
            <Zap className="w-3.5 h-3.5" />
            <span>+{correctCount * 10} XP ganados</span>
          </div>
        )}

        {/* Botones de acción */}
        <div
          className={cn(
            "flex flex-col sm:flex-row gap-2.5 transition-all duration-300",
            showButtons ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1.5"
          )}
        >
          <button
            type="button"
            onClick={onRestart}
            className="flex-1 bg-white dark:bg-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg py-2.5 px-3.5 text-xs font-medium border border-zinc-200/80 dark:border-zinc-700/70 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Repasar de nuevo
          </button>

          <button
            type="button"
            onClick={onExit}
            className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg py-2.5 px-3.5 text-xs font-medium transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Volver a Mazos
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import {
  Play, Pause, Square, SkipBack, SkipForward,
  Volume2, ChevronDown, ChevronUp, X, Mic
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAudioBook } from "@/hooks/useAudioBook";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2];

interface AudioBookPlayerProps {
  audioBook: ReturnType<typeof useAudioBook>;
  documentTitle: string;
  onPlayFromBeginning: () => void;
  onPlayFromCursor: () => void;
  onClose: () => void;
  hasCursorSelection: boolean;
}

export function AudioBookPlayer({
  audioBook,
  documentTitle,
  onPlayFromBeginning,
  onPlayFromCursor,
  onClose,
  hasCursorSelection,
}: AudioBookPlayerProps) {
  const [minimized, setMinimized] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const {
    isPlaying,
    isPaused,
    rate,
    currentSentenceIndex,
    totalSentences,
    currentSentence,
    progress,
    availableVoices,
    selectedVoice,
    pause,
    resume,
    stop,
    nextSentence,
    prevSentence,
    setRate,
    changeVoice,
    jumpToPercentage,
  } = audioBook;

  const handleTogglePlayPause = () => {
    if (isPlaying) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      onPlayFromBeginning();
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    jumpToPercentage(percentage);
  };

  return (
    <div className={cn(
      "fixed z-40 transition-all duration-300 left-3 right-3 sm:left-auto sm:right-6 sm:w-[480px]",
      minimized ? "bottom-4" : "bottom-6"
    )}>
      <div className="bg-white/95 dark:bg-[#18181b]/95 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-md">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
              <Volume2 className={cn("w-3.5 h-3.5", isPlaying && "animate-pulse")} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 block leading-tight">
                Audio Libro
              </span>
              <p className="font-semibold text-xs sm:text-sm truncate text-zinc-900 dark:text-zinc-100 leading-tight max-w-[200px] sm:max-w-[260px]">
                {documentTitle || "Apunte"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Playback status pill */}
            <span className={cn(
              "px-2 py-0.5 text-[10px] font-medium rounded-full border",
              isPlaying ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60" :
              isPaused ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60" :
              "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
            )}>
              {isPlaying ? "Reproduciendo" : isPaused ? "En Pausa" : "Detenido"}
            </span>

            {/* Minimize / Expand */}
            <button
              onClick={() => setMinimized(!minimized)}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
              title={minimized ? "Expandir reproductor" : "Minimizar"}
            >
              {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={() => {
                stop();
                onClose();
              }}
              className="p-1 rounded-md text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Cerrar reproductor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Minimized View */}
        {minimized ? (
          <div className="px-4 py-2.5 flex items-center justify-between gap-3 bg-white dark:bg-[#18181b]">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <button
                onClick={handleTogglePlayPause}
                className="w-8 h-8 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 flex items-center justify-center font-medium shadow-2xs shrink-0 transition-colors"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-zinc-900 dark:bg-white h-full transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className="text-[10px] font-mono font-medium shrink-0 text-zinc-600 dark:text-zinc-400">
                {progress}%
              </span>
            </div>

            <span className="px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {rate}x
            </span>
          </div>
        ) : (
          /* Expanded Full Controls */
          <div className="p-4 space-y-3.5 bg-white dark:bg-[#18181b]">

            {/* Text Preview Display */}
            {currentSentence ? (
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl">
                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                  Frase actual:
                </span>
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed line-clamp-2 italic">
                  "{currentSentence}"
                </p>
              </div>
            ) : (
              <div className="p-2.5 bg-zinc-50/50 dark:bg-zinc-900/20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Presioná Reproducir para iniciar la lectura del apunte
                </p>
              </div>
            )}

            {/* Interactive Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                <span>Progreso: {progress}%</span>
                <span>
                  {totalSentences > 0 ? `Frase ${currentSentenceIndex + 1} de ${totalSentences}` : "0 frases"}
                </span>
              </div>
              <div
                onClick={handleProgressClick}
                className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden cursor-pointer relative group border border-zinc-200/60 dark:border-zinc-700/60"
                title="Hacé clic para saltar en el apunte"
              >
                <div
                  className="bg-zinc-900 dark:bg-white h-full transition-all duration-150 relative"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Navigation & Mode Options */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onPlayFromBeginning}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
                  title="Comenzar desde el inicio del documento"
                >
                  Desde inicio
                </button>
                <button
                  onClick={onPlayFromCursor}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors shadow-2xs",
                    hasCursorSelection
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                      : "border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  )}
                  title={hasCursorSelection ? "Leer texto seleccionado en el editor" : "Leer desde la posición del cursor"}
                >
                  {hasCursorSelection ? "Leer selección" : "Desde cursor"}
                </button>
              </div>

              {/* Voice button toggle */}
              <button
                onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1 shadow-2xs",
                  showVoiceSettings
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                    : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                )}
                title="Configurar voz del lector"
              >
                <Mic className="w-3 h-3" />
                Voz
              </button>
            </div>

            {/* Voice Settings Dropdown (Toggleable) */}
            {showVoiceSettings && (
              <div className="p-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 block">
                  Voz del sistema en español:
                </span>
                <Select
                  value={selectedVoice?.name || ""}
                  onValueChange={(name) => {
                    const voice = availableVoices.find(v => v.name === name);
                    if (voice) changeVoice(voice);
                  }}
                >
                  <SelectTrigger className="w-full h-8 text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    <SelectValue placeholder="Elegí una voz..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-lg p-1 max-h-48">
                    {availableVoices.map(v => (
                      <SelectItem key={v.name} value={v.name} className="text-xs font-medium cursor-pointer rounded-lg">
                        {v.name} ({v.lang})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Primary Controls Row: SkipBack, Play/Pause, SkipForward, Stop */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                {/* Previous Sentence */}
                <button
                  onClick={prevSentence}
                  disabled={currentSentenceIndex <= 0}
                  className="w-9 h-9 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-2xs"
                  title="Retroceder a la frase anterior (-10s)"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                {/* Main Play / Pause Button */}
                <button
                  onClick={handleTogglePlayPause}
                  className="px-4 h-9 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-medium text-xs shadow-2xs flex items-center gap-1.5 transition-colors"
                  title={isPlaying ? "Pausar lectura" : "Continuar / Iniciar lectura"}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                      <span>{isPaused ? "Reanudar" : "Escuchar"}</span>
                    </>
                  )}
                </button>

                {/* Next Sentence */}
                <button
                  onClick={nextSentence}
                  disabled={currentSentenceIndex >= totalSentences - 1}
                  className="w-9 h-9 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-2xs"
                  title="Avanzar a la siguiente frase (+10s)"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                {/* Stop / Reset */}
                <button
                  onClick={stop}
                  disabled={!isPlaying && !isPaused}
                  className="w-9 h-9 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 text-zinc-500 flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-2xs"
                  title="Detener y volver al inicio"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>

              {/* Speed Buttons: up to 2x */}
              <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 border border-zinc-200/80 dark:border-zinc-700/80 rounded-lg">
                <span className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400 px-1 hidden sm:inline">
                  Vel:
                </span>
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setRate(s)}
                    className={cn(
                      "px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors",
                      rate === s
                        ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

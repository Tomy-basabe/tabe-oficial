import React, { useState } from "react";
import {
  Play, Pause, Square, SkipBack, SkipForward,
  Volume2, FastForward, ChevronDown, ChevronUp, X,
  Compass, Sparkles, SlidersHorizontal, Mic
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
    play,
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
      "fixed z-40 transition-all duration-300 left-3 right-3 sm:left-auto sm:right-6 sm:w-[500px]",
      minimized ? "bottom-4" : "bottom-6"
    )}>
      <div className="bg-card text-foreground border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-2xl overflow-hidden backdrop-blur-md">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#BFFF00] text-black border-b-3 border-foreground">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-black text-[#BFFF00] flex items-center justify-center shrink-0">
              <Volume2 className={cn("w-4 h-4", isPlaying && "animate-pulse")} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider block leading-tight text-black/70">
                Audio Libro
              </span>
              <p className="font-black text-xs sm:text-sm truncate uppercase text-black leading-tight max-w-[220px] sm:max-w-[280px]">
                {documentTitle || "Apunte"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Playback status pill */}
            <span className={cn(
              "px-2 py-0.5 text-[9px] font-black uppercase rounded-full border border-black shadow-[1px_1px_0_0_#000]",
              isPlaying ? "bg-[#00E5FF] text-black animate-pulse" :
              isPaused ? "bg-[#FFD700] text-black" : "bg-white text-black"
            )}>
              {isPlaying ? "Reproduciendo" : isPaused ? "En Pausa" : "Detenido"}
            </span>

            {/* Minimize / Expand */}
            <button
              onClick={() => setMinimized(!minimized)}
              className="p-1 rounded-lg border-2 border-black bg-white hover:bg-black hover:text-white transition-all text-black"
              title={minimized ? "Expandir reproductor" : "Minimizar"}
            >
              {minimized ? <ChevronUp className="w-3.5 h-3.5 stroke-[3]" /> : <ChevronDown className="w-3.5 h-3.5 stroke-[3]" />}
            </button>

            {/* Close */}
            <button
              onClick={() => {
                stop();
                onClose();
              }}
              className="p-1 rounded-lg border-2 border-black bg-white hover:bg-[#FF5C5C] hover:text-black transition-all text-black"
              title="Cerrar reproductor"
            >
              <X className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Minimized View */}
        {minimized ? (
          <div className="px-4 py-2.5 flex items-center justify-between gap-3 bg-card">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                onClick={handleTogglePlayPause}
                className={cn(
                  "w-8 h-8 rounded-lg border-2 border-foreground flex items-center justify-center font-black shadow-[2px_2px_0_0_hsl(var(--foreground))] shrink-0",
                  isPlaying ? "bg-[#FFD700] text-black" : "bg-[#BFFF00] text-black"
                )}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="w-full bg-muted border border-foreground/30 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#00E5FF] h-full transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className="text-[10px] font-mono font-black shrink-0 text-foreground">
                {progress}%
              </span>
            </div>

            <span className="px-2 py-0.5 rounded border border-foreground text-[10px] font-black bg-muted uppercase">
              {rate}x
            </span>
          </div>
        ) : (
          /* Expanded Full Controls */
          <div className="p-4 space-y-3.5 bg-card">

            {/* Text Preview Display */}
            {currentSentence ? (
              <div className="p-2.5 bg-muted/40 border-2 border-foreground/30 rounded-xl">
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                  Frase actual:
                </span>
                <p className="text-xs font-bold text-foreground leading-relaxed line-clamp-2 italic">
                  "{currentSentence}"
                </p>
              </div>
            ) : (
              <div className="p-2.5 bg-muted/20 border-2 border-dashed border-foreground/20 rounded-xl text-center">
                <p className="text-xs font-bold text-muted-foreground">
                  Presioná Play para iniciar la lectura del apunte
                </p>
              </div>
            )}

            {/* Interactive Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-muted-foreground">
                <span>Progreso: {progress}%</span>
                <span>
                  {totalSentences > 0 ? `Frase ${currentSentenceIndex + 1} de ${totalSentences}` : "0 frases"}
                </span>
              </div>
              <div
                onClick={handleProgressClick}
                className="w-full bg-muted border-2 border-foreground h-3 rounded-full overflow-hidden cursor-pointer relative group"
                title="Hacé clic para saltar en el apunte"
              >
                <div
                  className="bg-[#00E5FF] h-full transition-all duration-150 relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-foreground" />
                </div>
              </div>
            </div>

            {/* Navigation & Mode Options */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onPlayFromBeginning}
                  className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border-2 border-foreground bg-muted hover:bg-foreground hover:text-background transition-all shadow-[1px_1px_0_0_hsl(var(--foreground))]"
                  title="Comenzar desde el inicio del documento"
                >
                  Desde inicio
                </button>
                <button
                  onClick={onPlayFromCursor}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border-2 border-foreground transition-all shadow-[1px_1px_0_0_hsl(var(--foreground))]",
                    hasCursorSelection
                      ? "bg-[#00E5FF] text-black hover:translate-y-[-1px]"
                      : "bg-muted text-foreground hover:bg-foreground hover:text-background"
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
                  "px-2 py-1 text-[10px] font-black uppercase rounded-lg border-2 border-foreground transition-all flex items-center gap-1 shadow-[1px_1px_0_0_hsl(var(--foreground))]",
                  showVoiceSettings ? "bg-foreground text-background" : "bg-card text-foreground hover:bg-muted"
                )}
                title="Configurar voz del lector"
              >
                <Mic className="w-3 h-3" />
                Voz
              </button>
            </div>

            {/* Voice Settings Dropdown (Toggleable) */}
            {showVoiceSettings && (
              <div className="p-2.5 bg-muted/50 border-2 border-foreground rounded-xl space-y-1.5 animate-in fade-in duration-200">
                <span className="text-[10px] font-black uppercase text-muted-foreground block">
                  Voz del sistema en español:
                </span>
                <Select
                  value={selectedVoice?.name || ""}
                  onValueChange={(name) => {
                    const voice = availableVoices.find(v => v.name === name);
                    if (voice) changeVoice(voice);
                  }}
                >
                  <SelectTrigger className="w-full h-8 text-xs font-bold bg-background border-2 border-foreground rounded-lg">
                    <SelectValue placeholder="Elegí una voz..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-2 border-foreground rounded-lg max-h-48">
                    {availableVoices.map(v => (
                      <SelectItem key={v.name} value={v.name} className="text-xs font-bold cursor-pointer">
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
                  className="w-10 h-10 rounded-xl border-2 border-foreground bg-card hover:bg-muted font-black flex items-center justify-center shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-40 disabled:pointer-events-none transition-all"
                  title="Retroceder a la frase anterior (-10s)"
                >
                  <SkipBack className="w-4 h-4 stroke-[2.5]" />
                </button>

                {/* Main Play / Pause Button */}
                <button
                  onClick={handleTogglePlayPause}
                  className={cn(
                    "px-5 h-11 rounded-xl border-3 border-foreground font-black text-sm uppercase flex items-center gap-2 shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:shadow-[1px_1px_0_0_hsl(var(--foreground))] hover:translate-x-[2px] hover:translate-y-[2px] transition-all",
                    isPlaying
                      ? "bg-[#FFD700] text-black"
                      : "bg-[#BFFF00] text-black"
                  )}
                  title={isPlaying ? "Pausar lectura (recordará tu posición)" : "Continuar / Iniciar lectura"}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-5 h-5 fill-current" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      {isPaused ? "Reanudar" : "Escuchar"}
                    </>
                  )}
                </button>

                {/* Next Sentence */}
                <button
                  onClick={nextSentence}
                  disabled={currentSentenceIndex >= totalSentences - 1}
                  className="w-10 h-10 rounded-xl border-2 border-foreground bg-card hover:bg-muted font-black flex items-center justify-center shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-40 disabled:pointer-events-none transition-all"
                  title="Avanzar a la siguiente frase (+10s)"
                >
                  <SkipForward className="w-4 h-4 stroke-[2.5]" />
                </button>

                {/* Stop / Reset */}
                <button
                  onClick={stop}
                  disabled={!isPlaying && !isPaused}
                  className="w-10 h-10 rounded-xl border-2 border-foreground bg-card hover:bg-[#FF5C5C] hover:text-black font-black flex items-center justify-center shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-40 disabled:pointer-events-none transition-all"
                  title="Detener y volver al inicio"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              </div>

              {/* Speed Buttons: up to 2x */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                <span className="text-[9px] font-black uppercase text-muted-foreground px-1 hidden sm:inline">
                  Vel:
                </span>
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setRate(s)}
                    className={cn(
                      "px-1.5 py-1 text-[10px] font-black rounded-lg transition-all",
                      rate === s
                        ? "bg-[#00E5FF] text-black border border-foreground shadow-[1px_1px_0_0_hsl(var(--foreground))]"
                        : "text-muted-foreground hover:text-foreground hover:bg-card"
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

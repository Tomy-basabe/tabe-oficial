import React, { useState, useEffect } from "react";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TabeVoiceVisualizer, VisualizerState } from "./TabeVoiceVisualizer";
import { cn } from "@/lib/utils";

export interface VoiceLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  personaName?: string;
  isMicMuted?: boolean;
  onToggleMic?: () => void;
  isAiSpeaking?: boolean;
  userTranscript?: string;
  aiTranscript?: string;
  audioStream?: MediaStream | null;
  onEndCall?: () => void;
}

export const VoiceLiveModal: React.FC<VoiceLiveModalProps> = ({
  isOpen,
  onClose,
  personaName = "TABE AI",
  isMicMuted: controlledIsMicMuted,
  onToggleMic: controlledOnToggleMic,
  isAiSpeaking = false,
  userTranscript = "",
  aiTranscript = "",
  audioStream = null,
  onEndCall,
}) => {
  const [visualizerState, setVisualizerState] = useState<VisualizerState>("idle");
  const [internalMicMuted, setInternalMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

  const isMuted = controlledIsMicMuted !== undefined ? controlledIsMicMuted : internalMicMuted;
  const toggleMic = controlledOnToggleMic || (() => setInternalMicMuted((prev) => !prev));

  // Al abrir el modal, pasar a estado 'listening'
  useEffect(() => {
    if (isOpen) {
      setVisualizerState("listening");
    } else {
      setVisualizerState("idle");
    }
  }, [isOpen]);

  // Cierre suave: primero colapsa con la animación 'closing' y luego cierra
  const handleFinalizeCall = () => {
    if (visualizerState === "closing") return;
    setVisualizerState("closing");

    if (onEndCall) {
      onEndCall();
    }
  };

  const handleClosedAnimationComplete = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none">
        {/* Backdrop sobrio */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleFinalizeCall}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Card Central */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-sm sm:max-w-md aspect-[9/16] max-h-[88vh] rounded-3xl border border-zinc-700/80 overflow-hidden bg-zinc-950 shadow-2xl flex flex-col justify-between"
        >
          {/* Header Superior del Modal */}
          <div className="relative z-10 px-5 pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold text-white tracking-wide">
                {personaName}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/60">
                {visualizerState === "listening" && "En Vivo"}
                {visualizerState === "closing" && "Finalizando"}
                {visualizerState === "idle" && "Conectando"}
              </span>
            </div>

            {/* Toggle de Parlante / Audio */}
            <button
              type="button"
              onClick={() => setIsSpeakerMuted((prev) => !prev)}
              className="w-8 h-8 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
              title={isSpeakerMuted ? "Activar audio" : "Silenciar audio"}
            >
              {isSpeakerMuted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Núcleo Central: Visualizador Generativo Nativo en Canvas y SVG */}
          <div className="relative z-10 my-auto flex flex-col items-center justify-center px-4">
            <TabeVoiceVisualizer
              state={visualizerState}
              isAiSpeaking={isAiSpeaking}
              audioStream={audioStream}
              onClosedAnimationComplete={handleClosedAnimationComplete}
            />

            {/* Subtítulos / Transcripción en tiempo real */}
            <div className="mt-4 min-h-[48px] flex items-center justify-center text-center px-4 max-w-[90%]">
              {aiTranscript && isAiSpeaking ? (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs sm:text-sm text-zinc-200 font-medium leading-relaxed"
                >
                  {aiTranscript}
                </motion.div>
              ) : userTranscript ? (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-200 font-medium leading-relaxed"
                >
                  "{userTranscript}"
                </motion.div>
              ) : null}
            </div>
          </div>

          {/* Overlay Inferior con Controles Sobrios */}
          <div className="relative z-10 p-5 flex flex-col items-center gap-3.5 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent">
            {/* Estado textual sobrio */}
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
              {visualizerState === "closing" ? (
                <span className="text-zinc-500 text-[11px]">Finalizando conversación...</span>
              ) : isAiSpeaking ? (
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span className="text-[11px] font-medium">{personaName} está hablando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[11px] text-zinc-300">
                    {isMuted ? "Micrófono en pausa" : "Escuchando tu voz..."}
                  </span>
                </div>
              )}
            </div>

            {/* Fila de Botones: Silenciar + Finalizar Conversación */}
            <div className="flex items-center justify-center gap-3 w-full">
              {/* Botón Silenciar Micrófono */}
              <button
                type="button"
                onClick={toggleMic}
                disabled={visualizerState === "closing"}
                className={cn(
                  "h-10 w-10 rounded-full border flex items-center justify-center transition-colors cursor-pointer",
                  isMuted
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                    : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800"
                )}
                title={isMuted ? "Activar micrófono" : "Silenciar micrófono"}
              >
                {isMuted ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              {/* Botón Sobrio de Finalizar Conversación */}
              <button
                type="button"
                onClick={handleFinalizeCall}
                disabled={visualizerState === "closing"}
                className="h-10 px-5 rounded-full bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border border-zinc-700/80 disabled:opacity-50"
              >
                <PhoneOff className="w-3.5 h-3.5 text-red-400" />
                <span>Finalizar conversación</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default VoiceLiveModal;

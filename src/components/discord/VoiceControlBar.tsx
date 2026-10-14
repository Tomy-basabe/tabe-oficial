import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Headphones,
  HeadphoneOff,
  ChevronDown,
  Check
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CameraDevice } from "@/hooks/useRobustDiscord";

export interface VoiceControlBarProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleDeafen: () => void;
  onToggleScreenShare: () => void;
  onDisconnect: () => void;
  cameras?: CameraDevice[];
  selectedCameraId?: string;
  onSwitchCamera?: (deviceId: string) => void;
  mics?: CameraDevice[];
  selectedMicId?: string;
  onSwitchMic?: (deviceId: string) => void;
}

export function VoiceControlBar({
  isMuted,
  isVideoOff,
  isDeafened,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleDeafen,
  onToggleScreenShare,
  onDisconnect,
  cameras = [],
  selectedCameraId = "",
  onSwitchCamera,
  mics = [],
  selectedMicId = "",
  onSwitchMic,
}: VoiceControlBarProps) {
  const [showMicMenu, setShowMicMenu] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      {/* Barra principal flotante */}
      <div className="bg-zinc-950/90 backdrop-blur-md border border-zinc-800 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl">
        {/* Control Micrófono + Menú selector */}
        <div className="relative flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleAudio}
                className={cn(
                  "p-3 rounded-full transition-all active:scale-95 flex items-center justify-center",
                  isMuted || isDeafened
                    ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/40"
                    : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40"
                )}
                aria-label={isMuted ? "Activar micrófono" : "Silenciar micrófono"}
              >
                {isMuted || isDeafened ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isDeafened ? "Ensordecido (Micrófono bloqueado)" : isMuted ? "Activar micrófono" : "Silenciar micrófono"}
            </TooltipContent>
          </Tooltip>

          {mics.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setShowMicMenu(!showMicMenu);
                setShowCameraMenu(false);
              }}
              className="ml-1 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Cambiar micrófono"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Menú desplegable de micrófonos */}
          {showMicMenu && mics.length > 1 && (
            <div className="absolute bottom-full mb-3 left-0 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl p-2 min-w-[220px] z-50">
              <div className="text-[11px] font-semibold uppercase text-zinc-400 px-2 py-1">
                Micrófonos disponibles
              </div>
              {mics.map((mic) => (
                <button
                  key={mic.deviceId}
                  type="button"
                  onClick={() => {
                    onSwitchMic?.(mic.deviceId);
                    setShowMicMenu(false);
                  }}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors my-0.5",
                    mic.deviceId === selectedMicId
                      ? "bg-emerald-500/20 text-emerald-300 font-medium"
                      : "text-zinc-300 hover:bg-zinc-800"
                  )}
                >
                  <span className="truncate">{mic.label}</span>
                  {mic.deviceId === selectedMicId && <Check className="w-3.5 h-3.5 text-emerald-400 ml-1 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Control Cámara + Menú selector */}
        <div className="relative flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleVideo}
                className={cn(
                  "p-3 rounded-full transition-all active:scale-95 flex items-center justify-center",
                  isVideoOff
                    ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700"
                    : "bg-white text-zinc-950 hover:bg-zinc-200 border border-white font-semibold"
                )}
                aria-label={isVideoOff ? "Encender cámara" : "Apagar cámara"}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isVideoOff ? "Encender cámara" : "Apagar cámara"}
            </TooltipContent>
          </Tooltip>

          {cameras.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setShowCameraMenu(!showCameraMenu);
                setShowMicMenu(false);
              }}
              className="ml-1 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Cambiar cámara"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Menú desplegable de cámaras */}
          {showCameraMenu && cameras.length > 1 && (
            <div className="absolute bottom-full mb-3 left-0 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl p-2 min-w-[220px] z-50">
              <div className="text-[11px] font-semibold uppercase text-zinc-400 px-2 py-1">
                Cámaras disponibles
              </div>
              {cameras.map((cam) => (
                <button
                  key={cam.deviceId}
                  type="button"
                  onClick={() => {
                    onSwitchCamera?.(cam.deviceId);
                    setShowCameraMenu(false);
                  }}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors my-0.5",
                    cam.deviceId === selectedCameraId
                      ? "bg-white/10 text-white font-medium"
                      : "text-zinc-300 hover:bg-zinc-800"
                  )}
                >
                  <span className="truncate">{cam.label}</span>
                  {cam.deviceId === selectedCameraId && <Check className="w-3.5 h-3.5 text-white ml-1 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Control Compartir Pantalla */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleScreenShare}
              className={cn(
                "p-3 rounded-full transition-all active:scale-95 flex items-center justify-center",
                isScreenSharing
                  ? "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/40"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700"
              )}
              aria-label={isScreenSharing ? "Dejar de compartir pantalla" : "Compartir pantalla"}
            >
              <Monitor className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isScreenSharing ? "Dejar de compartir" : "Compartir pantalla"}
          </TooltipContent>
        </Tooltip>

        {/* Control Ensordecer (Deafen) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleDeafen}
              className={cn(
                "p-3 rounded-full transition-all active:scale-95 flex items-center justify-center",
                isDeafened
                  ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/40"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700"
              )}
              aria-label={isDeafened ? "Desensordecer" : "Ensordecer"}
            >
              {isDeafened ? <HeadphoneOff className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isDeafened ? "Desensordecer (Escuchar sala)" : "Ensordecer (Silenciar todo)"}
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-zinc-800 mx-1" />

        {/* Botón Desconectar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onDisconnect}
              className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition-transform active:scale-95 shadow-lg shadow-red-600/30 flex items-center justify-center"
              aria-label="Desconectarse de la sala"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Desconectar</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

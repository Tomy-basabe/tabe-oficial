import React, { useEffect, useRef } from "react";
import { MicOff, HeadphoneOff, Monitor, Volume2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { VoiceControlBar } from "./VoiceControlBar";
import type { CameraDevice } from "@/hooks/useRobustDiscord";

export interface ParticipantState {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  isLocal: boolean;
  stream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
}

export interface TabeTalkRoomProps {
  channelName: string;
  participants: ParticipantState[];
  screenSharer?: ParticipantState | null;
  screenStream?: MediaStream | null;
  // Controles de audio/video
  isMuted: boolean;
  isVideoOff: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleDeafen: () => void;
  onToggleScreenShare: () => void;
  onDisconnect: () => void;
  // Dispositivos
  cameras?: CameraDevice[];
  selectedCameraId?: string;
  onSwitchCamera?: (deviceId: string) => void;
  mics?: CameraDevice[];
  selectedMicId?: string;
  onSwitchMic?: (deviceId: string) => void;
}

export function TabeTalkRoom({
  channelName,
  participants,
  screenSharer,
  screenStream,
  isMuted,
  isVideoOff,
  isDeafened,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleDeafen,
  onToggleScreenShare,
  onDisconnect,
  cameras,
  selectedCameraId,
  onSwitchCamera,
  mics,
  selectedMicId,
  onSwitchMic,
}: TabeTalkRoomProps) {
  // Asegurar que si hay un screenSharer activo, tengamos prioridad en la cuadrícula
  const hasActiveScreenShare = Boolean(screenSharer && screenStream);

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-white relative h-full w-full select-none overflow-hidden">
      {/* Header superior discreto */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-sm shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-zinc-100 uppercase">{channelName}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-zinc-900/80 text-zinc-300 border border-zinc-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {participants.length} {participants.length === 1 ? "Participante" : "Participantes"}
          </span>
        </div>
      </div>

      {/* Área Principal de Video / Cuadrícula */}
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-y-auto">
        {hasActiveScreenShare ? (
          // Modo Pantalla Compartida Prioritaria
          <div className="w-full h-full flex flex-col lg:flex-row gap-4 items-center justify-center">
            {/* Tile prioritario de pantalla compartida */}
            <div className="flex-1 w-full h-full max-h-[80vh] bg-black rounded-2xl border border-zinc-800 relative flex items-center justify-center overflow-hidden shadow-2xl">
              <ScreenVideoPlayer stream={screenStream!} isLocal={screenSharer?.isLocal ?? false} />
              <div className="absolute bottom-4 left-4 bg-zinc-900/90 backdrop-blur-md text-zinc-200 border border-zinc-750 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg">
                <Monitor className="w-4 h-4 text-emerald-400" />
                <span>Pantalla de {screenSharer?.displayName || "Usuario"}</span>
              </div>
            </div>

            {/* Columna lateral de participantes */}
            <div className="w-full lg:w-72 flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto max-h-[80vh] shrink-0 p-1">
              {participants.map((p) => (
                <div key={p.userId} className="w-48 lg:w-full aspect-video shrink-0">
                  <ParticipantTile participant={p} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Cuadrícula dinámica auto-responsive estilo Discord
          <div
            className={cn(
              "w-full h-full flex items-center justify-center transition-all duration-300",
              participants.length === 1 && "max-w-3xl aspect-video p-2",
              participants.length > 1 && "grid gap-3 p-4 w-full h-full max-w-7xl",
              participants.length === 2 && "grid-cols-1 md:grid-cols-2 max-w-5xl",
              participants.length >= 3 && participants.length <= 6 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
              participants.length > 6 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
            )}
          >
            {participants.map((participant) => (
              <div
                key={participant.userId}
                className={cn(
                  "w-full h-full flex items-center justify-center min-h-[180px]",
                  participants.length === 1 && "aspect-video"
                )}
              >
                <ParticipantTile participant={participant} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barra Flotante de Controles Inferior */}
      <div className="pb-6 pt-2 flex items-center justify-center shrink-0 z-30 pointer-events-auto">
        <VoiceControlBar
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isDeafened={isDeafened}
          isScreenSharing={isScreenSharing}
          onToggleAudio={onToggleAudio}
          onToggleVideo={onToggleVideo}
          onToggleDeafen={onToggleDeafen}
          onToggleScreenShare={onToggleScreenShare}
          onDisconnect={onDisconnect}
          cameras={cameras}
          selectedCameraId={selectedCameraId}
          onSwitchCamera={onSwitchCamera}
          mics={mics}
          selectedMicId={selectedMicId}
          onSwitchMic={onSwitchMic}
        />
      </div>
    </div>
  );
}

// Subcomponente de Tarjeta individual de Participante
function ParticipantTile({ participant }: { participant: ParticipantState }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isVideoOff, stream, isLocal, displayName, isSpeaking, isMuted, isDeafened, avatarUrl } = participant;

  // Asignar pista de video activa si la cámara está encendida
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (!isVideoOff && stream) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      videoEl.play().catch(() => {});
    } else {
      videoEl.srcObject = null;
    }
  }, [isVideoOff, stream]);

  const initials = displayName
    ? displayName
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div
      className={cn(
        "group relative w-full h-full aspect-video rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-200 select-none",
        "bg-zinc-900 border border-zinc-800 shadow-xl",
        // Halo verde animado cuando isSpeaking === true
        isSpeaking && "ring-2 ring-emerald-500 shadow-[0_0_12px_#10B981]"
      )}
    >
      {/* Vista de video cuando cámara encendida */}
      {!isVideoOff && stream && stream.getVideoTracks().some((t) => t.enabled && t.readyState === "live") ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover rounded-2xl bg-black"
        />
      ) : (
        // Vista de Avatar cuando cámara apagada
        <div className="flex flex-col items-center justify-center gap-3">
          <Avatar
            className={cn(
              "w-20 h-20 sm:w-24 sm:h-24 border-2 border-zinc-700 transition-transform duration-200",
              isSpeaking && "scale-105"
            )}
          >
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />}
            <AvatarFallback className="bg-zinc-800 text-zinc-100 font-bold text-xl sm:text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Overlay inferior: Nombre del usuario + badges de estado */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-zinc-800/80 flex items-center gap-2 max-w-[80%]">
          <span className="text-xs font-semibold text-zinc-200 truncate">
            {displayName} {isLocal && "(Tú)"}
          </span>
        </div>

        {/* Badges de estado a la derecha */}
        <div className="flex items-center gap-1.5">
          {isDeafened ? (
            <div
              className="bg-red-500/20 border border-red-500/40 text-red-500 p-1.5 rounded-lg shadow"
              title="Ensordecido"
            >
              <HeadphoneOff className="w-3.5 h-3.5" />
            </div>
          ) : isMuted ? (
            <div
              className="bg-red-500/20 border border-red-500/40 text-red-500 p-1.5 rounded-lg shadow"
              title="Silenciado"
            >
              <MicOff className="w-3.5 h-3.5" />
            </div>
          ) : null}

          {participant.isScreenSharing && (
            <div
              className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 p-1.5 rounded-lg shadow"
              title="Transmitiendo pantalla"
            >
              <Monitor className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Reproductor de pantalla compartida
function ScreenVideoPlayer({ stream, isLocal }: { stream: MediaStream; isLocal: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !stream) return;
    videoEl.srcObject = stream;
    videoEl.play().catch(() => {});
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal}
      className="w-full h-full object-contain bg-black"
    />
  );
}

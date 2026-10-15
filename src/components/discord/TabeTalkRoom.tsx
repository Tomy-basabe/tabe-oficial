import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Headphones,
  HeadphoneOff,
  PhoneOff,
  Volume2,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useDiscordVoice } from "@/contexts/DiscordVoiceContext";

export interface RoomParticipantView {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isLocal: boolean;
  stream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
}

export type ParticipantState = RoomParticipantView;

interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

/**
 * Reproductor de audio dedicado por participante remoto.
 * Garantiza que el audio suene aunque el participante tenga la cámara apagada.
 */
function RemoteAudioPlayer({
  stream,
  isDeafened,
  isMuted,
}: {
  stream: MediaStream | null;
  isDeafened: boolean;
  isMuted: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (stream && stream.getAudioTracks().length > 0) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.muted = isDeafened || isMuted;
      const savedSinkId = localStorage.getItem("tabetalk_audio_output_device");
      if (
        savedSinkId &&
        savedSinkId !== "default" &&
        typeof (el as any).setSinkId === "function"
      ) {
        (el as any).setSinkId(savedSinkId).catch(() => {});
      }
      el.play().catch((err) => {
        console.warn("[TabeTalk] Autoplay de audio pendiente de interacción:", err);
      });
    } else {
      el.srcObject = null;
    }
  }, [stream, isDeafened, isMuted]);

  // Escuchar si entran pistas de audio dinámicamente al mismo MediaStream
  useEffect(() => {
    if (!stream) return;
    const handleTrackChange = () => {
      const el = audioRef.current;
      if (el && stream.getAudioTracks().length > 0) {
        el.srcObject = null;
        el.srcObject = stream;
        el.muted = isDeafened || isMuted;
        el.play().catch(() => {});
      }
    };
    stream.addEventListener("addtrack", handleTrackChange);
    stream.addEventListener("removetrack", handleTrackChange);
    return () => {
      stream.removeEventListener("addtrack", handleTrackChange);
      stream.removeEventListener("removetrack", handleTrackChange);
    };
  }, [stream, isDeafened, isMuted]);

  return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
}

/**
 * Tarjeta visual de cada participante (estilo Google Meet / Discord).
 * Mantiene el <video> siempre montado para evitar pérdida de referencia al encender cámara.
 */
function ParticipantTile({ participant }: { participant: RoomParticipantView }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [trackVersion, setTrackVersion] = useState(0);

  const {
    isVideoOff,
    stream,
    isLocal,
    displayName,
    isSpeaking,
    isMuted,
    isDeafened,
    avatarUrl,
  } = participant;

  // Escuchar cambios de tracks dentro del mismo MediaStream
  useEffect(() => {
    if (!stream) return;
    const bump = () => setTrackVersion((v) => v + 1);
    stream.addEventListener("addtrack", bump);
    stream.addEventListener("removetrack", bump);

    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((t) => {
      t.addEventListener("mute", bump);
      t.addEventListener("unmute", bump);
      t.addEventListener("ended", bump);
    });

    return () => {
      stream.removeEventListener("addtrack", bump);
      stream.removeEventListener("removetrack", bump);
      videoTracks.forEach((t) => {
        t.removeEventListener("mute", bump);
        t.removeEventListener("unmute", bump);
        t.removeEventListener("ended", bump);
      });
    };
  }, [stream]);

  const hasLiveVideo = useMemo(() => {
    if (isVideoOff || !stream) return false;
    const vTracks = stream.getVideoTracks();
    return vTracks.some((t) => t.enabled && t.readyState === "live");
  }, [isVideoOff, stream, trackVersion]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (stream && hasLiveVideo) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      videoEl.play().catch(() => {});
    } else {
      videoEl.srcObject = null;
    }
  }, [stream, hasLiveVideo, trackVersion]);

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
        isSpeaking && "ring-2 ring-emerald-500 shadow-[0_0_16px_#10B981]"
      )}
    >
      {/* Audio remoto dedicado */}
      {!isLocal && (
        <RemoteAudioPlayer
          stream={stream}
          isDeafened={isDeafened}
          isMuted={isMuted}
        />
      )}

      {/* Elemento <video> siempre montado en el DOM para reacción instantánea */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn(
          "w-full h-full object-cover rounded-2xl bg-black transition-opacity duration-200",
          isLocal && "scale-x-[-1]",
          hasLiveVideo ? "opacity-100 z-10" : "opacity-0 pointer-events-none absolute inset-0"
        )}
      />

      {/* Fallback de Avatar cuando la cámara está apagada */}
      {!hasLiveVideo && (
        <div className="flex flex-col items-center justify-center gap-3 z-10">
          <Avatar
            className={cn(
              "w-20 h-20 sm:w-24 sm:h-24 border-2 border-zinc-700 transition-transform duration-200",
              isSpeaking && "scale-105 ring-4 ring-emerald-500/40"
            )}
          >
            {avatarUrl && (
              <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
            )}
            <AvatarFallback className="bg-zinc-800 text-zinc-100 font-bold text-xl sm:text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Barra inferior con nombre e indicadores de estado */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
        <div className="bg-zinc-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-zinc-800/80 flex items-center gap-2 max-w-[80%]">
          {isSpeaking && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          )}
          <span className="text-xs font-semibold text-zinc-200 truncate">
            {displayName} {isLocal && "(Tú)"}
          </span>
        </div>

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
              <MonitorUp className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScreenShareViewport({
  stream,
  isLocal,
}: {
  stream: MediaStream | null;
  isLocal: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }

    if (!stream) return;
    const handleTrack = () => {
      if (el) {
        el.srcObject = null;
        el.srcObject = stream;
        el.play().catch(() => {});
      }
    };
    stream.addEventListener("addtrack", handleTrack);
    stream.addEventListener("removetrack", handleTrack);
    return () => {
      stream.removeEventListener("addtrack", handleTrack);
      stream.removeEventListener("removetrack", handleTrack);
    };
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

/**
 * Barra de controles flotante estilo Meet / Discord.
 */
function ControlDock({
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
}: {
  isMuted: boolean;
  isVideoOff: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleDeafen: () => void;
  onToggleScreenShare: () => void;
  onDisconnect: () => void;
  cameras?: MediaDeviceOption[];
  selectedCameraId?: string;
  onSwitchCamera?: (deviceId: string) => void;
  mics?: MediaDeviceOption[];
  selectedMicId?: string;
  onSwitchMic?: (deviceId: string) => void;
}) {
  const [openMicMenu, setOpenMicMenu] = useState(false);
  const [openCamMenu, setOpenCamMenu] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <div className="bg-zinc-950/90 backdrop-blur-md border border-zinc-800 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl">
        {/* Botón Micrófono */}
        <div className="relative flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleAudio}
                className={cn(
                  "p-3 rounded-full transition-all active:scale-95 flex items-center justify-center cursor-pointer",
                  isMuted || isDeafened
                    ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/40"
                    : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40"
                )}
                aria-label={isMuted ? "Activar micrófono" : "Silenciar micrófono"}
              >
                {isMuted || isDeafened ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isDeafened
                ? "Reactivar micrófono y audio"
                : isMuted
                ? "Activar micrófono"
                : "Silenciar micrófono"}
            </TooltipContent>
          </Tooltip>

          {mics.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setOpenMicMenu(!openMicMenu);
                setOpenCamMenu(false);
              }}
              className="ml-1 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Cambiar micrófono"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}

          {openMicMenu && mics.length > 1 && (
            <div className="absolute bottom-full mb-3 left-0 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl p-2 min-w-[220px] z-50">
              <div className="text-[11px] font-semibold uppercase text-zinc-400 px-2 py-1">
                Micrófonos disponibles
              </div>
              {mics.map((m) => (
                <button
                  key={m.deviceId}
                  type="button"
                  onClick={() => {
                    onSwitchMic?.(m.deviceId);
                    setOpenMicMenu(false);
                  }}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors my-0.5 cursor-pointer",
                    m.deviceId === selectedMicId
                      ? "bg-emerald-500/20 text-emerald-300 font-medium"
                      : "text-zinc-300 hover:bg-zinc-800"
                  )}
                >
                  <span className="truncate">{m.label}</span>
                  {m.deviceId === selectedMicId && (
                    <Check className="w-3.5 h-3.5 text-emerald-400 ml-1 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Botón Cámara */}
        <div className="relative flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleVideo}
                className={cn(
                  "p-3 rounded-full transition-all active:scale-95 flex items-center justify-center cursor-pointer",
                  isVideoOff
                    ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700"
                    : "bg-white text-zinc-950 hover:bg-zinc-200 border border-white font-semibold"
                )}
                aria-label={isVideoOff ? "Encender cámara" : "Apagar cámara"}
              >
                {isVideoOff ? (
                  <VideoOff className="w-5 h-5" />
                ) : (
                  <Video className="w-5 h-5" />
                )}
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
                setOpenCamMenu(!openCamMenu);
                setOpenMicMenu(false);
              }}
              className="ml-1 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Cambiar cámara"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}

          {openCamMenu && cameras.length > 1 && (
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
                    setOpenCamMenu(false);
                  }}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors my-0.5 cursor-pointer",
                    cam.deviceId === selectedCameraId
                      ? "bg-white/10 text-white font-medium"
                      : "text-zinc-300 hover:bg-zinc-800"
                  )}
                >
                  <span className="truncate">{cam.label}</span>
                  {cam.deviceId === selectedCameraId && (
                    <Check className="w-3.5 h-3.5 text-white ml-1 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Botón Compartir Pantalla */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleScreenShare}
              className={cn(
                "p-3 rounded-full transition-all active:scale-95 flex items-center justify-center cursor-pointer",
                isScreenSharing
                  ? "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/40"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700"
              )}
              aria-label={
                isScreenSharing ? "Dejar de compartir pantalla" : "Compartir pantalla"
              }
            >
              <MonitorUp className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isScreenSharing ? "Dejar de compartir" : "Compartir pantalla"}
          </TooltipContent>
        </Tooltip>

        {/* Botón Ensordecer */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleDeafen}
              className={cn(
                "p-3 rounded-full transition-all active:scale-95 flex items-center justify-center cursor-pointer",
                isDeafened
                  ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/40"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700"
              )}
              aria-label={isDeafened ? "Desensordecer" : "Ensordecer"}
            >
              {isDeafened ? (
                <HeadphoneOff className="w-5 h-5" />
              ) : (
                <Headphones className="w-5 h-5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isDeafened ? "Desensordecer (Escuchar sala)" : "Ensordecer (Silenciar todo)"}
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-6 bg-zinc-800 mx-1" />

        {/* Botón Cortar Llamada */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onDisconnect}
              className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition-transform active:scale-95 shadow-lg shadow-red-600/30 flex items-center justify-center cursor-pointer"
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

export function TabeTalkRoom({
  channel,
  channelName,
  voiceParticipants,
  participants,
  localStream,
  remoteStreams,
  speakingUsers = new Set(),
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  isDeafened,
  isMuted,
  isVideoOff,
  cameras = [],
  selectedCameraId = "",
  mics = [],
  selectedMicId = "",
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleDeafen,
  onLeaveChannel,
  onDisconnect,
  onSwitchCamera,
  onSwitchMic,
  screenStream,
  screenSharer,
  remoteScreenStreams = new Map(),
  remoteMediaStates = new Map(),
}: any) {
  const { user } = useAuth();
  const voiceContext = useDiscordVoice();
  const currentUserId = user?.id || "";

  const effectiveLocalStream = localStream || voiceContext?.localStream || null;
  const effectiveIsAudioEnabled =
    isAudioEnabled !== undefined
      ? isAudioEnabled
      : isMuted !== undefined
      ? !isMuted
      : voiceContext?.isAudioEnabled ?? true;
  const effectiveIsVideoEnabled =
    isVideoEnabled !== undefined
      ? isVideoEnabled
      : isVideoOff !== undefined
      ? !isVideoOff
      : voiceContext?.isVideoEnabled ?? false;
  const effectiveIsScreenSharing =
    isScreenSharing !== undefined
      ? isScreenSharing
      : voiceContext?.isScreenSharing ?? false;
  const effectiveIsDeafened =
    isDeafened !== undefined
      ? isDeafened
      : voiceContext?.isDeafened ?? false;

  const effectiveCameras =
    cameras && cameras.length > 0 ? cameras : voiceContext?.cameras || [];
  const effectiveMics =
    mics && mics.length > 0 ? mics : voiceContext?.mics || [];
  const effectiveSelectedCameraId =
    selectedCameraId || voiceContext?.selectedCameraId || "";
  const effectiveSelectedMicId =
    selectedMicId || voiceContext?.selectedMicId || "";

  const handleToggleAudio = () => {
    if (onToggleAudio) {
      onToggleAudio();
    } else if (voiceContext?.toggleAudio) {
      voiceContext.toggleAudio();
    }
  };

  const handleToggleVideo = () => {
    if (onToggleVideo) {
      onToggleVideo();
    } else if (voiceContext?.toggleVideo) {
      voiceContext.toggleVideo();
    }
  };

  const handleToggleDeafen = () => {
    if (onToggleDeafen) {
      onToggleDeafen();
    } else if (voiceContext?.toggleDeafen) {
      voiceContext.toggleDeafen();
    }
  };

  const handleToggleScreenShare = () => {
    if (onToggleScreenShare) {
      onToggleScreenShare();
    } else if (effectiveIsScreenSharing && voiceContext?.stopScreenShare) {
      voiceContext.stopScreenShare();
    } else if (!effectiveIsScreenSharing && voiceContext?.startScreenShare) {
      voiceContext.startScreenShare();
    }
  };

  const handleDisconnect = () => {
    if (onDisconnect) {
      onDisconnect();
    } else if (onLeaveChannel) {
      onLeaveChannel();
    } else if (voiceContext?.leaveVoiceChannel) {
      voiceContext.leaveVoiceChannel();
    }
  };

  const handleSwitchCamera = (deviceId: string) => {
    if (onSwitchCamera) {
      onSwitchCamera(deviceId);
    } else if (voiceContext?.switchCamera) {
      voiceContext.switchCamera(deviceId);
    }
  };

  const handleSwitchMic = (deviceId: string) => {
    if (onSwitchMic) {
      onSwitchMic(deviceId);
    } else if (voiceContext?.switchMic) {
      voiceContext.switchMic(deviceId);
    }
  };

  const rawParticipants = voiceParticipants || participants || [];

  const localParticipant: RoomParticipantView = useMemo(() => {
    const found = rawParticipants.find(
      (p: any) => p?.user_id === currentUserId || p?.userId === currentUserId || p?.isLocal
    );
    const meta = user?.user_metadata || {};
    const customNick = localStorage.getItem("tabetalk_nickname");
    const customAvatar = localStorage.getItem("tabetalk_avatar");

    const displayName =
      customNick ||
      found?.displayName ||
      found?.profile?.nombre ||
      found?.profile?.username ||
      meta.nombre ||
      meta.full_name ||
      meta.username ||
      user?.email?.split("@")[0] ||
      "Tú";

    return {
      userId: currentUserId,
      displayName,
      avatarUrl:
        customAvatar ||
        found?.avatarUrl ||
        found?.profile?.avatar_url ||
        meta.avatar_url ||
        null,
      isLocal: true,
      stream: effectiveLocalStream || found?.stream || null,
      isMuted: !effectiveIsAudioEnabled || !!effectiveIsDeafened,
      isVideoOff: !effectiveIsVideoEnabled,
      isDeafened: !!effectiveIsDeafened,
      isScreenSharing: !!effectiveIsScreenSharing,
      isSpeaking: speakingUsers?.has ? speakingUsers.has(currentUserId) : false,
    };
  }, [
    rawParticipants,
    currentUserId,
    user,
    effectiveLocalStream,
    effectiveIsAudioEnabled,
    effectiveIsDeafened,
    effectiveIsVideoEnabled,
    effectiveIsScreenSharing,
    speakingUsers,
  ]);

  const allParticipants: RoomParticipantView[] = useMemo(() => {
    const map = new Map<string, RoomParticipantView>();

    // 1. Integrantes registrados en la base/lista de participantes
    rawParticipants.forEach((p: any) => {
      const uid = p?.user_id || p?.userId;
      if (!uid || uid === currentUserId || p?.isLocal) return;
      const mediaState = remoteMediaStates?.get ? remoteMediaStates.get(uid) : undefined;

      const pMuted =
        mediaState?.isMuted !== undefined
          ? mediaState.isMuted
          : mediaState?.isAudioEnabled !== undefined
          ? !mediaState.isAudioEnabled
          : p.isMuted !== undefined
          ? p.isMuted
          : !!p.is_muted;

      const pVideoOff =
        mediaState?.isVideoOff !== undefined
          ? mediaState.isVideoOff
          : mediaState?.isCameraOn !== undefined
          ? !mediaState.isCameraOn
          : p.isVideoOff !== undefined
          ? p.isVideoOff
          : !p.is_camera_on;

      const stream = (remoteStreams?.get ? remoteStreams.get(uid) : null) || p.stream || null;

      map.set(uid, {
        userId: uid,
        displayName:
          mediaState?.displayName ||
          p.displayName ||
          p.profile?.nombre ||
          p.profile?.username ||
          "Estudiante",
        avatarUrl:
          mediaState?.avatarUrl || p.avatarUrl || p.profile?.avatar_url || null,
        isLocal: false,
        stream,
        isMuted: !!pMuted,
        isVideoOff: !!pVideoOff,
        isDeafened:
          mediaState?.isDeafened !== undefined
            ? mediaState.isDeafened
            : p.isDeafened !== undefined
            ? p.isDeafened
            : !!p.is_deafened,
        isScreenSharing:
          mediaState?.isScreenSharing !== undefined
            ? mediaState.isScreenSharing
            : p.isScreenSharing !== undefined
            ? p.isScreenSharing
            : !!p.is_screen_sharing,
        isSpeaking: speakingUsers?.has ? speakingUsers.has(uid) : !!p.isSpeaking,
      });
    });

    // 2. Integrantes con stream WebRTC activo
    if (remoteStreams?.forEach) {
      remoteStreams.forEach((stream: MediaStream, peerId: string) => {
        if (peerId === currentUserId || map.has(peerId)) return;
        const mediaState = remoteMediaStates?.get ? remoteMediaStates.get(peerId) : undefined;
        const hasActiveVideoTrack = stream
          ?.getVideoTracks()
          .some((t) => t.enabled && t.readyState === "live");

        map.set(peerId, {
          userId: peerId,
          displayName: mediaState?.displayName || "Estudiante",
          avatarUrl: mediaState?.avatarUrl || null,
          isLocal: false,
          stream,
          isMuted:
            mediaState?.isMuted ?? (mediaState?.isAudioEnabled === false),
          isVideoOff:
            mediaState?.isVideoOff !== undefined
              ? mediaState.isVideoOff
              : !hasActiveVideoTrack,
          isDeafened: !!mediaState?.isDeafened,
          isScreenSharing: !!mediaState?.isScreenSharing,
          isSpeaking: speakingUsers?.has ? speakingUsers.has(peerId) : false,
        });
      });
    }

    // 3. Integrantes sincronizados por Presence / Broadcast
    if (remoteMediaStates?.forEach) {
      remoteMediaStates.forEach((state: any, peerId: string) => {
        if (peerId === currentUserId || map.has(peerId)) return;
        map.set(peerId, {
          userId: peerId,
          displayName: state.displayName || "Estudiante",
          avatarUrl: state.avatarUrl || null,
          isLocal: false,
          stream: (remoteStreams?.get ? remoteStreams.get(peerId) : null) || null,
          isMuted: !!state.isMuted,
          isVideoOff: state.isVideoOff !== undefined ? state.isVideoOff : true,
          isDeafened: !!state.isDeafened,
          isScreenSharing: !!state.isScreenSharing,
          isSpeaking: speakingUsers?.has ? speakingUsers.has(peerId) : false,
        });
      });
    }

    return [localParticipant, ...Array.from(map.values())];
  }, [
    rawParticipants,
    currentUserId,
    remoteMediaStates,
    remoteStreams,
    speakingUsers,
    localParticipant,
  ]);

  const activeScreenSharer = useMemo(() => {
    if (screenSharer) return screenSharer;
    if (isScreenSharing && screenStream) return localParticipant;
    return allParticipants.find((p) => !p.isLocal && p.isScreenSharing) || null;
  }, [screenSharer, isScreenSharing, screenStream, localParticipant, allParticipants]);

  const activeScreenStream = useMemo(() => {
    if (screenStream) return screenStream;
    if (activeScreenSharer && !activeScreenSharer.isLocal) {
      return (
        (remoteScreenStreams?.get ? remoteScreenStreams.get(activeScreenSharer.userId) : null) ||
        (remoteStreams?.get ? remoteStreams.get(activeScreenSharer.userId) : null) ||
        null
      );
    }
    return null;
  }, [
    screenStream,
    activeScreenSharer,
    remoteScreenStreams,
    remoteStreams,
  ]);

  const hasScreenShare = !!(activeScreenSharer && activeScreenStream);
  const displayChannelName = channelName || channel?.name || "Sala de Voz";

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-white relative h-full w-full select-none overflow-hidden">
      {/* Header de la Sala */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-sm shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-zinc-100 uppercase">
              {displayChannelName}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-zinc-900/80 text-zinc-300 border border-zinc-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {allParticipants.length}{" "}
            {allParticipants.length === 1 ? "Participante" : "Participantes"}
          </span>
        </div>
      </div>

      {/* Grilla de Participantes / Pantalla Compartida */}
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-y-auto">
        {hasScreenShare ? (
          <div className="w-full h-full flex flex-col lg:flex-row gap-4 items-center justify-center">
            <div className="flex-1 w-full h-full max-h-[80vh] bg-black rounded-2xl border border-zinc-800 relative flex items-center justify-center overflow-hidden shadow-2xl">
              <ScreenShareViewport
                stream={activeScreenStream}
                isLocal={activeScreenSharer?.isLocal ?? false}
              />
              <div className="absolute bottom-4 left-4 bg-zinc-900/90 backdrop-blur-md text-zinc-200 border border-zinc-700 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg">
                <MonitorUp className="w-4 h-4 text-emerald-400" />
                <span>
                  Pantalla de {activeScreenSharer?.displayName || "Usuario"}
                </span>
              </div>
            </div>
            <div className="w-full lg:w-72 flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto max-h-[80vh] shrink-0 p-1">
              {allParticipants.map((p) => (
                <div key={p.userId} className="w-48 lg:w-full aspect-video shrink-0">
                  <ParticipantTile participant={p} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "w-full h-full flex items-center justify-center transition-all duration-300",
              allParticipants.length === 1 && "max-w-3xl aspect-video p-2",
              allParticipants.length > 1 && "grid gap-3 p-4 w-full h-full max-w-7xl",
              allParticipants.length === 2 && "grid-cols-1 md:grid-cols-2 max-w-5xl",
              allParticipants.length >= 3 &&
                allParticipants.length <= 6 &&
                "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
              allParticipants.length > 6 &&
                "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
            )}
          >
            {allParticipants.map((p) => (
              <div
                key={p.userId}
                className={cn(
                  "w-full h-full flex items-center justify-center min-h-[180px]",
                  allParticipants.length === 1 && "aspect-video"
                )}
              >
                <ParticipantTile participant={p} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barra Inferior de Controles */}
      <div className="pb-6 pt-2 flex items-center justify-center shrink-0 z-30 pointer-events-auto">
        <ControlDock
          isMuted={!effectiveIsAudioEnabled || !!effectiveIsDeafened}
          isVideoOff={!effectiveIsVideoEnabled}
          isDeafened={!!effectiveIsDeafened}
          isScreenSharing={!!effectiveIsScreenSharing}
          onToggleAudio={handleToggleAudio}
          onToggleVideo={handleToggleVideo}
          onToggleDeafen={handleToggleDeafen}
          onToggleScreenShare={handleToggleScreenShare}
          onDisconnect={handleDisconnect}
          cameras={effectiveCameras}
          selectedCameraId={effectiveSelectedCameraId}
          onSwitchCamera={handleSwitchCamera}
          mics={effectiveMics}
          selectedMicId={effectiveSelectedMicId}
          onSwitchMic={handleSwitchMic}
        />
      </div>
    </div>
  );
}

export default TabeTalkRoom;

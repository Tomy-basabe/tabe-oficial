import { useRef, useEffect, useState } from "react";
import { Volume2, Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, MonitorOff, SwitchCamera, ChevronDown } from "lucide-react";
import type { CameraDevice } from "@/hooks/useRobustDiscord";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import type { DiscordChannel, DiscordVoiceParticipant } from "@/hooks/useDiscord";

interface DiscordVoiceChannelProps {
  channel: DiscordChannel;
  voiceParticipants?: DiscordVoiceParticipant[];
  participants?: DiscordVoiceParticipant[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  speakingUsers: Set<string>;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  isDeafened: boolean;
  cameras?: CameraDevice[];
  selectedCameraId?: string;
  mics?: CameraDevice[];
  selectedMicId?: string;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeaveChannel: () => void;
  onSwitchCamera?: (deviceId: string) => void;
  onSwitchMic?: (deviceId: string) => void;
  screenStream?: MediaStream | null;
  remoteScreenStreams?: Map<string, MediaStream>;
  remoteMediaStates?: Map<string, any>;
}

export function DiscordVoiceChannel({
  channel,
  voiceParticipants,
  participants,
  localStream,
  remoteStreams,
  speakingUsers,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  isDeafened,
  cameras = [],
  selectedCameraId = '',
  mics = [],
  selectedMicId = '',
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeaveChannel,
  onSwitchCamera,
  onSwitchMic,
  screenStream,
  remoteScreenStreams = new Map(),
  remoteMediaStates = new Map(),
}: DiscordVoiceChannelProps) {
  const { user } = useAuth();
  const localUserId = user?.id || "";
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [showMicMenu, setShowMicMenu] = useState(false);

  // Normalize participants asegurando unificaciÃ³n reactiva:
  // 1. Participantes de base de datos
  const dbParticipants = voiceParticipants || participants || [];

  // 2. Participante local garantizado
  const localParticipant: DiscordVoiceParticipant = dbParticipants.find(p => p.user_id === localUserId) || {
    id: `local-${localUserId}`,
    channel_id: channel.id,
    user_id: localUserId,
    is_muted: !isAudioEnabled,
    is_deafened: isDeafened,
    is_camera_on: isVideoEnabled,
    is_screen_sharing: isScreenSharing,
    is_speaking: speakingUsers.has(localUserId),
    joined_at: new Date().toISOString(),
    profile: (user?.user_metadata as any) || { nombre: "TÃº", username: "TÃº" }
  };

  // 3. Unir mapa de participantes (DB + Streams WebRTC activos + Media States)
  const participantsMap = new Map<string, DiscordVoiceParticipant>();
  dbParticipants.forEach(p => participantsMap.set(p.user_id, p));

  // Asegurar participante local con estados frescos en tiempo real
  participantsMap.set(localUserId, {
    ...(participantsMap.get(localUserId) || localParticipant),
    is_muted: !isAudioEnabled,
    is_deafened: isDeafened,
    is_camera_on: isVideoEnabled,
    is_screen_sharing: isScreenSharing,
    is_speaking: speakingUsers.has(localUserId),
  });

  // Agregar cualquier peer que tenga stream activo o media state activo
  remoteStreams.forEach((_str, peerId) => {
    if (!participantsMap.has(peerId) && peerId !== localUserId) {
      participantsMap.set(peerId, {
        id: `peer-${peerId}`,
        channel_id: channel.id,
        user_id: peerId,
        is_muted: remoteMediaStates.get(peerId)?.isAudioEnabled === false,
        is_deafened: false,
        is_camera_on: remoteMediaStates.get(peerId)?.isCameraOn ?? false,
        is_screen_sharing: remoteMediaStates.get(peerId)?.isScreenSharing ?? false,
        is_speaking: speakingUsers.has(peerId),
        joined_at: new Date().toISOString(),
        profile: { username: "CompaÃ±ero", nombre: "CompaÃ±ero" }
      });
    }
  });

  // Asegurar tambiÃ©n cualquier peer que haya emitido remoteMediaState
  remoteMediaStates.forEach((state, peerId) => {
    if (!participantsMap.has(peerId) && peerId !== localUserId) {
      participantsMap.set(peerId, {
        id: `peer-${peerId}`,
        channel_id: channel.id,
        user_id: peerId,
        is_muted: !state.isAudioEnabled,
        is_deafened: false,
        is_camera_on: state.isCameraOn,
        is_screen_sharing: state.isScreenSharing,
        is_speaking: speakingUsers.has(peerId),
        joined_at: new Date().toISOString(),
        profile: { username: "CompaÃ±ero", nombre: "CompaÃ±ero" }
      });
    }
  });

  const activeParticipants = Array.from(participantsMap.values());

  // Find screen sharer (activaciÃ³n inmediata al recibir seÃ±al o stream)
  const screenSharer = isScreenSharing
    ? localParticipant
    : activeParticipants.find(p => {
        const isSharing = p.is_screen_sharing || remoteMediaStates.get(p.user_id)?.isScreenSharing;
        return Boolean(isSharing);
      });

  // Desbloqueo proactivo de audio en navegadores mÃ³viles (iOS Safari / Android Chrome)
  useEffect(() => {
    const unlockAudio = () => {
      document.querySelectorAll("audio, video").forEach((el: any) => {
        if (el && !el.muted && el.paused && el.srcObject) {
          el.play().catch(() => {});
        }
      });
    };
    window.addEventListener("touchstart", unlockAudio, { passive: true });
    window.addEventListener("click", unlockAudio, { passive: true });
    return () => {
      window.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("click", unlockAudio);
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-background relative z-10 h-full select-none overflow-hidden">
      {/* Comic Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b-3 border-black bg-card shadow-[0_3px_0px_#000] shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FFE600] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center">
            <Volume2 className="w-4 h-4 text-black stroke-[2.5]" />
          </div>
          <span className="font-black text-foreground text-sm uppercase tracking-wider">{channel.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-[#FFE600] text-black border-2 border-black shadow-[2px_2px_0px_#000] px-3 py-1 rounded-full font-black text-xs flex items-center gap-1.5 uppercase tracking-wide">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse border border-black" />
            {activeParticipants.length} {activeParticipants.length === 1 ? "Conectado" : "Conectados"}
          </span>
        </div>
      </div>

      {/* Main Video & Screen Share Stage */}
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-y-auto">
        {screenSharer ? (
          // Screen share layout
          <div className="w-full h-full flex flex-col md:flex-row gap-4">
            {/* Screen share main viewport */}
            <div className="flex-1 bg-black rounded-2xl overflow-hidden relative flex items-center justify-center border-3 border-black shadow-[6px_6px_0px_#000] min-h-[300px]">
              {screenSharer.user_id === localUserId ? (
                <ScreenShareTile stream={screenStream} isLocal={true} />
              ) : (
                <ScreenShareTile stream={remoteScreenStreams.get(screenSharer.user_id) || remoteStreams.get(screenSharer.user_id)} isLocal={false} />
              )}
              <div className="absolute bottom-4 left-4 bg-white text-black px-3.5 py-1.5 rounded-xl text-xs font-black border-2 border-black shadow-[3px_3px_0px_#000] flex items-center gap-2 uppercase tracking-wide">
                <Monitor className="w-4 h-4 text-primary stroke-[2.5]" />
                Pantalla de {screenSharer.profile?.nombre || screenSharer.profile?.username || "Usuario"}
              </div>
            </div>

            {/* Side column for participants */}
            <div className="w-full md:w-64 flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-y-auto pr-1 shrink-0">
              {activeParticipants.map(p => (
                <SmallTile
                  key={p.id}
                  participant={p}
                  stream={p.user_id === localUserId ? localStream : remoteStreams.get(p.user_id)}
                  isSpeaking={speakingUsers.has(p.user_id)}
                  isLocal={p.user_id === localUserId}
                  isVideoEnabled={p.user_id === localUserId ? isVideoEnabled : (remoteMediaStates.get(p.user_id)?.isCameraOn ?? p.is_camera_on)}
                />
              ))}
            </div>
          </div>
        ) : (
          // Grid layout for video / avatar tiles
          <div className={cn(
            "grid gap-4 w-full h-full place-items-center transition-all duration-300",
            activeParticipants.length <= 1 && "grid-cols-1 max-w-2xl max-h-[500px]",
            activeParticipants.length === 2 && "grid-cols-1 md:grid-cols-2 max-w-4xl max-h-[480px]",
            activeParticipants.length >= 3 && activeParticipants.length <= 4 && "grid-cols-1 sm:grid-cols-2 max-w-5xl",
            activeParticipants.length > 4 && "grid-cols-2 md:grid-cols-3 max-w-6xl"
          )}>
            {activeParticipants.map(p => (
              <VideoTile
                key={p.id}
                participant={p}
                stream={p.user_id === localUserId ? localStream : remoteStreams.get(p.user_id)}
                isSpeaking={speakingUsers.has(p.user_id)}
                isLocal={p.user_id === localUserId}
                isVideoEnabled={p.user_id === localUserId ? isVideoEnabled : (remoteMediaStates.get(p.user_id)?.isCameraOn ?? p.is_camera_on)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Bottom Controls (Comic / Neobrutalism) */}
      <div className="p-4 flex items-center justify-center shrink-0 z-30">
        <div className="bg-card border-3 border-black shadow-[6px_6px_0px_#000] rounded-2xl px-5 py-2.5 flex items-center gap-3 backdrop-blur-md">
          {/* Mic Button */}
          <ComicControlBtn
            icon={isAudioEnabled ? Mic : MicOff}
            active={!isAudioEnabled}
            onClick={onToggleAudio}
            tooltip={isAudioEnabled ? "Silenciar MicrÃ³fono" : "Activar MicrÃ³fono"}
            variant={isAudioEnabled ? "yellow" : "danger"}
          />

          {/* Camera Button & Selector */}
          <div className="relative flex items-center">
            <ComicControlBtn
              icon={isVideoEnabled ? Video : VideoOff}
              active={isVideoEnabled}
              onClick={onToggleVideo}
              tooltip={isVideoEnabled ? "Apagar CÃ¡mara" : "Encender CÃ¡mara"}
              variant={isVideoEnabled ? "cyan" : "neutral"}
            />
            {cameras.length > 1 && (
              <button
                onClick={() => setShowCameraMenu(!showCameraMenu)}
                className="ml-1 w-8 h-8 rounded-lg flex items-center justify-center bg-muted hover:bg-muted/80 text-foreground border-2 border-black shadow-[1.5px_1.5px_0px_#000] transition-all"
                title="Cambiar cÃ¡mara"
              >
                <ChevronDown className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}

            {showCameraMenu && cameras.length > 1 && (
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-card border-2 border-black rounded-xl shadow-[4px_4px_0px_#000] p-2 min-w-[200px] z-50">
                <div className="text-[11px] font-black uppercase text-muted-foreground px-2 py-1 flex items-center gap-1.5">
                  <SwitchCamera className="w-3.5 h-3.5" /> Dispositivos
                </div>
                {cameras.map(cam => (
                  <button
                    key={cam.deviceId}
                    onClick={() => { onSwitchCamera?.(cam.deviceId); setShowCameraMenu(false); }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-xs font-bold rounded-lg transition-colors truncate border-2 border-transparent my-0.5",
                      cam.deviceId === selectedCameraId
                        ? "bg-[#FFE600] text-black border-black shadow-[2px_2px_0px_#000]"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Screen Share Button */}
          <ComicControlBtn
            icon={isScreenSharing ? MonitorOff : Monitor}
            active={isScreenSharing}
            onClick={onToggleScreenShare}
            tooltip={isScreenSharing ? "Dejar de compartir" : "Transmitir Pantalla"}
            variant={isScreenSharing ? "purple" : "neutral"}
          />

          <div className="w-px h-6 bg-border mx-1" />

          {/* Disconnect Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onLeaveChannel}
                className="px-4 py-2 rounded-xl flex items-center gap-2 bg-[#EF4444] text-white hover:bg-red-600 border-2 border-black shadow-[3px_3px_0px_#000] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all font-black text-xs uppercase tracking-wider"
              >
                <PhoneOff className="w-4 h-4 stroke-[2.5]" />
                <span>Desconectar</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="font-bold border-2 border-black shadow-[2px_2px_0px_#000]">
              Salir del canal de voz
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

// â•â•â• Participant Video Tile (Comic Style) â•â•â•
function VideoTile({
  participant,
  stream,
  isSpeaking,
  isLocal,
  isScreenShare = false,
  isVideoEnabled = false
}: {
  participant: DiscordVoiceParticipant;
  stream?: MediaStream | null;
  isSpeaking: boolean;
  isLocal: boolean;
  isScreenShare?: boolean;
  isVideoEnabled?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [, setTrackUpdate] = useState(0);

  const videoTracks = stream ? stream.getVideoTracks() : [];
  const hasLiveVideo = videoTracks.some(t => t.readyState === 'live');
  const showVideo = Boolean(videoTracks.length > 0 && (isVideoEnabled || hasLiveVideo));

  // Vincular stream al elemento de video
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (!stream) {
      el.srcObject = null;
      return;
    }

    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    el.play().catch((err) => console.log('AutoPlay prevented:', err));
  }, [stream]); // NO DEPENDER DE showVideo, SINO CORTA EL AUDIO

  // Escuchar adiciÃ³n o remociÃ³n de pistas en caliente (cÃ¡mara on/off, pantalla on/off)
  useEffect(() => {
    if (!stream) return;
    const onTrackChange = () => setTrackUpdate(n => n + 1);
    stream.addEventListener('addtrack', onTrackChange);
    stream.addEventListener('removetrack', onTrackChange);
    return () => {
      stream.removeEventListener('addtrack', onTrackChange);
      stream.removeEventListener('removetrack', onTrackChange);
    };
  }, [stream]);

  return (
    <div className={cn(
      "relative rounded-2xl overflow-hidden w-full h-full min-h-[220px] max-h-[460px] aspect-video flex items-center justify-center transition-all duration-200 border-3 border-black shadow-[4px_4px_0px_#000] bg-card group",
      isSpeaking ? "ring-4 ring-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,0.5),4px_4px_0px_#000]" : ""
    )}>

      {/* Video Element */}
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn(
            "w-full h-full object-cover",
            isLocal && "scale-x-[-1]",
            !showVideo && "hidden"
          )}
        />
      )}

      {/* Avatar cuando la cÃ¡mara no estÃ¡ activa */}
      {!showVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/30 p-4">
          <Avatar className={cn(
            "w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-3 border-black shadow-[4px_4px_0px_#000] transition-transform duration-200",
            isSpeaking && "scale-105"
          )}>
            <AvatarImage src={participant.profile?.avatar_url || undefined} className="object-cover" />
            <AvatarFallback className="text-3xl font-black bg-[#FFE600] text-black">
              {participant.profile?.username?.substring(0, 2).toUpperCase() || "US"}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Speaking Badge */}
      {isSpeaking && (
        <div className="absolute top-3 right-3 bg-[#22c55e] text-black font-black text-[11px] px-2.5 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-1.5 animate-pulse uppercase tracking-wider z-20">
          <span className="w-2 h-2 rounded-full bg-black animate-ping" />
          <span>Hablando</span>
        </div>
      )}

      {/* Name & Mic Status Badge */}
      <div className="absolute bottom-3 left-3 bg-white text-black font-black text-xs px-3 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] flex items-center gap-2 uppercase tracking-wide z-20 max-w-[85%]">
        {participant.is_muted ? (
          <MicOff className="w-3.5 h-3.5 text-[#EF4444] stroke-[3]" />
        ) : (
          <Mic className="w-3.5 h-3.5 text-black stroke-[3]" />
        )}
        <span className="truncate">
          {isLocal ? "TÃº" : (participant.profile?.username || participant.profile?.nombre || "Usuario")}
        </span>
      </div>
    </div>
  );
}

// â•â•â• Small Participant Tile for Screen Share sidebar â•â•â•
function SmallTile({
  participant,
  stream,
  isSpeaking,
  isVideoEnabled,
  isLocal
}: {
  participant: DiscordVoiceParticipant;
  stream?: MediaStream | null;
  isSpeaking: boolean;
  isVideoEnabled?: boolean;
  isLocal: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [, setTrackUpdate] = useState(0);

  const videoTracks = stream ? stream.getVideoTracks() : [];
  const hasLiveVideo = videoTracks.some(t => t.readyState === 'live');
  const showVideo = Boolean(videoTracks.length > 0 && (isVideoEnabled || hasLiveVideo));

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!stream || !showVideo) {
      el.srcObject = null;
      return;
    }
    if (el.srcObject !== stream) el.srcObject = stream;
    el.play().catch(() => {});
  }, [stream, showVideo]);

  useEffect(() => {
    if (!stream) return;
    const onTrackChange = () => setTrackUpdate(n => n + 1);
    stream.addEventListener('addtrack', onTrackChange);
    stream.addEventListener('removetrack', onTrackChange);
    return () => {
      stream.removeEventListener('addtrack', onTrackChange);
      stream.removeEventListener('removetrack', onTrackChange);
    };
  }, [stream]);

  return (
    <div className={cn(
      "w-36 md:w-full aspect-video bg-card rounded-xl overflow-hidden relative border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0 transition-transform",
      isSpeaking ? "ring-3 ring-[#22c55e]" : ""
    )}>
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn("w-full h-full object-cover", !showVideo && "hidden")}
        />
      )}
      {!showVideo && (
        <Avatar className="w-10 h-10 border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
          <AvatarImage src={participant.profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xs font-black bg-[#FFE600] text-black">
            {participant.profile?.username?.substring(0, 2).toUpperCase() || "US"}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="absolute bottom-1 left-1 bg-white text-black font-black text-[10px] px-1.5 py-0.5 rounded border border-black truncate max-w-[90%]">
        {isLocal ? "TÃº" : (participant.profile?.username || "Usuario")}
      </div>
    </div>
  );
}

// â•â•â• Screen Share Tile â•â•â•
function ScreenShareTile({ stream, isLocal = false }: { stream?: MediaStream | null; isLocal?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [, setTrackVersion] = useState(0);

  // Escuchar adiciÃ³n dinÃ¡mica de tracks de video
  useEffect(() => {
    if (!stream) return;
    const handleTrackChange = () => setTrackVersion(v => v + 1);
    stream.addEventListener('addtrack', handleTrackChange);
    stream.addEventListener('removetrack', handleTrackChange);
    return () => {
      stream.removeEventListener('addtrack', handleTrackChange);
      stream.removeEventListener('removetrack', handleTrackChange);
    };
  }, [stream]);

  const hasVideoTracks = Boolean(stream && stream.getVideoTracks().length > 0);

  useEffect(() => {
    const el = videoRef.current;
    if (el && stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.play().catch(() => {});
    }
  }, [stream, hasVideoTracks]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {!hasVideoTracks && (
        <div className="absolute inset-0 z-10 text-center text-muted-foreground animate-pulse w-full h-full flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center mb-3">
            <Monitor className="w-8 h-8 text-white opacity-60 stroke-[2.5]" />
          </div>
          <p className="text-sm font-black uppercase text-white tracking-wider">Conectando pantalla compartida...</p>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn(
          "w-full h-full object-contain",
          !hasVideoTracks && "opacity-0"
        )}
      />
    </div>
  );
}

// â•â•â• Comic Control Button â•â•â•
function ComicControlBtn({
  icon: Icon,
  active,
  onClick,
  tooltip,
  variant = "neutral"
}: {
  icon: any;
  active?: boolean;
  onClick: () => void;
  tooltip: string;
  variant?: "yellow" | "cyan" | "purple" | "danger" | "neutral";
}) {
  const colorStyles = {
    yellow: "bg-[#FFE600] text-black hover:bg-yellow-400",
    cyan: "bg-[#06B6D4] text-black hover:bg-cyan-400",
    purple: "bg-[#8B5CF6] text-white hover:bg-purple-600",
    danger: "bg-[#EF4444] text-white hover:bg-red-600",
    neutral: "bg-muted text-foreground hover:bg-muted/80",
  }[variant];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:-translate-y-0.5 transition-all",
            colorStyles
          )}
        >
          <Icon className="w-5 h-5 stroke-[2.5]" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="font-bold border-2 border-black shadow-[2px_2px_0px_#000]">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}





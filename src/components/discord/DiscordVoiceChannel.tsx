import { useRef, useEffect } from "react";
import { Volume2, Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, MonitorOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import type { DiscordChannel, DiscordVoiceParticipant } from "@/hooks/useDiscord";

interface DiscordVoiceChannelProps {
  channel: DiscordChannel;
  voiceParticipants?: DiscordVoiceParticipant[]; // Rename to voiceParticipants to match Discord.tsx usage, or keep participants
  participants?: DiscordVoiceParticipant[]; // fallback
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  speakingUsers: Set<string>;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  isDeafened: boolean; // Added prop
  // localUserId removed from prop if using useAuth inside, but Discord.tsx doesn't pass it yet effectively 
  // Let's rely on useAuth for localUserId
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeaveChannel: () => void; // Renamed to match Discord.tsx
}

export function DiscordVoiceChannel({
  channel,
  voiceParticipants,
  participants, // fallback
  localStream,
  remoteStreams,
  speakingUsers,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  isDeafened,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeaveChannel,
}: DiscordVoiceChannelProps) {
  const { user } = useAuth();
  const localUserId = user?.id || "";

  // Normalize participants
  const activeParticipants = voiceParticipants || participants || [];

  // Find screen sharer
  const screenSharer = activeParticipants.find(p => p.is_screen_sharing);

  // Theme: Deep Blue
  // Main BG: bg-background (since main container is bg-background)
  // But we want separate look for voice area? No, user wants consistency.
  // We'll use bg-transparent to let radial gradient show through, or bg-black/40 for overlay.

  return (
    <div className="flex-1 flex flex-col bg-transparent relative z-10 h-full">
      {/* Header */}
      <div className="h-12 px-4 flex items-center border-b border-border bg-background/95 backdrop-blur shrink-0 transition-colors">
        <Volume2 className="w-5 h-5 text-muted-foreground mr-2" />
        <span className="font-bold text-foreground text-[15px]">{channel.name}</span>
        <div className="w-px h-6 bg-border mx-3" />
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-muted-foreground font-medium">
            {activeParticipants.length} {activeParticipants.length === 1 ? "conectado" : "conectados"}
          </span>
        </div>
      </div>

      {/* Main video area */}
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        {screenSharer ? (
          // Screen share mode
          <div className="w-full h-full flex gap-4">
            {/* Main screen share */}
            <div className="flex-1 bg-black/80 rounded-xl overflow-hidden relative flex items-center justify-center border border-border/50 shadow-2xl">
              {screenSharer.user_id === localUserId ? (
                <div className="text-center text-muted-foreground animate-pulse">
                  <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-xl font-bold font-orbitron text-primary">Estás compartiendo tu pantalla</p>
                </div>
              ) : (
                <VideoTile
                  participant={screenSharer}
                  stream={remoteStreams.get(screenSharer.user_id)}
                  isSpeaking={false}
                  isLocal={false}
                  isScreenShare
                />
              )}
              <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur px-4 py-1.5 rounded-full text-foreground text-sm font-medium border border-border shadow-lg flex items-center gap-2">
                <Monitor className="w-4 h-4 text-primary" />
                Pantalla de {screenSharer.profile?.nombre || "Usuario"}
              </div>
            </div>

            {/* Small participant tiles */}
            <div className="w-60 flex flex-col gap-3 overflow-y-auto pr-1 discord-scrollbar">
              {activeParticipants.map(p => (
                <SmallTile
                  key={p.id}
                  participant={p}
                  stream={p.user_id === localUserId ? localStream : remoteStreams.get(p.user_id)}
                  isSpeaking={speakingUsers.has(p.user_id)}
                  isLocal={p.user_id === localUserId}
                  isVideoEnabled={p.user_id === localUserId ? isVideoEnabled : p.is_camera_on} // Use is_camera_on from DB or local state
                />
              ))}
            </div>
          </div>
        ) : (
          // Normal video grid
          <div className={cn(
            "grid gap-4 w-full h-full place-items-center transition-all duration-300",
            activeParticipants.length <= 1 && "grid-cols-1 max-w-3xl max-h-[600px]",
            activeParticipants.length === 2 && "grid-cols-2 max-h-[500px]",
            activeParticipants.length >= 3 && activeParticipants.length <= 4 && "grid-cols-2 grid-rows-2",
            activeParticipants.length > 4 && "grid-cols-3 grid-rows-2"
          )}>
            {activeParticipants.map(p => (
              <VideoTile
                key={p.id}
                participant={p}
                stream={p.user_id === localUserId ? localStream : remoteStreams.get(p.user_id)}
                isSpeaking={speakingUsers.has(p.user_id)}
                isLocal={p.user_id === localUserId}
                isVideoEnabled={p.user_id === localUserId ? isVideoEnabled : p.is_camera_on}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="h-20 bg-background/95 backdrop-blur border-t border-border flex items-center justify-center gap-4 relative z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.2)]">
        <ControlBtn
          icon={isAudioEnabled ? Mic : MicOff}
          active={!isAudioEnabled}
          onClick={onToggleAudio}
          tooltip={isAudioEnabled ? "Silenciar" : "Activar micrófono"}
          variant={!isAudioEnabled ? "destructive" : "secondary"}
        />

        <ControlBtn
          icon={isVideoEnabled ? Video : VideoOff}
          active={!isVideoEnabled}
          onClick={onToggleVideo}
          tooltip={isVideoEnabled ? "Desactivar cámara" : "Activar cámara"}
          variant={!isVideoEnabled ? "destructive" : "secondary"}
        />

        <ControlBtn
          icon={isScreenSharing ? MonitorOff : Monitor}
          active={isScreenSharing}
          onClick={onToggleScreenShare}
          tooltip={isScreenSharing ? "Dejar de compartir" : "Compartir pantalla"}
          variant={isScreenSharing ? "active" : "secondary"}
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onLeaveChannel}
              className="ml-4 px-5 h-12 rounded-full flex items-center gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-200 shadow-lg shadow-destructive/20 hover:-translate-y-1 font-medium text-sm"
            >
              <PhoneOff className="w-5 h-5" />
              <span>Desconectar</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>Salir del canal de voz</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// Subcomponents
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

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={cn(
      "relative bg-card rounded-xl overflow-hidden w-full h-full flex items-center justify-center transition-all duration-300 shadow-xl border border-border group",
      isSpeaking && "ring-2 ring-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]",
      !isScreenShare && "aspect-video max-h-full"
    )}>
      <video
        ref={videoRef}
        autoPlay
        // Always mute video element because AudioRenderer handles sound
        muted={true}
        playsInline
        className={cn("w-full h-full object-cover", isLocal && "scale-x-[-1]", (!isVideoEnabled || !stream) && "hidden")}
      />
      {(!isVideoEnabled || !stream) && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
          <Avatar className={cn(
            "transition-all duration-300 ring-4 ring-transparent",
            isSpeaking ? "w-32 h-32 ring-green-500/50 scale-110" : "w-24 h-24",
            isScreenShare && "w-16 h-16"
          )}>
            <AvatarImage src={participant.profile?.avatar_url || undefined} />
            <AvatarFallback className="text-3xl bg-primary text-primary-foreground font-bold">
              {participant.profile?.username?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Overlays */}
      <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1.5 rounded-full text-white text-sm font-medium flex items-center gap-2 backdrop-blur-sm border border-white/10">
        {isSpeaking ? (
          <Volume2 className="w-4 h-4 text-green-400 animate-pulse" />
        ) : participant.is_muted ? (
          <MicOff className="w-4 h-4 text-red-400" />
        ) : (
          <Mic className="w-4 h-4 text-gray-300" />
        )}
        <span className="max-w-[120px] truncate drop-shadow-md">
          {isLocal ? "Tú" : (participant.profile?.username || "Usuario")}
        </span>
      </div>

      {/* Speaking Visualizer (Sound Waves) */}
      {isSpeaking && (
        <div className="absolute top-3 right-3 discord-sound-wave">
          <div className="bar" />
          <div className="bar" />
          <div className="bar" />
        </div>
      )}
    </div>
  );
}

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

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={cn(
      "aspect-video bg-card rounded-lg overflow-hidden relative border border-border shadow-md transition-all hover:scale-105 cursor-pointer",
      isSpeaking && "ring-2 ring-green-500"
    )}>
      <video
        ref={videoRef}
        autoPlay
        muted={true}
        className={cn("w-full h-full object-cover", (!isVideoEnabled || !stream) && "hidden")}
      />
      {(!isVideoEnabled || !stream) && (
        <div className="w-full h-full flex items-center justify-center bg-muted/30">
          <Avatar className="w-10 h-10">
            <AvatarImage src={participant.profile?.avatar_url || undefined} />
            <AvatarFallback>{participant.profile?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
      )}
    </div>
  );
}

function ControlBtn({
  icon: Icon,
  active,
  onClick,
  tooltip,
  variant = "secondary",
  className
}: any) {
  // define variants
  const variants: any = {
    secondary: "bg-muted text-foreground hover:bg-muted/80 hover:text-primary hover:-translate-y-1",
    active: "bg-white text-black hover:bg-gray-200",
    destructive: "bg-white text-black hover:bg-gray-200 relative overflow-hidden", // White like Discord mute? No, user wants theme. Discord uses white with red slash or just white button for active.
    // Let's stick to App Theme:
    // Active (Muted/Off) -> Destructive Red? Or just White? Discord uses White button with internal strikethrough.
    // I'll use: Mute -> White bg + Black icon + Strikethrough?
    "danger-solid": "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:-translate-y-1 shadow-lg shadow-destructive/20"
  };

  // If active=true (e.g. isMuted), use white style
  const finalClass = variant === 'destructive'
    ? "bg-white text-black hover:bg-gray-200"
    : variants[variant];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-md",
            finalClass,
            className
          )}
        >
          <Icon className={cn("w-6 h-6", variant === 'secondary' && "text-foreground")} />
          {variant === 'destructive' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-0.5 bg-red-600 rotate-45 rounded-full" />
            </div>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

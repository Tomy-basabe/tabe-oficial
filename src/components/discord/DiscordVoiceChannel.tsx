import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Video, VideoOff, Monitor } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DiscordChannel, DiscordVoiceParticipant } from "@/hooks/useDiscord";

interface DiscordVoiceChannelProps {
  channel: DiscordChannel;
  participants: DiscordVoiceParticipant[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  speakingUsers: Set<string>;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  localUserId: string | null;
}

export function DiscordVoiceChannel({
  channel,
  participants,
  localStream,
  remoteStreams,
  speakingUsers,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  localUserId,
}: DiscordVoiceChannelProps) {
  const totalParticipants = participants.length;
  
  const getGridClass = () => {
    if (totalParticipants <= 1) return "grid-cols-1";
    if (totalParticipants <= 2) return "grid-cols-2";
    if (totalParticipants <= 4) return "grid-cols-2";
    if (totalParticipants <= 6) return "grid-cols-3";
    if (totalParticipants <= 9) return "grid-cols-3";
    return "grid-cols-4";
  };

  return (
    <div className="flex-1 bg-[#1e1f22] p-4">
      <div className={cn("grid gap-4 h-full", getGridClass())}>
        {participants.map((participant) => {
          const isLocal = !!localUserId && participant.user_id === localUserId;
          const stream = isLocal ? localStream : remoteStreams.get(participant.user_id) || null;

          return (
            <VoiceTile
              key={participant.id}
              participant={participant}
              stream={stream}
              isSpeaking={speakingUsers.has(participant.user_id)}
              isLocal={isLocal}
              localVideoEnabled={isLocal ? isVideoEnabled : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

function VoiceTile({
  participant,
  stream,
  isSpeaking,
  isLocal,
  localVideoEnabled,
}: {
  participant: DiscordVoiceParticipant;
  stream: MediaStream | null;
  isSpeaking: boolean;
  isLocal: boolean;
  localVideoEnabled?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);

  // For the LOCAL user, use the local React state (instant) instead of the DB flag (has latency).
  // For REMOTE users, use the DB flag since that's all we have.
  const hasVideoTracks = !!(stream && stream.getVideoTracks().some(t => t.readyState === "live" && t.enabled));
  const hasVideo = isLocal
    ? (localVideoEnabled === true && hasVideoTracks)
    : (participant.is_camera_on && hasVideoTracks);

  const hasAudio = !!(stream && stream.getAudioTracks().length > 0);
  const displayName = participant.profile?.nombre || participant.profile?.username || "Usuario";

  // Use a ref callback for the video element.
  // This ensures srcObject is assigned the INSTANT the <video> DOM node mounts,
  // even if the stream reference hasn't changed (which would prevent useEffect from firing).
  const videoRefCallback = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el && stream) {
        if (el.srcObject !== stream) {
          el.srcObject = stream;
          // Ensure playback starts (some browsers block autoplay silently)
          el.play().catch(() => {});
        }
      }
    },
    [stream]
  );

  // Also update srcObject when stream changes on an already-mounted video
  // (e.g., remote stream arriving while video element is already visible)
  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden bg-[#2b2d31] transition-all duration-200",
        isSpeaking && "discord-speaking-ring"
      )}
    >
      {hasVideo || participant.is_screen_sharing ? (
        <video
          ref={videoRefCallback}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn(
            "w-full h-full object-cover",
            isLocal && !participant.is_screen_sharing && "transform scale-x-[-1]"
          )}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#2b2d31]">
          {hasAudio && (
            <audio
              ref={audioRef}
              autoPlay
              playsInline
              muted={isLocal}
              className="hidden"
            />
          )}
          <Avatar className={cn(
            "w-24 h-24 transition-all duration-200",
            isSpeaking && "ring-4 ring-[#23a559] ring-offset-2 ring-offset-[#2b2d31]"
          )}>
            <AvatarImage src={participant.profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-[#5865f2] text-white text-3xl">
              {displayName[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Overlay with user info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-medium transition-colors duration-200",
              isSpeaking ? "text-[#23a559]" : "text-white"
            )}>
              {isLocal ? "Tú" : displayName}
            </span>
            {participant.is_screen_sharing && (
              <div className="px-1.5 py-0.5 bg-[#23a559] rounded text-[10px] text-white font-medium">
                COMPARTIENDO
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {participant.is_screen_sharing && (
              <div className="p-1 rounded bg-[#23a559]">
                <Monitor className="w-3 h-3 text-white" />
              </div>
            )}
            <div className={cn(
              "p-1 rounded",
              participant.is_muted ? "bg-[#ed4245]" : "bg-white/20"
            )}>
              {participant.is_muted ? (
                <MicOff className="w-3 h-3 text-white" />
              ) : (
                <Mic className="w-3 h-3 text-white" />
              )}
            </div>
            <div className={cn(
              "p-1 rounded",
              !participant.is_camera_on ? "bg-[#ed4245]" : "bg-white/20"
            )}>
              {participant.is_camera_on ? (
                <Video className="w-3 h-3 text-white" />
              ) : (
                <VideoOff className="w-3 h-3 text-white" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Speaking glow animation - Discord style */}
      {isSpeaking && (
        <div className="absolute inset-0 pointer-events-none rounded-lg discord-speaking-glow" />
      )}
    </div>
  );
}

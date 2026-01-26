import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Video, VideoOff, Monitor, User } from "lucide-react";
import type { RoomParticipant } from "@/hooks/useStudyRoom";

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  participants: RoomParticipant[];
  currentUserId: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
}

function VideoTile({
  stream,
  participant,
  isLocal,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  muted,
}: {
  stream: MediaStream | null;
  participant?: RoomParticipant;
  isLocal?: boolean;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing?: boolean;
  muted?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const displayName = participant?.profile?.nombre || participant?.profile?.username || "Usuario";
  const hasVideo = stream && stream.getVideoTracks().length > 0 && isVideoEnabled;

  return (
    <div className="relative aspect-video bg-card/50 rounded-xl overflow-hidden border border-border/50 group">
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={cn(
            "w-full h-full object-cover",
            isLocal && !isScreenSharing && "transform scale-x-[-1]"
          )}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-10 h-10 text-primary" />
          </div>
        </div>
      )}

      {/* Overlay with participant info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-medium truncate">
            {isLocal ? "Tú" : displayName}
            {isScreenSharing && " (Pantalla)"}
          </span>
          <div className="flex items-center gap-2">
            {isScreenSharing && (
              <div className="p-1 rounded-full bg-primary/80">
                <Monitor className="w-3 h-3 text-white" />
              </div>
            )}
            <div className={cn(
              "p-1 rounded-full",
              isAudioEnabled ? "bg-white/20" : "bg-destructive/80"
            )}>
              {isAudioEnabled ? (
                <Mic className="w-3 h-3 text-white" />
              ) : (
                <MicOff className="w-3 h-3 text-white" />
              )}
            </div>
            <div className={cn(
              "p-1 rounded-full",
              isVideoEnabled ? "bg-white/20" : "bg-destructive/80"
            )}>
              {isVideoEnabled ? (
                <Video className="w-3 h-3 text-white" />
              ) : (
                <VideoOff className="w-3 h-3 text-white" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VideoGrid({
  localStream,
  remoteStreams,
  participants,
  currentUserId,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
}: VideoGridProps) {
  const totalParticipants = remoteStreams.size + 1;
  
  const gridCols = totalParticipants <= 1 
    ? "grid-cols-1" 
    : totalParticipants <= 2 
    ? "grid-cols-1 md:grid-cols-2" 
    : totalParticipants <= 4 
    ? "grid-cols-2" 
    : "grid-cols-2 md:grid-cols-3";

  const myParticipant = participants.find(p => p.user_id === currentUserId);

  return (
    <div className={cn("grid gap-4 p-4 flex-1", gridCols)}>
      {/* Local video */}
      <VideoTile
        stream={localStream}
        participant={myParticipant}
        isLocal
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
        isScreenSharing={isScreenSharing}
        muted
      />

      {/* Remote videos */}
      {Array.from(remoteStreams.entries()).map(([peerId, stream]) => {
        const participant = participants.find(p => p.user_id === peerId);
        return (
          <VideoTile
            key={peerId}
            stream={stream}
            participant={participant}
            isVideoEnabled={!participant?.is_camera_off}
            isAudioEnabled={!participant?.is_muted}
            isScreenSharing={participant?.is_sharing_screen}
          />
        );
      })}
    </div>
  );
}

import React, { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDiscordVoice } from "@/contexts/DiscordVoiceContext";
import { TabeTalkRoom, type ParticipantState } from "./TabeTalkRoom";
import type { DiscordChannel, DiscordVoiceParticipant } from "@/hooks/useDiscord";
import type { CameraDevice, RemoteMediaState } from "@/hooks/useRobustDiscord";

export interface DiscordVoiceChannelProps {
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
  onToggleDeafen?: () => void;
  onLeaveChannel: () => void;
  onSwitchCamera?: (deviceId: string) => void;
  onSwitchMic?: (deviceId: string) => void;
  screenStream?: MediaStream | null;
  remoteScreenStreams?: Map<string, MediaStream>;
  remoteMediaStates?: Map<string, RemoteMediaState>;
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
  selectedCameraId = "",
  mics = [],
  selectedMicId = "",
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleDeafen,
  onLeaveChannel,
  onSwitchCamera,
  onSwitchMic,
  screenStream,
  remoteScreenStreams = new Map(),
  remoteMediaStates = new Map(),
}: DiscordVoiceChannelProps) {
  const { user } = useAuth();
  const discordVoice = useDiscordVoice();
  const localUserId = user?.id || "";

  // Acción para ensordecer (fallback a contexto si no viene en props)
  const handleToggleDeafen = onToggleDeafen || discordVoice?.toggleDeafen || (() => {});

  // Normalizar lista de participantes de DB
  const dbParticipants = voiceParticipants || participants || [];

  // 1. Participante local
  const localParticipantState: ParticipantState = useMemo(() => {
    const dbEntry = dbParticipants.find((p) => p.user_id === localUserId);
    const meta = (user?.user_metadata as any) || {};
    const displayName =
      dbEntry?.profile?.nombre ||
      dbEntry?.profile?.username ||
      meta.nombre ||
      meta.full_name ||
      meta.username ||
      "Tú";

    return {
      userId: localUserId,
      displayName,
      avatarUrl: dbEntry?.profile?.avatar_url || meta.avatar_url || null,
      isLocal: true,
      stream: localStream,
      isMuted: !isAudioEnabled || isDeafened,
      isVideoOff: !isVideoEnabled,
      isDeafened,
      isScreenSharing,
      isSpeaking: speakingUsers.has(localUserId),
    };
  }, [
    dbParticipants,
    localUserId,
    user?.user_metadata,
    localStream,
    isAudioEnabled,
    isDeafened,
    isVideoEnabled,
    isScreenSharing,
    speakingUsers,
  ]);

  // 2. Todos los participantes unificados
  const allParticipants: ParticipantState[] = useMemo(() => {
    const map = new Map<string, ParticipantState>();

    // Añadir participantes que están en la base de datos
    dbParticipants.forEach((p) => {
      if (p.user_id === localUserId) return;
      const mediaState = remoteMediaStates.get(p.user_id);
      const isPeerMuted =
        mediaState?.isMuted !== undefined
          ? mediaState.isMuted
          : mediaState?.isAudioEnabled !== undefined
          ? !mediaState.isAudioEnabled
          : p.is_muted;

      const isPeerVideoOff =
        mediaState?.isVideoOff !== undefined
          ? mediaState.isVideoOff
          : mediaState?.isCameraOn !== undefined
          ? !mediaState.isCameraOn
          : !p.is_camera_on;

      const isPeerDeafened =
        mediaState?.isDeafened !== undefined ? mediaState.isDeafened : Boolean(p.is_deafened);

      const isPeerSharing =
        mediaState?.isScreenSharing !== undefined
          ? mediaState.isScreenSharing
          : Boolean(p.is_screen_sharing);

      map.set(p.user_id, {
        userId: p.user_id,
        displayName: p.profile?.nombre || p.profile?.username || "Compañero",
        avatarUrl: p.profile?.avatar_url || null,
        isLocal: false,
        stream: remoteStreams.get(p.user_id) || null,
        isMuted: Boolean(isPeerMuted),
        isVideoOff: Boolean(isPeerVideoOff),
        isDeafened: isPeerDeafened,
        isScreenSharing: isPeerSharing,
        isSpeaking: speakingUsers.has(p.user_id),
      });
    });

    // Añadir peers que tienen stream activo pero no estaban en DB
    remoteStreams.forEach((stream, peerId) => {
      if (peerId === localUserId || map.has(peerId)) return;
      const mediaState = remoteMediaStates.get(peerId);
      map.set(peerId, {
        userId: peerId,
        displayName: "Compañero",
        avatarUrl: null,
        isLocal: false,
        stream,
        isMuted: mediaState?.isMuted ?? (mediaState?.isAudioEnabled === false),
        isVideoOff: mediaState?.isVideoOff ?? (mediaState?.isCameraOn === false),
        isDeafened: Boolean(mediaState?.isDeafened),
        isScreenSharing: Boolean(mediaState?.isScreenSharing),
        isSpeaking: speakingUsers.has(peerId),
      });
    });

    // Añadir peers de remoteMediaStates si aún no estaban
    remoteMediaStates.forEach((mediaState, peerId) => {
      if (peerId === localUserId || map.has(peerId)) return;
      map.set(peerId, {
        userId: peerId,
        displayName: "Compañero",
        avatarUrl: null,
        isLocal: false,
        stream: remoteStreams.get(peerId) || null,
        isMuted: mediaState.isMuted,
        isVideoOff: mediaState.isVideoOff,
        isDeafened: mediaState.isDeafened,
        isScreenSharing: mediaState.isScreenSharing,
        isSpeaking: speakingUsers.has(peerId),
      });
    });

    // Retornar participante local primero, seguido por los remotos
    return [localParticipantState, ...Array.from(map.values())];
  }, [
    dbParticipants,
    localUserId,
    remoteMediaStates,
    remoteStreams,
    speakingUsers,
    localParticipantState,
  ]);

  // 3. Determinar emisor de pantalla compartida si existe
  const activeScreenSharer = useMemo(() => {
    if (isScreenSharing && screenStream) {
      return localParticipantState;
    }
    const remoteSharer = allParticipants.find((p) => !p.isLocal && p.isScreenSharing);
    return remoteSharer || null;
  }, [isScreenSharing, screenStream, localParticipantState, allParticipants]);

  const activeScreenStream = useMemo(() => {
    if (isScreenSharing && screenStream) {
      return screenStream;
    }
    if (activeScreenSharer && !activeScreenSharer.isLocal) {
      return remoteScreenStreams.get(activeScreenSharer.userId) || remoteStreams.get(activeScreenSharer.userId) || null;
    }
    return null;
  }, [isScreenSharing, screenStream, activeScreenSharer, remoteScreenStreams, remoteStreams]);

  return (
    <TabeTalkRoom
      channelName={channel.name}
      participants={allParticipants}
      screenSharer={activeScreenSharer}
      screenStream={activeScreenStream}
      isMuted={!isAudioEnabled || isDeafened}
      isVideoOff={!isVideoEnabled}
      isDeafened={isDeafened}
      isScreenSharing={isScreenSharing}
      onToggleAudio={onToggleAudio}
      onToggleVideo={onToggleVideo}
      onToggleDeafen={handleToggleDeafen}
      onToggleScreenShare={onToggleScreenShare}
      onDisconnect={onLeaveChannel}
      cameras={cameras}
      selectedCameraId={selectedCameraId}
      onSwitchCamera={onSwitchCamera}
      mics={mics}
      selectedMicId={selectedMicId}
      onSwitchMic={onSwitchMic}
    />
  );
}

import React from "react";
import { useDiscordVoice } from "@/contexts/DiscordVoiceContext";
import { TabeTalkRoom, type ParticipantState } from "./TabeTalkRoom";
import type { DiscordChannel, DiscordVoiceParticipant } from "@/hooks/useDiscord";
import type { CameraDevice, RemoteMediaState } from "@/hooks/useRobustDiscord";

export type { ParticipantState };

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

export function DiscordVoiceChannel(props: DiscordVoiceChannelProps) {
  const voiceContext = useDiscordVoice();

  return (
    <TabeTalkRoom
      {...props}
      channel={props.channel}
      channelName={props.channel?.name || "Sala de Voz"}
      localStream={props.localStream ?? voiceContext?.localStream}
      remoteStreams={props.remoteStreams ?? voiceContext?.remoteStreams}
      screenStream={props.screenStream ?? voiceContext?.screenStream}
      remoteScreenStreams={props.remoteScreenStreams ?? voiceContext?.remoteScreenStreams}
      remoteMediaStates={props.remoteMediaStates ?? voiceContext?.remoteMediaStates}
      speakingUsers={props.speakingUsers ?? voiceContext?.speakingUsers}
      isAudioEnabled={props.isAudioEnabled ?? voiceContext?.isAudioEnabled}
      isVideoEnabled={props.isVideoEnabled ?? voiceContext?.isVideoEnabled}
      isScreenSharing={props.isScreenSharing ?? voiceContext?.isScreenSharing}
      isDeafened={props.isDeafened ?? voiceContext?.isDeafened}
      onToggleAudio={props.onToggleAudio || voiceContext?.toggleAudio}
      onToggleVideo={props.onToggleVideo || voiceContext?.toggleVideo}
      onToggleScreenShare={props.onToggleScreenShare}
      onToggleDeafen={props.onToggleDeafen || voiceContext?.toggleDeafen}
      onLeaveChannel={props.onLeaveChannel || voiceContext?.leaveVoiceChannel}
      onDisconnect={props.onLeaveChannel || voiceContext?.leaveVoiceChannel}
      cameras={props.cameras && props.cameras.length > 0 ? props.cameras : voiceContext?.cameras}
      selectedCameraId={props.selectedCameraId || voiceContext?.selectedCameraId}
      onSwitchCamera={props.onSwitchCamera || voiceContext?.switchCamera}
      mics={props.mics && props.mics.length > 0 ? props.mics : voiceContext?.mics}
      selectedMicId={props.selectedMicId || voiceContext?.selectedMicId}
      onSwitchMic={props.onSwitchMic || voiceContext?.switchMic}
    />
  );
}

import { createContext, useContext, ReactNode } from "react";
import { useDiscord } from "@/hooks/useDiscord";
import { useRobustDiscord } from "@/hooks/useRobustDiscord";
import { DiscordAudioRenderer } from "@/components/discord/DiscordAudioRenderer";
import { DiscordDebugPanel } from "@/components/discord/DiscordDebugPanel";

const DiscordVoiceContext = createContext<any>(null);

export function DiscordVoiceProvider({ children }: { children: ReactNode }) {
    const discord = useDiscord();

    // Activate voice based on currentVoiceChannel (persistent) or currentChannel if it's voice
    const activeVoiceChannel = discord.currentVoiceChannel || (discord.currentChannel?.type === 'voice' ? discord.currentChannel : null);
    const voiceChannelId = activeVoiceChannel ? activeVoiceChannel.id : null;
    const voice = useRobustDiscord({ channelId: voiceChannelId });

    // Merge: discord provides data (servers, channels, messages, participants)
    //        voice provides media (streams, toggle functions)
    const combinedValue = {
        ...discord,
        currentVoiceChannel: activeVoiceChannel,
        // Override media-related properties with robust hook values
        localStream: voice.localStream,
        remoteStreams: voice.remoteStreams,
        isAudioEnabled: voice.isAudioEnabled,
        isVideoEnabled: voice.isVideoEnabled,
        isScreenSharing: voice.isScreenSharing,
        toggleAudio: voice.toggleAudio,
        toggleVideo: voice.toggleVideo,
        startScreenShare: voice.startScreenShare,
        stopScreenShare: voice.stopScreenShare,
        screenStream: voice.screenStream,
        remoteScreenStreams: voice.remoteScreenStreams,
        peerStates: voice.peerStates,
        cameras: voice.cameras,
        selectedCameraId: voice.selectedCameraId,
        switchCamera: voice.switchCamera,
        mics: voice.mics,
        selectedMicId: voice.selectedMicId,
        switchMic: voice.switchMic,
        speakingUsers: voice.speakingUsers && voice.speakingUsers.size > 0 ? voice.speakingUsers : discord.speakingUsers,
        remoteMediaStates: voice.remoteMediaStates,
    };

    return (
        <DiscordVoiceContext.Provider value={combinedValue}>
            <DiscordAudioRenderer />
            <DiscordDebugPanel />
            {children}
        </DiscordVoiceContext.Provider>
    );
}

export function useDiscordVoice() {
    const context = useContext(DiscordVoiceContext);
    if (!context) {
        throw new Error("useDiscordVoice must be used within a DiscordVoiceProvider");
    }
    return context;
}


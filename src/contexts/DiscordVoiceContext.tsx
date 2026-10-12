import { createContext, useContext, ReactNode } from "react";
import { useDiscord } from "@/hooks/useDiscord";
import { useRobustDiscord } from "@/hooks/useRobustDiscord";
import { useLiveKitDiscord } from "@/hooks/useLiveKitDiscord";
import { DiscordAudioRenderer } from "@/components/discord/DiscordAudioRenderer";
import { DiscordDebugPanel } from "@/components/discord/DiscordDebugPanel";

const DiscordVoiceContext = createContext<any>(null);

export function DiscordVoiceProvider({ children }: { children: ReactNode }) {
    const discord = useDiscord();

    // Activate voice based on currentVoiceChannel (persistent) or currentChannel if it's voice
    const activeVoiceChannel = discord.currentVoiceChannel || (discord.currentChannel?.type === 'voice' ? discord.currentChannel : null);
    const voiceChannelId = activeVoiceChannel ? activeVoiceChannel.id : null;
    const liveKitVoice = useLiveKitDiscord({ channelId: voiceChannelId });
    const liveKitConfigured = liveKitVoice.enabled;
    const voice = useRobustDiscord({ channelId: liveKitConfigured ? null : voiceChannelId });
    const mediaVoice = liveKitVoice.enabled ? liveKitVoice : voice;

    // Merge: discord provides data (servers, channels, messages, participants)
    //        voice provides media (streams, toggle functions)
    const combinedValue = {
        ...discord,
        currentVoiceChannel: activeVoiceChannel,
        // Override media-related properties with robust hook values
        localStream: mediaVoice.localStream,
        remoteStreams: mediaVoice.remoteStreams,
        isAudioEnabled: mediaVoice.isAudioEnabled,
        isVideoEnabled: mediaVoice.isVideoEnabled,
        isScreenSharing: mediaVoice.isScreenSharing,
        toggleAudio: mediaVoice.toggleAudio,
        toggleVideo: mediaVoice.toggleVideo,
        startScreenShare: mediaVoice.startScreenShare,
        stopScreenShare: mediaVoice.stopScreenShare,
        screenStream: mediaVoice.screenStream,
        remoteScreenStreams: mediaVoice.remoteScreenStreams,
        peerStates: "peerStates" in mediaVoice ? mediaVoice.peerStates : new Map(),
        cameras: mediaVoice.cameras,
        selectedCameraId: mediaVoice.selectedCameraId,
        switchCamera: mediaVoice.switchCamera,
        mics: mediaVoice.mics,
        selectedMicId: mediaVoice.selectedMicId,
        switchMic: mediaVoice.switchMic,
        speakingUsers: mediaVoice.speakingUsers && mediaVoice.speakingUsers.size > 0 ? mediaVoice.speakingUsers : discord.speakingUsers,
        remoteMediaStates: mediaVoice.remoteMediaStates,
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


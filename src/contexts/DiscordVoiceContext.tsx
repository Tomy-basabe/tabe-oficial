import { createContext, useContext, ReactNode } from "react";
import { useDiscord } from "@/hooks/useDiscord";
import { useRobustDiscord } from "@/hooks/useRobustDiscord";
import { DiscordAudioRenderer } from "@/components/discord/DiscordAudioRenderer";
import { DiscordDebugPanel } from "@/components/discord/DiscordDebugPanel";

const DiscordVoiceContext = createContext<any>(null);

export function DiscordVoiceProvider({ children }: { children: ReactNode }) {
    const discord = useDiscord();

    // Only activate voice when user is viewing a voice channel
    const voiceChannelId = discord.currentChannel?.type === 'voice' ? discord.currentChannel.id : null;
    const voice = useRobustDiscord({ channelId: voiceChannelId });

    // Merge: discord provides data (servers, channels, messages, participants)
    //        voice provides media (streams, toggle functions)
    const combinedValue = {
        ...discord,
        // Override media-related properties with robust hook values
        localStream: voice.localStream,
        remoteStreams: voice.remoteStreams,
        isAudioEnabled: voice.isAudioEnabled,
        isVideoEnabled: voice.isVideoEnabled,
        toggleAudio: voice.toggleAudio,
        toggleVideo: voice.toggleVideo,
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

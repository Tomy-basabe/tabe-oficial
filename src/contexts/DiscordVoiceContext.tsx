import { createContext, useContext, ReactNode } from "react";
import { useDiscord } from "@/hooks/useDiscord";
import { useRobustDiscord } from "@/hooks/useRobustDiscord";
import { useLiveKitDiscord } from "@/hooks/useLiveKitDiscord";
import { DiscordAudioRenderer } from "@/components/discord/DiscordAudioRenderer";
import { DiscordDebugPanel } from "@/components/discord/DiscordDebugPanel";

const DiscordVoiceContext = createContext<any>(null);

export function DiscordVoiceProvider({ children }: { children: ReactNode }) {
    const discord = useDiscord();

    // Activar voz basado en currentVoiceChannel o canal actual de tipo 'voice'
    const activeVoiceChannel = discord.currentVoiceChannel || (discord.currentChannel?.type === "voice" ? discord.currentChannel : null);
    const voiceChannelId = activeVoiceChannel ? activeVoiceChannel.id : null;
    const liveKitVoice = useLiveKitDiscord({ channelId: voiceChannelId });
    const liveKitConfigured = Boolean((liveKitVoice as any)?.enabled);
    const voice = useRobustDiscord({ channelId: liveKitConfigured ? null : voiceChannelId });
    const mediaVoice = liveKitConfigured ? liveKitVoice : voice;

    // Merge de datos: servidor/mensajes/miembros + media reactiva de voz y video
    const combinedValue = {
        ...discord,
        currentVoiceChannel: activeVoiceChannel,
        // Override de propiedades de media
        localStream: mediaVoice.localStream,
        remoteStreams: mediaVoice.remoteStreams,
        isAudioEnabled: mediaVoice.isAudioEnabled,
        isVideoEnabled: mediaVoice.isVideoEnabled,
        isDeafened: "isDeafened" in mediaVoice ? mediaVoice.isDeafened : discord.isDeafened,
        isMuted: "isMuted" in mediaVoice ? mediaVoice.isMuted : !mediaVoice.isAudioEnabled,
        isVideoOff: "isVideoOff" in mediaVoice ? mediaVoice.isVideoOff : !mediaVoice.isVideoEnabled,
        isScreenSharing: mediaVoice.isScreenSharing,
        toggleAudio: mediaVoice.toggleAudio,
        toggleVideo: mediaVoice.toggleVideo,
        toggleDeafen: "toggleDeafen" in mediaVoice ? (mediaVoice as any).toggleDeafen : discord.toggleDeafen,
        startScreenShare: mediaVoice.startScreenShare,
        stopScreenShare: mediaVoice.stopScreenShare,
        screenStream: mediaVoice.screenStream,
        remoteScreenStreams: mediaVoice.remoteScreenStreams,
        peerStates: "peerStates" in mediaVoice ? (mediaVoice as any).peerStates : new Map(),
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

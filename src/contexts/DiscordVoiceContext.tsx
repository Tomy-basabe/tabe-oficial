import React, { createContext, useContext, ReactNode } from "react";
import { useDiscord } from "@/hooks/useDiscord";
import { useDiscordVideo } from "@/hooks/useDiscordVideo";
import { DiscordAudioRenderer } from "@/components/discord/DiscordAudioRenderer";
import { DiscordDebugPanel } from "@/components/discord/DiscordDebugPanel";

// Combine both hooks into one context value
type DiscordContextType = ReturnType<typeof useDiscord> & {
    video: ReturnType<typeof useDiscordVideo>;
};

const DiscordVoiceContext = createContext<DiscordContextType | undefined>(undefined);

export function DiscordVoiceProvider({ children }: { children: ReactNode }) {
    const discord = useDiscord();
    // Use the current channel ID from the main hook to initialize video
    const video = useDiscordVideo(discord.currentChannel?.id || null);

    const combinedValue = {
        ...discord,
        video
    };

    return (
        <DiscordVoiceContext.Provider value={combinedValue}>
            <DiscordAudioRenderer />
            <DiscordDebugPanel />
            {children}
        </DiscordVoiceContext.Provider>
    );
}

export function useDiscordVoice(): DiscordContextType {
    const context = useContext(DiscordVoiceContext);
    if (context === undefined) {
        throw new Error("useDiscordVoice must be used within a DiscordVoiceProvider");
    }
    return context;
}

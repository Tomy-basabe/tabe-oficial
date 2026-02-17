import React, { createContext, useContext, ReactNode } from "react";
import { useDiscord } from "@/hooks/useDiscord";
import { DiscordAudioRenderer } from "@/components/discord/DiscordAudioRenderer";
import { DiscordDebugPanel } from "@/components/discord/DiscordDebugPanel";

type DiscordContextType = ReturnType<typeof useDiscord>;

const DiscordVoiceContext = createContext<DiscordContextType | undefined>(undefined);

/**
 * DiscordVoiceProvider wraps the entire app so that the voice connection
 * (WebRTC, local stream, signaling) persists across page navigations.
 * Without this, navigating away from /discord unmounts the component and
 * kills the active call.
 */
export function DiscordVoiceProvider({ children }: { children: ReactNode }) {
    const discord = useDiscord();

    return (
        <DiscordVoiceContext.Provider value={discord}>
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

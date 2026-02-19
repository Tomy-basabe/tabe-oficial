import { useDiscordVoice } from "@/contexts/DiscordVoiceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function DiscordDebugPanel() {
    const { user } = useAuth(); // Need user to filter self
    const {
        remoteStreams,
        voiceParticipants,
        inVoiceChannel,
        currentChannel,
        peerStates
    } = useDiscordVoice();

    const [isVisible, setIsVisible] = useState(false);

    if (!inVoiceChannel) return null;

    return (
        <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
            <div className="pointer-events-auto">
                <Button
                    variant="outline"
                    size="sm"
                    className="bg-black/50 text-white text-xs"
                    onClick={() => setIsVisible(!isVisible)}
                >
                    {isVisible ? "Hide Debug" : "Show Debug"}
                </Button>
            </div>

            {isVisible && (
                <div className="bg-black/80 text-green-400 p-4 rounded-md w-64 text-xs font-mono overflow-y-auto max-h-64 pointer-events-auto border border-green-500/30 shadow-xl backdrop-blur-md">
                    <h3 className="font-bold border-b border-green-500/30 mb-2 pb-1">Audio Diagnostics</h3>

                    <div className="space-y-2">
                        <div>
                            <span className="text-white">Channel:</span> {currentChannel?.name} <span className="text-[10px] bg-red-900/50 px-1 rounded ml-1 text-red-300">v7.5</span>
                        </div>
                        <div>
                            <span className="text-white">Participants:</span> {voiceParticipants.length}
                        </div>
                        <div>
                            <span className="text-white">Remote Streams:</span> {remoteStreams.size}
                        </div>

                        <div className="border-t border-green-500/30 pt-2 mt-2">
                            <h4 className="text-white font-semibold mb-1">Peers & Connection:</h4>

                            <div className="mb-2 text-[10px] text-gray-400 break-all">
                                <div>Stream Keys: {Array.from(remoteStreams.keys()).join(", ")}</div>
                                <div>State Keys: {Array.from(peerStates.keys()).join(", ")}</div>
                            </div>

                            {voiceParticipants.filter(p => p.user_id !== user?.id).map(p => {
                                const stream = remoteStreams.get(p.user_id);
                                const status = peerStates.get(p.user_id) || "unknown";

                                return (
                                    <div key={p.user_id} className="mb-2 pl-2 border-l-2 border-green-500/50">
                                        <div className="text-[10px] text-gray-500">ID: {p.user_id}</div>
                                        <div>User: {p.profile?.username || p.user_id.substring(0, 8)}</div>
                                        <div className={status === "connected" ? "text-green-400" : "text-yellow-400"}>
                                            ICE Status: {status}
                                        </div>
                                        {stream ? (
                                            <>
                                                <div>Tracks: {stream.getTracks().length}</div>
                                                <div>Audio: {stream.getAudioTracks().length}</div>
                                                <div>Active: {stream.active ? "Yes" : "No"}</div>
                                            </>
                                        ) : (
                                            <div className="text-red-400">No Stream</div>
                                        )}
                                    </div>
                                );
                            })}
                            {voiceParticipants.length <= 1 && (
                                <div className="text-gray-400 italic">No other participants</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useDiscordVoice } from "@/contexts/DiscordVoiceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Mic, Video, HeadphoneOff, Monitor, Activity } from "lucide-react";

export function DiscordDebugPanel() {
    const { user } = useAuth();
    const {
        remoteStreams,
        voiceParticipants,
        inVoiceChannel,
        currentChannel,
        peerStates,
        remoteMediaStates,
        speakingUsers,
        isAudioEnabled,
        isVideoEnabled,
        isDeafened,
        isScreenSharing,
    } = useDiscordVoice();

    const [isVisible, setIsVisible] = useState(false);

    if (!inVoiceChannel) return null;

    // Disparar evento broadcast simulado en el canal de Supabase para prueba en vivo
    const triggerSimulatedEvent = (event: string, payload: any) => {
        window.dispatchEvent(
            new CustomEvent("tabetalk:simulated-event", {
                detail: { event, payload },
            })
        );
    };

    return (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="bg-zinc-950/90 text-emerald-400 border border-emerald-500/30 hover:bg-zinc-900 text-xs shadow-xl backdrop-blur-md flex items-center gap-1.5"
                    onClick={() => setIsVisible(!isVisible)}
                >
                    <Activity className="w-3.5 h-3.5" />
                    {isVisible ? "Ocultar Diagnóstico" : "Diagnóstico y Simulación"}
                </Button>
            </div>

            {isVisible && (
                <div className="bg-zinc-950/95 text-zinc-300 p-4 rounded-xl w-80 text-xs font-mono overflow-y-auto max-h-96 pointer-events-auto border border-zinc-800 shadow-2xl backdrop-blur-md space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <span className="font-bold text-white flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-emerald-400" /> Diagnóstico de Sala
                        </span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            WebRTC Mesh
                        </span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                        <div>
                            <span className="text-zinc-500">Canal:</span> <span className="text-white font-medium">{currentChannel?.name}</span>
                        </div>
                        <div>
                            <span className="text-zinc-500">Participantes DB:</span>{" "}
                            <span className="text-emerald-400 font-semibold">{voiceParticipants.length}</span>
                        </div>
                        <div>
                            <span className="text-zinc-500">Streams Remotos P2P:</span>{" "}
                            <span className="text-emerald-400 font-semibold">{remoteStreams.size}</span>
                        </div>
                        <div>
                            <span className="text-zinc-500">Estados Remotos:</span>{" "}
                            <span className="text-white">{remoteMediaStates.size} peers</span>
                        </div>
                    </div>

                    {/* Estado del usuario local */}
                    <div className="border-t border-zinc-800 pt-2 text-[11px] space-y-1">
                        <div className="text-zinc-400 font-semibold mb-1">Tu Estado Local:</div>
                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                            <span className={isAudioEnabled ? "text-emerald-400" : "text-red-400"}>
                                Mic: {isAudioEnabled ? "ON" : "MUTED"}
                            </span>
                            <span className={isVideoEnabled ? "text-emerald-400" : "text-zinc-500"}>
                                Cam: {isVideoEnabled ? "ON" : "OFF"}
                            </span>
                            <span className={isDeafened ? "text-red-400" : "text-zinc-500"}>
                                Ensordecido: {isDeafened ? "SÍ" : "NO"}
                            </span>
                            <span className={isScreenSharing ? "text-indigo-400" : "text-zinc-500"}>
                                Pantalla: {isScreenSharing ? "COMPARTIENDO" : "OFF"}
                            </span>
                        </div>
                    </div>

                    {/* Lista de conexiones WebRTC ICE */}
                    <div className="border-t border-zinc-800 pt-2">
                        <h4 className="text-zinc-400 font-semibold mb-1 text-[11px]">Conexiones P2P ICE:</h4>
                        {Array.from(peerStates.entries()).map(([peerId, status]: [string, any]) => (
                            <div key={peerId} className="flex items-center justify-between py-0.5 text-[10px] border-b border-zinc-900">
                                <span className="truncate max-w-[140px] text-zinc-400">{peerId.substring(0, 10)}...</span>
                                <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] ${
                                        status === "connected"
                                            ? "bg-emerald-500/20 text-emerald-400"
                                            : "bg-yellow-500/20 text-yellow-400"
                                    }`}
                                >
                                    {status}
                                </span>
                            </div>
                        ))}
                        {peerStates.size === 0 && (
                            <div className="text-zinc-500 italic text-[10px]">Esperando pares en la sala...</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

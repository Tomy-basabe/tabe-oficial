import { useEffect, useRef } from "react";
import { useDiscordVoice } from "@/contexts/DiscordVoiceContext";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

export function DiscordAudioRenderer() {
    const { remoteStreams, voiceParticipants } = useDiscordVoice();

    return (
        <div className="hidden">
            {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
                <AudioStream
                    key={peerId}
                    peerId={peerId}
                    stream={stream}
                // Find participant to check if they are locally muted (optional feature for later)
                />
            ))}
        </div>
    );
}

function AudioStream({ peerId, stream }: { peerId: string; stream: MediaStream }) {
    const { toast } = useToast();
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (audioRef.current && stream) {
            console.log(`[DiscordAudio] Attaching stream ${peerId}`, stream.getAudioTracks());
            audioRef.current.srcObject = stream;

            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.error(`[DiscordAudio] Autoplay failed for peer ${peerId}:`, e);
                    toast({
                        title: "Audio bloqueado",
                        description: "Hacé click aquí para activar el sonido",
                        action: (
                            <ToastAction altText="Activar" onClick={() => audioRef.current?.play()}>
                                Activar
                            </ToastAction>
                        ),
                        duration: 10000,
                    });
                });
            }
        }
    }, [stream, peerId, toast]);

    return (
        <audio
            ref={audioRef}
            autoPlay
            playsInline
            controls={false}
            // Ensure we don't mute remote streams
            muted={false}
        />
    );
}

import { useEffect, useRef } from "react";
import { useDiscordVoice } from "@/contexts/DiscordVoiceContext";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

export function DiscordAudioRenderer() {
    const { remoteStreams } = useDiscordVoice();

    // Desbloqueo global de audio con cualquier interacción del usuario (click, touch, keydown)
    useEffect(() => {
        const resumeAllAudio = () => {
            document.querySelectorAll("audio[data-tabetalk-audio='true']").forEach((el: any) => {
                if (el && el.paused && el.srcObject) {
                    el.play().catch(() => {});
                }
            });
        };

        window.addEventListener("click", resumeAllAudio, { passive: true });
        window.addEventListener("touchstart", resumeAllAudio, { passive: true });
        window.addEventListener("keydown", resumeAllAudio, { passive: true });

        return () => {
            window.removeEventListener("click", resumeAllAudio);
            window.removeEventListener("touchstart", resumeAllAudio);
            window.removeEventListener("keydown", resumeAllAudio);
        };
    }, []);

    return (
        <div className="sr-only" aria-hidden="true">
            {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
                <AudioStream
                    key={peerId}
                    peerId={peerId}
                    stream={stream}
                />
            ))}
        </div>
    );
}

function AudioStream({ peerId, stream }: { peerId: string; stream: MediaStream }) {
    const { toast } = useToast();
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const el = audioRef.current;
        if (!el || !stream) return;

        if (el.srcObject !== stream) {
            console.log(`[DiscordAudio] Attaching stream ${peerId}`, stream.getAudioTracks());
            el.srcObject = stream;
        }

        const tryPlay = () => {
            if (el.paused) {
                el.play().catch(e => {
                    console.warn(`[DiscordAudio] Autoplay pending interaction for peer ${peerId}:`, e.message);
                });
            }
        };

        tryPlay();

        // Escuchar si se agrega la pista de audio después de la conexión inicial
        stream.addEventListener('addtrack', tryPlay);

        return () => {
            stream.removeEventListener('addtrack', tryPlay);
        };
    }, [stream, peerId, toast]);

    return (
        <audio
            ref={audioRef}
            data-tabetalk-audio="true"
            autoPlay
            playsInline
            controls={false}
            muted={false}
        />
    );
}

import { useEffect, useRef, useState } from "react";
import { useDiscordVoice } from "@/contexts/DiscordVoiceContext";
import { Volume2 } from "lucide-react";

export function DiscordAudioRenderer() {
    const { remoteStreams, isDeafened } = useDiscordVoice();
    const [hasBlockedAutoplay, setHasBlockedAutoplay] = useState(false);

    // Desbloqueo universal de audio con cualquier gesto del usuario o cambio de visibilidad
    useEffect(() => {
        const resumeAllAudio = () => {
            let stillBlocked = false;
            document.querySelectorAll("audio[data-tabetalk-audio='true']").forEach((el: any) => {
                if (el && el.srcObject && !el.muted) {
                    const playPromise = el.play();
                    if (playPromise !== undefined) {
                        playPromise
                            .then(() => {
                                setHasBlockedAutoplay(false);
                            })
                            .catch(() => {
                                stillBlocked = true;
                            });
                    }
                }
            });
            if (stillBlocked) {
                setHasBlockedAutoplay(true);
            }
        };

        window.addEventListener("click", resumeAllAudio, { passive: true });
        window.addEventListener("touchstart", resumeAllAudio, { passive: true });
        window.addEventListener("pointerdown", resumeAllAudio, { passive: true });
        window.addEventListener("keydown", resumeAllAudio, { passive: true });
        window.addEventListener("focus", resumeAllAudio, { passive: true });
        document.addEventListener("visibilitychange", resumeAllAudio);

        return () => {
            window.removeEventListener("click", resumeAllAudio);
            window.removeEventListener("touchstart", resumeAllAudio);
            window.removeEventListener("pointerdown", resumeAllAudio);
            window.removeEventListener("keydown", resumeAllAudio);
            window.removeEventListener("focus", resumeAllAudio);
            document.removeEventListener("visibilitychange", resumeAllAudio);
        };
    }, []);

    const handleManualUnlock = () => {
        document.querySelectorAll("audio[data-tabetalk-audio='true']").forEach((el: any) => {
            if (el && el.srcObject) {
                el.play().catch(() => {});
            }
        });
        setHasBlockedAutoplay(false);
    };

    return (
        <>
            {/* Elementos de audio en segundo plano */}
            <div className="sr-only" aria-hidden="true">
                {Array.from(remoteStreams.entries()).map(([peerId, stream]: [string, any]) => (
                    <AudioStream
                        key={peerId}
                        peerId={peerId}
                        stream={stream}
                        isDeafened={Boolean(isDeafened)}
                        onAutoplayBlocked={() => setHasBlockedAutoplay(true)}
                    />
                ))}
            </div>

            {/* Banner flotante sutil para móviles si el navegador bloqueó el autoplay */}
            {hasBlockedAutoplay && (
                <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-bounce">
                    <button
                        type="button"
                        onClick={handleManualUnlock}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-emerald-400"
                    >
                        <Volume2 className="w-4 h-4 animate-pulse" />
                        Toca aquí para escuchar a tus amigos
                    </button>
                </div>
            )}
        </>
    );
}

function AudioStream({
    peerId,
    stream,
    isDeafened,
    onAutoplayBlocked,
}: {
    peerId: string;
    stream: MediaStream;
    isDeafened: boolean;
    onAutoplayBlocked?: () => void;
}) {
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const el = audioRef.current;
        if (!el || !stream) return;

        if (el.srcObject !== stream) {
            el.srcObject = stream;
        }

        // Si está ensordecido, silenciar inmediatamente el elemento audio
        el.muted = isDeafened;

        const tryPlay = () => {
            if (!isDeafened && el.paused) {
                el.play().catch(() => {
                    onAutoplayBlocked?.();
                });
            }
        };

        tryPlay();

        stream.addEventListener("addtrack", tryPlay);
        return () => {
            stream.removeEventListener("addtrack", tryPlay);
        };
    }, [stream, peerId, isDeafened, onAutoplayBlocked]);

    return (
        <audio
            ref={audioRef}
            data-tabetalk-audio="true"
            autoPlay
            playsInline
            controls={false}
            muted={isDeafened}
        />
    );
}

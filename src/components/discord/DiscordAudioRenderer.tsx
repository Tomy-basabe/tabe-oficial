import { useEffect, useRef } from "react";
import { useDiscordVoice } from "@/contexts/DiscordVoiceContext";

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
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <audio
            ref={audioRef}
            autoPlay
            playsInline
            controls={false}
        // We could add local mute logic here if we had a "localMute" state for each peer
        />
    );
}

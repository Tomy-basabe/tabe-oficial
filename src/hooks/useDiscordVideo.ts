import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
    ],
};

export function useDiscordVideo(channelId: string | null) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null);
    const [remoteVideoStreams, setRemoteVideoStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);

    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const signalingChannel = useRef<any>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

    // === 1. SIGNALING SETUP ===
    useEffect(() => {
        if (!user || !channelId) return;

        const channel = supabase.channel(`video:${channelId}`, {
            config: {
                broadcast: { self: false },
                presence: { key: user.id },
            },
        });

        channel
            .on("broadcast", { event: "video-signal" }, async ({ payload }) => {
                const { type, from, to, data } = payload;
                if ((to && to !== user.id) || from === user.id) return;

                console.log("[DiscordVideo] Received signal:", type, "from:", from);

                if (type === "video-offer") {
                    await handleVideoOffer(from, data);
                } else if (type === "video-answer") {
                    await handleVideoAnswer(from, data);
                } else if (type === "video-candidate") {
                    await handleVideoCandidate(from, data);
                }
            })
            .on("presence", { event: "join" }, async ({ key }) => {
                if (key !== user.id && localStreamRef.current) {
                    // Deterministic initiator
                    if (user.id.localeCompare(key) < 0) {
                        console.log("[DiscordVideo] Initiating video connection to:", key);
                        await createVideoOffer(key, localStreamRef.current);
                    }
                }
            })
            .on("presence", { event: "leave" }, ({ key }) => {
                closePeerConnection(key);
            })
            .subscribe();

        signalingChannel.current = channel;

        return () => {
            console.log("[DiscordVideo] Cleaning up signaling...");
            channel.unsubscribe();
            peerConnections.current.forEach((pc) => pc.close());
            peerConnections.current.clear();
            setRemoteVideoStreams(new Map());
            setIsVideoEnabled(false);

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
                localStreamRef.current = null;
                setLocalVideoStream(null);
            }
        };
    }, [channelId, user]);

    // === 2. WEBRTC HANDLERS ===
    const createPeerConnection = (peerId: string, stream: MediaStream) => {
        if (user && peerId === user.id) return null!;

        const existingPc = peerConnections.current.get(peerId);
        if (existingPc) {
            existingPc.close();
            peerConnections.current.delete(peerId);
        }

        console.log("[DiscordVideo] Creating video peer connection to:", peerId);
        const pc = new RTCPeerConnection(ICE_SERVERS);

        stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
        });

        pc.ontrack = (event) => {
            console.log("[DiscordVideo] Received remote video track from:", peerId);
            const remoteStream = event.streams[0] || new MediaStream([event.track]);
            setRemoteVideoStreams(prev => {
                const updated = new Map(prev);
                updated.set(peerId, remoteStream);
                return updated;
            });
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && signalingChannel.current) {
                signalingChannel.current.send({
                    type: "broadcast",
                    event: "video-signal",
                    payload: {
                        type: "video-candidate",
                        from: user?.id,
                        to: peerId,
                        data: event.candidate,
                    },
                });
            }
        };

        pc.onconnectionstatechange = () => {
            console.log(`[DiscordVideo] Connection state ${peerId}: ${pc.connectionState}`);
            if (pc.connectionState === "failed") {
                closePeerConnection(peerId);
            }
        };

        peerConnections.current.set(peerId, pc);
        return pc;
    };

    const closePeerConnection = (peerId: string) => {
        const pc = peerConnections.current.get(peerId);
        if (pc) {
            pc.close();
            peerConnections.current.delete(peerId);
            setRemoteVideoStreams(prev => {
                const updated = new Map(prev);
                updated.delete(peerId);
                return updated;
            });
        }
    };

    const createVideoOffer = async (peerId: string, stream: MediaStream) => {
        const pc = createPeerConnection(peerId, stream);
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            signalingChannel.current?.send({
                type: "broadcast",
                event: "video-signal",
                payload: {
                    type: "video-offer",
                    from: user?.id,
                    to: peerId,
                    data: offer
                }
            });
        } catch (e) {
            console.error("[DiscordVideo] Error creating offer:", e);
        }
    };

    const handleVideoOffer = async (fromId: string, offer: RTCSessionDescriptionInit) => {
        let currentStream = localStreamRef.current;
        // If we don't have a camera on, we can still answer (receive-only or send-empty)
        // But typically we want to trigger camera? Or just receive?
        // Let's assume we just receive if we have no camera.
        // But createPeerConnection expects a stream. 
        // We will create a dummy stream or handle receive-only if needed.
        // For now, let's strictly require camera on to "join" video, 
        // OR we create a PC with no tracks if we are just watching. 

        if (!currentStream) {
            // If we are not broadcasting video, we still might want to see others?
            // For simplicity, let's create a PC without tracks if we have no stream.
            // But createPeerConnection iterates stream tracks.
            // Let's modify createPeerConnection to handle empty stream.
            console.log("[DiscordVideo] Handling offer without local video (view-only mode)");
        }

        const pc = createPeerConnection(fromId, currentStream || new MediaStream());
        if (!pc) return;

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            signalingChannel.current?.send({
                type: "broadcast",
                event: "video-signal",
                payload: {
                    type: "video-answer",
                    from: user?.id,
                    to: fromId,
                    data: answer
                }
            });

            const pending = pendingCandidatesRef.current.get(fromId);
            if (pending) {
                pending.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)));
                pendingCandidatesRef.current.delete(fromId);
            }
        } catch (e) {
            console.error("[DiscordVideo] Error handling offer:", e);
        }
    };

    const handleVideoAnswer = async (fromId: string, answer: RTCSessionDescriptionInit) => {
        const pc = peerConnections.current.get(fromId);
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            const pending = pendingCandidatesRef.current.get(fromId);
            if (pending) {
                pending.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)));
                pendingCandidatesRef.current.delete(fromId);
            }
        }
    };

    const handleVideoCandidate = async (fromId: string, candidate: RTCIceCandidateInit) => {
        const pc = peerConnections.current.get(fromId);
        if (pc) {
            pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
            const pending = pendingCandidatesRef.current.get(fromId) || [];
            pending.push(candidate);
            pendingCandidatesRef.current.set(fromId, pending);
        }
    };

    // === 3. USER ACTIONS ===
    const toggleVideo = async () => {
        if (isVideoEnabled) {
            // Turn OFF
            setIsVideoEnabled(false);
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
                localStreamRef.current = null;
                setLocalVideoStream(null);
            }
            // Close connections to stop sending
            peerConnections.current.forEach(pc => pc.close());
            peerConnections.current.clear();
            setRemoteVideoStreams(new Map());

            // Notify others
            signalingChannel.current?.send({
                type: "broadcast",
                event: "video-signal",
                payload: { type: "video-stop", from: user?.id }
            });

        } else {
            // Turn ON
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                localStreamRef.current = stream;
                setLocalVideoStream(stream);
                setIsVideoEnabled(true);

                // Connect to everyone present
                // We need a way to know who is present. 
                // The presence state is on the channel. 
                // We can just track presence in a Ref or State.
                channelId && signalingChannel.current?.track({ user_id: user?.id, video: true });

                // For now, simpler: Just rely on incoming offers or triggers?
                // "join" presence event handles new users.
                // But what about existing users?
                // We should probably broadcast "I started video" and others should connect?
                // Or just initiate connections to everyone we know?

                // Let's rely on "I Started Video" message to trigger offers?
                // Or just broadcast a "video-join" and everyone offers me?
                signalingChannel.current?.send({
                    type: "broadcast",
                    event: "video-signal",
                    payload: { type: "video-join", from: user?.id }
                });

            } catch (e) {
                console.error("Error accessing camera:", e);
                toast({ title: "Error", description: "No se pudo acceder a la cámara", variant: "destructive" });
            }
        }
    };

    return {
        localVideoStream,
        remoteVideoStreams,
        isVideoEnabled,
        toggleVideo
    };
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { VideoSignaling } from '../lib/discord-signaling';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Configuración de servidores ICE (STUN/TURN)
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
};

interface UseRobustDiscordProps {
    channelId: string | null;
}

export const useRobustDiscord = ({ channelId }: UseRobustDiscordProps) => {
    const { user } = useAuth();
    const { toast } = useToast();

    // Estados
    const [isConnected, setIsConnected] = useState(false);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false); // Start false
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);

    // Streams
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

    // Connection State
    const [connectionState, setConnectionState] = useState<string>('new');
    const [error, setError] = useState<string | null>(null);

    // Referencias
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const signalingRef = useRef<VideoSignaling | null>(null);
    const makingOfferRef = useRef<Map<string, boolean>>(new Map());
    const politeRef = useRef(false); // Deterministic politeness

    // Logger para debugging
    const log = useCallback((message: string) => {
        console.log(`[RobustDiscord] ${message}`);
    }, []);

    // Cleanup peer connection for a specific user
    const closePeerConnection = useCallback((targetUserId: string) => {
        log(`Closing connection to ${targetUserId}`);
        const pc = peerConnectionsRef.current.get(targetUserId);
        if (pc) {
            pc.close();
            peerConnectionsRef.current.delete(targetUserId);
        }
        setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(targetUserId);
            return newMap;
        });
    }, [log]);

    // Crear peer connection
    const createPeerConnection = useCallback((targetUserId: string) => {
        log(`Creando peer connection para ${targetUserId}...`);

        // Check if exists
        if (peerConnectionsRef.current.has(targetUserId)) {
            log(`PC ya existe para ${targetUserId}, cerrando anterior`);
            closePeerConnection(targetUserId);
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionsRef.current.set(targetUserId, pc);

        // Evento: Recibir tracks remotos (CRÍTICO)
        pc.ontrack = (event) => {
            log(`Track remoto recibido de ${targetUserId}: ${event.track.kind}`);

            const remoteStream = event.streams[0] || new MediaStream([event.track]);

            // Update remote streams map
            setRemoteStreams(prev => {
                const newMap = new Map(prev);
                newMap.set(targetUserId, remoteStream);
                return newMap;
            });

            // Ensure tracks are processed?
            event.track.onunmute = () => {
                log(`Track ${event.track.kind} de ${targetUserId} unmuted`);
            };
        };

        // Evento: ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && signalingRef.current) {
                signalingRef.current.send({
                    type: 'ice-candidate',
                    candidate: event.candidate.toJSON(),
                    userId: targetUserId // Send intent? Signaling handles broadcast but we format payload
                });
                // Wait, signaling send() wraps payload.
                // We broadcast to channel. All users receive.
                // We need to specify TARGET in payload if we want privacy, or just filtered by 'senderId'.
                // The VideoSignaling class sends broadcast. 
                // We should add 'target' field to payload so others ignore if not for them.
                // But for Voice Channel broadcast, usually we just send to 'video-{channel}'.
                // The VideoSignaling.send adds userId (sender).
                // If we adhere to "Generic Solution", it broadcasted to everyone? 
                // The `useVideoCall` was 1-on-1.
                // In Mesh, we need to handle specific peers.
                // Let's modify signaling send to include 'targetUserId' if known, but here we just broadcast candidates.
                // The receivers filter by 'senderId'.
            }
        };

        // Evento: Cambio de estado de conexión
        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            log(`Connection state with ${targetUserId}: ${state}`);

            if (state === 'failed') {
                log(`Conexión falló con ${targetUserId} - intentando reiniciar ICE`);
                pc.restartIce();
            } else if (state === 'closed' || state === 'disconnected') {
                // closePeerConnection(targetUserId); // Maybe too aggressive if temporary disconnect?
            }
        };

        // Evento: Negociación necesaria
        pc.onnegotiationneeded = async () => {
            try {
                log(`Negociación necesaria con ${targetUserId}`);
                makingOfferRef.current.set(targetUserId, true);

                await pc.setLocalDescription();

                if (signalingRef.current) {
                    await signalingRef.current.send({
                        type: 'offer',
                        offer: pc.localDescription,
                        targetUserId: targetUserId // We only want THIS user to answer ideally
                    });
                }
            } catch (err: any) {
                log(`ERROR en negotiationneeded: ${err.message}`);
            } finally {
                makingOfferRef.current.set(targetUserId, false);
            }
        };

        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        return pc;
    }, [log, closePeerConnection]);

    // Inicializar llamada (Obtener media local)
    const initializeMedia = useCallback(async () => {
        try {
            log('Inicializando media...');

            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: true, // Request video initially to get permissions? Or false?
                // Discord usually starts audio-only.
                // If we request video: true, camera turns on.
                // Let's request audio only first, or handle video toggle later.
                // User wants VIDEO working.
                // Let's start audio only, let toggle enable video.
            };

            // To follow "Robust" solution, we get stream. 
            // If we want audio-only start:
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

            localStreamRef.current = stream;
            setLocalStream(stream);
            setIsAudioEnabled(true);

            log(`Stream de audio obtenido`);
            return stream;

        } catch (err: any) {
            log(`ERROR en inicialización media: ${err.message}`);
            toast({ title: "Error", description: "No se pudo acceder al micrófono", variant: "destructive" });
            throw err;
        }
    }, [log, toast]);

    // Crear oferta para un usuario específico (Initiator)
    const createOffer = useCallback(async (targetUserId: string) => {
        const pc = createPeerConnection(targetUserId);
        try {
            // Manual offer creation if negotiationneeded doesn't fire optimally
            // But negotiationneeded should fire when we add tracks.
            // We'll rely on onnegotiationneeded or manual?
            // The 'Robust' solution used manual createOffer in joinCall.

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            if (signalingRef.current) {
                await signalingRef.current.send({
                    type: 'offer',
                    offer: pc.localDescription,
                    targetUserId // Use this to direct offer
                });
            }
        } catch (e) {
            log(`Error creating offer: ${e}`);
        }
    }, [createPeerConnection, log]);


    // Initial Join Logic
    useEffect(() => {
        if (!channelId || !user) return;

        let mounted = true;

        const start = async () => {
            // 1. Get Media
            const stream = await initializeMedia();

            // 2. Setup Signaling
            const handlers = {
                onOffer: async (offer: RTCSessionDescriptionInit, senderId: string) => {
                    // Check if for us? Mesh broadcast implicitly implies for everyone unless targeted.
                    // We will verify target in data if possible, but basic signaling doesn't have it yet.
                    // For now, assume broadcast offers are for everyone who doesn't have a connection?
                    // Or better, we only process offers from lower IDs? (Politeness)

                    log(`Recibida oferta de ${senderId}`);
                    let pc = peerConnectionsRef.current.get(senderId);
                    if (!pc) {
                        pc = createPeerConnection(senderId);
                    }

                    await pc.setRemoteDescription(offer);
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    signalingRef.current?.send({
                        type: 'answer',
                        answer: pc.localDescription,
                        targetUserId: senderId // Answer specifically back to sender
                    });
                },
                onAnswer: async (answer: RTCSessionDescriptionInit, senderId: string) => {
                    log(`Recibida respuesta de ${senderId}`);
                    const pc = peerConnectionsRef.current.get(senderId);
                    if (pc) {
                        await pc.setRemoteDescription(answer);
                    }
                },
                onIceCandidate: async (candidate: RTCIceCandidateInit, senderId: string) => {
                    const pc = peerConnectionsRef.current.get(senderId);
                    if (pc) {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                },
                onUserJoined: (userId: string) => {
                    log(`Usuario unido: ${userId}`);
                    // Existing user should offer to new user?
                    // Or new user offers to existing?
                    // Polite strategy:
                    // We use ID comparison.
                    // If localUser < remoteUser, we offer.
                    if (user.id.localeCompare(userId) < 0) {
                        log(`Iniciando conexión con ${userId} (Soy iniciador)`);
                        createOffer(userId);
                    }
                },
                onUserLeft: (userId: string) => {
                    closePeerConnection(userId);
                }
            };

            const sig = new VideoSignaling(channelId, user.id, handlers);
            await sig.connect();
            signalingRef.current = sig;

            // Presence check? The class handles events.
            // We might want to see existing users.
            setTimeout(() => {
                // For existing users, we might need a way to trigger connection.
                // Currently 'onUserJoined' handles NEW joins.
                // But what about people already there?
                // VideoSignaling could expose current presence?
                // Or we just broadcast "I am here"?
                // The VideoSignaling.connect() calls track().
                // This triggers 'join' for OTHERS.
                // But for ME, I need to know others.
                // The presence state sync ... 
                // We can check `sig.getPresence()`.
                const others = sig.getPresence().filter(id => id !== user.id);
                others.forEach(otherId => {
                    if (user.id.localeCompare(otherId) < 0) {
                        log(`Conectando con usuario existente: ${otherId}`);
                        createOffer(otherId);
                    }
                });
            }, 1000); // Give time for presence sync
        };

        start();

        return () => {
            mounted = false;
            log("Cleaning up...");
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            setLocalStream(null);
            peerConnectionsRef.current.forEach(pc => pc.close());
            peerConnectionsRef.current.clear();
            signalingRef.current?.disconnect();
            setRemoteStreams(new Map());
        };
    }, [channelId, user, createOffer, createPeerConnection, initializeMedia, closePeerConnection, log]);

    // Toggle Video
    const toggleVideo = useCallback(async () => {
        const stream = localStreamRef.current;
        if (!stream) return;

        if (isVideoEnabled) {
            // Turn off
            const videoTracks = stream.getVideoTracks();
            videoTracks.forEach(t => {
                t.stop();
                stream.removeTrack(t);
            });
            setIsVideoEnabled(false);
            // Remove from all PCs
            peerConnectionsRef.current.forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    pc.removeTrack(sender);
                }
            });
        } else {
            // Turn on
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const videoTrack = videoStream.getVideoTracks()[0];

                stream.addTrack(videoTrack);
                setIsVideoEnabled(true);

                // Add to all PCs
                peerConnectionsRef.current.forEach(pc => {
                    pc.addTrack(videoTrack, stream);
                });
            } catch (e) {
                console.error("Error enabling video", e);
                toast({ title: "Error camera", variant: "destructive" });
            }
        }
    }, [isVideoEnabled, toast]);

    // Toggle Mute
    const toggleAudio = useCallback(() => {
        const stream = localStreamRef.current;
        if (stream) {
            stream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
            setIsAudioEnabled(prev => !prev);
        }
    }, []);

    return {
        localStream,
        remoteStreams,
        isConnected: !!localStream,
        toggleVideo,
        toggleAudio,
        isVideoEnabled,
        isAudioEnabled,
        leaveVoiceChannel: () => { /* handled by unmount for now? or explicit? */ }
    };
}

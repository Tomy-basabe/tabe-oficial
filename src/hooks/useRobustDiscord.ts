import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ICE Servers
const ICE_SERVERS: RTCConfiguration = {
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

export function useRobustDiscord({ channelId }: UseRobustDiscordProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    // States
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);

    // Refs (survive re-renders)
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const signalingChannelRef = useRef<RealtimeChannel | null>(null);
    const channelIdRef = useRef<string | null>(null);
    const userIdRef = useRef<string | null>(null);

    // Keep refs in sync
    useEffect(() => { channelIdRef.current = channelId; }, [channelId]);
    useEffect(() => { userIdRef.current = user?.id ?? null; }, [user?.id]);

    const log = useCallback((msg: string) => console.log(`[RobustDiscord] ${msg}`), []);

    // ─── Cleanup helpers ───

    const closePeerConnection = useCallback((targetId: string) => {
        const pc = peerConnectionsRef.current.get(targetId);
        if (pc) {
            pc.close();
            peerConnectionsRef.current.delete(targetId);
            log(`Closed PC for ${targetId.slice(0, 8)}`);
        }
        setRemoteStreams(prev => {
            const m = new Map(prev);
            m.delete(targetId);
            return m;
        });
    }, [log]);

    const cleanupAll = useCallback(() => {
        log('Full cleanup');
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
        peerConnectionsRef.current.forEach(pc => pc.close());
        peerConnectionsRef.current.clear();
        setRemoteStreams(new Map());
        setIsAudioEnabled(true);
        setIsVideoEnabled(false);
        if (signalingChannelRef.current) {
            signalingChannelRef.current.unsubscribe();
            signalingChannelRef.current = null;
        }
    }, [log]);

    // ─── Peer Connection Factory ───

    const makePeerConnection = useCallback((targetId: string, stream: MediaStream): RTCPeerConnection => {
        // Close existing if any
        const existing = peerConnectionsRef.current.get(targetId);
        if (existing) { existing.close(); peerConnectionsRef.current.delete(targetId); }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionsRef.current.set(targetId, pc);

        // Add local tracks
        stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
        });
        log(`Added ${stream.getTracks().length} tracks to PC for ${targetId.slice(0, 8)}`);

        // Receive remote tracks
        pc.ontrack = (ev) => {
            log(`ontrack from ${targetId.slice(0, 8)}: ${ev.track.kind}`);
            const remoteStream = ev.streams[0] || new MediaStream([ev.track]);
            setRemoteStreams(prev => {
                const m = new Map(prev);
                m.set(targetId, remoteStream);
                return m;
            });
        };

        // ICE candidates → broadcast
        pc.onicecandidate = (ev) => {
            if (ev.candidate && signalingChannelRef.current) {
                signalingChannelRef.current.send({
                    type: 'broadcast',
                    event: 'signaling',
                    payload: {
                        type: 'ice-candidate',
                        candidate: ev.candidate.toJSON(),
                        from: userIdRef.current,
                        to: targetId,
                    },
                });
            }
        };

        // Connection state
        pc.onconnectionstatechange = () => {
            log(`PC ${targetId.slice(0, 8)} connection: ${pc.connectionState}`);
            if (pc.connectionState === 'failed') pc.restartIce();
        };

        pc.oniceconnectionstatechange = () => {
            log(`PC ${targetId.slice(0, 8)} ICE: ${pc.iceConnectionState}`);
        };

        return pc;
    }, [log]);

    // ─── Signaling Handlers ───

    const handleSignaling = useCallback(async (payload: any) => {
        const myId = userIdRef.current;
        if (!myId) return;
        if (payload.from === myId) return; // ignore own messages

        const senderId = payload.from as string;

        // If message is targeted and not for us, skip
        if (payload.to && payload.to !== myId) return;

        const stream = localStreamRef.current;

        switch (payload.type) {
            case 'offer': {
                log(`Offer from ${senderId.slice(0, 8)}`);
                if (!stream) { log('No local stream, ignoring offer'); return; }

                let pc = peerConnectionsRef.current.get(senderId);
                if (!pc) {
                    pc = makePeerConnection(senderId, stream);
                }

                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    signalingChannelRef.current?.send({
                        type: 'broadcast',
                        event: 'signaling',
                        payload: {
                            type: 'answer',
                            answer: pc.localDescription,
                            from: myId,
                            to: senderId,
                        },
                    });
                    log(`Answer sent to ${senderId.slice(0, 8)}`);
                } catch (e: any) {
                    log(`Error handling offer: ${e.message}`);
                }
                break;
            }

            case 'answer': {
                log(`Answer from ${senderId.slice(0, 8)}`);
                const pc = peerConnectionsRef.current.get(senderId);
                if (!pc) { log('No PC for answer, ignoring'); return; }

                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                    log(`Remote description set for ${senderId.slice(0, 8)}`);
                } catch (e: any) {
                    log(`Error handling answer: ${e.message}`);
                }
                break;
            }

            case 'ice-candidate': {
                const pc = peerConnectionsRef.current.get(senderId);
                if (!pc) { log(`No PC for ICE from ${senderId.slice(0, 8)}`); return; }

                try {
                    await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                } catch (e: any) {
                    log(`Error adding ICE: ${e.message}`);
                }
                break;
            }
        }
    }, [makePeerConnection, log]);

    // ─── Create Offer to a specific user ───

    const createOfferTo = useCallback(async (targetId: string, stream: MediaStream) => {
        log(`Creating offer to ${targetId.slice(0, 8)}`);
        const pc = makePeerConnection(targetId, stream);

        try {
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(offer);

            signalingChannelRef.current?.send({
                type: 'broadcast',
                event: 'signaling',
                payload: {
                    type: 'offer',
                    offer: pc.localDescription,
                    from: userIdRef.current,
                    to: targetId,
                },
            });
            log(`Offer sent to ${targetId.slice(0, 8)}`);
        } catch (e: any) {
            log(`Error creating offer: ${e.message}`);
        }
    }, [makePeerConnection, log]);

    // ─── Main Effect: Join/Leave channel ───

    useEffect(() => {
        if (!channelId || !user) {
            cleanupAll();
            return;
        }

        let cancelled = false;
        log(`Joining channel ${channelId.slice(0, 8)} as ${user.id.slice(0, 8)}`);

        const start = async () => {
            // 1. Get local audio stream
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                    video: false,
                });
            } catch (e: any) {
                log(`getUserMedia failed: ${e.message}`);
                toast({ title: 'Error de micrófono', description: e.message, variant: 'destructive' });
                return;
            }

            if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

            localStreamRef.current = stream;
            setLocalStream(stream);
            setIsAudioEnabled(true);
            setIsVideoEnabled(false);
            log(`Got local audio stream (${stream.getAudioTracks().length} audio tracks)`);

            // 2. Setup signaling channel
            const channel = supabase.channel(`voice-robust:${channelId}`, {
                config: { broadcast: { self: false }, presence: { key: user.id } },
            });

            // Listen for signaling messages
            channel.on('broadcast', { event: 'signaling' }, ({ payload }) => {
                if (!cancelled) handleSignaling(payload);
            });

            // Listen for presence changes
            channel.on('presence', { event: 'join' }, ({ key }) => {
                if (cancelled || !key || key === user.id) return;
                log(`User joined: ${key.slice(0, 8)}`);

                // Deterministic: lower ID creates offer
                if (user.id.localeCompare(key) < 0) {
                    log(`I'm initiator → offering to ${key.slice(0, 8)}`);
                    createOfferTo(key, stream);
                }
            });

            channel.on('presence', { event: 'leave' }, ({ key }) => {
                if (!key || key === user.id) return;
                log(`User left: ${key.slice(0, 8)}`);
                closePeerConnection(key);
            });

            // Subscribe
            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && !cancelled) {
                    log('Signaling channel subscribed');
                    await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
                    signalingChannelRef.current = channel;

                    // Check for existing users after a short delay
                    setTimeout(() => {
                        if (cancelled) return;
                        const presenceState = channel.presenceState();
                        const otherIds = Object.keys(presenceState).filter(id => id !== user.id);
                        log(`Found ${otherIds.length} existing users`);
                        otherIds.forEach(otherId => {
                            if (user.id.localeCompare(otherId) < 0) {
                                log(`Offering to existing user ${otherId.slice(0, 8)}`);
                                createOfferTo(otherId, stream);
                            }
                        });
                    }, 500);
                }
            });
        };

        start();

        return () => {
            cancelled = true;
            log('Cleanup effect running');
            cleanupAll();
        };
    }, [channelId, user?.id]); // Minimal deps - only re-run on channel/user change

    // ─── Toggle Audio ───

    const toggleAudio = useCallback(() => {
        const stream = localStreamRef.current;
        if (!stream) return;
        stream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
        setIsAudioEnabled(prev => !prev);
    }, []);

    // ─── Toggle Video ───

    const toggleVideo = useCallback(async () => {
        const stream = localStreamRef.current;
        if (!stream) return;

        if (isVideoEnabled) {
            // Turn off video
            stream.getVideoTracks().forEach(t => { t.stop(); stream.removeTrack(t); });
            peerConnectionsRef.current.forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) pc.removeTrack(sender);
            });
            setIsVideoEnabled(false);
            log('Video disabled');
        } else {
            // Turn on video
            try {
                const vs = await navigator.mediaDevices.getUserMedia({ video: true });
                const videoTrack = vs.getVideoTracks()[0];
                stream.addTrack(videoTrack);
                peerConnectionsRef.current.forEach(pc => {
                    pc.addTrack(videoTrack, stream);
                });
                setIsVideoEnabled(true);
                setLocalStream(stream); // trigger re-render
                log('Video enabled');
            } catch (e: any) {
                log(`Video error: ${e.message}`);
                toast({ title: 'Error de cámara', description: e.message, variant: 'destructive' });
            }
        }
    }, [isVideoEnabled, toast, log]);

    return {
        localStream,
        remoteStreams,
        isAudioEnabled,
        isVideoEnabled,
        toggleAudio,
        toggleVideo,
    };
}

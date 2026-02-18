import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ICE Servers: STUN + free TURN for cross-network NAT traversal
const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Free TURN servers (Metered.ca free tier)
        {
            urls: 'turn:a.relay.metered.ca:80',
            username: 'e8dd65b92f535845a3b1a528',
            credential: 'yIJOkLHEPc/MmhJJ',
        },
        {
            urls: 'turn:a.relay.metered.ca:80?transport=tcp',
            username: 'e8dd65b92f535845a3b1a528',
            credential: 'yIJOkLHEPc/MmhJJ',
        },
        {
            urls: 'turn:a.relay.metered.ca:443',
            username: 'e8dd65b92f535845a3b1a528',
            credential: 'yIJOkLHEPc/MmhJJ',
        },
        {
            urls: 'turns:a.relay.metered.ca:443?transport=tcp',
            username: 'e8dd65b92f535845a3b1a528',
            credential: 'yIJOkLHEPc/MmhJJ',
        },
    ],
    iceCandidatePoolSize: 10,
};

interface UseRobustDiscordProps {
    channelId: string | null;
}

// ═══════════════════════════════════════════════
// Global cleanup for camera on tab close/navigation
// ═══════════════════════════════════════════════
const activeStreams = new Set<MediaStream>();

function stopAllActiveStreams() {
    activeStreams.forEach(stream => {
        stream.getTracks().forEach(t => t.stop());
    });
    activeStreams.clear();
}

// Register global handlers ONCE
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', stopAllActiveStreams);
    window.addEventListener('pagehide', stopAllActiveStreams);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            // Don't stop streams on visibility hidden (user might switch tabs)
            // Only beforeunload/pagehide actually close
        }
    });
}

export function useRobustDiscord({ channelId }: UseRobustDiscordProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [peerStates, setPeerStates] = useState<Map<string, string>>(new Map());

    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const signalingChannelRef = useRef<RealtimeChannel | null>(null);
    const channelIdRef = useRef<string | null>(null);
    const userIdRef = useRef<string | null>(null);

    useEffect(() => { channelIdRef.current = channelId; }, [channelId]);
    useEffect(() => { userIdRef.current = user?.id ?? null; }, [user?.id]);

    const log = useCallback((msg: string) => console.log(`[RobustDiscord v7] ${msg}`), []);

    // ─── Cleanup ───

    const closePeerConnection = useCallback((targetId: string) => {
        const pc = peerConnectionsRef.current.get(targetId);
        if (pc) {
            pc.close();
            peerConnectionsRef.current.delete(targetId);
            log(`Closed PC for ${targetId.slice(0, 8)}`);
        }
        setRemoteStreams(prev => { const m = new Map(prev); m.delete(targetId); return m; });
        setPeerStates(prev => { const m = new Map(prev); m.delete(targetId); return m; });
    }, [log]);

    const cleanupAll = useCallback(() => {
        log('Full cleanup — stopping all tracks');
        const stream = localStreamRef.current;
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            activeStreams.delete(stream);
            localStreamRef.current = null;
        }
        setLocalStream(null);
        peerConnectionsRef.current.forEach(pc => pc.close());
        peerConnectionsRef.current.clear();
        setRemoteStreams(new Map());
        setPeerStates(new Map());
        setIsAudioEnabled(true);
        setIsVideoEnabled(false);
        if (signalingChannelRef.current) {
            supabase.removeChannel(signalingChannelRef.current);
            signalingChannelRef.current = null;
        }
    }, [log]);

    // ─── Peer Connection ───

    const makePeerConnection = useCallback((targetId: string, stream: MediaStream): RTCPeerConnection => {
        const existing = peerConnectionsRef.current.get(targetId);
        if (existing) { existing.close(); peerConnectionsRef.current.delete(targetId); }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionsRef.current.set(targetId, pc);

        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        log(`PC created for ${targetId.slice(0, 8)}, added ${stream.getTracks().length} tracks`);

        pc.ontrack = (ev) => {
            log(`ontrack from ${targetId.slice(0, 8)}: ${ev.track.kind}`);
            const rs = ev.streams[0] || new MediaStream([ev.track]);
            setRemoteStreams(prev => { const m = new Map(prev); m.set(targetId, rs); return m; });
        };

        pc.onicecandidate = (ev) => {
            if (ev.candidate && signalingChannelRef.current) {
                signalingChannelRef.current.send({
                    type: 'broadcast', event: 'signaling',
                    payload: {
                        type: 'ice-candidate',
                        candidate: ev.candidate.toJSON(),
                        from: userIdRef.current,
                        to: targetId,
                    },
                });
            }
        };

        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            log(`PC ${targetId.slice(0, 8)} → ${state}`);
            setPeerStates(prev => { const m = new Map(prev); m.set(targetId, state); return m; });
            if (state === 'failed') {
                log('ICE restart attempt');
                pc.restartIce();
            }
        };

        pc.oniceconnectionstatechange = () => {
            log(`PC ${targetId.slice(0, 8)} ICE → ${pc.iceConnectionState}`);
        };

        return pc;
    }, [log]);

    // ─── Signaling ───

    const handleSignaling = useCallback(async (payload: any) => {
        const myId = userIdRef.current;
        if (!myId || payload.from === myId) return;
        if (payload.to && payload.to !== myId) return;

        const senderId = payload.from as string;
        const stream = localStreamRef.current;

        switch (payload.type) {
            case 'offer': {
                log(`Offer from ${senderId.slice(0, 8)}`);
                if (!stream) { log('No local stream → ignore'); return; }

                let pc = peerConnectionsRef.current.get(senderId);
                if (!pc) pc = makePeerConnection(senderId, stream);

                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    signalingChannelRef.current?.send({
                        type: 'broadcast', event: 'signaling',
                        payload: { type: 'answer', answer: pc.localDescription, from: myId, to: senderId },
                    });
                    log(`Answer → ${senderId.slice(0, 8)}`);
                } catch (e: any) { log(`Offer error: ${e.message}`); }
                break;
            }

            case 'answer': {
                log(`Answer from ${senderId.slice(0, 8)}`);
                const pc = peerConnectionsRef.current.get(senderId);
                if (!pc) return;
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                } catch (e: any) { log(`Answer error: ${e.message}`); }
                break;
            }

            case 'ice-candidate': {
                const pc = peerConnectionsRef.current.get(senderId);
                if (!pc) return;
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                } catch (e: any) { log(`ICE error: ${e.message}`); }
                break;
            }
        }
    }, [makePeerConnection, log]);

    // ─── Create Offer ───

    const createOfferTo = useCallback(async (targetId: string, stream: MediaStream) => {
        log(`Offer → ${targetId.slice(0, 8)}`);
        const pc = makePeerConnection(targetId, stream);

        try {
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(offer);

            signalingChannelRef.current?.send({
                type: 'broadcast', event: 'signaling',
                payload: { type: 'offer', offer: pc.localDescription, from: userIdRef.current, to: targetId },
            });
        } catch (e: any) { log(`Offer error: ${e.message}`); }
    }, [makePeerConnection, log]);

    // ─── Main Effect ───

    useEffect(() => {
        if (!channelId || !user) {
            cleanupAll();
            return;
        }

        let cancelled = false;
        log(`Joining ${channelId.slice(0, 8)} as ${user.id.slice(0, 8)}`);

        const start = async () => {
            // 1. Audio
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                    video: false,
                });
            } catch (e: any) {
                log(`Mic error: ${e.message}`);
                toast({ title: 'Error de micrófono', description: e.message, variant: 'destructive' });
                return;
            }

            if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

            // Register in global set for tab-close cleanup
            activeStreams.add(stream);
            localStreamRef.current = stream;
            setLocalStream(stream);
            setIsAudioEnabled(true);
            setIsVideoEnabled(false);
            log(`Audio OK (${stream.getAudioTracks().length} tracks)`);

            // 2. Signaling
            const channel = supabase.channel(`voice-robust:${channelId}`, {
                config: { broadcast: { self: false }, presence: { key: user.id } },
            });

            channel.on('broadcast', { event: 'signaling' }, ({ payload }) => {
                if (!cancelled) handleSignaling(payload);
            });

            channel.on('presence', { event: 'join' }, ({ key }) => {
                if (cancelled || !key || key === user.id) return;
                log(`Presence join: ${key.slice(0, 8)}`);
                if (user.id.localeCompare(key) < 0) {
                    createOfferTo(key, stream);
                }
            });

            channel.on('presence', { event: 'leave' }, ({ key }) => {
                if (!key || key === user.id) return;
                log(`Presence leave: ${key.slice(0, 8)}`);
                closePeerConnection(key);
            });

            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && !cancelled) {
                    log('Channel subscribed');
                    await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
                    signalingChannelRef.current = channel;

                    // Connect to existing users
                    setTimeout(() => {
                        if (cancelled) return;
                        const others = Object.keys(channel.presenceState()).filter(id => id !== user.id);
                        log(`Existing users: ${others.length}`);
                        others.forEach(otherId => {
                            if (user.id.localeCompare(otherId) < 0) {
                                createOfferTo(otherId, stream);
                            }
                        });
                    }, 800);
                }
            });
        };

        start();

        return () => {
            cancelled = true;
            cleanupAll();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channelId, user?.id]);

    // ─── Toggle Audio ───

    const toggleAudio = useCallback(() => {
        const stream = localStreamRef.current;
        if (!stream) return;
        const newState = !isAudioEnabled;
        stream.getAudioTracks().forEach(t => { t.enabled = newState; });
        setIsAudioEnabled(newState);
    }, [isAudioEnabled]);

    // ─── Toggle Video ───

    const toggleVideo = useCallback(async () => {
        const stream = localStreamRef.current;
        if (!stream) return;

        if (isVideoEnabled) {
            // Stop video tracks
            stream.getVideoTracks().forEach(t => { t.stop(); stream.removeTrack(t); });
            peerConnectionsRef.current.forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) pc.removeTrack(sender);
            });
            setIsVideoEnabled(false);
            setLocalStream(new MediaStream(stream.getTracks())); // Force re-render
            log('Video OFF');
        } else {
            try {
                const vs = await navigator.mediaDevices.getUserMedia({ video: true });
                const vt = vs.getVideoTracks()[0];
                stream.addTrack(vt);
                peerConnectionsRef.current.forEach(pc => pc.addTrack(vt, stream));
                setIsVideoEnabled(true);
                setLocalStream(new MediaStream(stream.getTracks())); // Force re-render
                log('Video ON');
            } catch (e: any) {
                log(`Camera error: ${e.message}`);
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
        peerStates,
    };
}

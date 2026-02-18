import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ICE: STUN + TURN for cross-network
const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'turn:a.relay.metered.ca:80', username: 'e8dd65b92f535845a3b1a528', credential: 'yIJOkLHEPc/MmhJJ' },
        { urls: 'turn:a.relay.metered.ca:80?transport=tcp', username: 'e8dd65b92f535845a3b1a528', credential: 'yIJOkLHEPc/MmhJJ' },
        { urls: 'turn:a.relay.metered.ca:443', username: 'e8dd65b92f535845a3b1a528', credential: 'yIJOkLHEPc/MmhJJ' },
        { urls: 'turns:a.relay.metered.ca:443?transport=tcp', username: 'e8dd65b92f535845a3b1a528', credential: 'yIJOkLHEPc/MmhJJ' },
    ],
    iceCandidatePoolSize: 10,
};

// ═══ Global cleanup on tab close/refresh ═══
const activeStreams = new Set<MediaStream>();
let _globalUserId: string | null = null;

function cleanupOnUnload() {
    // 1. Stop all media tracks (camera, mic)
    activeStreams.forEach(s => s.getTracks().forEach(t => t.stop()));
    activeStreams.clear();

    // 2. Delete voice participant rows from DB via keepalive fetch
    if (_globalUserId) {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (url && key) {
            const token = localStorage.getItem('sb-' + new URL(url).hostname.split('.')[0] + '-auth-token');
            let accessToken = key; // fallback to anon key
            if (token) {
                try { accessToken = JSON.parse(token).access_token || key; } catch { }
            }
            // Fire-and-forget DELETE — keepalive ensures it survives page unload
            fetch(`${url}/rest/v1/discord_voice_participants?user_id=eq.${_globalUserId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': key,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                keepalive: true,
            }).catch(() => { });
        }
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanupOnUnload);
    window.addEventListener('pagehide', cleanupOnUnload);
}

export interface CameraDevice {
    deviceId: string;
    label: string;
}

interface UseRobustDiscordProps {
    channelId: string | null;
}

export function useRobustDiscord({ channelId }: UseRobustDiscordProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [peerStates, setPeerStates] = useState<Map<string, string>>(new Map());
    const [cameras, setCameras] = useState<CameraDevice[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string>('');

    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const sigRef = useRef<RealtimeChannel | null>(null);
    const channelIdRef = useRef<string | null>(null);
    const userIdRef = useRef<string | null>(null);

    useEffect(() => { channelIdRef.current = channelId; }, [channelId]);
    useEffect(() => { userIdRef.current = user?.id ?? null; _globalUserId = user?.id ?? null; }, [user?.id]);

    const log = useCallback((msg: string) => console.log(`[RobustDiscord v7.1] ${msg}`), []);

    // ─── Enumerate cameras ───
    const refreshCameras = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices
                .filter(d => d.kind === 'videoinput')
                .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Cámara ${i + 1}` }));
            setCameras(videoDevices);
            if (videoDevices.length > 0 && !selectedCameraId) {
                setSelectedCameraId(videoDevices[0].deviceId);
            }
        } catch { /* ignore */ }
    }, [selectedCameraId]);

    // Enumerate on mount
    useEffect(() => { refreshCameras(); }, []);

    // ─── Cleanup ───

    const closePeer = useCallback((id: string) => {
        const pc = pcsRef.current.get(id);
        if (pc) { pc.close(); pcsRef.current.delete(id); }
        setRemoteStreams(p => { const m = new Map(p); m.delete(id); return m; });
        setPeerStates(p => { const m = new Map(p); m.delete(id); return m; });
    }, []);

    const cleanupAll = useCallback(() => {
        log('Cleanup all');
        const s = localStreamRef.current;
        if (s) { s.getTracks().forEach(t => t.stop()); activeStreams.delete(s); localStreamRef.current = null; }
        const ss = screenStreamRef.current;
        if (ss) { ss.getTracks().forEach(t => t.stop()); screenStreamRef.current = null; }
        setLocalStream(null);
        setIsScreenSharing(false);
        pcsRef.current.forEach(pc => pc.close());
        pcsRef.current.clear();
        setRemoteStreams(new Map());
        setPeerStates(new Map());
        setIsAudioEnabled(true);
        setIsVideoEnabled(false);
        if (sigRef.current) { supabase.removeChannel(sigRef.current); sigRef.current = null; }
    }, [log]);

    // ─── Peer Connection Factory ───

    const makePC = useCallback((targetId: string, stream: MediaStream): RTCPeerConnection => {
        const old = pcsRef.current.get(targetId);
        if (old) { old.close(); pcsRef.current.delete(targetId); }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcsRef.current.set(targetId, pc);

        // Add ALL current local tracks (audio + video if present)
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        log(`PC ${targetId.slice(0, 8)}: ${stream.getTracks().length} tracks`);

        pc.ontrack = (ev) => {
            log(`Track from ${targetId.slice(0, 8)}: ${ev.track.kind}`);
            const rs = ev.streams[0] || new MediaStream([ev.track]);
            setRemoteStreams(p => { const m = new Map(p); m.set(targetId, rs); return m; });
        };

        pc.onicecandidate = (ev) => {
            if (ev.candidate && sigRef.current) {
                sigRef.current.send({
                    type: 'broadcast', event: 'signaling',
                    payload: { type: 'ice-candidate', candidate: ev.candidate.toJSON(), from: userIdRef.current, to: targetId },
                });
            }
        };

        pc.onconnectionstatechange = () => {
            setPeerStates(p => { const m = new Map(p); m.set(targetId, pc.connectionState); return m; });
            if (pc.connectionState === 'failed') pc.restartIce();
        };

        return pc;
    }, [log]);

    // ─── Renegotiate: send new offer to a single peer ───

    const renegotiate = useCallback(async (targetId: string) => {
        const pc = pcsRef.current.get(targetId);
        if (!pc || !sigRef.current) return;
        try {
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(offer);
            sigRef.current.send({
                type: 'broadcast', event: 'signaling',
                payload: { type: 'offer', offer: pc.localDescription, from: userIdRef.current, to: targetId },
            });
            log(`Renegotiate offer → ${targetId.slice(0, 8)}`);
        } catch (e: any) { log(`Renegotiate error: ${e.message}`); }
    }, [log]);

    // ─── Renegotiate with ALL peers ───

    const renegotiateAll = useCallback(async () => {
        const ids = Array.from(pcsRef.current.keys());
        log(`Renegotiating with ${ids.length} peers`);
        for (const id of ids) {
            await renegotiate(id);
        }
    }, [renegotiate, log]);

    // ─── Signaling Handler ───

    const handleSignaling = useCallback(async (payload: any) => {
        const myId = userIdRef.current;
        if (!myId || payload.from === myId) return;
        if (payload.to && payload.to !== myId) return;

        const sid = payload.from as string;
        const stream = localStreamRef.current;

        switch (payload.type) {
            case 'offer': {
                log(`Offer from ${sid.slice(0, 8)}`);
                if (!stream) return;

                // If PC exists and has remote description, this is a renegotiation
                let pc = pcsRef.current.get(sid);
                if (!pc) {
                    pc = makePC(sid, stream);
                } else {
                    // Renegotiation: update tracks on existing PC
                    // Remove senders for tracks no longer in stream
                    const senders = pc.getSenders();
                    const currentTrackIds = new Set(stream.getTracks().map(t => t.id));
                    senders.forEach(s => {
                        if (s.track && !currentTrackIds.has(s.track.id)) {
                            try { pc!.removeTrack(s); } catch { }
                        }
                    });
                    // Add new tracks
                    const existingTrackIds = new Set(senders.map(s => s.track?.id).filter(Boolean));
                    stream.getTracks().forEach(t => {
                        if (!existingTrackIds.has(t.id)) {
                            pc!.addTrack(t, stream);
                        }
                    });
                }

                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    sigRef.current?.send({
                        type: 'broadcast', event: 'signaling',
                        payload: { type: 'answer', answer: pc.localDescription, from: myId, to: sid },
                    });
                    log(`Answer → ${sid.slice(0, 8)}`);
                } catch (e: any) { log(`Offer error: ${e.message}`); }
                break;
            }

            case 'answer': {
                const pc = pcsRef.current.get(sid);
                if (!pc) return;
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                } catch (e: any) { log(`Answer error: ${e.message}`); }
                break;
            }

            case 'ice-candidate': {
                const pc = pcsRef.current.get(sid);
                if (!pc) return;
                try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch { }
                break;
            }
        }
    }, [makePC, log]);

    // ─── Create initial offer ───

    const createOfferTo = useCallback(async (targetId: string, stream: MediaStream) => {
        const pc = makePC(targetId, stream);
        try {
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(offer);
            sigRef.current?.send({
                type: 'broadcast', event: 'signaling',
                payload: { type: 'offer', offer: pc.localDescription, from: userIdRef.current, to: targetId },
            });
        } catch (e: any) { log(`Offer error: ${e.message}`); }
    }, [makePC, log]);

    // ═══ Main Effect ═══

    useEffect(() => {
        if (!channelId || !user) { cleanupAll(); return; }

        let cancelled = false;
        log(`Join ${channelId.slice(0, 8)}`);

        const start = async () => {
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                    video: false,
                });
            } catch (e: any) {
                toast({ title: 'Error de micrófono', description: e.message, variant: 'destructive' });
                return;
            }
            if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

            activeStreams.add(stream);
            localStreamRef.current = stream;
            setLocalStream(stream);
            setIsAudioEnabled(true);
            setIsVideoEnabled(false);
            log(`Audio OK`);

            // Refresh camera list after getting mic permission
            await refreshCameras();

            const channel = supabase.channel(`voice-robust:${channelId}`, {
                config: { broadcast: { self: false }, presence: { key: user.id } },
            });

            channel.on('broadcast', { event: 'signaling' }, ({ payload }) => {
                if (!cancelled) handleSignaling(payload);
            });

            channel.on('presence', { event: 'join' }, ({ key }) => {
                if (cancelled || !key || key === user.id) return;
                log(`Join: ${key.slice(0, 8)}`);
                if (user.id.localeCompare(key) < 0) createOfferTo(key, stream);
            });

            channel.on('presence', { event: 'leave' }, ({ key }) => {
                if (!key || key === user.id) return;
                closePeer(key);
            });

            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && !cancelled) {
                    await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
                    sigRef.current = channel;

                    setTimeout(() => {
                        if (cancelled) return;
                        const others = Object.keys(channel.presenceState()).filter(id => id !== user.id);
                        log(`Existing: ${others.length}`);
                        others.forEach(id => {
                            if (user.id.localeCompare(id) < 0) createOfferTo(id, stream);
                        });
                    }, 800);
                }
            });
        };

        start();
        return () => { cancelled = true; cleanupAll(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channelId, user?.id]);

    // ─── Toggle Audio ───

    const toggleAudio = useCallback(() => {
        const s = localStreamRef.current;
        if (!s) return;
        const next = !isAudioEnabled;
        s.getAudioTracks().forEach(t => { t.enabled = next; });
        setIsAudioEnabled(next);
    }, [isAudioEnabled]);

    // ─── Toggle Video (with renegotiation!) ───

    const toggleVideo = useCallback(async () => {
        const stream = localStreamRef.current;
        if (!stream) return;

        if (isVideoEnabled) {
            // ── OFF ──
            stream.getVideoTracks().forEach(t => { t.stop(); stream.removeTrack(t); });
            pcsRef.current.forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) pc.removeTrack(sender);
            });
            setIsVideoEnabled(false);
            setLocalStream(new MediaStream(stream.getTracks()));
            log('Video OFF');

            // Update DB so remote users know camera is off
            if (channelIdRef.current && userIdRef.current) {
                supabase.from('discord_voice_participants')
                    .update({ is_camera_on: false })
                    .eq('channel_id', channelIdRef.current)
                    .eq('user_id', userIdRef.current)
                    .then(() => log('DB: camera off'));
            }

            // Renegotiate so remote knows video track is gone
            await renegotiateAll();

        } else {
            // ── ON ──
            try {
                const constraints: MediaTrackConstraints = selectedCameraId
                    ? { deviceId: { exact: selectedCameraId } }
                    : true as any;

                const vs = await navigator.mediaDevices.getUserMedia({ video: constraints });
                const vt = vs.getVideoTracks()[0];
                stream.addTrack(vt);

                // Add video track to all existing PCs
                pcsRef.current.forEach(pc => {
                    pc.addTrack(vt, stream);
                });

                setIsVideoEnabled(true);
                setLocalStream(new MediaStream(stream.getTracks()));
                log('Video ON');

                // Update DB so remote users know camera is on
                if (channelIdRef.current && userIdRef.current) {
                    supabase.from('discord_voice_participants')
                        .update({ is_camera_on: true })
                        .eq('channel_id', channelIdRef.current)
                        .eq('user_id', userIdRef.current)
                        .then(() => log('DB: camera on'));
                }

                // Renegotiate so remote peer adds the video track
                await renegotiateAll();

            } catch (e: any) {
                log(`Camera err: ${e.message}`);
                toast({ title: 'Error de cámara', description: e.message, variant: 'destructive' });
            }
        }
    }, [isVideoEnabled, selectedCameraId, toast, log, renegotiateAll]);

    // ─── Switch Camera ───

    const switchCamera = useCallback(async (deviceId: string) => {
        setSelectedCameraId(deviceId);

        // If video is currently on, switch immediately
        if (!isVideoEnabled || !localStreamRef.current) return;
        const stream = localStreamRef.current;

        // Stop current video track
        stream.getVideoTracks().forEach(t => { t.stop(); stream.removeTrack(t); });

        try {
            const vs = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
            const newVt = vs.getVideoTracks()[0];
            stream.addTrack(newVt);

            // Replace track on all PCs (use replaceTrack to avoid renegotiation)
            pcsRef.current.forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(newVt);
                } else {
                    pc.addTrack(newVt, stream);
                }
            });

            setLocalStream(new MediaStream(stream.getTracks()));
            log(`Camera switched to ${deviceId.slice(0, 8)}`);
        } catch (e: any) {
            log(`Switch camera err: ${e.message}`);
            toast({ title: 'Error al cambiar cámara', description: e.message, variant: 'destructive' });
        }
    }, [isVideoEnabled, toast, log]);

    // ─── Screen Share ───

    const startScreenShare = useCallback(async () => {
        const stream = localStreamRef.current;
        if (!stream) return;

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });

            screenStreamRef.current = screenStream;
            const screenTrack = screenStream.getVideoTracks()[0];

            // Add screen track to all existing PCs
            pcsRef.current.forEach(pc => {
                pc.addTrack(screenTrack, screenStream);
            });

            setIsScreenSharing(true);
            log('Screen share ON');

            // Update DB
            if (channelIdRef.current && userIdRef.current) {
                supabase.from('discord_voice_participants')
                    .update({ is_screen_sharing: true })
                    .eq('channel_id', channelIdRef.current)
                    .eq('user_id', userIdRef.current)
                    .then(() => log('DB: screen share on'));
            }

            // Renegotiate so peers receive the screen track
            await renegotiateAll();

            // Auto-stop when user clicks "Stop sharing" in browser UI
            screenTrack.onended = () => {
                stopScreenShareInternal();
            };
        } catch (e: any) {
            log(`Screen share err: ${e.message}`);
            // User cancelled the dialog — not an error
        }
    }, [toast, log, renegotiateAll]);

    const stopScreenShareInternal = useCallback(async () => {
        const screenStream = screenStreamRef.current;
        if (screenStream) {
            screenStream.getTracks().forEach(t => t.stop());

            // Remove screen tracks from PCs
            pcsRef.current.forEach(pc => {
                pc.getSenders().forEach(sender => {
                    if (sender.track && screenStream.getTracks().some(t => t.id === sender.track!.id)) {
                        try { pc.removeTrack(sender); } catch { }
                    }
                });
            });

            screenStreamRef.current = null;
        }

        setIsScreenSharing(false);
        log('Screen share OFF');

        // Update DB
        if (channelIdRef.current && userIdRef.current) {
            supabase.from('discord_voice_participants')
                .update({ is_screen_sharing: false })
                .eq('channel_id', channelIdRef.current)
                .eq('user_id', userIdRef.current)
                .then(() => log('DB: screen share off'));
        }

        await renegotiateAll();
    }, [log, renegotiateAll]);

    const stopScreenShare = useCallback(async () => {
        await stopScreenShareInternal();
    }, [stopScreenShareInternal]);

    return {
        localStream,
        remoteStreams,
        isAudioEnabled,
        isVideoEnabled,
        isScreenSharing,
        toggleAudio,
        toggleVideo,
        peerStates,
        cameras,
        selectedCameraId,
        switchCamera,
        startScreenShare,
        stopScreenShare,
        screenStream: screenStreamRef.current,
    };
}

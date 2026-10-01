import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { ICE_SERVERS } from '@/lib/webrtc-config';

// ═══ Global cleanup on tab close/refresh ═══
const activeStreams = new Set<MediaStream>();
let _globalUserId: string | null = null;

function cleanupOnUnload() {
    activeStreams.forEach(s => s.getTracks().forEach(t => t.stop()));
    activeStreams.clear();

    if (_globalUserId) {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (url && key) {
            const token = localStorage.getItem('sb-' + new URL(url).hostname.split('.')[0] + '-auth-token');
            let accessToken = key;
            if (token) {
                try { accessToken = JSON.parse(token).access_token || key; } catch { }
            }
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

export interface RemoteMediaState {
    isCameraOn: boolean;
    isScreenSharing: boolean;
    isAudioEnabled: boolean;
}

interface UseRobustDiscordProps {
    channelId: string | null;
}

export function useRobustDiscord({ channelId }: UseRobustDiscordProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [peerStates, setPeerStates] = useState<Map<string, string>>(new Map());
    const [cameras, setCameras] = useState<CameraDevice[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string>('');
    const [remoteMediaStates, setRemoteMediaStates] = useState<Map<string, RemoteMediaState>>(new Map());
    const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());

    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);
    const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
    const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
    const remoteScreenStreamsRef = useRef<Map<string, MediaStream>>(new Map());
    const sigRef = useRef<RealtimeChannel | null>(null);
    const channelIdRef = useRef<string | null>(null);
    const userIdRef = useRef<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const isSpeakingLocalRef = useRef<boolean>(false);
    const isVideoEnabledRef = useRef(false);
    const isScreenSharingRef = useRef(false);
    const isAudioEnabledRef = useRef(true);

    useEffect(() => { channelIdRef.current = channelId; }, [channelId]);
    useEffect(() => { userIdRef.current = user?.id ?? null; _globalUserId = user?.id ?? null; }, [user?.id]);
    useEffect(() => { isVideoEnabledRef.current = isVideoEnabled; }, [isVideoEnabled]);
    useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]);
    useEffect(() => { isAudioEnabledRef.current = isAudioEnabled; }, [isAudioEnabled]);

    const log = useCallback((msg: string) => console.log(`[Tabetalk WebRTC] ${msg}`), []);

    // Helper: find the video sender (including pre-negotiated transceiver with null track)
    const findVideoSender = useCallback((pc: RTCPeerConnection): RTCRtpSender | undefined => {
        const withTrack = pc.getSenders().find(s => s.track?.kind === 'video');
        if (withTrack) return withTrack;
        const transceiver = pc.getTransceivers().find(t => t.receiver.track?.kind === 'video' || t.mid === 'video');
        return transceiver?.sender;
    }, []);

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

    useEffect(() => { refreshCameras(); }, []);

    // ─── Peer Cleanup ───
    const closePeer = useCallback((id: string) => {
        const pc = pcsRef.current.get(id);
        if (pc) {
            try { pc.close(); } catch { }
            pcsRef.current.delete(id);
        }
        pendingCandidatesRef.current.delete(id);
        remoteStreamsRef.current.delete(id);
        remoteScreenStreamsRef.current.delete(id);
        setRemoteStreams(p => { const m = new Map(p); m.delete(id); return m; });
        setRemoteScreenStreams(p => { const m = new Map(p); m.delete(id); return m; });
        setRemoteMediaStates(p => { const m = new Map(p); m.delete(id); return m; });
        setPeerStates(p => { const m = new Map(p); m.delete(id); return m; });
        setSpeakingUsers(p => { const s = new Set(p); s.delete(id); return s; });
    }, []);

    const cleanupAll = useCallback(() => {
        log('Cleanup all media and connections');
        const myId = userIdRef.current;
        if (sigRef.current && myId) {
            try {
                sigRef.current.send({
                    type: 'broadcast',
                    event: 'user-left',
                    payload: { userId: myId, from: myId },
                });
                sigRef.current.send({
                    type: 'broadcast',
                    event: 'signaling',
                    payload: { type: 'user-left', from: myId },
                });
            } catch { }
        }

        if (audioContextRef.current) {
            try { audioContextRef.current.close(); } catch { }
            audioContextRef.current = null;
        }
        const s = localStreamRef.current;
        if (s) {
            s.getTracks().forEach(t => t.stop());
            activeStreams.delete(s);
            localStreamRef.current = null;
        }
        const cs = cameraStreamRef.current;
        if (cs) {
            cs.getTracks().forEach(t => t.stop());
            cameraStreamRef.current = null;
        }
        const ss = screenStreamRef.current;
        if (ss) {
            ss.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
        }
        setLocalStream(null);
        setScreenStream(null);
        setIsScreenSharing(false);
        pcsRef.current.forEach(pc => {
            try { pc.close(); } catch { }
        });
        pcsRef.current.clear();
        pendingCandidatesRef.current.clear();
        remoteStreamsRef.current.clear();
        remoteScreenStreamsRef.current.clear();
        setRemoteStreams(new Map());
        setRemoteScreenStreams(new Map());
        setRemoteMediaStates(new Map());
        setPeerStates(new Map());
        setSpeakingUsers(new Set());
        setIsAudioEnabled(true);
        setIsVideoEnabled(false);

        if (sigRef.current) {
            supabase.removeChannel(sigRef.current);
            sigRef.current = null;
        }
    }, [log]);

    // ─── Drain pending candidates ───
    const drainPendingCandidates = useCallback(async (targetId: string, pc: RTCPeerConnection) => {
        const queue = pendingCandidatesRef.current.get(targetId);
        if (queue && queue.length > 0) {
            log(`Draining ${queue.length} pending ICE candidates for ${targetId.slice(0, 8)}`);
            pendingCandidatesRef.current.delete(targetId);
            for (const cand of queue) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch (e: any) {
                    console.warn(`[Tabetalk] Error draining candidate: ${e.message}`);
                }
            }
        }
    }, [log]);

    // ─── Broadcast Media State ───
    const broadcastMediaState = useCallback((cameraOn: boolean, screenSharing: boolean, audioOn: boolean) => {
        const myId = userIdRef.current;
        if (!myId || !sigRef.current) return;
        const payload = {
            type: 'media-state',
            from: myId,
            isCameraOn: cameraOn,
            isScreenSharing: screenSharing,
            isAudioEnabled: audioOn,
        };
        sigRef.current.send({
            type: 'broadcast',
            event: 'signal:media-state',
            payload,
        });
        sigRef.current.send({
            type: 'broadcast',
            event: 'signaling',
            payload,
        });
    }, []);

    // ─── Renegotiation Helper ───
    const renegotiateWith = useCallback(async (targetId: string, pc: RTCPeerConnection) => {
        const myId = userIdRef.current;
        if (!myId || !sigRef.current) return;
        try {
            if (pc.signalingState !== 'stable') {
                log(`Signaling state is ${pc.signalingState} with ${targetId.slice(0, 8)}, retrying in 300ms`);
                setTimeout(() => {
                    const currentPC = pcsRef.current.get(targetId);
                    if (currentPC && currentPC.signalingState === 'stable') {
                        renegotiateWith(targetId, currentPC);
                    }
                }, 300);
                return;
            }
            log(`Initiating renegotiation offer to ${targetId.slice(0, 8)}`);
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            if (pc.signalingState !== 'stable') return;
            await pc.setLocalDescription(offer);

            const payload = { type: 'offer', offer: pc.localDescription, from: myId, to: targetId };
            sigRef.current.send({
                type: 'broadcast',
                event: 'signal:offer',
                payload,
            });
            sigRef.current.send({
                type: 'broadcast',
                event: 'signaling',
                payload,
            });
            log(`Renegotiation offer sent to ${targetId.slice(0, 8)}`);
        } catch (e: any) {
            log(`Renegotiation error with ${targetId.slice(0, 8)}: ${e.message}`);
        }
    }, [log]);

    const renegotiateAllPeers = useCallback(() => {
        pcsRef.current.forEach((pc, targetId) => {
            renegotiateWith(targetId, pc);
        });
    }, [renegotiateWith]);

    // ─── Peer Connection Factory ───
    const makePC = useCallback((targetId: string, stream: MediaStream): RTCPeerConnection => {
        const old = pcsRef.current.get(targetId);
        if (old) {
            try { old.close(); } catch { }
            pcsRef.current.delete(targetId);
        }

        log(`Creating RTCPeerConnection for ${targetId.slice(0, 8)} with ICE STUN servers`);
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcsRef.current.set(targetId, pc);

        // 1. Add all audio tracks from local mic
        stream.getAudioTracks().forEach(track => {
            pc.addTrack(track, stream);
        });

        // 2. Ensure video transceiver is pre-negotiated for fast seamless track swapping
        let activeVideoTrack: MediaStreamTrack | null = null;
        if (screenStreamRef.current && screenStreamRef.current.getVideoTracks().length > 0) {
            activeVideoTrack = screenStreamRef.current.getVideoTracks()[0];
        } else if (cameraStreamRef.current && cameraStreamRef.current.getVideoTracks().length > 0) {
            activeVideoTrack = cameraStreamRef.current.getVideoTracks()[0];
        }

        if (activeVideoTrack) {
            pc.addTrack(activeVideoTrack, stream);
        } else {
            pc.addTransceiver('video', { direction: 'sendrecv' });
        }

        pc.onnegotiationneeded = () => {
            log(`onnegotiationneeded event fired for ${targetId.slice(0, 8)}`);
            renegotiateWith(targetId, pc);
        };

        pc.ontrack = (ev) => {
            log(`Track received from ${targetId.slice(0, 8)}: kind=${ev.track.kind}, id=${ev.track.id}`);
            let rStream = remoteStreamsRef.current.get(targetId);

            if (ev.streams && ev.streams[0]) {
                rStream = ev.streams[0];
                remoteStreamsRef.current.set(targetId, rStream);
            } else {
                if (!rStream) {
                    rStream = new MediaStream();
                    remoteStreamsRef.current.set(targetId, rStream);
                }
                const alreadyHasTrack = rStream.getTracks().some(t => t.id === ev.track.id);
                if (!alreadyHasTrack) {
                    rStream.addTrack(ev.track);
                }
            }

            if (ev.track.kind === 'video') {
                remoteScreenStreamsRef.current.set(targetId, rStream);
                setRemoteScreenStreams(new Map(remoteScreenStreamsRef.current));
            }

            const updateStreams = () => {
                setRemoteStreams(new Map(remoteStreamsRef.current));
            };

            ev.track.onended = () => {
                log(`Track ${ev.track.kind} ended from ${targetId.slice(0, 8)}`);
                updateStreams();
            };
            ev.track.onunmute = () => {
                log(`Track ${ev.track.kind} unmuted from ${targetId.slice(0, 8)}`);
                updateStreams();
            };
            ev.track.onmute = () => {
                log(`Track ${ev.track.kind} muted from ${targetId.slice(0, 8)}`);
                updateStreams();
            };

            setRemoteStreams(new Map(remoteStreamsRef.current));
        };

        pc.onicecandidate = (ev) => {
            if (ev.candidate && sigRef.current) {
                const myId = userIdRef.current;
                const payload = {
                    type: 'ice-candidate',
                    candidate: ev.candidate.toJSON(),
                    from: myId,
                    to: targetId,
                };
                sigRef.current.send({
                    type: 'broadcast',
                    event: 'signal:ice-candidate',
                    payload,
                });
                sigRef.current.send({
                    type: 'broadcast',
                    event: 'signaling',
                    payload,
                });
            }
        };

        pc.onconnectionstatechange = () => {
            log(`Connection state with ${targetId.slice(0, 8)}: ${pc.connectionState}`);
            setPeerStates(p => { const m = new Map(p); m.set(targetId, pc.connectionState); return m; });
            if (pc.connectionState === 'failed') {
                log(`Attempting ICE restart for ${targetId.slice(0, 8)}`);
                pc.restartIce();
            }
        };

        return pc;
    }, [log, renegotiateWith]);

    // ─── Offer Creator ───
    const createOfferTo = useCallback(async (targetId: string, stream: MediaStream) => {
        log(`Initiating offer to ${targetId.slice(0, 8)}`);
        const pc = makePC(targetId, stream);
        try {
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(offer);
            const myId = userIdRef.current;
            const payload = { type: 'offer', offer: pc.localDescription, from: myId, to: targetId };

            sigRef.current?.send({
                type: 'broadcast',
                event: 'signal:offer',
                payload,
            });
            sigRef.current?.send({
                type: 'broadcast',
                event: 'signaling',
                payload,
            });
        } catch (e: any) {
            log(`Create offer error: ${e.message}`);
        }
    }, [makePC, log]);

    // ─── Signaling Dispatchers ───
    const handleOffer = useCallback(async (payload: any) => {
        const myId = userIdRef.current;
        if (!myId || payload.from === myId) return;
        if (payload.to && payload.to !== myId) return;

        const sid = payload.from as string;
        const stream = localStreamRef.current;
        log(`Received offer from ${sid.slice(0, 8)}`);
        if (!stream) return;

        let pc = pcsRef.current.get(sid);
        if (!pc) {
            pc = makePC(sid, stream);
        }

        try {
            if (pc.signalingState !== 'stable') {
                log(`Signaling glare detected with ${sid.slice(0, 8)}, state=${pc.signalingState}`);
                if (myId.localeCompare(sid) > 0) {
                    try {
                        await pc.setLocalDescription({ type: 'rollback' } as any);
                    } catch { }
                } else {
                    return;
                }
            }

            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
            await drainPendingCandidates(sid, pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            const answerPayload = { type: 'answer', answer: pc.localDescription, from: myId, to: sid };
            sigRef.current?.send({
                type: 'broadcast',
                event: 'signal:answer',
                payload: answerPayload,
            });
            sigRef.current?.send({
                type: 'broadcast',
                event: 'signaling',
                payload: answerPayload,
            });
            log(`Answer sent to ${sid.slice(0, 8)}`);

            broadcastMediaState(isVideoEnabledRef.current, isScreenSharingRef.current, isAudioEnabledRef.current);
        } catch (e: any) {
            log(`Offer error: ${e.message}`);
        }
    }, [makePC, drainPendingCandidates, broadcastMediaState, log]);

    const handleAnswer = useCallback(async (payload: any) => {
        const myId = userIdRef.current;
        if (!myId || payload.from === myId) return;
        if (payload.to && payload.to !== myId) return;

        const sid = payload.from as string;
        log(`Received answer from ${sid.slice(0, 8)}`);
        const pc = pcsRef.current.get(sid);
        if (!pc) return;
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            await drainPendingCandidates(sid, pc);
            log(`Handshake WebRTC established successfully with ${sid.slice(0, 8)}`);
        } catch (e: any) {
            log(`Answer error: ${e.message}`);
        }
    }, [drainPendingCandidates, log]);

    const handleIceCandidate = useCallback(async (payload: any) => {
        const myId = userIdRef.current;
        if (!myId || payload.from === myId) return;
        if (payload.to && payload.to !== myId) return;

        const sid = payload.from as string;
        const pc = pcsRef.current.get(sid);
        if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
            const queue = pendingCandidatesRef.current.get(sid) || [];
            queue.push(payload.candidate);
            pendingCandidatesRef.current.set(sid, queue);
            return;
        }
        try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e: any) {
            console.warn(`[Tabetalk] Error adding ICE candidate: ${e.message}`);
        }
    }, []);

    const handleMediaState = useCallback((payload: any) => {
        const sid = payload.from as string;
        if (!sid || sid === userIdRef.current) return;

        setRemoteMediaStates(prev => {
            const next = new Map(prev);
            next.set(sid, {
                isCameraOn: Boolean(payload.isCameraOn),
                isScreenSharing: Boolean(payload.isScreenSharing),
                isAudioEnabled: payload.isAudioEnabled !== false,
            });
            return next;
        });

        if (!payload.isCameraOn && !payload.isScreenSharing) {
            const rStream = remoteStreamsRef.current.get(sid);
            if (rStream) {
                rStream.getVideoTracks().forEach(t => {
                    try { rStream.removeTrack(t); } catch { }
                });
                setRemoteStreams(new Map(remoteStreamsRef.current));
            }
        }
    }, []);

    const handleSpeaking = useCallback((payload: any) => {
        const sid = payload.from as string;
        if (!sid) return;
        setSpeakingUsers(prev => {
            const next = new Set(prev);
            if (payload.isSpeaking) next.add(sid);
            else next.delete(sid);
            return next;
        });
    }, []);

    // ─── Setup Voice Activity Detection ───
    const setupLocalVAD = useCallback((stream: MediaStream) => {
        try {
            if (audioContextRef.current) {
                try { audioContextRef.current.close(); } catch { }
            }
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;

            const ctx = new AudioCtx();
            audioContextRef.current = ctx;

            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const checkAudio = () => {
                if (!audioContextRef.current) return;
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                const speaking = average > 14;

                if (speaking !== isSpeakingLocalRef.current) {
                    isSpeakingLocalRef.current = speaking;
                    const myId = userIdRef.current;
                    if (myId) {
                        setSpeakingUsers(prev => {
                            const next = new Set(prev);
                            if (speaking) next.add(myId);
                            else next.delete(myId);
                            return next;
                        });
                        const payload = { type: 'speaking', isSpeaking: speaking, from: myId };
                        sigRef.current?.send({
                            type: 'broadcast',
                            event: 'signal:speaking',
                            payload,
                        });
                        sigRef.current?.send({
                            type: 'broadcast',
                            event: 'signaling',
                            payload,
                        });
                    }
                }
                requestAnimationFrame(checkAudio);
            };
            requestAnimationFrame(checkAudio);
        } catch (e) {
            console.warn('[Tabetalk VAD] Error initializing audio analyzer:', e);
        }
    }, []);

    // ═══ Main Effect: Join Voice Room ═══
    useEffect(() => {
        if (!channelId || !user) {
            cleanupAll();
            return;
        }

        let cancelled = false;
        log(`Joining Tabetalk Room: room:${channelId}`);

        const start = async () => {
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                    video: false,
                });
            } catch (e: any) {
                toast({ title: 'Permiso de micrófono requerido', description: e.message, variant: 'destructive' });
                return;
            }
            if (cancelled) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            activeStreams.add(stream);
            localStreamRef.current = stream;
            setLocalStream(stream);
            setIsAudioEnabled(true);
            setIsVideoEnabled(false);
            setupLocalVAD(stream);
            await refreshCameras();

            // Setup Realtime broadcast & presence channel: room:${channelId}
            const channel = supabase.channel(`room:${channelId}`, {
                config: { broadcast: { self: false }, presence: { key: user.id } },
            });

            // 1. Specific signaling events
            channel.on('broadcast', { event: 'user-joined' }, ({ payload }) => {
                if (cancelled || !payload?.userId || payload.userId === user.id) return;
                log(`user-joined event from: ${payload.userId.slice(0, 8)}`);
                // Existing peer creates offer to newcomer
                createOfferTo(payload.userId, stream);
            });

            channel.on('broadcast', { event: 'signal:offer' }, ({ payload }) => {
                if (!cancelled) handleOffer(payload);
            });

            channel.on('broadcast', { event: 'signal:answer' }, ({ payload }) => {
                if (!cancelled) handleAnswer(payload);
            });

            channel.on('broadcast', { event: 'signal:ice-candidate' }, ({ payload }) => {
                if (!cancelled) handleIceCandidate(payload);
            });

            channel.on('broadcast', { event: 'signal:media-state' }, ({ payload }) => {
                if (!cancelled) handleMediaState(payload);
            });

            channel.on('broadcast', { event: 'signal:speaking' }, ({ payload }) => {
                if (!cancelled) handleSpeaking(payload);
            });

            channel.on('broadcast', { event: 'user-left' }, ({ payload }) => {
                const leftId = payload?.userId || payload?.from;
                if (!leftId || leftId === user.id) return;
                log(`user-left event from: ${leftId.slice(0, 8)}`);
                closePeer(leftId);
            });

            // Backward compatibility generic signaling event
            channel.on('broadcast', { event: 'signaling' }, ({ payload }) => {
                if (cancelled) return;
                switch (payload.type) {
                    case 'offer': handleOffer(payload); break;
                    case 'answer': handleAnswer(payload); break;
                    case 'ice-candidate': handleIceCandidate(payload); break;
                    case 'media-state': handleMediaState(payload); break;
                    case 'speaking': handleSpeaking(payload); break;
                    case 'user-left': closePeer(payload.from); break;
                }
            });

            // Presence fallbacks
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
                closePeer(key);
            });

            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && !cancelled) {
                    await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
                    sigRef.current = channel;

                    // Announce user-joined to all connected peers
                    channel.send({
                        type: 'broadcast',
                        event: 'user-joined',
                        payload: { userId: user.id, from: user.id },
                    });

                    // Check existing peers already in the room
                    setTimeout(() => {
                        if (cancelled) return;
                        const others = Object.keys(channel.presenceState()).filter(id => id !== user.id);
                        log(`Found ${others.length} existing participant(s) in room`);
                        others.forEach(id => {
                            if (user.id.localeCompare(id) < 0) {
                                createOfferTo(id, stream);
                            }
                        });
                    }, 400);
                }
            });
        };

        start();
        return () => {
            cancelled = true;
            cleanupAll();
        };
    }, [channelId, user?.id, setupLocalVAD, refreshCameras, createOfferTo, handleOffer, handleAnswer, handleIceCandidate, handleMediaState, handleSpeaking, closePeer, cleanupAll, toast, log]);

    // ─── Toggle Audio ───
    const toggleAudio = useCallback(() => {
        const s = localStreamRef.current;
        if (!s) return;
        const next = !isAudioEnabled;
        s.getAudioTracks().forEach(t => { t.enabled = next; });
        setIsAudioEnabled(next);
        broadcastMediaState(isVideoEnabled, isScreenSharing, next);
    }, [isAudioEnabled, isVideoEnabled, isScreenSharing, broadcastMediaState]);

    // ─── Toggle Video ───
    const toggleVideo = useCallback(async () => {
        const mainStream = localStreamRef.current;
        if (!mainStream) return;

        if (isVideoEnabled) {
            // Turning camera OFF
            if (cameraStreamRef.current) {
                cameraStreamRef.current.getTracks().forEach(t => {
                    t.enabled = false;
                    try { t.stop(); } catch { }
                });
                cameraStreamRef.current = null;
            }
            mainStream.getVideoTracks().forEach(t => {
                t.enabled = false;
                try { t.stop(); } catch { }
                mainStream.removeTrack(t);
            });

            if (!isScreenSharing) {
                pcsRef.current.forEach(pc => {
                    const sender = findVideoSender(pc);
                    if (sender) sender.replaceTrack(null);
                });
            }

            setIsVideoEnabled(false);
            setLocalStream(new MediaStream(mainStream.getTracks()));
            broadcastMediaState(false, isScreenSharing, isAudioEnabled);
            log('Camera turned OFF');
            renegotiateAllPeers();
        } else {
            // Turning camera ON
            try {
                const constraints: MediaTrackConstraints = selectedCameraId
                    ? { deviceId: { exact: selectedCameraId } }
                    : true as any;

                const vs = await navigator.mediaDevices.getUserMedia({ video: constraints });
                const vt = vs.getVideoTracks()[0];
                cameraStreamRef.current = vs;

                mainStream.getVideoTracks().forEach(t => {
                    t.enabled = false;
                    try { t.stop(); } catch { }
                    mainStream.removeTrack(t);
                });
                mainStream.addTrack(vt);

                if (!isScreenSharing) {
                    pcsRef.current.forEach(pc => {
                        const transceiver = pc.getTransceivers().find(t => t.receiver.track?.kind === 'video' || t.mid === 'video');
                        if (transceiver) {
                            transceiver.direction = 'sendrecv';
                        }
                        const sender = findVideoSender(pc);
                        if (sender) {
                            sender.replaceTrack(vt);
                        } else {
                            pc.addTrack(vt, mainStream);
                        }
                    });
                }

                setIsVideoEnabled(true);
                setLocalStream(new MediaStream(mainStream.getTracks()));
                broadcastMediaState(true, isScreenSharing, isAudioEnabled);
                log('Camera turned ON');
                renegotiateAllPeers();
            } catch (e: any) {
                log(`Camera error: ${e.message}`);
                toast({ title: 'No se pudo acceder a la cámara', description: e.message, variant: 'destructive' });
            }
        }
    }, [isVideoEnabled, isScreenSharing, isAudioEnabled, selectedCameraId, broadcastMediaState, findVideoSender, renegotiateAllPeers, toast, log]);

    // ─── Switch Camera ───
    const switchCamera = useCallback(async (deviceId: string) => {
        setSelectedCameraId(deviceId);
        if (!isVideoEnabled || !localStreamRef.current) return;
        const mainStream = localStreamRef.current;

        try {
            const vs = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
            const newVt = vs.getVideoTracks()[0];

            if (cameraStreamRef.current) {
                cameraStreamRef.current.getTracks().forEach(t => {
                    t.enabled = false;
                    try { t.stop(); } catch { }
                });
            }
            cameraStreamRef.current = vs;

            mainStream.getVideoTracks().forEach(t => {
                t.enabled = false;
                try { t.stop(); } catch { }
                mainStream.removeTrack(t);
            });
            mainStream.addTrack(newVt);

            if (!isScreenSharing) {
                pcsRef.current.forEach(pc => {
                    const transceiver = pc.getTransceivers().find(t => t.receiver.track?.kind === 'video' || t.mid === 'video');
                    if (transceiver) {
                        transceiver.direction = 'sendrecv';
                    }
                    const sender = findVideoSender(pc);
                    if (sender) sender.replaceTrack(newVt);
                });
            }

            setLocalStream(new MediaStream(mainStream.getTracks()));
            log(`Camera switched to ${deviceId}`);
            renegotiateAllPeers();
        } catch (e: any) {
            toast({ title: 'Error al cambiar cámara', description: e.message, variant: 'destructive' });
        }
    }, [isVideoEnabled, isScreenSharing, findVideoSender, renegotiateAllPeers, toast, log]);

    // ─── Screen Share ───
    const stopScreenShare = useCallback(async () => {
        const screen = screenStreamRef.current;
        if (screen) {
            screen.getTracks().forEach(t => {
                t.enabled = false;
                try { t.stop(); } catch { }
            });
            screenStreamRef.current = null;
        }

        setIsScreenSharing(false);
        setScreenStream(null);

        // Restore camera video track if enabled, otherwise replace with null
        const cameraTrack = isVideoEnabled ? cameraStreamRef.current?.getVideoTracks()[0] || null : null;
        pcsRef.current.forEach(pc => {
            const sender = findVideoSender(pc);
            if (sender) {
                sender.replaceTrack(cameraTrack);
            }
        });

        broadcastMediaState(isVideoEnabled, false, isAudioEnabled);
        log('Screen share ended, restored camera track');
        renegotiateAllPeers();
    }, [isVideoEnabled, isAudioEnabled, broadcastMediaState, findVideoSender, renegotiateAllPeers, log]);

    const startScreenShare = useCallback(async () => {
        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });

            screenStreamRef.current = displayStream;
            setScreenStream(displayStream);
            const screenTrack = displayStream.getVideoTracks()[0];

            // Dynamically replace video track on all peer connections
            pcsRef.current.forEach(pc => {
                const transceiver = pc.getTransceivers().find(t => t.receiver.track?.kind === 'video' || t.mid === 'video');
                if (transceiver) {
                    transceiver.direction = 'sendrecv';
                }
                const sender = findVideoSender(pc);
                if (sender) {
                    sender.replaceTrack(screenTrack);
                } else {
                    pc.addTrack(screenTrack, displayStream);
                }
            });

            setIsScreenSharing(true);
            broadcastMediaState(isVideoEnabled, true, isAudioEnabled);
            log('Screen share started using replaceTrack');
            renegotiateAllPeers();

            screenTrack.onended = () => {
                stopScreenShare();
            };
        } catch (e: any) {
            log(`Screen share cancelled or error: ${e.message}`);
        }
    }, [isVideoEnabled, isAudioEnabled, stopScreenShare, broadcastMediaState, findVideoSender, renegotiateAllPeers, log]);

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
        screenStream,
        remoteScreenStreams,
        remoteMediaStates,
        speakingUsers,
    };
}

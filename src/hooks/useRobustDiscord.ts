/* REGLA ARQUITECTÓNICA: NINGÚN COMPONENTE VISUAL, HOOK O FUNCIONALIDAD PÚBLICA DEBE CONDICIONARSE AL ROL ADMIN. TODOS LOS USUARIOS USAN LA MISMA UI Y LÓGICA DE NEGOCIO SALVO LA RUTA PRIVADA /admin */

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

    // Helper: buscar sender de video para replaceTrack en caliente
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

            sigRef.current.send({
                type: 'broadcast',
                event: 'webrtc-offer',
                payload: { targetId, senderId: myId, sdp: pc.localDescription },
            });
            sigRef.current.send({
                type: 'broadcast',
                event: 'signal:offer',
                payload: { type: 'offer', offer: pc.localDescription, from: myId, to: targetId },
            });
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
    const makePC = useCallback((targetId: string, stream?: MediaStream | null): RTCPeerConnection => {
        const old = pcsRef.current.get(targetId);
        if (old) {
            try { old.close(); } catch { }
            pcsRef.current.delete(targetId);
        }

        log(`Creating RTCPeerConnection for ${targetId.slice(0, 8)} with ICE STUN servers`);
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcsRef.current.set(targetId, pc);

        // Añadir pistas de audio y video si están disponibles
        if (stream && stream.getTracks().length > 0) {
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
        }

        // Asegurar transceiver para audio si no fue agregado
        const hasAudioSender = pc.getSenders().some(s => s.track?.kind === 'audio');
        if (!hasAudioSender) {
            pc.addTransceiver('audio', { direction: 'sendrecv' });
        }

        // Asegurar transceiver de video: SIEMPRE 'sendrecv' si tenemos video local o 'recvonly' si la cámara está apagada
        // Esto permite que usuarios sin cámara prendida reciban transmisiones y cámaras de otros sin problemas.
        let activeVideoTrack: MediaStreamTrack | null = null;
        if (screenStreamRef.current && screenStreamRef.current.getVideoTracks().length > 0) {
            activeVideoTrack = screenStreamRef.current.getVideoTracks()[0];
        } else if (cameraStreamRef.current && cameraStreamRef.current.getVideoTracks().length > 0) {
            activeVideoTrack = cameraStreamRef.current.getVideoTracks()[0];
        }

        const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
        const videoTransceiver = pc.getTransceivers().find(t => t.receiver.track?.kind === 'video' || t.mid === 'video');

        if (activeVideoTrack) {
            if (videoSender) {
                videoSender.replaceTrack(activeVideoTrack);
            } else {
                pc.addTrack(activeVideoTrack, stream || new MediaStream([activeVideoTrack]));
            }
            if (videoTransceiver) {
                videoTransceiver.direction = 'sendrecv';
            }
        } else {
            if (videoTransceiver) {
                videoTransceiver.direction = 'recvonly';
            } else {
                pc.addTransceiver('video', { direction: 'recvonly' });
            }
        }

        pc.onnegotiationneeded = () => {
            log(`onnegotiationneeded event fired for ${targetId.slice(0, 8)}`);
            renegotiateWith(targetId, pc);
        };

        pc.ontrack = (ev) => {
            console.log("[WebRTC] Recibiendo stream remoto de:", targetId);
            let rStream = remoteStreamsRef.current.get(targetId);

            if (ev.streams && ev.streams[0]) {
                rStream = ev.streams[0];
            } else {
                if (!rStream) {
                    rStream = new MediaStream();
                }
                if (!rStream.getTracks().some(t => t.id === ev.track.id)) {
                    rStream.addTrack(ev.track);
                }
            }

            // Sincronizar tracks activos de todos los receivers
            const allActiveTracks = pc.getReceivers()
                .map(r => r.track)
                .filter((t): t is MediaStreamTrack => !!t && t.readyState !== 'ended');

            if (allActiveTracks.length > 0) {
                rStream = new MediaStream(allActiveTracks);
            }

            remoteStreamsRef.current.set(targetId, rStream);
            setRemoteStreams(new Map(remoteStreamsRef.current));

            if (ev.track.kind === 'video') {
                remoteScreenStreamsRef.current.set(targetId, rStream);
                setRemoteScreenStreams(new Map(remoteScreenStreamsRef.current));
            }

            const updateStreams = () => {
                const currentTracks = pc.getReceivers()
                    .map(r => r.track)
                    .filter((t): t is MediaStreamTrack => !!t && t.readyState !== 'ended');
                const fresh = new MediaStream(currentTracks);
                remoteStreamsRef.current.set(targetId, fresh);
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
        };

        pc.onicecandidate = (ev) => {
            if (ev.candidate && sigRef.current) {
                const myId = userIdRef.current;
                const candJson = ev.candidate.toJSON();
                // Formato webrtc-ice explícito
                sigRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc-ice',
                    payload: { targetId, senderId: myId, candidate: candJson },
                });
                // Compatibilidad de eventos secundarios
                sigRef.current.send({
                    type: 'broadcast',
                    event: 'signal:ice-candidate',
                    payload: { type: 'ice-candidate', candidate: candJson, from: myId, to: targetId },
                });
            }
        };

        pc.onconnectionstatechange = () => {
            log(`Connection state with ${targetId.slice(0, 8)}: ${pc.connectionState}`);
            setPeerStates(p => { const m = new Map(p); m.set(targetId, pc.connectionState); return m; });
            if (pc.connectionState === 'connected') {
                console.log("[WebRTC] Conexión establecida con éxito.");
                // Forzar actualización de streams remotos
                const recTracks = pc.getReceivers().map(r => r.track).filter((t): t is MediaStreamTrack => !!t && t.readyState !== 'ended');
                if (recTracks.length > 0) {
                    const freshStream = new MediaStream(recTracks);
                    remoteStreamsRef.current.set(targetId, freshStream);
                    setRemoteStreams(new Map(remoteStreamsRef.current));
                }
            } else if (pc.connectionState === 'failed') {
                log(`Attempting ICE restart for ${targetId.slice(0, 8)}`);
                pc.restartIce();
            }
        };

        return pc;
    }, [log, renegotiateWith]);

    // ─── Emisor de Oferta ───
    // ─── Emisor de Oferta ───
    const createOfferTo = useCallback(async (targetId: string, stream?: MediaStream | null) => {
        const myId = userIdRef.current;
        if (!myId) return;

        // REGLA DETERMINISTA: Solo el peer con menor ID inicia la oferta
        if (myId.localeCompare(targetId) > 0) {
            log(`Skipping offer creation to ${targetId.slice(0, 8)} (callee waiting for incoming offer)`);
            return;
        }

        console.log("[WebRTC] Enviando oferta a:", targetId);
        const pc = makePC(targetId, stream || localStreamRef.current);
        try {
            const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await pc.setLocalDescription(offer);

            // Formato webrtc-offer oficial
            sigRef.current?.send({
                type: 'broadcast',
                event: 'webrtc-offer',
                payload: { targetId, senderId: myId, sdp: pc.localDescription },
            });
            // Compatibilidad
            sigRef.current?.send({
                type: 'broadcast',
                event: 'signal:offer',
                payload: { type: 'offer', offer: pc.localDescription, from: myId, to: targetId },
            });
        } catch (e: any) {
            log(`Create offer error: ${e.message}`);
        }
    }, [makePC, log]);

    // ─── Receptores de Señalización ───
    const handleOffer = useCallback(async (payload: any) => {
        const myId = userIdRef.current;
        const offer = payload.sdp || payload.offer;
        const senderId = payload.senderId || payload.from;
        const targetId = payload.targetId || payload.to;

        if (!myId || !offer || !senderId || senderId === myId) return;
        if (targetId && targetId !== myId) return;

        log(`Received offer from ${senderId.slice(0, 8)}`);

        // No descartar si localStream aún no resolvió (ej. en móviles esperando permiso de micrófono)
        let pc = pcsRef.current.get(senderId);
        if (!pc) {
            pc = makePC(senderId, localStreamRef.current);
        }

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            await drainPendingCandidates(senderId, pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // Formato webrtc-answer oficial
            sigRef.current?.send({
                type: 'broadcast',
                event: 'webrtc-answer',
                payload: { targetId: senderId, senderId: myId, sdp: pc.localDescription },
            });
            // Compatibilidad
            sigRef.current?.send({
                type: 'broadcast',
                event: 'signal:answer',
                payload: { type: 'answer', answer: pc.localDescription, from: myId, to: senderId },
            });

            // Enviar inmediatamente estado multimedia
            broadcastMediaState(isVideoEnabledRef.current, isScreenSharingRef.current, isAudioEnabledRef.current);

            // Extraer tracks activos recibidos y notificar a React
            const activeTracks = pc.getReceivers()
                .map(r => r.track)
                .filter((t): t is MediaStreamTrack => !!t && t.readyState !== 'ended');
            if (activeTracks.length > 0) {
                const freshStream = new MediaStream(activeTracks);
                remoteStreamsRef.current.set(senderId, freshStream);
                setRemoteStreams(new Map(remoteStreamsRef.current));
            }
        } catch (e: any) {
            log(`Offer error: ${e.message}`);
        }
    }, [makePC, drainPendingCandidates, broadcastMediaState, log]);

    const handleAnswer = useCallback(async (payload: any) => {
        const myId = userIdRef.current;
        const answer = payload.sdp || payload.answer;
        const senderId = payload.senderId || payload.from;
        const targetId = payload.targetId || payload.to;

        if (!myId || !answer || !senderId || senderId === myId) return;
        if (targetId && targetId !== myId) return;

        log(`Received answer from ${senderId.slice(0, 8)}`);
        const pc = pcsRef.current.get(senderId);
        if (!pc) return;
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            await drainPendingCandidates(senderId, pc);
            console.log("[WebRTC] Conexión establecida con éxito.");

            // Extraer tracks activos recibidos y notificar a React
            const activeTracks = pc.getReceivers()
                .map(r => r.track)
                .filter((t): t is MediaStreamTrack => !!t && t.readyState !== 'ended');
            if (activeTracks.length > 0) {
                const freshStream = new MediaStream(activeTracks);
                remoteStreamsRef.current.set(senderId, freshStream);
                setRemoteStreams(new Map(remoteStreamsRef.current));
            }
        } catch (e: any) {
            log(`Answer error: ${e.message}`);
        }
    }, [drainPendingCandidates, log]);

    const handleIceCandidate = useCallback(async (payload: any) => {
        const myId = userIdRef.current;
        const candidate = payload.candidate;
        const senderId = payload.senderId || payload.from;
        const targetId = payload.targetId || payload.to;

        if (!myId || !candidate || !senderId || senderId === myId) return;
        if (targetId && targetId !== myId) return;

        const pc = pcsRef.current.get(senderId);
        if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
            const queue = pendingCandidatesRef.current.get(senderId) || [];
            queue.push(candidate);
            pendingCandidatesRef.current.set(senderId, queue);
            return;
        }
        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e: any) {
            console.warn(`[Tabetalk] Error adding ICE candidate: ${e.message}`);
        }
    }, []);

    const handleMediaState = useCallback((payload: any) => {
        const sid = payload.from || payload.senderId;
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
        const sid = payload.from || payload.senderId;
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
                        sigRef.current?.send({
                            type: 'broadcast',
                            event: 'signal:speaking',
                            payload: { type: 'speaking', isSpeaking: speaking, from: myId },
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
        log(`Joining Tabetalk Room: tabetalk:${channelId}`);

        const start = async () => {
            let stream: MediaStream;
            const savedMicId = localStorage.getItem('tabetalk_audio_input_device');
            const echoCancel = localStorage.getItem('tabetalk_echo_cancellation') !== 'false';
            const noiseSupp = localStorage.getItem('tabetalk_noise_suppression') !== 'false';

            const audioConstraints: MediaTrackConstraints = {
                echoCancellation: echoCancel,
                noiseSuppression: noiseSupp,
                autoGainControl: true,
            };
            if (savedMicId && savedMicId !== 'default') {
                audioConstraints.deviceId = { ideal: savedMicId };
            }

            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: audioConstraints,
                    video: false,
                });
            } catch (e1: any) {
                console.warn('[Tabetalk WebRTC] Error con constraints avanzados de audio, probando fallback básico:', e1);
                try {
                    // Fallback a cualquier micrófono disponible
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                } catch (e2: any) {
                    console.warn('[Tabetalk WebRTC] No se pudo obtener micrófono físico, conectando como oyente:', e2);
                    toast({
                        title: 'Modo Oyente activado',
                        description: 'No se detectó micrófono o falta permiso. Puedes escuchar y ver a tus compañeros.',
                    });
                    // Fallback a pista de audio silenciosa para permitir conexión WebRTC como oyente
                    try {
                        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                        const ctx = new AudioCtx();
                        const osc = ctx.createOscillator();
                        const dst = ctx.createMediaStreamDestination();
                        osc.connect(dst);
                        osc.start();
                        const silentTrack = dst.stream.getAudioTracks()[0];
                        silentTrack.enabled = false;
                        stream = new MediaStream([silentTrack]);
                        setIsAudioEnabled(false);
                    } catch {
                        stream = new MediaStream();
                        setIsAudioEnabled(false);
                    }
                }
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

            // Vincular tracks locales a los RTCPeerConnection existentes (ej. por ofertas tempranas en móvil)
            pcsRef.current.forEach((pc) => {
                stream.getTracks().forEach(track => {
                    const sender = pc.getSenders().find(s => s.track?.kind === track.kind);
                    if (sender) {
                        sender.replaceTrack(track);
                    } else {
                        pc.addTrack(track, stream);
                    }
                });
            });

            // Configurar canal de señalización Realtime según especificación técnica: tabetalk:${roomId}
            const channel = supabase.channel(`tabetalk:${channelId}`, {
                config: { broadcast: { self: false }, presence: { key: user.id } },
            });

            console.log("[WebRTC] Usuario conectado a la sala:", user.id);

            // 1. Eventos WebRTC principales
            channel.on('broadcast', { event: 'webrtc-offer' }, ({ payload }) => {
                if (!cancelled) handleOffer(payload);
            });

            channel.on('broadcast', { event: 'webrtc-answer' }, ({ payload }) => {
                if (!cancelled) handleAnswer(payload);
            });

            channel.on('broadcast', { event: 'webrtc-ice' }, ({ payload }) => {
                if (!cancelled) handleIceCandidate(payload);
            });

            // 2. Eventos adicionales / compatibilidad
            channel.on('broadcast', { event: 'signal:offer' }, ({ payload }) => {
                if (!cancelled) handleOffer(payload);
            });

            channel.on('broadcast', { event: 'signal:answer' }, ({ payload }) => {
                if (!cancelled) handleAnswer(payload);
            });

            channel.on('broadcast', { event: 'signal:ice-candidate' }, ({ payload }) => {
                if (!cancelled) handleIceCandidate(payload);
            });

            channel.on('broadcast', { event: 'user-joined' }, ({ payload }) => {
                const newcomer = payload?.userId || payload?.senderId || payload?.from;
                if (cancelled || !newcomer || newcomer === user.id) return;
                // Si somos el caller determinista frente al recién llegado, ofertar
                if (user.id.localeCompare(newcomer) < 0) {
                    createOfferTo(newcomer, localStreamRef.current);
                } else {
                    // Si somos el callee, enviar media-state para que el caller nos conozca
                    broadcastMediaState(isVideoEnabledRef.current, isScreenSharingRef.current, isAudioEnabledRef.current);
                }
            });

            channel.on('broadcast', { event: 'signal:media-state' }, ({ payload }) => {
                if (!cancelled) handleMediaState(payload);
            });

            channel.on('broadcast', { event: 'signal:speaking' }, ({ payload }) => {
                if (!cancelled) handleSpeaking(payload);
            });

            channel.on('broadcast', { event: 'user-left' }, ({ payload }) => {
                const leftId = payload?.userId || payload?.senderId || payload?.from;
                if (!leftId || leftId === user.id) return;
                closePeer(leftId);
            });

            // 3. Sincronización de Presencia: al detectar usuarios existentes en sala, el caller genera oferta
            channel.on('presence', { event: 'sync' }, () => {
                if (cancelled) return;
                const state = channel.presenceState();
                const others = Object.keys(state).filter(id => id !== user.id);
                others.forEach(remoteUserId => {
                    if (user.id.localeCompare(remoteUserId) < 0) {
                        createOfferTo(remoteUserId, stream);
                    }
                });
            });

            channel.on('presence', { event: 'join' }, ({ key }) => {
                if (cancelled || !key || key === user.id) return;
                if (user.id.localeCompare(key) < 0) {
                    createOfferTo(key, stream);
                }
            });

            channel.on('presence', { event: 'leave' }, ({ key }) => {
                if (!key || key === user.id) return;
                closePeer(key);
            });

            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && !cancelled) {
                    await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
                    sigRef.current = channel;

                    // Anunciar llegada a todos los pares
                    channel.send({
                        type: 'broadcast',
                        event: 'user-joined',
                        payload: { userId: user.id, senderId: user.id },
                    });

                    // Revisar participantes que ya estaban presentes
                    setTimeout(() => {
                        if (cancelled) return;
                        const others = Object.keys(channel.presenceState()).filter(id => id !== user.id);
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
            // Apagar cámara
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
                    // Al apagar la cámara, volvemos a 'recvonly' para seguir recibiendo video de otros usuarios
                    const transceiver = pc.getTransceivers().find(t => t.receiver.track?.kind === 'video' || t.mid === 'video');
                    if (transceiver) {
                        transceiver.direction = 'recvonly';
                    }
                    const sender = findVideoSender(pc);
                    if (sender) sender.replaceTrack(null);
                });
            }

            setIsVideoEnabled(false);
            setLocalStream(new MediaStream(mainStream.getTracks()));
            broadcastMediaState(false, isScreenSharing, isAudioEnabled);
            log('Camera turned OFF');
            renegotiateAllPeers();

            // Sincronizar en base de datos si estamos en un canal
            const curCh = channelIdRef.current;
            const curUid = userIdRef.current;
            if (curCh && curUid) {
                supabase.from('discord_voice_participants')
                    .update({ is_camera_on: false })
                    .eq('channel_id', curCh)
                    .eq('user_id', curUid)
                    .then();
            }
        } else {
            // Encender cámara con fallback inteligente de constraints
            try {
                let vs: MediaStream;
                const targetCameraId = selectedCameraId || localStorage.getItem('tabetalk_video_input_device') || '';

                try {
                    if (targetCameraId && targetCameraId !== 'default') {
                        vs = await navigator.mediaDevices.getUserMedia({
                            video: { deviceId: { ideal: targetCameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
                        });
                    } else {
                        vs = await navigator.mediaDevices.getUserMedia({
                            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
                        });
                    }
                } catch (e1) {
                    console.warn('[Tabetalk WebRTC] Error con constraints de cámara ideales, probando fallback básico:', e1);
                    vs = await navigator.mediaDevices.getUserMedia({ video: true });
                }

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

                // Sincronizar en base de datos si estamos en un canal
                const curCh = channelIdRef.current;
                const curUid = userIdRef.current;
                if (curCh && curUid) {
                    supabase.from('discord_voice_participants')
                        .update({ is_camera_on: true })
                        .eq('channel_id', curCh)
                        .eq('user_id', curUid)
                        .then();
                }
            } catch (e: any) {
                log(`Camera error: ${e.message}`);
                toast({ title: 'No se pudo acceder a la cámara', description: e.message || 'Verifica los permisos del navegador', variant: 'destructive' });
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

        const cameraTrack = isVideoEnabled ? cameraStreamRef.current?.getVideoTracks()[0] || null : null;
        pcsRef.current.forEach(pc => {
            const transceiver = pc.getTransceivers().find(t => t.receiver.track?.kind === 'video' || t.mid === 'video');
            if (transceiver) {
                // Si la cámara sigue activa, nos mantenemos en sendrecv; si no, volvemos a recvonly
                transceiver.direction = isVideoEnabled ? 'sendrecv' : 'recvonly';
            }
            const sender = findVideoSender(pc);
            if (sender) {
                sender.replaceTrack(cameraTrack);
            }
        });

        broadcastMediaState(isVideoEnabled, false, isAudioEnabled);
        log('Screen share ended, restored camera track');
        renegotiateAllPeers();

        const curCh = channelIdRef.current;
        const curUid = userIdRef.current;
        if (curCh && curUid) {
            supabase.from('discord_voice_participants')
                .update({ is_screen_sharing: false })
                .eq('channel_id', curCh)
                .eq('user_id', curUid)
                .then();
        }
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

            const curCh = channelIdRef.current;
            const curUid = userIdRef.current;
            if (curCh && curUid) {
                supabase.from('discord_voice_participants')
                    .update({ is_screen_sharing: true })
                    .eq('channel_id', curCh)
                    .eq('user_id', curUid)
                    .then();
            }

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

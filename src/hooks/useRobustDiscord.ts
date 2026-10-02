/* REGLA ARQUITECTÃ“NICA: NINGÃšN COMPONENTE VISUAL, HOOK O FUNCIONALIDAD PÃšBLICA DEBE CONDICIONARSE AL ROL ADMIN. TODOS LOS USUARIOS USAN LA MISMA UI Y LÃ“GICA DE NEGOCIO SALVO LA RUTA PRIVADA /admin */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { ICE_SERVERS } from '@/lib/webrtc-config';

// â•â•â• Global cleanup on tab close/refresh â•â•â•
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

    // Estado reactivo para la interfaz
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
    const [mics, setMics] = useState<CameraDevice[]>([]);
    const [selectedMicId, setSelectedMicId] = useState<string>('');
    const [remoteMediaStates, setRemoteMediaStates] = useState<Map<string, RemoteMediaState>>(new Map());
    const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());

    // Referencias mutables para evitar cierres de estado obsoletos
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);
    const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const makingOfferRef = useRef<Map<string, boolean>>(new Map());
    const ignoreOfferRef = useRef<Map<string, boolean>>(new Map());
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

    // â”€â”€â”€ Dispositivos de cÃ¡mara â”€â”€â”€
    const refreshDevices = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices
                .filter(d => d.kind === 'videoinput')
                .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `CÃ¡mara ${i + 1}` }));
            setCameras(videoDevices);
            if (videoDevices.length > 0 && !selectedCameraId) {
                setSelectedCameraId(videoDevices[0].deviceId);
            }
        } catch { /* ignore */ }
    }, [selectedCameraId]);

    useEffect(() => { refreshDevices(); }, []);

    // â”€â”€â”€ Enviar seÃ±ales por Realtime sin duplicaciones â”€â”€â”€
    const sendSignal = useCallback((event: string, payload: any) => {
        if (!sigRef.current) return;
        try {
            sigRef.current.send({
                type: 'broadcast',
                event,
                payload,
            });
        } catch (e: any) {
            console.warn(`[Tabetalk WebRTC] Error sending ${event}:`, e.message);
        }
    }, []);

    // â”€â”€â”€ Broadcast de Estado Multimedia â”€â”€â”€
    const broadcastMediaState = useCallback((cameraOn: boolean, screenSharing: boolean, audioOn: boolean) => {
        const myId = userIdRef.current;
        if (!myId) return;
        sendSignal('signal:media-state', {
            from: myId,
            isCameraOn: cameraOn,
            isScreenSharing: screenSharing,
            isAudioEnabled: audioOn,
        });
    }, [sendSignal]);

    // â”€â”€â”€ Drenar candidatos ICE pendientes â”€â”€â”€
    const drainPendingCandidates = useCallback(async (targetId: string, pc: RTCPeerConnection) => {
        const queue = pendingCandidatesRef.current.get(targetId);
        if (queue && queue.length > 0) {
            log(`Draining ${queue.length} pending ICE candidates for ${targetId.slice(0, 8)}`);
            pendingCandidatesRef.current.delete(targetId);
            for (const cand of queue) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch (e: any) {
                    console.warn(`[Tabetalk WebRTC] Error draining candidate: ${e.message}`);
                }
            }
        }
    }, [log]);

    // â”€â”€â”€ Buscar sender de video para replaceTrack en caliente â”€â”€â”€
    const findVideoSender = useCallback((pc: RTCPeerConnection): RTCRtpSender | undefined => {
        const withTrack = pc.getSenders().find(s => s.track?.kind === 'video');
        if (withTrack) return withTrack;
        const transceiver = pc.getTransceivers().find(t => t.receiver.track?.kind === 'video' || t.mid === 'video');
        return transceiver?.sender;
    }, []);

    // â”€â”€â”€ Limpieza de un peer individual â”€â”€â”€
    const closePeer = useCallback((id: string) => {
        log(`Closing peer connection with ${id.slice(0, 8)}`);
        const pc = pcsRef.current.get(id);
        if (pc) {
            try { pc.close(); } catch { }
            pcsRef.current.delete(id);
        }
        makingOfferRef.current.delete(id);
        ignoreOfferRef.current.delete(id);
        pendingCandidatesRef.current.delete(id);
        remoteStreamsRef.current.delete(id);
        remoteScreenStreamsRef.current.delete(id);

        setRemoteStreams(p => { const m = new Map(p); m.delete(id); return m; });
        setRemoteScreenStreams(p => { const m = new Map(p); m.delete(id); return m; });
        setRemoteMediaStates(p => { const m = new Map(p); m.delete(id); return m; });
        setPeerStates(p => { const m = new Map(p); m.delete(id); return m; });
        setSpeakingUsers(p => { const s = new Set(p); s.delete(id); return s; });
    }, [log]);

    // â”€â”€â”€ Limpieza global al desconectar del canal de voz â”€â”€â”€
    const cleanupAll = useCallback(() => {
        log('Cleaning up all media and connections');
        const myId = userIdRef.current;
        if (sigRef.current && myId) {
            try {
                sigRef.current.send({
                    type: 'broadcast',
                    event: 'signal:user-left',
                    payload: { from: myId, userId: myId },
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
        makingOfferRef.current.clear();
        ignoreOfferRef.current.clear();
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

    // â”€â”€â”€ FÃ¡brica RTCPeerConnection con W3C Perfect Negotiation â”€â”€â”€
    const getOrCreatePC = useCallback((targetId: string): RTCPeerConnection => {
        let pc = pcsRef.current.get(targetId);
        if (pc) return pc;

        const myId = userIdRef.current;
        if (!myId) {
            throw new Error('User ID not set when creating RTCPeerConnection');
        }

        log(`Creating RTCPeerConnection for ${targetId.slice(0, 8)}`);
        pc = new RTCPeerConnection(ICE_SERVERS);
        pcsRef.current.set(targetId, pc);

        // 1. Agregar tracks locales existentes o configurar transceivers para recepciÃ³n
        const curStream = localStreamRef.current;
        let hasAudioSender = false;
        if (curStream) {
            const audioTracks = curStream.getAudioTracks();
            if (audioTracks.length > 0) {
                pc.addTrack(audioTracks[0], curStream);
                hasAudioSender = true;
            }
        }
        if (!hasAudioSender) {
            // Modo oyente o sin micrÃ³fono: siempre recvonly para escuchar a los demÃ¡s
            pc.addTransceiver('audio', { direction: 'recvonly' });
        }

        // Pista de video activa (cÃ¡mara o pantalla compartida)
        let activeVideoTrack: MediaStreamTrack | null = null;
        if (screenStreamRef.current && screenStreamRef.current.getVideoTracks().length > 0) {
            activeVideoTrack = screenStreamRef.current.getVideoTracks()[0];
        } else if (cameraStreamRef.current && cameraStreamRef.current.getVideoTracks().length > 0) {
            activeVideoTrack = cameraStreamRef.current.getVideoTracks()[0];
        }

        if (activeVideoTrack) {
            pc.addTrack(activeVideoTrack, curStream || new MediaStream([activeVideoTrack]));
        } else {
            // Usuario con cÃ¡mara apagada: SIEMPRE 'recvonly' para poder ver las cÃ¡maras y pantallas de los demÃ¡s
            pc.addTransceiver('video', { direction: 'recvonly' });
        }

        // 2. W3C Perfect Negotiation: onnegotiationneeded
        pc.onnegotiationneeded = async () => {
            try {
                makingOfferRef.current.set(targetId, true);
                log(`[PerfectNegotiation] Creating offer for ${targetId.slice(0, 8)}`);
                const offer = await pc!.createOffer();
                if (pc!.signalingState !== 'stable') return;
                await pc!.setLocalDescription(offer);

                sendSignal('signal:offer', {
                    from: myId,
                    to: targetId,
                    sdp: pc!.localDescription,
                });
            } catch (err: any) {
                console.warn(`[Tabetalk WebRTC] Error in onnegotiationneeded with ${targetId.slice(0, 8)}:`, err.message);
            } finally {
                makingOfferRef.current.set(targetId, false);
            }
        };

        // 3. ICE Candidates: un solo evento unificado
        pc.onicecandidate = (ev) => {
            if (ev.candidate) {
                sendSignal('signal:ice-candidate', {
                    from: myId,
                    to: targetId,
                    candidate: ev.candidate.toJSON(),
                });
            }
        };

        // 4. RecepciÃ³n de Streams Multimedia Persistentes (ontrack)
        pc.ontrack = (ev) => {
            log(`[WebRTC] Received remote track ${ev.track.kind} (${ev.track.id}) from ${targetId.slice(0, 8)}`);

            // Reutilizar o crear MediaStream persistente para evitar romper elementos HTML
            let rStream = remoteStreamsRef.current.get(targetId);
            if (!rStream) {
                rStream = new MediaStream();
                remoteStreamsRef.current.set(targetId, rStream);
            }

            // Asegurar que el track estÃ© en el stream
            if (!rStream.getTracks().some(t => t.id === ev.track.id)) {
                rStream.addTrack(ev.track);
            }

            // Si es video, actualizar tambiÃ©n remoteScreenStreams
            if (ev.track.kind === 'video') {
                let sStream = remoteScreenStreamsRef.current.get(targetId);
                if (!sStream) {
                    sStream = new MediaStream();
                    remoteScreenStreamsRef.current.set(targetId, sStream);
                }
                if (!sStream.getTracks().some(t => t.id === ev.track.id)) {
                    sStream.addTrack(ev.track);
                }
                setRemoteScreenStreams(new Map(remoteScreenStreamsRef.current));
            }

            // Notificar a React con nueva referencia de Map
            setRemoteStreams(new Map(remoteStreamsRef.current));

            // Manejo de eventos en la pista recibida
            const triggerUpdate = () => {
                setRemoteStreams(new Map(remoteStreamsRef.current));
                setRemoteScreenStreams(new Map(remoteScreenStreamsRef.current));
            };

            ev.track.onended = () => {
                log(`Track ${ev.track.kind} ended from ${targetId.slice(0, 8)}`);
                triggerUpdate();
            };
            ev.track.onunmute = () => {
                log(`Track ${ev.track.kind} unmuted from ${targetId.slice(0, 8)}`);
                triggerUpdate();
            };
            ev.track.onmute = () => {
                log(`Track ${ev.track.kind} muted from ${targetId.slice(0, 8)}`);
                triggerUpdate();
            };
        };

        // 5. Monitoreo del estado de conexiÃ³n
        pc.onconnectionstatechange = () => {
            const state = pc!.connectionState;
            log(`Connection state with ${targetId.slice(0, 8)}: ${state}`);
            setPeerStates(p => { const m = new Map(p); m.set(targetId, state); return m; });

            if (state === 'connected') {
                log(`WebRTC successfully connected with ${targetId.slice(0, 8)}`);
                // Asegurar que los tracks de los receivers estÃ©n reflejados
                const receivers = pc!.getReceivers();
                receivers.forEach(r => {
                    if (r.track && r.track.readyState !== 'ended') {
                        let rStream = remoteStreamsRef.current.get(targetId);
                        if (!rStream) {
                            rStream = new MediaStream();
                            remoteStreamsRef.current.set(targetId, rStream);
                        }
                        if (!rStream.getTracks().some(t => t.id === r.track!.id)) {
                            rStream.addTrack(r.track);
                        }
                    }
                });
                setRemoteStreams(new Map(remoteStreamsRef.current));
                setRemoteScreenStreams(new Map(remoteScreenStreamsRef.current));
            } else if (state === 'failed') {
                log(`Attempting ICE restart with ${targetId.slice(0, 8)}`);
                try { pc!.restartIce(); } catch { }
            }
        };

        return pc;
    }, [log, sendSignal]);

    // â”€â”€â”€ Manejador de Ofertas (W3C Perfect Negotiation) â”€â”€â”€
    const handleOffer = useCallback(async (payload: any) => {
        const myId = userIdRef.current;
        const from = payload.from || payload.senderId;
        const to = payload.to || payload.targetId;
        const sdp = payload.sdp || payload.offer;

        if (!myId || !from || from === myId || !sdp) return;
        if (to && to !== myId) return;

        log(`Received offer from ${from.slice(0, 8)}`);
        const pc = getOrCreatePC(from);

        // DeterminaciÃ³n de polite peer: el que tiene ID mayor cede ante colisiones
        const isPolite = myId.localeCompare(from) > 0;
        const readyState = pc.signalingState;
        const offerCollision = makingOfferRef.current.get(from) || readyState !== 'stable';

        ignoreOfferRef.current.set(from, !isPolite && offerCollision);
        if (ignoreOfferRef.current.get(from)) {
            log(`Glare collision: ignoring offer from ${from.slice(0, 8)} (impolite role)`);
            return;
        }

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            await drainPendingCandidates(from, pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            sendSignal('signal:answer', {
                from: myId,
                to: from,
                sdp: pc.localDescription,
            });

            // Notificar de inmediato nuestro estado multimedia al emisor
            broadcastMediaState(isVideoEnabledRef.current, isScreenSharingRef.current, isAudioEnabledRef.current);
        } catch (e: any) {
            log(`Error handling offer from ${from.slice(0, 8)}: ${e.message}`);
        }
    }, [getOrCreatePC, drainPendingCandidates, sendSignal, broadcastMediaState, log]);

    // â”€â”€â”€ Manejador de Respuestas â”€â”€â”€
    const handleAnswer = useCallback(async (payload: any) => {
        const myId = userIdRef.current;
        const from = payload.from || payload.senderId;
        const to = payload.to || payload.targetId;
        const sdp = payload.sdp || payload.answer;

        if (!myId || !from || from === myId || !sdp) return;
        if (to && to !== myId) return;

        log(`Received answer from ${from.slice(0, 8)}`);
        const pc = pcsRef.current.get(from);
        if (!pc) return;

        if (pc.signalingState !== 'have-local-offer') {
            log(`Ignoring answer from ${from.slice(0, 8)} because state is ${pc.signalingState}`);
            return;
        }

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            await drainPendingCandidates(from, pc);
        } catch (e: any) {
            log(`Error handling answer from ${from.slice(0, 8)}: ${e.message}`);
        }
    }, [drainPendingCandidates, log]);

    // â”€â”€â”€ Manejador de Candidatos ICE â”€â”€â”€
    const handleIceCandidate = useCallback(async (payload: any) => {
        const myId = userIdRef.current;
        const from = payload.from || payload.senderId;
        const to = payload.to || payload.targetId;
        const candidate = payload.candidate;

        if (!myId || !from || from === myId || !candidate) return;
        if (to && to !== myId) return;

        const pc = pcsRef.current.get(from);
        if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
            const queue = pendingCandidatesRef.current.get(from) || [];
            queue.push(candidate);
            pendingCandidatesRef.current.set(from, queue);
            return;
        }

        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e: any) {
            if (!ignoreOfferRef.current.get(from)) {
                console.warn(`[Tabetalk WebRTC] Error adding ICE candidate: ${e.message}`);
            }
        }
    }, []);

    // â”€â”€â”€ Manejador de Estado Multimedia Remoto â”€â”€â”€
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

        // Si el peer apagÃ³ cÃ¡mara y pantalla, limpiar tracks de video del stream remoto
        if (!payload.isCameraOn && !payload.isScreenSharing) {
            const rStream = remoteStreamsRef.current.get(sid);
            if (rStream) {
                rStream.getVideoTracks().forEach(t => {
                    try { rStream.removeTrack(t); } catch { }
                });
                setRemoteStreams(new Map(remoteStreamsRef.current));
            }
            const sStream = remoteScreenStreamsRef.current.get(sid);
            if (sStream) {
                sStream.getVideoTracks().forEach(t => {
                    try { sStream.removeTrack(t); } catch { }
                });
                setRemoteScreenStreams(new Map(remoteScreenStreamsRef.current));
            }
        }
    }, []);

    // â”€â”€â”€ Manejador de Indicador de Habla â”€â”€â”€
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

    // â”€â”€â”€ DetecciÃ³n de Actividad de Voz Local (VAD) â”€â”€â”€
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
                        sendSignal('signal:speaking', {
                            from: myId,
                            isSpeaking: speaking,
                        });
                    }
                }
                requestAnimationFrame(checkAudio);
            };
            requestAnimationFrame(checkAudio);
        } catch (e) {
            console.warn('[Tabetalk VAD] Error initializing audio analyzer:', e);
        }
    }, [sendSignal]);

    // â”€â”€â”€ Renegociar todos los peers al cambiar tracks â”€â”€â”€
    const renegotiateAllPeers = useCallback(() => {
        pcsRef.current.forEach((pc, targetId) => {
            // En Perfect Negotiation basta con invocar createOffer si el canal es stable
            if (pc.signalingState === 'stable') {
                const myId = userIdRef.current;
                if (!myId) return;
                makingOfferRef.current.set(targetId, true);
                pc.createOffer()
                    .then(offer => pc.setLocalDescription(offer))
                    .then(() => {
                        sendSignal('signal:offer', {
                            from: myId,
                            to: targetId,
                            sdp: pc.localDescription,
                        });
                    })
                    .catch(e => console.warn(`[Tabetalk WebRTC] Error renegotiating with ${targetId}:`, e))
                    .finally(() => makingOfferRef.current.set(targetId, false));
            }
        });
    }, [sendSignal]);

    // â•â•â• Efecto Principal: ConexiÃ³n a la Sala de Voz â•â•â•
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
                console.warn('[Tabetalk WebRTC] Error con constraints avanzados de audio, probando fallback bÃ¡sico:', e1);
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                } catch (e2: any) {
                    console.warn('[Tabetalk WebRTC] No se pudo obtener micrÃ³fono fÃ­sico, conectando como oyente:', e2);
                    toast({
                        title: 'Modo Oyente activado',
                        description: 'No se detectÃ³ micrÃ³fono o falta permiso. Puedes escuchar y ver a tus compaÃ±eros.',
                    });
                    // Fallback a pista de audio vacÃ­a/silenciosa para modo oyente
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
            if (stream.getAudioTracks().length > 0) {
                setupLocalVAD(stream);
            }
            await refreshDevices();

            // Configurar canal de seÃ±alizaciÃ³n Ãºnico en Supabase Realtime
            const channel = supabase.channel(`tabetalk:${channelId}`, {
                config: { broadcast: { self: false }, presence: { key: user.id } },
            });

            // Suscribir eventos de seÃ±alizaciÃ³n unificados
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
            channel.on('broadcast', { event: 'signal:user-joined' }, ({ payload }) => {
                const newcomer = payload?.from || payload?.userId;
                if (cancelled || !newcomer || newcomer === user.id) return;
                log(`New user joined room: ${newcomer.slice(0, 8)}`);
                // Inicializar conexiÃ³n con el nuevo usuario
                getOrCreatePC(newcomer);
                broadcastMediaState(isVideoEnabledRef.current, isScreenSharingRef.current, isAudioEnabledRef.current);
            });
            channel.on('broadcast', { event: 'signal:user-left' }, ({ payload }) => {
                const leftId = payload?.from || payload?.userId;
                if (!leftId || leftId === user.id) return;
                closePeer(leftId);
            });

            // Presence para resiliencia ante usuarios ya conectados
            channel.on('presence', { event: 'sync' }, () => {
                if (cancelled) return;
                const state = channel.presenceState();
                const others = Object.keys(state).filter(id => id !== user.id);
                others.forEach(remoteUserId => {
                    getOrCreatePC(remoteUserId);
                });
            });

            channel.on('presence', { event: 'join' }, ({ key }) => {
                if (cancelled || !key || key === user.id) return;
                getOrCreatePC(key);
            });

            channel.on('presence', { event: 'leave' }, ({ key }) => {
                if (!key || key === user.id) return;
                closePeer(key);
            });

            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED' && !cancelled) {
                    sigRef.current = channel;
                    await channel.track({ user_id: user.id, online_at: new Date().toISOString() });

                    // Anunciar llegada a todos los participantes
                    sendSignal('signal:user-joined', { from: user.id });

                    // Conectar con participantes ya presentes
                    setTimeout(() => {
                        if (cancelled) return;
                        const others = Object.keys(channel.presenceState()).filter(id => id !== user.id);
                        others.forEach(id => {
                            getOrCreatePC(id);
                        });
                        broadcastMediaState(isVideoEnabledRef.current, isScreenSharingRef.current, isAudioEnabledRef.current);
                    }, 300);
                }
            });
        };

        start();

        return () => {
            cancelled = true;
            cleanupAll();
        };
    }, [channelId, user?.id, setupLocalVAD, refreshDevices, getOrCreatePC, handleOffer, handleAnswer, handleIceCandidate, handleMediaState, handleSpeaking, closePeer, cleanupAll, broadcastMediaState, sendSignal, toast, log]);

    // â”€â”€â”€ Toggle Audio (MicrÃ³fono) â”€â”€â”€
    const toggleAudio = useCallback(() => {
        const s = localStreamRef.current;
        if (!s) return;
        const next = !isAudioEnabled;
        s.getAudioTracks().forEach(t => { t.enabled = next; });
        setIsAudioEnabled(next);
        broadcastMediaState(isVideoEnabled, isScreenSharing, next);
    }, [isAudioEnabled, isVideoEnabled, isScreenSharing, broadcastMediaState]);

    // â”€â”€â”€ Toggle Video (CÃ¡mara Web) â”€â”€â”€
    const toggleVideo = useCallback(async () => {
        const mainStream = localStreamRef.current;
        if (!mainStream) return;

        if (isVideoEnabled) {
            // Apagar cÃ¡mara
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
                    const transceiver = pc.getTransceivers().find(t => t.receiver.track?.kind === 'video' || t.mid === 'video');
                    if (transceiver) {
                        // Al apagar cÃ¡mara, mantenemos en 'recvonly' para poder seguir viendo a los demÃ¡s
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

            // Sincronizar en DB si aplica
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
            // Encender cÃ¡mara con fallback resiliente
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
                    console.warn('[Tabetalk WebRTC] Error con constraints de cÃ¡mara ideales, probando fallback bÃ¡sico:', e1);
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
                toast({ title: 'No se pudo acceder a la cÃ¡mara', description: e.message || 'Verifica los permisos del navegador', variant: 'destructive' });
            }
        }
    }, [isVideoEnabled, isScreenSharing, isAudioEnabled, selectedCameraId, broadcastMediaState, findVideoSender, renegotiateAllPeers, toast, log]);

    // â”€â”€â”€ Switch Camera â”€â”€â”€
    const switchCamera = useCallback(async (deviceId: string) => {
        setSelectedCameraId(deviceId);
        localStorage.setItem('tabetalk_video_input_device', deviceId); // Guardar preferencia
        if (!isVideoEnabled || !localStreamRef.current) return;
        const mainStream = localStreamRef.current;

        try {
            // STOP old camera FIRST to release hardware locks (fixes black screen/virtual camera issues on Windows)
            if (cameraStreamRef.current) {
                cameraStreamRef.current.getTracks().forEach(t => {
                    t.enabled = false;
                    try { t.stop(); } catch { }
                });
                cameraStreamRef.current = null;
            }

            // Also remove from mainStream immediately
            mainStream.getVideoTracks().forEach(t => {
                t.enabled = false;
                try { t.stop(); } catch { }
                mainStream.removeTrack(t);
            });

            const vs = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
            const newVt = vs.getVideoTracks()[0];

            cameraStreamRef.current = vs;

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
            toast({ title: 'Error al cambiar cÃ¡mara', description: e.message, variant: 'destructive' });
        }
    }, [isVideoEnabled, isScreenSharing, findVideoSender, renegotiateAllPeers, toast, log]);

    // â”€â”€â”€ Screen Sharing (Transmitir Pantalla) â”€â”€â”€
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
                // Si la cÃ¡mara sigue prendida, mantenemos sendrecv; si no, volvemos a recvonly
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
        mics,
        selectedMicId,
        switchMic,
        startScreenShare,
        stopScreenShare,
        screenStream,
        remoteScreenStreams,
        remoteMediaStates,
        speakingUsers,
    };
}





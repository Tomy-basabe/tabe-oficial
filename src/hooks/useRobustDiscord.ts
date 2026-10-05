import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ICE_SERVERS } from "@/lib/webrtc-config";

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
    const localUserId = user?.id;

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map());
    const [peerStates, setPeerStates] = useState<Map<string, string>>(new Map());
    const [remoteMediaStates, setRemoteMediaStates] = useState<Map<string, RemoteMediaState>>(new Map());
    const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());

    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    const [cameras, setCameras] = useState<CameraDevice[]>([]);
    const [mics, setMics] = useState<CameraDevice[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState(() => {
        const saved = localStorage.getItem("tabetalk_video_input_device");
        return saved && saved !== "default" ? saved : "";
    });
    const [selectedMicId, setSelectedMicId] = useState(() => {
        const saved = localStorage.getItem("tabetalk_audio_input_device");
        return saved && saved !== "default" ? saved : "";
    });

    // Refs para evitar problemas de dependencias en callbacks de eventos
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const channelRef = useRef<any>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);

    // Audio Analysis (VAD) ref
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const vadIntervalRef = useRef<any>(null);

    // --- MÉTODOS DE MEDIA LOCALES ---

    const getDevices = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevs = devices.filter(d => d.kind === 'videoinput');
            const audioDevs = devices.filter(d => d.kind === 'audioinput');
            
            setCameras(videoDevs.map((d, idx) => ({ deviceId: d.deviceId, label: d.label || `Cámara ${idx + 1}` })));
            setMics(audioDevs.map((d, idx) => ({ deviceId: d.deviceId, label: d.label || `Micrófono ${idx + 1}` })));
            
            if (videoDevs.length > 0 && !selectedCameraId) setSelectedCameraId(videoDevs[0].deviceId);
            if (audioDevs.length > 0 && !selectedMicId) setSelectedMicId(audioDevs[0].deviceId);
        } catch (err) {
            console.error("[WebRTC] Error enumerando dispositivos:", err);
        }
    };

    const setupVAD = (stream: MediaStream) => {
        if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
        if (audioContextRef.current) audioContextRef.current.close();

        try {
            const audioCtx = new window.AudioContext();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.4;
            analyzerRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            vadIntervalRef.current = setInterval(() => {
                if (!localUserId) return;
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const average = sum / dataArray.length;
                
                const isSpeakingNow = average > 15; // Threshold
                
                setSpeakingUsers(prev => {
                    const next = new Set(prev);
                    if (isSpeakingNow && isAudioEnabled) {
                        next.add(localUserId);
                    } else {
                        next.delete(localUserId);
                    }
                    return next;
                });
            }, 100);
        } catch (e) {
            console.error("[WebRTC] Error VAD:", e);
        }
    };

    const initLocalMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
                video: isVideoEnabled ? (selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true) : false
            });
            
            setLocalStream(stream);
            localStreamRef.current = stream;
            
            // Forzar estado de los tracks
            stream.getAudioTracks().forEach(t => t.enabled = isAudioEnabled);
            
            setupVAD(stream);
            await getDevices();
            return stream;
        } catch (err) {
            console.error("[WebRTC] Error obteniendo media:", err);
            return null;
        }
    };

    // --- SEÑALIZACIÓN Y PEER CONNECTIONS (RED MALLA) ---

    const broadcastMediaState = useCallback(() => {
        if (!channelRef.current || !localUserId) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'media_state',
            payload: {
                senderId: localUserId,
                isCameraOn: isVideoEnabled,
                isAudioEnabled: isAudioEnabled,
                isScreenSharing: isScreenSharing
            }
        });
    }, [localUserId, isVideoEnabled, isAudioEnabled, isScreenSharing]);

    // DB Update
    useEffect(() => {
        if (!channelId || !localUserId) return;
        supabase.from('discord_voice_participants')
            .update({ 
                is_camera_on: isVideoEnabled, 
                is_screen_sharing: isScreenSharing,
                is_muted: !isAudioEnabled 
            })
            .eq('channel_id', channelId)
            .eq('user_id', localUserId)
            .then();
    }, [isVideoEnabled, isScreenSharing, isAudioEnabled, channelId, localUserId]);

    const createPeerConnection = (targetId: string, isInitiator: boolean) => {
        if (peerConnections.current.has(targetId)) {
            const existingPc = peerConnections.current.get(targetId)!;
            existingPc.close();
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current.set(targetId, pc);

        setPeerStates(prev => {
            const next = new Map(prev);
            next.set(targetId, 'connecting');
            return next;
        });

        // 1. Añadir tracks locales (audio SIEMPRE, video si está disponible)
        const localStream = localStreamRef.current;
        if (localStream && localStream.getTracks().length > 0) {
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
                console.log(`[WebRTC] Track local ${track.kind} (enabled=${track.enabled}) añadido a peer ${targetId}`);
            });
        } else {
            // FIX: Si el stream aún no está listo, agregar transceivers vacíos
            // para que el SDP incluya m-lines. renegotiateAllPeers() los rellenará luego.
            console.warn(`[WebRTC] localStream no disponible para ${targetId}, usando transceivers vacíos`);
            pc.addTransceiver('audio', { direction: 'sendrecv' });
            pc.addTransceiver('video', { direction: 'sendrecv' });
        }

        // 2. Añadir track de pantalla si existe
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, screenStreamRef.current!);
            });
        }

        // 3. ICE Candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && channelRef.current && localUserId) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc_ice_candidate',
                    payload: { targetId, senderId: localUserId, candidate: event.candidate }
                });
            }
        };

        // 4. Recibir Tracks remotos
        // FIX: manejar múltiples streams del mismo peer (cámara + pantalla)
        pc.ontrack = (event) => {
            console.log(`[WebRTC] ontrack de ${targetId}: kind=${event.track.kind}, streams=${event.streams.length}`);
            const incomingStream = event.streams[0];
            if (!incomingStream) return;

            setRemoteStreams(prev => {
                const next = new Map(prev);
                const existing = next.get(targetId);
                if (existing && existing.id !== incomingStream.id) {
                    // Stream distinto al principal = pantalla
                    setRemoteScreenStreams(ss => {
                        const ssNext = new Map(ss);
                        ssNext.set(targetId, incomingStream);
                        return ssNext;
                    });
                    return next;
                }
                next.set(targetId, incomingStream);
                return next;
            });
        };

        pc.oniceconnectionstatechange = () => {
            const state = pc.iceConnectionState;
            setPeerStates(prev => { const n = new Map(prev); n.set(targetId, state); return n; });
            console.log(`[WebRTC] ICE state con ${targetId}: ${state}`);

            if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                setRemoteStreams(prev => { const n = new Map(prev); n.delete(targetId); return n; });
                setRemoteScreenStreams(prev => { const n = new Map(prev); n.delete(targetId); return n; });

                // ICE restart automático en disconnected
                if (state === 'disconnected') {
                    setTimeout(() => {
                        const currentPc = peerConnections.current.get(targetId);
                        if (currentPc === pc && pc.iceConnectionState === 'disconnected') {
                            console.log(`[WebRTC] ICE restart con ${targetId}`);
                            pc.createOffer({ iceRestart: true })
                                .then(o => pc.setLocalDescription(o))
                                .then(() => channelRef.current?.send({
                                    type: 'broadcast',
                                    event: 'webrtc_offer',
                                    payload: { targetId, senderId: localUserId, offer: pc.localDescription }
                                }))
                                .catch(() => {});
                        }
                    }, 3000);
                }
            }
        };

        // Negociación inicial
        if (isInitiator) {
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                    channelRef.current?.send({
                        type: 'broadcast',
                        event: 'webrtc_offer',
                        payload: { targetId, senderId: localUserId, offer: pc.localDescription }
                    });
                })
                .catch(e => console.error("[WebRTC] Error creando oferta:", e));
        }

        return pc;
    };

    const handleNewPeer = useCallback((newUserId: string) => {
        if (!localUserId || newUserId === localUserId) return;
        // El usuario que ya estaba en la sala inicia la llamada al nuevo
        createPeerConnection(newUserId, true);
    }, [localUserId]);

    // Buffer de ICE candidates que llegan antes de setRemoteDescription
    const iceCandidateBuffer = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

    // --- EFECTO PRINCIPAL DE CONEXIÓN A SALA ---

    useEffect(() => {
        if (!channelId || !localUserId) return;

        let active = true;

        const connect = async () => {
            const stream = await initLocalMedia();
            if (!active) return;

            // FIX: usar presence para detectar quién ya está en la sala
            const channel = supabase.channel(`room_${channelId}`, {
                config: {
                    broadcast: { self: false },
                    presence: { key: localUserId },
                },
            });
            channelRef.current = channel;

            channel
                // FIX: user_joined broadcast — TODOS los peers existentes se conectan al nuevo
                .on('broadcast', { event: 'user_joined' }, ({ payload }) => {
                    if (payload.userId !== localUserId) {
                        console.log(`[WebRTC] user_joined de ${payload.userId} — conectando`);
                        // Cerrar conexión previa si existía (evita duplicados)
                        const old = peerConnections.current.get(payload.userId);
                        if (old) { old.close(); peerConnections.current.delete(payload.userId); }
                        createPeerConnection(payload.userId, true);
                        broadcastMediaState();
                    }
                })
                // FIX: presence join — cuando nosotros llegamos y ya hay gente, ellos nos ven por presence
                // y crean su offer hacia nosotros (isInitiator=true desde su lado)
                .on('presence', { event: 'join' }, ({ key }) => {
                    if (key !== localUserId) {
                        console.log(`[WebRTC] Presence join de ${key}`);
                        if (!peerConnections.current.has(key)) {
                            createPeerConnection(key, true);
                        }
                    }
                })
                .on('presence', { event: 'leave' }, ({ key }) => {
                    if (key !== localUserId) {
                        const pc = peerConnections.current.get(key);
                        if (pc) { pc.close(); peerConnections.current.delete(key); }
                        iceCandidateBuffer.current.delete(key);
                        setRemoteStreams(prev => { const m = new Map(prev); m.delete(key); return m; });
                        setRemoteMediaStates(prev => { const m = new Map(prev); m.delete(key); return m; });
                        setPeerStates(prev => { const m = new Map(prev); m.delete(key); return m; });
                    }
                })
                .on('broadcast', { event: 'webrtc_offer' }, async ({ payload }) => {
                    if (payload.targetId !== localUserId) return;
                    try {
                        const old = peerConnections.current.get(payload.senderId);
                        if (old && old.signalingState !== 'closed') { old.close(); }
                        const pc = createPeerConnection(payload.senderId, false);
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));

                        // Aplicar ICE candidates bufferizados
                        const buffered = iceCandidateBuffer.current.get(payload.senderId) || [];
                        for (const c of buffered) {
                            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
                        }
                        iceCandidateBuffer.current.delete(payload.senderId);

                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        channel.send({
                            type: 'broadcast',
                            event: 'webrtc_answer',
                            payload: { targetId: payload.senderId, senderId: localUserId, answer: pc.localDescription }
                        });
                    } catch (e) { console.error("[WebRTC] Error procesando oferta:", e); }
                })
                .on('broadcast', { event: 'webrtc_answer' }, async ({ payload }) => {
                    if (payload.targetId !== localUserId) return;
                    const pc = peerConnections.current.get(payload.senderId);
                    if (pc && pc.signalingState !== 'closed') {
                        try {
                            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                            // Aplicar ICE candidates bufferizados tras setRemoteDescription
                            const buffered = iceCandidateBuffer.current.get(payload.senderId) || [];
                            for (const c of buffered) {
                                try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
                            }
                            iceCandidateBuffer.current.delete(payload.senderId);
                        } catch (e) { console.error("[WebRTC] Error procesando respuesta:", e); }
                    }
                })
                .on('broadcast', { event: 'webrtc_ice_candidate' }, async ({ payload }) => {
                    if (payload.targetId !== localUserId) return;
                    const pc = peerConnections.current.get(payload.senderId);
                    if (pc && pc.signalingState !== 'closed' && pc.remoteDescription) {
                        try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); }
                        catch (e) { console.error("[WebRTC] Error ICE:", e); }
                    } else {
                        // FIX: Bufferizar ICE que llegan antes de remoteDescription
                        const buf = iceCandidateBuffer.current.get(payload.senderId) || [];
                        buf.push(payload.candidate);
                        iceCandidateBuffer.current.set(payload.senderId, buf);
                    }
                })
                .on('broadcast', { event: 'media_state' }, ({ payload }) => {
                    if (payload.senderId !== localUserId) {
                        setRemoteMediaStates(prev => {
                            const next = new Map(prev);
                            next.set(payload.senderId, {
                                isCameraOn: payload.isCameraOn,
                                isAudioEnabled: payload.isAudioEnabled,
                                isScreenSharing: payload.isScreenSharing
                            });
                            return next;
                        });
                    }
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        // FIX: Trackear presence para que los peers existentes nos detecten
                        await channel.track({ user_id: localUserId, joined_at: Date.now() });
                        // Doble mecanismo: broadcast user_joined para peers que no usen presence
                        channel.send({
                            type: 'broadcast',
                            event: 'user_joined',
                            payload: { userId: localUserId }
                        });
                        broadcastMediaState();
                    }
                });
        };

        connect();

        // FIX: Re-anunciar presencia al volver de otra pestaña
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && channelRef.current && localUserId) {
                console.log('[WebRTC] Visibilidad restaurada — re-anunciando y re-negociando');
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'user_joined',
                    payload: { userId: localUserId }
                });
                broadcastMediaState();
                // Re-negociar peers caídos durante el background
                peerConnections.current.forEach((pc, targetId) => {
                    if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                        console.log(`[WebRTC] Re-negociando con ${targetId}`);
                        pc.close();
                        peerConnections.current.delete(targetId);
                        createPeerConnection(targetId, true);
                    }
                });
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            active = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (channelRef.current) channelRef.current.unsubscribe();
            peerConnections.current.forEach(pc => pc.close());
            peerConnections.current.clear();
            iceCandidateBuffer.current.clear();
            if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
            if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
            if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
            supabase.from('discord_voice_participants')
                .delete()
                .eq('channel_id', channelId)
                .eq('user_id', localUserId)
                .then();
        };
    }, [channelId, localUserId]);

    // Limpieza global en beforeunload (cierre de pestaña)
    useEffect(() => {
        const handleUnload = () => {
            if (channelId && localUserId) {
                const url = import.meta.env.VITE_SUPABASE_URL;
                const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
                if (url && key) {
                    const tokenStr = localStorage.getItem('sb-' + new URL(url).hostname.split('.')[0] + '-auth-token');
                    let token = key;
                    if (tokenStr) {
                        try { token = JSON.parse(tokenStr).access_token || key; } catch {}
                    }
                    fetch(`${url}/rest/v1/discord_voice_participants?user_id=eq.${localUserId}&channel_id=eq.${channelId}`, {
                        method: 'DELETE',
                        headers: {
                            'apikey': key,
                            'Authorization': `Bearer ${token}`
                        },
                        keepalive: true
                    }).catch(()=>{});
                }
            }
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [channelId, localUserId]);

    // --- ACCIONES DE MEDIA ---

    const renegotiateAllPeers = () => {
        peerConnections.current.forEach((pc, targetId) => {
            const senders = pc.getSenders();
            
            // Actualizar tracks locales
            if (localStreamRef.current) {
                const audioTrack = localStreamRef.current.getAudioTracks()[0];
                const videoTrack = localStreamRef.current.getVideoTracks()[0];
                
                if (audioTrack) {
                    const audioSender = senders.find(s => s.track?.kind === 'audio');
                    if (audioSender) audioSender.replaceTrack(audioTrack);
                    else pc.addTrack(audioTrack, localStreamRef.current);
                }
                
                const videoSender = senders.find(s => s.track?.kind === 'video' && !s.track.label.toLowerCase().includes('screen'));
                if (videoTrack) {
                    if (videoSender) videoSender.replaceTrack(videoTrack);
                    else pc.addTrack(videoTrack, localStreamRef.current);
                } else if (videoSender) {
                    pc.removeTrack(videoSender);
                }
            }
            
            // Actualizar track de pantalla
            const screenSender = senders.find(s => s.track?.kind === 'video' && s.track.label.toLowerCase().includes('screen'));
            if (screenStreamRef.current) {
                const screenTrack = screenStreamRef.current.getVideoTracks()[0];
                if (screenTrack) {
                    if (screenSender) screenSender.replaceTrack(screenTrack);
                    else pc.addTrack(screenTrack, screenStreamRef.current);
                }
            } else if (screenSender) {
                pc.removeTrack(screenSender);
            }
            
            // Re-ofertar
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                    channelRef.current?.send({
                        type: 'broadcast',
                        event: 'webrtc_offer',
                        payload: {
                            targetId,
                            senderId: localUserId,
                            offer: pc.localDescription
                        }
                    });
                })
                .catch(e => console.error("[WebRTC] Error renegociando:", e));
        });
    };

    const toggleAudio = () => {
        setIsAudioEnabled(prev => {
            const next = !prev;
            if (localStreamRef.current) {
                localStreamRef.current.getAudioTracks().forEach(t => t.enabled = next);
            }
            setTimeout(broadcastMediaState, 100);
            return next;
        });
    };

    const toggleVideo = async () => {
        try {
            if (!isVideoEnabled) {
                let newStream: MediaStream;
                try {
                    newStream = await navigator.mediaDevices.getUserMedia({
                        video: selectedCameraId && selectedCameraId !== "default" ? { deviceId: { exact: selectedCameraId } } : true,
                        audio: false
                    });
                } catch {
                    newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                }
                const videoTrack = newStream.getVideoTracks()[0];
                
                if (localStreamRef.current && videoTrack) {
                    const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
                    if (oldVideoTrack) {
                        localStreamRef.current.removeTrack(oldVideoTrack);
                        oldVideoTrack.stop();
                    }
                    localStreamRef.current.addTrack(videoTrack);
                    setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                } else if (videoTrack) {
                    const combined = new MediaStream([videoTrack]);
                    localStreamRef.current = combined;
                    setLocalStream(combined);
                }
                setIsVideoEnabled(true);
                await getDevices();
            } else {
                if (localStreamRef.current) {
                    const videoTrack = localStreamRef.current.getVideoTracks()[0];
                    if (videoTrack) {
                        videoTrack.stop();
                        localStreamRef.current.removeTrack(videoTrack);
                        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                    }
                }
                setIsVideoEnabled(false);
            }
            setTimeout(() => {
                renegotiateAllPeers();
                broadcastMediaState();
            }, 200);
        } catch (e) {
            console.error("[WebRTC] Error alternando video:", e);
        }
    };

    const startScreenShare = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            setScreenStream(stream);
            screenStreamRef.current = stream;
            setIsScreenSharing(true);
            
            stream.getVideoTracks()[0].onended = stopScreenShare;
            
            setTimeout(() => {
                renegotiateAllPeers();
                broadcastMediaState();
            }, 200);
        } catch (e) {
            console.error("[WebRTC] Error compartiendo pantalla:", e);
        }
    };

    const stopScreenShare = () => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(t => t.stop());
            setScreenStream(null);
            screenStreamRef.current = null;
            setIsScreenSharing(false);
            
            setTimeout(() => {
                renegotiateAllPeers();
                broadcastMediaState();
            }, 200);
        }
    };

    const switchCamera = async (deviceId: string) => {
        setSelectedCameraId(deviceId);
        localStorage.setItem("tabetalk_video_input_device", deviceId);
        if (isVideoEnabled) {
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: deviceId && deviceId !== "default" ? { deviceId: { exact: deviceId } } : true
                });
                const videoTrack = newStream.getVideoTracks()[0];
                if (localStreamRef.current && videoTrack) {
                    const oldTrack = localStreamRef.current.getVideoTracks()[0];
                    if (oldTrack) {
                        localStreamRef.current.removeTrack(oldTrack);
                        oldTrack.stop();
                    }
                    localStreamRef.current.addTrack(videoTrack);
                    setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                    renegotiateAllPeers();
                }
            } catch (e) {
                console.error("[WebRTC] Error cambiando cámara:", e);
            }
        }
    };

    const switchMic = async (deviceId: string) => {
        setSelectedMicId(deviceId);
        localStorage.setItem("tabetalk_audio_input_device", deviceId);
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                audio: deviceId && deviceId !== "default" ? { deviceId: { exact: deviceId } } : true
            });
            const audioTrack = newStream.getAudioTracks()[0];
            if (localStreamRef.current && audioTrack) {
                const oldTrack = localStreamRef.current.getAudioTracks()[0];
                if (oldTrack) {
                    localStreamRef.current.removeTrack(oldTrack);
                    oldTrack.stop();
                }
                audioTrack.enabled = isAudioEnabled;
                localStreamRef.current.addTrack(audioTrack);
                setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                
                setupVAD(localStreamRef.current);
                renegotiateAllPeers();
            }
        } catch (e) {
            console.error("[WebRTC] Error cambiando micrófono:", e);
        }
    };

    // Sincronizar cambios desde el modal de Ajustes de Tabetalk
    useEffect(() => {
        const handleDevicesChanged = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (!detail) return;
            getDevices();
            if (detail.videoInput && detail.videoInput !== selectedCameraId) {
                switchCamera(detail.videoInput);
            }
            if (detail.audioInput && detail.audioInput !== selectedMicId && localStreamRef.current) {
                switchMic(detail.audioInput);
            }
        };
        window.addEventListener("tabetalk:devices-changed", handleDevicesChanged);
        return () => window.removeEventListener("tabetalk:devices-changed", handleDevicesChanged);
    }, [selectedCameraId, selectedMicId, isVideoEnabled, isAudioEnabled]);

    return {
        localStream,
        remoteStreams,
        screenStream,
        remoteScreenStreams,
        peerStates,
        remoteMediaStates,
        speakingUsers,
        
        isAudioEnabled,
        isVideoEnabled,
        isScreenSharing,
        
        cameras,
        selectedCameraId,
        mics,
        selectedMicId,
        
        toggleAudio,
        toggleVideo,
        startScreenShare,
        stopScreenShare,
        switchCamera,
        switchMic
    };
}


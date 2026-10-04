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

        // 1. Añadir tracks locales
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }
        
        // 2. Añadir track de pantalla si existe (en un stream separado para que no se mezcle)
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, screenStreamRef.current!);
            });
        }

        // 3. Manejar ICE Candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && channelRef.current && localUserId) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc_ice_candidate',
                    payload: {
                        targetId,
                        senderId: localUserId,
                        candidate: event.candidate
                    }
                });
            }
        };

        // 4. Recibir Tracks (ONTRACK CRÍTICO)
        pc.ontrack = (event) => {
            const stream = event.streams[0];
            if (!stream) return;
            
            // Detectar si el stream es de pantalla (por convención, si tiene video y un ID distinto, aunque lo mejor es
            // separarlos por el tipo de track o el msid. Aquí nos basamos en el track de video).
            // Para simplificar, asumimos que el primer stream con audio/video es el de cámara, 
            // y si llega un segundo stream es el de pantalla.
            
            const isScreenTrack = event.track.kind === 'video' && event.track.label.toLowerCase().includes('screen');
            // Como Safari no siempre respeta el label, usamos heurísticas o simplemente actualizamos el mapa reactivo.
            
            // Por simplicidad en la malla: si el stream tiene un video track que NO es la cámara principal:
            // Vamos a registrar el stream remoto asociándolo al targetId.
            setRemoteStreams(prev => {
                const next = new Map(prev);
                // Si el evento es para pantalla (podemos inferirlo de remoteMediaStates)
                // Para evitar complicaciones extremas sin transceivers dirigidos, lo guardamos en remoteStreams
                // La UI usará el track de video correspondiente.
                next.set(targetId, stream);
                return next;
            });
        };

        pc.oniceconnectionstatechange = () => {
            setPeerStates(prev => {
                const next = new Map(prev);
                next.set(targetId, pc.iceConnectionState);
                return next;
            });
            
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
                setRemoteStreams(prev => {
                    const next = new Map(prev);
                    next.delete(targetId);
                    return next;
                });
                setRemoteScreenStreams(prev => {
                    const next = new Map(prev);
                    next.delete(targetId);
                    return next;
                });
            }
        };

        // Negociación
        if (isInitiator) {
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
                .catch(e => console.error("[WebRTC] Error creando oferta:", e));
        }

        return pc;
    };

    const handleNewPeer = useCallback((newUserId: string) => {
        if (!localUserId || newUserId === localUserId) return;
        // El usuario que ya estaba en la sala inicia la llamada al nuevo
        createPeerConnection(newUserId, true);
    }, [localUserId]);

    // --- EFECTO PRINCIPAL DE CONEXIÓN A SALA ---

    useEffect(() => {
        if (!channelId || !localUserId) return;

        let active = true;

        const connect = async () => {
            // Inicializar medios primero
            await initLocalMedia();
            if (!active) return;

            // Conectar a canal Realtime
            const channel = supabase.channel(`room_${channelId}`);
            channelRef.current = channel;

            channel
                .on('broadcast', { event: 'user_joined' }, ({ payload }) => {
                    if (payload.userId !== localUserId) {
                        handleNewPeer(payload.userId);
                        broadcastMediaState();
                    }
                })
                .on('broadcast', { event: 'webrtc_offer' }, async ({ payload }) => {
                    if (payload.targetId !== localUserId) return;
                    try {
                        const pc = createPeerConnection(payload.senderId, false);
                        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        channel.send({
                            type: 'broadcast',
                            event: 'webrtc_answer',
                            payload: {
                                targetId: payload.senderId,
                                senderId: localUserId,
                                answer: pc.localDescription
                            }
                        });
                    } catch (e) {
                        console.error("[WebRTC] Error procesando oferta:", e);
                    }
                })
                .on('broadcast', { event: 'webrtc_answer' }, async ({ payload }) => {
                    if (payload.targetId !== localUserId) return;
                    const pc = peerConnections.current.get(payload.senderId);
                    if (pc && pc.signalingState !== 'closed') {
                        try {
                            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
                        } catch (e) {
                            console.error("[WebRTC] Error procesando respuesta:", e);
                        }
                    }
                })
                .on('broadcast', { event: 'webrtc_ice_candidate' }, async ({ payload }) => {
                    if (payload.targetId !== localUserId) return;
                    const pc = peerConnections.current.get(payload.senderId);
                    if (pc && pc.signalingState !== 'closed') {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
                        } catch (e) {
                            console.error("[WebRTC] Error procesando ICE:", e);
                        }
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

        // Cleanup
        return () => {
            active = false;
            if (channelRef.current) {
                channelRef.current.unsubscribe();
            }
            
            peerConnections.current.forEach(pc => pc.close());
            peerConnections.current.clear();
            
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
            }
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(t => t.stop());
            }
            
            if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
            
            // Limpiar BD
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


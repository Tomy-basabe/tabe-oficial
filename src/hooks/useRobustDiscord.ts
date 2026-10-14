import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ICE_SERVERS, optimizeSdp } from "@/lib/webrtc-config";

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface RemoteMediaState {
  isMuted: boolean;
  isVideoOff: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  // Retrocompatibilidad
  isCameraOn: boolean;
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

  // Matriz de estados del dispositivo local
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Derivados reactivos
  const isMuted = !isAudioEnabled || isDeafened;
  const isVideoOff = !isVideoEnabled;

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

  // Refs para closures estables
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const iceCandidateBuffer = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const isAudioEnabledRef = useRef(isAudioEnabled);
  const isVideoEnabledRef = useRef(isVideoEnabled);
  const isDeafenedRef = useRef(isDeafened);
  const isScreenSharingRef = useRef(isScreenSharing);
  const isSpeakingRef = useRef(isSpeaking);

  useEffect(() => {
    isAudioEnabledRef.current = isAudioEnabled;
  }, [isAudioEnabled]);
  useEffect(() => {
    isVideoEnabledRef.current = isVideoEnabled;
  }, [isVideoEnabled]);
  useEffect(() => {
    isDeafenedRef.current = isDeafened;
  }, [isDeafened]);
  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // Audio Analysis (VAD) refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<any>(null);

  // --- DISPOSITIVOS Y PERIFÉRICOS ---
  const getDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter((d) => d.kind === "videoinput");
      const audioDevs = devices.filter((d) => d.kind === "audioinput");

      setCameras(videoDevs.map((d, idx) => ({ deviceId: d.deviceId, label: d.label || `Cámara ${idx + 1}` })));
      setMics(audioDevs.map((d, idx) => ({ deviceId: d.deviceId, label: d.label || `Micrófono ${idx + 1}` })));

      if (videoDevs.length > 0 && !selectedCameraId) setSelectedCameraId(videoDevs[0].deviceId);
      if (audioDevs.length > 0 && !selectedMicId) setSelectedMicId(audioDevs[0].deviceId);
    } catch (err) {
      console.warn("[WebRTC] Error enumerando dispositivos:", err);
    }
  }, [selectedCameraId, selectedMicId]);

  // --- VOICE ACTIVITY DETECTION (VAD) CON UMBRAL -50 dB ---
  const emitSpeakingState = useCallback((speaking: boolean) => {
    if (!channelRef.current || !localUserId) return;

    channelRef.current.send({
      type: "broadcast",
      event: "user-speaking",
      payload: { userId: localUserId, isSpeaking: speaking },
    });

    channelRef.current.send({
      type: "broadcast",
      event: "user-toggle-media",
      payload: {
        userId: localUserId,
        isMuted: isDeafenedRef.current || !isAudioEnabledRef.current,
        isVideoOff: !isVideoEnabledRef.current,
        isDeafened: isDeafenedRef.current,
        isSpeaking: speaking,
        isScreenSharing: isScreenSharingRef.current,
      },
    });
  }, [localUserId]);

  const setupVAD = useCallback((stream: MediaStream) => {
    if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.35;
      analyzerRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);

      vadIntervalRef.current = setInterval(() => {
        if (!localUserId) return;

        // Si está silenciado o ensordecido, silenciar inmediatamente el estado de voz
        if (!isAudioEnabledRef.current || isDeafenedRef.current) {
          if (isSpeakingRef.current) {
            isSpeakingRef.current = false;
            setIsSpeaking(false);
            setSpeakingUsers((prev) => {
              const next = new Set(prev);
              next.delete(localUserId);
              return next;
            });
            emitSpeakingState(false);
          }
          return;
        }

        // Obtener datos de frecuencia en dB (valores negativos donde 0 dB = full scale)
        analyser.getFloatFrequencyData(dataArray);
        let maxDb = -Infinity;
        for (let i = 0; i < bufferLength; i++) {
          if (dataArray[i] > maxDb) {
            maxDb = dataArray[i];
          }
        }

        // Umbral de -50 dB solicitado
        const isSpeakingNow = maxDb > -50;

        if (isSpeakingNow !== isSpeakingRef.current) {
          isSpeakingRef.current = isSpeakingNow;
          setIsSpeaking(isSpeakingNow);
          setSpeakingUsers((prev) => {
            const next = new Set(prev);
            if (isSpeakingNow) next.add(localUserId);
            else next.delete(localUserId);
            return next;
          });
          emitSpeakingState(isSpeakingNow);
        }
      }, 100);
    } catch (e) {
      console.warn("[WebRTC] Error inicializando VAD:", e);
    }
  }, [emitSpeakingState, localUserId]);

  // --- ADQUISICIÓN INICIAL DE PERIFÉRICOS CON FALLBACK Y CONSTRAINTS ADAPTATIVAS ---
  const initLocalMedia = useCallback(async () => {
    let stream: MediaStream | null = null;
    try {
      // 1. Audio con optimizaciones para redes inestables (cancelación de eco, ganancia automática, mono a 48kHz)
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true },
        channelCount: { ideal: 1 },
      };

      if (selectedMicId && selectedMicId !== "default") {
        audioConstraints.deviceId = { exact: selectedMicId };
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: false,
        });
      } catch (audioErr) {
        console.warn("[WebRTC] Intento 1 de audio fallido. Reintentando audio genérico...", audioErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (fallbackErr) {
          console.warn("[WebRTC] Permisos de micrófono denegados o no disponibles. Modo escucha:", fallbackErr);
          stream = new MediaStream();
          setIsAudioEnabled(false);
        }
      }

      setLocalStream(stream);
      localStreamRef.current = stream;

      // Aplicar estado de pistas locales
      stream.getAudioTracks().forEach((track) => {
        track.enabled = isAudioEnabledRef.current && !isDeafenedRef.current;
      });

      if (stream.getAudioTracks().length > 0) {
        setupVAD(stream);
      }
      await getDevices();
      return stream;
    } catch (err) {
      console.error("[WebRTC] Error crítico en initLocalMedia:", err);
      const fallbackStream = new MediaStream();
      setLocalStream(fallbackStream);
      localStreamRef.current = fallbackStream;
      setIsAudioEnabled(false);
      return fallbackStream;
    }
  }, [getDevices, selectedMicId, setupVAD]);

  // --- BROADCAST MEDIA STATE ---
  const broadcastMediaState = useCallback(
    (customState?: Partial<RemoteMediaState>) => {
      if (!channelRef.current || !localUserId) return;

      const effectiveIsMuted = customState?.isMuted !== undefined
        ? customState.isMuted
        : (isDeafenedRef.current || !isAudioEnabledRef.current);

      const effectiveIsVideoOff = customState?.isVideoOff !== undefined
        ? customState.isVideoOff
        : !isVideoEnabledRef.current;

      const effectiveIsDeafened = customState?.isDeafened !== undefined
        ? customState.isDeafened
        : isDeafenedRef.current;

      const effectiveIsScreenSharing = customState?.isScreenSharing !== undefined
        ? customState.isScreenSharing
        : isScreenSharingRef.current;

      const effectiveIsSpeaking = customState?.isSpeaking !== undefined
        ? customState.isSpeaking
        : (isSpeakingRef.current && !effectiveIsMuted);

      const payload = {
        userId: localUserId,
        senderId: localUserId,
        isMuted: effectiveIsMuted,
        isVideoOff: effectiveIsVideoOff,
        isDeafened: effectiveIsDeafened,
        isSpeaking: effectiveIsSpeaking,
        isScreenSharing: effectiveIsScreenSharing,
        isCameraOn: !effectiveIsVideoOff,
        isAudioEnabled: !effectiveIsMuted,
      };

      // Emitir user-toggle-media (especificado) y media_state (retrocompatibilidad)
      channelRef.current.send({
        type: "broadcast",
        event: "user-toggle-media",
        payload,
      });

      channelRef.current.send({
        type: "broadcast",
        event: "media_state",
        payload,
      });

      // Sincronizar en presence
      channelRef.current
        .track({
          userId: localUserId,
          ...payload,
          onlineAt: new Date().toISOString(),
        })
        .catch(() => {});
    },
    [localUserId]
  );

  // Sincronizar DB de participantes de voz
  useEffect(() => {
    if (!channelId || !localUserId) return;
    supabase
      .from("discord_voice_participants")
      .update({
        is_camera_on: isVideoEnabled,
        is_screen_sharing: isScreenSharing,
        is_muted: !isAudioEnabled || isDeafened,
      })
      .eq("channel_id", channelId)
      .eq("user_id", localUserId)
      .then();
  }, [isVideoEnabled, isScreenSharing, isAudioEnabled, isDeafened, channelId, localUserId]);

  // Configurar prioridades de red en los senders de WebRTC
  const configureSenderPriorities = (pc: RTCPeerConnection) => {
    try {
      pc.getTransceivers().forEach((transceiver) => {
        if (!transceiver.sender) return;
        const kind = transceiver.receiver.track.kind;
        const params = transceiver.sender.getParameters();
        if (params && params.encodings && params.encodings.length > 0) {
          if (kind === "audio") {
            // Prioridad máxima al audio para que nunca se entrecorte
            params.encodings[0].networkPriority = "high";
            transceiver.sender.setParameters(params).catch(() => {});
          } else if (kind === "video") {
            // Limitar bitrate de video a 850 kbps para no saturar conexiones lentas
            params.encodings[0].networkPriority = "medium";
            params.encodings[0].maxBitrate = 850000;
            transceiver.sender.setParameters(params).catch(() => {});
          }
        }
      });
    } catch (_) {}
  };

  // --- GESTIÓN DE PEER CONNECTIONS WEBRTC CON SELF-HEALING Y FEC ---
  const createPeerConnection = useCallback((targetId: string, isInitiator: boolean) => {
    if (peerConnections.current.has(targetId)) {
      const existingPc = peerConnections.current.get(targetId)!;
      if (existingPc.signalingState !== "closed" && existingPc.connectionState !== "failed") {
        return existingPc;
      }
      existingPc.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(targetId, pc);

    setPeerStates((prev) => {
      const next = new Map(prev);
      next.set(targetId, "connecting");
      return next;
    });

    // 1. Audio: Añadir pista local de audio o transceptor sendrecv con prioridad alta
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      pc.addTrack(audioTrack, localStreamRef.current!);
    } else {
      pc.addTransceiver("audio", { direction: "sendrecv" });
    }

    // 2. Video: Transceptor de video en 'sendrecv'
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack && isVideoEnabledRef.current) {
      pc.addTrack(videoTrack, localStreamRef.current!);
    } else {
      pc.addTransceiver("video", { direction: "sendrecv" });
    }

    // 3. Pantalla compartida si existe
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, screenStreamRef.current!);
      });
    }

    configureSenderPriorities(pc);

    // 4. ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current && localUserId) {
        channelRef.current.send({
          type: "broadcast",
          event: "webrtc_ice_candidate",
          payload: { targetId, senderId: localUserId, candidate: event.candidate },
        });
      }
    };

    // 5. Recepción de pistas remotas
    pc.ontrack = (event) => {
      const track = event.track;
      const isScreen =
        track.kind === "video" &&
        (track.label.toLowerCase().includes("screen") ||
          track.label.toLowerCase().includes("window") ||
          track.label.toLowerCase().includes("display") ||
          track.label.toLowerCase().includes("pantalla") ||
          remoteMediaStates.get(targetId)?.isScreenSharing);

      if (isScreen) {
        setRemoteScreenStreams((prev) => {
          const next = new Map(prev);
          let stream = next.get(targetId) || new MediaStream();
          stream.getVideoTracks().forEach((t) => stream.removeTrack(t));
          stream.addTrack(track);
          next.set(targetId, stream);
          return next;
        });
      } else {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          let stream = next.get(targetId) || new MediaStream();
          const oldTracks = track.kind === "video" ? stream.getVideoTracks() : stream.getAudioTracks();
          oldTracks.forEach((t) => stream.removeTrack(t));
          stream.addTrack(track);
          next.set(targetId, stream);
          return new Map(next);
        });
      }
    };

    // Auto-recuperación activa de conexión ante caídas o cambio de red (Self-Healing)
    const handleConnectionFailure = () => {
      const currentPc = peerConnections.current.get(targetId);
      if (!currentPc || currentPc !== pc) return;

      console.warn(`[WebRTC] Detectada inestabilidad con ${targetId}. Iniciando auto-recuperación...`);
      // Intento 1: restartIce nativo
      if (typeof pc.restartIce === "function") {
        try {
          pc.restartIce();
        } catch (_) {}
      }

      // Re-ofertar con iceRestart
      pc.createOffer({ iceRestart: true })
        .then((offer) => {
          const sdp = optimizeSdp(offer.sdp || "");
          return pc.setLocalDescription({ type: offer.type, sdp });
        })
        .then(() => {
          channelRef.current?.send({
            type: "broadcast",
            event: "webrtc_offer",
            payload: {
              targetId,
              senderId: localUserId,
              offer: pc.localDescription,
            },
          });
        })
        .catch(() => {
          // Intento 2 agresivo: Recrear la conexión tras 2 segundos si el peer sigue caído
          setTimeout(() => {
            if (peerConnections.current.get(targetId) === pc) {
              if (pc.iceConnectionState === "failed" || pc.connectionState === "failed") {
                console.log(`[WebRTC] Recreando peer connection limpia con ${targetId}`);
                pc.close();
                peerConnections.current.delete(targetId);
                createPeerConnection(targetId, true);
              }
            }
          }, 2000);
        });
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      setPeerStates((prev) => {
        const n = new Map(prev);
        n.set(targetId, state);
        return n;
      });

      if (state === "failed") {
        handleConnectionFailure();
      } else if (state === "disconnected") {
        setTimeout(() => {
          if (pc.iceConnectionState === "disconnected") {
            handleConnectionFailure();
          }
        }, 1500);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "failed") {
        handleConnectionFailure();
      }
    };

    // Negociación inicial si somos el iniciador (con SDP optimizado Opus FEC)
    if (isInitiator) {
      pc.createOffer()
        .then((offer) => {
          const sdp = optimizeSdp(offer.sdp || "");
          return pc.setLocalDescription({ type: offer.type, sdp });
        })
        .then(() => {
          channelRef.current?.send({
            type: "broadcast",
            event: "webrtc_offer",
            payload: {
              targetId,
              senderId: localUserId,
              offer: pc.localDescription,
              mediaState: {
                isMuted: isDeafenedRef.current || !isAudioEnabledRef.current,
                isVideoOff: !isVideoEnabledRef.current,
                isDeafened: isDeafenedRef.current,
                isSpeaking: isSpeakingRef.current,
                isScreenSharing: isScreenSharingRef.current,
                isCameraOn: isVideoEnabledRef.current,
                isAudioEnabled: isAudioEnabledRef.current && !isDeafenedRef.current,
              },
            },
          });
        })
        .catch((e) => console.warn("[WebRTC] Error creando oferta inicial:", e));
    }

    return pc;
  }, [localUserId, remoteMediaStates]);

  // Actualización de estado de participante remoto
  const handleRemoteToggleMedia = useCallback(
    (payload: any) => {
      const peerId = payload.userId || payload.senderId;
      if (!peerId || peerId === localUserId) return;

      const isMuted =
        payload.isMuted !== undefined
          ? Boolean(payload.isMuted)
          : payload.isAudioEnabled !== undefined
          ? !payload.isAudioEnabled
          : false;

      const isVideoOff =
        payload.isVideoOff !== undefined
          ? Boolean(payload.isVideoOff)
          : payload.isCameraOn !== undefined
          ? !payload.isCameraOn
          : true;

      const isDeafened = Boolean(payload.isDeafened);
      const isSpeaking = Boolean(payload.isSpeaking);
      const isScreenSharing = Boolean(payload.isScreenSharing);

      setRemoteMediaStates((prev) => {
        const next = new Map(prev);
        next.set(peerId, {
          isMuted,
          isVideoOff,
          isDeafened,
          isSpeaking,
          isScreenSharing,
          isCameraOn: !isVideoOff,
          isAudioEnabled: !isMuted,
        });
        return next;
      });

      setSpeakingUsers((prev) => {
        const next = new Set(prev);
        if (isSpeaking && !isMuted) {
          next.add(peerId);
        } else {
          next.delete(peerId);
        }
        return next;
      });
    },
    [localUserId]
  );

  // --- EFECTO PRINCIPAL DE SALA Y SEÑALIZACIÓN ---
  useEffect(() => {
    if (!channelId || !localUserId) return;

    let active = true;

    const connect = async () => {
      await initLocalMedia();
      if (!active) return;

      const channel = supabase.channel(`room_${channelId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: localUserId },
        },
      });
      channelRef.current = channel;

      channel
        // Presencia
        .on("presence", { event: "sync" }, () => {
          const presenceState = channel.presenceState();
          setRemoteMediaStates((prev) => {
            const next = new Map(prev);
            Object.entries(presenceState).forEach(([userId, presences]: [string, any[]]) => {
              if (userId === localUserId) return;
              const latest = presences[presences.length - 1];
              if (latest) {
                const isMuted = latest.isMuted !== undefined ? latest.isMuted : !latest.isAudioEnabled;
                const isVideoOff = latest.isVideoOff !== undefined ? latest.isVideoOff : !latest.isCameraOn;
                next.set(userId, {
                  isMuted: Boolean(isMuted),
                  isVideoOff: Boolean(isVideoOff),
                  isDeafened: Boolean(latest.isDeafened),
                  isSpeaking: Boolean(latest.isSpeaking),
                  isScreenSharing: Boolean(latest.isScreenSharing),
                  isCameraOn: !isVideoOff,
                  isAudioEnabled: !isMuted,
                });

                if (!peerConnections.current.has(userId) && localUserId.localeCompare(userId) < 0) {
                  createPeerConnection(userId, true);
                }
              }
            });
            return next;
          });
        })
        .on("presence", { event: "join" }, ({ key }) => {
          if (key !== localUserId) {
            if (!peerConnections.current.has(key) && localUserId.localeCompare(key) < 0) {
              createPeerConnection(key, true);
            }
          }
        })
        .on("presence", { event: "leave" }, ({ key }) => {
          if (key !== localUserId) {
            const pc = peerConnections.current.get(key);
            if (pc) {
              pc.close();
              peerConnections.current.delete(key);
            }
            iceCandidateBuffer.current.delete(key);
            setRemoteStreams((prev) => {
              const m = new Map(prev);
              m.delete(key);
              return m;
            });
            setRemoteScreenStreams((prev) => {
              const m = new Map(prev);
              m.delete(key);
              return m;
            });
            setRemoteMediaStates((prev) => {
              const m = new Map(prev);
              m.delete(key);
              return m;
            });
            setPeerStates((prev) => {
              const m = new Map(prev);
              m.delete(key);
              return m;
            });
            setSpeakingUsers((prev) => {
              const next = new Set(prev);
              next.delete(key);
              return next;
            });
          }
        })
        // 1. user-joined (especificado) y user_joined (compatibilidad)
        .on("broadcast", { event: "user-joined" }, ({ payload }) => {
          if (payload?.userId && payload.userId !== localUserId) {
            handleRemoteToggleMedia(payload);
            broadcastMediaState();
            if (!peerConnections.current.has(payload.userId) && localUserId.localeCompare(payload.userId) < 0) {
              createPeerConnection(payload.userId, true);
            }
          }
        })
        .on("broadcast", { event: "user_joined" }, ({ payload }) => {
          if (payload?.userId && payload.userId !== localUserId) {
            handleRemoteToggleMedia(payload);
            broadcastMediaState();
            if (!peerConnections.current.has(payload.userId) && localUserId.localeCompare(payload.userId) < 0) {
              createPeerConnection(payload.userId, true);
            }
          }
        })
        // 2. user-left (especificado)
        .on("broadcast", { event: "user-left" }, ({ payload }) => {
          const peerId = payload?.userId || payload?.senderId;
          if (peerId && peerId !== localUserId) {
            const pc = peerConnections.current.get(peerId);
            if (pc) {
              pc.close();
              peerConnections.current.delete(peerId);
            }
            iceCandidateBuffer.current.delete(peerId);
            setRemoteStreams((prev) => {
              const m = new Map(prev);
              m.delete(peerId);
              return m;
            });
            setRemoteScreenStreams((prev) => {
              const m = new Map(prev);
              m.delete(peerId);
              return m;
            });
            setRemoteMediaStates((prev) => {
              const m = new Map(prev);
              m.delete(peerId);
              return m;
            });
            setSpeakingUsers((prev) => {
              const next = new Set(prev);
              next.delete(peerId);
              return next;
            });
          }
        })
        // 3. user-toggle-media (especificado) y media_state (compatibilidad)
        .on("broadcast", { event: "user-toggle-media" }, ({ payload }) => {
          handleRemoteToggleMedia(payload);
        })
        .on("broadcast", { event: "media_state" }, ({ payload }) => {
          handleRemoteToggleMedia(payload);
        })
        // 4. user-speaking (VAD)
        .on("broadcast", { event: "user-speaking" }, ({ payload }) => {
          if (!payload?.userId || payload.userId === localUserId) return;
          setSpeakingUsers((prev) => {
            const next = new Set(prev);
            if (payload.isSpeaking) next.add(payload.userId);
            else next.delete(payload.userId);
            return next;
          });
          setRemoteMediaStates((prev) => {
            const next = new Map(prev);
            const existing = next.get(payload.userId);
            if (existing) {
              next.set(payload.userId, {
                ...existing,
                isSpeaking: Boolean(payload.isSpeaking),
              });
            }
            return next;
          });
        })
        // 5. Señalización WebRTC (Offer / Answer / ICE con SDP optimizado Opus FEC)
        .on("broadcast", { event: "webrtc_offer" }, async ({ payload }) => {
          if (payload.targetId !== localUserId) return;
          try {
            let pc = peerConnections.current.get(payload.senderId);
            if (!pc || pc.signalingState === "closed") {
              pc = createPeerConnection(payload.senderId, false);
            }

            if (payload.mediaState) {
              handleRemoteToggleMedia({ ...payload.mediaState, userId: payload.senderId });
            }

            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));

            const buffered = iceCandidateBuffer.current.get(payload.senderId) || [];
            for (const c of buffered) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(c));
              } catch (_) {}
            }
            iceCandidateBuffer.current.delete(payload.senderId);

            const rawAnswer = await pc.createAnswer();
            const optimizedSdp = optimizeSdp(rawAnswer.sdp || "");
            const answer = { type: rawAnswer.type, sdp: optimizedSdp };
            await pc.setLocalDescription(answer);

            channel.send({
              type: "broadcast",
              event: "webrtc_answer",
              payload: {
                targetId: payload.senderId,
                senderId: localUserId,
                answer: pc.localDescription,
                mediaState: {
                  isMuted: isDeafenedRef.current || !isAudioEnabledRef.current,
                  isVideoOff: !isVideoEnabledRef.current,
                  isDeafened: isDeafenedRef.current,
                  isSpeaking: isSpeakingRef.current,
                  isScreenSharing: isScreenSharingRef.current,
                  isCameraOn: isVideoEnabledRef.current,
                  isAudioEnabled: isAudioEnabledRef.current && !isDeafenedRef.current,
                },
              },
            });
          } catch (e) {
            console.warn("[WebRTC] Error procesando oferta:", e);
          }
        })
        .on("broadcast", { event: "webrtc_answer" }, async ({ payload }) => {
          if (payload.targetId !== localUserId) return;
          const pc = peerConnections.current.get(payload.senderId);
          if (pc && pc.signalingState !== "closed") {
            try {
              if (payload.mediaState) {
                handleRemoteToggleMedia({ ...payload.mediaState, userId: payload.senderId });
              }
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
              const buffered = iceCandidateBuffer.current.get(payload.senderId) || [];
              for (const c of buffered) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(c));
                } catch (_) {}
              }
              iceCandidateBuffer.current.delete(payload.senderId);
            } catch (e) {
              console.warn("[WebRTC] Error procesando respuesta:", e);
            }
          }
        })
        .on("broadcast", { event: "webrtc_ice_candidate" }, async ({ payload }) => {
          if (payload.targetId !== localUserId) return;
          const pc = peerConnections.current.get(payload.senderId);
          if (pc && pc.signalingState !== "closed" && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.warn("[WebRTC] Error ICE:", e);
            }
          } else {
            const buf = iceCandidateBuffer.current.get(payload.senderId) || [];
            buf.push(payload.candidate);
            iceCandidateBuffer.current.set(payload.senderId, buf);
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            const myState = {
              userId: localUserId,
              isMuted: isDeafenedRef.current || !isAudioEnabledRef.current,
              isVideoOff: !isVideoEnabledRef.current,
              isDeafened: isDeafenedRef.current,
              isSpeaking: isSpeakingRef.current,
              isScreenSharing: isScreenSharingRef.current,
              isCameraOn: isVideoEnabledRef.current,
              isAudioEnabled: isAudioEnabledRef.current && !isDeafenedRef.current,
              onlineAt: new Date().toISOString(),
            };
            await channel.track(myState);
            channel.send({
              type: "broadcast",
              event: "user-joined",
              payload: myState,
            });
            channel.send({
              type: "broadcast",
              event: "user_joined",
              payload: myState,
            });
            broadcastMediaState();
          }
        });
    };

    connect();

    // Auto-recuperación cuando el dispositivo recupera conexión a internet
    const handleDeviceOnline = () => {
      console.log("[WebRTC] Evento 'online' detectado: Verificando y recuperando conexiones congeladas...");
      peerConnections.current.forEach((pc, targetId) => {
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed" || pc.connectionState === "failed") {
          pc.close();
          peerConnections.current.delete(targetId);
          createPeerConnection(targetId, true);
        }
      });
      broadcastMediaState();
    };
    window.addEventListener("online", handleDeviceOnline);

    return () => {
      active = false;
      window.removeEventListener("online", handleDeviceOnline);

      // Emitir user-left al canal antes de desconectar
      if (channelRef.current && localUserId) {
        channelRef.current.send({
          type: "broadcast",
          event: "user-left",
          payload: { userId: localUserId, senderId: localUserId },
        });
        channelRef.current.unsubscribe();
      }

      // Detener y liberar todas las pistas de audio y video
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Cerrar AudioContext de VAD
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }

      // Cerrar peer connections y liberar recursos
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      iceCandidateBuffer.current.clear();

      // Limpiar fila en la base de datos
      supabase
        .from("discord_voice_participants")
        .delete()
        .eq("channel_id", channelId)
        .eq("user_id", localUserId)
        .then();
    };
  }, [channelId, localUserId, initLocalMedia, createPeerConnection, broadcastMediaState, handleRemoteToggleMedia]);

  // Limpieza en evento beforeunload
  useEffect(() => {
    const handleUnload = () => {
      if (channelId && localUserId) {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "user-left",
            payload: { userId: localUserId, senderId: localUserId },
          });
        }
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [channelId, localUserId]);

  // --- RE-NEGOCIACIÓN SUAVE DE PISTAS (REPLACE TRACK SIN DESCONEXIÓN) ---
  const updateTrackInPeers = useCallback((track: MediaStreamTrack | null, kind: "audio" | "video") => {
    peerConnections.current.forEach((pc) => {
      if (pc.signalingState === "closed") return;
      const transceiver = pc.getTransceivers().find((t) => t.receiver.track.kind === kind);
      if (transceiver && transceiver.sender) {
        transceiver.sender.replaceTrack(track).catch(() => {});
        if (track && kind === "video") {
          transceiver.direction = "sendrecv";
        }
      } else if (track && localStreamRef.current) {
        pc.addTrack(track, localStreamRef.current);
      }
    });
  }, []);

  // --- MÉTODOS DE TOGGLE Y ACCIÓN DE MEDIA ---

  // 1. Toggle Audio / Micrófono
  const toggleAudio = useCallback(() => {
    if (isDeafenedRef.current) {
      setIsDeafened(false);
      isDeafenedRef.current = false;
    }

    setIsAudioEnabled((prev) => {
      const next = !prev;
      isAudioEnabledRef.current = next;

      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = next;
        });
      }

      if (!next && isSpeakingRef.current) {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        setSpeakingUsers((p) => {
          const n = new Set(p);
          if (localUserId) n.delete(localUserId);
          return n;
        });
      }

      broadcastMediaState({
        isMuted: !next,
        isAudioEnabled: next,
        isSpeaking: false,
        isDeafened: false,
      });

      return next;
    });
  }, [broadcastMediaState, localUserId]);

  // 2. Toggle Ensordecer (Deafen)
  const toggleDeafen = useCallback(() => {
    setIsDeafened((prevDeafened) => {
      const nextDeafened = !prevDeafened;
      isDeafenedRef.current = nextDeafened;

      if (nextDeafened) {
        setIsAudioEnabled(false);
        isAudioEnabledRef.current = false;

        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = false;
          });
        }

        if (isSpeakingRef.current) {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          setSpeakingUsers((prev) => {
            const next = new Set(prev);
            if (localUserId) next.delete(localUserId);
            return next;
          });
        }
      }

      broadcastMediaState({
        isDeafened: nextDeafened,
        isMuted: nextDeafened ? true : !isAudioEnabledRef.current,
        isAudioEnabled: nextDeafened ? false : isAudioEnabledRef.current,
        isSpeaking: false,
      });

      return nextDeafened;
    });
  }, [broadcastMediaState, localUserId]);

  // 3. Toggle Video / Cámara con resolución adaptativa (720p/24fps con fallback a 480p)
  const toggleVideo = useCallback(async () => {
    try {
      if (!isVideoEnabled) {
        let newStream: MediaStream;
        const videoConstraints: MediaTrackConstraints = {
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
          frameRate: { ideal: 24, max: 30 },
        };
        if (selectedCameraId && selectedCameraId !== "default") {
          videoConstraints.deviceId = { exact: selectedCameraId };
        }

        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false,
          });
        } catch {
          // Fallback a resolución básica si la cámara o conexión no admiten 720p
          newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        const videoTrack = newStream.getVideoTracks()[0];
        if (localStreamRef.current && videoTrack) {
          const oldTrack = localStreamRef.current.getVideoTracks()[0];
          if (oldTrack) {
            localStreamRef.current.removeTrack(oldTrack);
            oldTrack.stop();
          }
          videoTrack.enabled = true;
          localStreamRef.current.addTrack(videoTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        } else if (videoTrack) {
          videoTrack.enabled = true;
          const combined = new MediaStream([videoTrack]);
          localStreamRef.current = combined;
          setLocalStream(combined);
        }

        setIsVideoEnabled(true);
        isVideoEnabledRef.current = true;
        updateTrackInPeers(videoTrack, "video");
        broadcastMediaState({ isVideoOff: false, isCameraOn: true });
        await getDevices();
      } else {
        if (localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.enabled = false;
            videoTrack.stop();
            localStreamRef.current.removeTrack(videoTrack);
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          }
        }
        setIsVideoEnabled(false);
        isVideoEnabledRef.current = false;
        updateTrackInPeers(null, "video");
        broadcastMediaState({ isVideoOff: true, isCameraOn: false });
      }
    } catch (e) {
      console.warn("[WebRTC] Error alternando video:", e);
    }
  }, [broadcastMediaState, getDevices, isVideoEnabled, selectedCameraId, updateTrackInPeers]);

  // 4. Compartir Pantalla
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      screenStreamRef.current = null;
      setIsScreenSharing(false);
      isScreenSharingRef.current = false;

      peerConnections.current.forEach((pc) => {
        const senders = pc.getSenders();
        const screenSender = senders.find(
          (s) =>
            s.track?.kind === "video" &&
            (s.track.label.toLowerCase().includes("screen") ||
              s.track.label.toLowerCase().includes("window") ||
              s.track.label.toLowerCase().includes("display"))
        );
        if (screenSender) pc.removeTrack(screenSender);
      });

      broadcastMediaState({ isScreenSharing: false });
    }
  }, [broadcastMediaState]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      setScreenStream(stream);
      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      isScreenSharingRef.current = true;

      const screenVideoTrack = stream.getVideoTracks()[0];
      if (screenVideoTrack) {
        screenVideoTrack.onended = () => {
          stopScreenShare();
        };

        peerConnections.current.forEach((pc) => {
          pc.addTrack(screenVideoTrack, stream);
        });
      }

      broadcastMediaState({ isScreenSharing: true });
    } catch (e) {
      console.warn("[WebRTC] Error iniciando screen share:", e);
    }
  }, [broadcastMediaState, stopScreenShare]);

  // 5. Cambio de dispositivos
  const switchCamera = useCallback(
    async (deviceId: string) => {
      setSelectedCameraId(deviceId);
      localStorage.setItem("tabetalk_video_input_device", deviceId);
      if (isVideoEnabled) {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: deviceId && deviceId !== "default" ? { deviceId: { exact: deviceId } } : true,
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
            updateTrackInPeers(videoTrack, "video");
          }
        } catch (e) {
          console.warn("[WebRTC] Error cambiando cámara:", e);
        }
      }
    },
    [isVideoEnabled, updateTrackInPeers]
  );

  const switchMic = useCallback(
    async (deviceId: string) => {
      setSelectedMicId(deviceId);
      localStorage.setItem("tabetalk_audio_input_device", deviceId);
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId && deviceId !== "default" ? { deviceId: { exact: deviceId } } : true,
        });
        const audioTrack = newStream.getAudioTracks()[0];
        if (localStreamRef.current && audioTrack) {
          const oldTrack = localStreamRef.current.getAudioTracks()[0];
          if (oldTrack) {
            localStreamRef.current.removeTrack(oldTrack);
            oldTrack.stop();
          }
          audioTrack.enabled = isAudioEnabledRef.current && !isDeafenedRef.current;
          localStreamRef.current.addTrack(audioTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

          setupVAD(localStreamRef.current);
          updateTrackInPeers(audioTrack, "audio");
        }
      } catch (e) {
        console.warn("[WebRTC] Error cambiando micrófono:", e);
      }
    },
    [setupVAD, updateTrackInPeers]
  );

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
    isDeafened,
    isScreenSharing,
    isSpeaking,
    isMuted,
    isVideoOff,

    cameras,
    selectedCameraId,
    mics,
    selectedMicId,

    toggleAudio,
    toggleVideo,
    toggleDeafen,
    startScreenShare,
    stopScreenShare,
    switchCamera,
    switchMic,
  };
}

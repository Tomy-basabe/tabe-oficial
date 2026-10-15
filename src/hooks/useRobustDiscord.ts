import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ICE_SERVERS, optimizeSdp } from "@/lib/webrtc-config";
import { toast } from "sonner";

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface RemoteMediaState {
  displayName?: string;
  avatarUrl?: string | null;
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

  // Identidad local para señalización y Presencia
  const getLocalIdentity = useCallback(() => {
    const meta = (user?.user_metadata as any) || {};
    return {
      displayName:
        localStorage.getItem("tabetalk_nickname") ||
        meta.nombre ||
        meta.full_name ||
        meta.username ||
        user?.email?.split("@")[0] ||
        "Estudiante",
      avatarUrl:
        localStorage.getItem("tabetalk_avatar") || meta.avatar_url || null,
    };
  }, [user]);

  // --- DISPOSITIVOS Y PERIFÉRICOS ---
  const getDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter((d) => d.kind === "videoinput");
      const audioDevs = devices.filter((d) => d.kind === "audioinput");

      setCameras(
        videoDevs.map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Cámara ${i + 1}`,
        }))
      );
      setMics(
        audioDevs.map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Micrófono ${i + 1}`,
        }))
      );
    } catch (e) {
      console.warn("[WebRTC] Error al enumerar dispositivos:", e);
    }
  }, []);

  // Emisión rápida de detección de voz (VAD)
  const emitSpeakingState = useCallback(
    (speaking: boolean) => {
      if (!channelRef.current || !localUserId) return;
      channelRef.current.send({
        type: "broadcast",
        event: "user-speaking",
        payload: { userId: localUserId, isSpeaking: speaking },
      });
    },
    [localUserId]
  );

  // Configuración de Analizador de Audio para VAD (Voice Activity Detection)
  const setupVAD = useCallback(
    (stream: MediaStream) => {
      try {
        if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          audioContextRef.current.close().catch(() => {});
        }

        const audioTrack = stream.getAudioTracks().find((t) => t.readyState === "live");
        if (!audioTrack) return;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const audioCtx = new AudioCtx();
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

          analyser.getFloatFrequencyData(dataArray);
          let maxDb = -Infinity;
          for (let i = 0; i < bufferLength; i++) {
            if (dataArray[i] > maxDb) {
              maxDb = dataArray[i];
            }
          }

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
    },
    [emitSpeakingState, localUserId]
  );

  // --- ADQUISICIÓN INICIAL DE PERIFÉRICOS CON MODO OYENTE RESILIENTE ---
  const initLocalMedia = useCallback(async () => {
    let stream: MediaStream | null = null;
    try {
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true },
        channelCount: { ideal: 1 },
      };

      if (selectedMicId && selectedMicId !== "default") {
        audioConstraints.deviceId = { ideal: selectedMicId };
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
          console.warn("[WebRTC] Micrófono denegado o no disponible. Entrando en modo oyente:", fallbackErr);
          stream = new MediaStream();
          setIsAudioEnabled(false);
          isAudioEnabledRef.current = false;
        }
      }

      setLocalStream(stream);
      localStreamRef.current = stream;

      stream.getAudioTracks().forEach((track) => {
        track.enabled = isAudioEnabledRef.current && !isDeafenedRef.current;
      });

      if (stream.getAudioTracks().length > 0) {
        setupVAD(stream);
      }
      await getDevices();
      return stream;
    } catch (err) {
      console.error("[WebRTC] Error en initLocalMedia, creando MediaStream vacío:", err);
      const fallbackStream = new MediaStream();
      setLocalStream(fallbackStream);
      localStreamRef.current = fallbackStream;
      setIsAudioEnabled(false);
      isAudioEnabledRef.current = false;
      return fallbackStream;
    }
  }, [getDevices, selectedMicId, setupVAD]);

  // --- BROADCAST MEDIA STATE & PRESENCE ---
  const broadcastMediaState = useCallback(
    (customState?: Partial<RemoteMediaState>) => {
      if (!channelRef.current || !localUserId) return;
      const identity = getLocalIdentity();

      const nextMuted =
        customState?.isMuted !== undefined
          ? customState.isMuted
          : (isDeafenedRef.current || !isAudioEnabledRef.current);

      const nextVideoOff =
        customState?.isVideoOff !== undefined
          ? customState.isVideoOff
          : !isVideoEnabledRef.current;

      const nextDeafened =
        customState?.isDeafened !== undefined
          ? customState.isDeafened
          : isDeafenedRef.current;

      const nextScreenSharing =
        customState?.isScreenSharing !== undefined
          ? customState.isScreenSharing
          : isScreenSharingRef.current;

      const nextSpeaking =
        customState?.isSpeaking !== undefined
          ? customState.isSpeaking
          : (isSpeakingRef.current && !nextMuted);

      const payload = {
        userId: localUserId,
        senderId: localUserId,
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
        isMuted: nextMuted,
        isVideoOff: nextVideoOff,
        isDeafened: nextDeafened,
        isSpeaking: nextSpeaking,
        isScreenSharing: nextScreenSharing,
        isCameraOn: !nextVideoOff,
        isAudioEnabled: !nextMuted,
        onlineAt: new Date().toISOString(),
      };

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

      // Sincronizar en presence para que los compañeros que entren después reciban el estado
      channelRef.current.track(payload).catch(() => {});
    },
    [localUserId, getLocalIdentity]
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
        const kind = transceiver.receiver?.track?.kind;
        const params = transceiver.sender.getParameters();
        if (params && params.encodings && params.encodings.length > 0) {
          if (kind === "audio") {
            params.encodings[0].networkPriority = "high";
            transceiver.sender.setParameters(params).catch(() => {});
          } else if (kind === "video") {
            params.encodings[0].networkPriority = "medium";
            params.encodings[0].maxBitrate = 850000;
            transceiver.sender.setParameters(params).catch(() => {});
          }
        }
      });
    } catch (_) {}
  };

  /**
   * Renegocia SDP con un peer específico cuando se agrega una pista nueva en caliente.
   */
  const renegotiateWithPeer = useCallback(
    async (peerId: string, pc: RTCPeerConnection) => {
      if (!localUserId || !channelRef.current) return;
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        const optimizedOffer: RTCSessionDescriptionInit = {
          type: offer.type,
          sdp: optimizeSdp(offer.sdp || ""),
        };
        await pc.setLocalDescription(optimizedOffer);

        const identity = getLocalIdentity();
        const payload = {
          senderId: localUserId,
          targetId: peerId,
          sdp: pc.localDescription,
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
          ...identity,
        };

        channelRef.current.send({
          type: "broadcast",
          event: "webrtc-offer",
          payload,
        });
        channelRef.current.send({
          type: "broadcast",
          event: "webrtc_offer",
          payload,
        });
      } catch (err) {
        console.warn(`[TabeTalk] Error renegociando SDP con ${peerId}:`, err);
      }
    },
    [localUserId, getLocalIdentity]
  );

  // --- GESTIÓN DE PEER CONNECTIONS WEBRTC ---
  const createPeerConnection = useCallback(
    (targetId: string, isInitiator: boolean) => {
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

      // 1. Audio: Añadir pista local de audio o transceptor sendrecv
      const audioTrack = localStreamRef.current?.getAudioTracks().find((t) => t.readyState === "live");
      if (audioTrack) {
        pc.addTrack(audioTrack, localStreamRef.current!);
      } else {
        pc.addTransceiver("audio", { direction: "sendrecv" });
      }

      // 2. Video: Añadir pista local de video o transceptor sendrecv
      const videoTrack = localStreamRef.current?.getVideoTracks().find((t) => t.readyState === "live");
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

      // 4. ICE Candidates (emitir formatos guion y guion bajo para máxima compatibilidad)
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current && localUserId) {
          const icePayload = { targetId, senderId: localUserId, candidate: event.candidate };
          channelRef.current.send({
            type: "broadcast",
            event: "webrtc-ice-candidate",
            payload: icePayload,
          });
          channelRef.current.send({
            type: "broadcast",
            event: "webrtc_ice_candidate",
            payload: icePayload,
          });
        }
      };

      // 5. Recepción de pistas remotas reactivas
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
            next.set(targetId, new MediaStream(stream.getTracks()));
            return next;
          });
        } else {
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            let stream = next.get(targetId) || new MediaStream();
            const oldTracks = track.kind === "video" ? stream.getVideoTracks() : stream.getAudioTracks();
            oldTracks.forEach((t) => stream.removeTrack(t));
            stream.addTrack(track);
            next.set(targetId, new MediaStream(stream.getTracks()));
            return new Map(next);
          });
        }
      };

      // Auto-recuperación de conexión (Self-Healing)
      const handleConnectionFailure = () => {
        const currentPc = peerConnections.current.get(targetId);
        if (!currentPc || currentPc !== pc) return;

        console.warn(`[WebRTC] Inestabilidad detectada con ${targetId}. Auto-recuperando...`);
        if (typeof pc.restartIce === "function") {
          try {
            pc.restartIce();
          } catch (_) {}
        }

        pc.createOffer({ iceRestart: true })
          .then((offer) => {
            const sdp = optimizeSdp(offer.sdp || "");
            return pc.setLocalDescription({ type: offer.type, sdp });
          })
          .then(() => {
            const identity = getLocalIdentity();
            const payload = {
              targetId,
              senderId: localUserId,
              offer: pc.localDescription,
              sdp: pc.localDescription,
              ...identity,
            };
            channelRef.current?.send({
              type: "broadcast",
              event: "webrtc-offer",
              payload,
            });
            channelRef.current?.send({
              type: "broadcast",
              event: "webrtc_offer",
              payload,
            });
          })
          .catch(() => {
            setTimeout(() => {
              if (peerConnections.current.get(targetId) === pc) {
                if (pc.iceConnectionState === "failed" || pc.connectionState === "failed") {
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

      // Negociación inicial si este peer inicia el Offer
      if (isInitiator) {
        pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
          .then((offer) => {
            const sdp = optimizeSdp(offer.sdp || "");
            return pc.setLocalDescription({ type: offer.type, sdp });
          })
          .then(() => {
            const identity = getLocalIdentity();
            const payload = {
              targetId,
              senderId: localUserId,
              offer: pc.localDescription,
              sdp: pc.localDescription,
              mediaState: {
                isMuted: isDeafenedRef.current || !isAudioEnabledRef.current,
                isVideoOff: !isVideoEnabledRef.current,
                isDeafened: isDeafenedRef.current,
                isSpeaking: isSpeakingRef.current,
                isScreenSharing: isScreenSharingRef.current,
                isCameraOn: isVideoEnabledRef.current,
                isAudioEnabled: isAudioEnabledRef.current && !isDeafenedRef.current,
              },
              ...identity,
            };
            channelRef.current?.send({
              type: "broadcast",
              event: "webrtc-offer",
              payload,
            });
            channelRef.current?.send({
              type: "broadcast",
              event: "webrtc_offer",
              payload,
            });
          })
          .catch((e) => console.warn("[WebRTC] Error creando oferta inicial:", e));
      }

      return pc;
    },
    [localUserId, remoteMediaStates, getLocalIdentity]
  );

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
      const displayName = payload.displayName;
      const avatarUrl = payload.avatarUrl;

      setRemoteMediaStates((prev) => {
        const next = new Map(prev);
        const prevEntry = next.get(peerId);
        next.set(peerId, {
          displayName: displayName || prevEntry?.displayName || "Estudiante",
          avatarUrl: avatarUrl !== undefined ? avatarUrl : (prevEntry?.avatarUrl ?? null),
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

  // --- EFECTO PRINCIPAL DE SALA, PRESENCE Y SEÑALIZACIÓN ---
  useEffect(() => {
    if (!channelId || !localUserId) return;

    let active = true;

    const connect = async () => {
      await initLocalMedia();
      if (!active) return;

      const channel = supabase.channel(`tabetalk-room-${channelId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: localUserId },
        },
      });
      channelRef.current = channel;

      // 1. Sincronización completa de Presencia
      channel
        .on("presence", { event: "sync" }, () => {
          const presenceState = channel.presenceState();
          Object.entries(presenceState).forEach(([peerId, presences]: [string, any[]]) => {
            if (peerId === localUserId || !presences || presences.length === 0) return;
            const latest = presences[presences.length - 1];
            if (latest) {
              const isMuted = latest.isMuted !== undefined ? latest.isMuted : !latest.isAudioEnabled;
              const isVideoOff = latest.isVideoOff !== undefined ? latest.isVideoOff : !latest.isCameraOn;
              setRemoteMediaStates((prev) => {
                const next = new Map(prev);
                next.set(peerId, {
                  displayName: latest.displayName || "Estudiante",
                  avatarUrl: latest.avatarUrl || null,
                  isMuted: Boolean(isMuted),
                  isVideoOff: Boolean(isVideoOff),
                  isDeafened: Boolean(latest.isDeafened),
                  isSpeaking: Boolean(latest.isSpeaking),
                  isScreenSharing: Boolean(latest.isScreenSharing),
                  isCameraOn: !isVideoOff,
                  isAudioEnabled: !isMuted,
                });
                return next;
              });

              // Desempate determinista para evitar Glare (userId menor envía el Offer)
              if (!peerConnections.current.has(peerId)) {
                const shouldInitiateOffer = localUserId.localeCompare(peerId) < 0;
                createPeerConnection(peerId, shouldInitiateOffer);
              }
            }
          });
        })
        .on("presence", { event: "join" }, ({ key, newPresences }) => {
          if (key !== localUserId) {
            const latest = newPresences?.[newPresences.length - 1];
            if (latest) {
              setRemoteMediaStates((prev) => {
                const next = new Map(prev);
                const isMuted = latest.isMuted !== undefined ? latest.isMuted : !latest.isAudioEnabled;
                const isVideoOff = latest.isVideoOff !== undefined ? latest.isVideoOff : !latest.isCameraOn;
                next.set(key, {
                  displayName: latest.displayName || "Estudiante",
                  avatarUrl: latest.avatarUrl || null,
                  isMuted: Boolean(isMuted),
                  isVideoOff: Boolean(isVideoOff),
                  isDeafened: Boolean(latest.isDeafened),
                  isSpeaking: Boolean(latest.isSpeaking),
                  isScreenSharing: Boolean(latest.isScreenSharing),
                  isCameraOn: !isVideoOff,
                  isAudioEnabled: !isMuted,
                });
                return next;
              });
            }
            if (!peerConnections.current.has(key)) {
              const shouldInitiateOffer = localUserId.localeCompare(key) < 0;
              createPeerConnection(key, shouldInitiateOffer);
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
        });

      // 2. Broadcast de usuarios y medios
      channel
        .on("broadcast", { event: "user-joined" }, ({ payload }) => {
          if (payload?.userId && payload.userId !== localUserId) {
            handleRemoteToggleMedia(payload);
            broadcastMediaState();
            if (!peerConnections.current.has(payload.userId)) {
              const shouldInitiateOffer = localUserId.localeCompare(payload.userId) < 0;
              createPeerConnection(payload.userId, shouldInitiateOffer);
            }
          }
        })
        .on("broadcast", { event: "user_joined" }, ({ payload }) => {
          if (payload?.userId && payload.userId !== localUserId) {
            handleRemoteToggleMedia(payload);
            broadcastMediaState();
            if (!peerConnections.current.has(payload.userId)) {
              const shouldInitiateOffer = localUserId.localeCompare(payload.userId) < 0;
              createPeerConnection(payload.userId, shouldInitiateOffer);
            }
          }
        })
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
        .on("broadcast", { event: "user-toggle-media" }, ({ payload }) => {
          handleRemoteToggleMedia(payload);
        })
        .on("broadcast", { event: "media_state" }, ({ payload }) => {
          handleRemoteToggleMedia(payload);
        })
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
        });

      // 3. Manejadores de Señalización WebRTC (Offer / Answer / ICE)
      const handleOffer = async ({ payload }: { payload: any }) => {
        if (payload.targetId !== localUserId) return;
        try {
          let pc = peerConnections.current.get(payload.senderId);
          if (!pc || pc.signalingState === "closed") {
            pc = createPeerConnection(payload.senderId, false);
          }

          if (payload.mediaState || payload.displayName) {
            handleRemoteToggleMedia({
              ...payload.mediaState,
              displayName: payload.displayName,
              avatarUrl: payload.avatarUrl,
              userId: payload.senderId,
            });
          }

          const offerDesc = payload.offer || payload.sdp;
          await pc.setRemoteDescription(new RTCSessionDescription(offerDesc));

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

          const identity = getLocalIdentity();
          const answerPayload = {
            targetId: payload.senderId,
            senderId: localUserId,
            answer: pc.localDescription,
            sdp: pc.localDescription,
            mediaState: {
              isMuted: isDeafenedRef.current || !isAudioEnabledRef.current,
              isVideoOff: !isVideoEnabledRef.current,
              isDeafened: isDeafenedRef.current,
              isSpeaking: isSpeakingRef.current,
              isScreenSharing: isScreenSharingRef.current,
              isCameraOn: isVideoEnabledRef.current,
              isAudioEnabled: isAudioEnabledRef.current && !isDeafenedRef.current,
            },
            ...identity,
          };

          channel.send({
            type: "broadcast",
            event: "webrtc-answer",
            payload: answerPayload,
          });
          channel.send({
            type: "broadcast",
            event: "webrtc_answer",
            payload: answerPayload,
          });
        } catch (e) {
          console.warn("[WebRTC] Error procesando oferta:", e);
        }
      };

      const handleAnswer = async ({ payload }: { payload: any }) => {
        if (payload.targetId !== localUserId) return;
        const pc = peerConnections.current.get(payload.senderId);
        if (pc && pc.signalingState !== "closed") {
          try {
            if (payload.mediaState || payload.displayName) {
              handleRemoteToggleMedia({
                ...payload.mediaState,
                displayName: payload.displayName,
                avatarUrl: payload.avatarUrl,
                userId: payload.senderId,
              });
            }
            const answerDesc = payload.answer || payload.sdp;
            await pc.setRemoteDescription(new RTCSessionDescription(answerDesc));
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
      };

      const handleIceCandidate = async ({ payload }: { payload: any }) => {
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
      };

      channel
        .on("broadcast", { event: "webrtc-offer" }, handleOffer)
        .on("broadcast", { event: "webrtc_offer" }, handleOffer)
        .on("broadcast", { event: "webrtc-answer" }, handleAnswer)
        .on("broadcast", { event: "webrtc_answer" }, handleAnswer)
        .on("broadcast", { event: "webrtc-ice-candidate" }, handleIceCandidate)
        .on("broadcast", { event: "webrtc_ice_candidate" }, handleIceCandidate);

      // 4. Suscripción y registro de presencia inicial
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const identity = getLocalIdentity();
          const hasAudioTrack =
            (localStreamRef.current?.getAudioTracks().filter((t) => t.readyState === "live").length || 0) > 0;
          const initialState = {
            userId: localUserId,
            senderId: localUserId,
            displayName: identity.displayName,
            avatarUrl: identity.avatarUrl,
            isMuted: !hasAudioTrack || !isAudioEnabledRef.current || isDeafenedRef.current,
            isVideoOff: !isVideoEnabledRef.current,
            isDeafened: isDeafenedRef.current,
            isSpeaking: false,
            isScreenSharing: isScreenSharingRef.current,
            isCameraOn: isVideoEnabledRef.current,
            isAudioEnabled: hasAudioTrack && isAudioEnabledRef.current && !isDeafenedRef.current,
            onlineAt: new Date().toISOString(),
          };

          await channel.track(initialState).catch(() => {});
          channel.send({
            type: "broadcast",
            event: "user-joined",
            payload: initialState,
          });
          channel.send({
            type: "broadcast",
            event: "user_joined",
            payload: initialState,
          });
          broadcastMediaState();
        }
      });
    };

    connect();

    const handleDeviceOnline = () => {
      console.log("[WebRTC] Reconexión de red detectada: verificando peers...");
      peerConnections.current.forEach((pc, targetId) => {
        if (
          pc.iceConnectionState === "disconnected" ||
          pc.iceConnectionState === "failed" ||
          pc.connectionState === "failed"
        ) {
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

      if (channelRef.current && localUserId) {
        channelRef.current.send({
          type: "broadcast",
          event: "user-left",
          payload: { userId: localUserId, senderId: localUserId },
        });
        channelRef.current.unsubscribe();
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }

      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      iceCandidateBuffer.current.clear();

      supabase
        .from("discord_voice_participants")
        .delete()
        .eq("channel_id", channelId)
        .eq("user_id", localUserId)
        .then();
    };
  }, [
    channelId,
    localUserId,
    initLocalMedia,
    createPeerConnection,
    broadcastMediaState,
    handleRemoteToggleMedia,
    getLocalIdentity,
  ]);

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

  // --- MÉTODOS DE TOGGLE Y ACCIÓN DE MEDIA ---

  // 1. Toggle Audio / Micrófono con adquisición en caliente
  const toggleAudio = useCallback(async () => {
    if (!localUserId) return;

    try {
      let stream = localStreamRef.current;
      if (!stream) {
        stream = new MediaStream();
        localStreamRef.current = stream;
      }

      let audioTracks = stream.getAudioTracks().filter((t) => t.readyState === "live");

      if (isDeafenedRef.current) {
        setIsDeafened(false);
        isDeafenedRef.current = false;
      }

      // Caso 1: No existía pista viva -> solicitar hardware al navegador
      if (audioTracks.length === 0) {
        const savedMicId =
          selectedMicId || localStorage.getItem("tabetalk_audio_input_device") || "default";
        const echoCancellation =
          localStorage.getItem("tabetalk_echo_cancellation") !== "false";
        const noiseSuppression =
          localStorage.getItem("tabetalk_noise_suppression") !== "false";

        let micStream: MediaStream;
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio:
              savedMicId && savedMicId !== "default"
                ? {
                    deviceId: { ideal: savedMicId },
                    echoCancellation,
                    noiseSuppression,
                    autoGainControl: true,
                  }
                : {
                    echoCancellation,
                    noiseSuppression,
                    autoGainControl: true,
                  },
          });
        } catch {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        const newAudioTrack = micStream.getAudioTracks()[0];
        if (!newAudioTrack) return;
        newAudioTrack.enabled = true;

        stream.getAudioTracks().forEach((old) => {
          old.stop();
          stream!.removeTrack(old);
        });
        stream.addTrack(newAudioTrack);

        const clonedStream = new MediaStream(stream.getTracks());
        localStreamRef.current = clonedStream;
        setLocalStream(clonedStream);
        setIsAudioEnabled(true);
        isAudioEnabledRef.current = true;
        setupVAD(clonedStream);

        // Inyectar en conexiones P2P y renegociar si fue agregada
        for (const [peerId, pc] of peerConnections.current.entries()) {
          const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
          if (sender) {
            await sender.replaceTrack(newAudioTrack);
          } else {
            pc.addTrack(newAudioTrack, clonedStream);
            await renegotiateWithPeer(peerId, pc);
          }
        }

        broadcastMediaState({ isMuted: false, isDeafened: false, isAudioEnabled: true });
        await getDevices();
        return;
      }

      // Caso 2: Pista existente -> alternar enabled
      const nextEnabled = !isAudioEnabledRef.current;
      audioTracks.forEach((t) => {
        t.enabled = nextEnabled;
      });

      if (!nextEnabled) {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        setSpeakingUsers((prev) => {
          const next = new Set(prev);
          next.delete(localUserId);
          return next;
        });
      }

      const clonedStream = new MediaStream(stream.getTracks());
      localStreamRef.current = clonedStream;
      setLocalStream(clonedStream);
      setIsAudioEnabled(nextEnabled);
      isAudioEnabledRef.current = nextEnabled;

      broadcastMediaState({
        isMuted: !nextEnabled,
        isDeafened: false,
        isAudioEnabled: nextEnabled,
        isSpeaking: nextEnabled ? isSpeakingRef.current : false,
      });
    } catch (err) {
      console.error("[TabeTalk] Error al alternar micrófono:", err);
      toast.error("No se pudo acceder al micrófono. Verifica los permisos del navegador.");
    }
  }, [
    localUserId,
    selectedMicId,
    setupVAD,
    renegotiateWithPeer,
    broadcastMediaState,
    getDevices,
  ]);

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

  // 3. Toggle Video / Cámara con adquisición en caliente y renegociación
  const toggleVideo = useCallback(async () => {
    if (!localUserId) return;

    try {
      let stream = localStreamRef.current;
      if (!stream) {
        stream = new MediaStream();
        localStreamRef.current = stream;
      }

      // Si la cámara está encendida -> apagar hardware
      if (isVideoEnabledRef.current) {
        stream.getVideoTracks().forEach((t) => {
          t.enabled = false;
          t.stop();
          stream!.removeTrack(t);
        });

        const clonedStream = new MediaStream(stream.getTracks());
        localStreamRef.current = clonedStream;
        setLocalStream(clonedStream);
        setIsVideoEnabled(false);
        isVideoEnabledRef.current = false;

        for (const [, pc] of peerConnections.current.entries()) {
          const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (videoSender && !isScreenSharingRef.current) {
            await videoSender.replaceTrack(null).catch(() => {});
          }
        }

        broadcastMediaState({ isVideoOff: true, isCameraOn: false });
        return;
      }

      // Si la cámara está apagada -> solicitar al hardware
      const savedCamId =
        selectedCameraId || localStorage.getItem("tabetalk_video_input_device") || "default";

      let camStream: MediaStream;
      try {
        camStream = await navigator.mediaDevices.getUserMedia({
          video:
            savedCamId && savedCamId !== "default"
              ? {
                  deviceId: { ideal: savedCamId },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  frameRate: { ideal: 30 },
                }
              : {
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  frameRate: { ideal: 30 },
                },
        });
      } catch {
        camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      const newVideoTrack = camStream.getVideoTracks()[0];
      if (!newVideoTrack) {
        toast.error("No se detectó ninguna cámara disponible.");
        return;
      }
      newVideoTrack.enabled = true;

      stream.getVideoTracks().forEach((old) => {
        old.stop();
        stream!.removeTrack(old);
      });
      stream.addTrack(newVideoTrack);

      const clonedStream = new MediaStream(stream.getTracks());
      localStreamRef.current = clonedStream;
      setLocalStream(clonedStream);
      setIsVideoEnabled(true);
      isVideoEnabledRef.current = true;

      // Inyectar o reemplazar pista y renegociar con peers
      for (const [peerId, pc] of peerConnections.current.entries()) {
        const videoSender = pc
          .getSenders()
          .find((s) => s.track?.kind === "video" || s.track === null);

        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
          await renegotiateWithPeer(peerId, pc);
        } else {
          pc.addTrack(newVideoTrack, clonedStream);
          await renegotiateWithPeer(peerId, pc);
        }
      }

      broadcastMediaState({ isVideoOff: false, isCameraOn: true });
      await getDevices();
    } catch (err) {
      console.error("[TabeTalk] Error al encender cámara:", err);
      toast.error("No se pudo encender la cámara. Revisa que no esté siendo usada por otra aplicación.");
    }
  }, [
    localUserId,
    selectedCameraId,
    renegotiateWithPeer,
    broadcastMediaState,
    getDevices,
  ]);

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

        for (const [peerId, pc] of peerConnections.current.entries()) {
          pc.addTrack(screenVideoTrack, stream);
          await renegotiateWithPeer(peerId, pc);
        }
      }

      broadcastMediaState({ isScreenSharing: true });
    } catch (e) {
      console.warn("[WebRTC] Error iniciando screen share:", e);
    }
  }, [broadcastMediaState, stopScreenShare, renegotiateWithPeer]);

  // 5. Cambio dinámico de periféricos
  const switchCamera = useCallback(
    async (deviceId: string) => {
      setSelectedCameraId(deviceId);
      localStorage.setItem("tabetalk_video_input_device", deviceId);
      if (isVideoEnabledRef.current) {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: deviceId && deviceId !== "default" ? { deviceId: { exact: deviceId } } : true,
          });
          const videoTrack = newStream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.enabled = true;
            let stream = localStreamRef.current || new MediaStream();
            stream.getVideoTracks().forEach((old) => {
              old.stop();
              stream.removeTrack(old);
            });
            stream.addTrack(videoTrack);
            const clonedStream = new MediaStream(stream.getTracks());
            localStreamRef.current = clonedStream;
            setLocalStream(clonedStream);

            for (const [peerId, pc] of peerConnections.current.entries()) {
              const videoSender = pc
                .getSenders()
                .find((s) => s.track?.kind === "video" || s.track === null);
              if (videoSender) {
                await videoSender.replaceTrack(videoTrack);
                await renegotiateWithPeer(peerId, pc);
              } else {
                pc.addTrack(videoTrack, clonedStream);
                await renegotiateWithPeer(peerId, pc);
              }
            }
          }
        } catch (e) {
          console.warn("[WebRTC] Error cambiando cámara:", e);
        }
      }
    },
    [renegotiateWithPeer]
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
        if (audioTrack) {
          audioTrack.enabled = isAudioEnabledRef.current && !isDeafenedRef.current;
          let stream = localStreamRef.current || new MediaStream();
          stream.getAudioTracks().forEach((old) => {
            old.stop();
            stream.removeTrack(old);
          });
          stream.addTrack(audioTrack);
          const clonedStream = new MediaStream(stream.getTracks());
          localStreamRef.current = clonedStream;
          setLocalStream(clonedStream);

          setupVAD(clonedStream);

          for (const [peerId, pc] of peerConnections.current.entries()) {
            const audioSender = pc.getSenders().find((s) => s.track?.kind === "audio");
            if (audioSender) {
              await audioSender.replaceTrack(audioTrack);
            } else {
              pc.addTrack(audioTrack, clonedStream);
              await renegotiateWithPeer(peerId, pc);
            }
          }
        }
      } catch (e) {
        console.warn("[WebRTC] Error cambiando micrófono:", e);
      }
    },
    [setupVAD, renegotiateWithPeer]
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

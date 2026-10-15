import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { ICE_SERVERS, optimizeSdp } from '@/lib/webrtc-config';
import { getSafeMediaStream } from '@/lib/media-utils';

export interface MeetParticipant {
  peerId: string;
  name: string;
  avatar?: string;
  stream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing?: boolean;
  isSpeaking?: boolean;
}

export interface MeetChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

interface UseWebRTCMeetProps {
  roomId: string;
  userName: string;
  userAvatar?: string;
  initialAudio?: boolean;
  initialVideo?: boolean;
  existingStream?: MediaStream | null;
}

export function useWebRTCMeet({
  roomId,
  userName,
  userAvatar,
  initialAudio = true,
  initialVideo = true,
  existingStream = null,
}: UseWebRTCMeetProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(existingStream || null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(initialAudio);
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<Map<string, MeetParticipant>>(new Map());
  const [messages, setMessages] = useState<MeetChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [hasPermissionError, setHasPermissionError] = useState<string | null>(null);

  // Identificador de peer único para esta sesión de reunión
  const myPeerIdRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).substring(2, 10)
  );
  const myPeerId = myPeerIdRef.current;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(existingStream || null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);

  // Audio level analyser para saber si el usuario local está hablando
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);

  // Sincronizar stream existente si se pasa desde el lobby
  useEffect(() => {
    if (existingStream && !localStreamRef.current) {
      localStreamRef.current = existingStream;
      setLocalStream(existingStream);
      if (existingStream.getVideoTracks().length > 0) {
        cameraTrackRef.current = existingStream.getVideoTracks()[0];
      }
    }
  }, [existingStream]);

  // Crear conexión WebRTC con un peer específico
  const createPeerConnection = useCallback((targetPeerId: string): RTCPeerConnection => {
    if (peerConnectionsRef.current.has(targetPeerId)) {
      peerConnectionsRef.current.get(targetPeerId)?.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(targetPeerId, pc);

    // Agregar tracks locales si están disponibles
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Manejo de candidatos ICE locales hacia el peer remoto
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'meet-signal',
          payload: {
            to: targetPeerId,
            from: myPeerId,
            type: 'ice-candidate',
            candidate: event.candidate.toJSON(),
          },
        });
      }
    };

    // Recepción robusta de tracks remotos: acumular en MediaStream persistente por peer
    pc.ontrack = (event) => {
      let stream = remoteStreamsRef.current.get(targetPeerId);
      if (!stream) {
        stream = new MediaStream();
        remoteStreamsRef.current.set(targetPeerId, stream);
      }

      // Evitar duplicar el mismo track
      const exists = stream.getTracks().some((t) => t.id === event.track.id);
      if (!exists) {
        stream.addTrack(event.track);
      }

      // Re-emitir nuevo objeto MediaStream para forzar actualización reactiva en UI
      const streamClone = new MediaStream(stream.getTracks());
      remoteStreamsRef.current.set(targetPeerId, streamClone);

      setParticipants((prev) => {
        const next = new Map(prev);
        const existing = next.get(targetPeerId) || {
          peerId: targetPeerId,
          name: 'Invitado',
          audioEnabled: true,
          videoEnabled: true,
        };

        const hasVideo = streamClone.getVideoTracks().some((t) => t.enabled);
        const hasAudio = streamClone.getAudioTracks().some((t) => t.enabled);

        next.set(targetPeerId, {
          ...existing,
          stream: streamClone,
          videoEnabled: hasVideo,
          audioEnabled: hasAudio,
        });
        return next;
      });
    };

    // Control de estado de la conexión con auto-recuperación ICE
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        try {
          pc.restartIce();
        } catch {}
      } else if (pc.connectionState === 'closed') {
        setParticipants((prev) => {
          const next = new Map(prev);
          next.delete(targetPeerId);
          return next;
        });
        peerConnectionsRef.current.delete(targetPeerId);
        remoteStreamsRef.current.delete(targetPeerId);
      }
    };

    return pc;
  }, [myPeerId]);

  // Inicializar stream local seguro
  const initLocalMedia = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    try {
      setHasPermissionError(null);
      const stream = await getSafeMediaStream({
        video: initialVideo,
        audio: initialAudio,
      });

      if (!stream) {
        setHasPermissionError('No se pudo acceder a la cámara ni al micrófono. Verifica los permisos de tu navegador.');
        return null;
      }

      stream.getAudioTracks().forEach((t) => {
        t.enabled = initialAudio;
      });
      stream.getVideoTracks().forEach((t) => {
        t.enabled = initialVideo;
      });

      localStreamRef.current = stream;
      if (stream.getVideoTracks().length > 0) {
        cameraTrackRef.current = stream.getVideoTracks()[0];
      }
      setLocalStream(stream);
      return stream;
    } catch (err: unknown) {
      console.warn('Error inicializando media local:', err);
      setHasPermissionError('Error al iniciar cámara o micrófono.');
      return null;
    }
  }, [initialAudio, initialVideo]);

  // Conectar y unirse a la sala con Supabase Realtime Broadcast
  const joinMeeting = useCallback(async () => {
    if (!roomId) return;

    let stream = localStreamRef.current;
    if (!stream) {
      stream = await initLocalMedia();
    }

    // Configurar canal de Supabase exclusivo para esta sala
    const channelName = `meet-room-${roomId.toLowerCase().trim()}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channelRef.current = channel;

    // Escuchar eventos en la sala
    channel
      // 1. Un nuevo participante se une
      .on('broadcast', { event: 'peer-joined' }, async ({ payload }) => {
        const { peerId: remotePeerId, name, avatar, audioEnabled, videoEnabled } = payload;
        if (!remotePeerId || remotePeerId === myPeerId) return;

        setParticipants((prev) => {
          const next = new Map(prev);
          next.set(remotePeerId, {
            peerId: remotePeerId,
            name: name || 'Invitado',
            avatar,
            audioEnabled: audioEnabled !== undefined ? !!audioEnabled : true,
            videoEnabled: videoEnabled !== undefined ? !!videoEnabled : true,
          });
          return next;
        });

        // Responder con "peer-welcome" para compartir nuestra info
        channel.send({
          type: 'broadcast',
          event: 'peer-welcome',
          payload: {
            to: remotePeerId,
            peerId: myPeerId,
            name: userName || 'Usuario',
            avatar: userAvatar,
            audioEnabled: isAudioEnabled,
            videoEnabled: isVideoEnabled,
          },
        });
      })
      // 2. Respuesta de bienvenida recibida por nosotros
      .on('broadcast', { event: 'peer-welcome' }, async ({ payload }) => {
        const { to, peerId: remotePeerId, name, avatar, audioEnabled, videoEnabled } = payload;
        if (to !== myPeerId || remotePeerId === myPeerId) return;

        setParticipants((prev) => {
          const next = new Map(prev);
          next.set(remotePeerId, {
            peerId: remotePeerId,
            name: name || 'Invitado',
            avatar,
            audioEnabled: audioEnabled !== undefined ? !!audioEnabled : true,
            videoEnabled: videoEnabled !== undefined ? !!videoEnabled : true,
          });
          return next;
        });

        // El peer que recién ingresa inicia la oferta hacia los peers existentes
        const pc = createPeerConnection(remotePeerId);
        try {
          const offer = await pc.createOffer();
          if (offer.sdp) {
            offer.sdp = optimizeSdp(offer.sdp);
          }
          await pc.setLocalDescription(offer);
          channel.send({
            type: 'broadcast',
            event: 'meet-signal',
            payload: {
              to: remotePeerId,
              from: myPeerId,
              type: 'offer',
              sdp: offer,
            },
          });
        } catch (err) {
          console.error('Error creando oferta WebRTC:', err);
        }
      })
      // 3. Señalización WebRTC (offer, answer, ice-candidate)
      .on('broadcast', { event: 'meet-signal' }, async ({ payload }) => {
        const { to, from: remotePeerId, type, sdp, candidate } = payload;
        if (to !== myPeerId || remotePeerId === myPeerId) return;

        let pc = peerConnectionsRef.current.get(remotePeerId);
        if (!pc && type === 'offer') {
          pc = createPeerConnection(remotePeerId);
        }

        if (!pc) return;

        try {
          if (type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            // Aplicar candidatos ICE que hayan llegado antes de la oferta
            const pending = pendingCandidatesRef.current.get(remotePeerId) || [];
            for (const cand of pending) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
            pendingCandidatesRef.current.delete(remotePeerId);

            const answer = await pc.createAnswer();
            if (answer.sdp) {
              answer.sdp = optimizeSdp(answer.sdp);
            }
            await pc.setLocalDescription(answer);

            channel.send({
              type: 'broadcast',
              event: 'meet-signal',
              payload: {
                to: remotePeerId,
                from: myPeerId,
                type: 'answer',
                sdp: answer,
              },
            });
          } else if (type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            // Aplicar candidatos pendientes
            const pending = pendingCandidatesRef.current.get(remotePeerId) || [];
            for (const cand of pending) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
            pendingCandidatesRef.current.delete(remotePeerId);
          } else if (type === 'ice-candidate' && candidate) {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
              const pending = pendingCandidatesRef.current.get(remotePeerId) || [];
              pending.push(candidate);
              pendingCandidatesRef.current.set(remotePeerId, pending);
            }
          }
        } catch (err) {
          console.error('Error procesando señal WebRTC:', err);
        }
      })
      // 4. Cambios de estado en video/audio/pantalla de otros participantes
      .on('broadcast', { event: 'peer-status' }, ({ payload }) => {
        const { peerId: remotePeerId, audioEnabled, videoEnabled, isScreenSharing: screenOn } = payload;
        if (!remotePeerId || remotePeerId === myPeerId) return;

        setParticipants((prev) => {
          const next = new Map(prev);
          const current = next.get(remotePeerId);
          if (current) {
            next.set(remotePeerId, {
              ...current,
              audioEnabled: audioEnabled !== undefined ? audioEnabled : current.audioEnabled,
              videoEnabled: videoEnabled !== undefined ? videoEnabled : current.videoEnabled,
              isScreenSharing: screenOn !== undefined ? screenOn : current.isScreenSharing,
            });
          }
          return next;
        });
      })
      // 5. Un participante abandona la reunión
      .on('broadcast', { event: 'peer-left' }, ({ payload }) => {
        const { peerId: remotePeerId } = payload;
        if (!remotePeerId) return;

        const pc = peerConnectionsRef.current.get(remotePeerId);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(remotePeerId);
        }
        pendingCandidatesRef.current.delete(remotePeerId);
        remoteStreamsRef.current.delete(remotePeerId);

        setParticipants((prev) => {
          const next = new Map(prev);
          next.delete(remotePeerId);
          return next;
        });
      })
      // 6. Mensajes de chat en vivo
      .on('broadcast', { event: 'meet-chat' }, ({ payload }) => {
        setMessages((prev) => [...prev, payload]);
      });

    // Suscripción al canal
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        // Anunciar nuestra llegada a todos en la sala
        channel.send({
          type: 'broadcast',
          event: 'peer-joined',
          payload: {
            peerId: myPeerId,
            name: userName || 'Usuario',
            avatar: userAvatar,
            audioEnabled: isAudioEnabled,
            videoEnabled: isVideoEnabled,
          },
        });
      }
    });
  }, [
    roomId,
    userName,
    userAvatar,
    isAudioEnabled,
    isVideoEnabled,
    myPeerId,
    initLocalMedia,
    createPeerConnection,
  ]);

  // Alternar Micrófono
  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) return;
    const newStatus = !isAudioEnabled;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = newStatus;
    });
    setIsAudioEnabled(newStatus);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'peer-status',
        payload: {
          peerId: myPeerId,
          audioEnabled: newStatus,
          videoEnabled: isVideoEnabled,
          isScreenSharing,
        },
      });
    }
  }, [isAudioEnabled, isVideoEnabled, isScreenSharing, myPeerId]);

  // Alternar Cámara
  const toggleVideo = useCallback(async () => {
    if (!localStreamRef.current) return;
    const newStatus = !isVideoEnabled;

    localStreamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = newStatus;
    });
    setIsVideoEnabled(newStatus);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'peer-status',
        payload: {
          peerId: myPeerId,
          audioEnabled: isAudioEnabled,
          videoEnabled: newStatus,
          isScreenSharing,
        },
      });
    }
  }, [isVideoEnabled, isAudioEnabled, isScreenSharing, myPeerId]);

  // Compartir Pantalla
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }

      if (cameraTrackRef.current) {
        peerConnectionsRef.current.forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
          if (videoSender && cameraTrackRef.current) {
            videoSender.replaceTrack(cameraTrackRef.current);
          }
        });
      }

      setIsScreenSharing(false);
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'peer-status',
          payload: {
            peerId: myPeerId,
            audioEnabled: isAudioEnabled,
            videoEnabled: isVideoEnabled,
            isScreenSharing: false,
          },
        });
      }
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        const screenTrack = displayStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        peerConnectionsRef.current.forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          }
        });

        setIsScreenSharing(true);
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'peer-status',
            payload: {
              peerId: myPeerId,
              audioEnabled: isAudioEnabled,
              videoEnabled: isVideoEnabled,
              isScreenSharing: true,
            },
          });
        }

        screenTrack.onended = () => {
          if (cameraTrackRef.current) {
            peerConnectionsRef.current.forEach((pc) => {
              const senders = pc.getSenders();
              const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
              if (videoSender && cameraTrackRef.current) {
                videoSender.replaceTrack(cameraTrackRef.current);
              }
            });
          }
          setIsScreenSharing(false);
          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'peer-status',
              payload: {
                peerId: myPeerId,
                audioEnabled: isAudioEnabled,
                videoEnabled: isVideoEnabled,
                isScreenSharing: false,
              },
            });
          }
        };
      } catch (err) {
        console.warn('Compartir pantalla cancelado o no disponible:', err);
      }
    }
  }, [isScreenSharing, isAudioEnabled, isVideoEnabled, myPeerId]);

  // Enviar mensaje de chat a todos los participantes
  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || !channelRef.current) return;

    const chatMsg: MeetChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: myPeerId,
      senderName: userName || 'Usuario',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'meet-chat',
      payload: chatMsg,
    });

    setMessages((prev) => [...prev, chatMsg]);
  }, [myPeerId, userName]);

  // Salir de la reunión y liberar recursos
  const leaveMeeting = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'peer-left',
        payload: { peerId: myPeerId },
      });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();
    remoteStreamsRef.current.clear();

    setLocalStream(null);
    setParticipants(new Map());
    setIsConnected(false);
  }, [myPeerId]);

  // Analizador simple de nivel de voz para indicar si el usuario local está hablando
  useEffect(() => {
    if (!localStream || !isAudioEnabled) {
      setIsLocalSpeaking(false);
      return;
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let animationFrameId: number;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContext = new AudioCtx();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      const source = audioContext.createMediaStreamSource(localStream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setIsLocalSpeaking(average > 15);
        animationFrameId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch {
      // Ignorar si el navegador bloquea audioContext
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [localStream, isAudioEnabled]);

  // Limpieza al desmontar el componente
  useEffect(() => {
    return () => {
      leaveMeeting();
    };
  }, [leaveMeeting]);

  return {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    participants,
    messages,
    isConnected,
    isLocalSpeaking,
    hasPermissionError,
    myPeerId,
    initLocalMedia,
    joinMeeting,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendMessage,
    leaveMeeting,
  };
}

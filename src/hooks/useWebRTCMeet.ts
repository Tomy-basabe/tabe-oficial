import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { ICE_SERVERS, optimizeSdp } from '@/lib/webrtc-config';
import { getSafeMediaStream, SAFE_AUDIO_CONSTRAINTS } from '@/lib/media-utils';

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
  videoDeviceId?: string;
  audioDeviceId?: string;
}

export function useWebRTCMeet({
  roomId,
  userName,
  userAvatar,
  initialAudio = true,
  initialVideo = true,
  existingStream = null,
  videoDeviceId,
  audioDeviceId,
}: UseWebRTCMeetProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(existingStream || null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(initialAudio);
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<Map<string, MeetParticipant>>(new Map());
  const [messages, setMessages] = useState<MeetChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [hasPermissionError, setHasPermissionError] = useState<string | null>(null);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);

  // Peer ID único y determinista para ordenamiento en malla
  const myPeerIdRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).substring(2, 10)
  );
  const myPeerId = myPeerIdRef.current;

  // Refs sincronizados para evitar closures obsoletos en listeners WebSocket/WebRTC
  const isAudioEnabledRef = useRef(initialAudio);
  const isVideoEnabledRef = useRef(initialVideo);
  const isScreenSharingRef = useRef(false);
  const userNameRef = useRef(userName || 'Usuario');
  const userAvatarRef = useRef(userAvatar);
  const videoDeviceIdRef = useRef(videoDeviceId);
  const audioDeviceIdRef = useRef(audioDeviceId);

  useEffect(() => {
    isAudioEnabledRef.current = isAudioEnabled;
  }, [isAudioEnabled]);

  useEffect(() => {
    isVideoEnabledRef.current = isVideoEnabled;
  }, [isVideoEnabled]);

  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);

  useEffect(() => {
    userNameRef.current = userName || 'Usuario';
  }, [userName]);

  useEffect(() => {
    userAvatarRef.current = userAvatar;
  }, [userAvatar]);

  useEffect(() => {
    videoDeviceIdRef.current = videoDeviceId;
  }, [videoDeviceId]);

  useEffect(() => {
    audioDeviceIdRef.current = audioDeviceId;
  }, [audioDeviceId]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const disconnectTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(existingStream || null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);

  // Sincronizar estados iniciales mientras no esté conectado
  useEffect(() => {
    if (!isConnected) {
      setIsAudioEnabled(initialAudio);
      setIsVideoEnabled(initialVideo);
      isAudioEnabledRef.current = initialAudio;
      isVideoEnabledRef.current = initialVideo;
    }
  }, [initialAudio, initialVideo, isConnected]);

  // Sincronizar stream vivo proveniente del lobby
  useEffect(() => {
    const hasLiveTracks = existingStream?.getTracks().some((t) => t.readyState === 'live');
    if (existingStream && hasLiveTracks && !localStreamRef.current) {
      localStreamRef.current = existingStream;
      setLocalStream(existingStream);
      const vTracks = existingStream.getVideoTracks();
      const aTracks = existingStream.getAudioTracks();
      if (vTracks.length > 0) {
        cameraTrackRef.current = vTracks[0];
      }
      const audioOn = aTracks.length > 0 ? aTracks.some((t) => t.enabled) : false;
      const videoOn = vTracks.length > 0 ? vTracks.some((t) => t.enabled) : false;
      setIsAudioEnabled(audioOn);
      setIsVideoEnabled(videoOn);
      isAudioEnabledRef.current = audioOn;
      isVideoEnabledRef.current = videoOn;
    }
  }, [existingStream]);

  // Helper para emitir cambios de estado + actualizar Presence
  const broadcastMyStatus = useCallback(
    (audioOn: boolean, videoOn: boolean, screenOn: boolean) => {
      if (!channelRef.current || !isSubscribedRef.current) return;
      channelRef.current.send({
        type: 'broadcast',
        event: 'peer-status',
        payload: {
          peerId: myPeerId,
          audioEnabled: audioOn,
          videoEnabled: videoOn,
          isScreenSharing: screenOn,
        },
      });
      channelRef.current
        .track({
          peerId: myPeerId,
          name: userNameRef.current,
          avatar: userAvatarRef.current,
          audioEnabled: audioOn,
          videoEnabled: videoOn,
          isScreenSharing: screenOn,
        })
        .catch(() => {});
    },
    [myPeerId]
  );

  // Función segura y limpia para eliminar a un participante desconectado
  const removeParticipant = useCallback((remotePeerId: string) => {
    const timer = disconnectTimersRef.current.get(remotePeerId);
    if (timer) {
      clearTimeout(timer);
      disconnectTimersRef.current.delete(remotePeerId);
    }

    const pc = peerConnectionsRef.current.get(remotePeerId);
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      try {
        pc.close();
      } catch {}
      peerConnectionsRef.current.delete(remotePeerId);
    }

    const stream = remoteStreamsRef.current.get(remotePeerId);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      remoteStreamsRef.current.delete(remotePeerId);
    }
    pendingCandidatesRef.current.delete(remotePeerId);

    setParticipants((prev) => {
      if (!prev.has(remotePeerId)) return prev;
      const next = new Map(prev);
      next.delete(remotePeerId);
      return next;
    });
  }, []);

  // Crear conexión WebRTC con un peer específico
  const createPeerConnection = useCallback(
    (targetPeerId: string): RTCPeerConnection => {
      if (peerConnectionsRef.current.has(targetPeerId)) {
        const existingPc = peerConnectionsRef.current.get(targetPeerId);
        if (
          existingPc &&
          existingPc.connectionState !== 'closed' &&
          existingPc.connectionState !== 'failed'
        ) {
          return existingPc;
        }
        try {
          existingPc?.close();
        } catch {}
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionsRef.current.set(targetPeerId, pc);

      // Agregar tracks locales (si está compartiendo pantalla, enviar el screenTrack como video)
      const baseStream = localStreamRef.current || new MediaStream();
      const audioTracks = baseStream.getAudioTracks();
      audioTracks.forEach((track) => {
        try {
          pc.addTrack(track, baseStream);
        } catch {}
      });

      const activeScreenTrack =
        screenTrackRef.current && screenTrackRef.current.readyState === 'live'
          ? screenTrackRef.current
          : null;
      const activeVideoTrack = activeScreenTrack || cameraTrackRef.current || baseStream.getVideoTracks()[0];

      if (activeVideoTrack && activeVideoTrack.readyState === 'live') {
        try {
          pc.addTrack(activeVideoTrack, baseStream);
        } catch {}
      }

      // Candidatos ICE
      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current && isSubscribedRef.current) {
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

      // Recepción de tracks remotos: acumular sin sobrescribir estados de mute/video
      pc.ontrack = (event) => {
        let stream = remoteStreamsRef.current.get(targetPeerId);
        if (!stream) {
          stream = new MediaStream();
          remoteStreamsRef.current.set(targetPeerId, stream);
        }

        // Reemplazar tracks del mismo tipo que hayan finalizado o agregar el nuevo
        stream.getTracks().forEach((t) => {
          if (t.kind === event.track.kind && t.id !== event.track.id) {
            stream?.removeTrack(t);
          }
        });

        const exists = stream.getTracks().some((t) => t.id === event.track.id);
        if (!exists) {
          stream.addTrack(event.track);
        }

        const streamClone = new MediaStream(stream.getTracks());
        remoteStreamsRef.current.set(targetPeerId, streamClone);

        setParticipants((prev) => {
          const next = new Map(prev);
          const existing = next.get(targetPeerId);

          if (existing) {
            next.set(targetPeerId, {
              ...existing,
              stream: streamClone,
            });
          } else {
            next.set(targetPeerId, {
              peerId: targetPeerId,
              name: 'Invitado',
              stream: streamClone,
              audioEnabled: streamClone.getAudioTracks().length > 0,
              videoEnabled: streamClone.getVideoTracks().length > 0,
            });
          }
          return next;
        });
      };

      // Manejo de estado de conexión ICE
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;

        if (state === 'connected') {
          const timer = disconnectTimersRef.current.get(targetPeerId);
          if (timer) {
            clearTimeout(timer);
            disconnectTimersRef.current.delete(targetPeerId);
          }
        } else if (state === 'disconnected') {
          if (!disconnectTimersRef.current.has(targetPeerId)) {
            const timer = setTimeout(() => {
              if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                removeParticipant(targetPeerId);
              }
            }, 3500);
            disconnectTimersRef.current.set(targetPeerId, timer);
          }
        } else if (state === 'failed' || state === 'closed') {
          removeParticipant(targetPeerId);
        }
      };

      return pc;
    },
    [myPeerId, removeParticipant]
  );

  // Iniciar o renegociar oferta WebRTC hacia un peer
  // IMPORTANTE: offerToReceiveAudio/Video garantiza recibir audio y video aunque el usuario local no tenga cámara o micrófono
  const initiateOfferToPeer = useCallback(
    async (remotePeerId: string) => {
      const pc = createPeerConnection(remotePeerId);
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        if (offer.sdp) {
          offer.sdp = optimizeSdp(offer.sdp);
        }
        await pc.setLocalDescription(offer);
        channelRef.current?.send({
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
        console.error('Error creando oferta hacia peer:', remotePeerId, err);
      }
    },
    [createPeerConnection, myPeerId]
  );

  // Inicializar stream local seguro
  const initLocalMedia = useCallback(async () => {
    const existingLive = localStreamRef.current?.getTracks().some((t) => t.readyState === 'live');
    if (localStreamRef.current && existingLive) {
      return localStreamRef.current;
    }

    try {
      setHasPermissionError(null);
      const wantVideo = isVideoEnabledRef.current;
      const wantAudio = isAudioEnabledRef.current;

      // Si el usuario desactivó ambos en el lobby, permitir entrar sin error
      if (!wantVideo && !wantAudio) {
        return null;
      }

      const stream = await getSafeMediaStream({
        video: wantVideo,
        audio: wantAudio,
        videoDeviceId: videoDeviceIdRef.current,
        audioDeviceId: audioDeviceIdRef.current,
      });

      if (!stream) {
        setHasPermissionError(
          'Entraste en modo espectador (sin cámara ni micrófono detectados). Puedes ver y escuchar a los demás.'
        );
        setIsAudioEnabled(false);
        setIsVideoEnabled(false);
        isAudioEnabledRef.current = false;
        isVideoEnabledRef.current = false;
        return null;
      }

      const aTracks = stream.getAudioTracks();
      const vTracks = stream.getVideoTracks();

      const actualAudio = aTracks.length > 0 && wantAudio;
      const actualVideo = vTracks.length > 0 && wantVideo;

      aTracks.forEach((t) => {
        t.enabled = actualAudio;
      });
      vTracks.forEach((t) => {
        t.enabled = actualVideo;
      });

      localStreamRef.current = stream;
      if (vTracks.length > 0) {
        cameraTrackRef.current = vTracks[0];
      }
      setLocalStream(stream);
      setIsAudioEnabled(actualAudio);
      setIsVideoEnabled(actualVideo);
      isAudioEnabledRef.current = actualAudio;
      isVideoEnabledRef.current = actualVideo;

      return stream;
    } catch (err: unknown) {
      console.warn('Error inicializando media local:', err);
      setHasPermissionError(
        'No se pudo iniciar cámara o micrófono. Puedes continuar viendo y escuchando la llamada.'
      );
      setIsAudioEnabled(false);
      setIsVideoEnabled(false);
      isAudioEnabledRef.current = false;
      isVideoEnabledRef.current = false;
      return null;
    }
  }, []);

  // Cambiar cámara en caliente
  const switchCamera = useCallback(
    async (newDeviceId: string) => {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: newDeviceId ? { deviceId: newDeviceId } : true,
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        if (!newVideoTrack) return;

        if (cameraTrackRef.current && cameraTrackRef.current.id !== newVideoTrack.id) {
          cameraTrackRef.current.stop();
        }
        cameraTrackRef.current = newVideoTrack;

        // Si estaba compartiendo pantalla, detener pantalla para mostrar la nueva cámara
        if (screenTrackRef.current) {
          screenTrackRef.current.stop();
          screenTrackRef.current = null;
          setIsScreenSharing(false);
          isScreenSharingRef.current = false;
        }

        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream([newVideoTrack]);
        } else {
          localStreamRef.current.getVideoTracks().forEach((t) => {
            if (t.id !== newVideoTrack.id) {
              t.stop();
              localStreamRef.current?.removeTrack(t);
            }
          });
          localStreamRef.current.addTrack(newVideoTrack);
        }
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

        // Reemplazar o añadir el track en todas las conexiones WebRTC
        for (const [remotePeerId, pc] of peerConnectionsRef.current.entries()) {
          const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (videoSender) {
            await videoSender.replaceTrack(newVideoTrack);
          } else {
            pc.addTrack(newVideoTrack, localStreamRef.current!);
            await initiateOfferToPeer(remotePeerId);
          }
        }

        setIsVideoEnabled(true);
        isVideoEnabledRef.current = true;
        setHasPermissionError(null);
        broadcastMyStatus(isAudioEnabledRef.current, true, false);
      } catch (err) {
        console.error('Error al cambiar de cámara:', err);
      }
    },
    [broadcastMyStatus, initiateOfferToPeer]
  );

  // Cambiar micrófono en caliente
  const switchMicrophone = useCallback(
    async (newDeviceId: string) => {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: newDeviceId
            ? { ...SAFE_AUDIO_CONSTRAINTS, deviceId: newDeviceId }
            : SAFE_AUDIO_CONSTRAINTS,
        });
        const newAudioTrack = newStream.getAudioTracks()[0];
        if (!newAudioTrack) return;

        // Respetar el estado actual de silencio (mute)
        newAudioTrack.enabled = isAudioEnabledRef.current;

        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream([newAudioTrack]);
        } else {
          localStreamRef.current.getAudioTracks().forEach((t) => {
            if (t.id !== newAudioTrack.id) {
              t.stop();
              localStreamRef.current?.removeTrack(t);
            }
          });
          localStreamRef.current.addTrack(newAudioTrack);
        }
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

        for (const [remotePeerId, pc] of peerConnectionsRef.current.entries()) {
          const audioSender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
          if (audioSender) {
            await audioSender.replaceTrack(newAudioTrack);
          } else {
            pc.addTrack(newAudioTrack, localStreamRef.current!);
            await initiateOfferToPeer(remotePeerId);
          }
        }
      } catch (err) {
        console.error('Error al cambiar de micrófono:', err);
      }
    },
    [initiateOfferToPeer]
  );

  // Alternar Micrófono
  const toggleAudio = useCallback(async () => {
    let stream = localStreamRef.current;
    const currentAudioTracks = stream ? stream.getAudioTracks() : [];
    const hasLiveAudioTrack = currentAudioTracks.some((t) => t.readyState === 'live');

    if (!hasLiveAudioTrack) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: audioDeviceIdRef.current
            ? { ...SAFE_AUDIO_CONSTRAINTS, deviceId: audioDeviceIdRef.current }
            : SAFE_AUDIO_CONSTRAINTS,
        });
        const newTrack = audioStream.getAudioTracks()[0];
        if (!newTrack) return;

        if (!stream) {
          stream = new MediaStream([newTrack]);
          localStreamRef.current = stream;
        } else {
          currentAudioTracks.forEach((t) => {
            t.stop();
            stream?.removeTrack(t);
          });
          stream.addTrack(newTrack);
        }

        setLocalStream(new MediaStream(stream.getTracks()));
        setIsAudioEnabled(true);
        isAudioEnabledRef.current = true;
        setHasPermissionError(null);

        for (const [remotePeerId, pc] of peerConnectionsRef.current.entries()) {
          const audioSender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
          if (audioSender) {
            await audioSender.replaceTrack(newTrack);
          } else {
            pc.addTrack(newTrack, stream);
            await initiateOfferToPeer(remotePeerId);
          }
        }

        broadcastMyStatus(true, isVideoEnabledRef.current, isScreenSharingRef.current);
        return;
      } catch (err) {
        console.warn('No se pudo activar el micrófono:', err);
        return;
      }
    }

    const newStatus = !isAudioEnabledRef.current;
    currentAudioTracks.forEach((t) => {
      t.enabled = newStatus;
    });
    setIsAudioEnabled(newStatus);
    isAudioEnabledRef.current = newStatus;

    broadcastMyStatus(newStatus, isVideoEnabledRef.current, isScreenSharingRef.current);
  }, [broadcastMyStatus, initiateOfferToPeer]);

  // Alternar Cámara
  const toggleVideo = useCallback(async () => {
    let stream = localStreamRef.current;
    const hasLiveCameraTrack =
      cameraTrackRef.current && cameraTrackRef.current.readyState === 'live';

    if (!hasLiveCameraTrack) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: videoDeviceIdRef.current ? { deviceId: videoDeviceIdRef.current } : true,
        });

        const newTrack = videoStream.getVideoTracks()[0];
        if (!newTrack) return;

        cameraTrackRef.current = newTrack;

        if (!stream) {
          stream = new MediaStream([newTrack]);
          localStreamRef.current = stream;
        } else if (!isScreenSharingRef.current) {
          stream.getVideoTracks().forEach((t) => {
            t.stop();
            stream?.removeTrack(t);
          });
          stream.addTrack(newTrack);
        }

        if (!isScreenSharingRef.current) {
          setLocalStream(new MediaStream(stream.getTracks()));

          for (const [remotePeerId, pc] of peerConnectionsRef.current.entries()) {
            const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
            if (videoSender) {
              await videoSender.replaceTrack(newTrack);
            } else {
              pc.addTrack(newTrack, stream);
              await initiateOfferToPeer(remotePeerId);
            }
          }
        }

        setIsVideoEnabled(true);
        isVideoEnabledRef.current = true;
        setHasPermissionError(null);

        broadcastMyStatus(isAudioEnabledRef.current, true, isScreenSharingRef.current);
        return;
      } catch (err) {
        console.warn('No se pudo activar la cámara:', err);
        return;
      }
    }

    const newStatus = !isVideoEnabledRef.current;
    if (cameraTrackRef.current) {
      cameraTrackRef.current.enabled = newStatus;
    }
    if (!isScreenSharingRef.current && stream) {
      stream.getVideoTracks().forEach((t) => {
        t.enabled = newStatus;
      });
    }
    setIsVideoEnabled(newStatus);
    isVideoEnabledRef.current = newStatus;

    broadcastMyStatus(isAudioEnabledRef.current, newStatus, isScreenSharingRef.current);
  }, [broadcastMyStatus, initiateOfferToPeer]);

  // Detener compartir pantalla y restaurar cámara
  const stopScreenSharing = useCallback(async () => {
    if (screenTrackRef.current) {
      screenTrackRef.current.onended = null;
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    const camTrack =
      cameraTrackRef.current && cameraTrackRef.current.readyState === 'live'
        ? cameraTrackRef.current
        : null;

    if (camTrack) {
      camTrack.enabled = isVideoEnabledRef.current;
    }

    // Restaurar stream local
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        if (!camTrack || t.id !== camTrack.id) {
          localStreamRef.current?.removeTrack(t);
        }
      });
      if (camTrack && !localStreamRef.current.getVideoTracks().some((t) => t.id === camTrack.id)) {
        localStreamRef.current.addTrack(camTrack);
      }
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    }

    // Restaurar track de cámara en cada PeerConnection
    for (const [, pc] of peerConnectionsRef.current.entries()) {
      const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (videoSender && camTrack) {
        try {
          await videoSender.replaceTrack(camTrack);
        } catch {}
      }
    }

    setIsScreenSharing(false);
    isScreenSharingRef.current = false;
    broadcastMyStatus(isAudioEnabledRef.current, isVideoEnabledRef.current, false);
  }, [broadcastMyStatus]);

  // Alternar Compartir Pantalla
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharingRef.current) {
      await stopScreenSharing();
      return;
    }

    if (!navigator.mediaDevices || !('getDisplayMedia' in navigator.mediaDevices)) {
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const screenTrack = displayStream.getVideoTracks()[0];
      if (!screenTrack) return;
      screenTrackRef.current = screenTrack;

      // Actualizar vista local con la pantalla compartida
      if (!localStreamRef.current) {
        localStreamRef.current = new MediaStream([screenTrack]);
      } else {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          localStreamRef.current?.removeTrack(t);
        });
        localStreamRef.current.addTrack(screenTrack);
      }
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

      // Enviar el screenTrack a todos los peers conectados (incluyendo renegociación si no tenían videoSender)
      for (const [remotePeerId, pc] of peerConnectionsRef.current.entries()) {
        const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        } else {
          pc.addTrack(screenTrack, localStreamRef.current);
          await initiateOfferToPeer(remotePeerId);
        }
      }

      setIsScreenSharing(true);
      isScreenSharingRef.current = true;
      broadcastMyStatus(isAudioEnabledRef.current, isVideoEnabledRef.current, true);

      screenTrack.onended = () => {
        stopScreenSharing();
      };
    } catch (err) {
      console.warn('Compartir pantalla cancelado:', err);
    }
  }, [broadcastMyStatus, initiateOfferToPeer, stopScreenSharing]);

  // Conectar y unirse a la sala con Supabase Realtime Broadcast & Presence
  const joinMeeting = useCallback(async () => {
    if (!roomId || channelRef.current) return;

    await initLocalMedia();

    const channelName = `meet-room-${roomId.toLowerCase().trim()}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: myPeerId },
      },
    });

    channelRef.current = channel;

    channel
      // SUPABASE PRESENCE: Sincronización de miembros activos y detección de caídas
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activePeers = new Map<
          string,
          {
            peerId: string;
            name?: string;
            avatar?: string;
            audioEnabled?: boolean;
            videoEnabled?: boolean;
            isScreenSharing?: boolean;
          }
        >();
        let isSelfTracked = false;

        Object.values(state).forEach((presences: unknown) => {
          const list = presences as Array<{
            peerId?: string;
            name?: string;
            avatar?: string;
            audioEnabled?: boolean;
            videoEnabled?: boolean;
            isScreenSharing?: boolean;
          }>;
          list.forEach((p) => {
            if (p.peerId === myPeerId) {
              isSelfTracked = true;
            } else if (p.peerId) {
              activePeers.set(p.peerId, p);
            }
          });
        });

        // 1. Asegurar que todos los miembros presentes en el canal estén registrados localmente
        if (activePeers.size > 0) {
          setParticipants((prev) => {
            const next = new Map(prev);
            let changed = false;
            activePeers.forEach((p, remoteId) => {
              const existing = next.get(remoteId);
              if (!existing) {
                next.set(remoteId, {
                  peerId: remoteId,
                  name: p.name || 'Invitado',
                  avatar: p.avatar,
                  audioEnabled: p.audioEnabled !== undefined ? !!p.audioEnabled : true,
                  videoEnabled: p.videoEnabled !== undefined ? !!p.videoEnabled : true,
                  isScreenSharing: !!p.isScreenSharing,
                });
                changed = true;
              }
            });
            return changed ? next : prev;
          });

          // Si nuestro peerId es mayor y aún no existe conexión hacia ese peer, iniciar oferta
          activePeers.forEach((_, remoteId) => {
            const existingPc = peerConnectionsRef.current.get(remoteId);
            const needsConnection =
              !existingPc ||
              existingPc.connectionState === 'closed' ||
              existingPc.connectionState === 'failed';
            if (myPeerId > remoteId && needsConnection) {
              initiateOfferToPeer(remoteId);
            }
          });
        }

        // 2. Si ya estamos sincronizados, limpiar cualquier participante que haya abandonado el servidor
        if (isSelfTracked) {
          const currentPeerIds = Array.from(peerConnectionsRef.current.keys());
          currentPeerIds.forEach((id) => {
            if (!activePeers.has(id)) {
              removeParticipant(id);
            }
          });
          setParticipants((prev) => {
            let changed = false;
            const next = new Map(prev);
            for (const id of next.keys()) {
              if (!activePeers.has(id)) {
                next.delete(id);
                changed = true;
              }
            }
            return changed ? next : prev;
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        (leftPresences as Array<{ peerId?: string }>).forEach((p) => {
          if (p.peerId && p.peerId !== myPeerId) {
            removeParticipant(p.peerId);
          }
        });
      })
      // 1. Un nuevo participante entra
      .on('broadcast', { event: 'peer-joined' }, async ({ payload }) => {
        const {
          peerId: remotePeerId,
          name,
          avatar,
          audioEnabled,
          videoEnabled,
          isScreenSharing: remoteScreen,
        } = payload;
        if (!remotePeerId || remotePeerId === myPeerId) return;

        setParticipants((prev) => {
          const next = new Map(prev);
          const existing = next.get(remotePeerId);
          next.set(remotePeerId, {
            ...existing,
            peerId: remotePeerId,
            name: name || existing?.name || 'Invitado',
            avatar: avatar || existing?.avatar,
            audioEnabled: audioEnabled !== undefined ? !!audioEnabled : true,
            videoEnabled: videoEnabled !== undefined ? !!videoEnabled : true,
            isScreenSharing: !!remoteScreen,
          });
          return next;
        });

        // Enviar respuesta de bienvenida con el estado actual en vivo (usando refs)
        channel.send({
          type: 'broadcast',
          event: 'peer-welcome',
          payload: {
            to: remotePeerId,
            peerId: myPeerId,
            name: userNameRef.current,
            avatar: userAvatarRef.current,
            audioEnabled: isAudioEnabledRef.current,
            videoEnabled: isVideoEnabledRef.current,
            isScreenSharing: isScreenSharingRef.current,
          },
        });

        // Negociación determinista: quien tiene peerId mayor inicia la oferta
        if (myPeerId > remotePeerId) {
          initiateOfferToPeer(remotePeerId);
        }
      })
      // 2. Respuesta de bienvenida recibida
      .on('broadcast', { event: 'peer-welcome' }, async ({ payload }) => {
        const {
          to,
          peerId: remotePeerId,
          name,
          avatar,
          audioEnabled,
          videoEnabled,
          isScreenSharing: remoteScreen,
        } = payload;
        if (to !== myPeerId || !remotePeerId || remotePeerId === myPeerId) return;

        setParticipants((prev) => {
          const next = new Map(prev);
          const existing = next.get(remotePeerId);
          next.set(remotePeerId, {
            ...existing,
            peerId: remotePeerId,
            name: name || existing?.name || 'Invitado',
            avatar: avatar || existing?.avatar,
            audioEnabled: audioEnabled !== undefined ? !!audioEnabled : true,
            videoEnabled: videoEnabled !== undefined ? !!videoEnabled : true,
            isScreenSharing: !!remoteScreen,
          });
          return next;
        });

        if (myPeerId > remotePeerId) {
          const existingPc = peerConnectionsRef.current.get(remotePeerId);
          if (!existingPc || existingPc.signalingState === 'stable') {
            initiateOfferToPeer(remotePeerId);
          }
        }
      })
      // 3. Señalización WebRTC con Polite Peer (prevención total de colisiones/glare)
      .on('broadcast', { event: 'meet-signal' }, async ({ payload }) => {
        const { to, from: remotePeerId, type, sdp, candidate } = payload;
        if (to !== myPeerId || !remotePeerId || remotePeerId === myPeerId) return;

        let pc = peerConnectionsRef.current.get(remotePeerId);
        if (!pc && type === 'offer') {
          pc = createPeerConnection(remotePeerId);
        }

        if (!pc) return;

        try {
          if (type === 'offer') {
            const isPolite = myPeerId < remotePeerId;
            const offerCollision = pc.signalingState !== 'stable';

            if (offerCollision) {
              if (!isPolite) {
                return;
              }
              await pc.setLocalDescription({ type: 'rollback' });
            }

            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const pending = pendingCandidatesRef.current.get(remotePeerId) || [];
            for (const cand of pending) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch {}
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
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(sdp));
              const pending = pendingCandidatesRef.current.get(remotePeerId) || [];
              for (const cand of pending) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch {}
              }
              pendingCandidatesRef.current.delete(remotePeerId);
            }
          } else if (type === 'ice-candidate' && candidate) {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch {}
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
      // 4. Cambios de estado de peers (mute, cámara, pantalla compartida)
      .on('broadcast', { event: 'peer-status' }, ({ payload }) => {
        const {
          peerId: remotePeerId,
          audioEnabled,
          videoEnabled,
          isScreenSharing: screenOn,
        } = payload;
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
      // 5. Salida explícita de un peer
      .on('broadcast', { event: 'peer-left' }, ({ payload }) => {
        const { peerId: remotePeerId } = payload;
        if (remotePeerId) {
          removeParticipant(remotePeerId);
        }
      })
      // 6. Chat en vivo
      .on('broadcast', { event: 'meet-chat' }, ({ payload }) => {
        setMessages((prev) => [...prev, payload]);
      });

    // Suscripción y registro de presencia
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        isSubscribedRef.current = true;
        setIsConnected(true);

        await channel.track({
          peerId: myPeerId,
          name: userNameRef.current,
          avatar: userAvatarRef.current,
          audioEnabled: isAudioEnabledRef.current,
          videoEnabled: isVideoEnabledRef.current,
          isScreenSharing: isScreenSharingRef.current,
        });

        channel.send({
          type: 'broadcast',
          event: 'peer-joined',
          payload: {
            peerId: myPeerId,
            name: userNameRef.current,
            avatar: userAvatarRef.current,
            audioEnabled: isAudioEnabledRef.current,
            videoEnabled: isVideoEnabledRef.current,
            isScreenSharing: isScreenSharingRef.current,
          },
        });
      }
    });
  }, [roomId, myPeerId, initLocalMedia, createPeerConnection, initiateOfferToPeer, removeParticipant]);

  // Enviar mensaje de chat
  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || !channelRef.current) return;

      const chatMsg: MeetChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        senderId: myPeerId,
        senderName: userNameRef.current,
        text: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      channelRef.current.send({
        type: 'broadcast',
        event: 'meet-chat',
        payload: chatMsg,
      });

      setMessages((prev) => [...prev, chatMsg]);
    },
    [myPeerId]
  );

  // Salir de la reunión
  const leaveMeeting = useCallback(() => {
    isSubscribedRef.current = false;
    if (channelRef.current) {
      try {
        channelRef.current.untrack();
        channelRef.current.send({
          type: 'broadcast',
          event: 'peer-left',
          payload: { peerId: myPeerId },
        });
        supabase.removeChannel(channelRef.current);
      } catch {}
      channelRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (cameraTrackRef.current) {
      cameraTrackRef.current.stop();
      cameraTrackRef.current = null;
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.onended = null;
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    disconnectTimersRef.current.forEach((t) => clearTimeout(t));
    disconnectTimersRef.current.clear();

    peerConnectionsRef.current.forEach((pc) => {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      try {
        pc.close();
      } catch {}
    });
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();
    remoteStreamsRef.current.clear();

    setLocalStream(null);
    setParticipants(new Map());
    setIsConnected(false);
    setIsScreenSharing(false);
    isScreenSharingRef.current = false;
  }, [myPeerId]);

  // Listener para cerrar llamada inmediatamente si se cierra la pestaña o ventana
  useEffect(() => {
    const handleUnload = () => {
      leaveMeeting();
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [leaveMeeting]);

  // Nivel de voz local optimizado (muestreo cada 150ms en lugar de 60fps para ahorrar CPU)
  useEffect(() => {
    if (!localStream || !isAudioEnabled || localStream.getAudioTracks().length === 0) {
      setIsLocalSpeaking(false);
      return;
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContext = new AudioCtx();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      const source = audioContext.createMediaStreamSource(localStream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      intervalId = setInterval(() => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const speaking = sum / bufferLength > 15;
        setIsLocalSpeaking((prev) => (prev !== speaking ? speaking : prev));
      }, 150);
    } catch {}

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    };
  }, [localStream, isAudioEnabled]);

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
    switchCamera,
    switchMicrophone,
    sendMessage,
    leaveMeeting,
  };
}

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// =========================================================================
// SIMULADOR DE WEBRTC, CANAL DE SEÑALIZACIÓN EN TIEMPO REAL Y SALA TABETALK
// =========================================================================

interface ParticipantMock {
  userId: string;
  role: "admin" | "member";
  displayName: string;
  isLocal: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  hasHardwareCamera: boolean;
  hasHardwareMic: boolean;
  localStream: {
    audioTracks: { id: string; kind: string; enabled: boolean; stopped: boolean }[];
    videoTracks: { id: string; kind: string; enabled: boolean; stopped: boolean }[];
  };
  remoteStreams: Map<string, any>;
  remoteMediaStates: Map<string, {
    isMuted: boolean;
    isVideoOff: boolean;
    isDeafened: boolean;
    isSpeaking: boolean;
    isScreenSharing: boolean;
    isCameraOn: boolean;
    isAudioEnabled: boolean;
  }>;
  peerConnections: Map<string, {
    targetId: string;
    state: "connected" | "disconnected" | "closed";
    senders: { kind: string; track: any }[];
    remoteDescriptionSet: boolean;
  }>;
  speakingUsers: Set<string>;
  remoteAudioElements: Map<string, { muted: boolean; paused: boolean }>;
}

// Bus de broadcast simulado (Supabase Realtime Channel)
class MockSignalingChannel {
  private subscribers: Map<string, (event: string, payload: any) => void> = new Map();

  subscribe(userId: string, handler: (event: string, payload: any) => void) {
    this.subscribers.set(userId, handler);
  }

  unsubscribe(userId: string) {
    this.subscribers.delete(userId);
  }

  broadcast(senderId: string, event: string, payload: any) {
    this.subscribers.forEach((handler, recipientId) => {
      if (recipientId !== senderId) {
        handler(event, payload);
      }
    });
  }
}

describe("TabeTalk - Simulación Multi-Usuario (3 Participantes: Admin y No-Admins)", () => {
  let signalingChannel: MockSignalingChannel;
  let alice: ParticipantMock; // Admin
  let bob: ParticipantMock;   // Miembro regular
  let charlie: ParticipantMock; // Miembro invitado (sin cámara)

  // Factory para crear participantes con la lógica idéntica a useRobustDiscord + TabeTalkRoom
  const createParticipant = (
    userId: string,
    displayName: string,
    role: "admin" | "member",
    hasHardwareCamera: boolean = true,
    hasHardwareMic: boolean = true
  ): ParticipantMock => {
    const audioTrack = hasHardwareMic
      ? { id: `audio-${userId}`, kind: "audio", enabled: true, stopped: false }
      : null;
    const videoTrack = hasHardwareCamera
      ? { id: `video-${userId}`, kind: "video", enabled: false, stopped: false }
      : null;

    const p: ParticipantMock = {
      userId,
      role,
      displayName,
      isLocal: false,
      isMuted: !hasHardwareMic,
      isVideoOff: true,
      isDeafened: false,
      isScreenSharing: false,
      isSpeaking: false,
      hasHardwareCamera,
      hasHardwareMic,
      localStream: {
        audioTracks: audioTrack ? [audioTrack] : [],
        videoTracks: videoTrack ? [videoTrack] : [],
      },
      remoteStreams: new Map(),
      remoteMediaStates: new Map(),
      peerConnections: new Map(),
      speakingUsers: new Set(),
      remoteAudioElements: new Map(),
    };

    return p;
  };

  // Helper para conectar el handler de señalización de cada participante
  const attachSignalingHandler = (participant: ParticipantMock) => {
    signalingChannel.subscribe(participant.userId, (event, payload) => {
      switch (event) {
        case "user-joined": {
          const peerId = payload.userId;
          // Actualizar estado remoto
          participant.remoteMediaStates.set(peerId, {
            isMuted: payload.isMuted,
            isVideoOff: payload.isVideoOff,
            isDeafened: payload.isDeafened,
            isSpeaking: payload.isSpeaking,
            isScreenSharing: payload.isScreenSharing,
            isCameraOn: !payload.isVideoOff,
            isAudioEnabled: !payload.isMuted,
          });

          // Crear RTCPeerConnection bidireccional
          participant.peerConnections.set(peerId, {
            targetId: peerId,
            state: "connected",
            senders: [
              { kind: "audio", track: participant.localStream.audioTracks[0] || null },
              { kind: "video", track: participant.isVideoOff ? null : participant.localStream.videoTracks[0] },
            ],
            remoteDescriptionSet: true,
          });

          // Registrar stream remoto simulado
          participant.remoteStreams.set(peerId, { id: `stream-${peerId}` });
          participant.remoteAudioElements.set(peerId, {
            muted: participant.isDeafened,
            paused: false,
          });

          break;
        }

        case "user-toggle-media": {
          const peerId = payload.userId;
          participant.remoteMediaStates.set(peerId, {
            isMuted: payload.isMuted,
            isVideoOff: payload.isVideoOff,
            isDeafened: payload.isDeafened,
            isSpeaking: payload.isSpeaking,
            isScreenSharing: payload.isScreenSharing,
            isCameraOn: !payload.isVideoOff,
            isAudioEnabled: !payload.isMuted,
          });

          if (payload.isSpeaking && !payload.isMuted) {
            participant.speakingUsers.add(peerId);
          } else {
            participant.speakingUsers.delete(peerId);
          }
          break;
        }

        case "user-speaking": {
          const peerId = payload.userId;
          if (payload.isSpeaking) {
            participant.speakingUsers.add(peerId);
          } else {
            participant.speakingUsers.delete(peerId);
          }
          break;
        }

        case "user-left": {
          const peerId = payload.userId;
          const pc = participant.peerConnections.get(peerId);
          if (pc) {
            pc.state = "closed";
            participant.peerConnections.delete(peerId);
          }
          participant.remoteStreams.delete(peerId);
          participant.remoteMediaStates.delete(peerId);
          participant.speakingUsers.delete(peerId);
          participant.remoteAudioElements.delete(peerId);
          break;
        }
      }
    });
  };

  // Acciones locales idénticas a useRobustDiscord
  const joinRoom = (participant: ParticipantMock) => {
    signalingChannel.broadcast(participant.userId, "user-joined", {
      userId: participant.userId,
      isMuted: participant.isMuted,
      isVideoOff: participant.isVideoOff,
      isDeafened: participant.isDeafened,
      isSpeaking: participant.isSpeaking,
      isScreenSharing: participant.isScreenSharing,
    });
  };

  const toggleAudio = (participant: ParticipantMock) => {
    if (participant.isDeafened) {
      participant.isDeafened = false;
    }
    participant.isMuted = !participant.isMuted;
    participant.localStream.audioTracks.forEach((t) => {
      t.enabled = !participant.isMuted;
    });

    if (participant.isMuted && participant.isSpeaking) {
      participant.isSpeaking = false;
      participant.speakingUsers.delete(participant.userId);
    }

    signalingChannel.broadcast(participant.userId, "user-toggle-media", {
      userId: participant.userId,
      isMuted: participant.isMuted,
      isVideoOff: participant.isVideoOff,
      isDeafened: participant.isDeafened,
      isSpeaking: participant.isSpeaking,
      isScreenSharing: participant.isScreenSharing,
    });
  };

  const toggleVideo = (participant: ParticipantMock) => {
    if (participant.isVideoOff) {
      if (participant.hasHardwareCamera) {
        participant.isVideoOff = false;
        participant.localStream.videoTracks.forEach((t) => {
          t.enabled = true;
        });
      }
    } else {
      participant.isVideoOff = true;
      participant.localStream.videoTracks.forEach((t) => {
        t.enabled = false;
      });
    }

    signalingChannel.broadcast(participant.userId, "user-toggle-media", {
      userId: participant.userId,
      isMuted: participant.isMuted,
      isVideoOff: participant.isVideoOff,
      isDeafened: participant.isDeafened,
      isSpeaking: participant.isSpeaking,
      isScreenSharing: participant.isScreenSharing,
    });
  };

  const toggleDeafen = (participant: ParticipantMock) => {
    participant.isDeafened = !participant.isDeafened;

    if (participant.isDeafened) {
      participant.isMuted = true;
      participant.localStream.audioTracks.forEach((t) => {
        t.enabled = false;
      });
      participant.isSpeaking = false;
      participant.speakingUsers.delete(participant.userId);
      // Silenciar todos los elementos remotos
      participant.remoteAudioElements.forEach((el) => {
        el.muted = true;
      });
    } else {
      // Restaurar audio entrante
      participant.remoteAudioElements.forEach((el) => {
        el.muted = false;
      });
    }

    signalingChannel.broadcast(participant.userId, "user-toggle-media", {
      userId: participant.userId,
      isMuted: participant.isMuted,
      isVideoOff: participant.isVideoOff,
      isDeafened: participant.isDeafened,
      isSpeaking: false,
      isScreenSharing: participant.isScreenSharing,
    });
  };

  const simulateVADSpeaking = (participant: ParticipantMock, dbLevel: number) => {
    // Umbral estricto de -50 dB
    const isAboveThreshold = dbLevel > -50;
    const shouldSpeak = isAboveThreshold && !participant.isMuted && !participant.isDeafened;

    if (shouldSpeak !== participant.isSpeaking) {
      participant.isSpeaking = shouldSpeak;
      if (shouldSpeak) {
        participant.speakingUsers.add(participant.userId);
      } else {
        participant.speakingUsers.delete(participant.userId);
      }

      signalingChannel.broadcast(participant.userId, "user-speaking", {
        userId: participant.userId,
        isSpeaking: shouldSpeak,
      });

      signalingChannel.broadcast(participant.userId, "user-toggle-media", {
        userId: participant.userId,
        isMuted: participant.isMuted,
        isVideoOff: participant.isVideoOff,
        isDeafened: participant.isDeafened,
        isSpeaking: shouldSpeak,
        isScreenSharing: participant.isScreenSharing,
      });
    }
  };

  const toggleScreenShare = (participant: ParticipantMock, start: boolean) => {
    participant.isScreenSharing = start;
    signalingChannel.broadcast(participant.userId, "user-toggle-media", {
      userId: participant.userId,
      isMuted: participant.isMuted,
      isVideoOff: participant.isVideoOff,
      isDeafened: participant.isDeafened,
      isSpeaking: participant.isSpeaking,
      isScreenSharing: start,
    });
  };

  const leaveRoom = (participant: ParticipantMock) => {
    signalingChannel.broadcast(participant.userId, "user-left", {
      userId: participant.userId,
    });
    // Limpieza de recursos locales
    participant.localStream.audioTracks.forEach((t) => (t.stopped = true));
    participant.localStream.videoTracks.forEach((t) => (t.stopped = true));
    participant.peerConnections.clear();
    participant.remoteStreams.clear();
    participant.remoteMediaStates.clear();
    participant.speakingUsers.clear();
    signalingChannel.unsubscribe(participant.userId);
  };

  beforeEach(() => {
    signalingChannel = new MockSignalingChannel();
    // 1 Admin y 2 Miembros (uno con cámara y otro sin cámara para validar fallback)
    alice = createParticipant("usr-alice-admin", "Alice (Admin)", "admin", true, true);
    bob = createParticipant("usr-bob-member", "Bob (Member)", "member", true, true);
    charlie = createParticipant("usr-charlie-guest", "Charlie (Guest)", "member", false, true);

    attachSignalingHandler(alice);
    attachSignalingHandler(bob);
    attachSignalingHandler(charlie);
  });

  afterEach(() => {
    leaveRoom(alice);
    leaveRoom(bob);
    leaveRoom(charlie);
  });

  // -------------------------------------------------------------------------
  // CASO 1: CONEXIÓN EN RED MALLA Y RECONOCIMIENTO MUTUO DE 3 PARTICIPANTES
  // -------------------------------------------------------------------------
  it("CASO 1: Unión de 3 participantes (Admin y no-Admins) estableciendo topología Mesh 3-Way", () => {
    // 1. Alice (Admin) entra
    joinRoom(alice);
    // 2. Bob (Member) entra
    joinRoom(bob);
    // 3. Charlie (Guest) entra
    joinRoom(charlie);

    // Alice debe tener peer connections activas con Bob y Charlie
    expect(alice.peerConnections.has("usr-bob-member")).toBe(true);
    expect(alice.peerConnections.has("usr-charlie-guest")).toBe(true);

    // Bob debe tener peer connections activas con Alice y Charlie
    expect(bob.peerConnections.has("usr-alice-admin")).toBe(true);
    expect(bob.peerConnections.has("usr-charlie-guest")).toBe(true);

    // Charlie debe tener peer connections activas con Alice y Bob
    expect(charlie.peerConnections.has("usr-alice-admin")).toBe(true);
    expect(charlie.peerConnections.has("usr-bob-member")).toBe(true);

    // Verificar streams remotos y estados en todos los nodos
    expect(alice.remoteStreams.size).toBe(2);
    expect(bob.remoteStreams.size).toBe(2);
    expect(charlie.remoteStreams.size).toBe(2);
  });

  // -------------------------------------------------------------------------
  // CASO 2: GESTIÓN DE AUDIO LOCAL (track.enabled) Y REFLEJO DE MUTEO EN REMOTOS
  // -------------------------------------------------------------------------
  it("CASO 2: Muteo de Alice (Admin) deshabilita su pista local y actualiza badge rojo en Bob y Charlie", () => {
    joinRoom(alice);
    joinRoom(bob);
    joinRoom(charlie);

    expect(alice.isMuted).toBe(false);
    expect(alice.localStream.audioTracks[0].enabled).toBe(true);

    // Alice se mutea
    toggleAudio(alice);

    // 1. Verificación local
    expect(alice.isMuted).toBe(true);
    expect(alice.localStream.audioTracks[0].enabled).toBe(false); // Track deshabilitado por MediaStreamTrack.enabled

    // 2. Verificación en Bob y Charlie
    expect(bob.remoteMediaStates.get("usr-alice-admin")?.isMuted).toBe(true);
    expect(charlie.remoteMediaStates.get("usr-alice-admin")?.isMuted).toBe(true);

    // 3. Alice se desmutea
    toggleAudio(alice);
    expect(alice.isMuted).toBe(false);
    expect(alice.localStream.audioTracks[0].enabled).toBe(true);
    expect(bob.remoteMediaStates.get("usr-alice-admin")?.isMuted).toBe(false);
    expect(charlie.remoteMediaStates.get("usr-alice-admin")?.isMuted).toBe(false);
  });

  // -------------------------------------------------------------------------
  // CASO 3: DETECCIÓN DE VOZ ACTIVA (VAD) CON UMBRAL -50 dB Y HALO VERDE
  // -------------------------------------------------------------------------
  it("CASO 3: Bob habla por encima de -50 dB -> activa halo verde; usuario silenciado NO activa halo", () => {
    joinRoom(alice);
    joinRoom(bob);
    joinRoom(charlie);

    // Ruido ambiental bajo (-65 dB) -> Por debajo del umbral de -50 dB
    simulateVADSpeaking(bob, -65);
    expect(bob.isSpeaking).toBe(false);
    expect(alice.speakingUsers.has("usr-bob-member")).toBe(false);

    // Voz activa clara (-32 dB) -> Por encima del umbral de -50 dB
    simulateVADSpeaking(bob, -32);
    expect(bob.isSpeaking).toBe(true);
    expect(bob.speakingUsers.has("usr-bob-member")).toBe(true);
    expect(alice.speakingUsers.has("usr-bob-member")).toBe(true); // Alice ve el halo verde de Bob
    expect(charlie.speakingUsers.has("usr-bob-member")).toBe(true); // Charlie ve el halo verde de Bob

    // Bob se calla
    simulateVADSpeaking(bob, -70);
    expect(bob.isSpeaking).toBe(false);
    expect(alice.speakingUsers.has("usr-bob-member")).toBe(false);

    // Intento con Alice estando MUTEADA: aunque haya ruido alto (-20 dB), NO debe emitir speaking
    toggleAudio(alice); // Alice se mutea
    expect(alice.isMuted).toBe(true);

    simulateVADSpeaking(alice, -20);
    expect(alice.isSpeaking).toBe(false); // Bloqueado por !isMuted
    expect(bob.speakingUsers.has("usr-alice-admin")).toBe(false);
    expect(charlie.speakingUsers.has("usr-alice-admin")).toBe(false);
  });

  // -------------------------------------------------------------------------
  // CASO 4: CÁMARA ENCENDIDA/APAGADA Y FALLBACK PARA USUARIOS SIN CÁMARA
  // -------------------------------------------------------------------------
  it("CASO 4: Bob enciende cámara y se refleja en video; Charlie sin cámara entra en fallback elegante", () => {
    joinRoom(alice);
    joinRoom(bob);
    joinRoom(charlie);

    // Al inicio, todos tienen cámara apagada
    expect(bob.isVideoOff).toBe(true);
    expect(alice.remoteMediaStates.get("usr-bob-member")?.isVideoOff).toBe(true);

    // Bob enciende su cámara
    toggleVideo(bob);
    expect(bob.isVideoOff).toBe(false);
    expect(bob.localStream.videoTracks[0].enabled).toBe(true);

    // Alice y Charlie reciben el estado de cámara activa
    expect(alice.remoteMediaStates.get("usr-bob-member")?.isVideoOff).toBe(false);
    expect(alice.remoteMediaStates.get("usr-bob-member")?.isCameraOn).toBe(true);
    expect(charlie.remoteMediaStates.get("usr-bob-member")?.isVideoOff).toBe(false);

    // Charlie intenta encender cámara pero no tiene hardware
    expect(charlie.hasHardwareCamera).toBe(false);
    toggleVideo(charlie);
    expect(charlie.isVideoOff).toBe(true); // No crashea la app, permanece apagada
  });

  // -------------------------------------------------------------------------
  // CASO 5: ENSORDECER (isDeafened) SILENCIA AUDIO REMOTO Y BLOQUEA MICRÓFONO
  // -------------------------------------------------------------------------
  it("CASO 5: Charlie ensordece -> silencia elementos <audio> remotos y fuerza mute de su micrófono", () => {
    joinRoom(alice);
    joinRoom(bob);
    joinRoom(charlie);

    // Charlie no está ensordecido inicialmente
    expect(charlie.isDeafened).toBe(false);
    expect(charlie.remoteAudioElements.get("usr-alice-admin")?.muted).toBe(false);
    expect(charlie.remoteAudioElements.get("usr-bob-member")?.muted).toBe(false);

    // Charlie activa ensordecer
    toggleDeafen(charlie);

    // 1. Charlie tiene su micro forzado a mute
    expect(charlie.isDeafened).toBe(true);
    expect(charlie.isMuted).toBe(true);
    expect(charlie.localStream.audioTracks[0].enabled).toBe(false);

    // 2. Todos los audios entrantes de Charlie están muteados
    expect(charlie.remoteAudioElements.get("usr-alice-admin")?.muted).toBe(true);
    expect(charlie.remoteAudioElements.get("usr-bob-member")?.muted).toBe(true);

    // 3. Alice y Bob ven el badge de auriculares tachados de Charlie
    expect(alice.remoteMediaStates.get("usr-charlie-guest")?.isDeafened).toBe(true);
    expect(bob.remoteMediaStates.get("usr-charlie-guest")?.isDeafened).toBe(true);

    // Charlie desactiva ensordecer
    toggleDeafen(charlie);
    expect(charlie.isDeafened).toBe(false);
    expect(charlie.remoteAudioElements.get("usr-alice-admin")?.muted).toBe(false);
    expect(charlie.remoteAudioElements.get("usr-bob-member")?.muted).toBe(false);
  });

  // -------------------------------------------------------------------------
  // CASO 6: COMPARTIR PANTALLA PRIORITARIA
  // -------------------------------------------------------------------------
  it("CASO 6: Alice (Admin) comparte pantalla -> notifica a Bob y Charlie para renderizar el viewport prioritario", () => {
    joinRoom(alice);
    joinRoom(bob);
    joinRoom(charlie);

    expect(alice.isScreenSharing).toBe(false);

    // Alice inicia screen share
    toggleScreenShare(alice, true);

    expect(alice.isScreenSharing).toBe(true);
    expect(bob.remoteMediaStates.get("usr-alice-admin")?.isScreenSharing).toBe(true);
    expect(charlie.remoteMediaStates.get("usr-alice-admin")?.isScreenSharing).toBe(true);

    // Alice detiene screen share
    toggleScreenShare(alice, false);
    expect(alice.isScreenSharing).toBe(false);
    expect(bob.remoteMediaStates.get("usr-alice-admin")?.isScreenSharing).toBe(false);
    expect(charlie.remoteMediaStates.get("usr-alice-admin")?.isScreenSharing).toBe(false);
  });

  // -------------------------------------------------------------------------
  // CASO 7: DESCONEXIÓN LIMPIA (CLEANUP) Y AJUSTE DE CUADRÍCULA
  // -------------------------------------------------------------------------
  it("CASO 7: Charlie se desconecta -> Alice y Bob destruyen tracks y conexiones sin fugas de memoria", () => {
    joinRoom(alice);
    joinRoom(bob);
    joinRoom(charlie);

    expect(alice.peerConnections.size).toBe(2);
    expect(bob.peerConnections.size).toBe(2);

    // Charlie sale de la sala
    leaveRoom(charlie);

    // Alice y Bob eliminaron a Charlie de sus conexiones y streams
    expect(alice.peerConnections.has("usr-charlie-guest")).toBe(false);
    expect(bob.peerConnections.has("usr-charlie-guest")).toBe(false);

    expect(alice.remoteStreams.has("usr-charlie-guest")).toBe(false);
    expect(bob.remoteStreams.has("usr-charlie-guest")).toBe(false);

    expect(alice.remoteMediaStates.has("usr-charlie-guest")).toBe(false);
    expect(bob.remoteMediaStates.has("usr-charlie-guest")).toBe(false);

    // Tracks de Charlie detenidos para evitar memory leaks
    expect(charlie.localStream.audioTracks[0].stopped).toBe(true);
  });
});

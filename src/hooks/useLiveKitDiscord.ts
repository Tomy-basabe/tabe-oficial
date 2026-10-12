import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConnectionState,
  LocalParticipant,
  Participant,
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteTrackPublication,
} from "livekit-client";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { CameraDevice, RemoteMediaState } from "@/hooks/useRobustDiscord";

const livekitUrl = (import.meta.env.VITE_LIVEKIT_URL as string | undefined)?.trim() || "";

function mediaStreamForParticipant(participant: Participant): MediaStream {
  const stream = new MediaStream();
  participant.trackPublications.forEach((publication) => {
    if (publication.source === Track.Source.ScreenShare || publication.source === Track.Source.ScreenShareAudio) return;
    const mediaTrack = publication.track?.mediaStreamTrack;
    if (mediaTrack && !stream.getTracks().some((track) => track.id === mediaTrack.id)) {
      stream.addTrack(mediaTrack);
    }
  });
  return stream;
}

function getProfileName(participant: Participant): string {
  return participant.name || participant.identity;
}

export function useLiveKitDiscord({ channelId }: { channelId: string | null }) {
  const { user } = useAuth();
  const roomRef = useRef<Room | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteMediaStates, setRemoteMediaStates] = useState<Map<string, RemoteMediaState>>(new Map());
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [mics, setMics] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [selectedMicId, setSelectedMicId] = useState("");

  const refreshParticipant = useCallback((participant: Participant) => {
    const stream = mediaStreamForParticipant(participant);
    const screenTracks = Array.from(participant.trackPublications.values())
      .filter((publication) => publication.source === Track.Source.ScreenShare)
      .map((publication) => publication.track?.mediaStreamTrack)
      .filter((track): track is MediaStreamTrack => Boolean(track));

    if (participant instanceof LocalParticipant) {
      setLocalStream(stream.getTracks().length ? stream : null);
      setScreenStream(screenTracks.length ? new MediaStream(screenTracks) : null);
      return;
    }

    setRemoteStreams((previous) => {
      const next = new Map(previous);
      if (stream.getTracks().length) next.set(participant.identity, stream);
      else next.delete(participant.identity);
      return next;
    });
    setRemoteScreenStreams((previous) => {
      const next = new Map(previous);
      if (screenTracks.length) next.set(participant.identity, new MediaStream(screenTracks));
      else next.delete(participant.identity);
      return next;
    });
    setRemoteMediaStates((previous) => {
      const next = new Map(previous);
      next.set(participant.identity, {
        isCameraOn: participant.isCameraEnabled,
        isAudioEnabled: participant.isMicrophoneEnabled,
        isScreenSharing: participant.isScreenShareEnabled,
      });
      return next;
    });
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((device) => device.kind === "videoinput");
    const audioInputs = devices.filter((device) => device.kind === "audioinput");
    setCameras(videoInputs.map((device, index) => ({ deviceId: device.deviceId, label: device.label || `Cámara ${index + 1}` })));
    setMics(audioInputs.map((device, index) => ({ deviceId: device.deviceId, label: device.label || `Micrófono ${index + 1}` })));
    setSelectedCameraId((current) => current || videoInputs[0]?.deviceId || "");
    setSelectedMicId((current) => current || audioInputs[0]?.deviceId || "");
  }, []);

  useEffect(() => {
    if (!livekitUrl || !channelId || !user?.id) return;
    let active = true;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const updateParticipants = () => {
      refreshParticipant(room.localParticipant);
      room.remoteParticipants.forEach(refreshParticipant);
    };
    const onTrackSubscribed = (track: RemoteTrack, _publication: RemoteTrackPublication, participant: Participant) => {
      track.attach();
      refreshParticipant(participant);
    };
    const onTrackUnsubscribed = (_track: RemoteTrack, _publication: RemoteTrackPublication, participant: Participant) => refreshParticipant(participant);
    const onParticipantChanged = (participant: Participant) => refreshParticipant(participant);
    const onActiveSpeakersChanged = (participants: Participant[]) => setSpeakingUsers(new Set(participants.map((participant) => participant.identity)));

    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
    room.on(RoomEvent.ParticipantConnected, onParticipantChanged);
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      setRemoteStreams((previous) => { const next = new Map(previous); next.delete(participant.identity); return next; });
      setRemoteScreenStreams((previous) => { const next = new Map(previous); next.delete(participant.identity); return next; });
      setRemoteMediaStates((previous) => { const next = new Map(previous); next.delete(participant.identity); return next; });
    });
    room.on(RoomEvent.LocalTrackPublished, updateParticipants);
    room.on(RoomEvent.LocalTrackUnpublished, updateParticipants);
    room.on(RoomEvent.TrackMuted, updateParticipants);
    room.on(RoomEvent.TrackUnmuted, updateParticipants);
    room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);

    const connect = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (!accessToken) throw new Error("Sesión no disponible");
        const response = await fetch("/api/livekit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ room: `tabetalk-${channelId}` }),
        });
        if (!response.ok) throw new Error("No se pudo obtener el token de videollamada");
        const { token } = await response.json();
        await room.connect(livekitUrl, token);
        if (!active) return;
        setIsConnected(true);
        await room.localParticipant.setMicrophoneEnabled(true);
        await refreshDevices();
        updateParticipants();
      } catch (error) {
        console.error("[LiveKit] Error conectando a Tabe Talk:", error);
      }
    };
    connect();

    return () => {
      active = false;
      room.removeAllListeners();
      room.disconnect();
      roomRef.current = null;
      setIsConnected(false);
      setLocalStream(null);
      setRemoteStreams(new Map());
      setRemoteScreenStreams(new Map());
      setRemoteMediaStates(new Map());
      setSpeakingUsers(new Set());
    };
  }, [channelId, refreshDevices, refreshParticipant, user?.id]);

  const toggleAudio = useCallback(async () => {
    const participant = roomRef.current?.localParticipant;
    if (!participant) return;
    const enabled = !participant.isMicrophoneEnabled;
    await participant.setMicrophoneEnabled(enabled);
    setIsAudioEnabled(enabled);
    refreshParticipant(participant);
  }, [refreshParticipant]);

  const toggleVideo = useCallback(async () => {
    const participant = roomRef.current?.localParticipant;
    if (!participant) return;
    const enabled = !participant.isCameraEnabled;
    await participant.setCameraEnabled(enabled, { deviceId: selectedCameraId || undefined });
    setIsVideoEnabled(enabled);
    refreshParticipant(participant);
  }, [refreshParticipant, selectedCameraId]);

  const startScreenShare = useCallback(async () => {
    const participant = roomRef.current?.localParticipant;
    if (!participant) return;
    await participant.setScreenShareEnabled(true, { audio: true });
    setIsScreenSharing(true);
    refreshParticipant(participant);
  }, [refreshParticipant]);

  const stopScreenShare = useCallback(async () => {
    const participant = roomRef.current?.localParticipant;
    if (!participant) return;
    await participant.setScreenShareEnabled(false);
    setIsScreenSharing(false);
    refreshParticipant(participant);
  }, [refreshParticipant]);

  const switchCamera = useCallback(async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    await roomRef.current?.switchActiveDevice("videoinput", deviceId);
    if (roomRef.current?.localParticipant.isCameraEnabled) await roomRef.current.localParticipant.setCameraEnabled(true, { deviceId });
  }, []);

  const switchMic = useCallback(async (deviceId: string) => {
    setSelectedMicId(deviceId);
    await roomRef.current?.switchActiveDevice("audioinput", deviceId);
    if (roomRef.current?.localParticipant.isMicrophoneEnabled) await roomRef.current.localParticipant.setMicrophoneEnabled(true, { deviceId });
  }, []);

  return {
    enabled: Boolean(livekitUrl),
    isConnected,
    localStream,
    remoteStreams,
    screenStream,
    remoteScreenStreams,
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
    switchMic,
  };
}

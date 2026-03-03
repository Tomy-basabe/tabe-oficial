import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ICE_SERVERS } from "@/lib/webrtc-config";

export interface StudyRoom {
  id: string;
  host_id: string;
  name: string;
  subject_id: string | null;
  is_active: boolean;
  max_participants: number;
  created_at: string;
  host_profile?: {
    nombre: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  subject_id: string | null;
  joined_at: string;
  left_at: string | null;
  is_muted: boolean;
  is_camera_off: boolean;
  is_sharing_screen: boolean;
  study_duration_seconds: number;
  profile?: {
    nombre: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface Subject {
  id: string;
  nombre: string;
  codigo: string;
  año?: number;
}

interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

interface SignalingMessage {
  type: "offer" | "answer" | "ice-candidate" | "user-joined" | "user-left";
  from: string;
  to?: string;
  data?: any;
}

// ICE_SERVERS imported from @/lib/webrtc-config

interface StudyRoomContextType {
  // Room state
  activeRooms: StudyRoom[];
  currentRoom: StudyRoom | null;
  participants: RoomParticipant[];
  myParticipant: RoomParticipant | null;
  subjects: Subject[];
  loading: boolean;
  sessionStartTime: Date | null;

  // WebRTC state
  localStream: MediaStream | null;
  displayStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  connectionState: "connecting" | "connected" | "disconnected";

  // Room actions
  createRoom: (name: string, subjectId?: string) => Promise<StudyRoom | null>;
  joinRoom: (roomId: string, subjectId?: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  updateMyState: (updates: Partial<Pick<RoomParticipant, "is_muted" | "is_camera_off" | "is_sharing_screen" | "subject_id">>) => Promise<void>;
  fetchActiveRooms: () => Promise<void>;

  // WebRTC actions
  toggleAudio: () => void;
  toggleVideo: () => Promise<void>;
  startScreenShare: () => Promise<boolean>;
  stopScreenShare: () => void;
}

const StudyRoomContext = createContext<StudyRoomContextType | null>(null);

export function StudyRoomProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Room state
  const [activeRooms, setActiveRooms] = useState<StudyRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<StudyRoom | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [myParticipant, setMyParticipant] = useState<RoomParticipant | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // WebRTC state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected">("disconnected");

  // Refs
  const peerConnections = useRef<Map<string, PeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const participantsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch available subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      const { data } = await supabase
        .from("subjects")
        .select("id, nombre, codigo")
        .order("numero_materia", { ascending: true });

      if (data) {
        const { data: fullData } = await supabase
          .from("subjects")
          .select("*")
          .order("numero_materia", { ascending: true });

        if (fullData) {
          const subjectsWithYear = data.map((s, idx) => ({
            ...s,
            año: fullData[idx]?.año
          }));
          setSubjects(subjectsWithYear);
        } else {
          setSubjects(data as Subject[]);
        }
      }
    };
    fetchSubjects();
  }, []);

  // Fetch active rooms from friends
  const fetchActiveRooms = useCallback(async () => {
    if (!user) return;

    const { data: rooms, error } = await supabase
      .from("study_rooms")
      .select("*")
      .eq("is_active", true)
      .neq("host_id", user.id);

    if (error) {
      console.error("Error fetching rooms:", error);
      return;
    }

    if (rooms && rooms.length > 0) {
      const hostIds = [...new Set(rooms.map(r => r.host_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, nombre, username, avatar_url")
        .in("user_id", hostIds);

      const roomsWithProfiles = rooms.map(room => ({
        ...room,
        host_profile: profiles?.find(p => p.user_id === room.host_id) || undefined
      }));

      setActiveRooms(roomsWithProfiles);
    } else {
      setActiveRooms([]);
    }
  }, [user]);

  // Subscribe to room changes
  useEffect(() => {
    if (!user) return;

    fetchActiveRooms();

    const channel = supabase
      .channel("study-rooms-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "study_rooms",
        },
        () => {
          fetchActiveRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchActiveRooms]);

  // Subscribe to participants changes when in a room
  useEffect(() => {
    if (!currentRoom || !user) return;

    const fetchParticipants = async () => {
      const { data } = await supabase
        .from("room_participants")
        .select("*")
        .eq("room_id", currentRoom.id)
        .is("left_at", null);

      if (data) {
        const userIds = data.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, nombre, username, avatar_url")
          .in("user_id", userIds);

        const participantsWithProfiles = data.map(p => ({
          ...p,
          profile: profiles?.find(pr => pr.user_id === p.user_id) || undefined
        }));

        setParticipants(participantsWithProfiles);
        setMyParticipant(participantsWithProfiles.find(p => p.user_id === user.id) || null);
      }
    };

    fetchParticipants();

    const channel = supabase
      .channel(`room-participants-${currentRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_participants",
          filter: `room_id=eq.${currentRoom.id}`,
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    participantsChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      participantsChannelRef.current = null;
    };
  }, [currentRoom, user]);

  // WebRTC: Create peer connection
  const createPeerConnection = useCallback(
    (peerId: string, stream: MediaStream) => {
      if (!user) return null;

      const pc = new RTCPeerConnection(ICE_SERVERS);

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.set(peerId, remoteStream);
          return updated;
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "signaling",
            payload: {
              type: "ice-candidate",
              from: user.id,
              to: peerId,
              data: event.candidate,
            } as SignalingMessage,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setConnectionState("connected");
        } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setRemoteStreams((prev) => {
            const updated = new Map(prev);
            updated.delete(peerId);
            return updated;
          });
          peerConnections.current.delete(peerId);
        }
      };

      peerConnections.current.set(peerId, { peerId, connection: pc });
      return pc;
    },
    [user]
  );

  // WebRTC: Handle offer
  const handleOffer = useCallback(
    async (fromId: string, offer: RTCSessionDescriptionInit, stream: MediaStream) => {
      if (!user) return;

      let pc = peerConnections.current.get(fromId)?.connection;
      if (!pc) {
        pc = createPeerConnection(fromId, stream);
      }
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        channelRef.current?.send({
          type: "broadcast",
          event: "signaling",
          payload: {
            type: "answer",
            from: user.id,
            to: fromId,
            data: answer,
          } as SignalingMessage,
        });
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    },
    [user, createPeerConnection]
  );

  // WebRTC: Handle answer
  const handleAnswer = useCallback(async (fromId: string, answer: RTCSessionDescriptionInit) => {
    const pc = peerConnections.current.get(fromId)?.connection;
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  }, []);

  // WebRTC: Handle ICE candidate
  const handleIceCandidate = useCallback(async (fromId: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(fromId)?.connection;
    if (!pc) return;

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }, []);

  // WebRTC: Create offer
  const createOffer = useCallback(
    async (peerId: string, stream: MediaStream) => {
      if (!user) return;

      const pc = createPeerConnection(peerId, stream);
      if (!pc) return;

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        channelRef.current?.send({
          type: "broadcast",
          event: "signaling",
          payload: {
            type: "offer",
            from: user.id,
            to: peerId,
            data: offer,
          } as SignalingMessage,
        });
      } catch (error) {
        console.error("Error creating offer:", error);
      }
    },
    [user, createPeerConnection]
  );

  // Initialize media
  const initializeMedia = useCallback(async (video: boolean = true, audio: boolean = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: 640, height: 480, facingMode: "user" } : false,
        audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
      });
      setLocalStream(stream);
      setDisplayStream(stream);
      localStreamRef.current = stream;
      setIsVideoEnabled(video);
      setIsAudioEnabled(audio);
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      if (video) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setLocalStream(audioStream);
          setDisplayStream(audioStream);
          localStreamRef.current = audioStream;
          setIsVideoEnabled(false);
          setIsAudioEnabled(true);
          return audioStream;
        } catch (audioError) {
          console.error("Error accessing audio:", audioError);
        }
      }
      return null;
    }
  }, []);

  // Join signaling channel
  const joinSignalingChannel = useCallback(
    async (stream: MediaStream) => {
      if (!currentRoom || !user) return;

      setConnectionState("connecting");

      const channel = supabase.channel(`study-room:${currentRoom.id}`, {
        config: {
          broadcast: { self: false },
          presence: { key: user.id },
        },
      });

      channel
        .on("broadcast", { event: "signaling" }, ({ payload }) => {
          const message = payload as SignalingMessage;
          if (message.to && message.to !== user.id) return;

          switch (message.type) {
            case "offer":
              handleOffer(message.from, message.data, stream);
              break;
            case "answer":
              handleAnswer(message.from, message.data);
              break;
            case "ice-candidate":
              handleIceCandidate(message.from, message.data);
              break;
          }
        })
        .on("presence", { event: "join" }, ({ key }) => {
          if (key !== user.id) {
            createOffer(key, stream);
          }
        })
        .on("presence", { event: "leave" }, ({ key }) => {
          const pc = peerConnections.current.get(key);
          if (pc) {
            pc.connection.close();
            peerConnections.current.delete(key);
            setRemoteStreams((prev) => {
              const updated = new Map(prev);
              updated.delete(key);
              return updated;
            });
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ user_id: user.id });
            setConnectionState("connected");
          }
        });

      channelRef.current = channel;
    },
    [currentRoom, user, createOffer, handleOffer, handleAnswer, handleIceCandidate]
  );

  // Create room
  const createRoom = async (name: string, subjectId?: string): Promise<StudyRoom | null> => {
    if (!user) return null;
    setLoading(true);

    try {
      const { data: room, error } = await supabase
        .from("study_rooms")
        .insert({
          host_id: user.id,
          name,
          subject_id: subjectId || null,
        })
        .select()
        .single();

      if (error) throw error;

      const { data: participant, error: joinError } = await supabase
        .from("room_participants")
        .insert({
          room_id: room.id,
          user_id: user.id,
          subject_id: subjectId || null,
        })
        .select()
        .single();

      if (joinError) throw joinError;

      setCurrentRoom(room);
      setMyParticipant(participant);
      setSessionStartTime(new Date());

      // Initialize media and signaling
      const stream = await initializeMedia();
      if (stream) {
        // Need to wait for currentRoom to be set before joining signaling
        setTimeout(async () => {
          await joinSignalingChannelWithRoom(room.id, stream);
        }, 100);
      }

      toast({
        title: "Sala creada",
        description: `La sala "${name}" está lista para tus amigos`,
      });

      return room;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Join signaling with specific room ID
  const joinSignalingChannelWithRoom = useCallback(
    async (roomId: string, stream: MediaStream) => {
      if (!user) return;

      setConnectionState("connecting");

      const channel = supabase.channel(`study-room:${roomId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: user.id },
        },
      });

      channel
        .on("broadcast", { event: "signaling" }, ({ payload }) => {
          const message = payload as SignalingMessage;
          if (message.to && message.to !== user.id) return;

          switch (message.type) {
            case "offer":
              handleOffer(message.from, message.data, stream);
              break;
            case "answer":
              handleAnswer(message.from, message.data);
              break;
            case "ice-candidate":
              handleIceCandidate(message.from, message.data);
              break;
          }
        })
        .on("presence", { event: "join" }, ({ key }) => {
          if (key !== user.id) {
            createOffer(key, stream);
          }
        })
        .on("presence", { event: "leave" }, ({ key }) => {
          const pc = peerConnections.current.get(key);
          if (pc) {
            pc.connection.close();
            peerConnections.current.delete(key);
            setRemoteStreams((prev) => {
              const updated = new Map(prev);
              updated.delete(key);
              return updated;
            });
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ user_id: user.id });
            setConnectionState("connected");
          }
        });

      channelRef.current = channel;
    },
    [user, createOffer, handleOffer, handleAnswer, handleIceCandidate]
  );

  // Join room
  const joinRoom = async (roomId: string, subjectId?: string): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);

    try {
      const { data: room, error: roomError } = await supabase
        .from("study_rooms")
        .select("*")
        .eq("id", roomId)
        .eq("is_active", true)
        .single();

      if (roomError || !room) {
        toast({
          title: "Error",
          description: "La sala no existe o ya no está activa",
          variant: "destructive",
        });
        return false;
      }

      const { count } = await supabase
        .from("room_participants")
        .select("*", { count: "exact", head: true })
        .eq("room_id", roomId)
        .is("left_at", null);

      if (count && count >= room.max_participants) {
        toast({
          title: "Sala llena",
          description: "Esta sala ya tiene el máximo de participantes",
          variant: "destructive",
        });
        return false;
      }

      const { data: participant, error } = await supabase
        .from("room_participants")
        .insert({
          room_id: roomId,
          user_id: user.id,
          subject_id: subjectId || room.subject_id,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentRoom(room);
      setMyParticipant(participant);
      setSessionStartTime(new Date());

      // Initialize media and signaling
      const stream = await initializeMedia();
      if (stream) {
        await joinSignalingChannelWithRoom(room.id, stream);
      }

      toast({
        title: "Te uniste a la sala",
        description: `Ahora estás en "${room.name}"`,
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Leave room
  const leaveRoom = async () => {
    if (!user || !currentRoom || !myParticipant) return;

    try {
      const duration = sessionStartTime
        ? Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000)
        : 0;

      await supabase
        .from("room_participants")
        .update({
          left_at: new Date().toISOString(),
          study_duration_seconds: duration,
        })
        .eq("id", myParticipant.id);

      if (duration > 60) {
        await supabase.from("study_sessions").insert({
          user_id: user.id,
          subject_id: myParticipant.subject_id,
          tipo: "videocall",
          duracion_segundos: duration,
          completada: true,
          fecha: new Date().toISOString().split('T')[0],
        });

        const { data: stats } = await supabase
          .from("user_stats")
          .select("horas_estudio_total, xp_total")
          .eq("user_id", user.id)
          .single();

        if (stats) {
          const xpGained = Math.floor(duration / 60);
          await supabase
            .from("user_stats")
            .update({
              horas_estudio_total: stats.horas_estudio_total + Math.floor(duration / 3600),
              xp_total: stats.xp_total + xpGained,
            })
            .eq("user_id", user.id);
        }
      }

      if (currentRoom.host_id === user.id) {
        await supabase
          .from("study_rooms")
          .update({ is_active: false })
          .eq("id", currentRoom.id);
      }

      // Cleanup WebRTC
      peerConnections.current.forEach(({ connection }) => {
        connection.close();
      });
      peerConnections.current.clear();

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
      }

      // Reset state
      setCurrentRoom(null);
      setMyParticipant(null);
      setParticipants([]);
      setSessionStartTime(null);
      setLocalStream(null);
      setDisplayStream(null);
      setScreenStream(null);
      setRemoteStreams(new Map());
      setConnectionState("disconnected");
      setIsScreenSharing(false);
      setIsAudioEnabled(true);
      setIsVideoEnabled(true);

      toast({
        title: "Saliste de la sala",
        description: duration > 60
          ? `Estudiaste ${Math.floor(duration / 60)} minutos`
          : "Sesión muy corta para registrar",
      });
    } catch (error: any) {
      console.error("Error leaving room:", error);
    }
  };

  // Update my state
  const updateMyState = async (updates: Partial<Pick<RoomParticipant, "is_muted" | "is_camera_off" | "is_sharing_screen" | "subject_id">>) => {
    if (!myParticipant) return;

    await supabase
      .from("room_participants")
      .update(updates)
      .eq("id", myParticipant.id);
  };

  // Toggle audio
  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled((prev) => !prev);
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const videoTracks = stream.getVideoTracks();

    if (isVideoEnabled) {
      videoTracks.forEach((track) => {
        track.enabled = false;
      });
      setIsVideoEnabled(false);
    } else {
      if (videoTracks.length > 0) {
        videoTracks.forEach((track) => {
          track.enabled = true;
        });
        setIsVideoEnabled(true);
      } else {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" },
          });
          const newVideoTrack = newStream.getVideoTracks()[0];
          stream.addTrack(newVideoTrack);

          peerConnections.current.forEach(({ connection }) => {
            const sender = connection.getSenders().find((s) => s.track?.kind === "video");
            if (sender) {
              sender.replaceTrack(newVideoTrack);
            } else {
              connection.addTrack(newVideoTrack, stream);
            }
          });

          setLocalStream(stream);
          setDisplayStream(stream);
          setIsVideoEnabled(true);
        } catch (error) {
          console.error("Error re-enabling video:", error);
        }
      }
    }
  }, [isVideoEnabled]);

  // Start screen share
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      setScreenStream(stream);
      setDisplayStream(stream);
      setIsScreenSharing(true);

      const videoTrack = stream.getVideoTracks()[0];
      peerConnections.current.forEach(({ connection }) => {
        const sender = connection.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      return true;
    } catch (error) {
      console.error("Error starting screen share:", error);
      return false;
    }
  }, []);

  // Stop screen share
  const stopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
    setIsScreenSharing(false);

    const stream = localStreamRef.current;
    if (stream) {
      setDisplayStream(stream);
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        peerConnections.current.forEach(({ connection }) => {
          const sender = connection.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
    }
  }, [screenStream]);

  const value: StudyRoomContextType = {
    activeRooms,
    currentRoom,
    participants,
    myParticipant,
    subjects,
    loading,
    sessionStartTime,
    localStream,
    displayStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    connectionState,
    createRoom,
    joinRoom,
    leaveRoom,
    updateMyState,
    fetchActiveRooms,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  };

  return (
    <StudyRoomContext.Provider value={value}>
      {children}
    </StudyRoomContext.Provider>
  );
}

export function useStudyRoomContext() {
  const context = useContext(StudyRoomContext);
  if (!context) {
    throw new Error("useStudyRoomContext must be used within a StudyRoomProvider");
  }
  return context;
}

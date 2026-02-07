import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface DiscordServer {
  id: string;
  name: string;
  icon_url: string | null;
  owner_id: string;
  created_at: string;
}

export interface DiscordServerMember {
  id: string;
  server_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    nombre: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface DiscordChannel {
  id: string;
  server_id: string;
  name: string;
  type: "text" | "voice";
  position: number;
  created_at: string;
}

export interface DiscordMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    nombre: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface DiscordVoiceParticipant {
  id: string;
  channel_id: string;
  user_id: string;
  is_muted: boolean;
  is_deafened: boolean;
  is_camera_on: boolean;
  is_screen_sharing: boolean;
  is_speaking: boolean;
  joined_at: string;
  profile?: {
    nombre: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useDiscord() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Server state
  const [servers, setServers] = useState<DiscordServer[]>([]);
  const [currentServer, setCurrentServer] = useState<DiscordServer | null>(null);
  const [members, setMembers] = useState<DiscordServerMember[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  
  // Channel state
  const [currentChannel, setCurrentChannel] = useState<DiscordChannel | null>(null);
  const [messages, setMessages] = useState<DiscordMessage[]>([]);
  const [voiceParticipants, setVoiceParticipants] = useState<DiscordVoiceParticipant[]>([]);
  
  // WebRTC state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(false);
  const [inVoiceChannel, setInVoiceChannel] = useState(false);
  
  // Refs
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const signalingChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null); // Keep reference for signaling handlers

  // Perfect Negotiation state (prevents offer glare)
  const negotiationStateRef = useRef<
    Map<
      string,
      {
        makingOffer: boolean;
        ignoreOffer: boolean;
        polite: boolean;
      }
    >
  >(new Map());

  const getNegotiationState = useCallback(
    (peerId: string) => {
      const existing = negotiationStateRef.current.get(peerId);
      if (existing) return existing;
      const state = {
        makingOffer: false,
        ignoreOffer: false,
        // Deterministic rule: the user with the lexicographically larger id is "polite"
        // (will accept rollback on collisions). This avoids both sides ignoring.
        polite: !!user && user.id.localeCompare(peerId) > 0,
      };
      negotiationStateRef.current.set(peerId, state);
      return state;
    },
    [user]
  );

  // Fetch user's servers
  const fetchServers = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("discord_servers")
      .select("*")
      .order("created_at", { ascending: true });
    
    if (error) {
      console.error("Error fetching servers:", error);
      return;
    }
    
    setServers(data || []);
  }, [user]);

  // Fetch channels for current server
  const fetchChannels = useCallback(async () => {
    if (!currentServer) return;
    
    const { data, error } = await supabase
      .from("discord_channels")
      .select("*")
      .eq("server_id", currentServer.id)
      .order("position", { ascending: true });
    
    if (error) {
      console.error("Error fetching channels:", error);
      return;
    }
    
    setChannels((data as DiscordChannel[]) || []);
  }, [currentServer]);

  // Fetch members for current server
  const fetchMembers = useCallback(async () => {
    if (!currentServer) return;
    
    const { data, error } = await supabase
      .from("discord_server_members")
      .select("*")
      .eq("server_id", currentServer.id);
    
    if (error) {
      console.error("Error fetching members:", error);
      return;
    }
    
    // Fetch profiles using server member function (not friends-only)
    if (data && data.length > 0) {
      const userIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase
        .rpc('get_server_member_profiles', { member_user_ids: userIds });
      
      const membersWithProfiles = data.map(m => ({
        ...m,
        profile: profiles?.find((p: any) => p.user_id === m.user_id) || undefined
      }));
      
      setMembers(membersWithProfiles);
    } else {
      setMembers([]);
    }
  }, [currentServer]);

  // Fetch messages for current text channel
  const fetchMessages = useCallback(async () => {
    if (!currentChannel || currentChannel.type !== "text") return;
    
    const { data, error } = await supabase
      .from("discord_messages")
      .select("*")
      .eq("channel_id", currentChannel.id)
      .order("created_at", { ascending: true })
      .limit(100);
    
    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }
    
    // Fetch profiles for messages
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .rpc('get_server_member_profiles', { member_user_ids: userIds });
      
      const messagesWithProfiles = data.map(m => ({
        ...m,
        profile: profiles?.find((p: any) => p.user_id === m.user_id) || undefined
      }));
      
      setMessages(messagesWithProfiles);
    } else {
      setMessages([]);
    }
  }, [currentChannel]);

  // Fetch voice participants for current voice channel
  const fetchVoiceParticipants = useCallback(async () => {
    if (!currentChannel || currentChannel.type !== "voice") return;
    
    const { data, error } = await supabase
      .from("discord_voice_participants")
      .select("*")
      .eq("channel_id", currentChannel.id);
    
    if (error) {
      console.error("Error fetching voice participants:", error);
      return;
    }
    
    if (data && data.length > 0) {
      const userIds = data.map(p => p.user_id);
      const { data: profiles } = await supabase
        .rpc('get_server_member_profiles', { member_user_ids: userIds });
      
      const participantsWithProfiles = data.map(p => ({
        ...p,
        profile: profiles?.find((pr: any) => pr.user_id === p.user_id) || undefined
      }));
      
      setVoiceParticipants(participantsWithProfiles as DiscordVoiceParticipant[]);
    } else {
      setVoiceParticipants([]);
    }
  }, [currentChannel]);

  // Create a new server
  const createServer = async (name: string) => {
    if (!user) return null;
    setLoading(true);
    
    try {
      // Create server
      const { data: server, error: serverError } = await supabase
        .from("discord_servers")
        .insert({ name, owner_id: user.id })
        .select()
        .single();
      
      if (serverError) throw serverError;
      
      // Add owner as member
      await supabase
        .from("discord_server_members")
        .insert({ 
          server_id: server.id, 
          user_id: user.id, 
          role: "owner" 
        });
      
      // Create default channels
      await supabase
        .from("discord_channels")
        .insert([
          { server_id: server.id, name: "general", type: "text", position: 0 },
          { server_id: server.id, name: "General", type: "voice", position: 1 },
        ]);
      
      toast({ title: "Servidor creado", description: `${name} está listo` });
      await fetchServers();
      return server;
    } catch (error) {
      console.error("Error creating server:", error);
      toast({ title: "Error", description: "No se pudo crear el servidor", variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create a channel
  const createChannel = async (name: string, type: "text" | "voice") => {
    if (!user || !currentServer) return null;
    
    try {
      const { data, error } = await supabase
        .from("discord_channels")
        .insert({ 
          server_id: currentServer.id, 
          name, 
          type,
          position: channels.length 
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast({ title: "Canal creado", description: `#${name}` });
      await fetchChannels();
      return data;
    } catch (error) {
      console.error("Error creating channel:", error);
      toast({ title: "Error", description: "No se pudo crear el canal", variant: "destructive" });
      return null;
    }
  };

  // Delete a channel
  const deleteChannel = async (channelId: string) => {
    try {
      const { error } = await supabase
        .from("discord_channels")
        .delete()
        .eq("id", channelId);
      
      if (error) throw error;
      
      if (currentChannel?.id === channelId) {
        setCurrentChannel(null);
      }
      await fetchChannels();
    } catch (error) {
      console.error("Error deleting channel:", error);
      toast({ title: "Error", description: "No se pudo eliminar el canal", variant: "destructive" });
    }
  };

  // Send a message
  const sendMessage = async (content: string) => {
    if (!user || !currentChannel || currentChannel.type !== "text") return;
    
    try {
      await supabase
        .from("discord_messages")
        .insert({ 
          channel_id: currentChannel.id, 
          user_id: user.id, 
          content 
        });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Invite user to server
  const inviteUser = async (userId: string) => {
    if (!currentServer) return;
    
    try {
      const { error } = await supabase
        .from("discord_server_members")
        .insert({ 
          server_id: currentServer.id, 
          user_id: userId, 
          role: "member" 
        });
      
      if (error) throw error;
      
      toast({ title: "Usuario invitado", description: "Se unirá al servidor" });
      await fetchMembers();
    } catch (error) {
      console.error("Error inviting user:", error);
      toast({ title: "Error", description: "No se pudo invitar al usuario", variant: "destructive" });
    }
  };

  // Voice activity detection
  const setupVoiceActivityDetection = useCallback((stream: MediaStream) => {
    try {
      audioContext.current = new AudioContext();
      const source = audioContext.current.createMediaStreamSource(stream);
      const analyser = audioContext.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkAudio = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const speaking = average > 30;
        
        if (speaking !== isSpeaking) {
          setIsSpeaking(speaking);
          // Update in database
          if (currentChannel && user) {
            supabase
              .from("discord_voice_participants")
              .update({ is_speaking: speaking })
              .eq("channel_id", currentChannel.id)
              .eq("user_id", user.id)
              .then(() => {});
          }
        }
        
        requestAnimationFrame(checkAudio);
      };
      
      checkAudio();
    } catch (error) {
      console.error("Error setting up VAD:", error);
    }
  }, [currentChannel, user, isSpeaking]);

  // Join voice channel
  const joinVoiceChannel = async (channel: DiscordChannel) => {
    if (!user || channel.type !== "voice") return;

    console.log("[Discord][Diag] joinVoiceChannel start", {
      channelId: channel.id,
      userId: user.id,
      ua: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    });

    try {
      // Helpful permissions snapshot (Chrome supports these names)
      try {
        const micPerm = await (navigator as any).permissions?.query?.({ name: "microphone" });
        const camPerm = await (navigator as any).permissions?.query?.({ name: "camera" });
        console.log("[Discord][Diag] permissions", {
          microphone: micPerm?.state,
          camera: camPerm?.state,
        });
      } catch (e) {
        console.log("[Discord][Diag] permissions query not available", e);
      }

      // Enumerate devices (labels might be empty until permissions granted)
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log("[Discord][Diag] devices", devices.map((d) => ({ kind: d.kind, label: d.label, deviceId: d.deviceId })));
      } catch (e) {
        console.log("[Discord][Diag] enumerateDevices failed", e);
      }

      // Get media (audio only at join)
      let stream: MediaStream | null = null;
      try {
        console.log("[Discord][Diag] requesting audio stream (with constraints)");
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: false,
        });
      } catch (e) {
        console.warn("[Discord][Diag] getUserMedia (constraints) failed, retrying basic audio", e);
        // Fallback: simpler constraints, more compatible
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }

      console.log("[Discord][Diag] got local stream", {
        audioTracks: stream.getAudioTracks().map((t) => ({
          id: t.id,
          enabled: t.enabled,
          muted: (t as any).muted,
          readyState: t.readyState,
          label: t.label,
        })),
      });

      setLocalStream(stream);
      localStreamRef.current = stream; // Store in ref for signaling handlers
      setIsAudioEnabled(true);
      setIsVideoEnabled(false);

      // Setup voice activity detection
      setupVoiceActivityDetection(stream);

      // Get existing participants BEFORE inserting ourselves
      const { data: existingParticipants } = await supabase
        .from("discord_voice_participants")
        .select("user_id")
        .eq("channel_id", channel.id)
        .neq("user_id", user.id);

      console.log("[Discord][Diag] Existing participants:", existingParticipants?.length || 0);

      // Add to participants
      const { error: insertError } = await supabase
        .from("discord_voice_participants")
        .insert({
          channel_id: channel.id,
          user_id: user.id,
          is_muted: false,
          is_camera_on: false,
        });

      if (insertError) {
        console.error("[Discord][Diag] insert voice participant failed", insertError);
        throw insertError;
      }

      setCurrentChannel(channel);
      setInVoiceChannel(true);

      // Setup signaling channel
      await setupSignaling(channel.id, stream);

      // Wait for signaling channel to be fully subscribed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create offers to all existing participants
      if (existingParticipants && existingParticipants.length > 0) {
        console.log("[Discord][Diag] Creating offers to existing participants");
        for (const participant of existingParticipants) {
          // Deterministic initiator: only one side creates the offer
          if (user.id.localeCompare(participant.user_id) < 0) {
            console.log("[Discord][Diag] Creating offer to:", participant.user_id);
            await createOffer(participant.user_id, stream);
          } else {
            console.log("[Discord][Diag] Waiting for offer from:", participant.user_id);
          }
        }
      }
    } catch (error: any) {
      console.error("[Discord][Diag] Error joining voice channel:", error);
      const name = error?.name || "Error";
      const message = error?.message || "Desconocido";

      toast({
        title: "No se pudo unir al canal de voz",
        description: `${name}: ${message}`,
        variant: "destructive",
      });

      // If we partially created something, clean up local resources
      try {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      localStreamRef.current = null;
      setLocalStream(null);
      setInVoiceChannel(false);
    }
  };

  // Leave voice channel
  const leaveVoiceChannel = async () => {
    if (!user || !currentChannel) return;

    console.log("[Discord][Diag] leaveVoiceChannel", { channelId: currentChannel.id, userId: user.id });

    // Cleanup
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStream?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());

    localStreamRef.current = null;
    screenStreamRef.current = null;

    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    negotiationStateRef.current.clear();
    videoTransceiversRef.current.clear();

    if (signalingChannel.current) {
      await supabase.removeChannel(signalingChannel.current);
      signalingChannel.current = null;
    }

    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
      analyserRef.current = null;
    }

    // Remove from database
    await supabase
      .from("discord_voice_participants")
      .delete()
      .eq("channel_id", currentChannel.id)
      .eq("user_id", user.id);

    setLocalStream(null);
    setRemoteStreams(new Map());
    setInVoiceChannel(false);
    setIsScreenSharing(false);
    setIsSpeaking(false);
  };

  // Setup WebRTC signaling
  const setupSignaling = async (channelId: string, stream: MediaStream) => {
    if (!user) return;
    
    // Clean up existing channel first
    if (signalingChannel.current) {
      await supabase.removeChannel(signalingChannel.current);
      signalingChannel.current = null;
    }
    
    const channel = supabase.channel(`voice:${channelId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: user.id },
      },
    });
    
    channel
      .on("broadcast", { event: "signal" }, async ({ payload }) => {
        const { type, from, to, data } = payload;
        if (to && to !== user.id) return;
        
        // Use ref to get current stream (important for closures)
        const currentStream = localStreamRef.current;
        if (!currentStream) {
          console.warn("[Discord] No local stream available for signaling");
          return;
        }
        
        console.log("[Discord] Received signal:", type, "from:", from);
        
        if (type === "offer") {
          await handleOffer(from, data, currentStream);
        } else if (type === "answer") {
          await handleAnswer(from, data);
        } else if (type === "ice-candidate") {
          await handleIceCandidate(from, data);
        }
      })
      .on("presence", { event: "join" }, async ({ key }) => {
        console.log("[Discord] User joined presence:", key);
        if (key !== user.id && localStreamRef.current) {
          // Deterministic initiator: only one side creates the offer
          if (user.id.localeCompare(key) < 0) {
            console.log("[Discord] Creating offer to new user:", key);
            await createOffer(key, localStreamRef.current);
          } else {
            console.log("[Discord] Waiting for offer from new user:", key);
          }
        }
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        console.log("[Discord] User left:", key);
        const pc = peerConnections.current.get(key);
        if (pc) {
          pc.close();
          peerConnections.current.delete(key);
          setRemoteStreams(prev => {
            const updated = new Map(prev);
            updated.delete(key);
            return updated;
          });
        }
      })
      .subscribe(async (status) => {
        console.log("[Discord] Signaling channel status:", status);
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user.id });
        }
      });
    
    signalingChannel.current = channel;
  };

  // WebRTC handlers
  const videoTransceiversRef = useRef<Map<string, RTCRtpTransceiver>>(new Map());

  const createPeerConnection = (peerId: string, stream: MediaStream) => {
    // Check if connection already exists
    const existingPc = peerConnections.current.get(peerId);
    if (existingPc) {
      console.log("[Discord] Closing existing connection to:", peerId);
      existingPc.close();
      peerConnections.current.delete(peerId);
      videoTransceiversRef.current.delete(peerId);
    }

    console.log("[Discord] Creating peer connection to:", peerId);
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Ensure state exists early
    getNegotiationState(peerId);

    /*
      IMPORTANT:
      Creamos transceivers de audio+video desde el inicio para evitar renegociaciones
      cuando el usuario activa la cámara más tarde.

      Si solo agregamos `addTrack(video)` después de que la conexión ya esté estable,
      muchos navegadores requieren un nuevo offer/answer, y el video nunca llega.
    */
    const audioTransceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
    const videoTransceiver = pc.addTransceiver("video", { direction: "sendrecv" });
    videoTransceiversRef.current.set(peerId, videoTransceiver);

    // Attach current local tracks
    const audioTrack = stream.getAudioTracks()[0] ?? null;
    const videoTrack = stream.getVideoTracks()[0] ?? null;

    if (audioTrack) {
      console.log("[Discord] Attaching audio track to peer:", peerId);
      audioTransceiver.sender.replaceTrack(audioTrack);
    }

    if (videoTrack) {
      console.log("[Discord] Attaching video track to peer:", peerId);
      videoTransceiver.sender.replaceTrack(videoTrack);
    }

    pc.ontrack = (event) => {
      console.log("[Discord] Received track from:", peerId, event.track.kind);
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.set(peerId, remoteStream);
          return updated;
        });
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && signalingChannel.current) {
        console.log("[Discord] Sending ICE candidate to:", peerId);
        signalingChannel.current.send({
          type: "broadcast",
          event: "signal",
          payload: {
            type: "ice-candidate",
            from: user?.id,
            to: peerId,
            data: event.candidate,
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[Discord] Connection state with", peerId, ":", pc.connectionState);
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        // Clean up failed connection
        peerConnections.current.delete(peerId);
        videoTransceiversRef.current.delete(peerId);
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.delete(peerId);
          return updated;
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[Discord] ICE connection state with", peerId, ":", pc.iceConnectionState);
    };

    peerConnections.current.set(peerId, pc);
    return pc;
  };

  const createOffer = async (peerId: string, stream: MediaStream) => {
    const pc = createPeerConnection(peerId, stream);

    const n = getNegotiationState(peerId);
    
    try {
      n.makingOffer = true;
      await pc.setLocalDescription(await pc.createOffer());
      const offer = pc.localDescription;
      if (!offer) throw new Error("No localDescription after createOffer");
      
      signalingChannel.current?.send({
        type: "broadcast",
        event: "signal",
        payload: {
          type: "offer",
          from: user?.id,
          to: peerId,
          data: offer,
        },
      });
    } catch (error) {
      console.error("Error creating offer:", error);
    } finally {
      n.makingOffer = false;
    }
  };

  const handleOffer = async (fromId: string, offer: RTCSessionDescriptionInit, stream: MediaStream) => {
    let pc = peerConnections.current.get(fromId);
    if (!pc) {
      pc = createPeerConnection(fromId, stream);
    }

    const n = getNegotiationState(fromId);
    
    try {
      const offerCollision = n.makingOffer || pc.signalingState !== "stable";
      n.ignoreOffer = !n.polite && offerCollision;

      if (n.ignoreOffer) {
        console.warn("[Discord] Ignoring offer due to collision from:", fromId);
        return;
      }

      if (offerCollision) {
        // Polite peer: rollback its local description and accept the offer
        console.log("[Discord] Offer collision; rolling back (polite) with:", fromId);
        // TS lib types don't include rollback in all configs
        await pc.setLocalDescription({ type: "rollback" } as any);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      signalingChannel.current?.send({
        type: "broadcast",
        event: "signal",
        payload: {
          type: "answer",
          from: user?.id,
          to: fromId,
          data: answer,
        },
      });
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  };

  const handleAnswer = async (fromId: string, answer: RTCSessionDescriptionInit) => {
    const pc = peerConnections.current.get(fromId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleIceCandidate = async (fromId: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(fromId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  // Toggle audio
  const toggleAudio = async () => {
   const stream = localStreamRef.current;
   if (stream) {
     const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        
        if (currentChannel && user) {
          await supabase
            .from("discord_voice_participants")
            .update({ is_muted: !audioTrack.enabled })
            .eq("channel_id", currentChannel.id)
            .eq("user_id", user.id);
        }
      }
   } else {
     console.error("[Discord] No local stream for audio toggle");
    }
  };

  // Toggle video
  const toggleVideo = async () => {
   if (!user || !currentChannel) return;
   
   const stream = localStreamRef.current;
   if (!stream) {
     console.error("[Discord] No local stream available for video toggle");
     return;
   }
    
    if (isVideoEnabled) {
      // Turn off video
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        stream.removeTrack(videoTrack);
      }

      // Remove video from all peer connections without renegotiation
      peerConnections.current.forEach((pc, peerId) => {
        const transceiver = videoTransceiversRef.current.get(peerId);
        const sender = transceiver?.sender ?? pc.getSenders().find((s) => s.track?.kind === "video") ?? null;
        sender?.replaceTrack(null);
      });

      // Force React re-render with new MediaStream reference
      const updatedStream = new MediaStream(stream.getTracks());
      localStreamRef.current = updatedStream;
      setLocalStream(updatedStream);
      setIsVideoEnabled(false);

      // Update database immediately
      await supabase
        .from("discord_voice_participants")
        .update({ is_camera_on: false })
        .eq("channel_id", currentChannel.id)
        .eq("user_id", user.id);
    } else {
      // Turn on video
      try {
        console.log("[Discord] Requesting video...");
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });
        const videoTrack = videoStream.getVideoTracks()[0];

        // Add locally so local tile can render
        stream.addTrack(videoTrack);
        // Force React re-render with new MediaStream reference (same object won't trigger update)
        const updatedStream = new MediaStream(stream.getTracks());
        localStreamRef.current = updatedStream;
        setLocalStream(updatedStream);

        // Replace on all peer connections using the pre-created video transceiver
        peerConnections.current.forEach((pc, peerId) => {
          const transceiver = videoTransceiversRef.current.get(peerId);
          const sender = transceiver?.sender ?? pc.getSenders().find((s) => s.track?.kind === "video") ?? null;

          if (sender) {
            sender.replaceTrack(videoTrack);
          } else {
            // Extremely rare fallback; should not happen due to transceiver creation
            pc.addTransceiver("video", { direction: "sendrecv" }).sender.replaceTrack(videoTrack);
          }
        });

        setIsVideoEnabled(true);
        console.log("[Discord] Video enabled successfully");

        // Update database
        await supabase
          .from("discord_voice_participants")
          .update({ is_camera_on: true })
          .eq("channel_id", currentChannel.id)
          .eq("user_id", user.id);
      } catch (error) {
        console.error("Error enabling video:", error);
        toast({
          title: "Error de cámara",
          description: "No se pudo acceder a la cámara. Verificá los permisos del navegador.",
          variant: "destructive",
        });
      }
    }
  };

  // Start screen share
  const startScreenShare = async () => {
    if (!user || !currentChannel) return;
    
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      
      screenStreamRef.current = screenStream;
      
      // Replace video track in all connections
      const videoTrack = screenStream.getVideoTracks()[0];
      peerConnections.current.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(videoTrack);
        } else {
          pc.addTrack(videoTrack, localStream!);
        }
      });
      
      videoTrack.onended = () => {
        stopScreenShare();
      };
      
      setIsScreenSharing(true);
      
      await supabase
        .from("discord_voice_participants")
        .update({ is_screen_sharing: true })
        .eq("channel_id", currentChannel.id)
        .eq("user_id", user.id);
        
    } catch (error) {
      console.error("Error starting screen share:", error);
    }
  };

  // Stop screen share
  const stopScreenShare = async () => {
    if (!user || !currentChannel) return;
    
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);
    
    await supabase
      .from("discord_voice_participants")
      .update({ is_screen_sharing: false })
      .eq("channel_id", currentChannel.id)
      .eq("user_id", user.id);
  };

  // Effects
  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  useEffect(() => {
    if (currentServer) {
      fetchChannels();
      fetchMembers();
    }
  }, [currentServer, fetchChannels, fetchMembers]);

  useEffect(() => {
    if (currentChannel?.type === "text") {
      fetchMessages();
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`messages:${currentChannel.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "discord_messages",
            filter: `channel_id=eq.${currentChannel.id}`,
          },
          () => {
            fetchMessages();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentChannel, fetchMessages]);

  useEffect(() => {
    if (currentChannel?.type === "voice") {
      fetchVoiceParticipants();
      
      // Subscribe to voice participant changes
      const channel = supabase
        .channel(`voice-participants:${currentChannel.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "discord_voice_participants",
            filter: `channel_id=eq.${currentChannel.id}`,
          },
          (payload) => {
            fetchVoiceParticipants();
            
            // Update speaking users
            if (payload.eventType === "UPDATE") {
              const participant = payload.new as DiscordVoiceParticipant;
              setSpeakingUsers(prev => {
                const updated = new Set(prev);
                if (participant.is_speaking) {
                  updated.add(participant.user_id);
                } else {
                  updated.delete(participant.user_id);
                }
                return updated;
              });
            }
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentChannel, fetchVoiceParticipants]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach(track => track.stop());
      peerConnections.current.forEach(pc => pc.close());
      if (signalingChannel.current) {
        supabase.removeChannel(signalingChannel.current);
      }
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, []);

  return {
    // Server state
    servers,
    currentServer,
    members,
    channels,
    setCurrentServer,
    
    // Channel state
    currentChannel,
    setCurrentChannel,
    messages,
    voiceParticipants,
    
    // Voice state
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isSpeaking,
    speakingUsers,
    inVoiceChannel,
    
    // Actions
    createServer,
    createChannel,
    deleteChannel,
    sendMessage,
    inviteUser,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    fetchServers,
    
    loading,
  };
}

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
    
    try {
      // Get media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      
      setLocalStream(stream);
      setIsAudioEnabled(true);
      setIsVideoEnabled(false);
      
      // Setup voice activity detection
      setupVoiceActivityDetection(stream);
      
      // Add to participants
      await supabase
        .from("discord_voice_participants")
        .insert({
          channel_id: channel.id,
          user_id: user.id,
          is_muted: false,
          is_camera_on: false,
        });
      
      setCurrentChannel(channel);
      setInVoiceChannel(true);
      
      // Setup signaling
      await setupSignaling(channel.id, stream);
      
    } catch (error) {
      console.error("Error joining voice channel:", error);
      toast({ title: "Error", description: "No se pudo unir al canal de voz", variant: "destructive" });
    }
  };

  // Leave voice channel
  const leaveVoiceChannel = async () => {
    if (!user || !currentChannel) return;
    
    // Cleanup
    localStream?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    
    if (signalingChannel.current) {
      await supabase.removeChannel(signalingChannel.current);
    }
    
    if (audioContext.current) {
      audioContext.current.close();
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
        
        if (type === "offer") {
          await handleOffer(from, data, stream);
        } else if (type === "answer") {
          await handleAnswer(from, data);
        } else if (type === "ice-candidate") {
          await handleIceCandidate(from, data);
        }
      })
      .on("presence", { event: "join" }, async ({ key }) => {
        if (key !== user.id) {
          await createOffer(key, stream);
        }
      })
      .on("presence", { event: "leave" }, ({ key }) => {
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
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user.id });
        }
      });
    
    signalingChannel.current = channel;
  };

  // WebRTC handlers
  const createPeerConnection = (peerId: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });
    
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => {
        const updated = new Map(prev);
        updated.set(peerId, remoteStream);
        return updated;
      });
    };
    
    pc.onicecandidate = (event) => {
      if (event.candidate && signalingChannel.current) {
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
    
    peerConnections.current.set(peerId, pc);
    return pc;
  };

  const createOffer = async (peerId: string, stream: MediaStream) => {
    const pc = createPeerConnection(peerId, stream);
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
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
    }
  };

  const handleOffer = async (fromId: string, offer: RTCSessionDescriptionInit, stream: MediaStream) => {
    let pc = peerConnections.current.get(fromId);
    if (!pc) {
      pc = createPeerConnection(fromId, stream);
    }
    
    try {
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
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
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
    }
  };

  // Toggle video
  const toggleVideo = async () => {
    if (!localStream || !user || !currentChannel) return;
    
    if (isVideoEnabled) {
      // Turn off video
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        localStream.removeTrack(videoTrack);
      }
      setIsVideoEnabled(false);
    } else {
      // Turn on video
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });
        const videoTrack = videoStream.getVideoTracks()[0];
        localStream.addTrack(videoTrack);
        
        // Update all peer connections
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(videoTrack);
          } else {
            pc.addTrack(videoTrack, localStream);
          }
        });
        
        setIsVideoEnabled(true);
      } catch (error) {
        console.error("Error enabling video:", error);
      }
    }
    
    await supabase
      .from("discord_voice_participants")
      .update({ is_camera_on: !isVideoEnabled })
      .eq("channel_id", currentChannel.id)
      .eq("user_id", user.id);
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

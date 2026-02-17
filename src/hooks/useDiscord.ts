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
    { urls: "stun:stun2.l.google.com:19302" },
    // Free OpenRelay TURN servers for testing
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
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
  const [currentChannel, setInternalCurrentChannel] = useState<DiscordChannel | null>(null);
  const [messages, setMessages] = useState<DiscordMessage[]>([]);
  const [voiceParticipants, setVoiceParticipants] = useState<DiscordVoiceParticipant[]>([]);

  // WebRTC state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map()); // userId -> displayName
  const [allVoiceParticipants, setAllVoiceParticipants] = useState<DiscordVoiceParticipant[]>([]); // All channels in server

  const [loading, setLoading] = useState(false);
  const [inVoiceChannel, setInVoiceChannel] = useState(false);

  // Refs
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const signalingChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null); // Keep reference for signaling handlers
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  // Buffer for ICE candidates that arrive before remote description
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const typingChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
  const [peerStates, setPeerStates] = useState<Map<string, string>>(new Map());

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

  // Fetch user's servers (only those where they are a member)
  const fetchServers = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // First get the server IDs where the user is a member
      const { data: memberRows, error: memberError } = await supabase
        .from("discord_server_members")
        .select("server_id")
        .eq("user_id", user.id);

      if (memberError) {
        console.error("Error fetching server memberships:", memberError);
        return;
      }

      if (!memberRows || memberRows.length === 0) {
        setServers([]);
        return;
      }

      const serverIds = memberRows.map(m => m.server_id);

      const { data, error } = await supabase
        .from("discord_servers")
        .select("*")
        .in("id", serverIds)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching servers:", error);
        return;
      }

      setServers(data || []);
    } finally {
      setLoading(false);
    }
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

  // Fetch ALL voice participants for the entire server (for sidebar display)
  const fetchAllVoiceParticipants = useCallback(async () => {
    if (!currentServer) return;

    // Get all channel IDs for this server
    const { data: serverChannels } = await supabase
      .from("discord_channels")
      .select("id")
      .eq("server_id", currentServer.id)
      .eq("type", "voice");

    if (!serverChannels || serverChannels.length === 0) {
      setAllVoiceParticipants([]);
      return;
    }

    const channelIds = serverChannels.map(c => c.id);
    const { data, error } = await supabase
      .from("discord_voice_participants")
      .select("*")
      .in("channel_id", channelIds);

    if (error) {
      console.error("Error fetching all voice participants:", error);
      return;
    }

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .rpc('get_server_member_profiles', { member_user_ids: userIds });

      const participantsWithProfiles = data.map(p => ({
        ...p,
        profile: profiles?.find((pr: any) => pr.user_id === p.user_id) || undefined
      }));

      setAllVoiceParticipants(participantsWithProfiles as DiscordVoiceParticipant[]);
    } else {
      setAllVoiceParticipants([]);
    }
  }, [currentServer]);

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

  // Delete a server
  const deleteServer = async (serverId: string) => {
    if (!user) return;

    try {
      // First verify ownership
      const serverToDelete = servers.find(s => s.id === serverId);
      if (!serverToDelete) return;

      // In a real app with RLS, the DB would prevent non-owners from deleting
      // But we can check locally too for better UX
      // (assuming created_by or owner_id field exists - based on createServer it's owner_id)

      const { error } = await supabase
        .from("discord_servers")
        .delete()
        .eq("id", serverId);

      if (error) throw error;

      toast({ title: "Servidor eliminado", description: "El servidor ha sido eliminado permanentemente" });

      // If current server was deleted, clear selection
      if (currentServer?.id === serverId) {
        setCurrentServer(null);
        setInternalCurrentChannel(null);
      }

      await fetchServers();
    } catch (error) {
      console.error("Error deleting server:", error);
      toast({ title: "Error", description: "No se pudo eliminar el servidor", variant: "destructive" });
    }
  };

  // Leave a server
  const leaveServer = async (serverId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("discord_server_members")
        .delete()
        .eq("server_id", serverId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({ title: "Has salido del servidor" });

      if (currentServer?.id === serverId) {
        setCurrentServer(null);
        setInternalCurrentChannel(null);
      }

      await fetchServers();
    } catch (error) {
      console.error("Error leaving server:", error);
      toast({ title: "Error", description: "No se pudo salir del servidor", variant: "destructive" });
    }
  };

  // Create a server invite code
  const createInvite = async (): Promise<string | null> => {
    if (!user || !currentServer) return null;

    try {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const { error } = await supabase
        .from("discord_server_invites")
        .insert({
          server_id: currentServer.id,
          code,
          created_by: user.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });

      if (error) throw error;
      toast({ title: "Invitación creada", description: `Código: ${code}` });
      return code;
    } catch (error) {
      console.error("Error creating invite:", error);
      toast({ title: "Error", description: "No se pudo crear la invitación", variant: "destructive" });
      return null;
    }
  };

  // Join a server by invite code
  const joinServerByCode = async (code: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Look up the invite
      const { data: invite, error: inviteError } = await supabase
        .from("discord_server_invites")
        .select("*")
        .eq("code", code.toUpperCase().trim())
        .single();

      if (inviteError || !invite) {
        toast({ title: "Error", description: "Código de invitación inválido o expirado", variant: "destructive" });
        return false;
      }

      // Check if expired
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        toast({ title: "Error", description: "Esta invitación ha expirado", variant: "destructive" });
        return false;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from("discord_server_members")
        .select("id")
        .eq("server_id", invite.server_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        toast({ title: "Ya eres miembro", description: "Ya perteneces a este servidor" });
        await fetchServers();
        return true;
      }

      // Join
      const { error: joinError } = await supabase
        .from("discord_server_members")
        .insert({ server_id: invite.server_id, user_id: user.id, role: "member" });

      if (joinError) throw joinError;

      // Increment uses
      await supabase
        .from("discord_server_invites")
        .update({ uses: (invite.uses || 0) + 1 })
        .eq("id", invite.id);

      toast({ title: "¡Te uniste al servidor!", description: "Bienvenido al servidor" });
      await fetchServers();
      return true;
    } catch (error) {
      console.error("Error joining server:", error);
      toast({ title: "Error", description: "No se pudo unir al servidor", variant: "destructive" });
      return false;
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
        if (currentChannel.type === 'voice') {
          await leaveVoiceChannel();
        }
        setInternalCurrentChannel(null);
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
  // Use a ref to track speaking state without re-triggering effect
  const isSpeakingRef = useRef(false);

  const setupVoiceActivityDetection = useCallback((stream: MediaStream) => {
    try {
      if (audioContext.current) {
        try { audioContext.current.close(); } catch { }
      }

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContext.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkAudio = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const speaking = average > 15; // More sensitive threshold

        if (speaking !== isSpeakingRef.current) {
          isSpeakingRef.current = speaking;
          setIsSpeaking(speaking);

          // Update in database
          if (currentChannel && user) {
            supabase
              .from("discord_voice_participants")
              .update({ is_speaking: speaking })
              .eq("channel_id", currentChannel.id)
              .eq("user_id", user.id)
              .then(() => { });
          }
        }

        requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch (error) {
      console.error("Error setting up VAD:", error);
    }
  }, [currentChannel, user]);

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

      // Clean up any stale voice participant records from previous sessions
      // (handles crashes, tab closures, navigating away without disconnecting)
      await supabase
        .from("discord_voice_participants")
        .delete()
        .eq("user_id", user.id);

      // Add to participants (now safe - no duplicate key possible)
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

      setInternalCurrentChannel(channel);
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
      } catch { }
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
    pendingCandidatesRef.current.clear();

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
    */
    const audioTransceiver = pc.addTransceiver("audio", {
      direction: "sendrecv",
      streams: [stream]
    });
    const videoTransceiver = pc.addTransceiver("video", {
      direction: "sendrecv",
      streams: [stream]
    });
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

      // Get the stream from event, or create a new one if missing
      const remoteStream = event.streams[0] || new MediaStream();

      // If the stream was created manually, we need to add the track
      if (!event.streams[0]) {
        remoteStream.addTrack(event.track);
      }

      // Force React update when tracks are added/removed from the stream
      remoteStream.onaddtrack = () => {
        console.log("[Discord] Stream track added for:", peerId);
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          // Clone stream to force React effect update
          updated.set(peerId, new MediaStream(remoteStream.getTracks()));
          return updated;
        });
      };

      remoteStream.onremovetrack = () => {
        console.log("[Discord] Stream track removed for:", peerId);
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.set(peerId, new MediaStream(remoteStream.getTracks()));
          return updated;
        });
      };

      setRemoteStreams((prev) => {
        const updated = new Map(prev);
        // Always create a NEW MediaStream to force React re-render
        // If we already have a stream, combine its tracks with the new one
        const existing = updated.get(peerId);
        let newTracks: MediaStreamTrack[] = [event.track];

        if (existing) {
          const existingTracks = existing.getTracks().filter(t => t.id !== event.track.id);
          newTracks = [...existingTracks, ...newTracks];
        } else if (remoteStream) {
          // If we don't have an existing map entry but have remoteStream from event
          const rsTracks = remoteStream.getTracks().filter(t => t.id !== event.track.id);
          newTracks = [...rsTracks, ...newTracks];
        }

        const newStream = new MediaStream(newTracks);
        console.log(`[Discord] Updated stream for ${peerId} with ${newTracks.length} tracks. Audio? ${newStream.getAudioTracks().length > 0}`);

        updated.set(peerId, newStream);
        return updated;
      });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && signalingChannel.current) {
        console.log("[Discord] Sending ICE candidate to:", peerId);
        signalingChannel.current.send({
          type: "broadcast",
          event: "signal",
          payload: {
            type: "candidate",
            from: user?.id,
            to: peerId,
            data: event.candidate,
          },
        });
      }
    };
  };

  pc.onconnectionstatechange = () => {
    console.log("[Discord] Connection state with", peerId, ":", pc.connectionState);
    if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
      // Attempt to recover from failed state if we are still connected to signaling
      if (pc.connectionState === "failed" && signalingChannel.current) {
        console.log("[Discord] Connection failed, attempting restart ICE for:", peerId);
        pc.restartIce();
      } else {
        // Clean up failed connection
        peerConnections.current.delete(peerId);
        videoTransceiversRef.current.delete(peerId);
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.delete(peerId);
          return updated;
        });
      }
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log(`[Discord] ICE connection state with ${peerId}:`, pc.iceConnectionState);
    setPeerStates(prev => {
      const updated = new Map(prev);
      updated.set(peerId, pc.iceConnectionState);
      return updated;
    });
  };

  pc.onicegatheringstatechange = () => {
    console.log(`[Discord] ICE gathering state with ${peerId}:`, pc.iceGatheringState);
  };

  pc.onsignalingstatechange = () => {
    console.log(`[Discord] Signaling state with ${peerId}:`, pc.signalingState);
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
  // Ensure we have current local tracks
  let currentLocalStream = stream;
  if (!currentLocalStream && localStreamRef.current) {
    currentLocalStream = localStreamRef.current;
  }

  let pc = peerConnections.current.get(fromId);
  if (!pc) {
    pc = createPeerConnection(fromId, currentLocalStream);
  } else if (currentLocalStream) {
    // Add missing tracks to existing PC
    const senders = pc.getSenders();
    currentLocalStream.getTracks().forEach(track => {
      if (!senders.find(s => s.track?.id === track.id)) {
        pc?.addTrack(track, currentLocalStream);
      }
    });
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

    // Process any pending candidates
    const pending = pendingCandidatesRef.current.get(fromId);
    if (pending) {
      console.log(`[Discord] Processing ${pending.length} buffered candidates for ${fromId}`);
      for (const candidate of pending) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding buffered candidate:", e);
        }
      }
      pendingCandidatesRef.current.delete(fromId);
    }

  } catch (error) {
    console.error("Error handling offer:", error);
  }
};

const handleAnswer = async (fromId: string, answer: RTCSessionDescriptionInit) => {
  const pc = peerConnections.current.get(fromId);
  if (pc) {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));

    // Process any pending candidates
    const pending = pendingCandidatesRef.current.get(fromId);
    if (pending) {
      console.log(`[Discord] Processing ${pending.length} buffered candidates for ${fromId}`);
      for (const candidate of pending) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding buffered candidate:", e);
        }
      }
      pendingCandidatesRef.current.delete(fromId);
    }
  }
};

const handleIceCandidate = async (fromId: string, candidate: RTCIceCandidateInit) => {
  const pc = peerConnections.current.get(fromId);
  if (!pc) return;

  if (!pc.remoteDescription) {
    // Remote description not set yet, buffer candidate
    console.log(`[Discord] Buffering ICE candidate for ${fromId} (no remote description)`);
    const current = pendingCandidatesRef.current.get(fromId) || [];
    current.push(candidate);
    pendingCandidatesRef.current.set(fromId, current);
  } else {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error("Error adding ICE candidate:", e);
    }
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
    // === TURN OFF VIDEO ===
    // 1. Update React state FIRST (instant UI update for local tile)
    setIsVideoEnabled(false);

    // 2. Stop and remove video track
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.stop();
      stream.removeTrack(videoTrack);
    }

    // 3. Remove video from all peer connections without renegotiation
    peerConnections.current.forEach((pc, peerId) => {
      const transceiver = videoTransceiversRef.current.get(peerId);
      const sender = transceiver?.sender ?? pc.getSenders().find((s) => s.track?.kind === "video") ?? null;
      sender?.replaceTrack(null);
    });

    // 4. Force React re-render with new MediaStream reference
    const updatedStream = new MediaStream(stream.getTracks());
    localStreamRef.current = updatedStream;
    setLocalStream(updatedStream);

    // 5. Update database (async, no need to block UI)
    supabase
      .from("discord_voice_participants")
      .update({ is_camera_on: false })
      .eq("channel_id", currentChannel.id)
      .eq("user_id", user.id)
      .then(() => console.log("[Discord] DB: camera off"));
  } else {
    // === TURN ON VIDEO ===
    try {
      console.log("[Discord] Requesting video...");
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const videoTrack = videoStream.getVideoTracks()[0];
      console.log("[Discord] Got video track:", {
        id: videoTrack.id,
        label: videoTrack.label,
        readyState: videoTrack.readyState,
        enabled: videoTrack.enabled,
      });

      // 1. Add video track to the current stream
      stream.addTrack(videoTrack);

      // 2. Create a NEW MediaStream so React detects the change
      const updatedStream = new MediaStream(stream.getTracks());
      localStreamRef.current = updatedStream;

      // 3. Update React state FIRST so the local tile renders <video> immediately
      setIsVideoEnabled(true);
      setLocalStream(updatedStream);

      // 4. Send video to all peers via pre-created transceivers
      peerConnections.current.forEach((pc, peerId) => {
        const transceiver = videoTransceiversRef.current.get(peerId);
        const sender = transceiver?.sender ?? pc.getSenders().find((s) => s.track?.kind === "video") ?? null;

        if (sender) {
          sender.replaceTrack(videoTrack).then(() => {
            console.log("[Discord] Replaced video track for peer:", peerId);
          });
        } else {
          console.warn("[Discord] No video sender for peer:", peerId, "- adding transceiver");
          pc.addTransceiver("video", { direction: "sendrecv" }).sender.replaceTrack(videoTrack);
        }
      });

      console.log("[Discord] Video enabled successfully");

      // 5. Update database (async)
      supabase
        .from("discord_voice_participants")
        .update({ is_camera_on: true })
        .eq("channel_id", currentChannel.id)
        .eq("user_id", user.id)
        .then(() => console.log("[Discord] DB: camera on"));
    } catch (error: any) {
      console.error("[Discord] Error enabling video:", error);
      toast({
        title: "Error de cámara",
        description: `No se pudo acceder a la cámara: ${error?.name || "Error"} - ${error?.message || "desconocido"}`,
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

// Toggle deafen
const toggleDeafen = () => {
  const newDeafened = !isDeafened;
  setIsDeafened(newDeafened);

  // Mute/unmute all remote audio
  remoteStreams.forEach((stream) => {
    stream.getAudioTracks().forEach(track => {
      track.enabled = !newDeafened;
    });
  });

  // If deafening, also mute mic
  if (newDeafened && isAudioEnabled) {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = false;
        setIsAudioEnabled(false);
      }
    }
    if (currentChannel && user) {
      supabase
        .from("discord_voice_participants")
        .update({ is_muted: true })
        .eq("channel_id", currentChannel.id)
        .eq("user_id", user.id)
        .then(() => { });
    }
  }
};

// Typing indicator
const sendTypingIndicator = useCallback(() => {
  if (!currentChannel || currentChannel.type !== "text" || !user) return;

  typingChannel.current?.send({
    type: "broadcast",
    event: "typing",
    payload: {
      user_id: user.id,
      display_name: "Usuario",
    },
  });
}, [currentChannel, user]);

// Effects
useEffect(() => {
  fetchServers();
}, [fetchServers]);

useEffect(() => {
  if (currentServer) {
    fetchChannels();
    fetchMembers();
    fetchAllVoiceParticipants();

    // Subscribe to voice participant changes for ALL channels in server
    const allVoiceSub = supabase
      .channel(`all-voice:${currentServer.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "discord_voice_participants",
        },
        () => {
          fetchAllVoiceParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(allVoiceSub);
    };
  }
}, [currentServer, fetchChannels, fetchMembers, fetchAllVoiceParticipants]);

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

    // Setup typing indicator channel
    const tCh = supabase.channel(`typing:${currentChannel.id}`);
    tCh.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload.user_id === user?.id) return;
      const displayName = payload.display_name || "Alguien";
      setTypingUsers(prev => {
        const updated = new Map(prev);
        updated.set(payload.user_id, displayName);
        return updated;
      });
      // Clear after 3 seconds
      const existingTimeout = typingTimeouts.current.get(payload.user_id);
      if (existingTimeout) clearTimeout(existingTimeout);
      const timeout = setTimeout(() => {
        setTypingUsers(prev => {
          const updated = new Map(prev);
          updated.delete(payload.user_id);
          return updated;
        });
        typingTimeouts.current.delete(payload.user_id);
      }, 3000);
      typingTimeouts.current.set(payload.user_id, timeout);
    }).subscribe();
    typingChannel.current = tCh;

    return () => {
      supabase.removeChannel(channel);
      if (typingChannel.current) {
        supabase.removeChannel(typingChannel.current);
        typingChannel.current = null;
      }
      // Clear typing timeouts
      typingTimeouts.current.forEach(t => clearTimeout(t));
      typingTimeouts.current.clear();
      setTypingUsers(new Map());
    };
  }
}, [currentChannel, fetchMessages, user]);

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

// Cleanup on unmount AND on tab close / page unload
useEffect(() => {
  const cleanupVoice = () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStream?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    peerConnections.current.forEach(pc => pc.close());
    if (signalingChannel.current) {
      supabase.removeChannel(signalingChannel.current);
    }
    if (audioContext.current) {
      audioContext.current.close();
    }
  };

  // Use sendBeacon for reliable cleanup on tab close
  const handleBeforeUnload = () => {
    cleanupVoice();
    // Best-effort DB cleanup via sendBeacon (works during page unload)
    if (user) {
      const url = `${(supabase as any).supabaseUrl}/rest/v1/discord_voice_participants?user_id=eq.${user.id}`;
      const apiKey = (supabase as any).supabaseKey;
      if (url && apiKey) {
        // sendBeacon doesn't support DELETE, so we use fetch with keepalive
        try {
          fetch(url, {
            method: "DELETE",
            headers: {
              "apikey": apiKey,
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            keepalive: true,
          }).catch(() => { });
        } catch { }
      }
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
    cleanupVoice();
  };
}, [user]);

// Wrapper for setCurrentChannel to handle voice channel logic
const handleSetCurrentChannel = async (channel: DiscordChannel | null) => {
  // If clicking the same channel, do nothing
  if (currentChannel?.id === channel?.id) return;

  // Logic for Voice Channels
  const isLeavingVoice = inVoiceChannel && currentChannel?.type === 'voice';
  const isJoiningVoice = channel?.type === 'voice';

  if (isLeavingVoice) {
    await leaveVoiceChannel();
  }

  setInternalCurrentChannel(channel);

  if (isJoiningVoice && channel) {
    await joinVoiceChannel(channel);
  }
};

return {
  // Server state
  servers,
  currentServer,
  members,
  channels,
  setCurrentServer,

  // Channel state
  currentChannel,
  setCurrentChannel: handleSetCurrentChannel,
  messages,
  voiceParticipants,
  allVoiceParticipants,
  typingUsers,

  // Voice state
  localStream,
  remoteStreams,
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isDeafened,
  isSpeaking,
  speakingUsers,
  inVoiceChannel,
  peerStates,

  // Loading
  loading,

  // Actions
  createServer,
  deleteServer,
  leaveServer,
  createChannel,
  deleteChannel,
  sendMessage,
  sendTypingIndicator,
  inviteUser,
  joinVoiceChannel,
  leaveVoiceChannel,
  toggleAudio,
  toggleVideo,
  toggleDeafen,
  startScreenShare,
  stopScreenShare,
  fetchServers,
  createInvite,
  joinServerByCode,
};
}

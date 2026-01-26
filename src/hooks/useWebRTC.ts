import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export function useWebRTC(roomId: string | null) {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null); // What to show in local video tile
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected">("disconnected");

  const peerConnections = useRef<Map<string, PeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize local media stream
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
      // Try audio only if video fails
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

  // Create peer connection for a specific user
  const createPeerConnection = useCallback(
    (peerId: string, stream: MediaStream) => {
      if (!user) return null;

      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle incoming tracks
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.set(peerId, remoteStream);
          return updated;
        });
      };

      // Handle ICE candidates
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

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setConnectionState("connected");
        } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          // Remove peer
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

  // Create and send offer to a peer
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

  // Handle incoming offer
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

  // Handle incoming answer
  const handleAnswer = useCallback(async (fromId: string, answer: RTCSessionDescriptionInit) => {
    const pc = peerConnections.current.get(fromId)?.connection;
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  }, []);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (fromId: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(fromId)?.connection;
    if (!pc) return;

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }, []);

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

  // Toggle video - properly enable/disable without stopping tracks
  const toggleVideo = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const videoTracks = stream.getVideoTracks();
    
    if (isVideoEnabled) {
      // Disable video
      videoTracks.forEach((track) => {
        track.enabled = false;
      });
      setIsVideoEnabled(false);
    } else {
      // Enable video
      if (videoTracks.length > 0) {
        videoTracks.forEach((track) => {
          track.enabled = true;
        });
        setIsVideoEnabled(true);
      } else {
        // No video track exists, need to get new one
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" },
          });
          const newVideoTrack = newStream.getVideoTracks()[0];
          stream.addTrack(newVideoTrack);
          
          // Update peer connections with new track
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

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      setScreenStream(stream);
      setDisplayStream(stream); // Show screen share in local tile
      setIsScreenSharing(true);

      // Replace video track in all peer connections
      const videoTrack = stream.getVideoTracks()[0];
      peerConnections.current.forEach(({ connection }) => {
        const sender = connection.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Handle stream end
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      return true;
    } catch (error) {
      console.error("Error starting screen share:", error);
      return false;
    }
  }, []);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
    setIsScreenSharing(false);

    // Restore camera display and peer connections
    const stream = localStreamRef.current;
    if (stream) {
      setDisplayStream(stream); // Show camera in local tile again
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

  // Join room signaling channel
  const joinSignalingChannel = useCallback(
    async (stream: MediaStream) => {
      if (!roomId || !user) return;

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

          // Only process messages meant for us
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
          // New user joined, send them an offer
          if (key !== user.id) {
            createOffer(key, stream);
          }
        })
        .on("presence", { event: "leave" }, ({ key }) => {
          // User left, clean up their connection
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
    [roomId, user, createOffer, handleOffer, handleAnswer, handleIceCandidate]
  );

  // Leave signaling channel
  const leaveSignalingChannel = useCallback(() => {
    // Close all peer connections
    peerConnections.current.forEach(({ connection }) => {
      connection.close();
    });
    peerConnections.current.clear();

    // Leave channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    // Stop screen stream
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }

    setRemoteStreams(new Map());
    setConnectionState("disconnected");
    setIsScreenSharing(false);
  }, [localStream, screenStream]);

  // Cleanup on unmount - only when roomId becomes null
  useEffect(() => {
    return () => {
      // Only cleanup if explicitly leaving the room
      // The cleanup is handled by leaveSignalingChannel called from StudyRoom
    };
  }, []);

  return {
    localStream,
    displayStream, // Use this for local video tile
    screenStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    connectionState,
    initializeMedia,
    joinSignalingChannel,
    leaveSignalingChannel,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  };
}

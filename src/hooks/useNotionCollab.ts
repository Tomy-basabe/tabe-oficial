import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface CollabUser {
  user_id: string;
  name: string;
  avatar_url?: string | null;
  joined_at: number;
}

interface UseNotionCollabProps {
  documentId?: string;
  user: any;
  userProfile?: { nombre?: string | null; username?: string | null; avatar_url?: string | null } | null;
  onRemoteContentChange?: (content: any, senderId: string) => void;
  enabled?: boolean;
}

export function useNotionCollab({
  documentId,
  user,
  userProfile,
  onRemoteContentChange,
  enabled = true,
}: UseNotionCollabProps) {
  const [activeCollaborators, setActiveCollaborators] = useState<CollabUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastBroadcastTimeRef = useRef<number>(0);
  const pendingBroadcastRef = useRef<any>(null);
  const broadcastThrottleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to channel
  useEffect(() => {
    if (!enabled || !documentId || !user?.id) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
        setActiveCollaborators([]);
      }
      return;
    }

    const channelName = `notion_collab:${documentId}`;
    const userName = userProfile?.nombre || userProfile?.username || user.email?.split("@")[0] || "Compañero";
    const userAvatar = userProfile?.avatar_url || user.user_metadata?.avatar_url || null;

    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: user.id },
        broadcast: { ack: false, self: false },
      },
    });

    channelRef.current = channel;

    // 1. Presence: track who is viewing/editing
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: CollabUser[] = [];
        const seenIds = new Set<string>();

        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            const p = presences[presences.length - 1];
            if (!seenIds.has(p.user_id)) {
              seenIds.add(p.user_id);
              users.push({
                user_id: p.user_id,
                name: p.name || "Compañero",
                avatar_url: p.avatar_url || null,
                joined_at: p.joined_at || Date.now(),
              });
            }
          }
        });

        setActiveCollaborators(users);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        // Handled by sync
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        // Handled by sync
      });

    // 2. Broadcast: receive remote content changes with zero DB cost
    channel.on("broadcast", { event: "content_change" }, ({ payload }) => {
      if (payload && payload.senderId !== user.id && onRemoteContentChange) {
        onRemoteContentChange(payload.content, payload.senderId);
      }
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        await channel.track({
          user_id: user.id,
          name: userName,
          avatar_url: userAvatar,
          joined_at: Date.now(),
        });
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        setIsConnected(false);
      }
    });

    return () => {
      if (broadcastThrottleTimerRef.current) {
        clearTimeout(broadcastThrottleTimerRef.current);
      }
      if (channel) {
        channel.untrack().catch(() => {});
        supabase.removeChannel(channel);
      }
      channelRef.current = null;
      setIsConnected(false);
      setActiveCollaborators([]);
    };
  }, [documentId, user?.id, enabled, userProfile?.nombre, userProfile?.username, userProfile?.avatar_url, onRemoteContentChange]);

  // Transmit content changes to other active collaborators with intelligent throttle (600ms)
  const broadcastContent = useCallback((content: any) => {
    if (!channelRef.current || !isConnected || !user?.id) return;

    pendingBroadcastRef.current = content;
    const now = Date.now();
    const elapsed = now - lastBroadcastTimeRef.current;
    const THROTTLE_MS = 600;

    const doSend = () => {
      if (!channelRef.current || !pendingBroadcastRef.current) return;
      channelRef.current.send({
        type: "broadcast",
        event: "content_change",
        payload: {
          content: pendingBroadcastRef.current,
          senderId: user.id,
          timestamp: Date.now(),
        },
      });
      lastBroadcastTimeRef.current = Date.now();
      pendingBroadcastRef.current = null;
    };

    if (elapsed >= THROTTLE_MS) {
      if (broadcastThrottleTimerRef.current) {
        clearTimeout(broadcastThrottleTimerRef.current);
        broadcastThrottleTimerRef.current = null;
      }
      doSend();
    } else {
      if (!broadcastThrottleTimerRef.current) {
        broadcastThrottleTimerRef.current = setTimeout(() => {
          broadcastThrottleTimerRef.current = null;
          doSend();
        }, THROTTLE_MS - elapsed);
      }
    }
  }, [isConnected, user?.id]);

  return {
    activeCollaborators,
    isConnected,
    broadcastContent,
  };
}

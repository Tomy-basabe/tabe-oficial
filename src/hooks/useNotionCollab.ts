import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface CollabUser {
  user_id: string;
  name: string;
  avatar_url?: string | null;
  color: string;
  isGuest?: boolean;
  currentPageId?: string;
  joined_at: number;
}

export interface RemoteCursor {
  userId: string;
  name: string;
  color: string;
  pos: number;
  pageId?: string;
  updatedAt: number;
}

export const COLLAB_COLORS = [
  "#FF2A85", // Rosa Neón
  "#00E5FF", // Cian Neón
  "#A6FF00", // Verde Lima
  "#FF9900", // Naranja
  "#9D00FF", // Púrpura
  "#00FF66", // Verde Brillante
  "#FF0055", // Rojo Carmesí
  "#3A86FF", // Azul Eléctrico
];

export function getCollabColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length];
}

export const getOrCreateGuestIdentity = () => {
  let guestId = "";
  let guestName = "";
  try {
    guestId = sessionStorage.getItem("tabe_collab_guest_id") || "";
    if (!guestId) {
      guestId = "guest_" + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem("tabe_collab_guest_id", guestId);
    }
    guestName = sessionStorage.getItem("tabe_collab_guest_name") || "";
    if (!guestName) {
      const animals = ["Zorro", "Panda", "Lobo", "Águila", "Koala", "Tigre", "Búho", "Delfín", "Halcón", "Lince"];
      const rand = animals[Math.floor(Math.random() * animals.length)];
      guestName = `Invitado ${rand}`;
      sessionStorage.setItem("tabe_collab_guest_name", guestName);
    }
  } catch {
    guestId = "guest_anon";
    guestName = "Invitado";
  }
  return { id: guestId, name: guestName };
};

interface UseNotionCollabProps {
  documentId?: string;
  currentPageId?: string;
  user?: any;
  userProfile?: { nombre?: string | null; username?: string | null; avatar_url?: string | null } | null;
  onRemoteContentChange?: (content: any, senderId: string, pageId?: string) => void;
  enabled?: boolean;
}

export function useNotionCollab({
  documentId,
  currentPageId,
  user,
  userProfile,
  onRemoteContentChange,
  enabled = true,
}: UseNotionCollabProps) {
  const [activeCollaborators, setActiveCollaborators] = useState<CollabUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastBroadcastTimeRef = useRef<number>(0);
  const pendingBroadcastRef = useRef<any>(null);
  const broadcastThrottleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cursorThrottleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCursorPosRef = useRef<number>(-1);

  // Determinar identidad activa (usuario logueado o invitado anónimo)
  const activeIdentity = useRef<{ id: string; name: string; avatarUrl: string | null; isGuest: boolean }>({
    id: "",
    name: "Invitado",
    avatarUrl: null,
    isGuest: true,
  });

  if (user?.id) {
    activeIdentity.current = {
      id: user.id,
      name: userProfile?.nombre || userProfile?.username || user.email?.split("@")[0] || "Compañero",
      avatarUrl: userProfile?.avatar_url || user.user_metadata?.avatar_url || null,
      isGuest: false,
    };
  } else {
    const guest = getOrCreateGuestIdentity();
    activeIdentity.current = {
      id: guest.id,
      name: guest.name,
      avatarUrl: null,
      isGuest: true,
    };
  }

  const currentUserId = activeIdentity.current.id;
  const currentUserName = activeIdentity.current.name;
  const currentUserColor = getCollabColor(currentUserId);

  // Subscribe to Realtime channel (scoped to root documentId so subpages stay in the same room)
  useEffect(() => {
    if (!enabled || !documentId || !currentUserId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
        setActiveCollaborators([]);
        setRemoteCursors({});
      }
      return;
    }

    const channelName = `notion_collab:${documentId}`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: currentUserId },
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
                color: p.color || getCollabColor(p.user_id),
                isGuest: Boolean(p.isGuest),
                currentPageId: p.currentPageId,
                joined_at: p.joined_at || Date.now(),
              });
            }
          }
        });

        setActiveCollaborators(users);
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        if (leftPresences && leftPresences.length > 0) {
          setRemoteCursors((prev) => {
            const next = { ...prev };
            leftPresences.forEach((lp: any) => {
              if (lp.user_id) delete next[lp.user_id];
            });
            return next;
          });
        }
      });

    // 2. Broadcast: receive remote content changes with zero DB cost
    channel.on("broadcast", { event: "content_change" }, ({ payload }) => {
      if (payload && payload.senderId !== currentUserId && onRemoteContentChange) {
        onRemoteContentChange(payload.content, payload.senderId, payload.pageId);
      }
    });

    // 3. Broadcast: receive remote cursor movements (Google Docs style)
    channel.on("broadcast", { event: "cursor_move" }, ({ payload }) => {
      if (payload && payload.userId && payload.userId !== currentUserId) {
        setRemoteCursors((prev) => ({
          ...prev,
          [payload.userId]: {
            userId: payload.userId,
            name: payload.name || "Compañero",
            color: payload.color || getCollabColor(payload.userId),
            pos: typeof payload.pos === "number" ? payload.pos : 0,
            pageId: payload.pageId,
            updatedAt: Date.now(),
          },
        }));
      }
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        await channel.track({
          user_id: currentUserId,
          name: currentUserName,
          avatar_url: activeIdentity.current.avatarUrl,
          color: currentUserColor,
          isGuest: activeIdentity.current.isGuest,
          currentPageId,
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
      if (cursorThrottleTimerRef.current) {
        clearTimeout(cursorThrottleTimerRef.current);
      }
      if (channel) {
        channel.untrack().catch(() => {});
        supabase.removeChannel(channel);
      }
      channelRef.current = null;
      setIsConnected(false);
      setActiveCollaborators([]);
      setRemoteCursors({});
    };
  }, [documentId, currentUserId, currentUserName, currentUserColor, enabled, onRemoteContentChange]);

  // Actualizar página activa en presence cuando el usuario cambia de subpágina sin desconectar la sala
  useEffect(() => {
    if (channelRef.current && isConnected) {
      channelRef.current.track({
        user_id: currentUserId,
        name: currentUserName,
        avatar_url: activeIdentity.current.avatarUrl,
        color: currentUserColor,
        isGuest: activeIdentity.current.isGuest,
        currentPageId,
        joined_at: Date.now(),
      }).catch(() => {});
    }
  }, [currentPageId, isConnected, currentUserId, currentUserName, currentUserColor]);

  // Transmit content changes to other active collaborators with intelligent throttle (600ms)
  const broadcastContent = useCallback(
    (content: any, pageId?: string) => {
      if (!channelRef.current || !isConnected || !currentUserId) return;

      pendingBroadcastRef.current = { content, pageId: pageId || currentPageId };
      const now = Date.now();
      const elapsed = now - lastBroadcastTimeRef.current;
      const THROTTLE_MS = 180;

      const doSend = () => {
        if (!channelRef.current || !pendingBroadcastRef.current) return;
        channelRef.current.send({
          type: "broadcast",
          event: "content_change",
          payload: {
            content: pendingBroadcastRef.current.content,
            pageId: pendingBroadcastRef.current.pageId,
            senderId: currentUserId,
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
    },
    [isConnected, currentUserId, currentPageId]
  );

  // Transmit live cursor position (Google Docs style) with 50ms throttle
  const broadcastCursor = useCallback(
    (pos: number, pageId?: string) => {
      if (!channelRef.current || !isConnected || !currentUserId || pos === lastCursorPosRef.current) return;
      lastCursorPosRef.current = pos;

      if (cursorThrottleTimerRef.current) return;

      cursorThrottleTimerRef.current = setTimeout(() => {
        cursorThrottleTimerRef.current = null;
        if (!channelRef.current || !isConnected) return;
        channelRef.current.send({
          type: "broadcast",
          event: "cursor_move",
          payload: {
            userId: currentUserId,
            name: currentUserName,
            color: currentUserColor,
            pos: lastCursorPosRef.current,
            pageId: pageId || currentPageId,
            timestamp: Date.now(),
          },
        });
      }, 50);
    },
    [isConnected, currentUserId, currentUserName, currentUserColor, currentPageId]
  );

  return {
    activeCollaborators,
    remoteCursors,
    isConnected,
    currentUser: {
      user_id: currentUserId,
      name: currentUserName,
      color: currentUserColor,
      avatar_url: activeIdentity.current.avatarUrl,
      isGuest: activeIdentity.current.isGuest,
      currentPageId,
      joined_at: Date.now(),
    },
    broadcastContent,
    broadcastCursor,
  };
}

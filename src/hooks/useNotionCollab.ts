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

export interface BlockDelta {
  index: number;
  node: any;
  op: "replace" | "insert" | "delete";
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

/**
 * Calcula los bloques modificados entre dos snapshots TipTap JSON para sincronización granular
 */
export function computeBlockDeltas(oldContent: any, newContent: any): BlockDelta[] {
  const oldBlocks = oldContent?.content || [];
  const newBlocks = newContent?.content || [];

  const deltas: BlockDelta[] = [];
  const maxLen = Math.max(oldBlocks.length, newBlocks.length);

  for (let i = 0; i < maxLen; i++) {
    const oldB = oldBlocks[i];
    const newB = newBlocks[i];

    if (oldB && !newB) {
      deltas.push({ index: i, node: null, op: "delete" });
    } else if (!oldB && newB) {
      deltas.push({ index: i, node: newB, op: "insert" });
    } else if (JSON.stringify(oldB) !== JSON.stringify(newB)) {
      deltas.push({ index: i, node: newB, op: "replace" });
    }
  }

  return deltas;
}

/**
 * Fusiona contenido remoto protegiendo el bloque que el usuario local esté editando en ese instante
 */
export function mergeCollaborativeContent(
  localContent: any,
  remoteContent: any,
  localEditingBlockIndex: number,
  isLocalUserActive: boolean
): any {
  if (!remoteContent?.content) return localContent;
  if (!localContent?.content || !isLocalUserActive || localEditingBlockIndex < 0) {
    return remoteContent;
  }

  const localBlocks = [...(localContent.content || [])];
  const remoteBlocks = [...(remoteContent.content || [])];

  const mergedBlocks = remoteBlocks.map((remoteNode, idx) => {
    // Si el usuario local está escribiendo en este bloque específico, preservar su trabajo local
    if (idx === localEditingBlockIndex && localBlocks[idx]) {
      return localBlocks[idx];
    }
    return remoteNode;
  });

  return {
    ...remoteContent,
    content: mergedBlocks,
  };
}

interface UseNotionCollabProps {
  documentId?: string; // ID dinámico de la página o subpágina activa
  currentPageId?: string;
  user?: any;
  userProfile?: { nombre?: string | null; username?: string | null; avatar_url?: string | null } | null;
  onRemoteContentChange?: (content: any, senderId: string, pageId?: string) => void;
  onRemoteDeltaChange?: (deltas: BlockDelta[], senderId: string, pageId?: string) => void;
  enabled?: boolean;
}

export function useNotionCollab({
  documentId,
  currentPageId,
  user,
  userProfile,
  onRemoteContentChange,
  onRemoteDeltaChange,
  enabled = true,
}: UseNotionCollabProps) {
  const [activeCollaborators, setActiveCollaborators] = useState<CollabUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const broadcastThrottleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cursorThrottleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCursorPosRef = useRef<number>(-1);
  const lastBroadcastContentRef = useRef<any>(null);

  // Determinar identidad activa (usuario registrado o invitado)
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

  // Inicialización dinámica del canal por página activa (apunte-cooperativo:${documentId})
  // Al cambiar de página/subpágina se desmonta limpiamente el canal previo y suscribe al nuevo identificador
  useEffect(() => {
    if (!enabled || !documentId || !currentUserId) {
      if (channelRef.current) {
        channelRef.current.untrack().catch(() => {});
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
        setActiveCollaborators([]);
        setRemoteCursors({});
      }
      return;
    }

    // Canal único por página activa
    const channelName = `apunte-cooperativo:${documentId}`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: currentUserId },
        broadcast: { ack: false, self: false },
      },
    });

    channelRef.current = channel;

    // 1. Presencia de usuarios en vivo en esta página
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
                currentPageId: p.currentPageId || documentId,
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

    // 2. Broadcast: deltas granulares de bloques modificados
    channel.on("broadcast", { event: "block_delta" }, ({ payload }) => {
      if (payload && payload.senderId !== currentUserId && payload.pageId === documentId) {
        if (onRemoteDeltaChange && payload.deltas) {
          onRemoteDeltaChange(payload.deltas, payload.senderId, payload.pageId);
        } else if (onRemoteContentChange && payload.content) {
          onRemoteContentChange(payload.content, payload.senderId, payload.pageId);
        }
      }
    });

    // 3. Broadcast: sincronización periódica de contenido completo (debounced)
    channel.on("broadcast", { event: "content_change" }, ({ payload }) => {
      if (payload && payload.senderId !== currentUserId && payload.pageId === documentId && onRemoteContentChange) {
        onRemoteContentChange(payload.content, payload.senderId, payload.pageId);
      }
    });

    // 4. Broadcast: movimiento de cursor remoto en vivo
    channel.on("broadcast", { event: "cursor_move" }, ({ payload }) => {
      if (payload && payload.userId && payload.userId !== currentUserId && payload.pageId === documentId) {
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

    // Suscribirse y trackear presencia en la página activa
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        await channel.track({
          user_id: currentUserId,
          name: currentUserName,
          avatar_url: activeIdentity.current.avatarUrl,
          color: currentUserColor,
          isGuest: activeIdentity.current.isGuest,
          currentPageId: documentId,
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
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsConnected(false);
      setActiveCollaborators([]);
      setRemoteCursors({});
    };
  }, [documentId, currentUserId, currentUserName, currentUserColor, enabled, onRemoteContentChange, onRemoteDeltaChange]);

  // Difundir cambios de contenido con debounce inteligente y cálculo de deltas
  // (Prohibido sincronizar el HTML/JSON completo en cada pulsación para evitar colisiones)
  const broadcastContent = useCallback(
    (newContent: any, pageId?: string) => {
      const targetPageId = pageId || documentId;
      if (!channelRef.current || !isConnected || !currentUserId || !targetPageId) return;

      if (broadcastThrottleTimerRef.current) {
        clearTimeout(broadcastThrottleTimerRef.current);
      }

      // Debounce de 300ms tras dejar de escribir antes de emitir la actualización
      broadcastThrottleTimerRef.current = setTimeout(() => {
        broadcastThrottleTimerRef.current = null;
        if (!channelRef.current || !isConnected) return;

        const previousContent = lastBroadcastContentRef.current;
        lastBroadcastContentRef.current = newContent;

        // Calcular si podemos enviar un delta granular
        const deltas = previousContent ? computeBlockDeltas(previousContent, newContent) : [];

        if (deltas.length > 0 && deltas.length <= 4) {
          // Difundir delta granular
          channelRef.current.send({
            type: "broadcast",
            event: "block_delta",
            payload: {
              deltas,
              content: newContent,
              pageId: targetPageId,
              senderId: currentUserId,
              senderName: currentUserName,
              senderColor: currentUserColor,
              timestamp: Date.now(),
            },
          });
        } else {
          // Difundir contenido completo debounced
          channelRef.current.send({
            type: "broadcast",
            event: "content_change",
            payload: {
              content: newContent,
              pageId: targetPageId,
              senderId: currentUserId,
              senderName: currentUserName,
              senderColor: currentUserColor,
              timestamp: Date.now(),
            },
          });
        }
      }, 300);
    },
    [isConnected, currentUserId, currentUserName, currentUserColor, documentId]
  );

  // Difundir cursor en tiempo real (16ms throttle para 60fps)
  const broadcastCursor = useCallback(
    (pos: number, pageId?: string) => {
      const targetPageId = pageId || documentId;
      if (!channelRef.current || !isConnected || !currentUserId || pos === lastCursorPosRef.current || !targetPageId) return;
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
            pageId: targetPageId,
            timestamp: Date.now(),
          },
        });
      }, 16);
    },
    [isConnected, currentUserId, currentUserName, currentUserColor, documentId]
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
      currentPageId: documentId,
      joined_at: Date.now(),
    },
    broadcastContent,
    broadcastCursor,
  };
}

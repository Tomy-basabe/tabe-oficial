import { useEffect, useState, useMemo } from "react";
import * as Y from "yjs";
import { YjsSupabaseProvider, uint8ArrayToBase64, base64ToUint8Array } from "@/lib/yjsSupabaseProvider";

export { uint8ArrayToBase64, base64ToUint8Array };

export interface CollabUser {
  user_id: string;
  name: string;
  avatar_url?: string | null;
  color: string;
  isGuest?: boolean;
  currentPageId?: string;
  joined_at: number;
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
  user?: any;
  userProfile?: { nombre?: string | null; username?: string | null; avatar_url?: string | null } | null;
  enabled?: boolean;
}

/**
 * Hook centralizado que provee Yjs + Supabase Realtime Broadcast para colaboración en vivo
 */
export function useNotionCollab({
  documentId,
  user,
  userProfile,
  enabled = true,
}: UseNotionCollabProps) {
  const [activeCollaborators, setActiveCollaborators] = useState<CollabUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState<YjsSupabaseProvider | null>(null);
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);

  // Determinar identidad activa (usuario registrado o invitado)
  const activeIdentity = useMemo(() => {
    if (user?.id) {
      return {
        id: user.id,
        name: userProfile?.nombre || userProfile?.username || user.email?.split("@")[0] || "Compañero",
        avatarUrl: userProfile?.avatar_url || user.user_metadata?.avatar_url || null,
        isGuest: false,
      };
    } else {
      const guest = getOrCreateGuestIdentity();
      return {
        id: guest.id,
        name: guest.name,
        avatarUrl: null,
        isGuest: true,
      };
    }
  }, [user, userProfile]);

  const currentUserId = activeIdentity.id;
  const currentUserName = activeIdentity.name;
  const currentUserColor = getCollabColor(currentUserId);

  useEffect(() => {
    if (!enabled || !documentId || !currentUserId) {
      setProvider((prev) => {
        if (prev) prev.destroy();
        return null;
      });
      setYdoc(null);
      setIsConnected(false);
      setActiveCollaborators([]);
      return;
    }

    const doc = new Y.Doc();
    const newProvider = new YjsSupabaseProvider({
      documentId,
      doc,
      userId: currentUserId,
      userMeta: {
        name: currentUserName,
        color: currentUserColor,
        avatarUrl: activeIdentity.avatarUrl,
      },
      onStatusChange: (connected) => {
        setIsConnected(connected);
      },
      onCollaboratorsChange: (users) => {
        setActiveCollaborators(users);
      },
    });

    setYdoc(doc);
    setProvider(newProvider);

    return () => {
      newProvider.destroy();
      setProvider(null);
      setYdoc(null);
      setIsConnected(false);
      setActiveCollaborators([]);
    };
  }, [documentId, currentUserId, currentUserName, currentUserColor, activeIdentity.avatarUrl, enabled]);

  return {
    ydoc,
    provider,
    activeCollaborators,
    isConnected,
    currentUser: {
      user_id: currentUserId,
      name: currentUserName,
      color: currentUserColor,
      avatar_url: activeIdentity.avatarUrl,
      isGuest: activeIdentity.isGuest,
      currentPageId: documentId,
    },
  };
}

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  createdAt: string;
  read?: boolean;
}

interface FriendsSocialContextType {
  onlineUserIds: Set<string>;
  isUserOnline: (targetUserId: string) => boolean;
  messagesByFriend: Record<string, DirectMessage[]>;
  unreadByFriend: Record<string, number>;
  totalUnread: number;
  typingByFriend: Record<string, boolean>;
  notificationsEnabled: boolean;
  toggleNotifications: () => void;
  activeChatFriendId: string | null;
  setActiveChatFriendId: (friendId: string | null) => void;
  sendMessage: (friendId: string, friendName: string, content: string) => Promise<void>;
  sendTyping: (friendId: string) => void;
  markConversationRead: (friendId: string) => void;
}

const FriendsSocialContext = createContext<FriendsSocialContextType | null>(null);

const NOTIF_PREF_KEY = "tabe_friend_dm_notifs_enabled_v1";

// Sonido sintético retro corto para notificación de mensaje entrante
function playMessageNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880, now + 0.09); // A5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.28);
  } catch {}
}

export function FriendsSocialProvider({ children }: { children: React.ReactNode }) {
  const { user, isGuest, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUserId = isGuest ? "guest" : user?.id || "";
  const currentUserName =
    profile?.nombre ||
    profile?.username ||
    user?.user_metadata?.nombre ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    (isGuest ? "Invitado Pro" : "Estudiante");

  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => {
    // En modo demo, Luciana ("f1") aparece en línea para poder probar presencia y chat
    return isGuest ? new Set(["guest", "f1"]) : new Set();
  });

  const [messagesByFriend, setMessagesByFriend] = useState<Record<string, DirectMessage[]>>({});
  const [unreadByFriend, setUnreadByFriend] = useState<Record<string, number>>({});
  const [typingByFriend, setTypingByFriend] = useState<Record<string, boolean>>({});
  const [activeChatFriendId, setActiveChatFriendId] = useState<string | null>(null);

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(NOTIF_PREF_KEY);
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });

  const activeChatRef = useRef<string | null>(null);
  const locationPathRef = useRef<string>(location.pathname);
  const notifsEnabledRef = useRef<boolean>(notificationsEnabled);
  const socialChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    activeChatRef.current = activeChatFriendId;
  }, [activeChatFriendId]);

  useEffect(() => {
    locationPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    notifsEnabledRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  const storageKeyMessages = currentUserId ? `tabe_friend_dms_v1_${currentUserId}` : "";
  const storageKeyUnread = currentUserId ? `tabe_friend_unread_v1_${currentUserId}` : "";

  // Cargar historial guardado localmente al iniciar
  useEffect(() => {
    if (!currentUserId) {
      setMessagesByFriend({});
      setUnreadByFriend({});
      return;
    }

    try {
      const savedMsgs = localStorage.getItem(storageKeyMessages);
      if (savedMsgs) {
        setMessagesByFriend(JSON.parse(savedMsgs));
      } else if (isGuest) {
        // Mensaje inicial de bienvenida en modo demo
        const initialDemo: Record<string, DirectMessage[]> = {
          f1: [
            {
              id: "demo-msg-1",
              senderId: "f1",
              senderName: "Luciana M.",
              receiverId: "guest",
              content: "¡Hola! Estoy estudiando con Pomodoro, ¿hacemos una sesión o unas partidas?",
              createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
              read: false,
            },
          ],
        };
        setMessagesByFriend(initialDemo);
        setUnreadByFriend({ f1: 1 });
      }

      const savedUnread = localStorage.getItem(storageKeyUnread);
      if (savedUnread) {
        setUnreadByFriend(JSON.parse(savedUnread));
      }
    } catch {}
  }, [currentUserId, isGuest, storageKeyMessages, storageKeyUnread]);

  // Persistir mensajes y no leídos en localStorage
  useEffect(() => {
    if (!currentUserId || !storageKeyMessages) return;
    try {
      localStorage.setItem(storageKeyMessages, JSON.stringify(messagesByFriend));
    } catch {}
  }, [messagesByFriend, currentUserId, storageKeyMessages]);

  useEffect(() => {
    if (!currentUserId || !storageKeyUnread) return;
    try {
      localStorage.setItem(storageKeyUnread, JSON.stringify(unreadByFriend));
    } catch {}
  }, [unreadByFriend, currentUserId, storageKeyUnread]);

  // Sincronizar modo demo en línea
  useEffect(() => {
    if (isGuest) {
      setOnlineUserIds(new Set(["guest", "f1"]));
    }
  }, [isGuest]);

  // Manejador común para recibir un mensaje entrante (Realtime o Demo)
  const handleIncomingMessage = useCallback(
    (msg: DirectMessage) => {
      const friendId = msg.senderId;
      const isChatOpenWithSender =
        locationPathRef.current.startsWith("/amigos") && activeChatRef.current === friendId;

      setMessagesByFriend(prev => {
        const existing = prev[friendId] || [];
        if (existing.some(m => m.id === msg.id)) return prev;
        return {
          ...prev,
          [friendId]: [...existing, { ...msg, read: isChatOpenWithSender }],
        };
      });

      // Limpiar estado de "escribiendo..."
      setTypingByFriend(prev => ({ ...prev, [friendId]: false }));

      if (!isChatOpenWithSender) {
        setUnreadByFriend(prev => ({
          ...prev,
          [friendId]: (prev[friendId] || 0) + 1,
        }));

        if (notifsEnabledRef.current) {
          playMessageNotificationSound();

          toast(`💬 Nuevo mensaje de ${msg.senderName}`, {
            description: msg.content.length > 70 ? `${msg.content.slice(0, 70)}...` : msg.content,
            action: {
              label: "Responder",
              onClick: () => {
                setActiveChatFriendId(friendId);
                navigate(`/amigos?chat=${friendId}`);
              },
            },
            duration: 5000,
          });

          // Notificación nativa del navegador si está en otra pestaña y tiene permiso
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted" &&
            document.visibilityState === "hidden"
          ) {
            try {
              const n = new Notification(`Mensaje de ${msg.senderName} | TABE`, {
                body: msg.content,
                icon: "/favicon.ico",
              });
              n.onclick = () => {
                window.focus();
                setActiveChatFriendId(friendId);
                navigate(`/amigos?chat=${friendId}`);
              };
            } catch {}
          }
        }
      } else {
        // Si el chat ya está abierto, emitir confirmación de lectura
        if (socialChannelRef.current) {
          socialChannelRef.current.send({
            type: "broadcast",
            event: "dm_read",
            payload: { readerId: currentUserId, senderId: friendId },
          });
        }
      }
    },
    [currentUserId, navigate]
  );

  // Conectar al canal global de Presencia + Mensajes Directos en Supabase Realtime
  useEffect(() => {
    if (!user?.id || isGuest) return;

    const channel = supabase.channel("tabe_global_social_v1", {
      config: {
        presence: { key: user.id },
      },
    });

    const syncPresence = () => {
      const state = channel.presenceState();
      const ids = new Set<string>();
      Object.keys(state).forEach(key => {
        if (key) ids.add(key);
      });
      ids.add(user.id);
      setOnlineUserIds(ids);
    };

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .on("broadcast", { event: "direct_message" }, ({ payload }) => {
        if (!payload || payload.receiverId !== user.id) return;
        handleIncomingMessage(payload as DirectMessage);
      })
      .on("broadcast", { event: "dm_typing" }, ({ payload }) => {
        if (!payload || payload.receiverId !== user.id) return;
        const senderId = payload.senderId as string;
        setTypingByFriend(prev => ({ ...prev, [senderId]: true }));

        if (typingTimeoutsRef.current[senderId]) {
          clearTimeout(typingTimeoutsRef.current[senderId]);
        }
        typingTimeoutsRef.current[senderId] = setTimeout(() => {
          setTypingByFriend(prev => ({ ...prev, [senderId]: false }));
        }, 2500);
      })
      .on("broadcast", { event: "dm_read" }, ({ payload }) => {
        if (!payload || payload.senderId !== user.id) return;
        const readerId = payload.readerId as string;
        setMessagesByFriend(prev => {
          const list = prev[readerId];
          if (!list) return prev;
          return {
            ...prev,
            [readerId]: list.map(m => (m.senderId === user.id ? { ...m, read: true } : m)),
          };
        });
      })
      .subscribe(async status => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            name: currentUserName,
            online_at: new Date().toISOString(),
          });
        }
      });

    socialChannelRef.current = channel;

    return () => {
      try {
        channel.untrack();
        supabase.removeChannel(channel);
      } catch {}
      socialChannelRef.current = null;
    };
  }, [user?.id, isGuest, currentUserName, handleIncomingMessage]);

  const isUserOnline = useCallback(
    (targetUserId: string) => {
      if (!targetUserId) return false;
      if (targetUserId === currentUserId) return true;
      return onlineUserIds.has(targetUserId);
    },
    [onlineUserIds, currentUserId]
  );

  const toggleNotifications = useCallback(() => {
    setNotificationsEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem(NOTIF_PREF_KEY, String(next));
      } catch {}
      toast.info(
        next
          ? "🔔 Notificaciones de mensajes activadas"
          : "🔕 Notificaciones de mensajes silenciadas"
      );
      return next;
    });
  }, []);

  const markConversationRead = useCallback(
    (friendId: string) => {
      if (!friendId) return;
      setUnreadByFriend(prev => {
        if (!prev[friendId]) return prev;
        const copy = { ...prev };
        delete copy[friendId];
        return copy;
      });

      setMessagesByFriend(prev => {
        const list = prev[friendId];
        if (!list) return prev;
        return {
          ...prev,
          [friendId]: list.map(m => (m.senderId === friendId ? { ...m, read: true } : m)),
        };
      });

      if (socialChannelRef.current && user?.id && !isGuest) {
        socialChannelRef.current.send({
          type: "broadcast",
          event: "dm_read",
          payload: { readerId: user.id, senderId: friendId },
        });
      }
    },
    [user?.id, isGuest]
  );

  const sendTyping = useCallback(
    (friendId: string) => {
      if (!friendId || isGuest || !user?.id || !socialChannelRef.current) return;
      socialChannelRef.current.send({
        type: "broadcast",
        event: "dm_typing",
        payload: {
          senderId: user.id,
          receiverId: friendId,
        },
      });
    },
    [isGuest, user?.id]
  );

  const sendMessage = useCallback(
    async (friendId: string, friendName: string, content: string) => {
      const trimmed = content.trim();
      if (!trimmed || !currentUserId) return;

      const newMsg: DirectMessage = {
        id: `dm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        senderId: currentUserId,
        senderName: currentUserName,
        receiverId: friendId,
        content: trimmed,
        createdAt: new Date().toISOString(),
        read: false,
      };

      setMessagesByFriend(prev => ({
        ...prev,
        [friendId]: [...(prev[friendId] || []), newMsg],
      }));

      // Si es usuario real, emitir en tiempo real por Supabase Broadcast
      if (!isGuest && user?.id && socialChannelRef.current) {
        await socialChannelRef.current.send({
          type: "broadcast",
          event: "direct_message",
          payload: newMsg,
        });
      }

      // En Modo Demo, simular respuesta en tiempo real para que el usuario vea el chat y notificaciones funcionando
      if (isGuest) {
        setTimeout(() => {
          setTypingByFriend(prev => ({ ...prev, [friendId]: true }));
        }, 700);

        setTimeout(() => {
          const demoReplies = [
            "¡Dale! Termino este bloque de estudio y nos conectamos.",
            "¡Buenísimo! Ya casi llego a mi meta semanal de XP.",
            "¿Jugamos un desafío rápido de preguntas en 5 minutos?",
            "¡Gracias por escribir! Sigamos metiéndole a la racha 🔥",
          ];
          const replyText = demoReplies[Math.floor(Math.random() * demoReplies.length)];
          const replyMsg: DirectMessage = {
            id: `dm_${Date.now()}_reply`,
            senderId: friendId,
            senderName: friendName,
            receiverId: "guest",
            content: replyText,
            createdAt: new Date().toISOString(),
            read: false,
          };
          handleIncomingMessage(replyMsg);
        }, 2400);
      }
    },
    [currentUserId, currentUserName, isGuest, user?.id, handleIncomingMessage]
  );

  const totalUnread = Object.values(unreadByFriend).reduce((acc, n) => acc + (n || 0), 0);

  return (
    <FriendsSocialContext.Provider
      value={{
        onlineUserIds,
        isUserOnline,
        messagesByFriend,
        unreadByFriend,
        totalUnread,
        typingByFriend,
        notificationsEnabled,
        toggleNotifications,
        activeChatFriendId,
        setActiveChatFriendId,
        sendMessage,
        sendTyping,
        markConversationRead,
      }}
    >
      {children}
    </FriendsSocialContext.Provider>
  );
}

export function useFriendsSocial() {
  const ctx = useContext(FriendsSocialContext);
  if (!ctx) {
    throw new Error("useFriendsSocial debe usarse dentro de FriendsSocialProvider");
  }
  return ctx;
}

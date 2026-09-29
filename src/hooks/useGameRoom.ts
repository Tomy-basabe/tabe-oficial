import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface GameRoomData {
  id: string;
  code: string;
  host_id: string;
  guest_id: string | null;
  game_type: string;
  deck_id: string | null;
  status: "waiting" | "ready" | "in_progress" | "finished" | "cancelled";
  created_at: string;
}

export interface IncomingChallenge {
  roomCode: string;
  gameType: string;
  hostId: string;
  hostName: string;
  hostAvatar?: string | null;
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "TAB-";
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function useGameRoom() {
  const { user } = useAuth();
  const [activeRoom, setActiveRoom] = useState<GameRoomData | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [guestPlayer, setGuestPlayer] = useState<{ id: string; name: string } | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(false);

  const roomChannelRef = useRef<any>(null);

  const cleanupRoom = useCallback(() => {
    if (roomChannelRef.current) {
      try {
        roomChannelRef.current.untrack();
        supabase.removeChannel(roomChannelRef.current);
      } catch {}
      roomChannelRef.current = null;
    }
    setActiveRoom(null);
    setRoomCode(null);
    setGuestPlayer(null);
    setIsHost(false);
  }, []);

  // Crear una nueva sala privada con código
  const createRoom = useCallback(async (gameType: string, deckId?: string | null): Promise<{ code: string | null; error: string | null }> => {
    if (!user) {
      toast.error("Debes iniciar sesión para crear una sala");
      return { code: null, error: "No autenticado" };
    }

    setLoading(true);
    cleanupRoom();

    try {
      const code = generateRoomCode();
      const { data, error } = await supabase
        .from("game_rooms" as any)
        .insert({
          code,
          host_id: user.id,
          game_type: gameType,
          deck_id: deckId || null,
          status: "waiting",
        } as any)
        .select()
        .single();

      if (error || !data) {
        console.error("Error creating room in Supabase:", error);
        setLoading(false);
        return { code: null, error: "No se pudo crear la sala" };
      }

      const roomData = data as unknown as GameRoomData;
      setActiveRoom(roomData);
      setRoomCode(code);
      setIsHost(true);

      // Conectar al canal Realtime de la sala
      const channel = supabase.channel(`game_room_${code}`, {
        config: { presence: { key: user.id } },
      });

      // Escuchar cuando el invitado entra a la sala
      channel.on("broadcast", { event: "player_joined" }, ({ payload }) => {
        if (payload?.playerId && payload?.playerId !== user.id) {
          setGuestPlayer({ id: payload.playerId, name: payload.playerName || "Rival" });
          toast.success(`¡${payload.playerName || "Un amigo"} se unió a tu sala!`);
        }
      });

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({
            userId: user.id,
            userName: user.user_metadata?.full_name || user.email?.split("@")[0] || "Host",
            isHost: true,
          });
        }
      });

      roomChannelRef.current = channel;
      setLoading(false);
      return { code, error: null };
    } catch (err: any) {
      console.error("createRoom exception:", err);
      setLoading(false);
      return { code: null, error: err.message || "Error al crear sala" };
    }
  }, [user, cleanupRoom]);

  // Unirse a una sala existente mediante código
  const joinRoom = useCallback(async (inputCode: string): Promise<{ room: GameRoomData | null; error: string | null }> => {
    if (!user) {
      toast.error("Debes iniciar sesión para unirte a una sala");
      return { room: null, error: "No autenticado" };
    }

    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) return { room: null, error: "Ingresa un código válido" };

    setLoading(true);
    cleanupRoom();

    try {
      const { data, error } = await supabase
        .from("game_rooms" as any)
        .select("*")
        .eq("code", cleanCode)
        .eq("status", "waiting")
        .maybeSingle();

      if (error || !data) {
        setLoading(false);
        return { room: null, error: "Sala no encontrada o partida ya iniciada" };
      }

      const roomData = data as unknown as GameRoomData;

      if (roomData.host_id === user.id) {
        // El creador está reingresando
        setIsHost(true);
      } else {
        setIsHost(false);
        // Actualizar como guest_id
        await supabase
          .from("game_rooms" as any)
          .update({ guest_id: user.id, status: "ready" })
          .eq("id", roomData.id);
      }

      setActiveRoom(roomData);
      setRoomCode(cleanCode);

      const myName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Invitado";

      // Conectar al canal Realtime
      const channel = supabase.channel(`game_room_${cleanCode}`, {
        config: { presence: { key: user.id } },
      });

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({
            userId: user.id,
            userName: myName,
            isHost: roomData.host_id === user.id,
          });

          // Notificar al host que entramos
          channel.send({
            type: "broadcast",
            event: "player_joined",
            payload: {
              playerId: user.id,
              playerName: myName,
            },
          });
        }
      });

      roomChannelRef.current = channel;
      setLoading(false);
      return { room: roomData, error: null };
    } catch (err: any) {
      console.error("joinRoom exception:", err);
      setLoading(false);
      return { room: null, error: err.message || "Error al unirse a la sala" };
    }
  }, [user, cleanupRoom]);

  // Enviar desafío directo a un amigo
  const sendFriendChallenge = useCallback(async (
    friendUserId: string,
    gameType: string,
    code: string
  ): Promise<{ error: string | null }> => {
    if (!user) return { error: "No autenticado" };

    try {
      const myName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Un amigo";
      const challengeChannel = supabase.channel(`user_challenges_${friendUserId}`);
      
      challengeChannel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          challengeChannel.send({
            type: "broadcast",
            event: "incoming_challenge",
            payload: {
              roomCode: code,
              gameType,
              hostId: user.id,
              hostName: myName,
            },
          });
          // Desconectar tras enviar
          setTimeout(() => {
            supabase.removeChannel(challengeChannel);
          }, 1500);
        }
      });

      toast.success("¡Desafío enviado a tu amigo!");
      return { error: null };
    } catch (e: any) {
      console.error("sendFriendChallenge error:", e);
      return { error: "No se pudo enviar el desafío" };
    }
  }, [user]);

  // Escuchar desafíos entrantes dirigidos al usuario actual
  const listenForChallenges = useCallback((onChallenge: (challenge: IncomingChallenge) => void) => {
    if (!user?.id) return () => {};

    const challengeChannel = supabase.channel(`user_challenges_${user.id}`);

    challengeChannel.on("broadcast", { event: "incoming_challenge" }, ({ payload }) => {
      if (payload && payload.roomCode && payload.hostId !== user.id) {
        onChallenge(payload as IncomingChallenge);
      }
    });

    challengeChannel.subscribe();

    return () => {
      supabase.removeChannel(challengeChannel);
    };
  }, [user?.id]);

  useEffect(() => {
    return () => {
      cleanupRoom();
    };
  }, [cleanupRoom]);

  return {
    activeRoom,
    roomCode,
    isHost,
    guestPlayer,
    loading,
    createRoom,
    joinRoom,
    sendFriendChallenge,
    listenForChallenges,
    cleanupRoom,
    roomChannel: roomChannelRef.current,
  };
}

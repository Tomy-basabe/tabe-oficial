import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { saveMatchSession, getMatchSession } from "@/lib/gameStorage";

export { saveMatchSession, getMatchSession };

// Jaro-Winkler similarity for fuzzy matching of deck/subject names
function jaroWinkler(s1: string, s2: string): number {
  const a = s1.toLowerCase().replace(/[^a-záéíóúñü0-9]/g, "");
  const b = s2.toLowerCase().replace(/[^a-záéíóúñü0-9]/g, "");

  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const matchWindow = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (!matches) return 0;

  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(a.length, b.length)); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

interface PresenceUser {
  userId: string;
  userName: string;
  carrera: string | null;
  deckId: string;
  deckName: string | null;
  joinedAt: number;
}

export type MatchmakingStatus = "idle" | "searching" | "found" | "bot" | "error";

export function useMatchmaking(initialGameType?: string) {
  const { user } = useAuth();
  const [status, setStatus] = useState<MatchmakingStatus>("idle");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const hasFoundMatchRef = useRef<boolean>(false);

  // Auto-detect game type from URL if not specified
  const detectGameType = useCallback((): string => {
    if (initialGameType) return initialGameType;
    if (typeof window === "undefined") return "general";
    const path = window.location.pathname.toLowerCase();
    if (path.includes("penales")) return "penales";
    if (path.includes("tateti")) return "tateti";
    if (path.includes("bomba")) return "bomba";
    if (path.includes("batalla")) return "batalla";
    if (path.includes("ajedrez")) return "ajedrez";
    if (path.includes("karts")) return "karts";
    return "general";
  }, [initialGameType]);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (channelRef.current) {
      try {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      } catch {
        // Ignore
      }
      channelRef.current = null;
    }
  }, []);

  const leaveQueue = useCallback(async () => {
    cleanup();
    hasFoundMatchRef.current = false;
    setStatus("idle");
    setTimeLeft(0);
    setMatchId(null);
    setOpponentName(null);

    // Also attempt to delete from table if it exists (legacy support)
    if (user) {
      try {
        await supabase.from("matchmaking_queue" as any).delete().eq("user_id", user.id);
      } catch {
        // Ignore
      }
    }
  }, [cleanup, user]);

  const createBotMatch = useCallback(
    async (deckId: string, gameType: string): Promise<string> => {
      const generatedId = `bot_${gameType}_${Date.now()}`;
      const currentUid = user?.id || "guest";
      const myName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")[0] ||
        "Tú";

      saveMatchSession(generatedId, {
        matchId: generatedId,
        gameType,
        player1_id: currentUid,
        player1_name: myName,
        player2_id: "bot",
        player2_name: "🤖 Bot TABE",
        is_bot: true,
        createdAt: Date.now(),
      });

      // Optionally attempt DB insert for bot match
      if (user) {
        supabase
          .from("game_matches" as any)
          .insert({
            id: generatedId.length === 36 ? generatedId : undefined,
            player1_id: user.id,
            player1_deck_id: deckId,
            is_bot_match: true,
            status: "in_progress",
            current_turn_user_id: user.id,
            turn_phase: "shoot",
            started_at: new Date().toISOString(),
          } as any)
          .catch(() => {});
      }

      return generatedId;
    },
    [user]
  );

  const joinQueue = useCallback(
    async (deckId: string, deckName: string, carrera: string | null, customGameType?: string) => {
      const currentUid = user?.id || `guest_${Math.random().toString(36).substring(2, 9)}`;
      const gameType = customGameType || detectGameType();

      cleanup();
      hasFoundMatchRef.current = false;
      setStatus("searching");

      // Fetch user display name
      let myDisplayName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")[0] ||
        "Estudiante";

      if (user) {
        try {
          const { data: prof } = await supabase
            .from("profiles")
            .select("nombre, username")
            .eq("user_id", user.id)
            .maybeSingle();
          if (prof) {
            myDisplayName = (prof as any).nombre || (prof as any).username || myDisplayName;
          }
        } catch {
          // Ignore
        }
      }

      // Realtime channel for instant presence & peer-to-peer matchmaking
      const channelName = `tabe_matchmaking_${gameType}`;
      const channel = supabase.channel(channelName, {
        config: { presence: { key: currentUid } },
      });

      const checkForOpponent = (presenceState: Record<string, any[]>) => {
        if (hasFoundMatchRef.current) return;

        const candidateUsers: PresenceUser[] = [];
        Object.entries(presenceState).forEach(([key, presences]) => {
          if (key === currentUid) return;
          if (Array.isArray(presences) && presences.length > 0) {
            const p = presences[0] as PresenceUser;
            if (p && p.userId && p.userId !== currentUid) {
              candidateUsers.push(p);
            }
          }
        });

        if (candidateUsers.length === 0) return;

        // Choose best match: same carrera > similar deck name > oldest waiting
        let bestRival: PresenceUser | null = null;
        let bestScore = -1;

        for (const rival of candidateUsers) {
          let score = 10;
          if (carrera && rival.carrera && rival.carrera.toLowerCase() === carrera.toLowerCase()) {
            score += 50;
          }
          if (deckName && rival.deckName) {
            score += jaroWinkler(deckName, rival.deckName) * 30;
          }
          if (score > bestScore) {
            bestScore = score;
            bestRival = rival;
          }
        }

        if (!bestRival) return;

        // Deterministic leader: user with smaller UID initiates the match
        const isInitiator = currentUid.localeCompare(bestRival.userId) < 0;

        if (isInitiator) {
          hasFoundMatchRef.current = true;
          const sharedMatchId = `match_${gameType}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          const matchDetails = {
            matchId: sharedMatchId,
            gameType,
            player1_id: currentUid,
            player1_name: myDisplayName,
            player2_id: bestRival.userId,
            player2_name: bestRival.userName,
            is_bot: false,
            createdAt: Date.now(),
          };

          saveMatchSession(sharedMatchId, matchDetails);

          // Broadcast invitation to the rival
          channel.send({
            type: "broadcast",
            event: "match_invitation",
            payload: {
              targetUserId: bestRival.userId,
              initiatorUserId: currentUid,
              matchDetails,
            },
          });

          // Transition to found
          cleanup();
          setMatchId(sharedMatchId);
          setOpponentName(bestRival.userName);
          setStatus("found");
        }
      };

      // Listen for incoming match invitations from another initiator
      channel.on("broadcast", { event: "match_invitation" }, ({ payload }) => {
        if (hasFoundMatchRef.current) return;
        if (payload && payload.targetUserId === currentUid && payload.matchDetails) {
          hasFoundMatchRef.current = true;
          const details = payload.matchDetails;
          saveMatchSession(details.matchId, details);

          cleanup();
          setMatchId(details.matchId);
          setOpponentName(details.player1_name || "Rival");
          setStatus("found");
        }
      });

      // Listen for presence changes
      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        checkForOpponent(state);
      });

      // Join channel & track presence
      channel.subscribe(async (subStatus) => {
        if (subStatus === "SUBSCRIBED") {
          await channel.track({
            userId: currentUid,
            userName: myDisplayName,
            carrera,
            deckId,
            deckName,
            joinedAt: Date.now(),
          });
          // Also check right away
          const state = channel.presenceState();
          checkForOpponent(state);
        }
      });

      channelRef.current = channel;

      // 12-second countdown before falling back to BOT
      let remaining = 12;
      setTimeLeft(remaining);

      timerRef.current = setInterval(() => {
        remaining--;
        setTimeLeft(remaining > 0 ? remaining : 0);

        // Periodically evaluate presence
        if (channelRef.current && !hasFoundMatchRef.current) {
          try {
            checkForOpponent(channelRef.current.presenceState());
          } catch {
            // Ignore
          }
        }

        if (remaining <= 0) {
          cleanup();
          if (!hasFoundMatchRef.current) {
            hasFoundMatchRef.current = true;
            createBotMatch(deckId, gameType).then((id) => {
              setMatchId(id);
              setOpponentName("🤖 Bot TABE");
              setStatus("bot");
            });
          }
        }
      }, 1000);
    },
    [user, detectGameType, cleanup, createBotMatch]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    status,
    matchId,
    opponentName,
    timeLeft,
    joinQueue,
    leaveQueue,
    setStatus,
    setMatchId,
  };
}

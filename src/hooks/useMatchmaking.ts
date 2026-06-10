import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Jaro-Winkler similarity for fuzzy matching of subject names
function jaroWinkler(s1: string, s2: string): number {
  const a = s1.toLowerCase().replace(/[^a-záéíóúñü0-9]/g, '');
  const b = s2.toLowerCase().replace(/[^a-záéíóúñü0-9]/g, '');
  
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

  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
  
  // Winkler modification
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(a.length, b.length)); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

interface QueueEntry {
  id: string;
  user_id: string;
  deck_id: string;
  carrera: string | null;
  deck_name: string | null;
  joined_at: string;
}

type MatchmakingStatus = 'idle' | 'searching' | 'found' | 'bot' | 'error';

export function useMatchmaking() {
  const { user } = useAuth();
  const [status, setStatus] = useState<MatchmakingStatus>('idle');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const leaveQueue = useCallback(async () => {
    if (!user) return;
    cleanup();
    await supabase.from("matchmaking_queue" as any).delete().eq("user_id", user.id);
    setStatus('idle');
    setTimeLeft(0);
    setMatchId(null);
    setOpponentName(null);
  }, [user, cleanup]);

  const createBotMatch = useCallback(async (deckId: string): Promise<string | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("game_matches" as any)
      .insert({
        player1_id: user.id,
        player1_deck_id: deckId,
        is_bot_match: true,
        status: 'in_progress',
        current_turn_user_id: user.id,
        turn_phase: 'shoot',
        started_at: new Date().toISOString()
      } as any)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      console.warn("No se pudo crear el partido en la base de datos (quizás faltan las tablas), usando fallback local para poder probar contra el bot.");
      return `bot-match-fallback-${Date.now()}`;
    }
    
    return (data as any).id;
  }, [user]);

  const joinQueue = useCallback(async (deckId: string, deckName: string, carrera: string | null) => {
    if (!user) return;

    setStatus('searching');
    setTimeLeft(0);

    // Insert into queue
    await supabase.from("matchmaking_queue" as any).upsert({
      user_id: user.id,
      deck_id: deckId,
      carrera,
      deck_name: deckName,
      joined_at: new Date().toISOString()
    } as any, { onConflict: "user_id" });

    // Start 0-second countdown for immediate bot match
    let remaining = 0;
    timerRef.current = setInterval(() => {
      remaining--;
      setTimeLeft(remaining > 0 ? remaining : 0);
      if (remaining <= 0) {
        cleanup();
        // No rival found, create bot match
        supabase.from("matchmaking_queue" as any).delete().eq("user_id", user.id).then(() => {
          createBotMatch(deckId).then(id => {
            if (id) {
              setMatchId(id);
              setOpponentName("🤖 Bot TABE");
              setStatus('bot');
            } else {
              setStatus('error');
            }
          });
        });
      }
    }, 10);

    // Poll queue for potential matches every 2 seconds
    pollRef.current = setInterval(async () => {
      const { data: queue } = await supabase
        .from("matchmaking_queue" as any)
        .select("*")
        .neq("user_id", user.id);

      if (!queue || (queue as any[]).length === 0) return;

      const entries = queue as unknown as QueueEntry[];
      
      // Find best match: same carrera first, then similar deck name
      let bestMatch: QueueEntry | null = null;
      let bestScore = 0;

      for (const entry of entries) {
        let score = 0;
        // Same carrera = big bonus
        if (carrera && entry.carrera && entry.carrera.toLowerCase() === carrera.toLowerCase()) {
          score += 50;
        }
        // Similar deck name = bonus
        if (deckName && entry.deck_name) {
          const similarity = jaroWinkler(deckName, entry.deck_name);
          score += similarity * 30;
        }
        // Anyone waiting is at least 10 points
        score += 10;

        if (score > bestScore) {
          bestScore = score;
          bestMatch = entry;
        }
      }

      if (bestMatch) {
        // Found a match! Create the game
        cleanup();
        
        const { data: match, error: matchError } = await supabase
          .from("game_matches" as any)
          .insert({
            player1_id: user.id,
            player1_deck_id: deckId,
            player2_id: bestMatch.user_id,
            player2_deck_id: bestMatch.deck_id,
            is_bot_match: false,
            status: 'in_progress',
            current_turn_user_id: user.id,
            turn_phase: 'shoot',
            started_at: new Date().toISOString()
          } as any)
          .select("id")
          .single();

        // Remove both from queue
        await supabase.from("matchmaking_queue" as any).delete().eq("user_id", user.id);
        await supabase.from("matchmaking_queue" as any).delete().eq("user_id", bestMatch.user_id);

        if (!matchError && match) {
          setMatchId((match as any).id);
          
          // Get opponent name
          const { data: profile } = await supabase
            .rpc('get_friend_profiles', { friend_user_ids: [bestMatch.user_id] });
          
          if (profile && (profile as any[]).length > 0) {
            setOpponentName((profile as any[])[0].nombre || (profile as any[])[0].username || `Jugador #${(profile as any[])[0].display_id}`);
          } else {
            setOpponentName("Rival");
          }
          setStatus('found');
        }
      }
    }, 2000);

    // Realtime: listen for matches where we are player2 (someone else created the match for us)
    channelRef.current = supabase
      .channel(`matchmaking-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'game_matches',
        filter: `player2_id=eq.${user.id}`
      }, (payload) => {
        cleanup();
        supabase.from("matchmaking_queue" as any).delete().eq("user_id", user.id);
        setMatchId(payload.new.id);
        setStatus('found');
      })
      .subscribe();

  }, [user, cleanup, createBotMatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (user) {
        supabase.from("matchmaking_queue" as any).delete().eq("user_id", user.id);
      }
    };
  }, [cleanup, user]);

  return {
    status,
    matchId,
    opponentName,
    timeLeft,
    joinQueue,
    leaveQueue,
    setStatus,
    setMatchId
  };
}

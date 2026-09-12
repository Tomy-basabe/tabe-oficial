import { supabase } from "@/integrations/supabase/client";

export interface GameMatch {
  id: string;
  game_type: string;
  status: string;
  player1_id: string;
  player1_score: number;
  player2_id: string | null;
  player2_score: number;
  is_bot_match: boolean;
  current_round?: number;
  max_rounds?: number;
  winner_id: string | null;
  xp_reward: number;
  created_at: string;
  finished_at?: string | null;
}

export interface GameStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  totalXpEarned: number;
}

export interface SaveMatchParams {
  gameType: string;
  winner: "player" | "opponent" | "bot" | "draw";
  player1Score: number;
  player2Score: number;
  isBotMatch: boolean;
  xpReward: number;
  matchId?: string | null;
  userId?: string | null;
}

const STORAGE_KEY_PREFIX = "tabe_game_matches_";
const MATCH_SESSION_PREFIX = "tabe_match_session_";
export const GAME_STATS_EVENT = "tabe_game_stats_updated";

// Session storage for in-progress peer-to-peer / bot matches
export function saveMatchSession(matchId: string, data: {
  matchId: string;
  gameType: string;
  player1_id: string;
  player1_name: string;
  player2_id: string;
  player2_name: string;
  is_bot: boolean;
  createdAt?: number;
}) {
  try {
    sessionStorage.setItem(`${MATCH_SESSION_PREFIX}${matchId}`, JSON.stringify(data));
    if (typeof window !== "undefined") {
      (window as any).__tabeMatches = (window as any).__tabeMatches || {};
      (window as any).__tabeMatches[matchId] = data;
    }
  } catch (e) {
    console.error("Error saving match session:", e);
  }
}

export function getMatchSession(matchId: string | null): {
  matchId: string;
  gameType: string;
  player1_id: string;
  player1_name: string;
  player2_id: string;
  player2_name: string;
  is_bot: boolean;
} | null {
  if (!matchId) return null;
  if (typeof window !== "undefined" && (window as any).__tabeMatches?.[matchId]) {
    return (window as any).__tabeMatches[matchId];
  }
  try {
    const raw = sessionStorage.getItem(`${MATCH_SESSION_PREFIX}${matchId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Local match storage & stats computation
export function getLocalMatches(userId: string | null): GameMatch[] {
  const key = `${STORAGE_KEY_PREFIX}${userId || "guest"}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function calculateStats(matches: GameMatch[], userId: string | null): GameStats {
  const currentUid = userId || "guest";
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let totalXp = 0;
  let maxStreak = 0;
  let currentStreak = 0;

  // We sort chronological from oldest to newest to compute the win streak accurately
  const sorted = [...matches].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const match of sorted) {
    totalXp += match.xp_reward || 0;
    const isWinner = match.winner_id === currentUid;
    const isDraw = !match.winner_id || match.winner_id === "draw";

    if (isWinner) {
      wins++;
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else if (isDraw) {
      draws++;
      currentStreak = 0;
    } else {
      losses++;
      currentStreak = 0;
    }
  }

  return {
    totalGames: matches.length,
    wins,
    losses,
    draws,
    winStreak: maxStreak,
    totalXpEarned: totalXp,
  };
}

export async function recordGameMatch(params: SaveMatchParams): Promise<GameMatch> {
  const currentUid = params.userId || "guest";
  const winnerId =
    params.winner === "player"
      ? currentUid
      : params.winner === "draw"
      ? null
      : params.isBotMatch
      ? "bot"
      : "opponent";

  const newMatch: GameMatch = {
    id: params.matchId || `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    game_type: params.gameType,
    status: "finished",
    player1_id: currentUid,
    player1_score: params.player1Score,
    player2_id: params.isBotMatch ? null : "opponent",
    player2_score: params.player2Score,
    is_bot_match: params.isBotMatch,
    current_round: 5,
    max_rounds: 5,
    winner_id: winnerId,
    xp_reward: params.xpReward,
    created_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  };

  // 1. Save to local storage
  const storageKey = `${STORAGE_KEY_PREFIX}${currentUid}`;
  try {
    const existing = getLocalMatches(currentUid);
    // Prevent duplicate matches with same ID
    const filtered = existing.filter((m) => m.id !== newMatch.id);
    const updated = [newMatch, ...filtered].slice(0, 50);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch (e) {
    console.error("Error writing to localStorage for game matches:", e);
  }

  // 2. Dispatch custom event for real-time reactivity in UI
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(GAME_STATS_EVENT, { detail: newMatch }));
  }

  // 3. Gracefully attempt to insert into Supabase if table exists (non-blocking)
  if (params.userId && params.userId !== "guest") {
    supabase
      .from("game_matches" as any)
      .insert({
        id: newMatch.id.length === 36 ? newMatch.id : undefined,
        game_type: params.gameType,
        status: "finished",
        player1_id: params.userId,
        player1_score: params.player1Score,
        player2_id: params.isBotMatch ? null : undefined,
        player2_score: params.player2Score,
        is_bot_match: params.isBotMatch,
        winner_id: winnerId === params.userId ? params.userId : null,
        xp_reward: params.xpReward,
        finished_at: newMatch.finished_at,
      } as any)
      .then(({ error }) => {
        if (error) {
          // Table might not exist or constraint issue; localStorage ensures data safety
          console.debug("Remote game_matches persistence skipped:", error.message);
        }
      })
      .catch(() => {});
  }

  return newMatch;
}

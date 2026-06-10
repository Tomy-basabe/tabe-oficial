import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GameMatch {
  id: string;
  game_type: string;
  status: string;
  player1_id: string;
  player1_score: number;
  player2_id: string | null;
  player2_score: number;
  is_bot_match: boolean;
  current_round: number;
  max_rounds: number;
  winner_id: string | null;
  xp_reward: number;
  created_at: string;
  finished_at: string | null;
}

interface GameStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  totalXpEarned: number;
}

export function useGames() {
  const { user, isGuest } = useAuth();
  const [matchHistory, setMatchHistory] = useState<GameMatch[]>([]);
  const [stats, setStats] = useState<GameStats>({
    totalGames: 0, wins: 0, losses: 0, draws: 0, winStreak: 0, totalXpEarned: 0
  });
  const [loading, setLoading] = useState(true);
  const [userCarrera, setUserCarrera] = useState<string | null>(null);

  const fetchUserCarrera = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("carrera")
      .eq("user_id", user.id)
      .single();
    if (data) setUserCarrera((data as any).carrera || null);
  }, [user]);

  const fetchMatchHistory = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("game_matches" as any)
      .select("*")
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .eq("status", "finished")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      const matches = data as unknown as GameMatch[];
      setMatchHistory(matches);

      // Calculate stats
      let wins = 0, losses = 0, draws = 0, xp = 0, streak = 0, currentStreak = 0;
      matches.forEach(m => {
        if (m.winner_id === user.id) {
          wins++;
          currentStreak++;
          streak = Math.max(streak, currentStreak);
        } else if (m.winner_id && m.winner_id !== user.id) {
          losses++;
          currentStreak = 0;
        } else {
          draws++;
          currentStreak = 0;
        }
        xp += m.xp_reward || 0;
      });

      setStats({
        totalGames: matches.length,
        wins, losses, draws,
        winStreak: streak,
        totalXpEarned: xp
      });
    }
    setLoading(false);
  }, [user]);

  const submitCareerRequest = async (universidad: string, carrera: string) => {
    if (!user) return { error: "No autenticado" };

    const { error } = await supabase
      .from("career_requests" as any)
      .insert({
        user_id: user.id,
        nombre_universidad: universidad,
        nombre_carrera: carrera
      } as any);

    if (error) return { error: "Error al enviar solicitud" };
    return { error: null };
  };

  const updateUserCarrera = async (carrera: string, facultad: string) => {
    if (!user) return { error: "No autenticado" };

    const { error } = await supabase
      .from("profiles")
      .update({ carrera, facultad } as any)
      .eq("user_id", user.id);

    if (error) return { error: "Error al actualizar carrera" };
    setUserCarrera(carrera);
    return { error: null };
  };

  useEffect(() => {
    if (isGuest) {
      // Mock data for guest mode
      setStats({ totalGames: 7, wins: 5, losses: 1, draws: 1, winStreak: 3, totalXpEarned: 650 });
      setMatchHistory([]);
      setLoading(false);
      return;
    }
    fetchUserCarrera();
    fetchMatchHistory();
  }, [user, isGuest, fetchUserCarrera, fetchMatchHistory]);

  return {
    matchHistory,
    stats,
    loading,
    userCarrera,
    submitCareerRequest,
    updateUserCarrera,
    refetch: fetchMatchHistory
  };
}

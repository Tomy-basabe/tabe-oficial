import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  GameMatch,
  GameStats,
  getLocalMatches,
  calculateStats,
  recordGameMatch,
  GAME_STATS_EVENT,
} from "@/lib/gameStorage";

export type { GameMatch, GameStats };
export { recordGameMatch };

export function useGames() {
  const { user, isGuest } = useAuth();
  const currentUserId = user?.id || "guest";

  const [matchHistory, setMatchHistory] = useState<GameMatch[]>(() =>
    getLocalMatches(user?.id || (isGuest ? "guest" : null))
  );
  const [stats, setStats] = useState<GameStats>(() =>
    calculateStats(getLocalMatches(user?.id || (isGuest ? "guest" : null)), user?.id || (isGuest ? "guest" : null))
  );
  const [loading, setLoading] = useState(false);
  const [userCarrera, setUserCarrera] = useState<string | null>(null);

  const fetchUserCarrera = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("carrera")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setUserCarrera((data as any).carrera || null);
    } catch {
      // Ignore
    }
  }, [user]);

  const loadData = useCallback(async () => {
    const uid = user?.id || "guest";
    // 1. Instantly get from local cache
    const local = getLocalMatches(uid);
    setMatchHistory(local);
    setStats(calculateStats(local, uid));

    // 2. If authenticated, try fetching from Supabase to sync remote matches
    if (user && !isGuest) {
      try {
        const { data, error } = await supabase
          .from("game_matches" as any)
          .select("*")
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .eq("status", "finished")
          .order("created_at", { ascending: false })
          .limit(30);

        if (!error && data && Array.isArray(data)) {
          const remoteMatches = data as unknown as GameMatch[];
          // Merge remote and local (avoiding duplicates)
          const mergedMap = new Map<string, GameMatch>();
          local.forEach((m) => mergedMap.set(m.id, m));
          remoteMatches.forEach((m) => mergedMap.set(m.id, m));
          const merged = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          setMatchHistory(merged);
          setStats(calculateStats(merged, user.id));
        }
      } catch {
        // Table doesn't exist yet, local state keeps everything functioning
      }
    }
    setLoading(false);
  }, [user, isGuest]);

  const submitCareerRequest = async (universidad: string, carrera: string) => {
    if (!user) return { error: "No autenticado" };

    try {
      const { error } = await supabase
        .from("career_requests" as any)
        .insert({
          user_id: user.id,
          nombre_universidad: universidad,
          nombre_carrera: carrera,
        } as any);

      if (error) return { error: "Error al enviar solicitud" };
      return { error: null };
    } catch (e: any) {
      return { error: e.message || "Error al enviar solicitud" };
    }
  };

  const updateUserCarrera = async (carrera: string, facultad: string) => {
    if (!user) return { error: "No autenticado" };

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ carrera, facultad } as any)
        .eq("user_id", user.id);

      if (error) return { error: "Error al actualizar carrera" };
      setUserCarrera(carrera);
      return { error: null };
    } catch (e: any) {
      return { error: e.message || "Error al actualizar carrera" };
    }
  };

  useEffect(() => {
    fetchUserCarrera();
    loadData();

    // Listen for custom stats event when matches finish
    const handleStatsUpdated = () => {
      loadData();
    };

    window.addEventListener(GAME_STATS_EVENT, handleStatsUpdated);
    return () => {
      window.removeEventListener(GAME_STATS_EVENT, handleStatsUpdated);
    };
  }, [fetchUserCarrera, loadData]);

  return {
    matchHistory,
    stats,
    loading,
    userCarrera,
    submitCareerRequest,
    updateUserCarrera,
    refetch: loadData,
  };
}

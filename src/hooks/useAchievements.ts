import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { toast } from "sonner";
import { guestMockAchievements } from "@/data/mockAchievements";

export interface Achievement {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  categoria: "academico" | "estudio" | "uso" | "juegos";
  condicion_tipo: string;
  condicion_valor: number;
  xp_reward: number;
}

export interface UserAchievement {
  id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface UnlockedAchievement {
  achievement_id: string;
  achievement_name: string;
  xp_reward: number;
}

// Caché a nivel de módulo + localStorage para navegación en 0ms a /logros
let _cachedAchievements: Achievement[] | null = null;
let _cachedUserAchievements: UserAchievement[] | null = null;
let _cachedAchUserId: string | null = null;
let _cachedAchTimestamp = 0;

const ACH_CACHE_KEY = "tabe_achievements_cache_v1";

function loadStoredAchievements(userId: string) {
  try {
    const raw = localStorage.getItem(ACH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.userId === userId && Array.isArray(parsed.achievements)) {
      return parsed as {
        userId: string;
        timestamp: number;
        achievements: Achievement[];
        userAchievements: UserAchievement[];
      };
    }
  } catch {}
  return null;
}

function saveStoredAchievements(userId: string, achievements: Achievement[], userAchievements: UserAchievement[]) {
  try {
    localStorage.setItem(
      ACH_CACHE_KEY,
      JSON.stringify({
        userId,
        timestamp: Date.now(),
        achievements,
        userAchievements,
      })
    );
  } catch {}
}

export function useAchievements() {
  const { user, isGuest } = useAuth();

  if (user && user.id !== _cachedAchUserId) {
    const stored = loadStoredAchievements(user.id);
    if (stored) {
      _cachedAchievements = stored.achievements;
      _cachedUserAchievements = stored.userAchievements;
      _cachedAchTimestamp = stored.timestamp;
    } else {
      _cachedAchievements = null;
      _cachedUserAchievements = null;
      _cachedAchTimestamp = 0;
    }
    _cachedAchUserId = user.id;
  }

  const [achievements, setAchievements] = useState<Achievement[]>(
    () => _cachedAchievements || (guestMockAchievements as Achievement[])
  );
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>(
    () => _cachedUserAchievements || []
  );
  const [loading, setLoading] = useState<boolean>(
    () => _cachedUserAchievements === null && !isGuest
  );

  const fetchAchievements = useCallback(async () => {
    if (isGuest) {
      setAchievements(guestMockAchievements as Achievement[]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .order("categoria", { ascending: true })
        .order("xp_reward", { ascending: true });

      if (!error && data && data.length > 0) {
        _cachedAchievements = data as Achievement[];
        setAchievements(data as Achievement[]);
      } else if (!_cachedAchievements) {
        setAchievements(guestMockAchievements as Achievement[]);
      }
    } catch {
      if (!_cachedAchievements) {
        setAchievements(guestMockAchievements as Achievement[]);
      }
    }
  }, [isGuest]);

  const fetchUserAchievements = useCallback(async () => {
    if (!user && !isGuest) {
      setLoading(false);
      return;
    }

    if (isGuest) {
      const mocks = guestMockAchievements.slice(0, 15).map((a, idx) => ({
        id: `mock-u${idx}`,
        achievement_id: a.id,
        unlocked_at: new Date(Date.now() - Math.random() * 10 * 86400000).toISOString(),
      }));
      setUserAchievements(mocks);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user!.id);

      if (!error && data) {
        _cachedUserAchievements = data;
        _cachedAchUserId = user!.id;
        _cachedAchTimestamp = Date.now();
        saveStoredAchievements(
          user!.id,
          _cachedAchievements || (guestMockAchievements as Achievement[]),
          data
        );
        setUserAchievements(data);
      }
    } catch (e) {
      console.warn("Error fetching user achievements:", e);
    } finally {
      setLoading(false);
    }
  }, [user, isGuest]);

  // Verificar y desbloquear logros automáticamente
  const checkAndUnlockAchievements = useCallback(async (): Promise<UnlockedAchievement[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .rpc("check_and_unlock_achievements", { p_user_id: user.id });

      if (error) {
        console.error("Error checking achievements:", error);
        return [];
      }

      const unlocked = (data || []) as UnlockedAchievement[];

      unlocked.forEach((achievement) => {
        toast.success(`🏆 ¡Logro desbloqueado!`, {
          description: `${achievement.achievement_name} (+${achievement.xp_reward} XP)`,
          duration: 5000,
        });
      });

      if (unlocked.length > 0) {
        await fetchUserAchievements();
      }

      return unlocked;
    } catch (err) {
      console.error("Error in checkAndUnlockAchievements:", err);
      return [];
    }
  }, [user, fetchUserAchievements]);

  // Cargar datos iniciales (con caché de 15 minutos para ahorrar consultas)
  useEffect(() => {
    const isFresh =
      _cachedAchievements !== null &&
      _cachedUserAchievements !== null &&
      Date.now() - _cachedAchTimestamp < 15 * 60 * 1000;

    if (isFresh) {
      setLoading(false);
      return;
    }

    fetchAchievements();
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    fetchUserAchievements().finally(() => {
      clearTimeout(timer);
      setLoading(false);
    });

    return () => clearTimeout(timer);
  }, [user, isGuest, fetchAchievements, fetchUserAchievements]);

  // Suscripción a cambios en user_achievements con debounce
  const achievementsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useRealtimeSubscription({
    table: "user_achievements",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChange: useCallback(() => {
      if (achievementsDebounceRef.current) clearTimeout(achievementsDebounceRef.current);
      achievementsDebounceRef.current = setTimeout(() => {
        fetchUserAchievements();
      }, 400);
    }, [fetchUserAchievements]),
    enabled: !!user,
  });

  // Helpers
  const isUnlocked = useCallback(
    (achievementId: string) => {
      return userAchievements.some((ua) => ua.achievement_id === achievementId);
    },
    [userAchievements]
  );

  const getUnlockDate = useCallback(
    (achievementId: string) => {
      const ua = userAchievements.find((ua) => ua.achievement_id === achievementId);
      if (!ua) return null;
      return new Date(ua.unlocked_at).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    },
    [userAchievements]
  );

  const stats = {
    total: achievements.length,
    unlocked: userAchievements.length,
    totalXP: userAchievements.reduce((sum, ua) => {
      const achievement = achievements.find((a) => a.id === ua.achievement_id);
      return sum + (achievement?.xp_reward || 0);
    }, 0),
  };

  const getAchievementsByCategory = useCallback(
    (category?: string) => {
      if (!category) return achievements;
      return achievements.filter((a) => a.categoria === category);
    },
    [achievements]
  );

  return {
    achievements,
    userAchievements,
    loading,
    stats,
    isUnlocked,
    getUnlockDate,
    getAchievementsByCategory,
    checkAndUnlockAchievements,
    refetch: fetchUserAchievements,
  };
}

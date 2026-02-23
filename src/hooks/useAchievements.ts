import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { toast } from "sonner";

export interface Achievement {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  categoria: "academico" | "estudio" | "uso";
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

export function useAchievements() {
  const { user, isGuest } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    if (isGuest) {
      setAchievements([
        {
          id: "3e5a3055-7cf0-4bb5-a3d5-e517ab5ebd5c",
          nombre: "Primera Sangre",
          descripcion: "Realiza tu primera sesión de estudio.",
          icono: "🩸",
          categoria: "estudio",
          condicion_tipo: "sesiones_estudio",
          condicion_valor: 1,
          xp_reward: 100
        },
        {
          id: "a1",
          nombre: "Maratonista",
          descripcion: "Alcanza una racha de 7 días consecutivos.",
          icono: "🔥",
          categoria: "academico",
          condicion_tipo: "racha_dias",
          condicion_valor: 7,
          xp_reward: 500
        },
        {
          id: "a2",
          nombre: "Maestro del Pomodoro",
          descripcion: "Completa 50 horas de estudio con Pomodoro.",
          icono: "🍅",
          categoria: "uso",
          condicion_tipo: "horas_pomodoro",
          condicion_valor: 50,
          xp_reward: 1000
        }
      ]);
      return;
    }

    const { data, error } = await supabase
      .from("achievements")
      .select("*")
      .order("categoria", { ascending: true })
      .order("xp_reward", { ascending: true });

    if (!error && data) {
      setAchievements(data as Achievement[]);
    }
  }, [isGuest]);

  const fetchUserAchievements = useCallback(async () => {
    if (!user && !isGuest) return;

    if (isGuest) {
      // Mock user achievements corresponding to our mock achievements above
      const mocks = [
        {
          id: `mock-u1`,
          achievement_id: "3e5a3055-7cf0-4bb5-a3d5-e517ab5ebd5c",
          unlocked_at: new Date().toISOString()
        },
        {
          id: `mock-u2`,
          achievement_id: "a1",
          unlocked_at: new Date(Date.now() - 86400000).toISOString()
        }
      ];
      setUserAchievements(mocks);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", user.id);

    if (!error && data) {
      setUserAchievements(data);
    }
    setLoading(false);
  }, [user, isGuest]);

  // Verificar y desbloquear logros automáticamente
  const checkAndUnlockAchievements = useCallback(async (): Promise<UnlockedAchievement[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .rpc('check_and_unlock_achievements', { p_user_id: user.id });

      if (error) {
        console.error("Error checking achievements:", error);
        return [];
      }

      const unlocked = (data || []) as UnlockedAchievement[];

      // Mostrar notificación por cada logro desbloqueado
      unlocked.forEach((achievement) => {
        toast.success(`🏆 ¡Logro desbloqueado!`, {
          description: `${achievement.achievement_name} (+${achievement.xp_reward} XP)`,
          duration: 5000,
        });
      });

      // Refrescar logros del usuario si se desbloquearon nuevos
      if (unlocked.length > 0) {
        await fetchUserAchievements();
      }

      return unlocked;
    } catch (err) {
      console.error("Error in checkAndUnlockAchievements:", err);
      return [];
    }
  }, [user, fetchUserAchievements]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  useEffect(() => {
    if (user) {
      fetchUserAchievements();
    }
  }, [user, fetchUserAchievements]);

  // Suscripción a cambios en user_achievements
  useRealtimeSubscription({
    table: "user_achievements",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChange: () => {
      fetchUserAchievements();
    },
    enabled: !!user,
  });

  // Helpers
  const isUnlocked = useCallback((achievementId: string) => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  }, [userAchievements]);

  const getUnlockDate = useCallback((achievementId: string) => {
    const ua = userAchievements.find(ua => ua.achievement_id === achievementId);
    if (!ua) return null;
    return new Date(ua.unlocked_at).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, [userAchievements]);

  const stats = {
    total: achievements.length,
    unlocked: userAchievements.length,
    totalXP: userAchievements.reduce((sum, ua) => {
      const achievement = achievements.find(a => a.id === ua.achievement_id);
      return sum + (achievement?.xp_reward || 0);
    }, 0),
  };

  const getAchievementsByCategory = useCallback((category?: string) => {
    if (!category) return achievements;
    return achievements.filter(a => a.categoria === category);
  }, [achievements]);

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

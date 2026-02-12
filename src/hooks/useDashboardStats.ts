import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubjects } from "./useSubjects";
import { useRealtimeSubscription } from "./useRealtimeSubscription";

// Helper: format Date as YYYY-MM-DD in local timezone (avoids UTC offset issues)
const toLocalDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
interface StudySession {
  id: string;
  duracion_segundos: number;
  fecha: string;
  completada: boolean;
}

interface UserStats {
  xp_total: number;
  nivel: number;
  racha_actual: number;
  mejor_racha: number;
  horas_estudio_total: number;
}

interface WeekDay {
  day: string;
  studied: boolean;
  minutes: number;
  date: Date;
}

export function useDashboardStats() {
  const { user } = useAuth();
  const { subjects } = useSubjects();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch user stats
      const { data: statsData } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: sessionsData } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("fecha", toLocalDateStr(thirtyDaysAgo))
        .order("fecha", { ascending: false });

      setUserStats(statsData);
      setStudySessions(sessionsData || []);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Realtime subscriptions
  useRealtimeSubscription({
    table: "user_stats",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChange: useCallback(() => {
      console.log("📡 Realtime: user_stats changed, refetching...");
      fetchStats();
    }, [fetchStats]),
    enabled: !!user,
  });

  useRealtimeSubscription({
    table: "study_sessions",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChange: useCallback(() => {
      console.log("📡 Realtime: study_sessions changed, refetching...");
      fetchStats();
    }, [fetchStats]),
    enabled: !!user,
  });

  // Calculate subject statistics
  const subjectStats = {
    total: subjects.length,
    aprobadas: subjects.filter(s => s.status === "aprobada").length,
    regulares: subjects.filter(s => s.status === "regular").length,
    cursables: subjects.filter(s => s.status === "cursable").length,
    bloqueadas: subjects.filter(s => s.status === "bloqueada").length,
  };

  // Calculate progress percentage
  const progressPercentage = subjectStats.total > 0
    ? Math.round((subjectStats.aprobadas / subjectStats.total) * 100)
    : 0;

  // Calculate average grade
  const approvedWithGrades = subjects.filter(s => s.status === "aprobada" && s.nota);
  const averageGrade = approvedWithGrades.length > 0
    ? (approvedWithGrades.reduce((acc, s) => acc + (s.nota || 0), 0) / approvedWithGrades.length).toFixed(1)
    : "0.0";

  // Calculate study hours this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthSessions = studySessions.filter(s => new Date(s.fecha) >= startOfMonth);
  const monthStudySeconds = monthSessions.reduce((acc, s) => acc + s.duracion_segundos, 0);
  const monthStudyHours = Math.round(monthStudySeconds / 3600);

  // Calculate week data for streak display
  const getWeekData = (): WeekDay[] => {
    const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const today = new Date();
    const weekData: WeekDay[] = [];

    // Get the start of the current week (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(today.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = toLocalDateStr(date);

      const daySessions = studySessions.filter(s => s.fecha === dateStr);
      const totalMinutes = Math.round(daySessions.reduce((acc, s) => acc + s.duracion_segundos, 0) / 60);

      weekData.push({
        day: days[(date.getDay())],
        studied: totalMinutes > 0,
        minutes: totalMinutes,
        date,
      });
    }

    return weekData;
  };

  // Calculate progress by year
  const getYearProgress = () => {
    const years = [...new Set(subjects.map(s => s.año))].sort((a, b) => a - b);
    return years.map(year => {
      const yearSubjects = subjects.filter(s => s.año === year);
      const yearApproved = yearSubjects.filter(s => s.status === "aprobada").length;
      const percentage = yearSubjects.length > 0
        ? Math.round((yearApproved / yearSubjects.length) * 100)
        : 0;
      return { year, total: yearSubjects.length, approved: yearApproved, percentage };
    });
  };

  // Get recent subjects (mix of approved and in-progress)
  const getRecentSubjects = () => {
    // Priority: cursable, regular, then recent approved
    const cursables = subjects.filter(s => s.status === "cursable").slice(0, 3);
    const regulares = subjects.filter(s => s.status === "regular").slice(0, 2);
    const aprobadas = subjects.filter(s => s.status === "aprobada").slice(0, 2);

    return [...cursables, ...regulares, ...aprobadas].slice(0, 6);
  };

  return {
    loading,
    userStats,
    subjectStats,
    progressPercentage,
    averageGrade,
    monthStudyHours,
    weekData: getWeekData(),
    yearProgress: getYearProgress(),
    recentSubjects: getRecentSubjects(),
    refetch: fetchStats,
  };
}

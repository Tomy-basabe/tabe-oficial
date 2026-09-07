import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubjects } from "./useSubjects";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import { toLocalDateStr } from "@/lib/utils";

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
  isToday?: boolean;
}

function computeStudyStreak(allDates: string[], storedBestStreak = 0): { currentStreak: number; bestStreak: number } {
  if (!allDates || allDates.length === 0) {
    return { currentStreak: 0, bestStreak: storedBestStreak };
  }

  // Normalize all dates to unique YYYY-MM-DD
  const dateSet = new Set<string>();
  for (const d of allDates) {
    const s = toLocalDateStr(d);
    if (s) dateSet.add(s);
  }

  const todayStr = toLocalDateStr(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toLocalDateStr(yesterday);

  // 1. Calculate CURRENT STREAK
  let currentStreak = 0;
  let startCheckDate: Date | null = null;

  if (dateSet.has(todayStr)) {
    // Studied today: count starting from today backwards
    startCheckDate = new Date();
  } else if (dateSet.has(yesterdayStr)) {
    // Not studied today yet, but studied yesterday: streak is still active!
    startCheckDate = new Date(yesterday);
  }

  if (startCheckDate) {
    const cursor = new Date(startCheckDate);
    while (true) {
      const curStr = toLocalDateStr(cursor);
      if (dateSet.has(curStr)) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // 2. Calculate BEST STREAK across all history
  const sortedDatesAsc = Array.from(dateSet).sort();
  let maxRun = 0;
  let currentRun = 0;
  let prevDate: Date | null = null;

  for (const dStr of sortedDatesAsc) {
    const [y, m, d] = dStr.split("-").map(Number);
    const curDate = new Date(y, m - 1, d);

    if (!prevDate) {
      currentRun = 1;
    } else {
      const diffMs = curDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentRun++;
      } else {
        currentRun = 1;
      }
    }
    if (currentRun > maxRun) maxRun = currentRun;
    prevDate = curDate;
  }

  const bestStreak = Math.max(maxRun, storedBestStreak, currentStreak);

  return { currentStreak, bestStreak };
}

// Module-level cache for instantaneous navigation between pages (stale-while-revalidate)
let _cachedUserStats: UserStats | null = null;
let _cachedStudySessions: StudySession[] | null = null;
let _cachedStatsUserId: string | null = null;

export function useDashboardStats() {
  const { user, isGuest } = useAuth();
  const { subjects } = useSubjects();

  // Invalidate cache if user changes
  if (user && user.id !== _cachedStatsUserId) {
    _cachedUserStats = null;
    _cachedStudySessions = null;
    _cachedStatsUserId = user.id;
  }

  const [userStats, setUserStats] = useState<UserStats | null>(_cachedUserStats);
  const [studySessions, setStudySessions] = useState<StudySession[]>(_cachedStudySessions || []);
  const [loading, setLoading] = useState<boolean>(!_cachedUserStats);

  const hasAutoHealedStreak = useRef(false);
  const realtimeDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStats = useCallback(async (showLoading = !_cachedUserStats) => {
    if (!user && !isGuest) {
      setLoading(false);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (isGuest) {
      const guestStats = {
        xp_total: 4150, // 4150 / 100 + 1 => Nivel 42
        nivel: 42,
        racha_actual: 14,
        mejor_racha: 35,
        horas_estudio_total: 312
      };

      const today = new Date();
      const sessions = [];
      // Generate 14 days of intense study sessions
      for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        sessions.push({
          id: `mock-session-${i}`,
          duracion_segundos: Math.floor(Math.random() * 3600) + 7200, // 2-3 hours daily
          fecha: toLocalDateStr(d),
          completada: true
        });
      }

      _cachedUserStats = guestStats;
      _cachedStudySessions = sessions;
      setUserStats(guestStats);
      setStudySessions(sessions);
      setLoading(false);
      return;
    }

    if (!user) return;

    try {
      if (showLoading) setLoading(true);

      // SAFETY TIMEOUT: Ensure loading is cleared even if Supabase hangs
      timeoutId = setTimeout(() => {
        setLoading(current => {
          if (current) {
            console.warn("Dashboard stats fetch timed out, forcing loading to false");
            return false;
          }
          return current;
        });
      }, 8000);

      // Fetch user stats and sessions
      const { data: statsData } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [sessionsRes, allDatesRes] = await Promise.all([
        supabase
          .from("study_sessions")
          .select("*")
          .eq("user_id", user.id)
          .gte("fecha", toLocalDateStr(thirtyDaysAgo))
          .order("fecha", { ascending: false }),
        supabase
          .from("study_sessions")
          .select("fecha")
          .eq("user_id", user.id)
      ]);

      const sessionsData = sessionsRes.data || [];
      const allDates = (allDatesRes.data || []).map(r => r.fecha).filter(Boolean);

      const { currentStreak, bestStreak } = computeStudyStreak(
        allDates,
        statsData?.mejor_racha || 0
      );

      const mergedStats: UserStats = {
        xp_total: statsData?.xp_total ?? 0,
        nivel: statsData?.nivel ?? 1,
        racha_actual: currentStreak,
        mejor_racha: bestStreak,
        horas_estudio_total: statsData?.horas_estudio_total ?? 0,
      };

      // Auto-heal database record if out of sync (run at most once per session to avoid realtime feedback loops)
      if (!hasAutoHealedStreak.current && statsData && (statsData.racha_actual !== currentStreak || (statsData.mejor_racha ?? 0) < bestStreak)) {
        hasAutoHealedStreak.current = true;
        supabase
          .from("user_stats")
          .update({
            racha_actual: currentStreak,
            mejor_racha: bestStreak,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id)
          .then(({ error }) => {
            if (error) console.error("Error updating streak in user_stats:", error);
          });
      }

      _cachedUserStats = mergedStats;
      _cachedStudySessions = sessionsData;
      setUserStats(mergedStats);
      setStudySessions(sessionsData);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [user, isGuest]);

  useEffect(() => {
    fetchStats(!_cachedUserStats);
  }, [fetchStats]);

  const debouncedFetchStats = useCallback(() => {
    if (realtimeDebounceTimer.current) clearTimeout(realtimeDebounceTimer.current);
    realtimeDebounceTimer.current = setTimeout(() => {
      fetchStats(false);
    }, 500);
  }, [fetchStats]);

  // Realtime subscriptions with debouncing and user scoping
  useRealtimeSubscription({
    table: "user_stats",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChange: debouncedFetchStats,
    enabled: !!user,
  });

  useRealtimeSubscription({
    table: "study_sessions",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChange: debouncedFetchStats,
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
  const startOfMonthStr = toLocalDateStr(startOfMonth);
  const monthSessions = studySessions.filter(s => toLocalDateStr(s.fecha) >= startOfMonthStr);
  const monthStudySeconds = monthSessions.reduce((acc, s) => acc + s.duracion_segundos, 0);
  const monthStudyHours = Math.round(monthStudySeconds / 3600);

  // Calculate week data for streak display
  const getWeekData = (): WeekDay[] => {
    const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const today = new Date();
    const todayStr = toLocalDateStr(today);
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

      const daySessions = studySessions.filter(s => {
        if (!s.fecha) return false;
        return toLocalDateStr(s.fecha) === dateStr;
      });
      const totalMinutes = Math.round(daySessions.reduce((acc, s) => acc + s.duracion_segundos, 0) / 60);

      weekData.push({
        day: days[(date.getDay())],
        studied: totalMinutes > 0,
        minutes: totalMinutes,
        date,
        isToday: dateStr === todayStr,
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

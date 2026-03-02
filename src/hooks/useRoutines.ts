import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { startOfWeek, endOfWeek, format, addDays, isWithinInterval, parseISO } from "date-fns";

export interface Routine {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    category: string;
    subject_id: string | null;
    color: string;
    days_of_week: number[];
    start_date: string;
    end_date: string | null;
    is_active: boolean;
    created_at: string;
}

export interface RoutineLog {
    id: string;
    routine_id: string;
    user_id: string;
    log_date: string;
    status: "pending" | "completed" | "partial" | "missed";
    completion_percentage: number;
    notes: string | null;
    created_at: string;
}

export type RoutineFormData = {
    name: string;
    description?: string;
    category: string;
    subject_id?: string | null;
    color: string;
    days_of_week: number[];
    start_date: string;
    end_date?: string;
};

export type LogFormData = {
    status: "completed" | "partial" | "missed";
    completion_percentage: number;
    notes?: string;
};

export const CATEGORIES = [
    { id: "general", label: "General", emoji: "📌" },
    { id: "estudio", label: "Estudio", emoji: "📚" },
    { id: "salud", label: "Salud", emoji: "💊" },
    { id: "deporte", label: "Deporte", emoji: "🏋️" },
    { id: "bienestar", label: "Bienestar", emoji: "🧘" },
    { id: "trabajo", label: "Trabajo", emoji: "💼" },
];

export const COLOR_OPTIONS = [
    "#00FFAA", "#B026FF", "#FFD700", "#FF6B6B",
    "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#F7DC6F", "#82E0AA", "#AED6F1",
];

export const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DAY_LABELS_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function useRoutines() {
    const { user } = useAuth();
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [logs, setLogs] = useState<RoutineLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
        startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday-based
    );

    const fetchRoutines = useCallback(async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from("routines")
            .select("*")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .order("created_at", { ascending: true });

        if (error) { console.error("Error fetching routines:", error); return; }
        setRoutines((data as Routine[]) || []);
    }, [user]);

    const fetchLogsForWeek = useCallback(async (weekStart: Date) => {
        if (!user) return;
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const { data, error } = await supabase
            .from("routine_logs")
            .select("*")
            .eq("user_id", user.id)
            .gte("log_date", format(weekStart, "yyyy-MM-dd"))
            .lte("log_date", format(weekEnd, "yyyy-MM-dd"));

        if (error) { console.error("Error fetching logs:", error); return; }
        setLogs((data as RoutineLog[]) || []);
    }, [user]);

    const createRoutine = async (formData: RoutineFormData) => {
        if (!user) return;
        const { error } = await supabase.from("routines").insert({
            user_id: user.id,
            ...formData,
        });
        if (error) { toast.error("Error al crear rutina"); return; }
        toast.success("✅ Rutina creada");
        fetchRoutines();
    };

    const updateRoutine = async (id: string, formData: Partial<RoutineFormData>) => {
        if (!user) return;
        const { error } = await supabase
            .from("routines")
            .update(formData)
            .eq("id", id)
            .eq("user_id", user.id);
        if (error) { toast.error("Error al actualizar rutina"); return; }
        toast.success("Rutina actualizada");
        fetchRoutines();
    };

    const deleteRoutine = async (id: string) => {
        if (!user) return;
        const { error } = await supabase
            .from("routines")
            .update({ is_active: false })
            .eq("id", id)
            .eq("user_id", user.id);
        if (error) { toast.error("Error al eliminar rutina"); return; }
        toast.success("Rutina eliminada");
        fetchRoutines();
        fetchLogsForWeek(currentWeekStart);
    };

    // Stops a routine at today (sets end_date = today), keeping all logs
    const stopRoutine = async (id: string) => {
        if (!user) return;
        const today = format(new Date(), "yyyy-MM-dd");
        const { error } = await supabase
            .from("routines")
            .update({ end_date: today })
            .eq("id", id)
            .eq("user_id", user.id);
        if (error) { toast.error("Error al cortar rutina"); return; }
        toast.success("⏹️ Rutina cortada — no aparecerá a partir de mañana");
        fetchRoutines();
    };

    const logRoutine = async (
        routineId: string,
        logDate: string,
        logData: LogFormData
    ) => {
        if (!user) return;
        const { error } = await supabase
            .from("routine_logs")
            .upsert({
                routine_id: routineId,
                user_id: user.id,
                log_date: logDate,
                status: logData.status,
                completion_percentage: logData.status === "completed" ? 100
                    : logData.status === "missed" ? 0
                        : logData.completion_percentage,
                notes: logData.notes || null,
            }, { onConflict: "routine_id,log_date" });

        if (error) { toast.error("Error al registrar rutina"); return; }

        const msg = logData.status === "completed"
            ? "🎉 ¡Rutina completada!"
            : logData.status === "partial"
                ? `⚡ Rutina completada al ${logData.completion_percentage}%`
                : "📝 Rutina registrada como no cumplida";
        toast.success(msg);
        fetchLogsForWeek(currentWeekStart);
    };

    // Get routines that are active on a specific date
    const getRoutinesForDate = useCallback((date: Date): Routine[] => {
        const dayOfWeek = date.getDay(); // 0=Sun, ..., 6=Sat
        const dateStr = format(date, "yyyy-MM-dd");
        return routines.filter((r) => {
            if (!r.days_of_week.includes(dayOfWeek)) return false;
            if (r.start_date > dateStr) return false;
            if (r.end_date && r.end_date < dateStr) return false;
            return true;
        });
    }, [routines]);

    const getLogForRoutineAndDate = useCallback((routineId: string, dateStr: string): RoutineLog | undefined => {
        return logs.find((l) => l.routine_id === routineId && l.log_date === dateStr);
    }, [logs]);

    // Weekly stats
    const weekStats = useCallback(() => {
        const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
        let totalScheduled = 0;
        let totalDone = 0;
        for (const day of weekDays) {
            const dayRoutines = getRoutinesForDate(day);
            const dateStr = format(day, "yyyy-MM-dd");
            totalScheduled += dayRoutines.length;
            for (const r of dayRoutines) {
                const log = getLogForRoutineAndDate(r.id, dateStr);
                if (log && (log.status === "completed" || log.status === "partial")) {
                    totalDone += log.completion_percentage / 100;
                }
            }
        }
        return {
            scheduled: totalScheduled,
            done: totalDone,
            pct: totalScheduled > 0 ? Math.round((totalDone / totalScheduled) * 100) : 0,
        };
    }, [currentWeekStart, getRoutinesForDate, getLogForRoutineAndDate]);

    // Per-routine streak calculation
    const getRoutineStreak = useCallback((routineId: string): number => {
        // Look backwards from today
        let streak = 0;
        let checkDate = new Date();
        for (let i = 0; i < 30; i++) {
            const dateStr = format(checkDate, "yyyy-MM-dd");
            const routine = routines.find((r) => r.id === routineId);
            if (!routine) break;
            const dayOfWeek = checkDate.getDay();
            if (routine.days_of_week.includes(dayOfWeek)) {
                const log = logs.find(l => l.routine_id === routineId && l.log_date === dateStr);
                if (log && (log.status === "completed" || log.status === "partial")) {
                    streak++;
                } else {
                    break;
                }
            }
            checkDate = addDays(checkDate, -1);
        }
        return streak;
    }, [routines, logs]);

    const goToPrevWeek = () => {
        const prev = addDays(currentWeekStart, -7);
        setCurrentWeekStart(prev);
        fetchLogsForWeek(prev);
    };

    const goToNextWeek = () => {
        const next = addDays(currentWeekStart, 7);
        setCurrentWeekStart(next);
        fetchLogsForWeek(next);
    };

    const goToCurrentWeek = () => {
        const now = startOfWeek(new Date(), { weekStartsOn: 1 });
        setCurrentWeekStart(now);
        fetchLogsForWeek(now);
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchRoutines(), fetchLogsForWeek(currentWeekStart)]);
            setLoading(false);
        };
        if (user) load();
    }, [user]);

    return {
        routines,
        logs,
        loading,
        currentWeekStart,
        createRoutine,
        updateRoutine,
        deleteRoutine,
        stopRoutine,
        logRoutine,
        getRoutinesForDate,
        getLogForRoutineAndDate,
        weekStats,
        getRoutineStreak,
        goToPrevWeek,
        goToNextWeek,
        goToCurrentWeek,
    };
}

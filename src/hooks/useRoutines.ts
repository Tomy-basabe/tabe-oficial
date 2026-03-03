import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { startOfWeek, endOfWeek, format, addDays, parseISO } from "date-fns";

// ────────────────────────────── Types ──────────────────────────────

export interface Routine {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    category: string;
    subject_id: string | null;
    color: string;
    start_time: string; // "HH:mm"
    end_time: string;
    days_of_week: number[];
    start_date: string;
    end_date: string | null;
    is_active: boolean;
    created_at: string;
}

export interface RoutineOverride {
    id: string;
    routine_id: string;
    effective_from: string;
    days_of_week: number[] | null;
    start_time: string | null;
    end_time: string | null;
    name: string | null;
    is_cancelled: boolean;
    created_at: string;
}

export interface RoutineLog {
    id: string;
    routine_id: string;
    user_id: string;
    log_date: string;
    completed: boolean;
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
    start_time: string;
    end_time: string;
    days_of_week: number[];
    start_date: string;
    end_date?: string;
};

export type LogFormData = {
    completed: boolean;
    completion_percentage: number;
    notes?: string;
};

/** Resolved routine for a specific date (after applying overrides) */
export interface ResolvedRoutine extends Routine {
    _overrideId?: string;
}

// ────────────────────────────── Constants ──────────────────────────

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

export const TIME_BLOCKS = [
    "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "00:00",
];

// ────────────────────────────── Helpers ────────────────────────────

function resolveRoutineForDate(routine: Routine, overrides: RoutineOverride[], dateStr: string): ResolvedRoutine | null {
    // Find the most recent override whose effective_from <= dateStr
    const applicable = overrides
        .filter(o => o.routine_id === routine.id && o.effective_from <= dateStr)
        .sort((a, b) => b.effective_from.localeCompare(a.effective_from));

    const override = applicable[0];

    if (override?.is_cancelled) return null;

    const resolved: ResolvedRoutine = {
        ...routine,
        name: override?.name ?? routine.name,
        days_of_week: override?.days_of_week ?? routine.days_of_week,
        start_time: override?.start_time ?? routine.start_time,
        end_time: override?.end_time ?? routine.end_time,
        _overrideId: override?.id,
    };

    return resolved;
}

function timeToMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
}

// ────────────────────────────── Hook ───────────────────────────────

export function useRoutines() {
    const { user } = useAuth();
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [overrides, setOverrides] = useState<RoutineOverride[]>([]);
    const [logs, setLogs] = useState<RoutineLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
        startOfWeek(new Date(), { weekStartsOn: 1 })
    );

    // ─── Fetch ────────────────────────────────────

    const fetchRoutines = useCallback(async () => {
        if (!user) return;
        try {
            const rRes = await supabase.from("routines").select("*").eq("user_id", user.id).eq("is_active", true).order("start_time");
            if (rRes.error) { console.error(rRes.error); return; }

            const routinesData = (rRes.data as Routine[]) || [];
            setRoutines(routinesData);

            if (routinesData.length > 0) {
                const routineIds = routinesData.map(r => r.id);
                const oRes = await supabase.from("routine_overrides").select("*").in("routine_id", routineIds);
                if (oRes.error) { console.error(oRes.error); }
                setOverrides((oRes.data as RoutineOverride[]) || []);
            } else {
                setOverrides([]);
            }
        } catch (error) {
            console.error("Error fetching routines:", error);
        }
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
        if (error) { console.error(error); return; }
        setLogs((data as RoutineLog[]) || []);
    }, [user]);

    // ─── CRUD ─────────────────────────────────────

    const createRoutine = async (formData: RoutineFormData) => {
        if (!user) return;
        const { error } = await supabase.from("routines").insert({
            user_id: user.id,
            name: formData.name,
            description: formData.description || null,
            category: formData.category,
            subject_id: formData.subject_id || null,
            color: formData.color,
            start_time: formData.start_time,
            end_time: formData.end_time,
            days_of_week: formData.days_of_week,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
        });
        if (error) { toast.error("Error al crear rutina"); console.error(error); return; }
        toast.success("✅ Rutina creada");
        fetchRoutines();
    };

    const updateRoutine = async (id: string, formData: Partial<RoutineFormData>) => {
        if (!user) return;
        const { error } = await supabase.from("routines").update(formData as any).eq("id", id).eq("user_id", user.id);
        if (error) { toast.error("Error al actualizar"); return; }
        toast.success("Rutina actualizada");
        fetchRoutines();
    };

    /** Create an override that applies changes only from a given date forward */
    const editRoutineFromDate = async (routineId: string, changes: Partial<RoutineFormData>, fromDate: string) => {
        if (!user) return;
        const { error } = await supabase.from("routine_overrides").insert({
            routine_id: routineId,
            effective_from: fromDate,
            days_of_week: changes.days_of_week ?? null,
            start_time: changes.start_time ?? null,
            end_time: changes.end_time ?? null,
            name: changes.name ?? null,
            is_cancelled: false,
        });
        if (error) { toast.error("Error al crear override"); return; }
        toast.success("✅ Cambios aplicados desde " + fromDate);
        fetchRoutines();
    };

    const stopRoutine = async (id: string) => {
        if (!user) return;
        const today = format(new Date(), "yyyy-MM-dd");
        const { error } = await supabase.from("routines").update({ end_date: today }).eq("id", id).eq("user_id", user.id);
        if (error) { toast.error("Error al cortar rutina"); return; }
        toast.success("⏹️ Rutina cortada");
        fetchRoutines();
    };

    const deleteRoutine = async (id: string) => {
        if (!user) return;
        const { error } = await supabase.from("routines").update({ is_active: false }).eq("id", id).eq("user_id", user.id);
        if (error) { toast.error("Error al eliminar"); return; }
        toast.success("Rutina eliminada");
        fetchRoutines();
        fetchLogsForWeek(currentWeekStart);
    };

    // ─── Logging ──────────────────────────────────

    const logRoutine = async (routineId: string, logDate: string, logData: LogFormData) => {
        if (!user) return;
        const { error } = await supabase.from("routine_logs").upsert({
            routine_id: routineId,
            user_id: user.id,
            log_date: logDate,
            completed: logData.completed,
            completion_percentage: logData.completed ? 100 : logData.completion_percentage,
            notes: logData.notes || null,
        }, { onConflict: "routine_id,log_date" });
        if (error) { toast.error("Error al registrar"); console.error(error); return; }
        toast.success(logData.completed ? "🎉 ¡Rutina completada!" : `⚡ Registrado al ${logData.completion_percentage}%`);
        fetchLogsForWeek(currentWeekStart);
    };

    // ─── Resolvers ────────────────────────────────

    const getRoutinesForDate = useCallback((date: Date): ResolvedRoutine[] => {
        const dayOfWeek = date.getDay();
        const dateStr = format(date, "yyyy-MM-dd");

        return routines
            .map(r => {
                if (r.start_date > dateStr) return null;
                if (r.end_date && r.end_date < dateStr) return null;
                const resolved = resolveRoutineForDate(r, overrides, dateStr);
                if (!resolved) return null;
                if (!resolved.days_of_week.includes(dayOfWeek)) return null;
                return resolved;
            })
            .filter(Boolean) as ResolvedRoutine[];
    }, [routines, overrides]);

    const getLogForRoutineAndDate = useCallback((routineId: string, dateStr: string): RoutineLog | undefined => {
        return logs.find(l => l.routine_id === routineId && l.log_date === dateStr);
    }, [logs]);

    // ─── Stats ────────────────────────────────────

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
                if (log) {
                    if (log.completed) totalDone += 1;
                    else if (log.completion_percentage > 0) totalDone += log.completion_percentage / 100;
                }
            }
        }
        return {
            scheduled: totalScheduled,
            done: Math.round(totalDone * 10) / 10,
            pct: totalScheduled > 0 ? Math.round((totalDone / totalScheduled) * 100) : 0,
        };
    }, [currentWeekStart, getRoutinesForDate, getLogForRoutineAndDate]);

    const getRoutineStreak = useCallback((routineId: string): number => {
        let streak = 0;
        let checkDate = new Date();
        for (let i = 0; i < 60; i++) {
            const dateStr = format(checkDate, "yyyy-MM-dd");
            const routine = routines.find(r => r.id === routineId);
            if (!routine) break;
            const dayOfWeek = checkDate.getDay();
            const resolved = resolveRoutineForDate(routine, overrides, dateStr);
            if (resolved && resolved.days_of_week.includes(dayOfWeek)) {
                const log = logs.find(l => l.routine_id === routineId && l.log_date === dateStr);
                if (log && (log.completed || log.completion_percentage > 0)) {
                    streak++;
                } else {
                    break;
                }
            }
            checkDate = addDays(checkDate, -1);
        }
        return streak;
    }, [routines, overrides, logs]);

    // ─── Navigation ───────────────────────────────

    const goToPrevWeek = () => { const p = addDays(currentWeekStart, -7); setCurrentWeekStart(p); fetchLogsForWeek(p); };
    const goToNextWeek = () => { const n = addDays(currentWeekStart, 7); setCurrentWeekStart(n); fetchLogsForWeek(n); };
    const goToCurrentWeek = () => { const now = startOfWeek(new Date(), { weekStartsOn: 1 }); setCurrentWeekStart(now); fetchLogsForWeek(now); };

    // ─── Init ─────────────────────────────────────

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                await Promise.all([fetchRoutines(), fetchLogsForWeek(currentWeekStart)]);
            } catch (error) {
                console.error("Error initializing routines:", error);
            } finally {
                setLoading(false);
            }
        };
        if (user) load();
        else setLoading(false);
    }, [user, fetchRoutines, fetchLogsForWeek, currentWeekStart]);

    return {
        routines, overrides, logs, loading, currentWeekStart,
        createRoutine, updateRoutine, editRoutineFromDate, deleteRoutine, stopRoutine, logRoutine,
        getRoutinesForDate, getLogForRoutineAndDate, weekStats, getRoutineStreak,
        goToPrevWeek, goToNextWeek, goToCurrentWeek,
        TIME_BLOCKS,
    };
}

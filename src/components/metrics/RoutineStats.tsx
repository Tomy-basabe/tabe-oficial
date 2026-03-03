import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { subDays, eachDayOfInterval, format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CheckCircle, TrendingUp, BookOpen, Calendar, Target } from "lucide-react";
import { DateRange } from "@/components/metrics/DateRangeFilter";

interface RoutineForMetrics {
    id: string;
    name: string;
    subject_id: string | null;
    days_of_week: number[];
    start_date: string;
    end_date: string | null;
    is_active: boolean;
    color: string;
}

interface RoutineLogForMetrics {
    routine_id: string;
    log_date: string;
    completed: boolean;
    completion_percentage: number;
}

interface SubjectInfo {
    id: string;
    nombre: string;
    año: number;
}

interface Props {
    dateRange: DateRange;
}

export function RoutineStats({ dateRange }: Props) {
    const { user, isGuest } = useAuth();
    const [routines, setRoutines] = useState<RoutineForMetrics[]>([]);
    const [logs, setLogs] = useState<RoutineLogForMetrics[]>([]);
    const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user && !isGuest) return;
        setLoading(true);

        if (isGuest) {
            setRoutines([]);
            setLogs([]);
            setSubjects([]);
            setLoading(false);
            return;
        }

        try {
            const fromStr = format(dateRange.from, "yyyy-MM-dd");
            const toStr = format(dateRange.to, "yyyy-MM-dd");

            const [rRes, lRes, sRes] = await Promise.all([
                supabase.from("routines").select("id, name, subject_id, days_of_week, start_date, end_date, is_active, color").eq("user_id", user!.id),
                supabase.from("routine_logs").select("routine_id, log_date, completed, completion_percentage").eq("user_id", user!.id).gte("log_date", fromStr).lte("log_date", toStr),
                supabase.from("subjects").select("id, nombre, año"),
            ]);

            setRoutines((rRes.data as RoutineForMetrics[]) || []);
            setLogs((lRes.data as RoutineLogForMetrics[]) || []);
            setSubjects((sRes.data as SubjectInfo[]) || []);
        } catch (error) {
            console.error("Error fetching routine metrics:", error);
        } finally {
            setLoading(false);
        }
    }, [user, isGuest, dateRange]);

    useEffect(() => {
        if (user || isGuest) fetchData();
    }, [user, isGuest, fetchData]);

    // ─── Calculations ─────────────────────────────

    const { generalPct, bySubject, weeklyEvolution } = useMemo(() => {
        const fromStr = format(dateRange.from, "yyyy-MM-dd");
        const toStr = format(dateRange.to, "yyyy-MM-dd");

        // Count scheduled vs logged
        const allDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
        let totalScheduled = 0;
        let totalCompleted = 0;
        const subjectScheduled: Record<string, number> = {};
        const subjectCompleted: Record<string, number> = {};

        for (const day of allDays) {
            const dateStr = format(day, "yyyy-MM-dd");
            const dow = day.getDay();

            for (const r of routines) {
                if (r.start_date > dateStr) continue;
                if (r.end_date && r.end_date < dateStr) continue;
                if (!r.days_of_week.includes(dow)) continue;

                totalScheduled++;
                const log = logs.find(l => l.routine_id === r.id && l.log_date === dateStr);
                const score = log ? (log.completed ? 1 : log.completion_percentage / 100) : 0;
                totalCompleted += score;

                if (r.subject_id) {
                    subjectScheduled[r.subject_id] = (subjectScheduled[r.subject_id] || 0) + 1;
                    subjectCompleted[r.subject_id] = (subjectCompleted[r.subject_id] || 0) + score;
                }
            }
        }

        const generalPct = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

        const bySubject = Object.keys(subjectScheduled).map(sid => {
            const sub = subjects.find(s => s.id === sid);
            const sched = subjectScheduled[sid];
            const comp = subjectCompleted[sid];
            return {
                subject_id: sid,
                nombre: sub?.nombre || "Sin nombre",
                año: sub?.año || 0,
                pct: sched > 0 ? Math.round((comp / sched) * 100) : 0,
                scheduled: sched,
                completed: Math.round(comp * 10) / 10,
            };
        }).sort((a, b) => b.pct - a.pct);

        // Weekly evolution
        const weeklyEvolution: { label: string; pct: number }[] = [];
        let ws = startOfWeek(dateRange.from, { weekStartsOn: 1 });
        while (ws <= dateRange.to) {
            const we = endOfWeek(ws, { weekStartsOn: 1 });
            const weekDays = eachDayOfInterval({
                start: ws < dateRange.from ? dateRange.from : ws,
                end: we > dateRange.to ? dateRange.to : we,
            });
            let wSched = 0, wComp = 0;
            for (const day of weekDays) {
                const dateStr = format(day, "yyyy-MM-dd");
                const dow = day.getDay();
                for (const r of routines) {
                    if (r.start_date > dateStr) continue;
                    if (r.end_date && r.end_date < dateStr) continue;
                    if (!r.days_of_week.includes(dow)) continue;
                    wSched++;
                    const log = logs.find(l => l.routine_id === r.id && l.log_date === dateStr);
                    wComp += log ? (log.completed ? 1 : log.completion_percentage / 100) : 0;
                }
            }
            weeklyEvolution.push({
                label: format(ws, "d MMM", { locale: es }),
                pct: wSched > 0 ? Math.round((wComp / wSched) * 100) : 0,
            });
            ws = addDays(ws, 7);
        }

        return { generalPct, bySubject, weeklyEvolution };
    }, [routines, logs, subjects, dateRange]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (routines.length === 0) {
        return (
            <div className="card-gamer rounded-xl p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sin rutinas</h3>
                <p className="text-muted-foreground">Creá rutinas en el apartado de Rutinas para ver métricas aquí.</p>
            </div>
        );
    }

    const maxPct = Math.max(...weeklyEvolution.map(w => w.pct), 1);

    return (
        <div className="space-y-6">
            {/* General compliance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="card-gamer rounded-xl p-6 text-center">
                    <Target className="w-8 h-8 mx-auto text-primary mb-2" />
                    <p className={cn("text-4xl font-display font-bold",
                        generalPct >= 70 ? "text-neon-green" : generalPct >= 40 ? "text-neon-gold" : "text-destructive"
                    )}>{generalPct}%</p>
                    <p className="text-sm text-muted-foreground mt-1">Cumplimiento general</p>
                </div>
                <div className="card-gamer rounded-xl p-6 text-center">
                    <CheckCircle className="w-8 h-8 mx-auto text-neon-green mb-2" />
                    <p className="text-4xl font-display font-bold text-neon-green">{logs.filter(l => l.completed).length}</p>
                    <p className="text-sm text-muted-foreground mt-1">Rutinas completadas</p>
                </div>
                <div className="card-gamer rounded-xl p-6 text-center">
                    <TrendingUp className="w-8 h-8 mx-auto text-neon-cyan mb-2" />
                    <p className="text-4xl font-display font-bold text-neon-cyan">{routines.filter(r => r.is_active).length}</p>
                    <p className="text-sm text-muted-foreground mt-1">Rutinas activas</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Weekly evolution chart */}
                <div className="card-gamer rounded-xl p-6">
                    <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" /> Evolución semanal
                    </h3>
                    <div className="flex items-end justify-between gap-1 h-40">
                        {weeklyEvolution.map((w, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                                <div className="w-full rounded-t-lg transition-all duration-500 relative group"
                                    style={{
                                        height: `${Math.max((w.pct / 100) * 100, 4)}%`,
                                        background: w.pct >= 70
                                            ? "linear-gradient(to top, hsl(var(--neon-green) / 0.5), hsl(var(--neon-green)))"
                                            : w.pct >= 40
                                                ? "linear-gradient(to top, hsl(var(--neon-gold) / 0.5), hsl(var(--neon-gold)))"
                                                : "linear-gradient(to top, hsl(var(--destructive) / 0.5), hsl(var(--destructive)))",
                                    }}>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-card px-2 py-1 rounded text-xs whitespace-nowrap border border-border z-10">
                                        {w.pct}%
                                    </div>
                                </div>
                                <span className="text-[9px] text-muted-foreground leading-tight text-center">{w.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* By subject */}
                <div className="card-gamer rounded-xl p-6">
                    <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" /> Por Materia
                    </h3>
                    {bySubject.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-8">
                            No hay rutinas vinculadas a materias en este período.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {bySubject.map(s => {
                                const colors = ["neon-green", "neon-cyan", "neon-purple", "neon-gold"];
                                const color = s.pct >= 70 ? "neon-green" : s.pct >= 40 ? "neon-gold" : "destructive";
                                return (
                                    <div key={s.subject_id}>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="truncate">{s.año}° — {s.nombre}</span>
                                            <span className={`font-bold text-${color}`}>{s.pct}%</span>
                                        </div>
                                        <div className="progress-gamer h-2">
                                            <div className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${s.pct}%`,
                                                    background: `linear-gradient(90deg, hsl(var(--${color})) 0%, hsl(var(--${color}) / 0.7) 100%)`,
                                                }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

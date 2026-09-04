import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { subDays, eachDayOfInterval, format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckCircle, TrendingUp, BookOpen, Calendar, Target, ChevronLeft, ChevronRight } from "lucide-react";
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

interface SubjectInfo {
    id: string;
    nombre: string;
    año: number;
}

interface RoutineOverride {
    id: string;
    routine_id: string;
    effective_from: string;
    days_of_week: number[] | null;
    start_time: string | null;
    end_time: string | null;
    name: string | null;
    is_cancelled: boolean;
}

interface RoutineLogForMetrics {
    routine_id: string;
    log_date: string;
    completed: boolean;
    completion_percentage: number;
}

interface Props {
    dateRange: DateRange;
}

export function RoutineStats({ dateRange }: Props) {
    const { user, isGuest } = useAuth();
    const [routines, setRoutines] = useState<RoutineForMetrics[]>([]);
    const [overrides, setOverrides] = useState<RoutineOverride[]>([]);
    const [logs, setLogs] = useState<RoutineLogForMetrics[]>([]);
    const [chartOffset, setChartOffset] = useState(0);
    const WEEKS_PER_PAGE = 5;
    const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user && !isGuest) return;
        setLoading(true);

        if (isGuest) {
            // Mock data for guests to see how it looks
            const today = new Date();
            const mockRoutines: RoutineForMetrics[] = [
                { id: "r1", name: "Estudio Mañana", subject_id: "s1", days_of_week: [1, 2, 3, 4, 5], start_date: format(subDays(today, 60), "yyyy-MM-dd"), end_date: null, is_active: true, color: "#00FFAA" },
                { id: "r2", name: "Gimnasio", subject_id: null, days_of_week: [1, 3, 5], start_date: format(subDays(today, 60), "yyyy-MM-dd"), end_date: null, is_active: true, color: "#B026FF" },
            ];
            const mockLogs: RoutineLogForMetrics[] = [];

            // Generate some random logs for the last 7 days
            for (let i = 0; i < 14; i++) {
                const date = subDays(today, i);
                const dateStr = format(date, "yyyy-MM-dd");
                const dow = date.getDay();

                if (mockRoutines[0].days_of_week.includes(dow) && Math.random() > 0.2) {
                    mockLogs.push({ routine_id: "r1", log_date: dateStr, completed: Math.random() > 0.3, completion_percentage: 100 });
                }
                if (mockRoutines[1].days_of_week.includes(dow) && Math.random() > 0.4) {
                    mockLogs.push({ routine_id: "r2", log_date: dateStr, completed: true, completion_percentage: 100 });
                }
            }

            setRoutines(mockRoutines);
            setOverrides([]);
            setLogs(mockLogs);
            setSubjects([{ id: "s1", nombre: "Análisis Matemático I", año: 1 }]);
            setLoading(false);
            return;
        }

        try {
            const fromStr = format(dateRange.from, "yyyy-MM-dd");
            const toStr = format(dateRange.to, "yyyy-MM-dd");

            // 1. Fetch routines and subjects first
            const [rRes, sRes] = await Promise.all([
                supabase.from("routines").select("id, name, subject_id, days_of_week, start_date, end_date, is_active, color").eq("user_id", user!.id).eq("is_active", true),
                supabase.from("subjects").select("id, nombre, año").eq("user_id", user!.id),
            ]);

            const routinesData = (rRes.data as RoutineForMetrics[]) || [];
            const subjectsData = (sRes.data as unknown as SubjectInfo[]) || [];

            setRoutines(routinesData);
            setSubjects(subjectsData);

            if (routinesData.length === 0) {
                setOverrides([]);
                setLogs([]);
                setLoading(false);
                return;
            }

            // 2. Fetch overrides and logs based on the routines found
            const routineIds = routinesData.map(r => r.id);
            const [oRes, lRes] = await Promise.all([
                supabase.from("routine_overrides").select("*").in("routine_id", routineIds),
                supabase.from("routine_logs").select("routine_id, log_date, completed, completion_percentage").eq("user_id", user!.id).gte("log_date", fromStr).lte("log_date", toStr).in("routine_id", routineIds),
            ]);

            setOverrides((oRes.data as RoutineOverride[]) || []);
            setLogs((lRes.data as RoutineLogForMetrics[]) || []);
        } catch (error) {
            console.error("Error fetching metrics data:", error);
        } finally {
            setLoading(false);
        }
    }, [user, isGuest, dateRange]);

    useEffect(() => {
        setChartOffset(0);
    }, [dateRange]);

    useEffect(() => {
        if (user || isGuest) fetchData();
    }, [user, isGuest, fetchData]);

    // ─── Calculations ─────────────────────────────

    const resolveRoutineForDate = (routine: RoutineForMetrics, dateStr: string) => {
        const applicable = overrides
            .filter(o => o.routine_id === routine.id && o.effective_from <= dateStr)
            .sort((a, b) => b.effective_from.localeCompare(a.effective_from));
        const override = applicable[0];
        if (override?.is_cancelled) return null;
        return {
            ...routine,
            name: override?.name ?? routine.name,
            days_of_week: override?.days_of_week ?? routine.days_of_week,
        };
    };

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

            for (const rBase of routines) {
                if (rBase.start_date > dateStr) continue;
                if (rBase.end_date && rBase.end_date < dateStr) continue;

                const r = resolveRoutineForDate(rBase, dateStr);
                if (!r || !r.days_of_week.includes(dow)) continue;

                totalScheduled++;
                const log = logs.find(l => l.routine_id === r.id && l.log_date === dateStr);
                const score = log ? (log.completed ? 1 : (log.completion_percentage || 0) / 100) : 0;
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
                for (const rBase of routines) {
                    if (rBase.start_date > dateStr) continue;
                    if (rBase.end_date && rBase.end_date < dateStr) continue;

                    const r = resolveRoutineForDate(rBase, dateStr);
                    if (!r || !r.days_of_week.includes(dow)) continue;
                    wSched++;
                    const log = logs.find(l => l.routine_id === r.id && l.log_date === dateStr);
                    wComp += log ? (log.completed ? 1 : (log.completion_percentage || 0) / 100) : 0;
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
            <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto text-black/50 mb-4" strokeWidth={2} />
                <h3 className="text-xl font-black uppercase mb-2 text-black">Sin rutinas</h3>
                <p className="text-black/60 font-bold uppercase text-sm">Creá rutinas en el apartado de Rutinas para ver métricas aquí.</p>
            </div>
        );
    }

    const maxPct = Math.max(...weeklyEvolution.map(w => w.pct), 1);

    return (
        <div className="space-y-6">
            {/* General compliance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-6 text-center hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all group">
                    <div className="w-12 h-12 bg-[#FF9B71] border-2 border-black rounded-lg mx-auto flex items-center justify-center mb-3 rotate-3 group-hover:rotate-0 transition-transform">
                        <Target className="w-6 h-6 text-black" strokeWidth={2.5} />
                    </div>
                    <p className={cn("text-4xl font-black tracking-tighter",
                        generalPct >= 70 ? "text-black" : generalPct >= 40 ? "text-black" : "text-[#FF5C5C]"
                    )}>{generalPct}%</p>
                    <p className="text-xs font-bold text-black/60 uppercase mt-1">Cumplimiento general</p>
                </div>
                <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-6 text-center hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all group">
                    <div className="w-12 h-12 bg-[#BFFF00] border-2 border-black rounded-lg mx-auto flex items-center justify-center mb-3 -rotate-3 group-hover:rotate-0 transition-transform">
                        <CheckCircle className="w-6 h-6 text-black" strokeWidth={2.5} />
                    </div>
                    <p className="text-4xl font-black text-black tracking-tighter">{logs.filter(l => l.completed).length}</p>
                    <p className="text-xs font-bold text-black/60 uppercase mt-1">Rutinas completadas</p>
                </div>
                <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-6 text-center hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all group">
                    <div className="w-12 h-12 bg-[#00E5FF] border-2 border-black rounded-lg mx-auto flex items-center justify-center mb-3 rotate-6 group-hover:rotate-0 transition-transform">
                        <TrendingUp className="w-6 h-6 text-black" strokeWidth={2.5} />
                    </div>
                    <p className="text-4xl font-black text-black tracking-tighter">{routines.filter(r => r.is_active).length}</p>
                    <p className="text-xs font-bold text-black/60 uppercase mt-1">Rutinas activas</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Weekly evolution chart */}
                <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6 border-b-4 border-black pb-4">
                        <h3 className="font-black uppercase text-xl text-black flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-black" strokeWidth={3} /> Evolución semanal
                        </h3>
                        {weeklyEvolution.length > WEEKS_PER_PAGE && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#000]"
                                    onClick={() => setChartOffset(prev => Math.max(0, prev - 1))}
                                    disabled={chartOffset === 0}
                                >
                                    <ChevronLeft className="w-4 h-4 text-black" strokeWidth={3} />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0_0_#000] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#000]"
                                    onClick={() => setChartOffset(prev => Math.min(weeklyEvolution.length - WEEKS_PER_PAGE, prev + 1))}
                                    disabled={chartOffset >= weeklyEvolution.length - WEEKS_PER_PAGE}
                                >
                                    <ChevronRight className="w-4 h-4 text-black" strokeWidth={3} />
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-end justify-between gap-2 h-40 px-2">
                        {weeklyEvolution.slice(chartOffset, chartOffset + WEEKS_PER_PAGE).map((w, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                                <div className="w-full flex-1 flex flex-col justify-end group">
                                    <div className="w-full transition-all duration-500 rounded-t-sm relative border-2 border-transparent"
                                        style={{
                                            height: `${Math.max((w.pct / 100) * 100, 4)}%`,
                                            backgroundColor: w.pct >= 70 ? "#BFFF00" : w.pct >= 40 ? "#FFD700" : "#FF5C5C",
                                            borderTopColor: w.pct > 0 ? "black" : "transparent",
                                            borderLeftColor: w.pct > 0 ? "black" : "transparent",
                                            borderRightColor: w.pct > 0 ? "black" : "transparent",
                                            boxShadow: w.pct > 0 ? "2px_0_0_0_#000" : "none"
                                        }}>
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white px-2 py-1 rounded text-xs font-bold whitespace-nowrap z-10 pointer-events-none">
                                            {w.pct}%
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-black uppercase text-center leading-tight">{w.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* By subject */}
                <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-6">
                    <h3 className="font-black uppercase text-xl text-black mb-6 flex items-center gap-2 border-b-4 border-black pb-4">
                        <BookOpen className="w-6 h-6 text-black" strokeWidth={3} /> Por Materia
                    </h3>
                    {bySubject.length === 0 ? (
                        <p className="text-black/60 font-bold uppercase text-sm text-center py-8">
                            No hay rutinas vinculadas a materias en este período.
                        </p>
                    ) : (
                        <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
                            {bySubject.map(s => {
                                const bgColors = ["#BFFF00", "#00E5FF", "#C688EB", "#FFD700"];
                                const color = s.pct >= 70 ? "#BFFF00" : s.pct >= 40 ? "#FFD700" : "#FF5C5C";
                                return (
                                    <div key={s.subject_id}>
                                        <div className="flex items-center justify-between text-sm mb-2">
                                            <span className="font-bold text-black truncate">{s.año}° — {s.nombre}</span>
                                            <span className="font-black text-black px-2 py-0.5 border-2 border-black rounded bg-gray-100">{s.pct}%</span>
                                        </div>
                                        <div className="h-4 bg-gray-200 border-2 border-black rounded-full overflow-hidden shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.1)]">
                                            <div className="h-full transition-all duration-500 border-r-2 border-black"
                                                style={{
                                                    width: `${s.pct}%`,
                                                    backgroundColor: color,
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

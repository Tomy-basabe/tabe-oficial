import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { subDays, eachDayOfInterval, format, startOfWeek, endOfWeek, addDays, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn, toLocalDateStr } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckCircle, TrendingUp, BookOpen, Calendar, Target, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { DateRange } from "@/components/metrics/DateRangeFilter";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const [routines, setRoutines] = useState<RoutineForMetrics[]>([]);
  const [overrides, setOverrides] = useState<RoutineOverride[]>([]);
  const [logs, setLogs] = useState<RoutineLogForMetrics[]>([]);
  const [chartOffset, setChartOffset] = useState(0);
  const WEEKS_PER_PAGE = 5;
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (isGuest) {
      // Mock data for guests to see how it looks
      const today = new Date();
      const mockRoutines: RoutineForMetrics[] = [
        { 
          id: "mock-r1", 
          name: "Bloque de Estudio Mañana", 
          subject_id: "s1", 
          days_of_week: [1, 2, 3, 4, 5], 
          start_date: format(subDays(today, 60), "yyyy-MM-dd"), 
          end_date: null, 
          is_active: true, 
          color: "#00FFAA" 
        },
        { 
          id: "mock-r2", 
          name: "Lectura y Repaso", 
          subject_id: "s2", 
          days_of_week: [1, 3, 5], 
          start_date: format(subDays(today, 60), "yyyy-MM-dd"), 
          end_date: null, 
          is_active: true, 
          color: "#B026FF" 
        },
        { 
          id: "mock-r3", 
          name: "Gimnasio & Salud", 
          subject_id: null, 
          days_of_week: [2, 4, 6], 
          start_date: format(subDays(today, 60), "yyyy-MM-dd"), 
          end_date: null, 
          is_active: true, 
          color: "#FFD700" 
        },
      ];
      const mockLogs: RoutineLogForMetrics[] = [];

      // Generate logs covering the date range
      const daysCount = Math.min(Math.max(differenceInDays(dateRange.to, dateRange.from) + 1, 1), 60);
      for (let i = 0; i < daysCount; i++) {
        const date = subDays(dateRange.to, i);
        const dateStr = format(date, "yyyy-MM-dd");
        const dow = date.getDay();

        if (mockRoutines[0].days_of_week.includes(dow) && (i * 7) % 5 !== 0) {
          mockLogs.push({ routine_id: "mock-r1", log_date: dateStr, completed: (i * 3) % 4 !== 0, completion_percentage: 100 });
        }
        if (mockRoutines[1].days_of_week.includes(dow) && (i * 3) % 4 !== 0) {
          mockLogs.push({ routine_id: "mock-r2", log_date: dateStr, completed: true, completion_percentage: 100 });
        }
        if (mockRoutines[2].days_of_week.includes(dow)) {
          mockLogs.push({ routine_id: "mock-r3", log_date: dateStr, completed: i % 2 === 0, completion_percentage: 100 });
        }
      }

      setRoutines(mockRoutines);
      setOverrides([]);
      setLogs(mockLogs);
      setSubjects([
        { id: "s1", nombre: "Análisis Matemático I", año: 1 },
        { id: "s2", nombre: "Álgebra y Geometría", año: 1 },
      ]);
      setLoading(false);
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const fromStr = format(dateRange.from, "yyyy-MM-dd");
      const toStr = format(dateRange.to, "yyyy-MM-dd");

      // 1. Fetch routines and subjects
      const [rRes, sRes] = await Promise.all([
        supabase
          .from("routines")
          .select("id, name, subject_id, days_of_week, start_date, end_date, is_active, color")
          .eq("user_id", user.id)
          .eq("is_active", true),
        supabase
          .from("subjects")
          .select("id, nombre, año")
          .eq("user_id", user.id),
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

      // 2. Fetch overrides and logs for existing routines
      const routineIds = routinesData.map(r => r.id);
      const [oRes, lRes] = await Promise.all([
        supabase
          .from("routine_overrides")
          .select("*")
          .in("routine_id", routineIds),
        supabase
          .from("routine_logs")
          .select("routine_id, log_date, completed, completion_percentage")
          .eq("user_id", user.id)
          .gte("log_date", fromStr)
          .lte("log_date", toStr)
          .in("routine_id", routineIds),
      ]);

      setOverrides((oRes.data as RoutineOverride[]) || []);
      setLogs((lRes.data as RoutineLogForMetrics[]) || []);
    } catch (error) {
      console.error("Error fetching routine metrics data:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isGuest, dateRange.from?.getTime(), dateRange.to?.getTime()]);

  useEffect(() => {
    setChartOffset(0);
  }, [dateRange.from?.getTime(), dateRange.to?.getTime()]);

  useEffect(() => {
    let mounted = true;
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2000);

    fetchData().finally(() => {
      clearTimeout(safetyTimer);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
    };
  }, [fetchData]);

  // ─── Calculations ─────────────────────────────

  const resolveRoutineForDate = useCallback((routine: RoutineForMetrics, dateStr: string) => {
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
  }, [overrides]);

  const { generalPct, bySubject, weeklyEvolution, totalScheduledCount, totalCompletedCount } = useMemo(() => {
    if (!dateRange.from || !dateRange.to || isNaN(dateRange.from.getTime()) || isNaN(dateRange.to.getTime())) {
      return { generalPct: 0, bySubject: [], weeklyEvolution: [], totalScheduledCount: 0, totalCompletedCount: 0 };
    }

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
        if (!r || !r.days_of_week || !r.days_of_week.includes(dow)) continue;

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
        nombre: sub?.nombre || "Materia",
        año: sub?.año || 1,
        pct: sched > 0 ? Math.round((comp / sched) * 100) : 0,
        scheduled: sched,
        completed: Math.round(comp * 10) / 10,
      };
    }).sort((a, b) => b.pct - a.pct);

    // Weekly evolution with infinite loop guard
    const weeklyEvolution: { label: string; pct: number; scheduled: number; completed: number }[] = [];
    let ws = startOfWeek(dateRange.from, { weekStartsOn: 1 });
    let safetyCounter = 0;

    while (ws <= dateRange.to && safetyCounter < 52) {
      safetyCounter++;
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      const weekDays = eachDayOfInterval({
        start: ws < dateRange.from ? dateRange.from : ws,
        end: we > dateRange.to ? dateRange.to : we,
      });

      let wSched = 0;
      let wComp = 0;

      for (const day of weekDays) {
        const dateStr = format(day, "yyyy-MM-dd");
        const dow = day.getDay();
        for (const rBase of routines) {
          if (rBase.start_date > dateStr) continue;
          if (rBase.end_date && rBase.end_date < dateStr) continue;

          const r = resolveRoutineForDate(rBase, dateStr);
          if (!r || !r.days_of_week || !r.days_of_week.includes(dow)) continue;
          wSched++;
          const log = logs.find(l => l.routine_id === r.id && l.log_date === dateStr);
          wComp += log ? (log.completed ? 1 : (log.completion_percentage || 0) / 100) : 0;
        }
      }

      weeklyEvolution.push({
        label: format(ws, "d MMM", { locale: es }),
        pct: wSched > 0 ? Math.round((wComp / wSched) * 100) : 0,
        scheduled: wSched,
        completed: Math.round(wComp * 10) / 10,
      });

      ws = addDays(ws, 7);
    }

    return { 
      generalPct, 
      bySubject, 
      weeklyEvolution, 
      totalScheduledCount: totalScheduled, 
      totalCompletedCount: Math.round(totalCompleted) 
    };
  }, [routines, logs, subjects, dateRange.from, dateRange.to, resolveRoutineForDate]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-6 animate-pulse">
              <div className="w-12 h-12 bg-muted border-2 border-foreground/20 rounded-lg mx-auto mb-3" />
              <div className="h-8 bg-muted rounded w-20 mx-auto mb-2 border border-foreground/10" />
              <div className="h-4 bg-muted rounded w-32 mx-auto border border-foreground/10" />
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-64 bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-6 animate-pulse" />
          <div className="h-64 bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-6 animate-pulse" />
        </div>
      </div>
    );
  }

  if (routines.length === 0) {
    return (
      <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-8 sm:p-12 text-center max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-[#00E5FF] border-4 border-foreground rounded-2xl shadow-[4px_4px_0_0_hsl(var(--foreground))] flex items-center justify-center mx-auto mb-4 -rotate-3">
          <Calendar className="w-8 h-8 text-black" strokeWidth={2.5} />
        </div>
        <h3 className="text-xl sm:text-2xl font-black uppercase mb-2 text-foreground">
          Sin Rutinas Creadas
        </h3>
        <p className="text-muted-foreground font-bold uppercase text-xs sm:text-sm mb-6 max-w-md mx-auto">
          Armá tus horarios y hábitos diarios en el gestor de Rutinas para visualizar tu cumplimiento y constancia aquí.
        </p>
        <button
          onClick={() => navigate("/rutinas")}
          className="bg-[#BFFF00] text-black font-black uppercase text-xs sm:text-sm px-6 py-3 border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all inline-flex items-center gap-2 rounded-xl"
        >
          <Plus className="w-5 h-5" strokeWidth={3} />
          Crear Mi Primera Rutina
        </button>
      </div>
    );
  }

  const maxOffset = Math.max(0, weeklyEvolution.length - WEEKS_PER_PAGE);
  const clampedOffset = Math.min(chartOffset, maxOffset);

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#00E5FF] border-4 border-foreground rounded-xl shadow-[4px_4px_0_0_hsl(var(--foreground))] flex items-center justify-center -rotate-3 shrink-0">
            <Calendar className="w-6 h-6 text-black" strokeWidth={3} />
          </div>
          <div>
            <h2 className="font-black text-2xl uppercase tracking-wider text-foreground">
              Métricas de Rutinas
            </h2>
            <p className="font-bold text-xs sm:text-sm text-muted-foreground uppercase mt-0.5">
              Control de hábitos, constancia y cumplimiento
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/rutinas")}
          className="bg-[#00E5FF] text-black font-black uppercase text-xs px-4 py-2 border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all flex items-center gap-2 self-start sm:self-auto rounded-lg"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          Gestionar Rutinas
        </button>
      </div>

      {/* General Compliance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-6 text-center hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all group">
          <div className="w-12 h-12 bg-[#FF9B71] border-2 border-foreground rounded-lg mx-auto flex items-center justify-center mb-3 rotate-3 group-hover:rotate-0 transition-transform">
            <Target className="w-6 h-6 text-black" strokeWidth={2.5} />
          </div>
          <p className={cn(
            "text-3xl sm:text-4xl font-black tracking-tighter",
            generalPct >= 70 ? "text-emerald-500" : generalPct >= 40 ? "text-amber-500" : "text-rose-500"
          )}>
            {generalPct}%
          </p>
          <p className="text-xs font-bold text-muted-foreground uppercase mt-1">Cumplimiento general</p>
          <p className="text-[10px] font-bold text-muted-foreground mt-1">
            {totalCompletedCount} de {totalScheduledCount} programadas
          </p>
        </div>

        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-6 text-center hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all group">
          <div className="w-12 h-12 bg-[#BFFF00] border-2 border-foreground rounded-lg mx-auto flex items-center justify-center mb-3 -rotate-3 group-hover:rotate-0 transition-transform">
            <CheckCircle className="w-6 h-6 text-black" strokeWidth={2.5} />
          </div>
          <p className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter">
            {logs.filter(l => l.completed).length}
          </p>
          <p className="text-xs font-bold text-muted-foreground uppercase mt-1">Rutinas completadas</p>
          <p className="text-[10px] font-bold text-emerald-500 mt-1">
            Registros marcados como hechos
          </p>
        </div>

        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-6 text-center hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all group">
          <div className="w-12 h-12 bg-[#00E5FF] border-2 border-foreground rounded-lg mx-auto flex items-center justify-center mb-3 rotate-6 group-hover:rotate-0 transition-transform">
            <TrendingUp className="w-6 h-6 text-black" strokeWidth={2.5} />
          </div>
          <p className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter">
            {routines.filter(r => r.is_active).length}
          </p>
          <p className="text-xs font-bold text-muted-foreground uppercase mt-1">Rutinas activas</p>
          <p className="text-[10px] font-bold text-[#00E5FF] mt-1">
            En tu agenda semanal
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Evolution Chart */}
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6 border-b-4 border-foreground pb-4">
            <h3 className="font-black uppercase text-lg sm:text-xl text-foreground flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-foreground" strokeWidth={3} /> Evolución semanal
            </h3>
            {weeklyEvolution.length > WEEKS_PER_PAGE && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-card border-2 border-foreground rounded-lg shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px]"
                  onClick={() => setChartOffset(prev => Math.max(0, prev - 1))}
                  disabled={clampedOffset === 0}
                >
                  <ChevronLeft className="w-4 h-4 text-foreground" strokeWidth={3} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-card border-2 border-foreground rounded-lg shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px]"
                  onClick={() => setChartOffset(prev => Math.min(maxOffset, prev + 1))}
                  disabled={clampedOffset >= maxOffset}
                >
                  <ChevronRight className="w-4 h-4 text-foreground" strokeWidth={3} />
                </Button>
              </div>
            )}
          </div>

          {weeklyEvolution.length > 0 ? (
            <div className="flex items-end justify-between gap-3 h-40 px-2">
              {weeklyEvolution.slice(clampedOffset, clampedOffset + WEEKS_PER_PAGE).map((w, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                  <div className="w-full flex-1 flex flex-col justify-end group relative">
                    <div 
                      className="w-full transition-all duration-500 rounded-t-sm relative border-2 border-foreground"
                      style={{
                        height: `${Math.max((w.pct / 100) * 100, 8)}%`,
                        backgroundColor: w.pct >= 70 ? "#BFFF00" : w.pct >= 40 ? "#FFD700" : "#FF5C5C",
                        boxShadow: w.pct > 0 ? "2px 0 0 0 hsl(var(--foreground))" : "none"
                      }}
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background px-2 py-1 rounded text-[10px] font-black whitespace-nowrap z-20 pointer-events-none shadow-md">
                        {w.pct}% ({w.completed}/{w.scheduled})
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-foreground uppercase text-center leading-tight">
                    {w.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center font-bold text-muted-foreground uppercase text-xs">
              Sin datos de evolución para este rango
            </div>
          )}
        </div>

        {/* By Subject Breakdown */}
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-6">
          <h3 className="font-black uppercase text-lg sm:text-xl text-foreground mb-6 flex items-center gap-2 border-b-4 border-foreground pb-4">
            <BookOpen className="w-6 h-6 text-foreground" strokeWidth={3} /> Cumplimiento por Materia
          </h3>

          {bySubject.length === 0 ? (
            <div className="text-center py-10">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground opacity-40 mb-2" />
              <p className="text-muted-foreground font-bold uppercase text-xs">
                No hay rutinas vinculadas a materias con actividad en este período.
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                Al crear rutinas podés vincularlas a una materia específica para ver su impacto aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[260px] overflow-y-auto pr-1 no-scrollbar">
              {bySubject.map(s => {
                const color = s.pct >= 70 ? "#BFFF00" : s.pct >= 40 ? "#FFD700" : "#FF5C5C";
                return (
                  <div key={s.subject_id} className="p-3 bg-muted/40 border-2 border-foreground/30 rounded-xl">
                    <div className="flex items-center justify-between text-xs sm:text-sm mb-2 font-bold">
                      <span className="text-foreground truncate mr-2">
                        {s.año > 0 ? `${s.año}° año — ` : ""}{s.nombre}
                      </span>
                      <span className="font-black px-2 py-0.5 border-2 border-foreground rounded text-black shrink-0" style={{ backgroundColor: color }}>
                        {s.pct}%
                      </span>
                    </div>
                    <div className="h-3 bg-muted border-2 border-foreground rounded-full overflow-hidden shadow-[inset_1px_1px_0_0_rgba(0,0,0,0.1)]">
                      <div 
                        className="h-full transition-all duration-500 border-r-2 border-foreground"
                        style={{
                          width: `${Math.min(s.pct, 100)}%`,
                          backgroundColor: color,
                        }} 
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold mt-1.5">
                      <span>Completadas: {s.completed}</span>
                      <span>Programadas: {s.scheduled}</span>
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

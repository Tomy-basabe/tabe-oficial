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

      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      days.forEach((d) => {
        const dStr = format(d, "yyyy-MM-dd");
        const dow = d.getDay();
        mockRoutines.forEach((r, idx) => {
          if (r.days_of_week.includes(dow)) {
            const completed = (idx + d.getDate()) % 3 !== 0;
            mockLogs.push({
              routine_id: r.id,
              log_date: dStr,
              completed,
              completion_percentage: completed ? 100 : 0,
            });
          }
        });
      });

      setRoutines(mockRoutines);
      setLogs(mockLogs);
      setSubjects([
        { id: "s1", nombre: "Uso de Tablero", año: 1 },
        { id: "s2", nombre: "Técnicas de Estudio", año: 1 },
      ]);
      setLoading(false);
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const fromStr = toLocalDateStr(dateRange.from);
      const toStr = toLocalDateStr(dateRange.to);

      const [routinesRes, overridesRes, logsRes, subjectsRes] = await Promise.all([
        supabase
          .from("routines")
          .select("id, name, subject_id, days_of_week, start_date, end_date, is_active, color")
          .eq("user_id", user.id),
        supabase
          .from("routine_overrides")
          .select("id, routine_id, effective_from, days_of_week, start_time, end_time, name, is_cancelled")
          .eq("user_id", user.id)
          .order("effective_from", { ascending: true }),
        supabase
          .from("routine_logs")
          .select("routine_id, log_date, completed, completion_percentage")
          .eq("user_id", user.id)
          .gte("log_date", fromStr)
          .lte("log_date", toStr),
        supabase
          .from("subjects")
          .select("id, nombre, año")
          .eq("user_id", user.id),
      ]);

      if (routinesRes.data) setRoutines(routinesRes.data);
      if (overridesRes.data) setOverrides(overridesRes.data);
      if (logsRes.data) setLogs(logsRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data as any);
    } catch (err) {
      console.error("Error fetching routine stats:", err);
    } finally {
      setLoading(false);
    }
  }, [user, isGuest, dateRange.from, dateRange.to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resolveRoutineForDate = useCallback((routine: RoutineForMetrics, dateStr: string) => {
    const applicableOverrides = overrides
      .filter((o) => o.routine_id === routine.id && o.effective_from <= dateStr)
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from));

    if (applicableOverrides.length === 0) return routine;

    const latest = applicableOverrides[0];
    if (latest.is_cancelled) return null;

    return {
      ...routine,
      name: latest.name || routine.name,
      days_of_week: latest.days_of_week || routine.days_of_week,
    };
  }, [overrides]);

  const { generalPct, bySubject, weeklyEvolution, totalScheduledCount, totalCompletedCount } = useMemo(() => {
    if (routines.length === 0) {
      return { generalPct: 0, bySubject: [], weeklyEvolution: [], totalScheduledCount: 0, totalCompletedCount: 0 };
    }

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    let totalScheduled = 0;
    let totalCompleted = 0;

    const subjectScheduled: Record<string, number> = {};
    const subjectCompleted: Record<string, number> = {};

    for (const day of days) {
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
            <div key={i} className="neo-bento-card p-6 animate-pulse">
              <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg mx-auto mb-3" />
              <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded w-20 mx-auto mb-2" />
              <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-32 mx-auto" />
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-64 neo-bento-card p-6 animate-pulse" />
          <div className="h-64 neo-bento-card p-6 animate-pulse" />
        </div>
      </div>
    );
  }

  if (routines.length === 0) {
    return (
      <div className="neo-bento-card p-8 sm:p-12 text-center max-w-xl mx-auto">
        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 rounded-xl flex items-center justify-center mx-auto mb-3">
          <Calendar className="w-6 h-6 text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight mb-1 text-zinc-900 dark:text-zinc-100">
          Sin Rutinas Creadas
        </h3>
        <p className="text-zinc-500 text-xs sm:text-sm mb-5 max-w-sm mx-auto">
          Armá tus horarios y hábitos diarios en el gestor de Rutinas para visualizar tu cumplimiento y constancia aquí.
        </p>
        <button
          onClick={() => navigate("/rutinas")}
          className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-medium text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Crear mi primera rutina
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
          <div className="w-9 h-9 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 rounded-lg flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg sm:text-xl tracking-tight text-zinc-900 dark:text-zinc-100">
              Métricas de Rutinas
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal mt-0.5">
              Control de hábitos, constancia y cumplimiento semanal
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/rutinas")}
          className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-medium text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Gestionar Rutinas
        </button>
      </div>

      {/* General Compliance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="neo-bento-card p-5 text-center group">
          <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg mx-auto flex items-center justify-center mb-2.5 border border-zinc-200/60 dark:border-zinc-700/60">
            <Target className="w-4 h-4 text-sky-500" />
          </div>
          <p className={cn(
            "text-2xl sm:text-3xl font-semibold tracking-tight",
            generalPct >= 70 ? "text-emerald-600 dark:text-emerald-400" : generalPct >= 40 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
          )}>
            {generalPct}%
          </p>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Cumplimiento general</p>
          <p className="text-[11px] text-zinc-400 mt-1">
            {totalCompletedCount} de {totalScheduledCount} programadas
          </p>
        </div>

        <div className="neo-bento-card p-5 text-center group">
          <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg mx-auto flex items-center justify-center mb-2.5 border border-zinc-200/60 dark:border-zinc-700/60">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {logs.filter(l => l.completed).length}
          </p>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Rutinas completadas</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            Registros marcados como hechos
          </p>
        </div>

        <div className="neo-bento-card p-5 text-center group">
          <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg mx-auto flex items-center justify-center mb-2.5 border border-zinc-200/60 dark:border-zinc-700/60">
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {routines.filter(r => r.is_active).length}
          </p>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-1">Rutinas activas</p>
          <p className="text-[11px] text-zinc-400 mt-1">
            En tu agenda semanal
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly Evolution Chart */}
        <div className="neo-bento-card p-6">
          <div className="flex items-center justify-between mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 className="font-semibold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Evolución semanal
            </h3>
            {weeklyEvolution.length > WEEKS_PER_PAGE && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md"
                  onClick={() => setChartOffset(prev => Math.max(0, prev - 1))}
                  disabled={clampedOffset === 0}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md"
                  onClick={() => setChartOffset(prev => Math.min(maxOffset, prev + 1))}
                  disabled={clampedOffset >= maxOffset}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
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
                      className={cn(
                        "w-full transition-all duration-300 rounded-t-md relative",
                        w.pct >= 70 ? "bg-emerald-500" : w.pct >= 40 ? "bg-amber-500" : "bg-rose-500"
                      )}
                      style={{
                        height: `${Math.max((w.pct / 100) * 100, 8)}%`,
                      }}
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap z-20 pointer-events-none shadow-md">
                        {w.pct}% ({w.completed}/{w.scheduled})
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 text-center leading-tight">
                    {w.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-zinc-400 text-xs">
              Sin datos de evolución para este rango
            </div>
          )}
        </div>

        {/* By Subject Breakdown */}
        <div className="neo-bento-card p-6">
          <h3 className="font-semibold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <BookOpen className="w-4 h-4 text-sky-500" /> Cumplimiento por Materia
          </h3>

          {bySubject.length === 0 ? (
            <div className="text-center py-10">
              <BookOpen className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-zinc-500 text-xs font-medium">
                No hay rutinas vinculadas a materias con actividad en este período.
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Al crear rutinas podés vincularlas a una materia específica para ver su impacto aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 no-scrollbar">
              {bySubject.map(s => {
                const barColor = s.pct >= 70 ? "bg-emerald-500" : s.pct >= 40 ? "bg-amber-500" : "bg-rose-500";
                return (
                  <div key={s.subject_id} className="p-3 bg-zinc-50/70 dark:bg-zinc-850/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl">
                    <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                      <span className="text-zinc-800 dark:text-zinc-200 truncate mr-2">
                        {s.año > 0 ? `${s.año}° año — ` : ""}{s.nombre}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md border border-zinc-200/60 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shrink-0">
                        {s.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-500", barColor)}
                        style={{
                          width: `${Math.min(s.pct, 100)}%`,
                        }} 
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-400 font-normal mt-1.5">
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

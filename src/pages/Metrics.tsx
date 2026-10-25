import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3, Clock, BookOpen,
  Timer, Layers, Calendar, Library,
  ChevronLeft, ChevronRight, Plus, GraduationCap, Trash2
} from "lucide-react";
import { 
  subDays, addDays, eachDayOfInterval, format, differenceInDays, 
  subMonths, addMonths, subYears, addYears,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth
} from "date-fns";
import { cn, toLocalDateStr } from "@/lib/utils";
import { FlashcardStats } from "@/components/metrics/FlashcardStats";
import { RoutineStats } from "@/components/metrics/RoutineStats";
import { SleepStats } from "@/components/metrics/SleepStats";
import { CareerAnalytics } from "@/components/metrics/CareerAnalytics";
import { ManualStudyDialog } from "@/components/metrics/ManualStudyDialog";
import { DeleteStudyTimeDialog } from "@/components/metrics/DeleteStudyTimeDialog";
import { DateRangeFilter, DateRange, WEEK_OPTIONS } from "@/components/metrics/DateRangeFilter";
import { Moon } from "lucide-react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface StudySession {
  id?: string;
  fecha: string;
  duracion_segundos: number;
  tipo: string;
  subject_id: string | null;
}

interface SubjectStudyData {
  subject_id: string;
  nombre: string;
  total_seconds: number;
  sessions_count: number;
}

const defaultDateRange: DateRange = {
  from: startOfWeek(new Date(), WEEK_OPTIONS),
  to: endOfWeek(new Date(), WEEK_OPTIONS),
  label: "Esta semana",
};

export default function Metrics() {
  const { user, isGuest } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; nombre: string; año?: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"general" | "carrera" | "flashcards" | "rutinas" | "sueno">("general");
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDeleteDate, setSelectedDeleteDate] = useState<string | undefined>();
  const [selectedDeleteSubjectId, setSelectedDeleteSubjectId] = useState<string | undefined>();
  const [selectedChartDate, setSelectedChartDate] = useState<string | null>(null);
  const [manualDialogDate, setManualDialogDate] = useState<string | undefined>();

  const fetchData = useCallback(async (isInitial = false) => {
    if (!user && !isGuest) {
      setLoading(false);
      return;
    }
    if (isInitial && sessions.length === 0) {
      setLoading(true);
    }

    if (isGuest) {
      const today = new Date();
      const mockSessions: StudySession[] = [];
      const types = ["pomodoro", "flashcard", "estudio"];

      // Deterministic demo sessions based on day index
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);

        const count = ((i * 7 + 3) % 3) + 1;
        for (let j = 0; j < count; j++) {
          mockSessions.push({
            fecha: toLocalDateStr(d),
            duracion_segundos: 1800 + ((i * 13 + j * 17) % 3600),
            tipo: types[(i + j) % types.length],
            subject_id: j % 2 === 0 ? "mock-sub-1" : "mock-sub-2"
          });
        }
      }

      setSessions(mockSessions);
      setSubjects([
        { id: "mock-sub-1", nombre: "Uso de Tablero" },
        { id: "mock-sub-2", nombre: "Técnicas de Estudio" }
      ]);
      setLoading(false);
      return;
    }

    try {
      const fromStr = toLocalDateStr(dateRange.from);
      const toStr = toLocalDateStr(dateRange.to);

      const { data: sessionData } = await supabase
        .from("study_sessions")
        .select("id, fecha, duracion_segundos, tipo, subject_id")
        .eq("user_id", user.id)
        .gte("fecha", fromStr)
        .lte("fecha", `${toStr}T23:59:59.999Z`)
        .order("fecha", { ascending: true });

      const { data: subjectData } = await supabase
        .from("subjects")
        .select("id, nombre, año")
        .eq("user_id", user.id);

      // Normalizar fecha para garantizar coincidencia con YYYY-MM-DD independientemente de si vino con timestamp
      const normalizedSessions = (sessionData || []).map((s) => ({
        ...s,
        fecha: s.fecha ? s.fecha.split("T")[0] : s.fecha,
      }));

      setSessions(normalizedSessions);
      setSubjects((subjectData || []) as any);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isGuest, dateRange.from?.getTime(), dateRange.to?.getTime()]);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 1500);

    fetchData(true).finally(() => {
      clearTimeout(timer);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [fetchData]);

  // Listen to realtime study sessions updates
  useRealtimeSubscription({
    table: "study_sessions",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChange: useCallback(() => {
      fetchData(false);
    }, [fetchData]),
    enabled: !!user,
  });

  const handleNavigate = (direction: "prev" | "next") => {
    const { from, to, label } = dateRange;
    const daysDiff = differenceInDays(to, from) + 1;
    let newFrom = from;
    let newTo = to;

    if (label === "Esta semana" || (daysDiff >= 6 && daysDiff <= 8)) {
      const offset = direction === "prev" ? -7 : 7;
      newFrom = addDays(from, offset);
      newTo = addDays(to, offset);
    } else if (label === "Este mes" || label === "Mes anterior" || (daysDiff >= 27 && daysDiff <= 31)) {
      const offset = direction === "prev" ? -1 : 1;
      newFrom = startOfMonth(addMonths(from, offset));
      newTo = endOfMonth(newFrom);
    } else if (label === "Este año" || daysDiff > 360) {
      const offset = direction === "prev" ? -1 : 1;
      newFrom = subYears(from, -offset);
      newTo = addYears(to, offset);
    } else {
      const offset = direction === "prev" ? -daysDiff : daysDiff;
      newFrom = addDays(from, offset);
      newTo = addDays(to, offset);
    }

    setDateRange({
      from: newFrom,
      to: newTo,
      label: `${format(newFrom, "dd/MM/yy")} - ${format(newTo, "dd/MM/yy")}`,
    });
  };

  // Calculate chart data based on date range
  const getChartData = () => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const totalDays = differenceInDays(dateRange.to, dateRange.from) + 1;

    // Daily view
    if (totalDays <= 7) {
      const allDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

      return allDays.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const daySessions = sessions.filter(s => s.fecha === dateStr);
        const totalSeconds = daySessions.reduce((acc, s) => acc + s.duracion_segundos, 0);
        const pomodoroCount = daySessions.filter(s => s.tipo === 'pomodoro').length;
        const flashcardSessions = daySessions.filter(s => s.tipo === 'flashcard').length;

        return {
          label: days[date.getDay()],
          sublabel: format(date, 'dd/MM'),
          date: dateStr,
          hours: totalSeconds / 3600,
          pomodoros: pomodoroCount,
          flashcards: flashcardSessions,
        };
      });
    } else if (totalDays <= 90) {
      // Weekly view
      const weeks: { [key: string]: { hours: number; pomodoros: number; flashcards: number; startDate: Date } } = {};

      sessions.forEach(session => {
        const sessionDate = new Date(session.fecha.includes("T") ? session.fecha : `${session.fecha}T12:00:00`);
        const weekStart = new Date(sessionDate);
        weekStart.setDate(sessionDate.getDate() - sessionDate.getDay());
        const weekKey = format(weekStart, 'yyyy-MM-dd');

        if (!weeks[weekKey]) {
          weeks[weekKey] = { hours: 0, pomodoros: 0, flashcards: 0, startDate: weekStart };
        }
        weeks[weekKey].hours += session.duracion_segundos / 3600;
        if (session.tipo === 'pomodoro') weeks[weekKey].pomodoros++;
        if (session.tipo === 'flashcard') weeks[weekKey].flashcards++;
      });

      return Object.entries(weeks)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, data]) => ({
          label: `Sem`,
          sublabel: format(data.startDate, 'dd/MM'),
          date: key,
          hours: data.hours,
          pomodoros: data.pomodoros,
          flashcards: data.flashcards,
        }));
    } else {
      // Monthly view
      const months: { [key: string]: { hours: number; pomodoros: number; flashcards: number; date: Date } } = {};

      sessions.forEach(session => {
        const sessionDate = new Date(session.fecha.includes("T") ? session.fecha : `${session.fecha}T12:00:00`);
        const monthKey = format(sessionDate, 'yyyy-MM');

        if (!months[monthKey]) {
          months[monthKey] = { hours: 0, pomodoros: 0, flashcards: 0, date: sessionDate };
        }
        months[monthKey].hours += session.duracion_segundos / 3600;
        if (session.tipo === 'pomodoro') months[monthKey].pomodoros++;
        if (session.tipo === 'flashcard') months[monthKey].flashcards++;
      });

      return Object.entries(months)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, data]) => ({
          label: format(data.date, 'MMM'),
          sublabel: format(data.date, 'yyyy'),
          date: key,
          hours: data.hours,
          pomodoros: data.pomodoros,
          flashcards: data.flashcards,
        }));
    }
  };

  // Calculate subject progress (filtrado por da seleccionado si existe)
  const getSubjectProgress = (): SubjectStudyData[] => {
    const subjectMap: Record<string, { total_seconds: number; sessions_count: number }> = {};
    const relevantSessions = selectedChartDate
      ? sessions.filter(s => s.fecha === selectedChartDate || (s.fecha && s.fecha.startsWith(selectedChartDate)))
      : sessions;

    relevantSessions.forEach(session => {
      const subId = session.subject_id || "unassigned";
      if (!subjectMap[subId]) {
        subjectMap[subId] = { total_seconds: 0, sessions_count: 0 };
      }
      subjectMap[subId].total_seconds += session.duracion_segundos;
      subjectMap[subId].sessions_count += 1;
    });

    return Object.entries(subjectMap)
      .map(([subject_id, data]) => ({
        subject_id,
        nombre: subject_id === "unassigned"
          ? "Sin materia / General"
          : (subjects.find(s => s.id === subject_id)?.nombre || "Materia no encontrada"),
        ...data,
      }))
      .sort((a, b) => b.total_seconds - a.total_seconds)
      .slice(0, 8);
  };

  const chartData = getChartData();
  const subjectProgress = getSubjectProgress();
  const maxHours = Math.max(...chartData.map(d => d.hours), 0.1);
  const totalHours = sessions.reduce((acc, s) => acc + s.duracion_segundos / 3600, 0);
  const totalPomodoros = sessions.filter(s => s.tipo === 'pomodoro').length;
  const totalFlashcardSessions = sessions.filter(s => s.tipo === 'flashcard').length;
  const studiedSubjects = new Set(sessions.map(s => s.subject_id).filter(Boolean)).size;
  const totalDays = differenceInDays(dateRange.to, dateRange.from) + 1;

  const formatHours = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    return `${hours.toFixed(1)}h`;
  };

  const getChartTitle = () => {
    if (totalDays <= 14) return "Horas de Estudio por Día";
    if (totalDays <= 90) return "Horas de Estudio por Semana";
    return "Horas de Estudio por Mes";
  };

  return (
    <div className="tabe-page p-4 lg:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Métricas y Rendimiento
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-normal text-xs sm:text-sm mt-0.5">
              Analiza tu progreso y optimiza tus sesiones de estudio
            </p>
          </div>

          {/* Date Range Filter & Navigation */}
          <div className="flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 w-fit">
            <button
              onClick={() => handleNavigate("prev")}
              className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700/70 rounded-lg transition-colors cursor-pointer"
              title="Período anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <DateRangeFilter value={dateRange} onChange={setDateRange} />

            <button
              onClick={() => handleNavigate("next")}
              className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white dark:hover:bg-zinc-700/70 rounded-lg transition-colors cursor-pointer"
              title="Período siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selector Notion / ChatGPT Style */}
        <div className="flex bg-zinc-100/80 dark:bg-zinc-850 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 gap-1 w-full sm:w-fit overflow-x-auto no-scrollbar shadow-2xs">
          {([
            { id: "general", label: "General", icon: BarChart3, iconColor: "text-zinc-500 dark:text-zinc-400" },
            { id: "carrera", label: "Carrera & Predicción", icon: GraduationCap, iconColor: "text-amber-500" },
            { id: "flashcards", label: "Flashcards", icon: Layers, iconColor: "text-sky-500" },
            { id: "rutinas", label: "Rutinas", icon: Calendar, iconColor: "text-emerald-500" },
            { id: "sueno", label: "Descanso", icon: Moon, iconColor: "text-indigo-500" },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex items-center shrink-0 cursor-pointer",
                  isSelected
                    ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
                )}
              >
                {isSelected && (
                  <motion.span
                    layoutId="metrics-tab-pill"
                    transition={{ type: "spring", stiffness: 520, damping: 36, mass: 0.7 }}
                    className="absolute inset-0 rounded-lg bg-white dark:bg-zinc-800 shadow-2xs border border-zinc-200/60 dark:border-zinc-700/60"
                  />
                )}
                <Icon className={cn("relative z-10 w-3.5 h-3.5 mr-1.5", tab.iconColor)} />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "general" ? (
        <>
          {/* Action Buttons Clean Style */}
          <div className="flex flex-wrap items-center justify-end gap-2 -mt-2">
            <button
              onClick={() => setActiveTab("carrera")}
              className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-900 dark:text-zinc-100 border border-zinc-200/90 dark:border-zinc-700/80 font-medium text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-amber-500" />
              Predictor de Graduación
            </button>
            <button
              onClick={() => setShowManualDialog(true)}
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-medium text-xs px-3.5 py-2 rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Cargar Tiempo Manual
            </button>
            <button
              onClick={() => {
                setSelectedDeleteDate(toLocalDateStr(new Date()));
                setSelectedDeleteSubjectId("all");
                setShowDeleteDialog(true);
              }}
              className="text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border border-zinc-200/80 dark:border-zinc-800 hover:border-red-200 dark:hover:border-red-900/40 font-medium text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Ajustar Tiempo
            </button>
          </div>

          {/* Stats Bento Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 tour-metrics-overview">
            <div className="neo-bento-card p-5 group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Horas totales</span>
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                  <Clock className="w-4 h-4 text-sky-500" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {formatHours(totalHours)}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1 font-normal">En el período seleccionado</p>
            </div>

            <div className="neo-bento-card p-5 group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Pomodoros</span>
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                  <Timer className="w-4 h-4 text-amber-500" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {totalPomodoros}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1 font-normal">Bloques enfocados</p>
            </div>

            <div className="neo-bento-card p-5 group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Materias</span>
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {studiedSubjects}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1 font-normal">Con actividad registrada</p>
            </div>

            <div className="neo-bento-card p-5 group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Flashcards</span>
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                  <Layers className="w-4 h-4 text-orange-500" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {totalFlashcardSessions}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1 font-normal">Sesiones de repaso</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Weekly Chart */}
            <div className="lg:col-span-2 neo-bento-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-semibold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
                      {getChartTitle()}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Haz clic en cualquier barra para ajustar o editar ese día
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 border border-zinc-200/60 dark:border-zinc-700/60">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                </div>

                {loading && sessions.length === 0 ? (
                  <div className="h-48 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="flex items-end justify-between gap-2 h-52 pt-6 overflow-x-auto pb-2 px-2 border-b border-zinc-200/80 dark:border-zinc-800">
                    {chartData.map((item, idx) => (
                      <div
                        key={`${item.date}-${idx}`}
                        onClick={() => {
                          setSelectedDeleteDate(item.date);
                          setSelectedDeleteSubjectId("all");
                          setShowDeleteDialog(true);
                        }}
                        className="flex-1 min-w-[32px] max-w-[56px] flex flex-col items-center justify-end gap-2 h-full cursor-pointer group/col"
                        title="Click para ajustar o eliminar tiempo de este día"
                      >
                        <div
                          className={cn(
                            "w-full transition-all duration-200 relative rounded-t-md group-hover/col:opacity-95 active:scale-95",
                            item.hours > 0 
                              ? "bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white" 
                              : "bg-zinc-100 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-700/60"
                          )}
                          style={{
                            height: `${Math.max((item.hours / maxHours) * 78, item.hours > 0 ? 10 : 4)}%`,
                          }}
                        >
                          {item.hours > 0 && (
                            <div className="absolute -top-14 left-1/2 -translate-x-1/2 opacity-0 group-hover/col:opacity-100 transition-all duration-150 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap z-30 pointer-events-none shadow-lg border border-white/10 dark:border-zinc-300 flex flex-col items-center gap-0.5">
                              <span className="font-semibold text-xs">{formatHours(item.hours)}</span>
                              {(item.pomodoros > 0 || item.flashcards > 0) && (
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-normal">
                                  {item.pomodoros > 0 ? `${item.pomodoros} pom` : ""}
                                  {item.pomodoros > 0 && item.flashcards > 0 ? " \u00b7 " : ""}
                                  {item.flashcards > 0 ? `${item.flashcards} flash` : ""}
                                </span>
                              )}
                              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-normal">Clic para seleccionar e inspeccionar</span>
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rotate-45"></div>
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover/col:text-zinc-900 dark:group-hover/col:text-zinc-100 transition-colors">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-zinc-400">{item.sublabel}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Barra contextual si hay un da seleccionado */}
              {selectedChartDate ? (
                <div className="mt-5 p-3.5 bg-zinc-50 dark:bg-[#1a1a1a] border border-primary/30 dark:border-primary/20 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <span>{chartData.find(d => d.date === selectedChartDate)?.label} ({chartData.find(d => d.date === selectedChartDate)?.sublabel})</span>
                        <span className="text-[11px] font-normal text-zinc-500">
                           {formatHours(chartData.find(d => d.date === selectedChartDate)?.hours || 0)} estudiadas
                        </span>
                      </p>
                      <p className="text-[10px] text-zinc-400">Viendo materias de este da a la derecha</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setManualDialogDate(selectedChartDate);
                        setShowManualDialog(true);
                      }}
                      className="text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Aadir tiempo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDeleteDate(selectedChartDate);
                        setSelectedDeleteSubjectId("all");
                        setShowDeleteDialog(true);
                      }}
                      className="text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar tiempo
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedChartDate(null)}
                      className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 px-2 py-1.5 transition-colors cursor-pointer"
                      title="Volver a ver todo el perodo"
                    >
                      Deseleccionar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 font-medium">Promedio diario</p>
                    <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                      {formatHours(totalHours / totalDays)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setManualDialogDate(toLocalDateStr(new Date()));
                        setShowManualDialog(true);
                      }}
                      className="text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Aadir tiempo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDeleteDate(toLocalDateStr(new Date()));
                        setSelectedDeleteSubjectId("all");
                        setShowDeleteDialog(true);
                      }}
                      className="text-xs font-medium text-zinc-500 hover:text-red-600 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-700/80 hover:border-red-200 dark:hover:border-red-900/50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Ajustar horas
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Subject Progress */}
            <div className="neo-bento-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
                      Por Materia
                    </h3>
                    {selectedChartDate && (
                      <p className="text-[11px] text-primary font-medium mt-0.5">
                        Da: {chartData.find(d => d.date === selectedChartDate)?.label} ({chartData.find(d => d.date === selectedChartDate)?.sublabel})
                      </p>
                    )}
                  </div>
                  {selectedChartDate ? (
                    <button
                      type="button"
                      onClick={() => setSelectedChartDate(null)}
                      className="text-[10px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md border border-zinc-200/60 dark:border-zinc-700/60 transition-colors"
                    >
                      Ver todo el perodo ?
                    </button>
                  ) : (
                    <span className="text-[10px] font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-200/60 dark:border-zinc-700/60">
                      Toca un da p/ filtrar
                    </span>
                  )}
                </div>

                {loading && subjects.length === 0 ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-3/4 mb-2" />
                        <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : subjectProgress.length === 0 ? (
                  <p className="text-zinc-400 font-normal text-xs text-center py-10">
                    No hay sesiones registradas en este período
                  </p>
                ) : (
                  <div className="space-y-3">
                    {subjectProgress.map((subject, i) => {
                      const maxSeconds = subjectProgress[0]?.total_seconds || 1;
                      const progress = (subject.total_seconds / maxSeconds) * 100;
                      const barColors = [
                        "bg-zinc-900 dark:bg-zinc-100",
                        "bg-sky-500",
                        "bg-amber-500",
                        "bg-emerald-500",
                        "bg-indigo-500"
                      ];
                      const colorClass = barColors[i % barColors.length];

                      return (
                        <div
                          key={subject.subject_id}
                          onClick={() => {
                            setSelectedDeleteDate(toLocalDateStr(new Date()));
                            setSelectedDeleteSubjectId(subject.subject_id === "unassigned" ? "none" : subject.subject_id);
                            setShowDeleteDialog(true);
                          }}
                          className="p-2 -mx-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60 border border-transparent hover:border-zinc-200/60 dark:hover:border-zinc-700/60 transition-colors cursor-pointer group/sub"
                          title={`Click para eliminar tiempo de ${subject.nombre}`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1.5">
                              <span>{subject.nombre}</span>
                              <Trash2 className="w-3 h-3 text-zinc-400 opacity-0 group-hover/sub:opacity-100 hover:text-red-500 transition-opacity" />
                            </span>
                            <div className="flex items-center gap-2 ml-2 shrink-0">
                              <span className="text-[10px] text-zinc-400">
                                {subject.sessions_count} {subject.sessions_count === 1 ? "sesión" : "sesiones"}
                              </span>
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {formatHours(subject.total_seconds / 3600)}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", colorClass)}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Session Type Breakdown */}
          <div className="neo-bento-card p-6">
            <h3 className="font-semibold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100 mb-4">
              Tipos de Sesión
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {(() => {
                const knownTypes: Record<string, { label: string; icon: any; iconColor: string }> = {
                  pomodoro: { label: "Pomodoro", icon: Timer, iconColor: "text-amber-500" },
                  flashcard: { label: "Flashcards", icon: Layers, iconColor: "text-sky-500" },
                  cuestionario: { label: "Cuestionarios & Quizzes", icon: BookOpen, iconColor: "text-rose-500" },
                  apuntes: { label: "Apuntes & Docs", icon: BookOpen, iconColor: "text-emerald-500" },
                  biblioteca: { label: "Biblioteca", icon: Library, iconColor: "text-blue-500" },
                  manual: { label: "Tiempo Manual", icon: Clock, iconColor: "text-zinc-500" },
                  estudio: { label: "Estudio Libre", icon: BookOpen, iconColor: "text-orange-500" },
                };

                const canonicalType = (t: string) => {
                  const normalized = (t || "").toLowerCase().trim();
                  if (normalized === "quiz") return "cuestionario";
                  if (normalized === "focus") return "estudio";
                  return normalized || "estudio";
                };

                const typeCounts: Record<string, { count: number; seconds: number }> = {};
                sessions.forEach(s => {
                  const key = canonicalType(s.tipo);
                  if (key === "videocall") return;
                  if (!typeCounts[key]) {
                    typeCounts[key] = { count: 0, seconds: 0 };
                  }
                  typeCounts[key].count++;
                  typeCounts[key].seconds += s.duracion_segundos;
                });

                const renderedKeys = Array.from(new Set([...Object.keys(knownTypes), ...Object.keys(typeCounts)]))
                  .filter(k => k !== "videocall");

                return renderedKeys.map((key) => {
                  const meta = knownTypes[key] || {
                    label: key.charAt(0).toUpperCase() + key.slice(1),
                    icon: Clock,
                    iconColor: "text-zinc-400",
                  };
                  const data = typeCounts[key] || { count: 0, seconds: 0 };
                  const Icon = meta.icon;

                  return (
                    <div
                      key={key}
                      className="p-4 rounded-xl bg-zinc-50/90 dark:bg-[#1a1a1a] border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center">
                          <Icon className={cn("w-4 h-4", meta.iconColor)} />
                        </div>
                        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 px-2 py-0.5 rounded-md">
                          {formatHours(data.seconds / 3600)}
                        </span>
                      </div>
                      <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{data.count}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate mt-0.5">{meta.label}</p>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <ManualStudyDialog
            open={showManualDialog}
            onOpenChange={setShowManualDialog}
            onSuccess={fetchData}
            subjects={subjects}
            initialDate={manualDialogDate}
          />
          <DeleteStudyTimeDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onSuccess={() => fetchData(false)}
            subjects={subjects}
            sessions={sessions}
            initialDate={selectedDeleteDate}
            initialSubjectId={selectedDeleteSubjectId}
          />
        </>
      ) : activeTab === "carrera" ? (
        <CareerAnalytics />
      ) : activeTab === "flashcards" ? (
        <FlashcardStats dateRange={dateRange} />
      ) : activeTab === "rutinas" ? (
        <RoutineStats dateRange={dateRange} />
      ) : (
        <SleepStats dateRange={dateRange} />
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3, Clock, BookOpen,
  Timer, Layers, Video, Calendar, Library,
  ChevronLeft, ChevronRight, Plus
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
import { ManualStudyDialog } from "@/components/metrics/ManualStudyDialog";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, DateRange, WEEK_OPTIONS } from "@/components/metrics/DateRangeFilter";
import { Moon } from "lucide-react";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface StudySession {
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
  const [activeTab, setActiveTab] = useState<"general" | "flashcards" | "rutinas" | "sueno">("general");
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
  const [showManualDialog, setShowManualDialog] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user && !isGuest) return;
    setLoading(true);

    if (isGuest) {
      const today = new Date();
      const mockSessions: StudySession[] = [];
      const types = ["pomodoro", "flashcard", "estudio", "videocall"];

      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);

        const sessionsToday = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < sessionsToday; j++) {
          mockSessions.push({
            fecha: toLocalDateStr(d),
            duracion_segundos: Math.floor(Math.random() * 3600) + 1800,
            tipo: types[Math.floor(Math.random() * types.length)],
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
      const { data: sessionData } = await supabase
        .from("study_sessions")
        .select("fecha, duracion_segundos, tipo, subject_id")
        .eq("user_id", user.id)
        .gte("fecha", toLocalDateStr(dateRange.from))
        .lte("fecha", toLocalDateStr(dateRange.to))
        .order("fecha", { ascending: true });

      const { data: subjectData } = await supabase
        .from("subjects")
        .select("id, nombre, año")
        .eq("user_id", user.id);

      setSessions(sessionData || []);
      setSubjects((subjectData || []) as any);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  }, [user, isGuest, dateRange]);

  useEffect(() => {
    if (user || isGuest) {
      fetchData();
    }
  }, [user, isGuest, fetchData]);

  // Listen to realtime study sessions updates (e.g. from exit-saves during navigation)
  useRealtimeSubscription({
    table: "study_sessions",
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onChange: useCallback(() => {
      fetchData();
    }, [fetchData]),
    enabled: !!user,
  });

  const handleNavigate = (direction: "prev" | "next") => {
    const { from, to, label } = dateRange;
    const daysDiff = differenceInDays(to, from) + 1;
    let newFrom = from;
    let newTo = to;

    if (label === "Esta semana" || (daysDiff >= 6 && daysDiff <= 8)) {
      // Navigate by weeks
      const offset = direction === "prev" ? -7 : 7;
      newFrom = addDays(from, offset);
      newTo = addDays(to, offset);
    } else if (label === "Este mes" || label === "Mes anterior" || (daysDiff >= 27 && daysDiff <= 31)) {
      // Navigate by months
      const offset = direction === "prev" ? -1 : 1;
      newFrom = startOfMonth(addMonths(from, offset));
      newTo = endOfMonth(newFrom);
    } else if (label === "Este año" || daysDiff > 360) {
      // Navigate by years
      const offset = direction === "prev" ? -1 : 1;
      newFrom = subYears(from, -offset);
      newTo = addYears(to, offset);
    } else {
      // Default: Shift by the current range duration
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
      
      // If it's a natural week (Mon-Sun), ensure we show all 7 days even if empty
      // but only if it's "This Week" or similar
      const isNaturalWeek = totalDays === 7 && dateRange.from.getDay() === 1;

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
      // Weekly view - aggregate by week
      const weeks: { [key: string]: { hours: number; pomodoros: number; flashcards: number; startDate: Date } } = {};

      sessions.forEach(session => {
        const sessionDate = new Date(session.fecha);
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
        const sessionDate = new Date(session.fecha);
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

  // Calculate subject progress
  const getSubjectProgress = (): SubjectStudyData[] => {
    const subjectMap: Record<string, { total_seconds: number; sessions_count: number }> = {};

    sessions.forEach(session => {
      if (session.subject_id) {
        if (!subjectMap[session.subject_id]) {
          subjectMap[session.subject_id] = { total_seconds: 0, sessions_count: 0 };
        }
        subjectMap[session.subject_id].total_seconds += session.duracion_segundos;
        subjectMap[session.subject_id].sessions_count += 1;
      }
    });

    return Object.entries(subjectMap)
      .map(([subject_id, data]) => ({
        subject_id,
        nombre: subjects.find(s => s.id === subject_id)?.nombre || "Sin materia",
        ...data,
      }))
      .sort((a, b) => b.total_seconds - a.total_seconds)
      .slice(0, 5);
  };

  const chartData = getChartData();
  const subjectProgress = getSubjectProgress();
  const maxHours = Math.max(...chartData.map(d => d.hours), 0.1);
  const totalHours = sessions.reduce((acc, s) => acc + s.duracion_segundos / 3600, 0);
  const totalPomodoros = sessions.filter(s => s.tipo === 'pomodoro').length;
  const totalFlashcardSessions = sessions.filter(s => s.tipo === 'flashcard').length;
  const totalVideocallSessions = sessions.filter(s => s.tipo === 'videocall').length;
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

  const getSessionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      pomodoro: "Pomodoro",
      flashcard: "Flashcards",
      videocall: "Videollamadas",
      estudio: "Estudio Libre",
      apuntes: "Apuntes",
      biblioteca: "Biblioteca",
      manual: "Manual",
    };
    return labels[type] || type;
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="font-black text-3xl lg:text-4xl uppercase tracking-widest text-black">
              Métricas y Rendimiento
            </h1>
            <p className="text-black/60 font-bold mt-2 uppercase text-sm">
              Analiza tu progreso y optimiza tu estudio
            </p>
          </div>

          {/* Date Range Filter & Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNavigate("prev")}
              className="bg-white border-4 border-black hover:translate-y-[-2px] shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000] h-10 w-10 flex items-center justify-center transition-all rounded-xl"
            >
              <ChevronLeft className="w-5 h-5 text-black" />
            </button>
            
            <div className="border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl bg-white font-black uppercase text-black flex items-center justify-center min-w-[200px]">
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
            </div>

            <button
              onClick={() => handleNavigate("next")}
              className="bg-white border-4 border-black hover:translate-y-[-2px] shadow-[4px_4px_0_0_#000] hover:shadow-[6px_6px_0_0_#000] h-10 w-10 flex items-center justify-center transition-all rounded-xl"
            >
              <ChevronRight className="w-5 h-5 text-black" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-gray-200 border-4 border-black rounded-xl p-2 gap-2 w-fit max-w-full overflow-x-auto shadow-[inset_0_4px_0_0_rgba(0,0,0,0.1)]">{/* scrollable on mobile */}
          <button
            onClick={() => setActiveTab("general")}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-black uppercase transition-all whitespace-nowrap flex items-center",
              activeTab === "general"
                ? "bg-[#BFFF00] text-black border-4 border-black shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.1)] scale-[0.98]"
                : "bg-white text-black/60 border-2 border-transparent hover:text-black hover:bg-white/80"
            )}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            General
          </button>
          <button
            onClick={() => setActiveTab("flashcards")}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-black uppercase transition-all whitespace-nowrap flex items-center",
              activeTab === "flashcards"
                ? "bg-[#FF9B71] text-black border-4 border-black shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.1)] scale-[0.98]"
                : "bg-white text-black/60 border-2 border-transparent hover:text-black hover:bg-white/80"
            )}
          >
            <Layers className="w-4 h-4 mr-2" />
            Flashcards
          </button>
          <button
            onClick={() => setActiveTab("rutinas")}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-black uppercase transition-all whitespace-nowrap flex items-center",
              activeTab === "rutinas"
                ? "bg-[#00E5FF] text-black border-4 border-black shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.1)] scale-[0.98]"
                : "bg-white text-black/60 border-2 border-transparent hover:text-black hover:bg-white/80"
            )}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Rutinas
          </button>
          <button
            onClick={() => setActiveTab("sueno")}
            className={cn(
              "px-5 py-2 rounded-lg text-sm font-black uppercase transition-all whitespace-nowrap flex items-center",
              activeTab === "sueno"
                ? "bg-[#C688EB] text-black border-4 border-black shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.1)] scale-[0.98]"
                : "bg-white text-black/60 border-2 border-transparent hover:text-black hover:bg-white/80"
            )}
          >
            <Moon className="w-4 h-4 mr-2" />
            Sueño
          </button>
        </div>
      </div>

      {activeTab === "general" ? (
        <>
          {/* Manual Study Button */}
          <div className="flex justify-end -mt-2 mb-2">
            <button
              onClick={() => setShowManualDialog(true)}
              className="bg-[#BFFF00] text-black font-black uppercase text-xs px-4 py-2 border-4 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
              Cargar Tiempo Manual
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 tour-metrics-overview">
            <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#00E5FF] border-2 border-black rounded-lg flex items-center justify-center -rotate-3 group-hover:rotate-0 transition-transform">
                  <Clock className="w-5 h-5 text-black" strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-3xl font-black text-black tracking-tighter">{formatHours(totalHours)}</p>
              <p className="text-xs font-bold text-black/60 uppercase">Horas totales</p>
            </div>
            <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#FFD700] border-2 border-black rounded-lg flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
                  <Timer className="w-5 h-5 text-black" strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-3xl font-black text-black tracking-tighter">{totalPomodoros}</p>
              <p className="text-xs font-bold text-black/60 uppercase">Pomodoros</p>
            </div>
            <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#BFFF00] border-2 border-black rounded-lg flex items-center justify-center -rotate-6 group-hover:rotate-0 transition-transform">
                  <BookOpen className="w-5 h-5 text-black" strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-3xl font-black text-black tracking-tighter">{studiedSubjects}</p>
              <p className="text-xs font-bold text-black/60 uppercase">Materias</p>
            </div>
            <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#FF9B71] border-2 border-black rounded-lg flex items-center justify-center rotate-6 group-hover:rotate-0 transition-transform">
                  <Layers className="w-5 h-5 text-black" strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-3xl font-black text-black tracking-tighter">{totalFlashcardSessions}</p>
              <p className="text-xs font-bold text-black/60 uppercase">Flashcards</p>
            </div>
            <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5 hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#C688EB] border-2 border-black rounded-lg flex items-center justify-center -rotate-3 group-hover:rotate-0 transition-transform">
                  <Video className="w-5 h-5 text-black" strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-3xl font-black text-black tracking-tighter">{totalVideocallSessions}</p>
              <p className="text-xs font-bold text-black/60 uppercase">Videollamadas</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Weekly Chart */}
            <div className="lg:col-span-2 bg-white border-4 border-black shadow-[8px_8px_0_0_#000] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-black text-xl uppercase tracking-wider">{getChartTitle()}</h2>
                <div className="w-8 h-8 bg-[#00E5FF] border-2 border-black rounded-lg flex items-center justify-center rotate-3">
                  <BarChart3 className="w-4 h-4 text-black" strokeWidth={3} />
                </div>
              </div>

              {loading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex items-end justify-between gap-2 h-48 overflow-x-auto pb-2 px-2 border-b-4 border-black">
                  {chartData.map((item, idx) => (
                    <div key={`${item.date}-${idx}`} className="flex-1 min-w-[32px] max-w-[60px] flex flex-col items-center justify-end gap-2 h-full">
                      <div
                        className={cn(
                          "w-full transition-all duration-500 relative group rounded-t-sm",
                          item.hours > 0 ? "bg-[#BFFF00] border-2 border-black border-b-0 shadow-[2px_0_0_0_#000]" : "bg-gray-200 border-2 border-transparent"
                        )}
                        style={{
                          height: `${Math.max((item.hours / maxHours) * 100, 4)}%`,
                        }}
                      >
                        {item.hours > 0 && (
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white px-2 py-1 rounded text-xs font-bold whitespace-nowrap z-10 pointer-events-none">
                            {formatHours(item.hours)}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45"></div>
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-bold text-black">{item.label}</span>
                      <span className="text-[10px] font-bold text-black/50">{item.sublabel}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-6 border-t-4 border-black">
                <p className="text-sm font-bold text-black/60 uppercase mb-1">Promedio diario</p>
                <p className="text-4xl font-black text-black">
                  {formatHours(totalHours / totalDays)}
                </p>
              </div>
            </div>

            {/* Subject Progress */}
            <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-5">
              <h3 className="font-black uppercase text-lg mb-4 text-black">Por Materia</h3>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 border-2 border-black rounded w-3/4 mb-2" />
                      <div className="h-4 bg-gray-200 border-2 border-black rounded-full" />
                    </div>
                  ))}
                </div>
              ) : subjectProgress.length === 0 ? (
                <p className="text-black/60 font-bold uppercase text-sm text-center py-8">
                  No hay datos de estudio aún
                </p>
              ) : (
                <div className="space-y-4">
                  {subjectProgress.map((subject, i) => {
                    const maxSeconds = subjectProgress[0]?.total_seconds || 1;
                    const progress = (subject.total_seconds / maxSeconds) * 100;
                    const colors = ["#00E5FF", "#BFFF00", "#C688EB", "#FFD700", "#FF5C5C"];
                    const color = colors[i % colors.length];

                    return (
                      <div key={subject.subject_id}>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-bold text-black truncate">{subject.nombre}</span>
                          <span className="font-black text-black">
                            {formatHours(subject.total_seconds / 3600)}
                          </span>
                        </div>
                        <div className="h-4 border-2 border-black bg-gray-100 rounded-full overflow-hidden shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.1)]">
                          <div
                            className="h-full border-r-2 border-black transition-all duration-500"
                            style={{
                              width: `${progress}%`,
                              background: color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Session Type Breakdown */}
          <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] rounded-xl p-6">
            <h3 className="font-black uppercase text-xl mb-4 text-black">Tipos de Sesión</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                const types = {
                  pomodoro: { label: "Pomodoro", icon: Timer, color: "#FFD700" },
                  flashcard: { label: "Flashcards", icon: Layers, color: "#00E5FF" },
                  cuestionario: { label: "Cuestionarios", icon: BookOpen, color: "#FF5C5C" },
                  apuntes: { label: "Apuntes", icon: BookOpen, color: "#BFFF00" },
                  biblioteca: { label: "Biblioteca", icon: Library, color: "#3B82F6" },
                  videocall: { label: "Videollamadas", icon: Video, color: "#C688EB" },
                  manual: { label: "Manual", icon: Clock, color: "#00E5FF" },
                };

                const typeCounts: Record<string, { count: number; seconds: number }> = {};
                sessions.forEach(s => {
                  if (!typeCounts[s.tipo]) {
                    typeCounts[s.tipo] = { count: 0, seconds: 0 };
                  }
                  typeCounts[s.tipo].count++;
                  typeCounts[s.tipo].seconds += s.duracion_segundos;
                });

                return Object.entries(types).map(([key, { label, icon: Icon, color }]) => {
                  const data = typeCounts[key] || { count: 0, seconds: 0 };
                  return (
                    <div key={key} className="p-4 rounded-xl bg-white border-4 border-black shadow-[2px_2px_0_0_#000] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_0_#000] transition-all group">
                      <div className="w-10 h-10 border-2 border-black rounded-lg flex items-center justify-center mb-3 rotate-3 group-hover:rotate-0 transition-transform" style={{ backgroundColor: color }}>
                        <Icon className="w-5 h-5 text-black" strokeWidth={2.5} />
                      </div>
                      <p className="text-2xl font-black text-black">{data.count}</p>
                      <p className="text-xs font-bold text-black/60 uppercase">{label}</p>
                      <p className="text-xs font-bold text-black/80 mt-1 bg-gray-100 border-2 border-black px-2 py-0.5 rounded-full inline-block">
                        {formatHours(data.seconds / 3600)} total
                      </p>
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
          />
        </>
      ) : activeTab === "flashcards" ? (
        <FlashcardStats />
      ) : activeTab === "rutinas" ? (
        <RoutineStats dateRange={dateRange} />
      ) : (
        <SleepStats dateRange={dateRange} />
      )}
    </div>
  );
}

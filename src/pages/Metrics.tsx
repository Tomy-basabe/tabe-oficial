import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart3, Clock, BookOpen, 
  Timer, Layers, Video
} from "lucide-react";
import { subDays, eachDayOfInterval, format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { FlashcardStats } from "@/components/metrics/FlashcardStats";
import { DateRangeFilter, DateRange } from "@/components/metrics/DateRangeFilter";

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
  from: subDays(new Date(), 30),
  to: new Date(),
  label: "Últimos 30 días",
};

export default function Metrics() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"general" | "flashcards">("general");
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: sessionData } = await supabase
        .from("study_sessions")
        .select("fecha, duracion_segundos, tipo, subject_id")
        .eq("user_id", user.id)
        .gte("fecha", dateRange.from.toISOString().split('T')[0])
        .lte("fecha", dateRange.to.toISOString().split('T')[0])
        .order("fecha", { ascending: true });

      const { data: subjectData } = await supabase
        .from("subjects")
        .select("id, nombre");

      setSessions(sessionData || []);
      setSubjects(subjectData || []);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  }, [user, dateRange]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  // Calculate chart data based on date range
  const getChartData = () => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const totalDays = differenceInDays(dateRange.to, dateRange.from) + 1;
    
    // If range is <= 14 days, show daily data
    // If range is <= 90 days, show weekly aggregates
    // Otherwise, show monthly aggregates
    
    if (totalDays <= 14) {
      // Daily view
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

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold gradient-text">
              Métricas y Rendimiento
            </h1>
            <p className="text-muted-foreground mt-1">
              Analiza tu progreso y optimiza tu estudio
            </p>
          </div>
          
          {/* Date Range Filter */}
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
        
        {/* Tab Selector */}
        <div className="flex bg-secondary rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab("general")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "general" 
                ? "bg-gradient-to-r from-neon-cyan to-neon-purple text-background" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            General
          </button>
          <button
            onClick={() => setActiveTab("flashcards")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "flashcards" 
                ? "bg-gradient-to-r from-neon-cyan to-neon-purple text-background" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="w-4 h-4 inline mr-2" />
            Flashcards
          </button>
        </div>
      </div>

      {activeTab === "general" ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="card-gamer rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-neon-cyan/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-neon-cyan" />
                </div>
              </div>
            <p className="text-2xl font-display font-bold text-neon-cyan">{formatHours(totalHours)}</p>
            <p className="text-xs text-muted-foreground">Horas totales</p>
          </div>
            <div className="card-gamer rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-neon-gold/20 flex items-center justify-center">
                  <Timer className="w-5 h-5 text-neon-gold" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-neon-gold">{totalPomodoros}</p>
              <p className="text-xs text-muted-foreground">Pomodoros</p>
            </div>
            <div className="card-gamer rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-neon-green/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-neon-green" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-neon-green">{studiedSubjects}</p>
              <p className="text-xs text-muted-foreground">Materias</p>
            </div>
            <div className="card-gamer rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-neon-purple" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-neon-purple">{totalFlashcardSessions}</p>
              <p className="text-xs text-muted-foreground">Flashcards</p>
            </div>
            <div className="card-gamer rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Video className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-primary">{totalVideocallSessions}</p>
              <p className="text-xs text-muted-foreground">Videollamadas</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Weekly Chart */}
            <div className="lg:col-span-2 card-gamer rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-semibold text-lg">{getChartTitle()}</h2>
              <BarChart3 className="w-5 h-5 text-muted-foreground" />
              </div>
              
              {loading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
              <div className="flex items-end justify-between gap-1 h-48 overflow-x-auto pb-2">
                {chartData.map((item, idx) => (
                  <div key={`${item.date}-${idx}`} className="flex-1 min-w-[28px] max-w-[60px] flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "w-full rounded-t-lg transition-all duration-500 relative group",
                        item.hours > 0 ? "" : "bg-secondary/30"
                      )}
                      style={{
                        height: `${Math.max((item.hours / maxHours) * 100, 4)}%`,
                        background: item.hours > 0 
                          ? `linear-gradient(180deg, hsl(var(--neon-cyan)) 0%, hsl(var(--neon-purple)) 100%)`
                          : undefined,
                      }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-card px-2 py-1 rounded text-xs whitespace-nowrap border border-border z-10">
                        {formatHours(item.hours)}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-tight">{item.label}</span>
                    <span className="text-[9px] text-muted-foreground/70 leading-tight">{item.sublabel}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Promedio diario</p>
              <p className="text-2xl font-display font-bold gradient-text">
                {formatHours(totalHours / totalDays)}
              </p>
            </div>
            </div>

            {/* Subject Progress */}
            <div className="card-gamer rounded-xl p-5">
              <h3 className="font-display font-semibold mb-4">Por Materia</h3>
              
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                      <div className="h-2 bg-secondary rounded-full" />
                    </div>
                  ))}
                </div>
              ) : subjectProgress.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No hay datos de estudio aún
                </p>
              ) : (
                <div className="space-y-4">
                  {subjectProgress.map((subject, i) => {
                    const maxSeconds = subjectProgress[0]?.total_seconds || 1;
                    const progress = (subject.total_seconds / maxSeconds) * 100;
                    const colors = ["neon-cyan", "neon-green", "neon-purple", "neon-gold", "neon-red"];
                    const color = colors[i % colors.length];
                    
                    return (
                      <div key={subject.subject_id}>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="truncate">{subject.nombre}</span>
                          <span className={`font-medium text-${color}`}>
                            {formatHours(subject.total_seconds / 3600)}
                          </span>
                        </div>
                        <div className="progress-gamer h-2">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${progress}%`,
                              background: `linear-gradient(90deg, hsl(var(--${color})) 0%, hsl(var(--${color}) / 0.7) 100%)`,
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
          <div className="card-gamer rounded-xl p-6">
            <h3 className="font-display font-semibold mb-4">Tipos de Sesión</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(() => {
                const types = {
                  pomodoro: { label: "Pomodoro", icon: Timer, color: "neon-gold" },
                  flashcard: { label: "Flashcards", icon: Layers, color: "neon-cyan" },
                  videocall: { label: "Videollamadas", icon: Video, color: "neon-purple" },
                  estudio: { label: "Estudio Libre", icon: BookOpen, color: "neon-green" },
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
                    <div key={key} className={`p-4 rounded-xl bg-${color}/10 border border-${color}/30`}>
                      <Icon className={`w-6 h-6 text-${color} mb-2`} />
                      <p className={`text-xl font-display font-bold text-${color}`}>{data.count}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatHours(data.seconds / 3600)} total
                      </p>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </>
      ) : (
        <FlashcardStats />
      )}
    </div>
  );
}

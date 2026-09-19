import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Clock, Flame, Trophy, BarChart2, Calendar, RefreshCw, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn, toLocalDateStr } from "@/lib/utils";
import { toast } from "sonner";

interface SessionDetail {
  id: string;
  seconds: number;
  date: string;
}

interface SubjectStat {
  subjectId: string;
  name: string;
  code: string;
  totalSeconds: number;
  totalHours: number;
  sessionsCount: number;
  percentage: number;
  lastDate: string;
  sessions: SessionDetail[];
}

type Timeframe = "today" | "7d" | "30d" | "all";

export function SubjectStudyStats() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>("7d");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SubjectStat[]>([]);
  const [totalSecondsAll, setTotalSecondsAll] = useState(0);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchStats();
  }, [user, timeframe]);

  const fetchStats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Query study sessions strictly of type 'pomodoro'
      let query = supabase
        .from("study_sessions")
        .select("id, duracion_segundos, subject_id, subjects(id, nombre, codigo), fecha, tipo, created_at")
        .eq("user_id", user.id)
        .eq("tipo", "pomodoro")
        .order("fecha", { ascending: false });

      const todayStr = toLocalDateStr();
      if (timeframe === "today") {
        query = query.eq("fecha", todayStr);
      } else if (timeframe === "7d") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        query = query.gte("fecha", toLocalDateStr(d));
      } else if (timeframe === "30d") {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        query = query.gte("fecha", toLocalDateStr(d));
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by subject
      const subjectMap = new Map<string, {
        name: string;
        code: string;
        seconds: number;
        count: number;
        lastDate: string;
        sessions: SessionDetail[];
      }>();
      let overallSeconds = 0;

      (data || []).forEach((session: any) => {
        const seconds = session.duracion_segundos || 0;
        overallSeconds += seconds;

        const subId = session.subject_id || "general";
        const subName = session.subjects?.nombre || "Estudio Libre (General)";
        const subCode = session.subjects?.codigo || "GEN";
        const sessionDate = session.fecha || session.created_at?.split("T")[0] || "";

        const existing = subjectMap.get(subId) || {
          name: subName,
          code: subCode,
          seconds: 0,
          count: 0,
          lastDate: sessionDate,
          sessions: [],
        };

        existing.seconds += seconds;
        existing.count += 1;
        if (!existing.lastDate || sessionDate > existing.lastDate) {
          existing.lastDate = sessionDate;
        }
        existing.sessions.push({
          id: session.id,
          seconds,
          date: sessionDate,
        });

        subjectMap.set(subId, existing);
      });

      setTotalSecondsAll(overallSeconds);

      // Convert to array and calculate percentages
      const list: SubjectStat[] = Array.from(subjectMap.entries())
        .map(([id, val]) => ({
          subjectId: id,
          name: val.name,
          code: val.code,
          totalSeconds: val.seconds,
          totalHours: Number((val.seconds / 3600).toFixed(1)),
          sessionsCount: val.count,
          percentage: overallSeconds > 0 ? Math.round((val.seconds / overallSeconds) * 100) : 0,
          lastDate: val.lastDate,
          sessions: val.sessions.sort((a, b) => b.date.localeCompare(a.date)),
        }))
        .sort((a, b) => b.totalSeconds - a.totalSeconds);

      setStats(list);
    } catch (e) {
      console.error("Error fetching subject study stats:", e);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("study_sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Sesión de Pomodoro eliminada");
      fetchStats();
    } catch (e) {
      toast.error("No se pudo eliminar la sesión");
    }
  };

  const formatHoursMinutes = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours === 0 && mins === 0) return "< 1m";
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const formatFriendlyDate = (dateStr: string) => {
    if (!dateStr) return "";
    const today = toLocalDateStr();
    if (dateStr === today) return "Hoy";

    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    if (dateStr === toLocalDateStr(yest)) return "Ayer";

    const [y, m, d] = dateStr.split("-");
    if (y && m && d) {
      return `${d}/${m}/${y}`;
    }
    return dateStr;
  };

  const BAR_COLORS = [
    "bg-[#00E5FF]",
    "bg-[#00FF9D]",
    "bg-[#FFE600]",
    "bg-[#FF6B6B]",
    "bg-[#a855f7]",
    "bg-[#fbbf24]",
    "bg-[#ec4899]",
  ];

  return (
    <div className="bg-card border-4 border-foreground shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-2xl p-5 sm:p-7 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-border/70">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#FFE600] text-black border-2 border-foreground rounded-xl shadow-[2px_2px_0_0_#000]">
            <BarChart2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-foreground">
              Horas Reales de Pomodoro por Materia
            </h3>
            <p className="text-xs font-bold text-muted-foreground">
              Estadísticas exactas de sesiones de Pomodoro registradas en cada materia
            </p>
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl border-2 border-foreground self-start sm:self-auto flex-wrap">
          {(["today", "7d", "30d", "all"] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                timeframe === tf
                  ? "bg-foreground text-background shadow-[2px_2px_0_0_hsl(var(--foreground))] translate-y-[-1px]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tf === "today" ? "Hoy" : tf === "7d" ? "7 Días" : tf === "30d" ? "30 Días" : "Histórico"}
            </button>
          ))}
          <button
            onClick={fetchStats}
            className="p-1 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground cursor-pointer"
            title="Recargar estadísticas"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-background border-2 border-foreground rounded-xl p-4 shadow-[3px_3px_0_0_hsl(var(--foreground))] flex items-center gap-3">
          <div className="p-2 bg-[#00E5FF] text-black rounded-lg border border-foreground">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-muted-foreground block">
              Tiempo Total en Pomodoro
            </span>
            <span className="font-black text-xl text-foreground">
              {formatHoursMinutes(totalSecondsAll)}
            </span>
          </div>
        </div>

        <div className="bg-background border-2 border-foreground rounded-xl p-4 shadow-[3px_3px_0_0_hsl(var(--foreground))] flex items-center gap-3">
          <div className="p-2 bg-[#00FF9D] text-black rounded-lg border border-foreground">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-muted-foreground block">
              Materias con Pomodoros
            </span>
            <span className="font-black text-xl text-foreground">
              {stats.length}
            </span>
          </div>
        </div>

        <div className="bg-background border-2 border-foreground rounded-xl p-4 shadow-[3px_3px_0_0_hsl(var(--foreground))] flex items-center gap-3">
          <div className="p-2 bg-[#FFE600] text-black rounded-lg border border-foreground">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase text-muted-foreground block">
              Materia Más Estudiada
            </span>
            <span className="font-black text-sm text-foreground truncate block">
              {stats[0]?.name || "Ninguna aún"}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Breakdown List */}
      <div className="space-y-4">
        {stats.length === 0 ? (
          <div className="border-2 border-dashed border-foreground/30 rounded-xl p-10 text-center space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="font-black text-sm uppercase text-foreground">
              No hay sesiones de Pomodoro en este período ({timeframe === "today" ? "hoy" : timeframe === "7d" ? "últimos 7 días" : timeframe === "30d" ? "últimos 30 días" : "histórico"})
            </p>
            <p className="text-xs text-muted-foreground font-bold">
              Iniciá el temporizador Pomodoro seleccionando tu materia actual para registrar tiempo aquí.
            </p>
          </div>
        ) : (
          stats.map((stat, idx) => {
            const barColor = BAR_COLORS[idx % BAR_COLORS.length];
            const isExpanded = expandedSubjectId === stat.subjectId;

            return (
              <div
                key={stat.subjectId}
                className="bg-background border-2 border-foreground rounded-xl p-4 shadow-[3px_3px_0_0_hsl(var(--foreground))] space-y-2.5"
              >
                {/* Info row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-foreground text-background font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-black text-sm text-foreground truncate">
                        {stat.name}
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap text-[10px] font-bold text-muted-foreground">
                        <span>
                          {stat.sessionsCount} {stat.sessionsCount === 1 ? "sesión" : "sesiones"}
                        </span>
                        {stat.lastDate && (
                          <span className="px-1.5 py-0.5 rounded bg-muted border border-border text-foreground font-extrabold">
                            Última: {formatFriendlyDate(stat.lastDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <span className="font-black text-base text-foreground block">
                        {formatHoursMinutes(stat.totalSeconds)}
                      </span>
                      <span className="text-[11px] font-black px-1.5 py-0.2 rounded bg-muted border border-foreground/30">
                        {stat.percentage}% del total
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedSubjectId(isExpanded ? null : stat.subjectId)}
                      className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      title={isExpanded ? "Ocultar sesiones individuales" : "Ver sesiones individuales"}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-3.5 bg-muted rounded-full border-2 border-foreground overflow-hidden p-[1px]">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", barColor)}
                    style={{ width: `${Math.max(3, stat.percentage)}%` }}
                  />
                </div>

                {/* Expanded Session Details Drawer */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border/70 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center justify-between text-[11px] font-black text-muted-foreground uppercase px-1">
                      <span>Sesiones registradas ({stat.sessions.length})</span>
                      <span>Acciones</span>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {stat.sessions.map((sess, sIdx) => (
                        <div
                          key={sess.id || sIdx}
                          className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="font-bold text-foreground">
                              {formatFriendlyDate(sess.date)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              ({sess.date})
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-foreground">
                              {formatHoursMinutes(sess.seconds)}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteSession(sess.id)}
                              className="p-1 rounded text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Eliminar esta sesión de Pomodoro errónea"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Clock, Trophy, BarChart2, Calendar, RefreshCw, Trash2, ChevronDown, ChevronUp } from "lucide-react";
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
    } catch {
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

  const PROGRESS_COLORS = [
    "bg-rose-500",
    "bg-teal-500",
    "bg-amber-500",
    "bg-indigo-500",
    "bg-emerald-500",
    "bg-sky-500",
    "bg-fuchsia-500",
  ];

  return (
    <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5 sm:p-6 shadow-2xs space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center shrink-0">
            <BarChart2 className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Horas de Estudio por Materia
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60">
                <Clock className="w-3 h-3 text-amber-500" />
                Historial Real
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Registro del tiempo invertido en cada materia mediante Pomodoro
            </p>
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
          <div className="bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl flex items-center gap-1 border border-zinc-200/60 dark:border-zinc-700/50">
            {(["today", "7d", "30d", "all"] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  timeframe === tf
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                {tf === "today" ? "Hoy" : tf === "7d" ? "7 Días" : tf === "30d" ? "30 Días" : "Histórico"}
              </button>
            ))}
          </div>

          <button
            onClick={fetchStats}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#212121] hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors shadow-2xs cursor-pointer"
            title="Actualizar estadísticas"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono leading-none">
              {formatHoursMinutes(totalSecondsAll)}
            </p>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-1 truncate">
              Tiempo total invertido
            </p>
          </div>
        </div>

        <div className="bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/50 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono leading-none">
              {stats.length}
            </p>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-1 truncate">
              Materias con sesiones
            </p>
          </div>
        </div>

        <div className="bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/50 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 truncate leading-none">
              {stats[0]?.name || "Sin datos"}
            </p>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-1 truncate">
              Materia con mayor foco
            </p>
          </div>
        </div>
      </div>

      {/* Progress Breakdown List */}
      <div className="space-y-3">
        {stats.length === 0 ? (
          <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-10 text-center space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-zinc-400 dark:text-zinc-600" />
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              No hay sesiones de Pomodoro registradas en este período
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Inicia un ciclo seleccionando una materia para comenzar a acumular estadísticas aquí.
            </p>
          </div>
        ) : (
          stats.map((stat, idx) => {
            const barColor = PROGRESS_COLORS[idx % PROGRESS_COLORS.length];
            const isExpanded = expandedSubjectId === stat.subjectId;

            return (
              <div
                key={stat.subjectId}
                className="bg-zinc-50/40 dark:bg-zinc-800/30 border border-zinc-200/70 dark:border-zinc-800/70 rounded-xl p-4 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700 space-y-3"
              >
                {/* Info row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-zinc-200/80 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-mono text-xs font-semibold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {stat.name}
                        </h4>
                        {stat.code && (
                          <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                            {stat.code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        <span>
                          {stat.sessionsCount} {stat.sessionsCount === 1 ? "sesión" : "sesiones"}
                        </span>
                        {stat.lastDate && (
                          <>
                            <span>•</span>
                            <span>Última: {formatFriendlyDate(stat.lastDate)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-semibold font-mono text-zinc-900 dark:text-zinc-100 block">
                        {formatHoursMinutes(stat.totalSeconds)}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                        {stat.percentage}% del total
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedSubjectId(isExpanded ? null : stat.subjectId)}
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer transition-colors"
                      title={isExpanded ? "Ocultar sesiones" : "Ver sesiones individuales"}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", barColor)}
                    style={{ width: `${Math.max(3, stat.percentage)}%` }}
                  />
                </div>

                {/* Expanded Session Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-zinc-200/70 dark:border-zinc-800/70 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 uppercase tracking-wider px-1">
                      <span>Sesiones registradas ({stat.sessions.length})</span>
                      <span>Duración</span>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {stat.sessions.map((sess, sIdx) => (
                        <div
                          key={sess.id || sIdx}
                          className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#1f1f1f] border border-zinc-200/60 dark:border-zinc-800 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              {formatFriendlyDate(sess.date)}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              ({sess.date})
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                              {formatHoursMinutes(sess.seconds)}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteSession(sess.id)}
                              className="p-1 rounded-md text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Eliminar sesión"
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

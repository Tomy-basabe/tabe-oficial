import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Clock, Flame, Trophy, BarChart2, Calendar, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubjectStat {
  subjectId: string;
  name: string;
  code: string;
  totalSeconds: number;
  totalHours: number;
  sessionsCount: number;
  percentage: number;
}

type Timeframe = "7d" | "30d" | "all";

export function SubjectStudyStats() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>("30d");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SubjectStat[]>([]);
  const [totalSecondsAll, setTotalSecondsAll] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchStats();
  }, [user, timeframe]);

  const fetchStats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Calculate date boundary
      let query = supabase
        .from("study_sessions")
        .select("duracion_segundos, subject_id, subjects(id, nombre, codigo), fecha")
        .eq("user_id", user.id);

      if (timeframe === "7d") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        query = query.gte("fecha", d.toISOString().split("T")[0]);
      } else if (timeframe === "30d") {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        query = query.gte("fecha", d.toISOString().split("T")[0]);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by subject
      const subjectMap = new Map<string, { name: string; code: string; seconds: number; count: number }>();
      let overallSeconds = 0;

      (data || []).forEach((session: any) => {
        const seconds = session.duracion_segundos || 0;
        overallSeconds += seconds;

        const subId = session.subject_id || "general";
        const subName = session.subjects?.nombre || "Estudio Libre (General)";
        const subCode = session.subjects?.codigo || "GEN";

        const existing = subjectMap.get(subId) || {
          name: subName,
          code: subCode,
          seconds: 0,
          count: 0,
        };

        existing.seconds += seconds;
        existing.count += 1;
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
        }))
        .sort((a, b) => b.totalSeconds - a.totalSeconds);

      setStats(list);
    } catch (e) {
      console.error("Error fetching subject study stats:", e);
    } finally {
      setLoading(false);
    }
  };

  const formatHoursMinutes = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours === 0 && mins === 0) return "< 1m";
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
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
              Horas Reales por Materia
            </h3>
            <p className="text-xs font-bold text-muted-foreground">
              Estadísticas exactas del tiempo de estudio invertido en cada materia
            </p>
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl border-2 border-foreground self-start sm:self-auto">
          {(["7d", "30d", "all"] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                timeframe === tf
                  ? "bg-foreground text-background shadow-[2px_2px_0_0_hsl(var(--foreground))] translate-y-[-1px]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tf === "7d" ? "7 Días" : tf === "30d" ? "30 Días" : "Histórico"}
            </button>
          ))}
          <button
            onClick={fetchStats}
            className="p-1 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground"
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
              Tiempo Total de Estudio
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
              Materias Activas
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
              Aún no registraste sesiones en este período
            </p>
            <p className="text-xs text-muted-foreground font-bold">
              Iniciá el temporizador Pomodoro seleccionando tu materia para ver aquí cuántas horas reales le dedicás.
            </p>
          </div>
        ) : (
          stats.map((stat, idx) => {
            const barColor = BAR_COLORS[idx % BAR_COLORS.length];
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
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {stat.sessionsCount} {stat.sessionsCount === 1 ? "sesión" : "sesiones"} registradas
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-base text-foreground block">
                      {formatHoursMinutes(stat.totalSeconds)}
                    </span>
                    <span className="text-[11px] font-black px-1.5 py-0.2 rounded bg-muted border border-foreground/30">
                      {stat.percentage}% del total
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-3.5 bg-muted rounded-full border-2 border-foreground overflow-hidden p-[1px]">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", barColor)}
                    style={{ width: `${Math.max(3, stat.percentage)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

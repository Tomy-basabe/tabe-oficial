import { useState, useMemo } from "react";
import { useSubjects } from "@/hooks/useSubjects";
import {
  GraduationCap, TrendingUp, Award, AlertTriangle,
  Calendar, CheckCircle2, BookOpen, Sliders,
  Clock, Flame
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell
} from "recharts";
import { format, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const CLEAN_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "10px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
  fontWeight: "500",
  color: "hsl(var(--foreground))",
  fontSize: "12px",
};

export function CareerAnalytics() {
  const { subjects, loading } = useSubjects();

  // Ritmo de materias por año seleccionado por el estudiante (simulador)
  const [simulatedPace, setSimulatedPace] = useState<number>(6);

  // Estadísticas fundamentales de la carrera
  const stats = useMemo(() => {
    if (!subjects || subjects.length === 0) {
      return {
        total: 0,
        approved: 0,
        regular: 0,
        inProgress: 0,
        pending: 0,
        progressPercent: 0,
        averageGrade: 0,
        gradesCount: 0,
        gradesDistribution: [],
        gradesByYear: [],
        bottlenecks: [],
        yearsProgress: [],
        estimatedMonths: 0,
        estimatedDate: new Date(),
        realPacePerYear: 6,
      };
    }

    const total = subjects.length;
    const approvedList = subjects.filter((s) => s.status === "aprobada");
    const regularList = subjects.filter((s) => s.status === "regular");
    const inProgressList = subjects.filter((s) => s.status === "cursable" || s.status === "recursar");
    const pendingCount = total - approvedList.length;
    const progressPercent = Math.round((approvedList.length / total) * 100);

    // Notas válidas (con nota numérica > 0)
    const withGrades = approvedList.filter(
      (s) => typeof s.nota === "number" && s.nota > 0
    );
    const gradesSum = withGrades.reduce((acc, s) => acc + (s.nota || 0), 0);
    const averageGrade = withGrades.length > 0 ? parseFloat((gradesSum / withGrades.length).toFixed(2)) : 0;

    // Histograma de notas (de 4 a 10)
    const distributionMap: Record<number, number> = { 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    withGrades.forEach((s) => {
      const rounded = Math.round(s.nota || 0);
      if (rounded >= 4 && rounded <= 10) {
        distributionMap[rounded] = (distributionMap[rounded] || 0) + 1;
      }
    });

    const maxCount = Math.max(...Object.values(distributionMap), 1);
    const gradesDistribution = Object.entries(distributionMap).map(([grade, count]) => ({
      grade: `${grade} pts`,
      count,
      isTop: count === maxCount && count > 0,
    }));

    // Promedio por año de la carrera (1° a 6° año)
    const yearsMap: Record<number, { sum: number; count: number; totalInYear: number; approvedInYear: number }> = {};
    subjects.forEach((s) => {
      const year = s.año || 1;
      if (!yearsMap[year]) {
        yearsMap[year] = { sum: 0, count: 0, totalInYear: 0, approvedInYear: 0 };
      }
      yearsMap[year].totalInYear++;
      if (s.status === "aprobada") {
        yearsMap[year].approvedInYear++;
        if (typeof s.nota === "number" && s.nota > 0) {
          yearsMap[year].sum += s.nota;
          yearsMap[year].count++;
        }
      }
    });

    const gradesByYear = Object.entries(yearsMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([year, data]) => ({
        year: Number(year),
        yearName: `${year}° Año`,
        promedio: data.count > 0 ? parseFloat((data.sum / data.count).toFixed(2)) : 0,
        materiasConNota: data.count,
      }));

    const yearsProgress = Object.entries(yearsMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([year, data]) => ({
        year: Number(year),
        yearName: `${year}° Año`,
        percent: Math.round((data.approvedInYear / Math.max(data.totalInYear, 1)) * 100),
        total: data.totalInYear,
        aprobadas: data.approvedInYear,
      }));

    // Detección de cuellos de botella (materias pendientes que traban a otras correlativas)
    const pendingSubjects = subjects.filter((s) => s.status !== "aprobada");
    const bottlenecks = pendingSubjects
      .map((p) => {
        const blocksCount = subjects.filter((other) => {
          if (!other.correlativas || other.correlativas.length === 0) return false;
          return (
            other.correlativas.includes(p.id) ||
            (p.codigo && other.correlativas.includes(p.codigo)) ||
            other.correlativas.includes(p.nombre)
          );
        }).length;

        return {
          subject: p,
          blocksCount,
        };
      })
      .filter((b) => b.blocksCount > 0)
      .sort((a, b) => b.blocksCount - a.blocksCount)
      .slice(0, 5);

    // Estimación de meses para recibirse según ritmo simulado
    const safePace = Math.max(simulatedPace, 1);
    const yearsNeeded = pendingCount / safePace;
    const monthsNeeded = Math.ceil(yearsNeeded * 12);
    const estimatedDate = addMonths(new Date(), monthsNeeded);

    return {
      total,
      approved: approvedList.length,
      regular: regularList.length,
      inProgress: inProgressList.length,
      pending: pendingCount,
      progressPercent,
      averageGrade,
      gradesCount: withGrades.length,
      gradesDistribution,
      gradesByYear,
      bottlenecks,
      yearsProgress,
      estimatedMonths: monthsNeeded,
      estimatedDate,
      realPacePerYear: 6,
    };
  }, [subjects, simulatedPace]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <div className="w-8 h-8 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-zinc-500 font-medium">
          Calculando analíticas y proyecciones de carrera...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── 1. TARJETAS DE IMPACTO (KPI CARDS) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Avance Real */}
        <div className="neo-bento-card p-5 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Avance de Carrera
            </span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
              <GraduationCap className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {stats.progressPercent}%
            </span>
            <span className="text-xs text-zinc-400 font-medium">
              ({stats.approved}/{stats.total} mat.)
            </span>
          </div>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(stats.progressPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Promedio General */}
        <div className="neo-bento-card p-5 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Promedio General
            </span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
              <Award className="w-4 h-4 text-sky-500" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {stats.averageGrade > 0 ? stats.averageGrade : "-"}
            </span>
            <span className="text-xs text-zinc-400 font-medium">
              / 10 pts
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-2">
            {stats.gradesCount > 0
              ? `Basado en ${stats.gradesCount} materias con nota`
              : "Sin notas cargadas aún"}
          </p>
        </div>

        {/* Predictor de Graduación */}
        <div className="neo-bento-card p-5 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Recibida Estimada
            </span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
              <Calendar className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 capitalize">
              {stats.pending > 0
                ? format(stats.estimatedDate, "MMM yyyy", { locale: es })
                : "¡Graduado! 🎓"}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3 text-zinc-400" />
            {stats.pending > 0 ? `En ~${stats.estimatedMonths} meses aprox.` : "Plan completado"}
          </p>
        </div>

        {/* Materias Restantes */}
        <div className="neo-bento-card p-5 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Materias Faltantes
            </span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
              <BookOpen className="w-4 h-4 text-rose-500" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {stats.pending}
            </span>
            <span className="text-xs text-zinc-400 font-medium">
              de {stats.total} totales
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-2">
            {stats.regular > 0 ? `${stats.regular} regulares pendientes de final` : "Al día con los finales"}
          </p>
        </div>
      </div>

      {/* ─── 2. SIMULADOR PREDICTIVO INTERACTIVO (RITMO DE ESTUDIO) ─── */}
      <div className="neo-bento-card p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-[11px] rounded-md border border-amber-500/20">
                Predictor Inteligente
              </span>
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Simulador de Fecha de Graduación
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Ajusta tu ritmo previsto de materias por año para proyectar tu fecha de egreso
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {[4, 6, 8, 10].map((pace) => (
              <button
                key={pace}
                onClick={() => setSimulatedPace(pace)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer",
                  simulatedPace === pace
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs"
                    : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700/80 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                {pace} mat/año
              </button>
            ))}
          </div>
        </div>

        {/* Control Deslizante Interactivo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex justify-between items-center text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                Ritmo Seleccionado:
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-md border border-zinc-200 dark:border-zinc-700">
                {simulatedPace} materias por año (~{Math.round(simulatedPace / 2)} por cuatrimestre)
              </span>
            </div>

            <input
              type="range"
              min={1}
              max={12}
              step={1}
              value={simulatedPace}
              onChange={(e) => setSimulatedPace(Number(e.target.value))}
              className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
            />

            <div className="flex justify-between text-[11px] text-zinc-400">
              <span>🐢 1 mat/año (Muy pausado)</span>
              <span>🎯 6 mat/año (Estándar)</span>
              <span>🚀 12 mat/año (Acelerado)</span>
            </div>
          </div>

          {/* Resultado Visual del Simulador */}
          <div className="lg:col-span-5 bg-zinc-50/70 dark:bg-zinc-850/50 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-center items-center text-center">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Proyección de Egreso
            </span>
            <span className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-100 my-1">
              {format(stats.estimatedDate, "MMMM 'de' yyyy", { locale: es })}
            </span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Faltan aproximadamente <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{stats.estimatedMonths} meses</strong> (unos{" "}
              {Math.ceil(stats.estimatedMonths / 6)} cuatrimestres académicos).
            </p>
          </div>
        </div>
      </div>

      {/* ─── 3. GRÁFICOS ANALÍTICOS (PROMEDIO Y DISTRIBUCIÓN) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico A: Evolución de Promedio por Año */}
        <div className="neo-bento-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="font-semibold text-sm sm:text-base tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Evolución del Promedio por Año
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Rendimiento académico según año del plan de estudio
              </p>
            </div>
            {stats.averageGrade > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-md border border-emerald-500/20">
                Gral: {stats.averageGrade}
              </span>
            )}
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            {stats.gradesByYear.some((y) => y.promedio > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.gradesByYear} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="yearName" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={CLEAN_TOOLTIP_STYLE} formatter={(value: any) => [`${value} pts`, "Promedio"]} />
                  <ReferenceLine y={4} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Aprobación (4)", fill: "#ef4444", fontSize: 10 }} />
                  <ReferenceLine y={stats.averageGrade} stroke="#10b981" strokeDasharray="4 4" label={{ value: `Global (${stats.averageGrade})`, fill: "#10b981", fontSize: 10 }} />
                  <Area type="monotone" dataKey="promedio" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gradeGradient)" dot={{ r: 4, fill: "#10b981" }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-zinc-50 dark:bg-zinc-850/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <BookOpen className="w-8 h-8 text-zinc-400 mb-2" />
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Sin materias con nota numérica registrada</p>
                <p className="text-[11px] text-zinc-400 mt-1">Carga las notas finales en tu Plan de Carrera para ver la curva de evolución.</p>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico B: Distribución de Calificaciones (Histograma) */}
        <div className="neo-bento-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="font-semibold text-sm sm:text-base tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Distribución de Notas Obtenidas
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Frecuencia de notas finales en materias aprobadas
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-orange-500/10 text-orange-700 dark:text-orange-400 rounded-md border border-orange-500/20">
              {stats.gradesCount} Evaluaciones
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            {stats.gradesCount > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.gradesDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="grade" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={CLEAN_TOOLTIP_STYLE} formatter={(val: any) => [`${val} materias`, "Cantidad"]} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats.gradesDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isTop ? "#10b981" : Number(entry.grade) >= 6 ? "#0ea5e9" : "#f97316"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-zinc-50 dark:bg-zinc-850/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <Award className="w-8 h-8 text-zinc-400 mb-2" />
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Aún no hay calificaciones para graficar</p>
                <p className="text-[11px] text-zinc-400 mt-1">A medida que apruebes materias con nota, verás tu histograma de rendimiento.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 4. AVANCE POR AÑO & MATERIAS CUELLO DE BOTELLA ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Avance Segmentado por Año de la Carrera */}
        <div className="lg:col-span-7 neo-bento-card p-5 sm:p-6 space-y-4">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 className="font-semibold text-sm sm:text-base tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Avance Segmentado por Año
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Porcentaje completado en cada nivel de tu plan de estudios
            </p>
          </div>

          <div className="space-y-3.5">
            {stats.yearsProgress.map((yp, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{yp.yearName}</span>
                  <span className="text-zinc-400">
                    {yp.aprobadas}/{yp.total} materias ({yp.percent}%)
                  </span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      yp.percent === 100
                        ? "bg-emerald-500"
                        : yp.percent >= 50
                        ? "bg-sky-500"
                        : "bg-orange-500"
                    )}
                    style={{ width: `${yp.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Materias Cuello de Botella (Prioridades Estratégicas) */}
        <div className="lg:col-span-5 neo-bento-card p-5 sm:p-6 space-y-4">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h3 className="font-semibold text-sm sm:text-base tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Materias Clave (Destraban más)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Materias que te conviene priorizar para no trabar años futuros
            </p>
          </div>

          <div className="space-y-2.5">
            {stats.bottlenecks.length > 0 ? (
              stats.bottlenecks.map(({ subject, blocksCount }, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-zinc-50/70 dark:bg-zinc-850/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl flex items-center justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-xs text-zinc-800 dark:text-zinc-200 truncate">
                      {subject.nombre}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {subject.año}° Año • Código: {subject.codigo || "S/C"}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-semibold text-[11px] rounded-md border border-rose-500/20 shrink-0">
                    Traba {blocksCount} mat.
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-zinc-400">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">¡Sin trabas pendientes!</p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Has aprobado o cursado las materias correlativas centrales de tu plan.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

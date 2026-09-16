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

const NEO_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "3px solid hsl(var(--foreground))",
  borderRadius: "12px",
  boxShadow: "4px 4px 0 0 hsl(var(--foreground))",
  fontWeight: "bold",
  color: "hsl(var(--foreground))",
  textTransform: "uppercase" as const,
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
    const averageGrade =
      withGrades.length > 0
        ? Number(
            (
              withGrades.reduce((acc, s) => acc + (s.nota || 0), 0) /
              withGrades.length
            ).toFixed(2)
          )
        : 0;

    // Distribución de calificaciones (del 1 al 10)
    const distMap: Record<number, number> = { 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    withGrades.forEach((s) => {
      const g = Math.round(s.nota || 0);
      if (g >= 1 && g <= 10) {
        distMap[g] = (distMap[g] || 0) + 1;
      }
    });
    const gradesDistribution = Object.entries(distMap).map(([grade, count]) => ({
      grade: `${grade}`,
      count,
      isTop: Number(grade) >= 8,
    }));

    // Evolución de promedio y aprobadas por año académico de la carrera
    const yearsMap = new Map<number, { approved: number; total: number; sumGrades: number; countGrades: number }>();
    subjects.forEach((s) => {
      const y = s.año || 1;
      if (!yearsMap.has(y)) {
        yearsMap.set(y, { approved: 0, total: 0, sumGrades: 0, countGrades: 0 });
      }
      const item = yearsMap.get(y)!;
      item.total++;
      if (s.status === "aprobada") {
        item.approved++;
        if (typeof s.nota === "number" && s.nota > 0) {
          item.sumGrades += s.nota;
          item.countGrades++;
        }
      }
    });

    const gradesByYear = Array.from(yearsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, data]) => {
        const yearAvg = data.countGrades > 0 ? Number((data.sumGrades / data.countGrades).toFixed(2)) : 0;
        return {
          yearName: `${year}° Año`,
          promedio: yearAvg,
          aprobadas: data.approved,
          total: data.total,
          percent: Math.round((data.approved / data.total) * 100),
        };
      });

    const yearsProgress = gradesByYear;

    // Detección de Cuellos de Botella: materias no aprobadas que más bloquean
    const unapproved = subjects.filter((s) => s.status !== "aprobada");
    const bottleneckCounts = unapproved.map((sub) => {
      let blocksCount = 0;
      subjects.forEach((other) => {
        if (other.status !== "aprobada") {
          const reqs = other.dependencies || [];
          const blocks = reqs.some(
            (d) => d.requiere_aprobada === sub.id || d.requiere_regular === sub.id
          );
          if (blocks) blocksCount++;
        }
      });
      return {
        subject: sub,
        blocksCount,
      };
    });

    const bottlenecks = bottleneckCounts
      .filter((b) => b.blocksCount > 0)
      .sort((a, b) => b.blocksCount - a.blocksCount)
      .slice(0, 4);

    const remaining = pendingCount;
    const monthsNeeded = Math.ceil((remaining / Math.max(simulatedPace, 1)) * 12);
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
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-12 h-12 border-4 border-foreground border-t-transparent rounded-full animate-spin" />
        <p className="font-black text-sm uppercase tracking-widest text-muted-foreground">
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
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 hover:translate-y-[-2px] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">
              Avance de Carrera
            </span>
            <div className="w-9 h-9 bg-[#BFFF00] border-2 border-foreground rounded-lg flex items-center justify-center -rotate-3">
              <GraduationCap className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black tracking-tighter text-foreground">
              {stats.progressPercent}%
            </span>
            <span className="text-xs font-bold text-muted-foreground uppercase">
              ({stats.approved}/{stats.total} mat.)
            </span>
          </div>
          <div className="w-full bg-muted border-2 border-foreground rounded-full h-3.5 mt-3 p-0.5 overflow-hidden">
            <div
              className="bg-[#BFFF00] h-full rounded-full transition-all duration-500 border border-black/20"
              style={{ width: `${Math.min(stats.progressPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Promedio General */}
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 hover:translate-y-[-2px] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">
              Promedio General
            </span>
            <div className="w-9 h-9 bg-[#00E5FF] border-2 border-foreground rounded-lg flex items-center justify-center rotate-3">
              <Award className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black tracking-tighter text-foreground">
              {stats.averageGrade > 0 ? stats.averageGrade : "-"}
            </span>
            <span className="text-xs font-bold text-muted-foreground uppercase">
              / 10 pts
            </span>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase mt-2">
            {stats.gradesCount > 0
              ? `Basado en ${stats.gradesCount} materias con nota`
              : "Sin notas cargadas aún"}
          </p>
        </div>

        {/* Predictor de Graduación */}
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 hover:translate-y-[-2px] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">
              Recibida Estimada
            </span>
            <div className="w-9 h-9 bg-[#FFD700] border-2 border-foreground rounded-lg flex items-center justify-center -rotate-6">
              <Calendar className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl lg:text-3xl font-black tracking-tight text-foreground capitalize">
              {stats.pending > 0
                ? format(stats.estimatedDate, "MMM yyyy", { locale: es })
                : "¡Graduado! 🎓"}
            </span>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase mt-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-foreground" />
            {stats.pending > 0 ? `En ~${stats.estimatedMonths} meses aprox.` : "Plan completado"}
          </p>
        </div>

        {/* Materias Restantes */}
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 hover:translate-y-[-2px] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">
              Materias Faltantes
            </span>
            <div className="w-9 h-9 bg-[#FF9B71] border-2 border-foreground rounded-lg flex items-center justify-center rotate-6">
              <BookOpen className="w-5 h-5 text-black" strokeWidth={2.5} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black tracking-tighter text-foreground">
              {stats.pending}
            </span>
            <span className="text-xs font-bold text-muted-foreground uppercase">
              de {stats.total} totales
            </span>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase mt-2">
            {stats.regular > 0 ? `${stats.regular} regulares pendientes de final` : "Al día con los finales"}
          </p>
        </div>
      </div>

      {/* ─── 2. SIMULADOR PREDICTIVO INTERACTIVO (RITMO DE ESTUDIO) ─── */}
      <div className="bg-card border-4 border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] rounded-xl p-5 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b-2 border-foreground pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-[#FFD700] text-black font-black text-xs uppercase rounded-md border border-foreground">
                Predictor Inteligente
              </span>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-foreground">
                Simulador de Fecha de Graduación
              </h2>
            </div>
            <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase mt-1">
              Ajusta tu ritmo previsto de materias por año para proyectar tu fecha de egreso
            </p>
          </div>

          <div className="flex items-center gap-2">
            {[4, 6, 8, 10].map((pace) => (
              <button
                key={pace}
                onClick={() => setSimulatedPace(pace)}
                className={cn(
                  "px-3 py-1.5 text-xs font-black uppercase rounded-lg border-2 border-foreground transition-all",
                  simulatedPace === pace
                    ? "bg-[#00E5FF] text-black shadow-[2px_2px_0_0_hsl(var(--foreground))] -translate-y-0.5"
                    : "bg-muted text-muted-foreground hover:bg-card hover:text-foreground"
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
            <div className="flex justify-between items-center text-xs font-black uppercase text-foreground">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#00E5FF]" />
                Ritmo Seleccionado:
              </span>
              <span className="text-base font-black px-3 py-1 bg-[#BFFF00] text-black rounded-md border border-foreground">
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
              className="w-full h-3 bg-muted rounded-lg appearance-none cursor-pointer accent-[#00E5FF] border-2 border-foreground"
            />

            <div className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase">
              <span>🐢 1 mat/año (Muy pausado)</span>
              <span>🎯 6 mat/año (Estándar)</span>
              <span>🚀 12 mat/año (Acelerado)</span>
            </div>
          </div>

          {/* Resultado Visual del Simulador */}
          <div className="lg:col-span-5 bg-muted/60 border-2 sm:border-4 border-foreground rounded-xl p-4 sm:p-5 flex flex-col justify-center items-center text-center shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.05)]">
            <span className="text-xs font-black uppercase text-muted-foreground tracking-wider mb-1">
              Proyección de Egreso
            </span>
            <span className="text-2xl sm:text-3xl font-black uppercase text-foreground tracking-tight text-[#00E5FF] bg-black px-4 py-1.5 rounded-lg border-2 border-foreground my-2 shadow-[2px_2px_0_0_hsl(var(--foreground))]">
              {format(stats.estimatedDate, "MMMM 'de' yyyy", { locale: es })}
            </span>
            <p className="text-xs font-bold text-muted-foreground uppercase mt-1">
              Faltan aproximadamente <strong className="text-foreground">{stats.estimatedMonths} meses</strong> (unos{" "}
              {Math.ceil(stats.estimatedMonths / 6)} cuatrimestres académicos).
            </p>
          </div>
        </div>
      </div>

      {/* ─── 3. GRÁFICOS ANALÍTICOS (PROMEDIO Y DISTRIBUCIÓN) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico A: Evolución de Promedio por Año */}
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-foreground pb-3">
            <div>
              <h3 className="font-black text-sm sm:text-base uppercase tracking-wider text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#BFFF00]" />
                Evolución del Promedio por Año
              </h3>
              <p className="text-xs font-bold text-muted-foreground uppercase mt-0.5">
                Rendimiento académico según año del plan de estudio
              </p>
            </div>
            {stats.averageGrade > 0 && (
              <span className="text-xs font-black uppercase px-2 py-1 bg-[#BFFF00] text-black rounded border border-foreground">
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
                      <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis dataKey="yearName" tick={{ fill: "hsl(var(--foreground))", fontWeight: "bold", fontSize: 11 }} />
                  <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fill: "hsl(var(--foreground))", fontWeight: "bold", fontSize: 11 }} />
                  <Tooltip contentStyle={NEO_TOOLTIP_STYLE} formatter={(value: any) => [`${value} pts`, "Promedio"]} />
                  <ReferenceLine y={4} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Aprobación (4)", fill: "#ef4444", fontSize: 10, fontWeight: "bold" }} />
                  <ReferenceLine y={stats.averageGrade} stroke="#BFFF00" strokeDasharray="4 4" label={{ value: `Global (${stats.averageGrade})`, fill: "#BFFF00", fontSize: 10, fontWeight: "bold" }} />
                  <Area type="monotone" dataKey="promedio" stroke="#00E5FF" strokeWidth={3} fillOpacity={1} fill="url(#gradeGradient)" dot={{ r: 5, fill: "#00E5FF", stroke: "#000", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-muted/40 rounded-lg border-2 border-dashed border-foreground">
                <BookOpen className="w-10 h-10 text-muted-foreground mb-2" />
                <p className="text-xs font-black uppercase text-foreground">Sin materias con nota numérica registrada</p>
                <p className="text-xs text-muted-foreground font-bold uppercase mt-1">Carga las notas finales en tu Plan de Carrera para ver la curva de evolución.</p>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico B: Distribución de Calificaciones (Histograma) */}
        <div className="bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-foreground pb-3">
            <div>
              <h3 className="font-black text-sm sm:text-base uppercase tracking-wider text-foreground flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#FF9B71]" />
                Distribución de Notas Obtenidas
              </h3>
              <p className="text-xs font-bold text-muted-foreground uppercase mt-0.5">
                Frecuencia de notas finales en materias aprobadas
              </p>
            </div>
            <span className="text-xs font-black uppercase px-2 py-1 bg-[#FF9B71] text-black rounded border border-foreground">
              {stats.gradesCount} Evaluaciones
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            {stats.gradesCount > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.gradesDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis dataKey="grade" tick={{ fill: "hsl(var(--foreground))", fontWeight: "bold", fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--foreground))", fontWeight: "bold", fontSize: 11 }} />
                  <Tooltip contentStyle={NEO_TOOLTIP_STYLE} formatter={(val: any) => [`${val} materias`, "Cantidad"]} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats.gradesDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isTop ? "#BFFF00" : Number(entry.grade) >= 6 ? "#00E5FF" : "#FF9B71"}
                        stroke="#000"
                        strokeWidth={2}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-muted/40 rounded-lg border-2 border-dashed border-foreground">
                <Award className="w-10 h-10 text-muted-foreground mb-2" />
                <p className="text-xs font-black uppercase text-foreground">Aún no hay calificaciones para graficar</p>
                <p className="text-xs text-muted-foreground font-bold uppercase mt-1">A medida que apruebes materias con nota, verás tu histograma de rendimiento.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 4. AVANCE POR AÑO & MATERIAS CUELLO DE BOTELLA ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Avance Segmentado por Año de la Carrera */}
        <div className="lg:col-span-7 bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 sm:p-6 space-y-4">
          <div className="border-b-2 border-foreground pb-3">
            <h3 className="font-black text-sm sm:text-base uppercase tracking-wider text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#BFFF00]" />
              Avance Segmentado por Año
            </h3>
            <p className="text-xs font-bold text-muted-foreground uppercase mt-0.5">
              Porcentaje completado en cada nivel de tu plan de estudios
            </p>
          </div>

          <div className="space-y-4">
            {stats.yearsProgress.map((yp, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-black uppercase text-foreground">
                  <span>{yp.yearName}</span>
                  <span className="text-muted-foreground">
                    {yp.aprobadas}/{yp.total} materias ({yp.percent}%)
                  </span>
                </div>
                <div className="w-full bg-muted border-2 border-foreground rounded-lg h-3 overflow-hidden p-0.5">
                  <div
                    className={cn(
                      "h-full rounded-md transition-all duration-500",
                      yp.percent === 100
                        ? "bg-[#BFFF00]"
                        : yp.percent >= 50
                        ? "bg-[#00E5FF]"
                        : "bg-[#FF9B71]"
                    )}
                    style={{ width: `${yp.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Materias Cuello de Botella (Prioridades Estratégicas) */}
        <div className="lg:col-span-5 bg-card border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-xl p-5 sm:p-6 space-y-4">
          <div className="border-b-2 border-foreground pb-3">
            <h3 className="font-black text-sm sm:text-base uppercase tracking-wider text-foreground flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Materias Clave (Destraban más)
            </h3>
            <p className="text-xs font-bold text-muted-foreground uppercase mt-0.5">
              Materias que te conviene priorizar para no trabar años futuros
            </p>
          </div>

          <div className="space-y-3">
            {stats.bottlenecks.length > 0 ? (
              stats.bottlenecks.map(({ subject, blocksCount }, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-muted/50 border-2 border-foreground rounded-lg flex items-center justify-between hover:translate-x-1 transition-transform"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-black text-xs uppercase text-foreground truncate">
                      {subject.nombre}
                    </p>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase">
                      {subject.año}° Año • Código: {subject.codigo || "S/C"}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-[#FF9B71] text-black font-black text-xs uppercase rounded-md border border-foreground shrink-0 shadow-[1px_1px_0_0_hsl(var(--foreground))]">
                    Traba {blocksCount} mat.
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 text-[#BFFF00] mx-auto mb-2" />
                <p className="text-xs font-black uppercase text-foreground">¡Sin trabas pendientes!</p>
                <p className="text-xs font-bold uppercase mt-1">
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


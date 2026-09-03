import { BookOpen, CheckCircle2, Clock, GraduationCap, Zap, Loader2 } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { SubjectCard } from "@/components/dashboard/SubjectCard";
import { UpcomingExams } from "@/components/dashboard/UpcomingExams";
import { StudyStreak } from "@/components/dashboard/StudyStreak";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";


// Widgets
import { ForestWidget } from "@/components/dashboard/widgets/ForestWidget";
import { PomodoroGoalWidget } from "@/components/dashboard/widgets/PomodoroGoalWidget";
import { NextMilestoneWidget } from "@/components/dashboard/widgets/NextMilestoneWidget";


export default function Dashboard() {
  const { user } = useAuth();
  const {
    loading,
    userStats,
    subjectStats,
    progressPercentage,
    monthStudyHours,
    weekData,
    yearProgress,
    recentSubjects,
  } = useDashboardStats();

  const { getUpcomingExams, loading: eventsLoading } = useCalendarEvents();

  const userName = user?.user_metadata?.nombre || user?.email?.split('@')[0] || "Estudiante";

  const upcomingEvents = getUpcomingExams(5);
  const upcomingExams = upcomingEvents.map(event => {
    const eventDate = new Date(event.fecha);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = eventDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      id: event.id,
      subject: event.subject_nombre || event.titulo,
      type: event.tipo_examen as "P1" | "P2" | "Global" | "Recuperatorio P1" | "Recuperatorio P2" | "Recuperatorio Global" | "Final" | "TP" | "Entrega" | "Clase" | "Otro",
      date: eventDate,
      daysLeft: Math.max(0, daysLeft),
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-[#1475e5]" />
          <p className="text-muted-foreground font-bold">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  /* Brand color mapping for year progress */
  const yearColor = (pct: number) =>
    pct === 100 ? "#ffd21c" : pct >= 50 ? "#1475e5" : pct > 0 ? "#48bd22" : "#d1d5db";

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
      {/* Bento Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
        
        {/* LADO IZQUIERDO (Principal) */}
        <div className="lg:col-span-8 flex flex-col gap-5 lg:gap-6">
          
          {/* Bento: Header */}
          <div className="neo-bento-card bento-hover-blue p-6 lg:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-black uppercase tracking-tight">
                Hola, <span className="text-[#1475e5]">{userName}</span>
              </h1>
              <p className="text-muted-foreground mt-2 font-bold text-lg">
                El conocimiento te pertenece.
              </p>
            </div>
            <div className="bg-foreground text-background px-5 py-3 rounded-xl border-2 border-transparent shadow-[4px_4px_0_0_#ff9415] flex items-center gap-3 transform -rotate-2 hover:rotate-0 transition-transform">
              <Zap className="w-6 h-6 text-[#ff9415] fill-current" />
              <span className="text-xl font-black">{userStats?.xp_total || 0} XP</span>
            </div>
          </div>

          {/* Bento: Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            <StatsCard
              title="Aprobadas"
              value={subjectStats.aprobadas}
              subtitle={`de ${subjectStats.total} totales`}
              icon={CheckCircle2}
              variant="gold"
            />
            <StatsCard
              title="Regulares"
              value={subjectStats.regulares}
              subtitle="activas"
              icon={Clock}
              variant="cyan"
            />
            <StatsCard
              title="Estudio"
              value={`${monthStudyHours}h`}
              subtitle="este mes"
              icon={BookOpen}
              variant="green"
            />
          </div>

          {/* Bento: Progress */}
          <div className="neo-bento-card bento-hover-blue p-6 lg:p-8 flex flex-col bg-blue-50/30 dark:bg-background">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-black text-2xl uppercase">Progreso Global</h2>
              <GraduationCap className="w-8 h-8 text-foreground" />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-8 lg:gap-12 flex-1">
              <div className="flex-shrink-0">
                <ProgressRing progress={progressPercentage} size={180} strokeWidth={14}>
                  <div className="text-center">
                    <p className="text-4xl lg:text-5xl font-black text-[#1475e5]">{progressPercentage}%</p>
                    <p className="text-xs uppercase text-muted-foreground font-bold mt-1 tracking-wider">Completado</p>
                  </div>
                </ProgressRing>
              </div>

              <div className="flex-1 w-full space-y-5">
                {yearProgress.map(({ year, percentage }) => (
                  <div key={year}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-black uppercase">Año {year}</span>
                      <span className="font-black text-lg" style={{ color: yearColor(percentage) }}>{percentage}%</span>
                    </div>
                    <div className="h-3 bg-secondary rounded-full overflow-hidden border-2 border-foreground">
                      <div
                        className="h-full rounded-r-full transition-all duration-500 border-r-2 border-foreground"
                        style={{ width: `${percentage}%`, backgroundColor: yearColor(percentage) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bento: Recent Subjects */}
          <div className="neo-bento-card bento-hover-yellow p-6 lg:p-8 bg-yellow-50/30 dark:bg-background">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-black text-2xl uppercase">Materias Recientes</h2>
              <Link to="/carrera" className="text-sm font-black text-background bg-foreground px-4 py-2 rounded-lg hover:-translate-y-1 transition-transform border-2 border-foreground shadow-[3px_3px_0_0_#ffd21c]">VER TODO</Link>
            </div>
            {recentSubjects.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentSubjects.map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    nombre={subject.nombre}
                    codigo={subject.codigo}
                    status={subject.status}
                    nota={subject.nota}
                    año={subject.año}
                    numero_materia={subject.numero_materia}
                    compact
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-[3px] border-dashed border-border rounded-xl">
                <GraduationCap className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-40" />
                <p className="text-muted-foreground text-lg font-bold">Sin actividad reciente</p>
              </div>
            )}
          </div>
          
          <NextMilestoneWidget />

        </div>

        {/* LADO DERECHO (Secundario) */}
        <div className="lg:col-span-4 flex flex-col gap-5 lg:gap-6">
          <ForestWidget />
          <PomodoroGoalWidget />
          <StudyStreak
            currentStreak={userStats?.racha_actual || 0}
            bestStreak={userStats?.mejor_racha || 0}
            weekData={weekData}
          />
          <UpcomingExams exams={upcomingExams} />
        </div>

      </div>
    </div>
  );
}

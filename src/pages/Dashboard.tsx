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
import { LoadingScreen } from "@/components/ui/LoadingScreen";


// Widgets
import { PomodoroGoalWidget } from "@/components/dashboard/widgets/PomodoroGoalWidget";
import { TasksWidget } from "@/components/dashboard/TasksWidget";


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
    const eventDate = new Date(event.fecha.includes("T") ? event.fecha : event.fecha + "T00:00:00");
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
    return <LoadingScreen message="Cargando Dashboard..." submessage="Reuniendo materias y progreso..." />;
  }

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto">
      {/* Bento Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">

        {/* LADO IZQUIERDO (Principal) */}
        <div className="lg:col-span-8 flex flex-col gap-5 lg:gap-6">

          {/* Bento: Header */}
          <div className="neo-bento-card p-6 lg:p-7 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Hola, <span className="text-zinc-900 dark:text-zinc-100 font-bold">{userName}</span>
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 mt-1 font-normal text-sm">
                El conocimiento te pertenece.
              </p>
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3.5 py-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 flex items-center gap-2 shadow-2xs">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-semibold">{userStats?.xp_total || 0} XP</span>
            </div>
          </div>

          {/* Bento: Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 tour-dashboard-stats">
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
          <div className="neo-bento-card p-6 lg:p-7 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Progreso Global</h2>
              <GraduationCap className="w-5 h-5 text-zinc-400" />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-8 lg:gap-12 flex-1">
              <div className="flex-shrink-0">
                <ProgressRing progress={progressPercentage} size={160} strokeWidth={12}>
                  <div className="text-center">
                    <p className="text-3xl lg:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{progressPercentage}%</p>
                    <p className="text-xs text-zinc-400 font-medium mt-0.5">Completado</p>
                  </div>
                </ProgressRing>
              </div>

              <div className="flex-1 w-full space-y-4">
                {yearProgress.map(({ year, percentage }) => (
                  <div key={year}>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{year}° Año</span>
                      <span className="font-mono text-zinc-500 dark:text-zinc-400">{percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          percentage === 100
                            ? "bg-emerald-500"
                            : percentage > 0
                            ? "bg-zinc-900 dark:bg-white"
                            : "bg-transparent"
                        )}
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bento: Recent Subjects */}
          <div className="neo-bento-card p-6 lg:p-7">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Materias Recientes</h2>
              <Link to="/carrera" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 px-3 py-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 transition-colors">
                Ver todo
              </Link>
            </div>
            {recentSubjects.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6 items-stretch">
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
              <div className="text-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                <GraduationCap className="w-10 h-10 mx-auto mb-2 text-zinc-400 dark:text-zinc-600" />
                <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Sin actividad reciente</p>
              </div>
            )}
          </div>


        </div>

        {/* LADO DERECHO (Secundario) */}
        <div className="lg:col-span-4 flex flex-col gap-5 lg:gap-6">
          <PomodoroGoalWidget weekData={weekData} loading={loading} />
          <StudyStreak
            currentStreak={userStats?.racha_actual || 0}
            bestStreak={userStats?.mejor_racha || 0}
            weekData={weekData}
          />
          <div className="tour-dashboard-schedule">
            <UpcomingExams exams={upcomingExams} />
          </div>
          <TasksWidget />
        </div>

      </div>
    </div>
  );
}

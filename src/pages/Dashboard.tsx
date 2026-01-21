import { BookOpen, CheckCircle2, Clock, GraduationCap, Target, Zap, Loader2 } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { SubjectCard } from "@/components/dashboard/SubjectCard";
import { UpcomingExams } from "@/components/dashboard/UpcomingExams";
import { StudyStreak } from "@/components/dashboard/StudyStreak";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const {
    loading,
    userStats,
    subjectStats,
    progressPercentage,
    averageGrade,
    monthStudyHours,
    weekData,
    yearProgress,
    recentSubjects,
  } = useDashboardStats();

  // Get user display name
  const userName = user?.user_metadata?.nombre || user?.email?.split('@')[0] || "Estudiante";

  // Mock exams for now (can be connected to calendar_events later)
  const mockExams: { id: string; subject: string; type: "P1" | "P2" | "Final"; date: Date; daysLeft: number }[] = [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold gradient-text">
            Dashboard Académico
          </h1>
          <p className="text-muted-foreground mt-1">
            Bienvenido de vuelta, {userName}. Tu progreso te espera.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="card-gamer rounded-xl px-4 py-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-neon-gold" />
            <span className="text-sm font-medium">{userStats?.xp_total || 0} XP</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Materias Aprobadas"
          value={subjectStats.aprobadas}
          subtitle={`de ${subjectStats.total} totales`}
          icon={CheckCircle2}
          variant="gold"
        />
        <StatsCard
          title="Regularidades"
          value={subjectStats.regulares}
          subtitle="activas"
          icon={Clock}
          variant="cyan"
        />
        <StatsCard
          title="Horas de Estudio"
          value={`${monthStudyHours}h`}
          subtitle="este mes"
          icon={BookOpen}
          variant="green"
        />
        <StatsCard
          title="Promedio General"
          value={averageGrade}
          subtitle="con aplazos"
          icon={Target}
          variant="purple"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Progress Overview */}
        <div className="lg:col-span-2 card-gamer rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-semibold text-lg">Progreso de la Carrera</h2>
            <GraduationCap className="w-5 h-5 text-muted-foreground" />
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Progress Ring */}
            <ProgressRing progress={progressPercentage} size={160} strokeWidth={12}>
              <div className="text-center">
                <p className="text-3xl font-display font-bold gradient-text">{progressPercentage}%</p>
                <p className="text-xs text-muted-foreground">Completado</p>
              </div>
            </ProgressRing>

            {/* Progress Details */}
            <div className="flex-1 w-full space-y-4">
              {yearProgress.map(({ year, percentage }) => {
                const colorClass = percentage === 100 
                  ? "text-neon-gold" 
                  : percentage >= 50 
                    ? "text-neon-cyan" 
                    : percentage > 0 
                      ? "text-neon-green" 
                      : "text-muted-foreground";
                
                return (
                  <div key={year}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Año {year}</span>
                      <span className={`font-medium ${colorClass}`}>{percentage}%</span>
                    </div>
                    <div className="progress-gamer h-2">
                      <div 
                        className="progress-gamer-bar transition-all duration-500" 
                        style={{ width: `${percentage}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Study Streak */}
        <StudyStreak
          currentStreak={userStats?.racha_actual || 0}
          bestStreak={userStats?.mejor_racha || 0}
          weekData={weekData}
        />
      </div>

      {/* Second Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Subjects */}
        <div className="lg:col-span-2 card-gamer rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg">Materias Recientes</h2>
            <Link to="/carrera" className="text-sm text-primary hover:underline">Ver todo</Link>
          </div>
          {recentSubjects.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
            <div className="text-center py-8">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground text-sm">No hay materias cargadas</p>
              <Link 
                to="/carrera" 
                className="inline-block mt-3 text-sm text-primary hover:underline"
              >
                Ir al Plan de Carrera
              </Link>
            </div>
          )}
        </div>

        {/* Upcoming Exams */}
        <UpcomingExams exams={mockExams} />
      </div>
    </div>
  );
}

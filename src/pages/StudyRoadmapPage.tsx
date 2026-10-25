import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { StudyRoadmap, RoadmapLevel } from "@/types/studyRoadmap";
import {
  getStudyRoadmaps,
  completeLevelAndUnlockNext,
  deleteStudyRoadmap,
} from "@/services/studyRoadmapService";
import { getLevelWorkload } from "@/lib/roadmapHeuristics";
import { RoadmapWizard } from "@/components/study-roadmap/RoadmapWizard";
import { RoadmapSkillTree } from "@/components/study-roadmap/RoadmapSkillTree";
import { LevelStudyModal } from "@/components/study-roadmap/LevelStudyModal";
import { Link } from "react-router-dom";
import { Calendar,
  Plus,
  ArrowLeft,
  Flame,
  FileText,
  
  Trash2,
  AlertTriangle,
  X,
  BookOpen,
  Check,
  Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import HoldButton from "@/components/ui/HoldButton";

export default function StudyRoadmapPage() {
  const { user } = useAuth();

  const [roadmaps, setRoadmaps] = useState<StudyRoadmap[]>([]);
  const [activeRoadmapId, setActiveRoadmapId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<RoadmapLevel | null>(null);
  const [roadmapToDelete, setRoadmapToDelete] = useState<StudyRoadmap | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cargar rutas de estudio
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getStudyRoadmaps(user?.id).then((data) => {
      if (!isMounted) return;
      setRoadmaps(data);
      if (data.length > 0) {
        setActiveRoadmapId(data[0].id);
        setShowWizard(false);
      } else {
        setShowWizard(true);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const activeRoadmap =
    roadmaps.find((r) => r.id === activeRoadmapId) || roadmaps[0] || null;

  // Calcular días para el examen
  const getDaysUntilExam = (dateStr?: string) => {
    if (!dateStr) return 0;
    const exam = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((exam - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  // Calcular progreso en porcentaje
  const getProgressPercentage = (roadmap: StudyRoadmap | null) => {
    if (!roadmap || !roadmap.total_levels) return 0;
    return Math.round((roadmap.completed_levels / roadmap.total_levels) * 100);
  };

  const handleWizardComplete = (newRoadmap: StudyRoadmap) => {
    setRoadmaps((prev) => [
      newRoadmap,
      ...prev.filter((r) => r.id !== newRoadmap.id),
    ]);
    setActiveRoadmapId(newRoadmap.id);
    setShowWizard(false);
  };

  const handleLevelCompleted = async (levelNumber: number, scorePercent?: number) => {
    if (!activeRoadmap) return;
    const updated = await completeLevelAndUnlockNext(
      activeRoadmap.id,
      levelNumber,
      user?.id,
      scorePercent
    );
    if (updated) {
      setRoadmaps((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    }
  };

  const handleConfirmDeleteRoadmap = async () => {
    if (!roadmapToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const targetId = roadmapToDelete.id;
      const targetName = roadmapToDelete.subject_name;
      await deleteStudyRoadmap(targetId, user?.id);

      const remaining = roadmaps.filter((r) => r.id !== targetId);
      setRoadmaps(remaining);
      setRoadmapToDelete(null);

      if (remaining.length > 0) {
        setActiveRoadmapId(remaining[0].id);
      } else {
        setActiveRoadmapId(null);
        setShowWizard(true);
      }
      toast.success(`Ruta de "${targetName}" eliminada.`);
    } finally {
      setIsDeleting(false);
    }
  };

  const daysLeft = getDaysUntilExam(activeRoadmap?.exam_date);
  const progressPercent = getProgressPercentage(activeRoadmap);
  const workload = getLevelWorkload(activeRoadmap?.target_mastery ?? 80);
  const eventBadge =
    activeRoadmap?.roadmap_data.eventLabel ||
    activeRoadmap?.roadmap_data.event_label;

  return (
    <div className="min-h-screen bg-background text-foreground pb-16 selection:bg-primary/20">
      {/* ── HEADER SUPERIOR APPLE / NOTION ── */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Volver a TABE AI */}
          <div className="flex items-center gap-3">
            <Link
              to="/TABEAI"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a TABE AI</span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border/40">
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
              <h1 className="text-xs font-semibold text-foreground tracking-tight">
                Exámenes · Motor de Rutas de Estudio
              </h1>
            </div>
          </div>

          {/* Acciones del encabezado */}
          <div className="flex items-center gap-2">
            {!showWizard && activeRoadmap && (
              <button
                type="button"
                onClick={() => setRoadmapToDelete(activeRoadmap)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 hover:border-destructive/30 hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs font-medium transition-colors cursor-pointer"
                title="Eliminar esta ruta de estudio"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Eliminar Ruta</span>
              </button>
            )}

            {!showWizard && (
              <button
                onClick={() => setShowWizard(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Plan</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-8">
        {/* Si estamos en modo Wizard */}
        {showWizard ? (
          <div className="py-2 animate-in fade-in duration-300">
            <div className="text-center max-w-lg mx-auto mb-8">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-medium text-primary mb-3">
                <Compass className="w-3.5 h-3.5" />
                <span>Creador de Rutas de Estudio</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                Prepara tu examen con IA
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Convierte tus apuntes y materias en curso en un árbol de niveles personalizado paso a paso.
              </p>
            </div>

            <RoadmapWizard
              userId={user?.id}
              onComplete={handleWizardComplete}
              onCancel={
                roadmaps.length > 0 ? () => setShowWizard(false) : undefined
              }
            />
          </div>
        ) : activeRoadmap ? (
          /* Vista del Árbol de Niveles */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* ── HUD SUPERIOR NOTION / APPLE ── */}
            <div className="p-5 md:p-6 bg-card/70 backdrop-blur-sm border border-border/60 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
              {/* Información de Materia y Selector */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium">
                    Ruta activa
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    Meta: {activeRoadmap.target_mastery}% Dominio ({workload.questionCount} preg. y {workload.flashcardCount} flashcards)
                  </span>
                  {eventBadge && (
                    <span className="px-2.5 py-0.5 rounded-full bg-muted text-foreground border border-border/50 text-[11px] font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      {eventBadge}
                    </span>
                  )}
                  {activeRoadmap.roadmap_data.materialStats?.notionDocsCount ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-muted text-foreground border border-border/50 text-[11px] font-medium flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-muted-foreground" />
                      {activeRoadmap.roadmap_data.materialStats.notionDocsCount} apunte(s)
                    </span>
                  ) : null}
                  {(activeRoadmap.study_preference ||
                    activeRoadmap.roadmap_data.study_preference) && (
                    <span className="px-2.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground text-[11px] font-medium border border-border/40 flex items-center gap-1">
                      <Compass className="w-2.5 h-2.5 text-primary" />
                      Modo:{" "}
                      {activeRoadmap.study_preference ||
                        activeRoadmap.roadmap_data.study_preference}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {activeRoadmap.subject_name}
                </h2>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-normal">
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>
                    {activeRoadmap.total_levels} niveles • Guía teórica, {workload.flashcardCount} flashcards y examen (aprobación ≥{workload.requiredAccuracyPercent}%)
                  </span>
                </div>
              </div>

              {/* Métricas: Días Restantes y Barra de Progreso */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* Días para el examen */}
                <div className="px-4 py-2.5 bg-muted/40 border border-border/60 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">
                      Días para examen
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {daysLeft === 0 ? "¡Hoy!" : `${daysLeft} días`}
                    </span>
                  </div>
                </div>

                {/* Progreso general */}
                <div className="min-w-[170px] space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">
                      Progreso ({activeRoadmap.completed_levels}/{activeRoadmap.total_levels})
                    </span>
                    <span className="font-semibold text-emerald-500">{progressPercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Selector de Rutas - Pestañas Notion */}
            {roadmaps.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-xs font-medium text-muted-foreground shrink-0 mr-1">
                  Rutas guardadas:
                </span>
                {roadmaps.map((r) => {
                  const isActive = r.id === activeRoadmap.id;
                  return (
                    <div
                      key={r.id}
                      className={cn(
                        "inline-flex items-center rounded-lg border text-xs font-medium shrink-0 transition-all overflow-hidden",
                        isActive
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveRoadmapId(r.id)}
                        className="px-3 py-1.5 cursor-pointer truncate max-w-[180px]"
                      >
                        {r.subject_name} ({r.completed_levels}/{r.total_levels})
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoadmapToDelete(r);
                        }}
                        className="px-1.5 py-1.5 hover:bg-destructive/15 hover:text-destructive text-muted-foreground transition-colors cursor-pointer border-l border-border/40"
                        title={`Eliminar ruta de ${r.subject_name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── MAPA DE NIVELES EN ZIGZAG ── */}
            <div className="p-4 md:p-8 bg-card/50 border border-border/60 rounded-2xl shadow-xs min-h-[500px]">
              <RoadmapSkillTree
                levels={activeRoadmap.roadmap_data.roadmap}
                currentLevel={activeRoadmap.current_level}
                onSelectLevel={(lvl) => setSelectedLevel(lvl)}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <h3 className="text-sm font-medium text-muted-foreground">
              Cargando rutas de estudio...
            </h3>
          </div>
        )}
      </main>

      {/* Modal de Confirmación para Eliminar Ruta */}
      {roadmapToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="tabe-content-open w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span>Eliminar ruta de estudio</span>
              </div>
              <button
                type="button"
                onClick={() => setRoadmapToDelete(null)}
                className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                ¿Estás seguro de que querés eliminar la ruta de{" "}
                <span className="font-semibold text-foreground">
                  {roadmapToDelete.subject_name}
                </span>
                ? Se eliminará todo su progreso y contenido.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setRoadmapToDelete(null)}
                  className="px-3.5 py-2 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <HoldButton
                  size="md"
                  holdTime={1200}
                  disabled={isDeleting}
                  backgroundColor="#ef4444"
                  fillColor="#b91c1c"
                  textColor="#ffffff"
                  fillTextColor="#ffffff"
                  icon={<Trash2 className="w-3.5 h-3.5 shrink-0" />}
                  doneIcon={<Check className="w-3.5 h-3.5 shrink-0" />}
                  doneLabel="Eliminada"
                  onHold={handleConfirmDeleteRoadmap}
                  className="px-4 py-2 rounded-xl text-xs font-medium shadow-xs"
                >
                  {isDeleting ? "Eliminando..." : "Mantener para eliminar"}
                </HoldButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Estudio del Nivel */}
      <LevelStudyModal
        level={selectedLevel}
        roadmapId={activeRoadmap?.id}
        subjectName={activeRoadmap?.subject_name || "Materia"}
        targetMastery={activeRoadmap?.target_mastery}
        eventLabel={eventBadge}
        studyPreference={
          activeRoadmap?.study_preference ||
          activeRoadmap?.roadmap_data.study_preference
        }
        isOpen={!!selectedLevel}
        onClose={() => setSelectedLevel(null)}
        onLevelComplete={handleLevelCompleted}
      />
    </div>
  );
}

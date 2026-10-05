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
import {
  Calendar,
  Plus,
  ArrowLeft,
  Flame,
  FileText,
  Sparkles,
  Trash2,
  AlertTriangle,
  X,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* ── HEADER SUPERIOR NEOBRUTALISTA ── */}
      <div className="sticky top-0 z-30 bg-card border-b-4 border-foreground px-4 py-3 shadow-[0_4px_0_0_#000]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Volver a TABE AI */}
          <div className="flex items-center gap-3">
            <Link
              to="/TABEAI"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-foreground bg-card hover:bg-muted font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a TABE AI</span>
            </Link>

            <div className="hidden sm:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]" />
              <h1 className="text-sm font-black uppercase tracking-wider">
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
                className="px-3 py-1.5 bg-card hover:bg-[#FF3366] hover:text-white text-foreground font-black uppercase text-xs border-2 border-foreground rounded-xl shadow-[2px_2px_0px_#000] transition-all cursor-pointer flex items-center gap-1.5"
                title="Eliminar esta ruta de estudio"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Eliminar Ruta</span>
              </button>
            )}

            {!showWizard && (
              <button
                onClick={() => setShowWizard(true)}
                className="px-3 py-1.5 bg-[#FFE600] hover:bg-[#ffe100] text-black font-black uppercase text-xs border-2 border-foreground rounded-xl shadow-[3px_3px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Plan</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6">
        {/* Si estamos en modo Wizard */}
        {showWizard ? (
          <div className="py-4">
            <div className="text-center max-w-md mx-auto mb-6">
              <span className="px-3 py-1 rounded-full bg-[#FFE600] text-black font-black text-[10px] uppercase border-2 border-foreground shadow-[2px_2px_0px_#000]">
                Creador de Rutas de Estudio
              </span>
              <h2 className="text-2xl font-black uppercase tracking-wide mt-2">
                Prepara tu Examen con IA
              </h2>
              <p className="text-xs font-medium text-muted-foreground mt-1">
                Convierte tus apuntes y materias en curso en un árbol de niveles personalizado por evento.
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
          <div className="space-y-6">
            {/* ── HUD SUPERIOR GAMER ── */}
            <div className="p-4 md:p-5 bg-card border-4 border-foreground rounded-2xl shadow-[6px_6px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Información de Materia y Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#FFE600] text-black font-black text-[10px] uppercase border-2 border-foreground shadow-[2px_2px_0px_#000]">
                    Ruta Activa
                  </span>
                  <span className="text-xs font-black uppercase text-muted-foreground">
                    Meta: {activeRoadmap.target_mastery}% Dominio ({workload.questionCount} preg. y {workload.flashcardCount} flashcards por nivel)
                  </span>
                  {eventBadge && (
                    <span className="px-2 py-0.5 rounded-md bg-[#00E5FF] text-black font-black text-[10px] uppercase border-2 border-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {eventBadge}
                    </span>
                  )}
                  {activeRoadmap.roadmap_data.materialStats?.notionDocsCount ? (
                    <span className="px-2 py-0.5 rounded-md bg-[#FFE600] text-black font-black text-[10px] uppercase border-2 border-foreground flex items-center gap-1 shadow-[1.5px_1.5px_0px_#000]">
                      <BookOpen className="w-3 h-3" />
                      {activeRoadmap.roadmap_data.materialStats.notionDocsCount} apunte(s) de TABE
                    </span>
                  ) : null}
                  {(activeRoadmap.study_preference ||
                    activeRoadmap.roadmap_data.study_preference) && (
                    <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-black text-[10px] uppercase border border-foreground/40 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-primary" />
                      Modo:{" "}
                      {activeRoadmap.study_preference ||
                        activeRoadmap.roadmap_data.study_preference}
                    </span>
                  )}
                </div>

                <h2 className="text-xl md:text-2xl font-black uppercase tracking-wide">
                  {activeRoadmap.subject_name}
                </h2>

                <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground flex-wrap">
                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>
                    {activeRoadmap.total_levels} niveles intensivos • Cada nivel incluye Guía Teórica, {workload.flashcardCount} Flashcards y Examen de {workload.questionCount} preguntas (aprobación ≥{workload.requiredAccuracyPercent}%)
                  </span>
                </div>
              </div>

              {/* Métricas: Días Restantes y Barra de Progreso */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* Días para el examen */}
                <div className="px-4 py-2 bg-muted/80 border-3 border-foreground rounded-xl shadow-[3px_3px_0px_#000] flex items-center gap-2.5">
                  <Flame className="w-5 h-5 text-[#FF3366] shrink-0" />
                  <div>
                    <span className="text-[10px] font-black uppercase text-muted-foreground block">
                      Días para Examen
                    </span>
                    <span className="text-base font-black text-foreground">
                      {daysLeft === 0 ? "¡HOY!" : `${daysLeft} Días`}
                    </span>
                  </div>
                </div>

                {/* Progreso general */}
                <div className="min-w-[160px] space-y-1.5">
                  <div className="flex justify-between text-xs font-black uppercase">
                    <span>
                      Progreso ({activeRoadmap.completed_levels}/
                      {activeRoadmap.total_levels}):
                    </span>
                    <span className="text-[#BFFF00]">{progressPercent}%</span>
                  </div>
                  <div className="h-5 w-full bg-background border-2 border-foreground rounded-lg overflow-hidden p-0.5 shadow-[2px_2px_0px_#000]">
                    <div
                      className="h-full bg-[#BFFF00] transition-all duration-500 rounded"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Selector de Rutas */}
            {roadmaps.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[10px] font-black uppercase text-muted-foreground shrink-0">
                  Tus Rutas ({roadmaps.length}):
                </span>
                {roadmaps.map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-center rounded-xl border-2 border-foreground shrink-0 transition-all shadow-[2px_2px_0px_#000] overflow-hidden",
                      r.id === activeRoadmap.id
                        ? "bg-[#FFE600] text-black"
                        : "bg-card text-foreground hover:bg-muted"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveRoadmapId(r.id)}
                      className="px-3 py-1.5 font-black text-xs uppercase cursor-pointer"
                    >
                      {r.subject_name} ({r.completed_levels}/{r.total_levels})
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRoadmapToDelete(r);
                      }}
                      className="px-2 py-1.5 border-l-2 border-foreground/30 hover:bg-[#FF3366] hover:text-white transition-colors cursor-pointer"
                      title={`Eliminar ruta de ${r.subject_name}`}
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ── MAPA DE NIVELES EN ZIGZAG ── */}
            <div className="p-4 md:p-8 bg-card/60 border-4 border-foreground rounded-3xl shadow-[8px_8px_0px_#000] min-h-[500px]">
              <RoadmapSkillTree
                levels={activeRoadmap.roadmap_data.roadmap}
                currentLevel={activeRoadmap.current_level}
                onSelectLevel={(lvl) => setSelectedLevel(lvl)}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-lg font-black uppercase">
              Cargando rutas de estudio...
            </h3>
          </div>
        )}
      </div>

      {/* Modal de Confirmación para Eliminar Ruta */}
      {roadmapToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border-4 border-foreground rounded-2xl shadow-[8px_8px_0_0_hsl(var(--foreground))] overflow-hidden">
            <div className="px-5 py-3.5 bg-[#FF3366] text-white border-b-4 border-foreground flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider">
                <AlertTriangle className="w-5 h-5" />
                <span>Eliminar Ruta de Estudio</span>
              </div>
              <button
                type="button"
                onClick={() => setRoadmapToDelete(null)}
                className="w-7 h-7 rounded-lg bg-white text-black border-2 border-black flex items-center justify-center font-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs sm:text-sm font-bold text-foreground leading-relaxed">
                ¿Estás seguro de que querés eliminar la ruta de{" "}
                <span className="font-black underline">
                  {roadmapToDelete.subject_name}
                </span>
                ? Se eliminará todo su progreso y contenido.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setRoadmapToDelete(null)}
                  className="px-4 py-2 rounded-xl border-2 border-foreground bg-card hover:bg-muted text-xs font-black uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteRoadmap}
                  className="px-5 py-2 rounded-xl border-2 border-foreground bg-[#FF3366] hover:bg-[#e02454] text-white text-xs font-black uppercase shadow-[3px_3px_0_0_#000] flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? "Eliminando..." : "Eliminar"}</span>
                </button>
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

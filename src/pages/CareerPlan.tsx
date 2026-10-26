import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Filter, GraduationCap, Search, Plus, Loader2, Zap, BookOpen, Award, FileUp, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { SubjectCard } from "@/components/dashboard/SubjectCard";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { SubjectStatusModal } from "@/components/subjects/SubjectStatusModal";
import { UniversityLogo } from "@/components/icons/UniversityLogos";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Building2 } from "lucide-react";
import { AddSubjectModal } from "@/components/subjects/AddSubjectModal";
import { EditSubjectModal } from "@/components/subjects/EditSubjectModal";
import { EditDependenciesModal } from "@/components/subjects/EditDependenciesModal";
import { ImportCareerModal } from "@/components/subjects/ImportCareerModal";
import { AICareerImportModal } from "@/components/subjects/AICareerImportModal";
import { useSubjects, SubjectWithStatus, SubjectStatus } from "@/hooks/useSubjects";
import { cn } from "@/lib/utils";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { usePageTitle } from "@/hooks/useDynamicTitle";

const statusFilters = [
  { value: "all", label: "Todas" },
  { value: "aprobada", label: "Aprobadas" },
  { value: "regular", label: "Regulares" },
  { value: "cursable", label: "Cursables" },
  { value: "bloqueada", label: "Bloqueadas" },
];

export default function CareerPlan() {
  const navigate = useNavigate();
  const {
    subjects,
    rawSubjects,
    loading,
    updateSubjectStatus,
    updatePartialGrades,
    createSubject,
    updateSubjectDetails,
    updateSubjectDependencies,
    deleteSubject,
    importCareerPlan,
    importCustomCareerPlan,
    deleteAllSubjects,
    getYears
  } = useSubjects();

  const { isPremium } = useSubscription();
  const { isGuest: isGuestAuth } = useAuth();
  const isGuestMode = isGuestAuth;

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hideApproved, setHideApproved] = useState(false);

  // Modals
  const [selectedSubject, setSelectedSubject] = useState<SubjectWithStatus | null>(null);
  
  // Título dinámico cuando hay una materia seleccionada o inspeccionada
  usePageTitle(selectedSubject ? selectedSubject.nombre : null);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [showDepsModal, setShowDepsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAiImportModal, setShowAiImportModal] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [userAcademic, setUserAcademic] = useState<{ facultad: string | null; carrera: string | null }>({
    facultad: null,
    carrera: null,
  });

  useEffect(() => {
    if (!useAuth) return;
    async function loadAcademicProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("facultad, carrera")
          .eq("user_id", user.id)
          .single();
        if (data) {
          setUserAcademic({
            facultad: data.facultad || null,
            carrera: data.carrera || null,
          });
        }
      } catch (err) {
        console.error("Error al cargar perfil académico en CareerPlan:", err);
      }
    }
    loadAcademicProfile();
  }, []);

  const years = getYears();

  // Auto-reset selectedYear if that year no longer exists
  useEffect(() => {
    if (selectedYear !== null && !years.includes(selectedYear)) {
      setSelectedYear(null);
    }
  }, [years, selectedYear]);

  // Prioridad de orden: materias no aprobadas primero, aprobadas al final
  const getSubjectStatusPriority = (status: string): number => {
    switch (status) {
      case "cursable":
        return 1;
      case "regular":
        return 2;
      case "bloqueada":
        return 3;
      case "aprobada":
        return 4;
      default:
        return 5;
    }
  };

  // Memoize filtered subjects
  const filteredSubjects = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const result = subjects.filter((subject) => {
      const matchesYear = selectedYear === null || subject.año === selectedYear;
      const matchesStatus = selectedStatus === "all" || subject.status === selectedStatus;
      const matchesSearch = !query ||
        subject.nombre.toLowerCase().includes(query) ||
        subject.codigo.toLowerCase().includes(query);
      const matchesHideApproved = !hideApproved || subject.status !== "aprobada";
      return matchesYear && matchesStatus && matchesSearch && matchesHideApproved;
    });

    // Ordenar: primero las que no están aprobadas
    return result.sort((a, b) => {
      const priorityDiff = getSubjectStatusPriority(a.status) - getSubjectStatusPriority(b.status);
      if (priorityDiff !== 0) return priorityDiff;
      // Desempate por número de materia o código
      return (a.numero_materia || 0) - (b.numero_materia || 0);
    });
  }, [subjects, selectedYear, selectedStatus, searchQuery, hideApproved]);

  // Memoize subjects grouped by year (exclude empty years)
  const subjectsByYear = useMemo(() => {
    return years
      .map((year) => ({
        year,
        subjects: filteredSubjects.filter((s) => s.año === year),
      }))
      .filter(({ subjects: yearSubjects }) => yearSubjects.length > 0);
  }, [years, filteredSubjects]);

  // Helper to extract numeric grade from subject (nota, final_examen, global)
  const getSubjectGrade = useCallback((s: SubjectWithStatus): number | null => {
    if (s.nota !== null && s.nota !== undefined && !isNaN(Number(s.nota)) && Number(s.nota) > 0) {
      return Number(s.nota);
    }
    const finalExamen = s.partialGrades?.nota_final_examen;
    if (finalExamen !== null && finalExamen !== undefined && !isNaN(Number(finalExamen)) && Number(finalExamen) > 0) {
      return Number(finalExamen);
    }
    const globalNota = s.partialGrades?.nota_global;
    if (globalNota !== null && globalNota !== undefined && !isNaN(Number(globalNota)) && Number(globalNota) > 0) {
      return Number(globalNota);
    }
    return null;
  }, []);

  // Memoize stats
  const stats = useMemo(() => {
    const aprobadasList = subjects.filter((s) => s.status === "aprobada");
    const gradesList = aprobadasList
      .map(getSubjectGrade)
      .filter((g): g is number => g !== null);

    const promedioVal = gradesList.length > 0
      ? (gradesList.reduce((acc, curr) => acc + curr, 0) / gradesList.length).toFixed(2)
      : null;

    return {
      total: subjects.length,
      aprobadas: aprobadasList.length,
      regulares: subjects.filter((s) => s.status === "regular").length,
      cursables: subjects.filter((s) => s.status === "cursable").length,
      bloqueadas: subjects.filter((s) => s.status === "bloqueada").length,
      promedio: promedioVal,
      gradesCount: gradesList.length,
    };
  }, [subjects, getSubjectGrade]);

  const handleSubjectClick = useCallback((subject: SubjectWithStatus) => {
    setSelectedSubject(subject);
    setShowStatusModal(true);
  }, []);

  const handleEditDetails = useCallback((subject: SubjectWithStatus) => {
    setSelectedSubject(subject);
    setShowStatusModal(false);
    setShowEditDetailsModal(true);
  }, []);

  const handleEditDependencies = useCallback((subject: SubjectWithStatus) => {
    setSelectedSubject(subject);
    setShowStatusModal(false);
    setShowDepsModal(true);
  }, []);

  const handleCloseStatusModal = useCallback(() => {
    setShowStatusModal(false);
    setSelectedSubject(null);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
  }, []);

  const handleCloseEditDetailsModal = useCallback(() => {
    setShowEditDetailsModal(false);
    setSelectedSubject(null);
  }, []);

  const handleCloseDepsModal = useCallback(() => {
    setShowDepsModal(false);
    setSelectedSubject(null);
  }, []);

  const handleOpenAddModal = useCallback(() => {
    setShowAddModal(true);
  }, []);

  if (loading) {
    return <LoadingScreen message="Cargando Plan de Carrera..." submessage="Calculando correlatividades y materias..." />;
  }

  return (
    <div className="tabe-page p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          {userAcademic.facultad && (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center p-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 shrink-0 shadow-2xs mt-1">
              <UniversityLogo universityId={userAcademic.facultad} className="w-full h-full" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                Tu progreso académico
              </span>
              {years.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-[11px] font-medium text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                  <Clock className="w-3 h-3" />
                  Duración: {years.length} {years.length === 1 ? "año" : "años"}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
              {userAcademic.carrera || "Plan de Carrera"}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 truncate">
              {userAcademic.facultad ? `🏛️ ${userAcademic.facultad}` : "Gestiona tus materias y correlativas"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Promedio Header Badge */}
          <div className="bg-zinc-100 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/60 flex items-center gap-1.5 shadow-2xs">
            <Award className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span className="text-xs font-medium">
              Promedio: <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{stats.promedio ? stats.promedio : "—"}</strong>
            </span>
          </div>

          <div className="bg-zinc-100 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/60 flex items-center gap-1.5 shadow-2xs">
            <GraduationCap className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span className="text-xs font-medium">
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{stats.aprobadas}</strong>/{stats.total}
            </span>
          </div>

          <Button
            onClick={handleOpenAddModal}
            size="sm"
            className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shadow-2xs tour-career-add"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Agregar Materia
          </Button>

          <Button
            onClick={() => navigate("/consultas")}
            variant="outline"
            size="sm"
            className="rounded-lg text-xs font-medium border-zinc-200/80 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
          >
            <Zap className="w-3.5 h-3.5 mr-1 text-zinc-500" />
            Consultas
          </Button>

          <Button
            onClick={() => navigate("/mapa")}
            variant="outline"
            size="sm"
            className="rounded-lg text-xs font-medium border-zinc-200/80 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
          >
            <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" />
            Ver Mapa
          </Button>

          <Button
            onClick={() => setShowImportModal(true)}
            variant="outline"
            size="sm"
            className="rounded-lg text-xs font-medium border-zinc-200/80 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
          >
            <BookOpen className="w-3.5 h-3.5 mr-1 text-zinc-500" />
            Importar Plan
          </Button>

          {subjects.length > 0 && (
            <Button
              onClick={() => setShowDeleteAllDialog(true)}
              variant="outline"
              size="sm"
              className="rounded-lg text-xs font-medium border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              Borrar Todo
            </Button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200/70 dark:divide-zinc-800/80 gap-3 sm:gap-0">
          <div className="text-center sm:px-3 py-1 flex flex-col justify-center">
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
              {stats.promedio ? stats.promedio : "—"}
            </p>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-1">
              Promedio {stats.gradesCount > 0 ? `(${stats.gradesCount})` : ""}
            </p>
          </div>
          <div className="text-center sm:px-3 py-1 flex flex-col justify-center">
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.aprobadas}
            </p>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-1 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Aprobadas
            </p>
          </div>
          <div className="text-center sm:px-3 py-1 flex flex-col justify-center">
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-sky-600 dark:text-sky-400 font-mono">
              {stats.regulares}
            </p>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-1 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              Regulares
            </p>
          </div>
          <div className="text-center sm:px-3 py-1 flex flex-col justify-center">
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
              {stats.cursables}
            </p>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-1 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Cursables
            </p>
          </div>
          <div className="text-center sm:px-3 py-1 flex flex-col justify-center col-span-2 sm:col-span-1">
            <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-400 dark:text-zinc-500 font-mono">
              {stats.bloqueadas}
            </p>
            <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-1 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
              Bloqueadas
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar materia o código..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#212121] rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 text-sm transition-all shadow-2xs"
          />
        </div>

        {/* Year Filter */}
        {years.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
              <span className="text-xs font-medium text-zinc-500 sm:hidden">Filtrar por año:</span>
            </div>
            <div className="flex gap-1.5 flex-wrap p-1 rounded-xl bg-zinc-100/80 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setSelectedYear(null)}
                className={cn(
                  "relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none",
                  selectedYear === null
                    ? "text-white dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                {selectedYear === null && (
                  <motion.span
                    layoutId="career-year-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-zinc-900 dark:bg-zinc-100 shadow-2xs"
                  />
                )}
                <span className="relative z-10">Todos</span>
              </button>
              {years.map((year) => {
                const isSelected = selectedYear === year;
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setSelectedYear(year)}
                    className={cn(
                      "relative px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none",
                      isSelected
                        ? "text-white dark:text-zinc-900"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    )}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="career-year-pill"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        className="absolute inset-0 rounded-lg bg-zinc-900 dark:bg-zinc-100 shadow-2xs"
                      />
                    )}
                    <span className="relative z-10">Año {year}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {statusFilters.map((filter) => {
          const isSelected = selectedStatus === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setSelectedStatus(filter.value)}
              className={cn(
                "rounded-lg text-xs font-medium px-3 py-1.5 transition-colors cursor-pointer border select-none",
                isSelected
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent shadow-2xs"
                  : "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border-zinc-200/80 dark:border-zinc-800/80"
              )}
            >
              {filter.label}
            </button>
          );
        })}

        {/* Toggle Hide Approved (Mobile primary) */}
        <button
          type="button"
          onClick={() => setHideApproved(!hideApproved)}
          className={cn(
            "rounded-lg text-xs font-medium px-3 py-1.5 transition-colors cursor-pointer border select-none",
            hideApproved
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent shadow-2xs"
              : "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border-zinc-200/80 dark:border-zinc-800/80"
          )}
        >
          {hideApproved ? "Mostrando Solo Pendientes" : "Ocultar Aprobadas"}
        </button>

        {/* Indicador de orden para el usuario */}
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800/60 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-800/60">
          No aprobadas primero
        </span>
      </div>

      {/* Empty State Banner if no subjects */}
      {subjects.length === 0 && (
        <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-8 sm:p-12 text-center shadow-2xs max-w-2xl mx-auto my-8 space-y-5">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/60 mx-auto flex items-center justify-center">
            <FileUp className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              ¡Tu Plan de Carrera está vacío!
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Cargá tu plan en segundos subiendo un archivo Excel, PDF o fotos.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2.5 pt-2">
            <Button
              onClick={() => setShowAiImportModal(true)}
              className="w-full sm:w-auto bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg px-3.5 py-2 text-xs font-medium transition-colors shadow-2xs"
            >
              <FileUp className="w-3.5 h-3.5 mr-1.5" />
              Subir Archivo (Excel, PDF, Fotos)
            </Button>
            <Button
              onClick={() => setShowImportModal(true)}
              variant="outline"
              className="w-full sm:w-auto rounded-lg text-xs font-medium border-zinc-200/80 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              Planes Oficiales
            </Button>
            <Button
              onClick={handleOpenAddModal}
              variant="outline"
              className="w-full sm:w-auto rounded-lg text-xs font-medium border-zinc-200/80 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Cargar Manual
            </Button>
          </div>
        </div>
      )}

      {/* Subjects Grid by Year */}
      <motion.div layout className="space-y-8">
        <AnimatePresence mode="popLayout">
          {subjectsByYear
            .filter(({ subjects: yearSubjects }) => yearSubjects.length > 0)
            .map(({ year, subjects: yearSubjects }) => (
              <motion.div
                layout
                key={year}
                initial={{ opacity: 0, scale: 0.94, y: 16, filter: "blur(5px)" }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                exit={{
                  opacity: 0,
                  scale: 0.9,
                  y: -14,
                  filter: "blur(6px)",
                  transition: { duration: 0.22, ease: [0.32, 0, 0.67, 0] },
                }}
                transition={{
                  layout: { type: "spring", stiffness: 350, damping: 28, mass: 0.75 },
                  duration: 0.26,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div className="flex items-center justify-between pb-3 mb-5 border-b border-zinc-200/80 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/60 flex items-center justify-center text-xs font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                      {year}
                    </div>
                    <div>
                      <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Año {year}</h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {yearSubjects.filter(s => s.status === "aprobada").length} de {yearSubjects.length} completadas
                      </p>
                    </div>
                  </div>
                </div>
                <motion.div
                  layout
                  className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                >
                  <AnimatePresence mode="popLayout">
                    {yearSubjects.map((subject) => (
                      <motion.div
                        layout
                        key={subject.id}
                        initial={{ opacity: 0, scale: 0.88, y: 12, filter: "blur(4px)" }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                        exit={{
                          opacity: 0,
                          scale: 0.84,
                          y: -10,
                          filter: "blur(5px)",
                          transition: { duration: 0.2, ease: [0.32, 0, 0.67, 0] },
                        }}
                        transition={{
                          layout: { type: "spring", stiffness: 370, damping: 28, mass: 0.72 },
                          duration: 0.24,
                        }}
                      >
                        <SubjectCard
                          nombre={subject.nombre}
                          codigo={subject.codigo}
                          status={subject.status}
                          nota={getSubjectGrade(subject)}
                          año={subject.año}
                          numero_materia={subject.numero_materia}
                          requisitos_faltantes={subject.requisitos_faltantes}
                          onClick={() => handleSubjectClick(subject)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            ))}
        </AnimatePresence>
      </motion.div>

      {/* Modals */}
      {selectedSubject && (
        <SubjectStatusModal
          open={showStatusModal}
          onClose={handleCloseStatusModal}
          subject={selectedSubject}
          onStatusChange={updateSubjectStatus}
          onUpdate={updateSubjectStatus}
          onGradesChange={updatePartialGrades}
          onUpdatePartialGrades={updatePartialGrades}
          onEditDetails={() => handleEditDetails(selectedSubject)}
          onEditDependencies={() => handleEditDependencies(selectedSubject)}
        />
      )}

      {selectedSubject && (
        <EditSubjectModal
          open={showEditDetailsModal}
          onClose={handleCloseEditDetailsModal}
          subject={selectedSubject}
          onSave={updateSubjectDetails}
          onDelete={deleteSubject}
        />
      )}

      {selectedSubject && (
        <EditDependenciesModal
          open={showDepsModal}
          onClose={handleCloseDepsModal}
          subject={selectedSubject}
          allSubjects={rawSubjects}
          onUpdate={updateSubjectDependencies}
        />
      )}

      <AddSubjectModal
        open={showAddModal}
        onClose={handleCloseAddModal}
        onSubmit={createSubject}
        existingSubjects={rawSubjects}
        years={years}
      />

      <ImportCareerModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={importCareerPlan}
        onOpenAiImport={() => setShowAiImportModal(true)}
      />

      <AICareerImportModal
        open={showAiImportModal}
        onClose={() => setShowAiImportModal(false)}
        onImport={importCustomCareerPlan}
        existingSubjectsCount={rawSubjects.length}
      />

      {/* Diálogo de Confirmación Borrar Todo */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg rounded-xl p-6 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              ¿Borrar todas las materias?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
              Esta acción es <strong className="font-semibold text-red-600 dark:text-red-400">permanente e irreversible</strong>. Se eliminarán todas tus materias cargadas, estados académicos, notas parciales y el progreso acumulado en tu carrera.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 flex flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={() => setShowDeleteAllDialog(false)}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3.5 py-2"
            >
              Cancelar
            </AlertDialogCancel>
            <button
              type="button"
              onClick={() => {
                setShowDeleteAllDialog(false);
                deleteAllSubjects();
              }}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              Sí, Borrar Todo
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

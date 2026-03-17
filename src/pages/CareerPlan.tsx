import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Filter, GraduationCap, Search, Plus, Loader2, Zap, BookOpen } from "lucide-react";
import { SubjectCard } from "@/components/dashboard/SubjectCard";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { SubjectStatusModal } from "@/components/subjects/SubjectStatusModal";
import { AddSubjectModal } from "@/components/subjects/AddSubjectModal";
import { EditSubjectModal } from "@/components/subjects/EditSubjectModal";
import { EditDependenciesModal } from "@/components/subjects/EditDependenciesModal";
import { ImportCareerModal } from "@/components/subjects/ImportCareerModal";
import { useSubjects, SubjectWithStatus, SubjectStatus } from "@/hooks/useSubjects";
import { cn } from "@/lib/utils";

const statusFilters = [
  { value: "all", label: "Todas", color: "bg-secondary text-foreground" },
  { value: "aprobada", label: "Aprobadas", color: "bg-neon-gold/20 text-neon-gold" },
  { value: "regular", label: "Regulares", color: "bg-neon-cyan/20 text-neon-cyan" },
  { value: "cursable", label: "Cursables", color: "bg-neon-green/20 text-neon-green" },
  { value: "bloqueada", label: "Bloqueadas", color: "bg-muted text-muted-foreground" },
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
    deleteAllSubjects,
    getYears
  } = useSubjects();

  const { isPremium } = useSubscription();

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hideApproved, setHideApproved] = useState(false);

  // Modals
  const [selectedSubject, setSelectedSubject] = useState<SubjectWithStatus | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [showDepsModal, setShowDepsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const years = getYears();

  // Memoize filtered subjects — only recalculates when filters or data change
  const filteredSubjects = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return subjects.filter((subject) => {
      const matchesYear = selectedYear === null || subject.año === selectedYear;
      const matchesStatus = selectedStatus === "all" || subject.status === selectedStatus;
      const matchesSearch = !query ||
        subject.nombre.toLowerCase().includes(query) ||
        subject.codigo.toLowerCase().includes(query);
      const matchesHideApproved = !hideApproved || subject.status !== "aprobada";
      return matchesYear && matchesStatus && matchesSearch && matchesHideApproved;
    });
  }, [subjects, selectedYear, selectedStatus, searchQuery, hideApproved]);

  // Memoize subjects grouped by year
  const subjectsByYear = useMemo(() => {
    return years.map((year) => ({
      year,
      subjects: filteredSubjects.filter((s) => s.año === year),
    }));
  }, [years, filteredSubjects]);

  // Memoize stats
  const stats = useMemo(() => ({
    total: subjects.length,
    aprobadas: subjects.filter((s) => s.status === "aprobada").length,
    regulares: subjects.filter((s) => s.status === "regular").length,
    cursables: subjects.filter((s) => s.status === "cursable").length,
    bloqueadas: subjects.filter((s) => s.status === "bloqueada").length,
  }), [subjects]);

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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando plan de carrera...</p>
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
            Plan de Carrera
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus materias y correlativas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-background font-medium hover:opacity-90 transition-all tour-career-add"
          >
            <Plus className="w-4 h-4" />
            Agregar Materia
          </button>
          <button
            onClick={() => navigate("/consultas")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/50 border border-border hover:bg-secondary transition-all text-foreground font-medium"
          >
            <Zap className="w-4 h-4 text-neon-cyan" />
            Consultas
          </button>
          <button
            onClick={() => navigate("/mapa")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/50 border border-border hover:bg-secondary transition-all text-foreground font-medium"
          >
            <Zap className="w-4 h-4 text-neon-gold" />
            Ver Mapa
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan font-medium hover:bg-neon-cyan/20 transition-all"
          >
            <BookOpen className="w-4 h-4" />
            Importar Plan
          </button>
          <button
            onClick={() => {
              const confirm1 = window.confirm("¿Estás SEGURO de que quieres borrar TODAS tus materias y progreso?");
              if (confirm1) {
                const confirm2 = window.confirm("ESTA ACCIÓN ES IRREVERSIBLE. ¿Realmente quieres eliminar todo?");
                if (confirm2) {
                  deleteAllSubjects();
                }
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive font-medium hover:bg-destructive/20 transition-all"
          >
            Borrar Todo
          </button>
          <div className="card-gamer rounded-lg px-3 py-1.5 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-neon-gold" />
            <span className="text-sm font-medium">{stats.aprobadas}/{stats.total}</span>
            <span className="text-xs text-muted-foreground">materias</span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="card-gamer rounded-xl p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-neon-gold">{stats.aprobadas}</p>
            <p className="text-xs text-muted-foreground">Aprobadas</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-neon-cyan">{stats.regulares}</p>
            <p className="text-xs text-muted-foreground">Regulares</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-neon-green">{stats.cursables}</p>
            <p className="text-xs text-muted-foreground">Cursables</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-muted-foreground">{stats.bloqueadas}</p>
            <p className="text-xs text-muted-foreground">Bloqueadas</p>
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
            placeholder="Buscar materia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-secondary rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setSelectedYear(null)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                selectedYear === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              )}
            >
              Todos
            </button>
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  selectedYear === year
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80"
                )}
              >
                Año {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setSelectedStatus(filter.value)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all border",
              selectedStatus === filter.value
                ? cn(filter.color, "border-current")
                : "bg-secondary border-transparent hover:bg-secondary/80"
            )}
          >
            {filter.label}
          </button>
        ))}

        {/* Toggle Hide Approved (Mobile primary) */}
        <button
          onClick={() => setHideApproved(!hideApproved)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all border flex items-center gap-2",
            hideApproved
              ? "bg-neon-gold/20 border-neon-gold text-neon-gold"
              : "bg-secondary border-transparent text-muted-foreground hover:bg-secondary/80"
          )}
        >
          {hideApproved ? "Mostrando Pendientes" : "Ocultar Aprobadas"}
        </button>
      </div>

      {/* Subjects Grid by Year */}
      <div className="space-y-8">
        {subjectsByYear.map(({ year, subjects: yearSubjects }) => (
          yearSubjects.length > 0 && (
            <div key={year}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
                  <span className="font-display font-bold text-background">{year}</span>
                </div>
                <div>
                  <h2 className="font-display font-semibold text-lg">Año {year}</h2>
                  <p className="text-xs text-muted-foreground">
                    {yearSubjects.filter(s => s.status === "aprobada").length}/{yearSubjects.length} completadas
                  </p>
                </div>
              </div>
              <div
                className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                style={{ contentVisibility: 'auto', containIntrinsicSize: '200px' } as React.CSSProperties}
              >
                {yearSubjects.map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    nombre={subject.nombre}
                    codigo={subject.codigo}
                    status={subject.status}
                    nota={subject.nota}
                    año={subject.año}
                    numero_materia={subject.numero_materia}
                    requisitos_faltantes={subject.requisitos_faltantes}
                    onClick={() => handleSubjectClick(subject)}
                  />
                ))}
              </div>
            </div>
          )
        ))}
      </div>


      {
        subjects.length === 0 && (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No hay materias cargadas todavía</p>
            <button
              onClick={handleOpenAddModal}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-background font-medium hover:opacity-90 transition-all"
            >
              Agregar tu primera materia
            </button>
          </div>
        )
      }

      {
        subjects.length > 0 && filteredSubjects.length === 0 && (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No se encontraron materias con los filtros seleccionados</p>
          </div>
        )
      }

      {/* Modals */}
      <SubjectStatusModal
        subject={selectedSubject}
        open={showStatusModal}
        onClose={handleCloseStatusModal}
        onUpdate={updateSubjectStatus}
        onUpdatePartialGrades={updatePartialGrades}
        onEditDetails={handleEditDetails}
        onEditDependencies={handleEditDependencies}
        onDelete={deleteSubject}
      />

      <AddSubjectModal
        open={showAddModal}
        onClose={handleCloseAddModal}
        onSubmit={createSubject}
        existingSubjects={rawSubjects}
        years={years}
      />

      <EditSubjectModal
        subject={selectedSubject}
        open={showEditDetailsModal}
        onClose={handleCloseEditDetailsModal}
        onSubmit={updateSubjectDetails}
      />

      <EditDependenciesModal
        subject={selectedSubject}
        open={showDepsModal}
        onClose={handleCloseDepsModal}
        onUpdate={updateSubjectDependencies}
        allSubjects={rawSubjects}
      />

      <ImportCareerModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={importCareerPlan}
      />
    </div >
  );
}


import { Button } from "@/components/ui/button";
import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  { value: "aprobada", label: "Aprobadas", color: "bg-[#ffd21c] text-black" },
  { value: "regular", label: "Regulares", color: "bg-[#1475e5] text-white" },
  { value: "cursable", label: "Cursables", color: "bg-[#25d06c] text-black" },
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
  const { isGuest: isGuestAuth } = useAuth();
  const isGuestMode = isGuestAuth;

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

  // Memoize filtered subjects
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
          <Loader2 className="w-12 h-12 animate-spin text-foreground" />
          <p className="text-foreground font-black uppercase tracking-widest">Cargando plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tabe-page p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 neo-bento-card bento-hover-blue p-6 lg:p-8 bg-card/80 backdrop-blur-sm">
        <div className="absolute -top-24 -left-16 h-48 w-48 rounded-full bg-neon-cyan/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 right-12 h-52 w-52 rounded-full bg-neon-purple/15 blur-3xl pointer-events-none" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-neon-cyan mb-3">
            Tu progreso académico
          </span>
          <h1 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-widest text-foreground">
            Plan de Carrera
          </h1>
          <p className="text-muted-foreground font-bold uppercase tracking-wider text-xs mt-1">
            Gestiona tus materias y correlativas
          </p>
        </div>
        <div className="relative flex flex-wrap items-center gap-2">
          {!isGuestMode && (
            <Button
              onClick={handleOpenAddModal}
              className="bg-[#25d06c] text-black hover:bg-[#25d06c]/90 tour-career-add"
            >
              <Plus className="w-4 h-4" />
              Agregar Materia
            </Button>
          )}
          <Button
            onClick={() => navigate("/consultas")}
            variant="secondary"
          >
            <Zap className="w-4 h-4" />
            Consultas
          </Button>
          <Button
            onClick={() => navigate("/mapa")}
            variant="secondary"
          >
            <Zap className="w-4 h-4 text-[#ffd21c]" />
            Ver Mapa
          </Button>
          {!isGuestMode && (
            <>
              <Button
                onClick={() => setShowImportModal(true)}
                variant="outline"
              >
                <BookOpen className="w-4 h-4" />
                Importar Plan
              </Button>
              <Button
                onClick={() => {
                  const confirm1 = window.confirm("¿Estás SEGURO de que quieres borrar TODAS tus materias y progreso?");
                  if (confirm1) {
                    const confirm2 = window.confirm("ESTA ACCIÓN ES IRREVERSIBLE. ¿Realmente quieres eliminar todo?");
                    if (confirm2) {
                      deleteAllSubjects();
                    }
                  }
                }}
                variant="destructive"
              >
                Borrar Todo
              </Button>
            </>
          )}
          <div className="bg-[#ffd21c] text-black px-3 py-2 rounded-lg border-[3px] border-foreground shadow-[2px_2px_0_0_#000] flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            <span className="text-sm font-black">{stats.aprobadas}/{stats.total}</span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="neo-bento-card p-4 bg-muted/30 dark:bg-background">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-black text-[#ffd21c] drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">{stats.aprobadas}</p>
            <p className="text-[10px] font-black uppercase text-foreground/70 tracking-widest mt-1">Aprobadas</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-[#1475e5] drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">{stats.regulares}</p>
            <p className="text-[10px] font-black uppercase text-foreground/70 tracking-widest mt-1">Regulares</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-[#25d06c] drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">{stats.cursables}</p>
            <p className="text-[10px] font-black uppercase text-foreground/70 tracking-widest mt-1">Cursables</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-muted-foreground drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">{stats.bloqueadas}</p>
            <p className="text-[10px] font-black uppercase text-foreground/70 tracking-widest mt-1">Bloqueadas</p>
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
            placeholder="BUSCAR MATERIA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background rounded-lg border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] focus:outline-none focus:translate-y-1 focus:shadow-none transition-all font-black uppercase tracking-wider text-sm"
          />
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-foreground" />
          <div className="flex gap-1.5 flex-wrap">
            <Button
              onClick={() => setSelectedYear(null)}
              variant={selectedYear === null ? "default" : "outline"}
            >
              Todos
            </Button>
            {years.map((year) => (
              <Button
                key={year}
                onClick={() => setSelectedYear(year)}
                variant={selectedYear === year ? "default" : "outline"}
              >
                Año {year}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <Button
            key={filter.value}
            onClick={() => setSelectedStatus(filter.value)}
            variant={selectedStatus === filter.value ? "default" : "outline"}
            className={cn(
              selectedStatus === filter.value && filter.value === "aprobada" && "bg-[#ffd21c] text-black hover:bg-[#ffd21c]/90",
              selectedStatus === filter.value && filter.value === "regular" && "bg-[#1475e5] text-white hover:bg-[#1475e5]/90",
              selectedStatus === filter.value && filter.value === "cursable" && "bg-[#25d06c] text-black hover:bg-[#25d06c]/90",
            )}
          >
            {filter.label}
          </Button>
        ))}

        {/* Toggle Hide Approved (Mobile primary) */}
        <Button
          onClick={() => setHideApproved(!hideApproved)}
          variant={hideApproved ? "default" : "outline"}
          className={cn(hideApproved && "bg-[#ffd21c] text-black hover:bg-[#ffd21c]/90")}
        >
          {hideApproved ? "Mostrando Pendientes" : "Ocultar Aprobadas"}
        </Button>
      </div>

      {/* Subjects Grid by Year */}
      <div className="space-y-8">
        {subjectsByYear.map(({ year, subjects: yearSubjects }) => (
          yearSubjects.length > 0 && (
            <div key={year}>
              <div className="flex items-center gap-3 mb-6 neo-bento-card p-3 w-fit bg-muted/30 dark:bg-background">
                <div className="w-10 h-10 rounded-lg bg-foreground text-background flex items-center justify-center">
                  <span className="font-black text-xl">{year}</span>
                </div>
                <div className="pr-2">
                  <h2 className="font-black text-lg uppercase tracking-widest">Año {year}</h2>
                  <p className="text-[10px] font-black uppercase text-foreground/60 tracking-wider">
                    {yearSubjects.filter(s => s.status === "aprobada").length}/{yearSubjects.length} completadas
                  </p>
                </div>
              </div>
              <div
                className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10 pt-8 pb-4"
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

      {/* Modals */}
      {selectedSubject && (
        <SubjectStatusModal
          open={showStatusModal}
          onClose={handleCloseStatusModal}
          subject={selectedSubject}
          onStatusChange={updateSubjectStatus}
          onGradesChange={updatePartialGrades}
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
      />
    </div>
  );
}

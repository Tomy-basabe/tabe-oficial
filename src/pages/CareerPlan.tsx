import { useState } from "react";
import { Filter, GraduationCap, Search, Plus, Loader2, Zap } from "lucide-react";
import { SubjectCard } from "@/components/dashboard/SubjectCard";
import { SubjectStatusModal } from "@/components/subjects/SubjectStatusModal";
import { AddSubjectModal } from "@/components/subjects/AddSubjectModal";
import { EditDependenciesModal } from "@/components/subjects/EditDependenciesModal";
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
  const { 
    subjects, 
    rawSubjects,
    loading, 
    updateSubjectStatus, 
    createSubject,
    updateSubjectDependencies,
    deleteSubject,
    initializeDefaultStatuses,
    getYears 
  } = useSubjects();
  
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals
  const [selectedSubject, setSelectedSubject] = useState<SubjectWithStatus | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDepsModal, setShowDepsModal] = useState(false);

  const years = getYears();

  const filteredSubjects = subjects.filter((subject) => {
    const matchesYear = selectedYear === null || subject.año === selectedYear;
    const matchesStatus = selectedStatus === "all" || subject.status === selectedStatus;
    const matchesSearch = subject.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          subject.codigo.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesYear && matchesStatus && matchesSearch;
  });

  const subjectsByYear = years.map((year) => ({
    year,
    subjects: filteredSubjects.filter((s) => s.año === year),
  }));

  const stats = {
    total: subjects.length,
    aprobadas: subjects.filter((s) => s.status === "aprobada").length,
    regulares: subjects.filter((s) => s.status === "regular").length,
    cursables: subjects.filter((s) => s.status === "cursable").length,
    bloqueadas: subjects.filter((s) => s.status === "bloqueada").length,
  };

  const handleSubjectClick = (subject: SubjectWithStatus) => {
    setSelectedSubject(subject);
    setShowStatusModal(true);
  };

  const handleEditDependencies = (subject: SubjectWithStatus) => {
    setSelectedSubject(subject);
    setShowStatusModal(false);
    setShowDepsModal(true);
  };

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
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-background font-medium hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Agregar Materia
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
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {yearSubjects.map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    nombre={subject.nombre}
                    codigo={subject.codigo}
                    status={subject.status}
                    nota={subject.nota}
                    año={subject.año}
                    onClick={() => handleSubjectClick(subject)}
                  />
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      {subjects.length > 0 && stats.aprobadas === 0 && stats.regulares === 0 && (
        <div className="card-gamer rounded-xl p-6 text-center border border-neon-cyan/30">
          <Zap className="w-12 h-12 mx-auto mb-4 text-neon-cyan" />
          <p className="text-foreground font-medium mb-2">¿Primera vez?</p>
          <p className="text-sm text-muted-foreground mb-4">
            Inicializa tu progreso con 1º y 2º año aprobados (excepto Inglés II)
          </p>
          <button
            onClick={initializeDefaultStatuses}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-background font-medium hover:opacity-90 transition-all"
          >
            Inicializar mi progreso
          </button>
        </div>
      )}

      {subjects.length === 0 && (
        <div className="text-center py-12">
          <GraduationCap className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">No hay materias cargadas todavía</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-background font-medium hover:opacity-90 transition-all"
          >
            Agregar tu primera materia
          </button>
        </div>
      )}

      {subjects.length > 0 && filteredSubjects.length === 0 && (
        <div className="text-center py-12">
          <GraduationCap className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No se encontraron materias con los filtros seleccionados</p>
        </div>
      )}

      {/* Modals */}
      <SubjectStatusModal
        subject={selectedSubject}
        open={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setSelectedSubject(null);
        }}
        onUpdate={updateSubjectStatus}
        onEditDependencies={handleEditDependencies}
        onDelete={deleteSubject}
      />

      <AddSubjectModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={createSubject}
        existingSubjects={rawSubjects}
        years={years}
      />

      <EditDependenciesModal
        subject={selectedSubject}
        open={showDepsModal}
        onClose={() => {
          setShowDepsModal(false);
          setSelectedSubject(null);
        }}
        onUpdate={updateSubjectDependencies}
        allSubjects={rawSubjects}
      />
    </div>
  );
}

import { useMemo, useState, useEffect } from "react";
import { useCalendarEvents, CalendarEvent, isExamType } from "@/hooks/useCalendarEvents";
import { useSubjects, Subject } from "@/hooks/useSubjects";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  GraduationCap, 
  LayoutPanelLeft, 
  List as ListIcon, 
  CheckCircle2, 
  BookOpen, 
  Timer,
  ChevronLeft,
  Search,
  Plus,
  X,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Bot,
  Flame,
  AlertCircle
} from "lucide-react";
import { cn, parseLocalDate } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cleanDisplayNotes } from "@/lib/googleCalendarSync";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { AddEventModal } from "@/components/calendar/AddEventModal";
import { getExamTheme } from "@/lib/examThemes";

const EXAM_TYPE_OPTIONS = [
  { value: "all", label: "Todos los tipos" },
  { value: "P1", label: "Primer Parcial (P1)" },
  { value: "P2", label: "Segundo Parcial (P2)" },
  { value: "Final", label: "Examen Final" },
  { value: "Global", label: "Examen Global" },
  { value: "Recuperatorio", label: "Recuperatorios" },
];

type QuickFilter = "all" | "week" | "parciales" | "finales" | "recuperatorios";

type KanbanStatus = "pending" | "studying" | "ready" | "done";

const KANBAN_COLUMNS: { id: KanbanStatus; label: string; icon: any; dotColor: string; bgAccent: string }[] = [
  { id: "pending", label: "Pendiente", icon: Timer, dotColor: "bg-zinc-400", bgAccent: "border-t-zinc-400" },
  { id: "studying", label: "En Estudio", icon: BookOpen, dotColor: "bg-sky-500", bgAccent: "border-t-sky-500" },
  { id: "ready", label: "Listo para Rendir", icon: AlertCircle, dotColor: "bg-amber-500", bgAccent: "border-t-amber-500" },
  { id: "done", label: "Rendido", icon: CheckCircle2, dotColor: "bg-emerald-500", bgAccent: "border-t-emerald-500" },
];

export default function Exams() {
  const navigate = useNavigate();
  const { events, loading, createEvent, updateEvent, deleteEvent } = useCalendarEvents();
  const { rawSubjects: subjects } = useSubjects();
  
  const [searchQuery, setSearchQuery] = useState<string>("" );
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleExamClick = (exam: CalendarEvent) => {
    setEventToEdit(exam);
    setShowEditModal(true);
  };

  const handleCreateNew = () => {
    setEventToEdit(null);
    setShowEditModal(true);
  };

  const subjectMap = useMemo(() => {
    const map = new Map<string, Subject>();
    subjects.forEach((s) => map.set(s.id, s));
    return map;
  }, [subjects]);

  const upcomingExams = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events
      .filter((e) => {
        if (!isExamType(e.tipo_examen)) return false;
        
        const eventDate = parseLocalDate(e.fecha);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() >= today.getTime();
      })
      .map((e) => {
        let subjectId = e.subject_id;
        let subjectNombre = e.subject_nombre;

        // Si falta subject_id, vincularlo por coincidencia de nombre
        if (!subjectId && (subjectNombre || e.notas)) {
          const targetName = (subjectNombre || "").toLowerCase();
          const found = subjects.find(
            (s) =>
              (targetName && s.nombre.toLowerCase() === targetName) ||
              (targetName && s.nombre.toLowerCase().includes(targetName)) ||
              (targetName && targetName.includes(s.nombre.toLowerCase()))
          );
          if (found) {
            subjectId = found.id;
            subjectNombre = found.nombre;
          }
        }

        return {
          ...e,
          subject_id: subjectId,
          subject_nombre: subjectNombre,
        };
      })
      .sort((a, b) => parseLocalDate(a.fecha).getTime() - parseLocalDate(b.fecha).getTime());
  }, [events, subjects]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    upcomingExams.forEach((exam) => {
      if (exam.subject_id) {
        const subject = subjectMap.get(exam.subject_id);
        if (subject) years.add(subject.año.toString());
      }
    });
    return Array.from(years).sort((a, b) => parseInt(a) - parseInt(b));
  }, [upcomingExams, subjectMap]);

  const availableSubjects = useMemo(() => {
    const filteredSubjectsList = new Map<string, string>();
    upcomingExams.forEach((exam) => {
      if (exam.subject_id) {
        const subject = subjectMap.get(exam.subject_id);
        if (subject) {
          if (selectedYear === "all" || subject.año.toString() === selectedYear) {
            filteredSubjectsList.set(subject.id, subject.nombre);
          }
        }
      }
    });
    return Array.from(filteredSubjectsList.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [upcomingExams, subjectMap, selectedYear]);

  // Resetea la materia seleccionada al cambiar de año
  useEffect(() => {
    setSelectedSubject("all");
  }, [selectedYear]);

  const getDaysRemaining = (targetDateStr: string) => {
    const target = parseLocalDate(targetDateStr);
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredExams = useMemo(() => {
    return upcomingExams.filter((exam) => {
      // 1. Filtrar por texto de búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = (exam.titulo || "").toLowerCase().includes(q);
        const matchesSubject = (exam.subject_nombre || "").toLowerCase().includes(q);
        const matchesNotes = (exam.notas || "").toLowerCase().includes(q);
        const matchesType = (exam.tipo_examen || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesSubject && !matchesNotes && !matchesType) {
          return false;
        }
      }

      // 2. Filtrar por año académico
      if (selectedYear !== "all" && exam.subject_id) {
        const subject = subjectMap.get(exam.subject_id);
        if (subject && subject.año.toString() !== selectedYear) return false;
      }

      // 3. Filtrar por materia
      if (selectedSubject !== "all" && exam.subject_id !== selectedSubject) return false;

      // 4. Filtrar por tipo de examen (dropdown)
      if (selectedType !== "all") {
        if (selectedType === "Recuperatorio") {
          if (!exam.tipo_examen.toLowerCase().includes("recup")) return false;
        } else if (exam.tipo_examen !== selectedType) {
          return false;
        }
      }

      // 5. Quick filter tabs (Notion / Apple style)
      if (quickFilter === "week") {
        const d = getDaysRemaining(exam.fecha);
        if (d < 0 || d > 7) return false;
      } else if (quickFilter === "parciales") {
        const t = (exam.tipo_examen || "").toLowerCase();
        if (!t.includes("p1") && !t.includes("p2") && !t.includes("parcial")) return false;
      } else if (quickFilter === "finales") {
        const t = (exam.tipo_examen || "").toLowerCase();
        if (!t.includes("final") && !t.includes("global")) return false;
      } else if (quickFilter === "recuperatorios") {
        const t = (exam.tipo_examen || "").toLowerCase();
        if (!t.includes("recup")) return false;
      }

      return true;
    });
  }, [upcomingExams, searchQuery, selectedSubject, selectedYear, selectedType, quickFilter, subjectMap]);

  const getExamStatus = (notas: string | null): KanbanStatus => {
    if (!notas) return "pending";
    if (notas.includes("[status:studying]")) return "studying";
    if (notas.includes("[status:ready]")) return "ready";
    if (notas.includes("[status:done]")) return "done";
    return "pending";
  };

  const updateExamStatus = async (exam: CalendarEvent, newStatus: KanbanStatus) => {
    let newNotas = exam.notas || "";
    newNotas = newNotas.replace(/\[status:\w+\]/g, "").trim();
    newNotas = `${newNotas} [status:${newStatus}]`.trim();

    try {
      await updateEvent(exam.id, { notas: newNotas });
      toast.success(`Examen movido a ${KANBAN_COLUMNS.find((c) => c.id === newStatus)?.label}`);
    } catch {
      toast.error("Error al actualizar el estado del examen");
    }
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      selectedYear !== "all" ||
      selectedSubject !== "all" ||
      selectedType !== "all" ||
      quickFilter !== "all"
  );

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedYear("all");
    setSelectedSubject("all");
    setSelectedType("all");
    setQuickFilter("all");
  };

  const closestExam = upcomingExams[0];
  const closestDays = closestExam ? getDaysRemaining(closestExam.fecha) : null;

  // Estadísticas rápidas para el dashboard de exámenes
  const examsThisWeek = useMemo(() => {
    return upcomingExams.filter((e) => {
      const d = getDaysRemaining(e.fecha);
      return d >= 0 && d <= 7;
    }).length;
  }, [upcomingExams]);

  const parcialesCount = useMemo(() => {
    return upcomingExams.filter((e) => {
      const t = (e.tipo_examen || "").toLowerCase();
      return t.includes("p1") || t.includes("p2") || t.includes("parcial");
    }).length;
  }, [upcomingExams]);

  const finalesCount = useMemo(() => {
    return upcomingExams.filter((e) => {
      const t = (e.tipo_examen || "").toLowerCase();
      return t.includes("final") || t.includes("global");
    }).length;
  }, [upcomingExams]);

  const formatHeaderDate = (dateStr: string) => {
    const d = parseLocalDate(dateStr);
    const month = d.toLocaleDateString("es-AR", { month: "short" }).replace(".", "").toUpperCase();
    const day = d.getDate();
    const weekday = d.toLocaleDateString("es-AR", { weekday: "short" });
    return { month, day, weekday };
  };

  if (loading && upcomingExams.length === 0) {
    return <LoadingScreen message="Cargando Exámenes..." submessage="Sincronizando fechas de evaluación..." />;
  }

  return (
    <div className="tabe-page p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Apple / Notion / Linear Style */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div>
          <Link
            to="/calendario"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors mb-2 font-medium"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Volver al Calendario</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Exámenes
            </h1>
            <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/80">
              {upcomingExams.length} agendados
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-normal">
            Seguimiento de parciales, finales y entregas académicas
          </p>
        </div>

        {/* Segmented View Control & Primary CTA */}
        <div className="flex items-center gap-2.5 self-start md:self-end">
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all cursor-pointer",
                viewMode === "list"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all cursor-pointer",
                viewMode === "kanban"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <LayoutPanelLeft className="w-3.5 h-3.5" />
              <span>Tablero</span>
            </button>
          </div>

          <Link
            to="/tabe-ai/examenes"
            className="h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Rutas con IA</span>
            <span className="sm:hidden">Rutas</span>
          </Link>

          <Button
            onClick={handleCreateNew}
            className="h-9 px-3.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white text-xs font-medium flex items-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Examen</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards: Apple / Linear Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Próximo a Rendir */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 text-[11px] font-medium uppercase tracking-wider">
            <span>Próximo a Rendir</span>
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="mt-2.5">
            {closestExam ? (
              <>
                <div
                  className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate"
                  title={closestExam.titulo}
                >
                  {closestExam.titulo}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-md border",
                      closestDays === 0
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60"
                        : closestDays === 1
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60"
                    )}
                  >
                    {closestDays === 0 ? "¡Hoy!" : closestDays === 1 ? "Mañana" : `En ${closestDays} días`}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 font-normal">
                    {parseLocalDate(closestExam.fecha).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-xs text-zinc-400 dark:text-zinc-500 py-1 font-normal">
                Sin exámenes próximos
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Esta semana */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 text-[11px] font-medium uppercase tracking-wider">
            <span>Esta Semana</span>
            <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {examsThisWeek}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-normal mt-0.5">
              {examsThisWeek === 1 ? "instancia en los próximos 7 días" : "instancias en los próximos 7 días"}
            </div>
          </div>
        </div>

        {/* Card 3: Instancias Clave */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 text-[11px] font-medium uppercase tracking-wider">
            <span>Por Instancia</span>
            <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="mt-2.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span className="text-xs text-zinc-600 dark:text-zinc-400 font-normal">Parciales:</span>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{parcialesCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-xs text-zinc-600 dark:text-zinc-400 font-normal">Finales:</span>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{finalesCount}</span>
              </div>
            </div>
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-normal mt-1">
              {upcomingExams.length} fechas registradas
            </div>
          </div>
        </div>

        {/* Card 4: Acceso Rápido a Preparación */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500 text-[11px] font-medium uppercase tracking-wider">
            <span>Herramientas de Estudio</span>
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <Link
              to="/pomodoro"
              className="flex-1 py-1.5 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-200 text-xs font-medium text-center hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Timer className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
              <span>Pomodoro</span>
            </Link>
            <Link
              to="/TABEAI"
              className="flex-1 py-1.5 px-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white text-xs font-medium text-center transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Bot className="w-3 h-3" />
              <span>Tutor IA</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Notion-Style Filter & Search Bar */}
      <div className="bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 sm:p-4 shadow-2xs space-y-3">
        {/* Search & Selects */}
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, materia, temario o tipo..."
              className="w-full h-9 pl-8.5 pr-8 text-xs rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 transition-all font-normal"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
            {/* Filtro por Año */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-9 text-xs rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-3 min-w-[110px] shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-800/60 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-medium">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent className="border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md rounded-lg shadow-md text-xs">
                <SelectItem value="all">Todos los años</SelectItem>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}° Año
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por Materia */}
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="h-9 text-xs rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-3 min-w-[150px] max-w-[220px] shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-800/60 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-medium truncate">
                <SelectValue placeholder="Materia" />
              </SelectTrigger>
              <SelectContent className="border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md rounded-lg shadow-md text-xs max-h-[260px]">
                <SelectItem value="all">Todas las materias</SelectItem>
                {availableSubjects.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="truncate">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por Tipo */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-9 text-xs rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 px-3 min-w-[125px] shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-800/60 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-medium">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md rounded-lg shadow-md text-xs">
                {EXAM_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Limpiar */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-9 px-2.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg flex items-center gap-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer font-medium"
                title="Limpiar filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpiar</span>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Filter Tabs: Notion View Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar border-t border-zinc-100 dark:border-zinc-800/60">
          <button
            onClick={() => setQuickFilter("all")}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer",
              quickFilter === "all"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            )}
          >
            Todos ({upcomingExams.length})
          </button>
          <button
            onClick={() => setQuickFilter("week")}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1",
              quickFilter === "week"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            )}
          >
            <Clock className="w-3 h-3" />
            <span>Esta Semana ({examsThisWeek})</span>
          </button>
          <button
            onClick={() => setQuickFilter("parciales")}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1",
              quickFilter === "parciales"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            )}
          >
            <span>Parciales ({parcialesCount})</span>
          </button>
          <button
            onClick={() => setQuickFilter("finales")}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1",
              quickFilter === "finales"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            )}
          >
            <span>Finales & Globales ({finalesCount})</span>
          </button>
          <button
            onClick={() => setQuickFilter("recuperatorios")}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1",
              quickFilter === "recuperatorios"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            )}
          >
            <span>Recuperatorios</span>
          </button>
        </div>
      </div>

      {/* Main Content: List or Kanban View */}
      <div className="min-h-[420px]">
        {filteredExams.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 sm:p-16 text-center rounded-xl bg-white dark:bg-[#18181b] border border-dashed border-zinc-200 dark:border-zinc-800 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-3 border border-zinc-200/60 dark:border-zinc-700/60">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No se encontraron exámenes
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm font-normal">
              {hasActiveFilters
                ? "No hay evaluaciones que coincidan con los filtros seleccionados."
                : "No tenés exámenes agendados próximamente. Agendá tus parciales para planificar repasos automáticos."}
            </p>
            <div className="flex gap-2.5 mt-4">
              {hasActiveFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="text-xs rounded-lg cursor-pointer"
                >
                  Limpiar filtros
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleCreateNew}
                    size="sm"
                    className="text-xs rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Nuevo Examen
                  </Button>
                  <Link to="/calendario">
                    <Button variant="outline" size="sm" className="text-xs rounded-lg cursor-pointer">
                      Ir al Calendario
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : viewMode === "list" ? (
          /* List View: Apple / Notion Style Cards */
          <div className="space-y-2.5">
            {filteredExams.map((exam) => {
              const daysRemaining = getDaysRemaining(exam.fecha);
              const theme = getExamTheme(exam.tipo_examen);
              const isToday = daysRemaining === 0;
              const isUrgent = daysRemaining > 0 && daysRemaining <= 3;
              const notesDisplay = cleanDisplayNotes(exam.notas);
              const dateInfo = formatHeaderDate(exam.fecha);

              return (
                <div
                  key={exam.id}
                  onClick={() => handleExamClick(exam)}
                  className="group relative bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3.5 sm:p-4 transition-all cursor-pointer shadow-2xs hover:shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 flex flex-col sm:flex-row gap-3.5 sm:items-center justify-between"
                  title="Clic para editar o ver detalles"
                >
                  {/* Left: Date Block + Exam Details */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    {/* Apple Calendar Style Date Badge */}
                    <div className="w-11 h-11 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] font-semibold tracking-wider text-rose-600 dark:text-rose-400 uppercase leading-none">
                        {dateInfo.month}
                      </span>
                      <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-none mt-0.5">
                        {dateInfo.day}
                      </span>
                    </div>

                    {/* Information */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Type Badge */}
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium border",
                            theme.badge
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full", theme.dot)} />
                          {exam.tipo_examen}
                        </span>

                        {/* Subject Badge */}
                        {exam.subject_nombre && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                            <BookOpen className="w-2.5 h-2.5 text-zinc-400" />
                            <span className="truncate max-w-[180px]">{exam.subject_nombre}</span>
                          </span>
                        )}

                        {/* Hour */}
                        {exam.hora && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {exam.hora} hs
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-sm sm:text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors leading-snug truncate">
                        {exam.titulo}
                      </h3>

                      {/* Notes snippet */}
                      {notesDisplay && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 font-normal">
                          {notesDisplay}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Countdown pill & Study shortcut */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/60">
                    <span
                      className={cn(
                        "text-xs font-semibold px-2.5 py-1 rounded-md border",
                        isToday
                          ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60 animate-pulse"
                          : isUrgent
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60"
                      )}
                    >
                      {isToday ? "¡Rindes hoy!" : daysRemaining === 1 ? "Mañana" : `Faltan ${daysRemaining}d`}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/pomodoro");
                      }}
                      className="text-xs text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Estudiar para este examen en Pomodoro"
                    >
                      <Timer className="w-3.5 h-3.5" />
                    </button>

                    <ChevronRight className="w-4 h-4 text-zinc-400 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Kanban Board View: Notion Database Style */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-start">
            {KANBAN_COLUMNS.map((col) => {
              const columnExams = filteredExams.filter((e) => getExamStatus(e.notas) === col.id);

              return (
                <div
                  key={col.id}
                  className="flex flex-col gap-2.5 bg-zinc-50/60 dark:bg-[#141416] border border-zinc-200/80 dark:border-zinc-800/80 p-3 rounded-xl shadow-2xs min-h-[460px]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-1 py-1 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", col.dotColor)} />
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {col.label}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60 shadow-2xs">
                      {columnExams.length}
                    </span>
                  </div>

                  {/* Cards inside column */}
                  <div className="space-y-2 pt-0.5">
                    {columnExams.map((exam) => {
                      const daysRemaining = getDaysRemaining(exam.fecha);
                      const isUrgent = daysRemaining <= 3 && col.id !== "done";
                      const isToday = daysRemaining === 0 && col.id !== "done";
                      const theme = getExamTheme(exam.tipo_examen);

                      return (
                        <div
                          key={exam.id}
                          onClick={() => handleExamClick(exam)}
                          className={cn(
                            "bg-white dark:bg-[#1c1c1f] p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col gap-2 transition-all group relative cursor-pointer shadow-2xs hover:shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700",
                            isUrgent && "border-amber-300 dark:border-amber-500/40"
                          )}
                          title="Clic para ver o editar este examen"
                        >
                          {/* Card Header */}
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate max-w-[140px]">
                              {exam.subject_nombre || "General"}
                            </span>

                            {/* Move column quick buttons on hover */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {col.id !== "pending" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const prevIdx = KANBAN_COLUMNS.findIndex((c) => c.id === col.id) - 1;
                                    updateExamStatus(exam, KANBAN_COLUMNS[prevIdx].id);
                                  }}
                                  className="w-4.5 h-4.5 flex items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                                  title="Mover a etapa anterior"
                                >
                                  <ArrowLeft className="w-2.5 h-2.5" />
                                </button>
                              )}
                              {col.id !== "done" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextIdx = KANBAN_COLUMNS.findIndex((c) => c.id === col.id) + 1;
                                    updateExamStatus(exam, KANBAN_COLUMNS[nextIdx].id);
                                  }}
                                  className="w-4.5 h-4.5 flex items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                                  title="Mover a etapa siguiente"
                                >
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Title */}
                          <h4 className="text-xs font-semibold leading-snug line-clamp-2 text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">
                            {exam.titulo}
                          </h4>

                          {/* Footer with date and countdown */}
                          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60 mt-0.5">
                            <div className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                              <CalendarIcon className="w-2.5 h-2.5" />
                              <span>
                                {parseLocalDate(exam.fecha).toLocaleDateString("es-AR", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                            </div>

                            <span
                              className={cn(
                                "text-[10px] font-medium px-1.5 py-0.2 rounded border",
                                isToday
                                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60"
                                  : isUrgent
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60"
                                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60"
                              )}
                            >
                              {isToday ? "¡Hoy!" : `${daysRemaining}d`}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {columnExams.length === 0 && (
                      <div className="p-4 text-center text-xs text-zinc-400 dark:text-zinc-600 border border-dashed border-zinc-200/80 dark:border-zinc-800 rounded-lg font-normal">
                        Sin evaluaciones
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal para Crear / Editar Examen */}
      <AddEventModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEventToEdit(null);
        }}
        onSubmit={async (data) => {
          if (eventToEdit) {
            const { id, ...updateData } = data as any;
            await updateEvent(id || eventToEdit.id, updateData);
            toast.success("Examen actualizado correctamente");
          } else {
            await createEvent(data as any);
            toast.success("Examen agendado correctamente");
          }
        }}
        onDelete={async (id) => {
          await deleteEvent(id);
          toast.success("Examen eliminado correctamente");
        }}
        subjects={subjects}
        initialDate={eventToEdit ? parseLocalDate(eventToEdit.fecha) : new Date()}
        editEvent={eventToEdit}
      />
    </div>
  );
}

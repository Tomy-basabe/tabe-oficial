import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarEvent, isExamType } from "@/hooks/useCalendarEvents";
import { Subject } from "@/hooks/useSubjects";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Filter, 
  AlertCircle, 
  GraduationCap, 
  LayoutPanelLeft, 
  List as ListIcon, 
  CheckCircle2, 
  BookOpen, 
  Timer,
  ChevronRight,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import { cn, parseLocalDate } from "@/lib/utils";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { toast } from "sonner";
import { cleanDisplayNotes } from "@/lib/googleCalendarSync";
import { getExamTheme } from "@/lib/examThemes";

interface ExamsListModalProps {
  open: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  subjects: Subject[];
  onEditExam?: (event: CalendarEvent) => void;
}

export type KanbanStatus = "pending" | "studying" | "ready" | "done";

const KANBAN_COLUMNS: { id: KanbanStatus; label: string; icon: any; dotColor: string; bgAccent: string }[] = [
  { id: "pending", label: "Pendiente", icon: Timer, dotColor: "bg-zinc-400", bgAccent: "border-t-zinc-400" },
  { id: "studying", label: "En Estudio", icon: BookOpen, dotColor: "bg-sky-500", bgAccent: "border-t-sky-500" },
  { id: "ready", label: "Listo para Rendir", icon: AlertCircle, dotColor: "bg-amber-500", bgAccent: "border-t-amber-500" },
  { id: "done", label: "Rendido", icon: CheckCircle2, dotColor: "bg-emerald-500", bgAccent: "border-t-emerald-500" },
];

export function ExamsListModal({ open, onClose, events, subjects, onEditExam }: ExamsListModalProps) {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const { updateEvent } = useCalendarEvents();

  // Map for quick subject lookup by ID
  const subjectMap = useMemo(() => {
    const map = new Map<string, Subject>();
    subjects.forEach(s => map.set(s.id, s));
    return map;
  }, [subjects]);

  // 1. Filter only future/today exams and sort chronologically
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

        if (!subjectId && (subjectNombre || e.notas)) {
          const targetName = (subjectNombre || "").toLowerCase();
          const found = subjects.find(s => 
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

  useEffect(() => {
    setSelectedSubject("all");
  }, [selectedYear]);

  const filteredExams = useMemo(() => {
    return upcomingExams.filter((exam) => {
      if (selectedYear !== "all" && exam.subject_id) {
        const subject = subjectMap.get(exam.subject_id);
        if (subject && subject.año.toString() !== selectedYear) return false;
      }
      if (selectedSubject !== "all" && exam.subject_id !== selectedSubject) return false;
      return true;
    });
  }, [upcomingExams, selectedSubject, selectedYear, subjectMap]);

  const getDaysRemaining = (targetDateStr: string) => {
    const target = parseLocalDate(targetDateStr);
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

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
      toast.success(`Examen movido a ${KANBAN_COLUMNS.find(c => c.id === newStatus)?.label}`);
    } catch {
      toast.error("Error al actualizar el estado del examen");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white dark:bg-[#18181b] border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg rounded-2xl max-h-[85vh] flex flex-col p-5 sm:p-6">
        <DialogHeader className="mb-3 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-3">
            <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span>Próximos Exámenes</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                {upcomingExams.length}
              </span>
            </DialogTitle>
            
            {/* View Mode Toggle */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60 self-start sm:self-auto">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all",
                  viewMode === "list"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                <ListIcon className="w-3.5 h-3.5" />
                Lista
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all",
                  viewMode === "kanban"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                <LayoutPanelLeft className="w-3.5 h-3.5" />
                Tablero
              </button>
            </div>
          </div>
          <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
            {viewMode === "list" 
              ? "Instancias de evaluación ordenadas cronológicamente para organizar tu estudio."
              : "Organiza tu progreso de estudio moviendo tus exámenes entre las diferentes etapas."}
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4 p-2 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-zinc-500 text-xs px-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-medium text-[11px] uppercase tracking-wider">Filtros</span>
          </div>
          
          {/* Desplegable de Años */}
          <div className="w-[140px]">
            <Select
              value={selectedYear}
              onValueChange={(val) => {
                setSelectedYear(val);
                setSelectedSubject("all");
              }}
            >
              <SelectTrigger className="h-8 px-2.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors shadow-2xs focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg">
                <SelectItem value="all" className="text-xs font-medium">Todos los años</SelectItem>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={y} className="text-xs font-medium">
                    {y}° Año
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desplegable de Materias */}
          <div className="flex-1 min-w-[200px]">
            <Select
              value={selectedSubject}
              onValueChange={(val) => setSelectedSubject(val)}
            >
              <SelectTrigger className="h-8 px-2.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors shadow-2xs focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 truncate">
                <SelectValue placeholder="Todas las materias" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-[260px] shadow-lg">
                <SelectItem value="all" className="text-xs font-medium">Todas las materias</SelectItem>
                {availableSubjects.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs font-medium">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-400 dark:text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
              <GraduationCap className="w-10 h-10 mb-2 opacity-30" />
              <p className="font-medium text-sm text-zinc-700 dark:text-zinc-300">No hay exámenes programados</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                Agrega un nuevo evento en el calendario de tipo Parcial o Final para que aparezca aquí.
              </p>
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-2.5">
              {filteredExams.map((exam) => {
                const daysRemaining = getDaysRemaining(exam.fecha);
                const isUrgent = daysRemaining > 0 && daysRemaining <= 3;
                const isToday = daysRemaining === 0;
                const theme = getExamTheme(exam.tipo_examen);
                const notesDisplay = cleanDisplayNotes(exam.notas);

                return (
                  <div 
                    key={exam.id}
                    onClick={() => onEditExam?.(exam)}
                    className={cn(
                      "p-3.5 bg-white dark:bg-[#1a1a1d] text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs transition-all hover:border-zinc-300 dark:hover:border-zinc-700 flex flex-col md:flex-row gap-3 justify-between items-start md:items-center border-l-4",
                      theme.borderAccent ? theme.borderAccent : "border-l-zinc-300",
                      onEditExam && "cursor-pointer group"
                    )}
                    title={onEditExam ? "Click para modificar este examen" : undefined}
                  >
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                          theme.badge
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", theme.dot)} />
                          {exam.tipo_examen}
                        </span>

                        {exam.subject_nombre && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1 truncate max-w-[180px]">
                            <BookOpen className="w-3 h-3 text-zinc-400" />
                            {exam.subject_nombre}
                          </span>
                        )}
                      </div>
                      
                      <h4 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">
                        {exam.titulo}
                      </h4>
                      
                      {notesDisplay && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 italic font-normal">
                          {notesDisplay}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between w-full md:w-auto gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800/60">
                      <div className="flex flex-col items-start md:items-end text-right">
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                          {parseLocalDate(exam.fecha).toLocaleDateString('es-AR', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        {exam.hora && (
                          <span className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {exam.hora} hs
                          </span>
                        )}
                      </div>

                      {/* Countdown badge */}
                      {isToday ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          ¡Hoy!
                        </span>
                      ) : isUrgent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          <AlertCircle className="w-3 h-3" />
                          {daysRemaining}d
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                          <Timer className="w-3 h-3" />
                          {daysRemaining}d
                        </span>
                      )}

                      <ChevronRight className="w-4 h-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 h-full min-h-[380px]">
              {KANBAN_COLUMNS.map((col) => {
                const columnExams = filteredExams.filter(e => getExamStatus(e.notas) === col.id);

                return (
                  <div 
                    key={col.id} 
                    className={cn(
                      "flex flex-col gap-2.5 bg-zinc-50/70 dark:bg-[#141416] border border-zinc-200/80 dark:border-zinc-800/80 p-2.5 rounded-xl border-t-2",
                      col.bgAccent
                    )}
                  >
                    <div className="flex items-center justify-between px-1 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full", col.dotColor)} />
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{col.label}</span>
                      </div>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                        {columnExams.length}
                      </span>
                    </div>
                    
                    <div className="space-y-2 p-0.5">
                      {columnExams.map((exam) => {
                        const daysRemaining = getDaysRemaining(exam.fecha);
                        const isUrgent = daysRemaining <= 3 && col.id !== "done";
                        const isToday = daysRemaining === 0 && col.id !== "done";
                        const theme = getExamTheme(exam.tipo_examen);
                        
                        return (
                          <div 
                            key={exam.id}
                            onClick={() => onEditExam?.(exam)}
                            className={cn(
                              "p-2.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#1e1e21] text-zinc-900 dark:text-zinc-100 flex flex-col gap-1.5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700 group shadow-2xs border-l-3",
                              theme.borderAccent ? theme.borderAccent : "border-l-zinc-400",
                              onEditExam && "cursor-pointer"
                            )}
                            title={onEditExam ? "Click para modificar este examen" : undefined}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] text-zinc-400 truncate max-w-[80px]">
                                {exam.subject_nombre || "General"}
                              </span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                {col.id !== "pending" && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const prevIdx = KANBAN_COLUMNS.findIndex(c => c.id === col.id) - 1;
                                      updateExamStatus(exam, KANBAN_COLUMNS[prevIdx].id);
                                    }}
                                    className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                                    title="Mover anterior"
                                  >
                                    <ArrowLeft className="w-3 h-3" />
                                  </button>
                                )}
                                {col.id !== "done" && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const nextIdx = KANBAN_COLUMNS.findIndex(c => c.id === col.id) + 1;
                                      updateExamStatus(exam, KANBAN_COLUMNS[nextIdx].id);
                                    }}
                                    className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                                    title="Mover siguiente"
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <h5 className="text-xs font-semibold leading-snug line-clamp-2">
                              {exam.titulo}
                            </h5>

                            <div className="flex items-center justify-between text-[10px] pt-1 border-t border-zinc-100 dark:border-zinc-800/60 mt-0.5 text-zinc-500">
                              <span>
                                {parseLocalDate(exam.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                              </span>
                              <span className={cn(
                                "font-medium px-1.5 py-0.2 rounded-full",
                                isToday ? "bg-rose-500/10 text-rose-600" : isUrgent ? "bg-amber-500/10 text-amber-600" : "text-zinc-400"
                              )}>
                                {isToday ? "¡Hoy!" : `${daysRemaining}d`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { Subject } from "@/hooks/useSubjects";
import { Calendar as CalendarIcon, Clock, Filter, AlertCircle, GraduationCap, LayoutPanelLeft, List as ListIcon, CheckCircle2, BookOpen, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { toast } from "sonner";

interface ExamsListModalProps {
  open: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  subjects: Subject[];
}

const EXAM_TYPES = [
  "P1",
  "P2",
  "Global",
  "Recuperatorio P1",
  "Recuperatorio P2",
  "Recuperatorio Global",
  "Final"
];

const eventTypeColors: Record<string, string> = {
  P1: "bg-[#00FF9D] border-foreground text-black font-black",
  P2: "bg-[#00F0FF] border-foreground text-black font-black",
  Global: "bg-[#FFD21C] border-foreground text-black font-black",
  "Recuperatorio P1": "bg-[#FF3366] border-foreground text-black font-black",
  "Recuperatorio P2": "bg-[#FF3366] border-foreground text-black font-black",
  "Recuperatorio Global": "bg-[#FF3366] border-foreground text-black font-black",
  Final: "bg-[#B000FF] border-foreground text-white font-black",
};

export type KanbanStatus = "pending" | "studying" | "ready" | "done";

const KANBAN_COLUMNS: { id: KanbanStatus; label: string; icon: any; color: string }[] = [
  { id: "pending", label: "Pendiente", icon: Timer, color: "text-muted-foreground" },
  { id: "studying", label: "En Estudio", icon: BookOpen, color: "text-neon-cyan" },
  { id: "ready", label: "Listo para rendir", icon: AlertCircle, color: "text-neon-gold" },
  { id: "done", label: "Rendido", icon: CheckCircle2, color: "text-neon-green" },
];

export function ExamsListModal({ open, onClose, events, subjects }: ExamsListModalProps) {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const { updateEvent } = useCalendarEvents();

  // Create a map for quick subject lookup by ID
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
        // Is it an exam type?
        if (!EXAM_TYPES.includes(e.tipo_examen)) return false;
        
        // Is it today or in the future?
        const eventDate = new Date(e.fecha);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() >= today.getTime();
      })
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [events]);

  // 2. Extract unique years and subjects from upcoming exams for filters
  const { availableYears, availableSubjects } = useMemo(() => {
    const years = new Set<string>();
    const filteredSubjectsList = new Map<string, string>(); // id -> name

    upcomingExams.forEach((exam) => {
      if (exam.subject_id) {
        const subject = subjectMap.get(exam.subject_id);
        if (subject) {
          years.add(subject.año.toString());
          
          // Only add to availableSubjects if no year is selected OR it matches the selected year
          if (selectedYear === "all" || subject.año.toString() === selectedYear) {
            filteredSubjectsList.set(subject.id, subject.nombre);
          }
        }
      }
    });

    return {
      availableYears: Array.from(years).sort((a, b) => parseInt(a) - parseInt(b)),
      availableSubjects: Array.from(filteredSubjectsList.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
    };
  }, [upcomingExams, subjectMap, selectedYear]);

  // Resetea la materia seleccionada si cambiamos de año
  useEffect(() => {
    setSelectedSubject("all");
  }, [selectedYear]);

  // 3. Apply active filters
  const filteredExams = useMemo(() => {
    return upcomingExams.filter((exam) => {
      if (selectedSubject !== "all" && exam.subject_id !== selectedSubject) return false;
      
      if (selectedYear !== "all" && exam.subject_id) {
        const subject = subjectMap.get(exam.subject_id);
        if (subject && subject.año.toString() !== selectedYear) return false;
      }
      
      return true;
    });
  }, [upcomingExams, selectedSubject, selectedYear, subjectMap]);

  // Helper to calculate days remaining
  const getDaysRemaining = (targetDateStr: string) => {
    const target = new Date(targetDateStr);
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
    // Remove old status tags
    newNotas = newNotas.replace(/\[status:\w+\]/g, "").trim();
    // Add new status tag
    newNotas = `${newNotas} [status:${newStatus}]`.trim();

    try {
      await updateEvent(exam.id, { notas: newNotas });
      toast.success(`Examen movido a ${KANBAN_COLUMNS.find(c => c.id === newStatus)?.label}`);
    } catch (error) {
      toast.error("Error al actualizar el estado del examen");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-background border-4 border-foreground shadow-[12px_12px_0_0_hsl(var(--foreground))] rounded-xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
            <DialogTitle className="text-2xl font-display font-black uppercase tracking-tight flex items-center gap-3 text-foreground">
              <div className="w-12 h-12 rounded-xl bg-[#FF3366] flex items-center justify-center border-4 border-foreground shadow-[4px_4px_0_0_#000]">
                <GraduationCap className="w-7 h-7 text-black" />
              </div>
              Próximos Exámenes
            </DialogTitle>
            
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all border-[3px] border-foreground",
                  viewMode === "list" ? "bg-[#FFD21C] text-black shadow-[4px_4px_0_0_#000] translate-y-[-2px]" : "bg-white text-black hover:bg-muted shadow-[2px_2px_0_0_#000]"
                )}
              >
                <ListIcon className="w-4 h-4" />
                Lista
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all border-[3px] border-foreground",
                  viewMode === "kanban" ? "bg-[#FFD21C] text-black shadow-[4px_4px_0_0_#000] translate-y-[-2px]" : "bg-white text-black hover:bg-muted shadow-[2px_2px_0_0_#000]"
                )}
              >
                <LayoutPanelLeft className="w-4 h-4" />
                Kanban 📋
              </button>
            </div>
          </div>
          <DialogDescription>
            {viewMode === "list" 
              ? "Visualiza y filtra tus instancias de evaluación (parciales, globales y finales) ordenadas cronológicamente."
              : "Organiza tu progreso de estudio arrastrando tus exámenes entre las diferentes etapas."}
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 rounded-xl bg-[#4ECDC4] border-4 border-foreground shadow-[4px_4px_0_0_#000]">
          <div className="flex items-center gap-2 text-black mr-2">
            <Filter className="w-5 h-5" />
            <span className="text-sm font-black uppercase tracking-widest whitespace-nowrap">Filtros:</span>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full">
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setSelectedSubject("all");
              }}
              className="bg-white text-black border-[3px] border-foreground rounded-lg px-3 py-2 text-sm min-w-[120px] focus:outline-none focus:shadow-[2px_2px_0_0_#000] transition-all font-bold"
            >
              <option value="all">Todos los años</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}° Año</option>
              ))}
            </select>

            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-white text-black border-[3px] border-foreground rounded-lg px-3 py-2 text-sm flex-1 md:flex-none min-w-[200px] focus:outline-none focus:shadow-[2px_2px_0_0_#000] transition-all font-bold"
            >
              <option value="all">Todas las materias</option>
              {availableSubjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-2">
          {filteredExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
              <GraduationCap className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-medium text-lg">No hay exámenes programados</p>
              <p className="text-sm mt-1">
                Agrega un nuevo evento en el calendario de tipo Parcial o Final para que aparezca aquí.
              </p>
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-4">
              {filteredExams.map((exam) => {
                const daysRemaining = getDaysRemaining(exam.fecha);
                const isUrgent = daysRemaining <= 3;
                const isToday = daysRemaining === 0;

                return (
                  <div 
                    key={exam.id}
                    className="p-4 bg-white text-black rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000] transition-all hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#000] flex flex-col md:flex-row gap-4 justify-between"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          className={cn(
                            "px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-widest border-2",
                            !exam.color && eventTypeColors[exam.tipo_examen]
                          )}
                          style={exam.color ? { backgroundColor: exam.color, borderColor: 'var(--foreground)', color: '#000' } : undefined}
                        >
                          {exam.tipo_examen}
                        </span>
                        {exam.subject_nombre && (
                          <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                            📚 {exam.subject_nombre}
                          </span>
                        )}
                      </div>
                      
                      <h4 className="text-xl font-black uppercase tracking-tight text-black">
                        {exam.titulo}
                      </h4>
                      
                      {exam.notas && (
                        <p className="text-sm text-muted-foreground italic line-clamp-2">
                          {exam.notas.replace(/\[status:\w+\]/g, "").trim()}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-start md:items-end justify-between min-w-[140px] gap-2 md:gap-0 pl-0 md:pl-4 md:border-l-[3px] border-foreground">
                      <div className="flex flex-col items-start md:items-end">
                        <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4 opacity-70" />
                          {new Date(exam.fecha).toLocaleDateString('es-AR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        {exam.hora && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                            <Clock className="w-3.5 h-3.5" />
                            {exam.hora}
                          </span>
                        )}
                      </div>

                      <div className={cn(
                        "flex items-center gap-1.5 text-sm font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border-[3px] border-foreground shadow-[2px_2px_0_0_#000] w-full md:w-auto mt-2",
                        isToday 
                          ? "bg-[#FF3366] text-black animate-pulse" 
                          : isUrgent 
                            ? "bg-[#FFE66D] text-black" 
                            : "bg-[#00F0FF] text-black"
                      )}>
                        {isToday ? (
                          <>
                            <AlertCircle className="w-4 h-4" />
                            <span>¡Es hoy!</span>
                          </>
                        ) : (
                          <>
                            <span>Faltan {daysRemaining} días</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full min-h-[400px]">
              {KANBAN_COLUMNS.map((col) => (
                <div key={col.id} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted text-foreground rounded-lg border-4 border-foreground shadow-[4px_4px_0_0_#000]">
                    <col.icon className="w-5 h-5 text-foreground" />
                    <span className="text-sm font-black uppercase tracking-widest truncate">{col.label}</span>
                    <span className="ml-auto text-xs font-black px-2 py-0.5 rounded-sm bg-background border-2 border-foreground">
                      {filteredExams.filter(e => getExamStatus(e.notas) === col.id).length}
                    </span>
                  </div>
                  
                  <div className="flex-1 space-y-3 min-h-[100px] p-1">
                    {filteredExams
                      .filter(e => getExamStatus(e.notas) === col.id)
                      .map((exam) => {
                        const daysRemaining = getDaysRemaining(exam.fecha);
                        const isUrgent = daysRemaining <= 3 && col.id !== "done";
                        
                        return (
                          <div 
                            key={exam.id}
                            className={cn(
                              "p-3 rounded-lg border-[3px] border-foreground bg-white text-black flex flex-col gap-2 transition-all hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000] group shadow-[2px_2px_0_0_#000]",
                              isUrgent && "bg-[#FF6B6B]"
                            )}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-bold opacity-70 truncate max-w-[80px]">
                                {exam.subject_nombre || "Sin materia"}
                              </span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                {col.id !== "todo" && (
                                  <button 
                                    onClick={() => updateExamStatus(exam, KANBAN_COLUMNS[KANBAN_COLUMNS.findIndex(c => c.id === col.id) - 1].id)}
                                    className="p-1 rounded hover:bg-black/10 text-black border-2 border-transparent hover:border-black transition-all"
                                    title="Mover a etapa anterior"
                                  >
                                    ⬅️
                                  </button>
                                )}
                                {col.id !== "done" && (
                                  <button 
                                    onClick={() => updateExamStatus(exam, KANBAN_COLUMNS[KANBAN_COLUMNS.findIndex(c => c.id === col.id) + 1].id)}
                                    className="p-1 rounded hover:bg-black/10 text-black border-2 border-transparent hover:border-black transition-all"
                                    title="Mover a siguiente etapa"
                                  >
                                    ➡️
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <h5 className="text-sm font-black uppercase tracking-tight leading-tight line-clamp-2">
                              {exam.titulo}
                            </h5>

                            <div className="flex items-center justify-between text-[10px] mt-1">
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3 opacity-60" />
                                {new Date(exam.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                              </span>
                              <span className={cn(
                                "font-black uppercase tracking-widest text-[9px] px-1.5 py-0.5 rounded-sm border-2 border-black bg-white",
                                isUrgent && "bg-black text-white"
                              )}>
                                {daysRemaining === 0 ? "¡Hoy!" : `Faltan ${daysRemaining}d`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

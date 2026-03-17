import { useMemo, useState, useEffect } from "react";
import { useCalendarEvents, CalendarEvent } from "@/hooks/useCalendarEvents";
import { useSubjects, Subject } from "@/hooks/useSubjects";
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
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

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
  P1: "bg-neon-cyan/20 border-neon-cyan text-neon-cyan",
  P2: "bg-neon-purple/20 border-neon-purple text-neon-purple",
  Global: "bg-neon-gold/20 border-neon-gold text-neon-gold",
  "Recuperatorio P1": "bg-red-500/20 border-red-500 text-red-400",
  "Recuperatorio P2": "bg-red-500/20 border-red-500 text-red-400",
  "Recuperatorio Global": "bg-red-500/20 border-red-500 text-red-400",
  Final: "bg-neon-green/20 border-neon-green text-neon-green",
};

type KanbanStatus = "pending" | "studying" | "ready" | "done";

const KANBAN_COLUMNS: { id: KanbanStatus; label: string; icon: any; color: string }[] = [
  { id: "pending", label: "Pendiente", icon: Timer, color: "text-muted-foreground" },
  { id: "studying", label: "En Estudio", icon: BookOpen, color: "text-neon-cyan" },
  { id: "ready", label: "Listo para rendir", icon: AlertCircle, color: "text-neon-gold" },
  { id: "done", label: "Rendido", icon: CheckCircle2, color: "text-neon-green" },
];

export default function Exams() {
  const { events, loading, updateEvent } = useCalendarEvents();
  const { rawSubjects: subjects } = useSubjects();
  
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  const subjectMap = useMemo(() => {
    const map = new Map<string, Subject>();
    subjects.forEach(s => map.set(s.id, s));
    return map;
  }, [subjects]);

  const upcomingExams = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events
      .filter((e) => {
        if (!EXAM_TYPES.includes(e.tipo_examen)) return false;
        
        const eventDate = new Date(e.fecha);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() >= today.getTime();
      })
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [events]);

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

  // Resetea la materia seleccionada si cambiamos de año
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
    newNotas = newNotas.replace(/\[status:\w+\]/g, "").trim();
    newNotas = `${newNotas} [status:${newStatus}]`.trim();

    try {
      await updateEvent(exam.id, { notas: newNotas });
      toast.success(`Examen movido a ${KANBAN_COLUMNS.find(c => c.id === newStatus)?.label}`);
    } catch (error) {
      toast.error("Error al actualizar el estado del examen");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Timer className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando exámenes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/calendario">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold font-display gradient-text flex items-center gap-2">
              <GraduationCap className="w-8 h-8 text-red-500" />
              Gestión de Exámenes
            </h1>
            <p className="text-muted-foreground mt-1">
              Organiza tu estudio y sigue tu progreso en las evaluaciones
            </p>
          </div>
        </div>

        <div className="flex p-1 bg-secondary/50 rounded-lg border border-border self-start md:self-center">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all",
              viewMode === "list" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ListIcon className="w-4 h-4" />
            Lista
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all",
              viewMode === "kanban" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutPanelLeft className="w-4 h-4" />
            Kanban 📋
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-4 rounded-xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-2 text-muted-foreground min-w-fit">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filtrar:</span>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">Todos los años</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}° Año</option>
            ))}
          </select>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm flex-1 md:flex-none md:min-w-[240px] focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">Todas las materias</option>
            {availableSubjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {filteredExams.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl bg-secondary/10">
            <GraduationCap className="w-16 h-16 mb-4 opacity-10" />
            <p className="font-medium text-xl">No se encontraron exámenes</p>
            <p className="text-sm mt-2 max-w-md mx-auto">
              Asegúrate de tener eventos de tipo Parcial, Final o Global creados en tu calendario para verlos aquí.
            </p>
            <Link to="/calendario" className="mt-6">
              <Button variant="outline">Ir al Calendario</Button>
            </Link>
          </div>
        ) : viewMode === "list" ? (
          <div className="grid gap-4">
            {filteredExams.map((exam) => {
              const daysRemaining = getDaysRemaining(exam.fecha);
              const isUrgent = daysRemaining <= 3;
              const isToday = daysRemaining === 0;

              return (
                <div 
                  key={exam.id}
                  className="card-gamer p-5 rounded-xl transition-all hover:scale-[1.005] hover:shadow-lg flex flex-col md:flex-row gap-6 items-start md:items-center justify-between group"
                  style={exam.color ? { borderColor: `${exam.color}40` } : {}}
                >
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span 
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          !exam.color && eventTypeColors[exam.tipo_examen]
                        )}
                        style={exam.color ? { backgroundColor: `${exam.color}20`, borderColor: exam.color, color: exam.color } : undefined}
                      >
                        {exam.tipo_examen}
                      </span>
                      {exam.subject_nombre && (
                        <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 px-2">
                          📚 {exam.subject_nombre}
                        </span>
                      )}
                    </div>
                    
                    <h4 className="text-xl font-bold group-hover:text-primary transition-colors" style={exam.color ? { color: exam.color } : {}}>
                      {exam.titulo}
                    </h4>
                    
                    {exam.notas && (
                      <p className="text-sm text-muted-foreground italic line-clamp-2 max-w-2xl">
                        {exam.notas.replace(/\[status:\w+\]/g, "").trim()}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between min-w-[180px] w-full md:w-auto gap-4 pl-0 md:pl-8 md:border-l border-border/50">
                    <div className="text-right">
                      <span className="text-sm font-bold flex items-center gap-2 md:justify-end">
                        <CalendarIcon className="w-4 h-4 text-primary" />
                        {new Date(exam.fecha).toLocaleDateString('es-AR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </span>
                      {exam.hora && (
                        <span className="text-xs text-muted-foreground flex items-center gap-2 mt-1 md:justify-end">
                          <Clock className="w-3.5 h-3.5" />
                          {exam.hora} hs
                        </span>
                      )}
                    </div>

                    <div className={cn(
                      "flex items-center gap-2 text-sm font-black px-4 py-2 rounded-xl",
                      isToday 
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/20 animate-pulse" 
                        : isUrgent 
                          ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                          : "bg-primary/10 text-primary border border-primary/20"
                    )}>
                      {isToday ? (
                        <>
                          <AlertCircle className="w-4 h-4" />
                          <span>¡RINDES HOY!</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {KANBAN_COLUMNS.map((col) => (
              <div key={col.id} className="flex flex-col gap-4 bg-secondary/20 p-3 rounded-2xl border border-border/50 h-full min-h-[500px]">
                <div className="flex items-center justify-between px-2 py-1">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-lg bg-background border border-border", col.color)}>
                      <col.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold">{col.label}</span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-background border border-border text-muted-foreground">
                    {filteredExams.filter(e => getExamStatus(e.notas) === col.id).length}
                  </span>
                </div>
                
                <div className="space-y-4">
                  {filteredExams
                    .filter(e => getExamStatus(e.notas) === col.id)
                    .map((exam) => {
                      const daysRemaining = getDaysRemaining(exam.fecha);
                      const isUrgent = daysRemaining <= 3 && col.id !== "done";
                      
                      return (
                        <div 
                          key={exam.id}
                          className={cn(
                            "card-gamer p-4 rounded-xl border-2 flex flex-col gap-3 transition-all hover:scale-[1.02] hover:shadow-xl group",
                            isUrgent ? "border-red-500/30 bg-red-500/5 shadow-red-500/5" : "border-transparent bg-card shadow-sm"
                          )}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[10px] font-black tracking-tighter opacity-70 uppercase truncate">
                              {exam.subject_nombre || "General"}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              {col.id !== "pending" && (
                                <button 
                                  onClick={() => updateExamStatus(exam, KANBAN_COLUMNS[KANBAN_COLUMNS.findIndex(c => c.id === col.id) - 1].id)}
                                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-secondary border border-border text-[10px]"
                                  title="Anterior"
                                >
                                  ⬅️
                                </button>
                              )}
                              {col.id !== "done" && (
                                <button 
                                  onClick={() => updateExamStatus(exam, KANBAN_COLUMNS[KANBAN_COLUMNS.findIndex(c => c.id === col.id) + 1].id)}
                                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-primary/20 border border-primary/30 text-[10px]"
                                  title="Siguiente"
                                >
                                  ➡️
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <h5 className="text-sm font-bold leading-tight line-clamp-2 min-h-[2.5rem]">
                            {exam.titulo}
                          </h5>

                          <div className="flex items-center justify-between pt-2 border-t border-border/30">
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon className="w-3 h-3 text-primary opacity-70" />
                              <span className="text-[10px] font-medium">
                                {new Date(exam.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                            <span className={cn(
                              "text-[10px] font-black",
                              isUrgent ? "text-red-500" : "text-muted-foreground"
                            )}>
                              {daysRemaining === 0 ? "¡HOY!" : `FALTAN ${daysRemaining}D`}
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
    </div>
  );
}

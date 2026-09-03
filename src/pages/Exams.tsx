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
  P1: "bg-[#25d06c] border-foreground text-black font-bold",
  P2: "bg-[#1475e5] border-foreground text-white font-bold",
  Global: "bg-[#ffd21c] border-foreground text-black font-bold",
  "Recuperatorio P1": "bg-[#ff4e4e] border-foreground text-white font-bold",
  "Recuperatorio P2": "bg-[#ff4e4e] border-foreground text-white font-bold",
  "Recuperatorio Global": "bg-[#ff4e4e] border-foreground text-white font-bold",
  Final: "bg-[#805ad5] border-foreground text-white font-bold",
};

type KanbanStatus = "pending" | "studying" | "ready" | "done";

const KANBAN_COLUMNS: { id: KanbanStatus; label: string; icon: any; color: string }[] = [
  { id: "pending", label: "Pendiente", icon: Timer, color: "bg-muted text-muted-foreground" },
  { id: "studying", label: "En Estudio", icon: BookOpen, color: "bg-[#1475e5] text-white" },
  { id: "ready", label: "Listo para rendir", icon: AlertCircle, color: "bg-[#ffd21c] text-black" },
  { id: "done", label: "Rendido", icon: CheckCircle2, color: "bg-[#25d06c] text-black" },
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
        const isExam = e.tipo_examen.startsWith("P") || 
                       e.tipo_examen.includes("Global") || 
                       e.tipo_examen.includes("Final") ||
                       e.tipo_examen.includes("Recuperatorio");
        
        if (!isExam) return false;
        
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
          <Timer className="w-12 h-12 animate-spin text-foreground" />
          <p className="text-foreground font-black uppercase tracking-widest">Cargando exámenes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tabe-page p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border-[3px] border-foreground p-5 rounded-xl shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff]">
        <div className="flex items-center gap-4">
          <Link to="/calendario">
            <Button variant="outline" size="icon" className="border-foreground shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff]">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-black font-display uppercase tracking-widest flex items-center gap-2">
              <GraduationCap className="w-8 h-8 text-[#ff4e4e]" />
              Gestión de Exámenes
            </h1>
            <p className="text-muted-foreground font-bold uppercase tracking-wider text-xs mt-1">
              Organiza tu estudio y sigue tu progreso
            </p>
          </div>
        </div>

        <div className="flex bg-background border-[3px] border-foreground rounded-xl overflow-hidden self-start md:self-center shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff]">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "px-5 py-2.5 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all",
              viewMode === "list" ? "bg-foreground text-background" : "hover:bg-foreground/10 text-foreground"
            )}
          >
            <ListIcon className="w-4 h-4" />
            Lista
          </button>
          <div className="w-[3px] bg-foreground" />
          <button
            onClick={() => setViewMode("kanban")}
            className={cn(
              "px-5 py-2.5 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all",
              viewMode === "kanban" ? "bg-foreground text-background" : "hover:bg-foreground/10 text-foreground"
            )}
          >
            <LayoutPanelLeft className="w-4 h-4" />
            Kanban
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-4 rounded-xl bg-card border-[3px] border-foreground shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff]">
        <div className="flex items-center gap-2 text-foreground min-w-fit">
          <Filter className="w-5 h-5" />
          <span className="text-sm font-black uppercase tracking-widest">Filtrar:</span>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-background border-[3px] border-foreground rounded-lg px-4 py-2 font-bold text-sm min-w-[140px] focus:outline-none focus:translate-y-0.5 focus:shadow-none shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff] transition-all"
          >
            <option value="all">TODOS LOS AÑOS</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}° AÑO</option>
            ))}
          </select>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-background border-[3px] border-foreground rounded-lg px-4 py-2 font-bold text-sm flex-1 md:flex-none md:min-w-[240px] focus:outline-none focus:translate-y-0.5 focus:shadow-none shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff] transition-all"
          >
            <option value="all">TODAS LAS MATERIAS</option>
            {availableSubjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {filteredExams.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center text-foreground border-[3px] border-dashed border-foreground/30 rounded-2xl bg-card">
            <GraduationCap className="w-16 h-16 mb-4 opacity-50" />
            <p className="font-display font-black text-xl tracking-wide">No hay exámenes a la vista</p>
            <p className="font-medium mt-2 max-w-md mx-auto opacity-70">
              Asegúrate de tener eventos de tipo Parcial, Final o Global creados en tu calendario.
            </p>
            <Link to="/calendario" className="mt-8">
              <Button variant="default">Ir al Calendario</Button>
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
                  className="bg-card p-5 rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] dark:hover:shadow-[6px_6px_0_0_#fff] flex flex-col md:flex-row gap-6 items-start md:items-center justify-between group"
                  style={exam.color ? { backgroundColor: `${exam.color}` } : {}}
                >
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span 
                        className={cn(
                          "px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-widest border-2",
                          !exam.color && (eventTypeColors[exam.tipo_examen] || (exam.tipo_examen.startsWith("P") ? eventTypeColors["P1"] : "bg-muted text-foreground border-foreground"))
                        )}
                        style={exam.color ? { backgroundColor: `rgba(255,255,255,0.2)`, borderColor: "var(--foreground)", color: "#000" } : undefined}
                      >
                        {exam.tipo_examen}
                      </span>
                      {exam.subject_nombre && (
                        <span className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1.5 px-2 bg-background/50 py-1 rounded-sm border-2 border-foreground/20">
                          📚 {exam.subject_nombre}
                        </span>
                      )}
                    </div>
                    
                    <h4 className="text-xl font-display font-black tracking-wide leading-tight group-hover:text-foreground/80 transition-colors">
                      {exam.titulo}
                    </h4>
                    
                    {exam.notas && (
                      <p className="text-sm font-bold bg-background/30 p-2 rounded-lg italic line-clamp-2 max-w-2xl border-2 border-foreground/10">
                        {exam.notas.replace(/\[status:\w+\]/g, "").trim()}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between min-w-[180px] w-full md:w-auto gap-4 pl-0 md:pl-8 md:border-l-[3px] border-foreground/20">
                    <div className="text-right">
                      <span className="text-sm font-black uppercase tracking-widest flex items-center gap-2 md:justify-end">
                        <CalendarIcon className="w-5 h-5 text-foreground" />
                        {new Date(exam.fecha).toLocaleDateString('es-AR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </span>
                      {exam.hora && (
                        <span className="text-xs font-bold flex items-center gap-2 mt-1 md:justify-end opacity-80">
                          <Clock className="w-4 h-4" />
                          {exam.hora} hs
                        </span>
                      )}
                    </div>

                    <div className={cn(
                      "flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border-[3px] shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff]",
                      isToday 
                        ? "bg-[#ff4e4e] text-white border-foreground animate-pulse" 
                        : isUrgent 
                          ? "bg-[#ff4e4e]/20 text-[#ff4e4e] border-[#ff4e4e]" 
                          : "bg-background text-foreground border-foreground"
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
              <div key={col.id} className="flex flex-col gap-4 bg-card border-[3px] border-foreground p-3 rounded-xl shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff] h-full min-h-[500px]">
                <div className="flex items-center justify-between px-2 py-1 border-b-[3px] border-foreground/10 pb-4">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-2 rounded-lg border-[3px] border-foreground shadow-[2px_2px_0_0_#000]", col.color)}>
                      <col.icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest leading-none mt-1">{col.label}</span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-sm bg-foreground text-background">
                    {filteredExams.filter(e => getExamStatus(e.notas) === col.id).length}
                  </span>
                </div>
                
                <div className="space-y-4 pt-2">
                  {filteredExams
                    .filter(e => getExamStatus(e.notas) === col.id)
                    .map((exam) => {
                      const daysRemaining = getDaysRemaining(exam.fecha);
                      const isUrgent = daysRemaining <= 3 && col.id !== "done";
                      
                      return (
                        <div 
                          key={exam.id}
                          className={cn(
                            "bg-background p-4 rounded-xl border-[3px] flex flex-col gap-3 transition-all hover:-translate-y-1 group relative",
                            isUrgent ? "border-[#ff4e4e] shadow-[4px_4px_0_0_#ff4e4e]" : "border-foreground shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff]"
                          )}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[9px] font-black tracking-widest opacity-80 uppercase truncate bg-foreground/10 px-2 py-0.5 rounded-sm">
                              {exam.subject_nombre || "General"}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all absolute top-2 right-2">
                              {col.id !== "pending" && (
                                <button 
                                  onClick={() => updateExamStatus(exam, KANBAN_COLUMNS[KANBAN_COLUMNS.findIndex(c => c.id === col.id) - 1].id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-md bg-background border-[2px] border-foreground shadow-[2px_2px_0_0_#000] hover:translate-y-0.5 hover:shadow-none text-[12px] font-bold"
                                  title="Mover anterior"
                                >
                                  ⬅
                                </button>
                              )}
                              {col.id !== "done" && (
                                <button 
                                  onClick={() => updateExamStatus(exam, KANBAN_COLUMNS[KANBAN_COLUMNS.findIndex(c => c.id === col.id) + 1].id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-md bg-foreground text-background border-[2px] border-foreground shadow-[2px_2px_0_0_#000] hover:translate-y-0.5 hover:shadow-none text-[12px] font-bold"
                                  title="Mover siguiente"
                                >
                                  ➡
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <h5 className="text-sm font-display font-black leading-tight line-clamp-2 min-h-[2.5rem]">
                            {exam.titulo}
                          </h5>

                          <div className="flex items-center justify-between pt-3 border-t-[3px] border-foreground/10">
                            <div className="flex items-center gap-1.5 font-bold">
                              <CalendarIcon className="w-3.5 h-3.5 opacity-80" />
                              <span className="text-[10px] uppercase">
                                {new Date(exam.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm border-2",
                              isUrgent ? "bg-[#ff4e4e] text-white border-transparent" : "border-foreground"
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

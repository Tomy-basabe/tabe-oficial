import { StudyTask, TaskStatus } from "@/types/tasks";
import { Clock, Calendar, CheckCircle2, ArrowRight, ArrowLeft, Trash2, Edit2, Timer, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface TaskCardProps {
  task: StudyTask;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onEdit: (task: StudyTask) => void;
  onDelete: (taskId: string) => void;
}

const PRIORITY_CONFIG = {
  baja: { label: "Baja", bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-400" },
  media: { label: "Media", bg: "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-400" },
  alta: { label: "Alta", bg: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-400" },
};

export function TaskCard({ task, onStatusChange, onEdit, onDelete }: TaskCardProps) {
  const navigate = useNavigate();
  const priority = PRIORITY_CONFIG[task.prioridad] || PRIORITY_CONFIG.media;

  // Due date calculations
  const isOverdue = task.fecha_limite && new Date(task.fecha_limite + "T23:59:59") < new Date() && task.estado !== "done";
  const formattedDueDate = task.fecha_limite ? new Date(task.fecha_limite + "T12:00:00").toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short"
  }) : null;

  const handleStartPomodoro = (e: React.MouseEvent) => {
    e.stopPropagation();
    const query = new URLSearchParams();
    if (task.subject_id) query.set("subject", task.subject_id);
    navigate(`/pomodoro?${query.toString()}`);
  };

  return (
    <div className={cn(
      "bg-card border-2 border-foreground rounded-xl p-4 shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:translate-y-[-2px] transition-all space-y-3 relative group",
      task.estado === "done" && "opacity-75 bg-muted/30"
    )}>
      {/* Top Header: Subject Badge & Priority */}
      <div className="flex items-center justify-between gap-2">
        {task.subjects ? (
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#00E5FF] text-black border border-foreground truncate max-w-[150px]">
            {task.subjects.codigo || task.subjects.nombre}
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-foreground/30">
            General
          </span>
        )}

        <div className="flex items-center gap-1.5">
          <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded border", priority.bg)}>
            {priority.label}
          </span>
        </div>
      </div>

      {/* Title & Description */}
      <div>
        <h4 className={cn(
          "font-black text-sm text-foreground leading-snug",
          task.estado === "done" && "line-through text-muted-foreground"
        )}>
          {task.titulo}
        </h4>
        {task.descripcion && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-medium">
            {task.descripcion}
          </p>
        )}
      </div>

      {/* Meta details: Due Date & Pomodoro target */}
      <div className="flex items-center justify-between text-[11px] font-bold pt-2 border-t border-border/60">
        {/* Due Date */}
        {formattedDueDate ? (
          <div className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded",
            isOverdue ? "text-red-500 bg-red-500/10 font-black animate-pulse" : "text-muted-foreground"
          )}>
            <Calendar className="w-3.5 h-3.5" />
            <span>{formattedDueDate}</span>
            {isOverdue && <AlertCircle className="w-3 h-3 text-red-500" />}
          </div>
        ) : (
          <div className="text-muted-foreground/60 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Sin fecha</span>
          </div>
        )}

        {/* Pomodoros counter */}
        <div className="flex items-center gap-1 text-muted-foreground" title="Pomodoros completados / estimados">
          <Timer className="w-3.5 h-3.5 text-[#ff4747]" />
          <span>{task.pomodoros_completados}/{task.pomodoros_estimados}</span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between gap-1 pt-1">
        <div className="flex items-center gap-1">
          {/* Study with Pomodoro button */}
          <button
            onClick={handleStartPomodoro}
            className="p-1.5 rounded-lg bg-[#ff4747] text-black border border-foreground shadow-[1px_1px_0_0_#000] hover:translate-y-[-1px] transition-all"
            title="Estudiar esta tarea con Pomodoro"
          >
            <Timer className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onEdit(task)}
            className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground border border-foreground shadow-[1px_1px_0_0_#000] hover:translate-y-[-1px] transition-all"
            title="Editar tarea"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 rounded-lg bg-muted hover:bg-red-500/20 text-muted-foreground hover:text-red-500 border border-foreground/30 hover:border-red-500 transition-all"
            title="Eliminar tarea"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status transition controls */}
        <div className="flex items-center gap-1">
          {task.estado === "todo" && (
            <button
              onClick={() => onStatusChange(task.id, "in_progress")}
              className="px-2 py-1 rounded-lg bg-[#FFE600] text-black font-black text-[10px] uppercase border border-foreground shadow-[1px_1px_0_0_#000] flex items-center gap-1 hover:translate-y-[-1px] transition-all"
            >
              <span>Empezar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {task.estado === "in_progress" && (
            <>
              <button
                onClick={() => onStatusChange(task.id, "todo")}
                className="p-1 rounded-lg bg-muted text-foreground border border-foreground/40 text-[10px]"
                title="Volver a Por Hacer"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => onStatusChange(task.id, "done")}
                className="px-2 py-1 rounded-lg bg-[#00FF9D] text-black font-black text-[10px] uppercase border border-foreground shadow-[1px_1px_0_0_#000] flex items-center gap-1 hover:translate-y-[-1px] transition-all"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Completar</span>
              </button>
            </>
          )}

          {task.estado === "done" && (
            <button
              onClick={() => onStatusChange(task.id, "in_progress")}
              className="px-2 py-1 rounded-lg bg-muted text-muted-foreground font-bold text-[10px] uppercase border border-foreground/40 hover:bg-muted/80 flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Reabrir</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

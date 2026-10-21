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
  baja: {
    label: "Baja",
    badge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-700/60",
  },
  media: {
    label: "Media",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/50",
  },
  alta: {
    label: "Alta",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/50",
  },
};

export function TaskCard({ task, onStatusChange, onEdit, onDelete }: TaskCardProps) {
  const navigate = useNavigate();
  const priority = PRIORITY_CONFIG[task.prioridad] || PRIORITY_CONFIG.media;

  // Due date calculations
  const isOverdue =
    task.fecha_limite &&
    new Date(task.fecha_limite + "T23:59:59") < new Date() &&
    task.estado !== "done";

  const formattedDueDate = task.fecha_limite
    ? new Date(task.fecha_limite + "T12:00:00").toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
      })
    : null;

  const handleStartPomodoro = (e: React.MouseEvent) => {
    e.stopPropagation();
    const query = new URLSearchParams();
    if (task.subject_id) query.set("subject", task.subject_id);
    navigate(`/pomodoro?${query.toString()}`);
  };

  return (
    <div
      onClick={() => onEdit(task)}
      className={cn(
        "group relative rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#212121] p-3.5 space-y-2.5 transition-all duration-150 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-2xs cursor-pointer select-none",
        task.estado === "done" && "opacity-60 bg-zinc-50/50 dark:bg-zinc-900/30"
      )}
    >
      {/* Top Header: Subject Badge & Priority */}
      <div className="flex items-center justify-between gap-2">
        {task.subjects ? (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 truncate max-w-[160px]">
            {task.subjects.codigo || task.subjects.nombre}
          </span>
        ) : (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/40">
            General
          </span>
        )}

        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-md border", priority.badge)}>
          {priority.label}
        </span>
      </div>

      {/* Title & Description */}
      <div>
        <h4
          className={cn(
            "text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug group-hover:text-primary transition-colors",
            task.estado === "done" && "line-through text-zinc-400 dark:text-zinc-500"
          )}
        >
          {task.titulo}
        </h4>
        {task.descripcion && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed font-normal">
            {task.descripcion}
          </p>
        )}
      </div>

      {/* Meta details: Due Date & Pomodoro target */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
        {/* Due Date */}
        {formattedDueDate ? (
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs font-normal",
              isOverdue
                ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded-md font-medium"
                : "text-zinc-500 dark:text-zinc-400"
            )}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{formattedDueDate}</span>
            {isOverdue && <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />}
          </div>
        ) : (
          <div className="text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5 text-xs font-normal">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Sin fecha</span>
          </div>
        )}

        {/* Pomodoros counter */}
        <div
          className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 text-xs font-normal"
          title="Pomodoros completados / estimados"
        >
          <Timer className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span>
            {task.pomodoros_completados}/{task.pomodoros_estimados}
          </span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center justify-between gap-1 pt-1 border-t border-zinc-100/60 dark:border-zinc-800/40">
        <div className="flex items-center gap-1">
          {/* Study with Pomodoro button */}
          <button
            onClick={handleStartPomodoro}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="Estudiar esta tarea con Pomodoro"
          >
            <Timer className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Editar tarea"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="Eliminar tarea"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status transition controls */}
        <div className="flex items-center gap-1">
          {task.estado === "todo" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(task.id, "in_progress");
              }}
              className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Empezar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {task.estado === "in_progress" && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, "todo");
                }}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Volver a Por Hacer"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, "done");
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/60 dark:border-emerald-800/50 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Completar</span>
              </button>
            </>
          )}

          {task.estado === "done" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(task.id, "in_progress");
              }}
              className="px-2 py-1 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
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

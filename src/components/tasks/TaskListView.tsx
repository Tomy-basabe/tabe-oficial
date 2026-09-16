import { StudyTask, TaskStatus } from "@/types/tasks";
import { CheckCircle2, Circle, Clock, Calendar, Timer, Edit2, Trash2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface TaskListViewProps {
  tasks: StudyTask[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onEdit: (task: StudyTask) => void;
  onDelete: (taskId: string) => void;
}

const PRIORITY_BADGES = {
  baja: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-400",
  media: "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-400",
  alta: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-400",
};

export function TaskListView({
  tasks,
  onStatusChange,
  onEdit,
  onDelete,
}: TaskListViewProps) {
  const navigate = useNavigate();

  if (tasks.length === 0) {
    return (
      <div className="bg-card border-4 border-foreground rounded-2xl p-12 text-center shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-3">
        <p className="font-black uppercase text-base text-foreground">
          No hay tareas en esta vista
        </p>
        <p className="text-xs text-muted-foreground font-bold">
          Creá una tarea o cambiá los filtros para comenzar a organizar tu estudio.
        </p>
      </div>
    );
  }

  const handleStartPomodoro = (task: StudyTask) => {
    const query = new URLSearchParams();
    if (task.subject_id) query.set("subject", task.subject_id);
    navigate(`/pomodoro?${query.toString()}`);
  };

  return (
    <div className="bg-card border-4 border-foreground rounded-2xl p-4 sm:p-6 shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-3 overflow-x-auto">
      <div className="min-w-[600px] space-y-2">
        {tasks.map((task) => {
          const isDone = task.estado === "done";
          const formattedDueDate = task.fecha_limite
            ? new Date(task.fecha_limite + "T12:00:00").toLocaleDateString("es-AR", {
                day: "numeric",
                month: "short",
              })
            : null;

          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] transition-all bg-background",
                isDone && "opacity-70 bg-muted/30"
              )}
            >
              {/* Left: Checkbox + Title + Subject */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => onStatusChange(task.id, isDone ? "todo" : "done")}
                  className="p-1 text-foreground hover:scale-110 transition-transform shrink-0"
                  title={isDone ? "Marcar como pendiente" : "Marcar como completada"}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-[#00FF9D] fill-[#00FF9D] text-black stroke-[2.5]" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground hover:text-foreground stroke-[2]" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "font-black text-sm text-foreground",
                        isDone && "line-through text-muted-foreground"
                      )}
                    >
                      {task.titulo}
                    </span>

                    {task.subjects && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#00E5FF] text-black border border-foreground shrink-0">
                        {task.subjects.codigo || task.subjects.nombre}
                      </span>
                    )}

                    <span
                      className={cn(
                        "text-[9px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0",
                        PRIORITY_BADGES[task.prioridad]
                      )}
                    >
                      {task.prioridad}
                    </span>
                  </div>

                  {task.descripcion && (
                    <p className="text-xs text-muted-foreground font-medium truncate mt-0.5">
                      {task.descripcion}
                    </p>
                  )}
                </div>
              </div>

              {/* Middle: Due Date & Pomodoros */}
              <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                {formattedDueDate ? (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {formattedDueDate}
                  </span>
                ) : (
                  <span className="text-muted-foreground/40 text-[11px]">-</span>
                )}

                <div className="flex items-center gap-1 text-muted-foreground" title="Pomodoros completados / estimados">
                  <Timer className="w-3.5 h-3.5 text-[#ff4747]" />
                  <span>{task.pomodoros_completados}/{task.pomodoros_estimados}</span>
                </div>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleStartPomodoro(task)}
                  className="p-2 rounded-lg bg-[#ff4747] text-black border border-foreground shadow-[1px_1px_0_0_#000] hover:translate-y-[-1px] transition-all"
                  title="Estudiar con Pomodoro"
                >
                  <Timer className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onEdit(task)}
                  className="p-2 rounded-lg bg-muted text-foreground border border-foreground shadow-[1px_1px_0_0_#000] hover:translate-y-[-1px] transition-all"
                  title="Editar tarea"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onDelete(task.id)}
                  className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-red-500 border border-foreground/40 hover:border-red-500 transition-all"
                  title="Eliminar tarea"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

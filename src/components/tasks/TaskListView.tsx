import { StudyTask, TaskStatus } from "@/types/tasks";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Clock, Calendar, Timer, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface TaskListViewProps {
  tasks: StudyTask[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onEdit: (task: StudyTask) => void;
  onDelete: (taskId: string) => void;
}

const PRIORITY_BADGES = {
  baja: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-700/60",
  media: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/50",
  alta: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/50",
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
      <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-12 text-center shadow-2xs space-y-2">
        <p className="font-medium text-sm text-zinc-800 dark:text-zinc-200">
          No hay tareas en esta vista
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-normal">
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
    <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs">
      <motion.div layout className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => {
            const isDone = task.estado === "done";
            const formattedDueDate = task.fecha_limite
              ? new Date(task.fecha_limite + "T12:00:00").toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "short",
                })
              : null;

            return (
              <motion.div
                layout
                key={task.id}
                initial={{ opacity: 0, scale: 0.94, y: 8, filter: "blur(3px)" }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                exit={{
                  opacity: 0,
                  scale: 0.9,
                  y: -8,
                  filter: "blur(4px)",
                  transition: { duration: 0.18, ease: [0.32, 0, 0.67, 0] },
                }}
                transition={{
                  layout: { type: "spring", stiffness: 360, damping: 28, mass: 0.72 },
                  duration: 0.22,
                }}
                className={cn(
                  "group flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors",
                  isDone && "bg-zinc-50/40 dark:bg-zinc-900/20 opacity-60"
                )}
              >
              {/* Left: Checkbox + Title + Subject */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => onStatusChange(task.id, isDone ? "todo" : "done")}
                  className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors shrink-0 cursor-pointer"
                  title={isDone ? "Marcar como pendiente" : "Marcar como completada"}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/40" />
                  ) : (
                    <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400" />
                  )}
                </button>

                <div 
                  onClick={() => onEdit(task)} 
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors",
                        isDone && "line-through text-zinc-400 dark:text-zinc-500"
                      )}
                    >
                      {task.titulo}
                    </span>

                    {task.subjects ? (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 shrink-0">
                        {task.subjects.codigo || task.subjects.nombre}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/40 shrink-0">
                        General
                      </span>
                    )}

                    <span
                      className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-md border shrink-0",
                        PRIORITY_BADGES[task.prioridad]
                      )}
                    >
                      {task.prioridad}
                    </span>
                  </div>

                  {task.descripcion && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal truncate mt-0.5">
                      {task.descripcion}
                    </p>
                  )}
                </div>
              </div>

              {/* Middle: Due Date & Pomodoros */}
              <div className="flex items-center gap-4 text-xs font-normal shrink-0">
                {formattedDueDate ? (
                  <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{formattedDueDate}</span>
                  </span>
                ) : (
                  <span className="text-zinc-300 dark:text-zinc-600 text-xs">-</span>
                )}

                <div
                  className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400"
                  title="Pomodoros completados / estimados"
                >
                  <Timer className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>
                    {task.pomodoros_completados}/{task.pomodoros_estimados}
                  </span>
                </div>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleStartPomodoro(task)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Estudiar con Pomodoro"
                >
                  <Timer className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onEdit(task)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Editar tarea"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onDelete(task.id)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Eliminar tarea"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

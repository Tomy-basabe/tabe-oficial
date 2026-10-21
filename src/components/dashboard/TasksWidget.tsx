import { useState, useEffect, useCallback } from "react";
import { CheckSquare, ArrowRight, Clock, Check, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { StudyTask } from "@/types/tasks";
import { fetchUserTasks, updateTaskStatus } from "@/services/taskService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, isToday, isTomorrow } from "date-fns";
import { es } from "date-fns/locale";

const priorityConfig = {
  alta: {
    label: "Alta",
    badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60",
  },
  media: {
    label: "Media",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60",
  },
  baja: {
    label: "Baja",
    badgeClass: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60",
  },
};

export function TasksWidget() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  const loadTasks = useCallback(async () => {
    try {
      const all = await fetchUserTasks(user?.id || "guest");
      // Filter pending tasks (todo & in_progress)
      const pending = all.filter((t) => t.estado !== "done");
      setTasks(pending);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleToggleDone = async (e: React.MouseEvent, task: StudyTask) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic completion animation
    setCompletingIds((prev) => new Set(prev).add(task.id));

    setTimeout(async () => {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });

      const ok = await updateTaskStatus(task.id, "done");
      if (ok) {
        toast.success(`Tarea completada: "${task.titulo}"`, {
          icon: "✅",
        });
      }
    }, 280);
  };

  const formatDueDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      if (isToday(d)) return "Hoy";
      if (isTomorrow(d)) return "Mañana";
      return format(d, "d MMM", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const displayedTasks = tasks.slice(0, 4);

  return (
    <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
            <CheckSquare className="w-4 h-4" />
          </div>
          <h2 className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">Tus Tareas</h2>
          {tasks.length > 0 && (
            <span className="text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded-full border border-zinc-200/60 dark:border-zinc-700/60">
              {tasks.length}
            </span>
          )}
        </div>
        <Link
          to="/tareas"
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium flex items-center gap-1 transition-colors"
        >
          Ver todas <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-12 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg animate-pulse" />
          <div className="h-12 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg animate-pulse" />
        </div>
      ) : displayedTasks.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
          <CheckSquare className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
          <p className="text-xs text-zinc-500 font-medium">No hay tareas pendientes</p>
          <Link
            to="/tareas"
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:underline mt-2"
          >
            Nueva tarea <Plus className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedTasks.map((task) => {
            const isCompleting = completingIds.has(task.id);
            const prio = priorityConfig[task.prioridad] || priorityConfig.media;
            const isUrgent =
              task.prioridad === "alta" ||
              (task.fecha_limite ? isToday(new Date(task.fecha_limite + "T00:00:00")) : false);

            return (
              <div
                key={task.id}
                className={cn(
                  "group flex items-center justify-between p-2.5 sm:p-3 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all",
                  isCompleting && "opacity-40 scale-[0.98] transition-all duration-300"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <button
                    type="button"
                    onClick={(e) => handleToggleDone(e, task)}
                    className={cn(
                      "w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 cursor-pointer",
                      isCompleting
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-zinc-300 dark:border-zinc-600 hover:border-emerald-500 dark:hover:border-emerald-400 bg-white dark:bg-zinc-800 text-transparent hover:text-emerald-500/50"
                    )}
                    title="Marcar como completada"
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <Link
                      to="/tareas"
                      className={cn(
                        "block font-medium text-xs text-zinc-900 dark:text-zinc-100 truncate hover:underline",
                        isCompleting && "line-through text-zinc-400 dark:text-zinc-500"
                      )}
                    >
                      {task.titulo}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {task.subjects?.nombre && (
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded border bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60 truncate max-w-[120px]">
                          {task.subjects.nombre}
                        </span>
                      )}
                      {task.fecha_limite && (
                        <span
                          className={cn(
                            "flex items-center gap-1 text-[10px] font-normal",
                            isUrgent ? "text-rose-600 dark:text-rose-400 font-medium" : "text-zinc-400 dark:text-zinc-500"
                          )}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          {formatDueDate(task.fecha_limite)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <span className={cn("text-[10px] font-medium px-1.5 py-0.2 rounded border", prio.badgeClass)}>
                    {prio.label}
                  </span>
                </div>
              </div>
            );
          })}

          <Link
            to="/tareas"
            className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Nueva tarea
          </Link>
        </div>
      )}
    </div>
  );
}

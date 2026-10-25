import { StudyTask, TaskStatus } from "@/types/tasks";
import { motion, AnimatePresence } from "framer-motion";
import { TaskCard } from "./TaskCard";
import { Plus, ListTodo, Zap, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  tasks: StudyTask[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onEdit: (task: StudyTask) => void;
  onDelete: (taskId: string) => void;
  onOpenCreateModal: (defaultStatus?: TaskStatus) => void;
}

interface ColumnConfig {
  status: TaskStatus;
  title: string;
  icon: any;
  dotColor: string;
  badgeStyle: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    status: "todo",
    title: "Por Hacer",
    icon: ListTodo,
    dotColor: "bg-zinc-400 dark:bg-zinc-500",
    badgeStyle: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60",
  },
  {
    status: "in_progress",
    title: "En Progreso",
    icon: Zap,
    dotColor: "bg-blue-500",
    badgeStyle: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/50",
  },
  {
    status: "done",
    title: "Completadas",
    icon: CheckCircle2,
    dotColor: "bg-emerald-500",
    badgeStyle: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/50",
  },
];

export function KanbanBoard({
  tasks,
  onStatusChange,
  onEdit,
  onDelete,
  onOpenCreateModal,
}: KanbanBoardProps) {
  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((t) => t.estado === status);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 items-start">
      {COLUMNS.map((col) => {
        const columnTasks = getTasksByStatus(col.status);
        const Icon = col.icon;

        return (
          <div
            key={col.status}
            className="bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-3.5 space-y-3 min-h-[560px] flex flex-col"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-1 px-1">
              <div className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", col.dotColor)} />
                <h3 className="font-semibold text-xs tracking-wider uppercase text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span>{col.title}</span>
                </h3>
              </div>

              <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", col.badgeStyle)}>
                {columnTasks.length}
              </span>
            </div>

            {/* Tasks Container */}
            <motion.div layout className="flex-1 space-y-2.5 overflow-y-auto">
              {columnTasks.length === 0 ? (
                <div className="border border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-xl p-8 text-center space-y-1.5 my-auto">
                  <p className="font-medium text-xs text-zinc-600 dark:text-zinc-400">
                    Sin tareas
                  </p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-normal">
                    {col.status === "todo"
                      ? "Añade entregas o temas para comenzar a organizarte."
                      : col.status === "in_progress"
                      ? "Arranca una tarea para verla en progreso."
                      : "Las tareas finalizadas se listarán acá."}
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {columnTasks.map((task) => (
                    <motion.div
                      layout
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.88, y: 10, filter: "blur(4px)" }}
                      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                      exit={{
                        opacity: 0,
                        scale: 0.84,
                        y: -8,
                        filter: "blur(5px)",
                        transition: { duration: 0.18, ease: [0.32, 0, 0.67, 0] },
                      }}
                      transition={{
                        layout: { type: "spring", stiffness: 360, damping: 28, mass: 0.72 },
                        duration: 0.22,
                      }}
                    >
                      <TaskCard
                        task={task}
                        onStatusChange={onStatusChange}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </motion.div>

            {/* Quick Add Button per Column (Notion Style) */}
            <button
              onClick={() => onOpenCreateModal(col.status)}
              className="w-full py-2 px-3 rounded-lg text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/60 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir tarea</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

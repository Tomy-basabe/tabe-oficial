import { StudyTask, TaskStatus } from "@/types/tasks";
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
  headerBg: string;
  badgeBg: string;
  accentColor: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    status: "todo",
    title: "Por Hacer",
    icon: ListTodo,
    headerBg: "bg-[#FFE600] text-black",
    badgeBg: "bg-black text-white",
    accentColor: "border-[#FFE600]",
  },
  {
    status: "in_progress",
    title: "En Progreso",
    icon: Zap,
    headerBg: "bg-[#00E5FF] text-black",
    badgeBg: "bg-black text-white",
    accentColor: "border-[#00E5FF]",
  },
  {
    status: "done",
    title: "Completadas",
    icon: CheckCircle2,
    headerBg: "bg-[#00FF9D] text-black",
    badgeBg: "bg-black text-white",
    accentColor: "border-[#00FF9D]",
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-start">
      {COLUMNS.map((col) => {
        const columnTasks = getTasksByStatus(col.status);
        const Icon = col.icon;

        return (
          <div
            key={col.status}
            className="bg-muted/40 border-4 border-foreground rounded-2xl p-4 sm:p-5 shadow-[6px_6px_0_0_hsl(var(--foreground))] space-y-4 min-h-[500px] flex flex-col"
          >
            {/* Column Header */}
            <div className={cn(
              "flex items-center justify-between p-3 rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_#000]",
              col.headerBg
            )}>
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5 stroke-[2.5]" />
                <h3 className="font-black uppercase text-sm tracking-wider">
                  {col.title}
                </h3>
              </div>
              <span className={cn(
                "text-xs font-black px-2.5 py-0.5 rounded-full border border-black shadow-[1px_1px_0_0_#000]",
                col.badgeBg
              )}>
                {columnTasks.length}
              </span>
            </div>

            {/* Tasks Container */}
            <div className="flex-1 space-y-3 overflow-y-auto">
              {columnTasks.length === 0 ? (
                <div className="border-2 border-dashed border-foreground/30 rounded-xl p-8 text-center space-y-2 my-auto">
                  <p className="font-black text-xs uppercase text-muted-foreground">
                    Sin tareas aquí
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {col.status === "todo" 
                      ? "¡Añade entregas o lecturas para organizarte!"
                      : col.status === "in_progress"
                      ? "Pasa una tarea acá cuando comiences a estudiar."
                      : "Las tareas terminadas aparecerán acá."}
                  </p>
                </div>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={onStatusChange}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))
              )}
            </div>

            {/* Quick Add Button per Column */}
            <button
              onClick={() => onOpenCreateModal(col.status)}
              className="w-full py-2.5 px-3 rounded-xl bg-card hover:bg-muted font-black text-xs uppercase text-foreground border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-auto"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Añadir Tarea</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

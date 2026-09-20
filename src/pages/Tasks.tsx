import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { StudyTask, TaskStatus, CreateTaskInput } from "@/types/tasks";
import { 
  fetchUserTasks, 
  createStudyTask, 
  updateStudyTask, 
  deleteStudyTask, 
  updateTaskStatus 
} from "@/services/taskService";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskListView } from "@/components/tasks/TaskListView";
import { TaskModal } from "@/components/tasks/TaskModal";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { 
  CheckSquare, 
  Kanban, 
  ListTodo, 
  Plus, 
  Filter, 
  Search, 
  Timer, 
  Zap, 
  CheckCircle2, 
  Sparkles 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface SubjectOption {
  id: string;
  nombre: string;
  codigo?: string;
  year?: number;
}

export default function Tasks() {
  const { user, isGuest, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Filters
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [defaultStatusForNew, setDefaultStatusForNew] = useState<TaskStatus>("todo");

  // Load data
  useEffect(() => {
    if (authLoading) return;

    let isMounted = true;
    const safetyTimeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 4000);

    const run = async () => {
      setLoading(true);
      try {
        await loadAllData();
      } finally {
        if (isMounted) {
          clearTimeout(safetyTimeout);
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
    };
  }, [user, isGuest, authLoading]);

  const loadAllData = async () => {
    try {
      // 1. Fetch user subjects
      let subData: any[] = [];
      try {
        if (user && !isGuest) {
          const { data } = await supabase
            .from("subjects")
            .select("id, nombre, codigo, año")
            .eq("user_id", user.id)
            .order("nombre", { ascending: true });
          if (data && data.length > 0) subData = data;
        }

        if (subData.length === 0) {
          const { data } = await supabase
            .from("subjects")
            .select("id, nombre, codigo, año")
            .is("user_id", null)
            .order("nombre", { ascending: true });
          if (data) subData = data;
        }
      } catch (err) {
        console.warn("Could not load subjects for tasks:", err);
      }

      setSubjects(
        (subData || []).map((s: any) => ({
          id: s.id,
          nombre: s.nombre,
          codigo: s.codigo,
          year: s.año,
        }))
      );

      // 2. Fetch tasks
      const effectiveUserId = user?.id || "guest";
      const userTasks = await fetchUserTasks(effectiveUserId);
      setTasks(userTasks);
    } catch (e) {
      console.error("Error loading tasks page:", e);
    }
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSubject =
        selectedSubjectFilter === "all" || t.subject_id === selectedSubjectFilter;
      const matchSearch =
        searchQuery === "" ||
        t.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.descripcion && t.descripcion.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.subjects && t.subjects.nombre.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSubject && matchSearch;
    });
  }, [tasks, selectedSubjectFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.estado === "todo").length;
    const inProgress = tasks.filter((t) => t.estado === "in_progress").length;
    const done = tasks.filter((t) => t.estado === "done").length;
    const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, todo, inProgress, done, progressPercent };
  }, [tasks]);

  // Handlers
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, estado: newStatus } : t))
    );
    const ok = await updateTaskStatus(taskId, newStatus);
    if (ok) {
      toast.success(
        newStatus === "done"
          ? "¡Tarea completada! 🎉"
          : newStatus === "in_progress"
          ? "Tarea en progreso ⚡"
          : "Tarea movida a Por Hacer 📌"
      );
    } else {
      toast.error("No se pudo actualizar el estado de la tarea");
      // Revert on error
      const effectiveUserId = user?.id || "guest";
      const fresh = await fetchUserTasks(effectiveUserId);
      setTasks(fresh);
    }
  };

  const handleOpenCreateModal = (defaultStatus: TaskStatus = "todo") => {
    setEditingTask(null);
    setDefaultStatusForNew(defaultStatus);
    setIsModalOpen(true);
  };

  const handleEdit = (task: StudyTask) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("¿Eliminar esta tarea de estudio?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    const ok = await deleteStudyTask(taskId);
    if (ok) {
      toast.success("Tarea eliminada");
    } else {
      toast.error("Error al eliminar la tarea");
      const effectiveUserId = user?.id || "guest";
      const fresh = await fetchUserTasks(effectiveUserId);
      setTasks(fresh);
    }
  };

  const handleSaveTask = async (taskData: CreateTaskInput) => {
    const effectiveUserId = user?.id || "guest";
    if (editingTask) {
      const ok = await updateStudyTask(editingTask.id, taskData);
      if (ok) {
        toast.success("Tarea actualizada");
        const fresh = await fetchUserTasks(effectiveUserId);
        setTasks(fresh);
      } else {
        toast.error("Error al actualizar la tarea");
      }
    } else {
      const newTask = await createStudyTask(effectiveUserId, {
        ...taskData,
        estado: defaultStatusForNew,
      });
      if (newTask) {
        toast.success("¡Tarea creada con éxito!");
        const fresh = await fetchUserTasks(effectiveUserId);
        setTasks(fresh);
      } else {
        toast.error("Error al crear la tarea");
      }
    }
  };

  if (loading) {
    return <LoadingScreen message="Cargando tus tareas..." submessage="Preparando tu tablero de estudio..." />;
  }

  return (
    <div className="tabe-page p-3 lg:p-8 space-y-5 pb-24 lg:pb-12">
      {/* Banner Header Neo-Brutalista */}
      <div className="relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 bg-[#00E5FF] border-4 border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] sm:shadow-[8px_8px_0_0_hsl(var(--foreground))] rounded-2xl">
        <div className="relative z-10">
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-black flex items-center gap-3">
            <CheckSquare className="w-8 h-8 sm:w-10 sm:h-10 text-black shrink-0 stroke-[2.5]" />
            <span>Gestor de Tareas & Entregas</span>
          </h1>
          <p className="text-black font-bold uppercase tracking-wider mt-1 text-xs sm:text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>KANBAN Y TO-DO LIST ASOCIADO A TUS MATERIAS. MAXIMIZÁ TU RENDIMIENTO.</span>
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2.5">
          <button
            onClick={() => navigate("/pomodoro")}
            className="px-4 py-2.5 rounded-xl bg-white text-black font-black text-xs uppercase tracking-wider border-2 border-foreground shadow-[3px_3px_0_0_#000] hover:translate-y-[-1px] transition-all flex items-center gap-2"
          >
            <Timer className="w-4 h-4 text-[#ff4747]" />
            <span>Ir al Pomodoro</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal("todo")}
            className="px-4 py-2.5 rounded-xl bg-[#00FF9D] text-black font-black text-xs uppercase tracking-wider border-2 border-foreground shadow-[3px_3px_0_0_#000] hover:translate-y-[-1px] transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card border-3 border-foreground rounded-xl p-3.5 shadow-[3px_3px_0_0_hsl(var(--foreground))] flex items-center gap-3">
          <div className="p-2.5 bg-muted rounded-lg border-2 border-foreground">
            <ListTodo className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-muted-foreground block">Total Tareas</span>
            <span className="font-black text-xl text-foreground">{stats.total}</span>
          </div>
        </div>

        <div className="bg-card border-3 border-foreground rounded-xl p-3.5 shadow-[3px_3px_0_0_hsl(var(--foreground))] flex items-center gap-3">
          <div className="p-2.5 bg-[#FFE600] text-black rounded-lg border-2 border-foreground">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-muted-foreground block">Por Hacer</span>
            <span className="font-black text-xl text-foreground">{stats.todo}</span>
          </div>
        </div>

        <div className="bg-card border-3 border-foreground rounded-xl p-3.5 shadow-[3px_3px_0_0_hsl(var(--foreground))] flex items-center gap-3">
          <div className="p-2.5 bg-[#00E5FF] text-black rounded-lg border-2 border-foreground">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-muted-foreground block">En Progreso</span>
            <span className="font-black text-xl text-foreground">{stats.inProgress}</span>
          </div>
        </div>

        <div className="bg-card border-3 border-foreground rounded-xl p-3.5 shadow-[3px_3px_0_0_hsl(var(--foreground))] flex items-center gap-3">
          <div className="p-2.5 bg-[#00FF9D] text-black rounded-lg border-2 border-foreground">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-muted-foreground block">Completadas</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-xl text-foreground">{stats.done}</span>
              <span className="text-[10px] font-bold text-muted-foreground">({stats.progressPercent}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search, and View Switcher */}
      <div className="bg-card border-3 border-foreground rounded-xl p-3.5 sm:p-4 shadow-[4px_4px_0_0_hsl(var(--foreground))] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: View Toggle (Kanban vs List) */}
        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl border-2 border-foreground self-start">
          <button
            onClick={() => setViewMode("kanban")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all",
              viewMode === "kanban"
                ? "bg-foreground text-background shadow-[2px_2px_0_0_hsl(var(--foreground))] translate-y-[-1px]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Kanban className="w-4 h-4" />
            <span>Kanban</span>
          </button>

          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all",
              viewMode === "list"
                ? "bg-foreground text-background shadow-[2px_2px_0_0_hsl(var(--foreground))] translate-y-[-1px]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ListTodo className="w-4 h-4" />
            <span>Lista To-Do</span>
          </button>
        </div>

        {/* Right: Subject Filter and Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter by Subject */}
          <div className="flex items-center gap-2 min-w-[200px]">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-background border-2 border-foreground rounded-xl text-xs font-bold text-foreground focus:outline-none shadow-[2px_2px_0_0_hsl(var(--foreground))]"
            >
              <option value="all">Todas las materias</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} {s.codigo ? `(${s.codigo})` : ""}
                  </option>
                ))}
            </select>
          </div>

          {/* Search box */}
          <div className="relative min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar tareas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-background border-2 border-foreground rounded-xl text-xs font-bold text-foreground focus:outline-none shadow-[2px_2px_0_0_hsl(var(--foreground))]"
            />
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === "kanban" ? (
        <KanbanBoard
          tasks={filteredTasks}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onOpenCreateModal={handleOpenCreateModal}
        />
      ) : (
        <TaskListView
          tasks={filteredTasks}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Modal for Creating / Editing */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        initialTask={editingTask}
        subjects={subjects}
        defaultSubjectId={selectedSubjectFilter}
      />
    </div>
  );
}

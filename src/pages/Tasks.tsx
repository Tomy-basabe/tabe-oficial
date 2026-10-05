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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SubjectOption {
  id: string;
  nombre: string;
  codigo?: string;
  year?: number;
}

// Cache en memoria para navegación instantánea (0ms)
let _tasksCache: { tasks: StudyTask[]; subjects: SubjectOption[]; timestamp: number } | null = null;
const TASKS_STALE_TIME = 3 * 60 * 1000; // 3 minutos

export default function Tasks() {
  const { user, isGuest, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<StudyTask[]>(() => _tasksCache?.tasks || []);
  const [subjects, setSubjects] = useState<SubjectOption[]>(() => _tasksCache?.subjects || []);
  const [loading, setLoading] = useState(() => !_tasksCache);

  // View & Filters
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string | number>("all");
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
    const isFresh = _tasksCache && (Date.now() - _tasksCache.timestamp < TASKS_STALE_TIME);

    // Si los datos en caché están frescos, no mostramos ningún spinner
    if (isFresh) {
      setLoading(false);
      return;
    }

    const run = async () => {
      // Solo mostrar skeleton si no hay datos previos
      if (!_tasksCache) {
        setLoading(true);
      }
      try {
        await loadAllData();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [user, isGuest, authLoading]);

  const loadAllData = async () => {
    try {
      const effectiveUserId = user?.id || "guest";

      // Ejecutar la carga de materias y tareas EN PARALELO con Promise.all
      const [subjectsRes, userTasks] = await Promise.all([
        (async () => {
          let subData: any[] = [];
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

          return (subData || []).map((s: any) => ({
            id: s.id,
            nombre: s.nombre,
            codigo: s.codigo,
            year: s.año,
          }));
        })(),
        fetchUserTasks(effectiveUserId)
      ]);

      setSubjects(subjectsRes);
      setTasks(userTasks);

      // Guardar en caché con marca de tiempo
      _tasksCache = {
        tasks: userTasks,
        subjects: subjectsRes,
        timestamp: Date.now()
      };
    } catch (e) {
      console.error("Error loading tasks page:", e);
    }
  };

  // Available years from user subjects
  const availableYears = useMemo(() => {
    const rawYears = subjects
      .map((s) => s.year)
      .filter((y): y is number => typeof y === "number" && y > 0);
    return Array.from(new Set(rawYears)).sort((a, b) => a - b);
  }, [subjects]);

  // Subjects filtered by selected year
  const filteredSubjectsForDropdown = useMemo(() => {
    if (selectedYearFilter === "all") return subjects;
    return subjects.filter((s) => s.year === Number(selectedYearFilter));
  }, [subjects, selectedYearFilter]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const taskSubject = subjects.find((s) => s.id === t.subject_id);
      const matchYear =
        selectedYearFilter === "all" ||
        (t.subjects && t.subjects.año === Number(selectedYearFilter)) ||
        (taskSubject && taskSubject.year === Number(selectedYearFilter));

      const matchSubject =
        selectedSubjectFilter === "all" || t.subject_id === selectedSubjectFilter;

      const matchSearch =
        searchQuery === "" ||
        t.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.descripcion && t.descripcion.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.subjects && t.subjects.nombre.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchYear && matchSubject && matchSearch;
    });
  }, [tasks, selectedYearFilter, selectedSubjectFilter, searchQuery, subjects]);

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

  if (loading && tasks.length === 0) {
    return (
      <div className="tabe-page p-3 lg:p-8 space-y-5 pb-24 lg:pb-12 animate-pulse">
        <div className="h-28 bg-[#00E5FF]/20 border-4 border-foreground/20 rounded-2xl shadow-[4px_4px_0_0_rgba(0,0,0,0.1)]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((col) => (
            <div key={col} className="bg-card/50 border-2 border-foreground/20 rounded-2xl p-4 space-y-3 min-h-[350px]">
              <div className="h-7 w-28 bg-muted rounded-lg" />
              <div className="h-24 bg-muted/60 rounded-xl border border-border/40" />
              <div className="h-24 bg-muted/60 rounded-xl border border-border/40" />
            </div>
          ))}
        </div>
      </div>
    );
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

        {/* Right: Year Filter, Subject Filter and Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter by Year */}
          {availableYears.length > 0 && (
            <div className="flex items-center gap-1 p-1 bg-muted rounded-xl border-2 border-foreground">
              <button
                onClick={() => {
                  setSelectedYearFilter("all");
                  setSelectedSubjectFilter("all");
                }}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                  selectedYearFilter === "all"
                    ? "bg-foreground text-background shadow-[2px_2px_0_0_hsl(var(--foreground))] translate-y-[-1px]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Todos
              </button>
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  onClick={() => {
                    setSelectedYearFilter(yr);
                    setSelectedSubjectFilter("all");
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                    selectedYearFilter === yr
                      ? "bg-[#1475e5] text-white shadow-[2px_2px_0_0_#000] translate-y-[-1px]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {yr}°
                </button>
              ))}
            </div>
          )}

          {/* Filter by Subject */}
          <div className="min-w-[190px] sm:min-w-[220px]">
            <Select
              value={selectedSubjectFilter}
              onValueChange={setSelectedSubjectFilter}
            >
              <SelectTrigger className="w-full px-3 py-2 h-auto bg-background border-2 border-foreground rounded-xl text-xs font-bold text-foreground focus:ring-0 shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                <div className="flex items-center gap-2 truncate">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Todas las materias" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-popover border-2 border-foreground shadow-[4px_4px_0_0_#000] rounded-xl max-h-60">
                <SelectItem value="all" className="font-bold cursor-pointer rounded-lg text-xs">
                  Todas las materias
                </SelectItem>
                {filteredSubjectsForDropdown.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="font-bold cursor-pointer rounded-lg text-xs my-0.5">
                    {s.nombre} {s.codigo ? `(${s.codigo})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search box */}
          <div className="relative min-w-[170px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar tareas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-background border-2 border-foreground rounded-xl text-xs font-bold text-foreground focus:outline-none shadow-[2px_2px_0_0_hsl(var(--foreground))]"
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

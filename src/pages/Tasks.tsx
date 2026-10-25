import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
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
import { CheckSquare, Kanban, ListTodo, Plus, Filter, Search, Timer, Zap, CheckCircle2, Clock } from "lucide-react";
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
import { useConfirm } from "@/contexts/ConfirmModalContext";

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
  const { confirm } = useConfirm();
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

    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 1500);

    const run = async () => {
      if (!_tasksCache) {
        setLoading(true);
      }
      try {
        await loadAllData();
      } finally {
        clearTimeout(safetyTimer);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
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
      const isGeneralTask = !t.subject_id;
      const matchYear =
        selectedYearFilter === "all" ||
        isGeneralTask ||
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
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === taskId ? { ...t, estado: newStatus } : t));
      if (_tasksCache) {
        _tasksCache = { ..._tasksCache, tasks: updated, timestamp: Date.now() };
      }
      return updated;
    });
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
      if (_tasksCache) {
        _tasksCache = { ..._tasksCache, tasks: fresh, timestamp: Date.now() };
      }
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
    const taskToDelete = tasks.find((t) => t.id === taskId);
    const ok = await confirm({
      title: "¿Eliminar tarea de estudio?",
      description: `¿Estás seguro de eliminar la tarea "${taskToDelete?.titulo || "esta tarea"}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar tarea",
      cancelText: "Cancelar",
      variant: "danger",
    });
    if (!ok) return;

    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== taskId);
      if (_tasksCache) {
        _tasksCache = { ..._tasksCache, tasks: updated, timestamp: Date.now() };
      }
      return updated;
    });
    const okDelete = await deleteStudyTask(taskId);
    if (okDelete) {
      toast.success("Tarea eliminada");
    } else {
      toast.error("Error al eliminar la tarea");
      const effectiveUserId = user?.id || "guest";
      const fresh = await fetchUserTasks(effectiveUserId);
      setTasks(fresh);
      if (_tasksCache) {
        _tasksCache = { ..._tasksCache, tasks: fresh, timestamp: Date.now() };
      }
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
        if (_tasksCache) {
          _tasksCache = { ..._tasksCache, tasks: fresh, timestamp: Date.now() };
        }
      } else {
        toast.error("Error al actualizar la tarea");
      }
    } else {
      // Respect the user's selected status or default from the column clicked
      const statusToUse = taskData.estado || defaultStatusForNew || "todo";
      const newTask = await createStudyTask(effectiveUserId, {
        ...taskData,
        estado: statusToUse,
      });
      if (newTask) {
        toast.success("¡Tarea creada con éxito!");
        const subObj = subjects.find((s) => s.id === newTask.subject_id);
        const enrichedNewTask: StudyTask = {
          ...newTask,
          subjects: subObj ? { id: subObj.id, nombre: subObj.nombre, codigo: subObj.codigo, año: subObj.year } : newTask.subjects,
        };

        // Instant optimistic update in local state & cache
        setTasks((prev) => {
          const updated = [enrichedNewTask, ...prev.filter((t) => t.id !== enrichedNewTask.id)];
          _tasksCache = {
            tasks: updated,
            subjects,
            timestamp: Date.now(),
          };
          return updated;
        });

        // Si hay un filtro activo que ocultaría la tarea recién creada, restablecemos para que sea visible
        if (selectedSubjectFilter !== "all" && newTask.subject_id !== selectedSubjectFilter) {
          setSelectedSubjectFilter("all");
        }
        if (selectedYearFilter !== "all" && subObj?.year && subObj.year !== Number(selectedYearFilter)) {
          setSelectedYearFilter("all");
        }
        if (searchQuery) {
          setSearchQuery("");
        }

        // Refresco en segundo plano para persistencia exacta
        fetchUserTasks(effectiveUserId).then((fresh) => {
          if (fresh && fresh.length > 0) {
            setTasks(fresh);
            _tasksCache = {
              tasks: fresh,
              subjects,
              timestamp: Date.now(),
            };
          }
        });
      } else {
        toast.error("Error al crear la tarea");
      }
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="tabe-page p-4 sm:p-6 lg:p-8 space-y-6 pb-24 lg:pb-12 max-w-7xl mx-auto animate-pulse">
        <div className="h-20 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((col) => (
            <div key={col} className="bg-zinc-100/60 dark:bg-zinc-800/40 rounded-2xl p-4 space-y-3 min-h-[450px]">
              <div className="h-6 w-28 bg-zinc-200 dark:bg-zinc-700/60 rounded-lg" />
              <div className="h-24 bg-zinc-200/50 dark:bg-zinc-700/40 rounded-xl" />
              <div className="h-24 bg-zinc-200/50 dark:bg-zinc-700/40 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="tabe-page p-4 sm:p-6 lg:p-8 space-y-6 pb-24 lg:pb-12 max-w-7xl mx-auto">
      {/* Header Notion/ChatGPT Style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
              <CheckSquare className="w-5 h-5" />
            </span>
            <span>Gestor de Tareas</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-normal">
            Organiza tus pendientes, entregas y temas de estudio por materia o en tablero Kanban.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/pomodoro")}
            className="px-3.5 py-2 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#212121] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Timer className="w-4 h-4 text-rose-500" />
            <span>Pomodoro</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal("todo")}
            className="px-3.5 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-medium shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Tarea</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50">
            <ListTodo className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block">Total</span>
            <span className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
          <div className="p-2 bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 rounded-lg">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block">Por Hacer</span>
            <span className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">{stats.todo}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-lg">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block">En Progreso</span>
            <span className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">{stats.inProgress}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3.5 shadow-2xs flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium block">Completadas</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">{stats.done}</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">({stats.progressPercent}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search, and View Switcher */}
      <div className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: View Toggle (Kanban vs List) */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50 self-start">
          <button
            onClick={() => setViewMode("kanban")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
              viewMode === "kanban"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            )}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Kanban</span>
          </button>

          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
              viewMode === "list"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            )}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Lista</span>
          </button>
        </div>

        {/* Right: Year Filter, Subject Filter and Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter by Year */}
          {availableYears.length > 0 && (
            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50">
              <button
                onClick={() => {
                  setSelectedYearFilter("all");
                  setSelectedSubjectFilter("all");
                }}
                className={cn(
                  "relative px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer select-none",
                  selectedYearFilter === "all"
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                {selectedYearFilter === "all" && (
                  <motion.span
                    layoutId="tasks-year-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-md bg-white dark:bg-zinc-900 shadow-2xs"
                  />
                )}
                <span className="relative z-10">Todos</span>
              </button>
              {availableYears.map((yr) => {
                const isSelected = selectedYearFilter === yr;
                return (
                  <button
                    key={yr}
                    onClick={() => {
                      setSelectedYearFilter(yr);
                      setSelectedSubjectFilter("all");
                    }}
                    className={cn(
                      "relative px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer select-none",
                      isSelected
                        ? "text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    )}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="tasks-year-pill"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        className="absolute inset-0 rounded-md bg-white dark:bg-zinc-900 shadow-2xs"
                      />
                    )}
                    <span className="relative z-10">{yr}°</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Filter by Subject */}
          <div className="min-w-[190px] sm:min-w-[210px]">
            <Select
              value={selectedSubjectFilter}
              onValueChange={setSelectedSubjectFilter}
            >
              <SelectTrigger className="w-full px-3 py-1.5 h-9 bg-zinc-50/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600">
                <div className="flex items-center gap-2 truncate">
                  <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <SelectValue placeholder="Todas las materias" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#212121] border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg rounded-xl max-h-60">
                <SelectItem value="all" className="font-medium cursor-pointer rounded-lg text-xs">
                  Todas las materias
                </SelectItem>
                {filteredSubjectsForDropdown.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="font-medium cursor-pointer rounded-lg text-xs my-0.5">
                    {s.nombre} {s.codigo ? `(${s.codigo})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search box */}
          <div className="relative min-w-[170px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar tareas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 h-9 bg-zinc-50/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-lg text-xs font-normal text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-colors"
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
        defaultStatus={defaultStatusForNew}
      />
    </div>
  );
}

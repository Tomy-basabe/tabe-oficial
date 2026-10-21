import { supabase } from "@/integrations/supabase/client";
import { StudyTask, CreateTaskInput, UpdateTaskInput, TaskStatus } from "@/types/tasks";

const LOCAL_TASKS_KEY = "tabe_guest_study_tasks";

function getLocalTasks(): StudyTask[] {
  try {
    const raw = localStorage.getItem(LOCAL_TASKS_KEY);
    if (raw) return JSON.parse(raw);
    const initialDemo: StudyTask[] = [
      {
        id: "demo-task-1",
        user_id: "guest",
        subject_id: null,
        titulo: "Resolver guía de ejercicios prácticos",
        descripcion: "Completar los ejercicios 1 al 15 de la guía práctica.",
        estado: "todo",
        prioridad: "alta",
        fecha_limite: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        pomodoros_estimados: 2,
        pomodoros_completados: 0,
        posicion: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subjects: { id: "demo-s1", nombre: "Análisis I", codigo: "AM1" },
      },
      {
        id: "demo-task-2",
        user_id: "guest",
        subject_id: null,
        titulo: "Repasar fórmulas para examen global",
        descripcion: "Leyes de termodinámica y óptica.",
        estado: "todo",
        prioridad: "media",
        fecha_limite: new Date(Date.now() + 172800000).toISOString().split("T")[0],
        pomodoros_estimados: 3,
        pomodoros_completados: 1,
        posicion: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subjects: { id: "demo-s2", nombre: "Física II", codigo: "F2" },
      },
      {
        id: "demo-task-3",
        user_id: "guest",
        subject_id: null,
        titulo: "Descargar apuntes y bibliografía de la unidad 3",
        descripcion: "Revisar lecturas recomendadas.",
        estado: "todo",
        prioridad: "baja",
        fecha_limite: null,
        pomodoros_estimados: 1,
        pomodoros_completados: 0,
        posicion: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    saveLocalTasks(initialDemo);
    return initialDemo;
  } catch {
    return [];
  }
}

function saveLocalTasks(tasks: StudyTask[]) {
  try {
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
  } catch {}
}

export async function fetchUserTasks(userId: string, subjectId?: string | null): Promise<StudyTask[]> {
  // Guest / unauthenticated fallback
  if (!userId || userId === "guest") {
    let local = getLocalTasks();
    if (subjectId && subjectId !== "all") {
      local = local.filter((t) => t.subject_id === subjectId);
    }
    return local;
  }

  try {
    let query = supabase
      .from("study_tasks" as any)
      .select("id, user_id, subject_id, titulo, descripcion, estado, prioridad, fecha_limite, pomodoros_estimados, pomodoros_completados, posicion, created_at, updated_at, subjects(id, nombre, codigo, año)")
      .eq("user_id", userId)
      .order("posicion", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(100);

    if (subjectId && subjectId !== "all") {
      query = query.eq("subject_id", subjectId);
    }

    // Safety timeout of 6 seconds so it never hangs indefinitely
    const fetchPromise = query;
    const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout al cargar tareas")), 6000)
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;
    if (error) throw error;
    
    const tasks = (data || []) as StudyTask[];
    // Save to local backup
    saveLocalTasks(tasks);
    return tasks;
  } catch (error) {
    console.warn("Error fetching study tasks from Supabase, using local backup:", error);
    return getLocalTasks();
  }
}

export async function createStudyTask(userId: string, input: CreateTaskInput): Promise<StudyTask | null> {
  if (!userId || userId === "guest") {
    const newTask: StudyTask = {
      id: crypto.randomUUID(),
      user_id: "guest",
      titulo: input.titulo.trim(),
      descripcion: input.descripcion?.trim() || null,
      subject_id: input.subject_id || null,
      estado: input.estado || "todo",
      prioridad: input.prioridad || "media",
      fecha_limite: input.fecha_limite || null,
      pomodoros_estimados: input.pomodoros_estimados || 1,
      pomodoros_completados: 0,
      posicion: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const current = getLocalTasks();
    saveLocalTasks([newTask, ...current]);
    return newTask;
  }

  try {
    const { data, error } = await supabase
      .from("study_tasks" as any)
      .insert({
        user_id: userId,
        titulo: input.titulo.trim(),
        descripcion: input.descripcion?.trim() || null,
        subject_id: input.subject_id || null,
        estado: input.estado || "todo",
        prioridad: input.prioridad || "media",
        fecha_limite: input.fecha_limite || null,
        pomodoros_estimados: input.pomodoros_estimados || 1,
        pomodoros_completados: 0,
        posicion: 0,
      })
      .select("id, user_id, subject_id, titulo, descripcion, estado, prioridad, fecha_limite, pomodoros_estimados, pomodoros_completados, posicion, created_at, updated_at, subjects(id, nombre, codigo, año)")
      .single();

    if (error) throw error;
    const task = data as StudyTask;
    saveLocalTasks([task, ...getLocalTasks().filter(t => t.id !== task.id)]);
    return task;
  } catch (error) {
    console.error("Error creating study task:", error);
    return null;
  }
}

export async function updateStudyTask(taskId: string, input: UpdateTaskInput): Promise<boolean> {
  // Update local tasks first or fallback
  const local = getLocalTasks();
  const index = local.findIndex((t) => t.id === taskId);
  if (index !== -1) {
    local[index] = { ...local[index], ...input, updated_at: new Date().toISOString() };
    saveLocalTasks(local);
  }

  try {
    const { error } = await supabase
      .from("study_tasks" as any)
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("Error updating study task in Supabase:", error);
    // If local was updated, return true
    return index !== -1;
  }
}

export async function deleteStudyTask(taskId: string): Promise<boolean> {
  const local = getLocalTasks().filter((t) => t.id !== taskId);
  saveLocalTasks(local);

  try {
    const { error } = await supabase
      .from("study_tasks" as any)
      .delete()
      .eq("id", taskId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("Error deleting study task in Supabase:", error);
    return true;
  }
}

export async function updateTaskStatus(taskId: string, newStatus: TaskStatus): Promise<boolean> {
  return updateStudyTask(taskId, { estado: newStatus });
}

export async function incrementTaskPomodoro(taskId: string, currentCompleted: number): Promise<boolean> {
  return updateStudyTask(taskId, { pomodoros_completados: currentCompleted + 1 });
}

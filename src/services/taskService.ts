import { supabase } from "@/integrations/supabase/client";
import { StudyTask, CreateTaskInput, UpdateTaskInput, TaskStatus } from "@/types/tasks";

const LOCAL_TASKS_KEY = "tabe_guest_study_tasks";

function getLocalTasks(): StudyTask[] {
  try {
    const raw = localStorage.getItem(LOCAL_TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
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
      .select("*, subjects(id, nombre, codigo)")
      .eq("user_id", userId)
      .order("posicion", { ascending: true })
      .order("created_at", { ascending: false });

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
      .select("*, subjects(id, nombre, codigo)")
      .single();

    if (error) throw error;
    return data as StudyTask;
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

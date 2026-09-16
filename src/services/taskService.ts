import { supabase } from "@/integrations/supabase/client";
import { StudyTask, CreateTaskInput, UpdateTaskInput, TaskStatus } from "@/types/tasks";

export async function fetchUserTasks(userId: string, subjectId?: string | null): Promise<StudyTask[]> {
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

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as StudyTask[];
  } catch (error) {
    console.error("Error fetching study tasks:", error);
    return [];
  }
}

export async function createStudyTask(userId: string, input: CreateTaskInput): Promise<StudyTask | null> {
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
    console.error("Error updating study task:", error);
    return false;
  }
}

export async function deleteStudyTask(taskId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("study_tasks" as any)
      .delete()
      .eq("id", taskId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting study task:", error);
    return false;
  }
}

export async function updateTaskStatus(taskId: string, newStatus: TaskStatus): Promise<boolean> {
  return updateStudyTask(taskId, { estado: newStatus });
}

export async function incrementTaskPomodoro(taskId: string, currentCompleted: number): Promise<boolean> {
  return updateStudyTask(taskId, { pomodoros_completados: currentCompleted + 1 });
}

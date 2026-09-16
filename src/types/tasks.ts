export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'baja' | 'media' | 'alta';

export interface StudyTask {
  id: string;
  user_id: string;
  subject_id: string | null;
  titulo: string;
  descripcion: string | null;
  estado: TaskStatus;
  prioridad: TaskPriority;
  fecha_limite: string | null;
  pomodoros_estimados: number;
  pomodoros_completados: number;
  posicion: number;
  created_at: string;
  updated_at: string;
  subjects?: {
    id: string;
    nombre: string;
    codigo?: string;
    color?: string;
  } | null;
}

export interface CreateTaskInput {
  titulo: string;
  descripcion?: string;
  subject_id?: string | null;
  estado?: TaskStatus;
  prioridad?: TaskPriority;
  fecha_limite?: string | null;
  pomodoros_estimados?: number;
}

export interface UpdateTaskInput {
  titulo?: string;
  descripcion?: string | null;
  subject_id?: string | null;
  estado?: TaskStatus;
  prioridad?: TaskPriority;
  fecha_limite?: string | null;
  pomodoros_estimados?: number;
  pomodoros_completados?: number;
  posicion?: number;
}

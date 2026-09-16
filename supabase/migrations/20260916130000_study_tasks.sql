-- ==============================================================================
-- MIGRATION: 20260916130000_study_tasks.sql
-- CREATE STUDY_TASKS TABLE FOR KANBAN & TO-DO PRODUCTIVITY MODULE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.study_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT NOT NULL DEFAULT 'todo' CHECK (estado IN ('todo', 'in_progress', 'done')),
  prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta')),
  fecha_limite DATE,
  pomodoros_estimados INTEGER NOT NULL DEFAULT 1,
  pomodoros_completados INTEGER NOT NULL DEFAULT 0,
  posicion INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_study_tasks_user_id ON public.study_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_study_tasks_subject_id ON public.study_tasks(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_tasks_estado ON public.study_tasks(estado);
CREATE INDEX IF NOT EXISTS idx_study_tasks_fecha_limite ON public.study_tasks(fecha_limite);

-- Enable RLS
ALTER TABLE public.study_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can manage their own study tasks" ON public.study_tasks;
DROP POLICY IF EXISTS "Users can view own study tasks" ON public.study_tasks;
DROP POLICY IF EXISTS "Users can insert own study tasks" ON public.study_tasks;
DROP POLICY IF EXISTS "Users can update own study tasks" ON public.study_tasks;
DROP POLICY IF EXISTS "Users can delete own study tasks" ON public.study_tasks;

-- RLS Policies
CREATE POLICY "Users can view own study tasks" ON public.study_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study tasks" ON public.study_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study tasks" ON public.study_tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study tasks" ON public.study_tasks
  FOR DELETE USING (auth.uid() = user_id);

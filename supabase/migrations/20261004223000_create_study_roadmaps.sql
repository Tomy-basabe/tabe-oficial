-- Migración: Tabla de Rutas de Estudio Gamificadas por Niveles (TABE AI)
-- Diseñada para cero impacto en cuotas gratuitas: almacenamiento en columna JSONB única

CREATE TABLE IF NOT EXISTS public.study_roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    subject_name TEXT NOT NULL,
    exam_date DATE NOT NULL,
    target_mastery INTEGER NOT NULL DEFAULT 80,
    study_preference TEXT NOT NULL DEFAULT 'practicar',
    roadmap_data JSONB NOT NULL DEFAULT '{"roadmap": []}'::jsonb,
    current_level INTEGER NOT NULL DEFAULT 1,
    total_levels INTEGER NOT NULL DEFAULT 5,
    completed_levels INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.study_roadmaps ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad RLS: Acceso idéntico para todos los estudiantes (REGLA CERO)
CREATE POLICY "Users can view own study roadmaps" 
ON public.study_roadmaps FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study roadmaps" 
ON public.study_roadmaps FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study roadmaps" 
ON public.study_roadmaps FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own study roadmaps" 
ON public.study_roadmaps FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Índices de alto rendimiento para lecturas instantáneas
CREATE INDEX IF NOT EXISTS idx_study_roadmaps_user_id ON public.study_roadmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_study_roadmaps_subject_id ON public.study_roadmaps(subject_id);

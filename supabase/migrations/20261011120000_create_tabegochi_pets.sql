-- Migración: Tabla de Mascotas Virtuales TabeGochi (TABE)
-- Permite la sincronización en tiempo real entre teléfono, notebook y tabletas
-- Diseñada para cero impacto en cuotas gratuitas: almacenamiento en columna JSONB única

CREATE TABLE IF NOT EXISTS public.tabegochi_pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT tabegochi_pets_user_id_unique UNIQUE (user_id)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.tabegochi_pets ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Acceso exclusivo para el dueño de la cuenta
CREATE POLICY "Users can view own tabegochi" 
ON public.tabegochi_pets FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tabegochi" 
ON public.tabegochi_pets FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tabegochi" 
ON public.tabegochi_pets FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tabegochi" 
ON public.tabegochi_pets FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Índice para búsquedas inmediatas por usuario
CREATE INDEX IF NOT EXISTS idx_tabegochi_pets_user_id ON public.tabegochi_pets(user_id);

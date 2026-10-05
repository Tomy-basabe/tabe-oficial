-- ============================================================
-- Migración de Seguridad: Habilitar RLS en tablas que puedan carecer de él
-- Fecha: 2026-10-05
-- ============================================================

-- Habilitar RLS en tablas de profesores si existen
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'professors') THEN
    ALTER TABLE public.professors ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can manage their own professor profile" ON public.professors;
    CREATE POLICY "Users can manage their own professor profile"
      ON public.professors FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    
    -- Lectura pública (para que otros vean horarios)
    DROP POLICY IF EXISTS "Professors are viewable by authenticated users" ON public.professors;
    CREATE POLICY "Professors are viewable by authenticated users"
      ON public.professors FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'professor_office_hours') THEN
    ALTER TABLE public.professor_office_hours ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can manage their own office hours" ON public.professor_office_hours;
    CREATE POLICY "Users can manage their own office hours"
      ON public.professor_office_hours FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Office hours are viewable by authenticated users" ON public.professor_office_hours;
    CREATE POLICY "Office hours are viewable by authenticated users"
      ON public.professor_office_hours FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Habilitar RLS en tablas de sueño si existen
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sleep_logs') THEN
    ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can manage their own sleep logs" ON public.sleep_logs;
    CREATE POLICY "Users can manage their own sleep logs"
      ON public.sleep_logs FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_sleep_logs') THEN
    ALTER TABLE public.user_sleep_logs ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can manage their own sleep data" ON public.user_sleep_logs;
    CREATE POLICY "Users can manage their own sleep data"
      ON public.user_sleep_logs FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Verificar que todas las tablas principales tengan RLS habilitado
-- (Esta query es solo para diagnóstico, no modifica nada)
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- ==============================================================================
-- MIGRACIÓN: Moderación, Seguridad y Validación de Testimonios (user_reviews)
-- ==============================================================================

-- 1. Agregar columna is_approved (por defecto false)
ALTER TABLE public.user_reviews 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false;

-- 2. Asegurar que los datos existentes no violen las nuevas restricciones de longitud
UPDATE public.user_reviews 
SET career = SUBSTRING(career FROM 1 FOR 80) 
WHERE char_length(career) > 80;

UPDATE public.user_reviews 
SET description = SUBSTRING(description FROM 1 FOR 300) 
WHERE char_length(description) > 300;

-- 3. Restricciones CHECK para longitud máxima de carrera y descripción
ALTER TABLE public.user_reviews 
DROP CONSTRAINT IF EXISTS chk_user_reviews_career_length;

ALTER TABLE public.user_reviews 
ADD CONSTRAINT chk_user_reviews_career_length 
CHECK (char_length(career) <= 80);

ALTER TABLE public.user_reviews 
DROP CONSTRAINT IF EXISTS chk_user_reviews_description_length;

ALTER TABLE public.user_reviews 
ADD CONSTRAINT chk_user_reviews_description_length 
CHECK (char_length(description) <= 300);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;

-- 5. Limpieza de políticas previas sobre user_reviews
DROP POLICY IF EXISTS "Public reviews are viewable by everyone" ON public.user_reviews;
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.user_reviews;
DROP POLICY IF EXISTS "Users can read approved reviews" ON public.user_reviews;
DROP POLICY IF EXISTS "Users can view own reviews" ON public.user_reviews;
DROP POLICY IF EXISTS "Users can insert their own review" ON public.user_reviews;
DROP POLICY IF EXISTS "Users can update their own review" ON public.user_reviews;
DROP POLICY IF EXISTS "Users can delete their own review" ON public.user_reviews;
DROP POLICY IF EXISTS "Admins can view and manage all reviews" ON public.user_reviews;
DROP POLICY IF EXISTS "user_reviews_select_approved" ON public.user_reviews;
DROP POLICY IF EXISTS "user_reviews_insert_authenticated" ON public.user_reviews;
DROP POLICY IF EXISTS "user_reviews_update_authenticated" ON public.user_reviews;
DROP POLICY IF EXISTS "user_reviews_delete_authenticated" ON public.user_reviews;

-- 6. Políticas RLS
-- A. SELECT: Público limitado estrictamente a is_approved = true.
--    Permite también al autor ver su propia reseña pendiente y al administrador revisar todas.
CREATE POLICY "user_reviews_select_approved" 
ON public.user_reviews 
FOR SELECT 
USING (
  is_approved = true 
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR (auth.jwt() ->> 'email' = 'basabetomas09@gmail.com')
);

-- B. INSERT: Permitido únicamente a usuarios autenticados donde auth.uid() = user_id forzando is_approved = false
CREATE POLICY "user_reviews_insert_authenticated" 
ON public.user_reviews 
FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = user_id 
  AND is_approved = false
);

-- C. UPDATE: Permitido al usuario autor (forzando is_approved = false) o al administrador (para aprobar)
CREATE POLICY "user_reviews_update_authenticated" 
ON public.user_reviews 
FOR UPDATE 
TO authenticated 
USING (
  auth.uid() = user_id 
  OR (auth.jwt() ->> 'email' = 'basabetomas09@gmail.com')
) 
WITH CHECK (
  (auth.uid() = user_id AND is_approved = false)
  OR (auth.jwt() ->> 'email' = 'basabetomas09@gmail.com')
);

-- D. DELETE: Permitido al autor o al administrador
CREATE POLICY "user_reviews_delete_authenticated" 
ON public.user_reviews 
FOR DELETE 
TO authenticated 
USING (
  auth.uid() = user_id 
  OR (auth.jwt() ->> 'email' = 'basabetomas09@gmail.com')
);

-- 7. Sentencia final: Marcar reseñas existentes como aprobadas para mantener visible la marquesina
UPDATE public.user_reviews 
SET is_approved = true 
WHERE is_approved IS NULL OR is_approved = false;

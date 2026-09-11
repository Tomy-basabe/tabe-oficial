-- ============================================================
-- ALLOW AUTHENTICATED USERS TO VIEW SUBJECTS
-- Solves the issue where friend notes and shared library files
-- appeared as "Sin materia" because students could not read
-- the subject names, codes, and academic years of other students' notes.
-- ============================================================

DROP POLICY IF EXISTS "Users can view their own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Anyone can view subjects" ON public.subjects;
DROP POLICY IF EXISTS "Authenticated users can view subjects" ON public.subjects;

CREATE POLICY "Authenticated users can view subjects" ON public.subjects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public users can view catalog subjects" ON public.subjects
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

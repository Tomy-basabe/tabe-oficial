-- ============================================================
-- FIX SUBJECTS & USER ISOLATION
-- Solves the issue where subjects from ALL users appeared in the career plan
-- Restores strict user-level isolation for subjects, dependencies, and statuses
-- ============================================================

-- 1. FIX SUBJECTS POLICIES
DROP POLICY IF EXISTS "Public read access for subjects" ON public.subjects;
DROP POLICY IF EXISTS "Anyone can view subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can view their own subjects" ON public.subjects;
DROP POLICY IF EXISTS "public_read_catalog" ON public.subjects;
DROP POLICY IF EXISTS "Authenticated users can insert subjects" ON public.subjects;
DROP POLICY IF EXISTS "Authenticated users can update subjects" ON public.subjects;
DROP POLICY IF EXISTS "Authenticated users can delete subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can insert their own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can update their own subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can delete their own subjects" ON public.subjects;

-- Select: users only see their own subjects, marketplace subjects, or global templates
CREATE POLICY "Users can view their own subjects" ON public.subjects
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR user_id IS NULL
    OR id IN (SELECT subject_id FROM public.marketplace_items WHERE subject_id IS NOT NULL)
  );

CREATE POLICY "Users can insert their own subjects" ON public.subjects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own subjects" ON public.subjects
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subjects" ON public.subjects
  FOR DELETE
  USING (auth.uid() = user_id);

-- 2. FIX SUBJECT DEPENDENCIES POLICIES
DROP POLICY IF EXISTS "Anyone can view subject dependencies" ON public.subject_dependencies;
DROP POLICY IF EXISTS "Users can view their own dependencies" ON public.subject_dependencies;
DROP POLICY IF EXISTS "Authenticated users can insert dependencies" ON public.subject_dependencies;
DROP POLICY IF EXISTS "Authenticated users can delete dependencies" ON public.subject_dependencies;
DROP POLICY IF EXISTS "public_read_catalog" ON public.subject_dependencies;
DROP POLICY IF EXISTS "Users can insert their own dependencies" ON public.subject_dependencies;
DROP POLICY IF EXISTS "Users can delete their own dependencies" ON public.subject_dependencies;

CREATE POLICY "Users can view their own dependencies" ON public.subject_dependencies
  FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert their own dependencies" ON public.subject_dependencies
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can delete their own dependencies" ON public.subject_dependencies
  FOR DELETE
  USING (user_id = auth.uid() OR user_id IS NULL);

-- 3. ENSURE USER_SUBJECT_STATUS POLICIES ARE INTACT
DROP POLICY IF EXISTS "Users can view their own subject status" ON public.user_subject_status;
DROP POLICY IF EXISTS "Users can insert their own subject status" ON public.user_subject_status;
DROP POLICY IF EXISTS "Users can update their own subject status" ON public.user_subject_status;
DROP POLICY IF EXISTS "Users can delete their own subject status" ON public.user_subject_status;

CREATE POLICY "Users can view their own subject status" ON public.user_subject_status
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subject status" ON public.user_subject_status
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subject status" ON public.user_subject_status
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subject status" ON public.user_subject_status
  FOR DELETE
  USING (auth.uid() = user_id);

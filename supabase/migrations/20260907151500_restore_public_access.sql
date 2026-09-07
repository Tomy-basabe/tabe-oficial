-- ============================================================
-- RESTORE PERFORMANCE & PUBLIC READ ACCESS
-- Ensures all catalog and public tables can be read instantly
-- without RLS blocking or timeouts
-- ============================================================

-- 1. Ensure public read on subjects
DROP POLICY IF EXISTS "Public read access for subjects" ON public.subjects;
DROP POLICY IF EXISTS "Anyone can view subjects" ON public.subjects;
CREATE POLICY "Public read access for subjects" ON public.subjects FOR SELECT USING (true);

-- 2. Restore read access to all public catalog tables
DO $$
DECLARE
  t text;
  catalog_tables text[] := ARRAY[
    'subjects', 
    'careers', 
    'career_plans', 
    'career_subjects', 
    'correlatividades', 
    'correlativas',
    'achievements', 
    'items', 
    'item_mechanics', 
    'boxes', 
    'marketplace_items'
  ];
BEGIN
  FOREACH t IN ARRAY catalog_tables
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('DROP POLICY IF EXISTS "public_read_catalog" ON public.%I;', t);
      EXECUTE format('CREATE POLICY "public_read_catalog" ON public.%I FOR SELECT USING (true);', t);
    END IF;
  END LOOP;
END $$;

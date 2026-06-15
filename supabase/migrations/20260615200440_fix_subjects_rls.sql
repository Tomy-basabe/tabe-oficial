-- Fix RLS policy for subjects so that any user (including guests and other users) can view subjects in the marketplace
DROP POLICY IF EXISTS "Anyone can view subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can view their own subjects" ON public.subjects;

-- Allow read access to everyone so that subjects linked to marketplace items are visible
CREATE POLICY "Public read access for subjects" ON public.subjects
  FOR SELECT
  USING (true);

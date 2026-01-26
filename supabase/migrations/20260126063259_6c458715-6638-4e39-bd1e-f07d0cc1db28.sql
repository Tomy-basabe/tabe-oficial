-- Fix 1: Secure the invited_users table
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can check invitation status by email" ON public.invited_users;

-- Create a secure RPC function to check invitation status
CREATE OR REPLACE FUNCTION public.check_invitation_status(check_email TEXT)
RETURNS TABLE(
  id uuid,
  accepted_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.accepted_at
  FROM invited_users i
  WHERE LOWER(i.email) = LOWER(check_email);
END;
$$;

-- Fix 2: Make library-files bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'library-files';

-- Remove the public SELECT policy on storage.objects
DROP POLICY IF EXISTS "Public can view library files" ON storage.objects;
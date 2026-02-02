-- 1. Add RLS policy to allow viewing flashcards from public decks
CREATE POLICY "Anyone can view flashcards from public decks" 
ON public.flashcards 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM flashcard_decks 
    WHERE flashcard_decks.id = flashcards.deck_id 
    AND flashcard_decks.is_public = true
  )
);

-- Drop old restrictive policy
DROP POLICY IF EXISTS "Users can view their own flashcards" ON public.flashcards;

-- 2. Create function to get profiles for server members (fixes Discord member display)
CREATE OR REPLACE FUNCTION public.get_server_member_profiles(member_user_ids uuid[])
RETURNS TABLE(user_id uuid, username text, display_id integer, nombre text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.username, p.display_id, p.nombre, p.avatar_url
  FROM profiles p
  WHERE p.user_id = ANY(member_user_ids);
END;
$$;
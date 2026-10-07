-- Migration: Comprehensive Community Ratings Support for Decks, Quizzes, Notes, Files, and Folders
-- Created at: 2026-10-07 20:25:00

-- 1. Ensure quiz_ratings exists
CREATE TABLE IF NOT EXISTS public.quiz_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_deck_id UUID NOT NULL REFERENCES public.quiz_decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(quiz_deck_id, user_id)
);

ALTER TABLE public.quiz_ratings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quiz_ratings' AND policyname = 'Anyone can view quiz ratings') THEN
    CREATE POLICY "Anyone can view quiz ratings" ON public.quiz_ratings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quiz_ratings' AND policyname = 'Users can insert own quiz ratings') THEN
    CREATE POLICY "Users can insert own quiz ratings" ON public.quiz_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quiz_ratings' AND policyname = 'Users can update own quiz ratings') THEN
    CREATE POLICY "Users can update own quiz ratings" ON public.quiz_ratings FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quiz_ratings' AND policyname = 'Users can delete own quiz ratings') THEN
    CREATE POLICY "Users can delete own quiz ratings" ON public.quiz_ratings FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 2. Ensure file_ratings exists
CREATE TABLE IF NOT EXISTS public.file_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.library_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(file_id, user_id)
);

ALTER TABLE public.file_ratings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'file_ratings' AND policyname = 'Anyone can view file ratings') THEN
    CREATE POLICY "Anyone can view file ratings" ON public.file_ratings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'file_ratings' AND policyname = 'Users can insert own file ratings') THEN
    CREATE POLICY "Users can insert own file ratings" ON public.file_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'file_ratings' AND policyname = 'Users can update own file ratings') THEN
    CREATE POLICY "Users can update own file ratings" ON public.file_ratings FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'file_ratings' AND policyname = 'Users can delete own file ratings') THEN
    CREATE POLICY "Users can delete own file ratings" ON public.file_ratings FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Ensure folder_ratings exists
CREATE TABLE IF NOT EXISTS public.folder_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES public.library_folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(folder_id, user_id)
);

ALTER TABLE public.folder_ratings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'folder_ratings' AND policyname = 'Anyone can view folder ratings') THEN
    CREATE POLICY "Anyone can view folder ratings" ON public.folder_ratings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'folder_ratings' AND policyname = 'Users can insert own folder ratings') THEN
    CREATE POLICY "Users can insert own folder ratings" ON public.folder_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'folder_ratings' AND policyname = 'Users can update own folder ratings') THEN
    CREATE POLICY "Users can update own folder ratings" ON public.folder_ratings FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'folder_ratings' AND policyname = 'Users can delete own folder ratings') THEN
    CREATE POLICY "Users can delete own folder ratings" ON public.folder_ratings FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Ensure deck_ratings has proper policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deck_ratings' AND policyname = 'Anyone can view deck ratings') THEN
    CREATE POLICY "Anyone can view deck ratings" ON public.deck_ratings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deck_ratings' AND policyname = 'Users can insert own deck ratings') THEN
    CREATE POLICY "Users can insert own deck ratings" ON public.deck_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deck_ratings' AND policyname = 'Users can update own deck ratings') THEN
    CREATE POLICY "Users can update own deck ratings" ON public.deck_ratings FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. RPC to securely rate any community resource (avoids RLS conflict when updating owner totals)
CREATE OR REPLACE FUNCTION public.rate_community_resource(
  p_type text,
  p_resource_id uuid,
  p_rating int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_new_sum numeric := 0;
  v_new_count int := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'La calificación debe estar entre 1 y 5';
  END IF;

  IF p_type = 'deck' THEN
    INSERT INTO public.deck_ratings (deck_id, user_id, rating)
    VALUES (p_resource_id, v_user_id, p_rating)
    ON CONFLICT (deck_id, user_id) DO UPDATE SET rating = EXCLUDED.rating;

    SELECT COALESCE(SUM(rating), 0), COUNT(*)
    INTO v_new_sum, v_new_count
    FROM public.deck_ratings WHERE deck_id = p_resource_id;

    UPDATE public.flashcard_decks
    SET rating_sum = v_new_sum, rating_count = v_new_count
    WHERE id = p_resource_id;

  ELSIF p_type = 'quiz' THEN
    INSERT INTO public.quiz_ratings (quiz_deck_id, user_id, rating)
    VALUES (p_resource_id, v_user_id, p_rating)
    ON CONFLICT (quiz_deck_id, user_id) DO UPDATE SET rating = EXCLUDED.rating;

    SELECT COALESCE(SUM(rating), 0), COUNT(*)
    INTO v_new_sum, v_new_count
    FROM public.quiz_ratings WHERE quiz_deck_id = p_resource_id;

    UPDATE public.quiz_decks
    SET rating_sum = v_new_sum, rating_count = v_new_count
    WHERE id = p_resource_id;

  ELSIF p_type = 'apunte' THEN
    INSERT INTO public.apunte_ratings (apunte_id, user_id, rating)
    VALUES (p_resource_id, v_user_id, p_rating)
    ON CONFLICT (apunte_id, user_id) DO UPDATE SET rating = EXCLUDED.rating;

    SELECT COALESCE(SUM(rating), 0), COUNT(*)
    INTO v_new_sum, v_new_count
    FROM public.apunte_ratings WHERE apunte_id = p_resource_id;

    UPDATE public.notion_documents
    SET rating_sum = v_new_sum, rating_count = v_new_count
    WHERE id = p_resource_id;

  ELSIF p_type = 'file' THEN
    INSERT INTO public.file_ratings (file_id, user_id, rating)
    VALUES (p_resource_id, v_user_id, p_rating)
    ON CONFLICT (file_id, user_id) DO UPDATE SET rating = EXCLUDED.rating;

    SELECT COALESCE(SUM(rating), 0), COUNT(*)
    INTO v_new_sum, v_new_count
    FROM public.file_ratings WHERE file_id = p_resource_id;

    UPDATE public.library_files
    SET rating_sum = v_new_sum, rating_count = v_new_count
    WHERE id = p_resource_id;

  ELSIF p_type = 'folder' THEN
    INSERT INTO public.folder_ratings (folder_id, user_id, rating)
    VALUES (p_resource_id, v_user_id, p_rating)
    ON CONFLICT (folder_id, user_id) DO UPDATE SET rating = EXCLUDED.rating;

    SELECT COALESCE(SUM(rating), 0), COUNT(*)
    INTO v_new_sum, v_new_count
    FROM public.folder_ratings WHERE folder_id = p_resource_id;

    UPDATE public.library_folders
    SET rating_sum = v_new_sum, rating_count = v_new_count
    WHERE id = p_resource_id;

  ELSE
    RAISE EXCEPTION 'Tipo de recurso no válido: %', p_type;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'rating', p_rating,
    'rating_sum', v_new_sum,
    'rating_count', v_new_count
  );
END;
$$;

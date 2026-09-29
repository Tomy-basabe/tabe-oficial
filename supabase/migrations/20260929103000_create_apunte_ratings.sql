-- Migration: Create apunte_ratings table and ensure rating columns on notion_documents
-- Created at: 2026-09-29 10:30:00

CREATE TABLE IF NOT EXISTS public.apunte_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apunte_id UUID NOT NULL REFERENCES public.notion_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(apunte_id, user_id)
);

ALTER TABLE public.apunte_ratings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'apunte_ratings' AND policyname = 'Anyone can view apunte ratings'
  ) THEN
    CREATE POLICY "Anyone can view apunte ratings" ON public.apunte_ratings FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'apunte_ratings' AND policyname = 'Users can insert their own apunte ratings'
  ) THEN
    CREATE POLICY "Users can insert their own apunte ratings" ON public.apunte_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'apunte_ratings' AND policyname = 'Users can update their own apunte ratings'
  ) THEN
    CREATE POLICY "Users can update their own apunte ratings" ON public.apunte_ratings FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'apunte_ratings' AND policyname = 'Users can delete their own apunte ratings'
  ) THEN
    CREATE POLICY "Users can delete their own apunte ratings" ON public.apunte_ratings FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE public.notion_documents ADD COLUMN IF NOT EXISTS rating_sum NUMERIC DEFAULT 0;
ALTER TABLE public.notion_documents ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
UPDATE public.notion_documents SET rating_sum = 0 WHERE rating_sum IS NULL;
UPDATE public.notion_documents SET rating_count = 0 WHERE rating_count IS NULL;

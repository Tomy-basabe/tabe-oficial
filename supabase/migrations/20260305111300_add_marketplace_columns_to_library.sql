-- Migration: Add marketplace columns to library tables
-- Created at: 2026-03-05 11:13:00

ALTER TABLE public.library_files 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_sum NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

ALTER TABLE public.library_folders 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_sum NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- RLS Policies (Ensure public access for sharing)
CREATE POLICY "Public library files are viewable by everyone" ON public.library_files
    FOR SELECT USING (is_public = true);

CREATE POLICY "Public library folders are viewable by everyone" ON public.library_folders
    FOR SELECT USING (is_public = true);

-- RPC to increment download count safely
CREATE OR REPLACE FUNCTION increment_download_count(row_id UUID, table_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('UPDATE public.%I SET download_count = download_count + 1 WHERE id = %L', table_name, row_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for updating resources
CREATE POLICY "Allow individual update for library_folders" ON public.library_folders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow individual update for library_files" ON public.library_files
    FOR UPDATE USING (auth.uid() = user_id);


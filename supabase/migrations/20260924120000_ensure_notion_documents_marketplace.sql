-- Migration: Ensure notion_documents has all marketplace columns and defaults
-- Created at: 2026-09-24 12:00:00

ALTER TABLE public.notion_documents 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_sum NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- Ensure default values for existing rows
UPDATE public.notion_documents SET download_count = 0 WHERE download_count IS NULL;
UPDATE public.notion_documents SET rating_sum = 0 WHERE rating_sum IS NULL;
UPDATE public.notion_documents SET rating_count = 0 WHERE rating_count IS NULL;
UPDATE public.notion_documents SET is_public = false WHERE is_public IS NULL;
UPDATE public.notion_documents SET is_anonymous = false WHERE is_anonymous IS NULL;

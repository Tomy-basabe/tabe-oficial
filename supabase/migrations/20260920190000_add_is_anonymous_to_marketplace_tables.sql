-- Migration: Add is_anonymous column to all marketplace tables
-- Allows students to publish resources anonymously

ALTER TABLE public.flashcard_decks 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

ALTER TABLE public.library_files 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

ALTER TABLE public.library_folders 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

ALTER TABLE public.quiz_decks 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

ALTER TABLE public.notion_documents 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

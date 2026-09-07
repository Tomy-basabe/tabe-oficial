-- ============================================================
-- TABE Security Hardening Migration
-- Covers: RLS enforcement, storage policies, monitoring
-- ============================================================

-- ============================================================
-- 4. ACTIVATE RLS ON ALL TABLES
-- Ensure RLS is enabled on every relevant table.
-- (Most tables should already have RLS; this is a safety net)
-- ============================================================

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT IN ('schema_migrations')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
  END LOOP;
END;
$$;

-- ============================================================
-- 13. ENABLE QUERY MONITORING (pg_stat_statements)
-- ============================================================

-- Enable pg_stat_statements extension for query monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ============================================================
-- 5. ENABLE PGCRYPTO FOR SENSITIVE DATA ENCRYPTION
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 16. STORAGE BUCKET SECURITY POLICIES
-- Ensure library-files bucket has proper RLS
-- ============================================================

-- Policy: Users can only upload to their own folder
DO $$
BEGIN
  -- Insert policy: users can only insert into their own folder
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
    AND policyname = 'Users can upload to own folder'
  ) THEN
    CREATE POLICY "Users can upload to own folder"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'library-files' 
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  -- Select policy: users can read their own files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
    AND policyname = 'Users can read own files'
  ) THEN
    CREATE POLICY "Users can read own files"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'library-files' 
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  -- Delete policy: users can delete their own files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
    AND policyname = 'Users can delete own files'
  ) THEN
    CREATE POLICY "Users can delete own files"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'library-files' 
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  -- Update policy: users can update their own files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' 
    AND policyname = 'Users can update own files'
  ) THEN
    CREATE POLICY "Users can update own files"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'library-files' 
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END;
$$;

-- ============================================================
-- Set storage bucket file size limit (25MB)
-- ============================================================

UPDATE storage.buckets 
SET file_size_limit = 26214400, -- 25 MB
    allowed_mime_types = ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/markdown',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ]
WHERE id = 'library-files';

-- ============================================================
-- 17. ADD PAGINATION SAFETY NETS
-- Create a function to enforce query limits
-- ============================================================

CREATE OR REPLACE FUNCTION public.safe_paginated_query(
  table_name text,
  user_id_val uuid,
  page_size int DEFAULT 50,
  page_offset int DEFAULT 0
)
RETURNS SETOF record
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Enforce maximum page size of 100
  IF page_size > 100 THEN
    page_size := 100;
  END IF;
  IF page_size < 1 THEN
    page_size := 1;
  END IF;
  IF page_offset < 0 THEN
    page_offset := 0;
  END IF;
  
  RETURN QUERY EXECUTE format(
    'SELECT * FROM public.%I WHERE user_id = $1 LIMIT $2 OFFSET $3',
    table_name
  ) USING user_id_val, page_size, page_offset;
END;
$$;

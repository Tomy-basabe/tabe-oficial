-- ==============================================================================
-- MIGRATION: 20261105160000_ensure_notion_images_bucket.sql
-- Asegurar bucket 'notion-images' y permisos RLS de subida/lectura para apuntes
-- ==============================================================================

-- 1. Crear o actualizar el bucket 'notion-images' con límites seguros
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notion-images',
  'notion-images',
  true,
  10485760, -- 10 MB límite
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Asegurar políticas RLS para 'notion-images'
DROP POLICY IF EXISTS "Public can view notion images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload notion images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload notion images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own notion images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own notion images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload notion images" ON storage.objects;

-- Lectura pública (para poder ver las imágenes en los apuntes sin tokens privados)
CREATE POLICY "Public can view notion images"
ON storage.objects FOR SELECT
USING (bucket_id = 'notion-images');

-- Subida permitida tanto a usuarios autenticados como anónimos/invitados en la app
CREATE POLICY "Users can upload notion images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'notion-images');

-- Actualización y borrado
CREATE POLICY "Users can update own notion images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'notion-images'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'notion-images'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Users can delete own notion images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'notion-images'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

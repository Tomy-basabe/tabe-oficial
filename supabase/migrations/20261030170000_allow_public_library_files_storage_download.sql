-- Permite descargar/leer archivos de Storage que hayan sido compartidos públicamente en la comunidad
DROP POLICY IF EXISTS "Public library files can be viewed by anyone" ON storage.objects;
DROP POLICY IF EXISTS "Public library files are readable by everyone" ON storage.objects;

CREATE POLICY "Public library files are readable by everyone"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'library-files'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.library_files 
      WHERE library_files.storage_path = storage.objects.name 
      AND library_files.is_public = true
    )
  )
);

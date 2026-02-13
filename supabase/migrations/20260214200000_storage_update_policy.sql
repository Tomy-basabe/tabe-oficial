-- Allow updates (overwrite) for library files
CREATE POLICY "Users can update their own library files" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'library-files' AND auth.uid()::text = (storage.foldername(name))[1]) WITH CHECK (bucket_id = 'library-files' AND auth.uid()::text = (storage.foldername(name))[1]);

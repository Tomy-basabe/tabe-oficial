-- Add unique constraint to storage_path for upsert support
ALTER TABLE library_files ADD CONSTRAINT library_files_storage_path_key UNIQUE (storage_path);

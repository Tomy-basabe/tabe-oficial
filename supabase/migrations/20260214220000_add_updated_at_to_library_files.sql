-- Add updated_at column to library_files table
ALTER TABLE library_files 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

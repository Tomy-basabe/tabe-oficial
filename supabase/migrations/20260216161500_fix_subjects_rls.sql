-- Enable RLS for subjects (ensure it is enabled)
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to INSERT subjects
CREATE POLICY "Authenticated users can insert subjects" ON subjects
FOR INSERT TO authenticated
WITH CHECK (true);

-- Policy to allow authenticated users to UPDATE subjects
CREATE POLICY "Authenticated users can update subjects" ON subjects
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Policy to allow authenticated users to DELETE subjects
CREATE POLICY "Authenticated users can delete subjects" ON subjects
FOR DELETE TO authenticated
USING (true);


-- Enable RLS for subject_dependencies (ensure it is enabled)
ALTER TABLE subject_dependencies ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to INSERT dependencies
CREATE POLICY "Authenticated users can insert dependencies" ON subject_dependencies
FOR INSERT TO authenticated
WITH CHECK (true);

-- Policy to allow authenticated users to DELETE dependencies
CREATE POLICY "Authenticated users can delete dependencies" ON subject_dependencies
FOR DELETE TO authenticated
USING (true);

-- Professors table
CREATE TABLE IF NOT EXISTS professors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  rol text CHECK (rol IN ('teoria', 'practica')),
  descripcion text,
  color_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Professor office hours
CREATE TABLE IF NOT EXISTS professor_office_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dia text NOT NULL CHECK (dia IN ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado')),
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  CHECK (hora_fin > hora_inicio)
);

-- RLS
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE professor_office_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own professors"
  ON professors FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own office hours"
  ON professor_office_hours FOR ALL USING (auth.uid() = user_id);

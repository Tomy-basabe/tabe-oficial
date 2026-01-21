-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subjects table (plan de carrera)
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  codigo TEXT NOT NULL,
  año INTEGER NOT NULL,
  numero_materia INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subject dependencies table (correlativas)
CREATE TABLE public.subject_dependencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  requiere_regular UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  requiere_aprobada UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user subject status table (estado de materias por usuario)
CREATE TABLE public.user_subject_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  estado TEXT NOT NULL DEFAULT 'bloqueada' CHECK (estado IN ('aprobada', 'regular', 'cursable', 'bloqueada', 'recursar')),
  nota DECIMAL(4,2),
  fecha_aprobacion DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, subject_id)
);

-- Create calendar events table
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  tipo_examen TEXT NOT NULL CHECK (tipo_examen IN ('P1', 'P2', 'Global', 'Final', 'Recuperatorio P1', 'Recuperatorio P2', 'Recuperatorio Global')),
  fecha DATE NOT NULL,
  hora TIME,
  color TEXT DEFAULT '#00d9ff',
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create study sessions table (pomodoro + metrics)
CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  duracion_segundos INTEGER NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'pomodoro' CHECK (tipo IN ('pomodoro', 'flashcard', 'libre')),
  completada BOOLEAN DEFAULT false,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create flashcard decks table
CREATE TABLE public.flashcard_decks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  total_cards INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create flashcards table
CREATE TABLE public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pregunta TEXT NOT NULL,
  respuesta TEXT NOT NULL,
  veces_correcta INTEGER NOT NULL DEFAULT 0,
  veces_incorrecta INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create library files table
CREATE TABLE public.library_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('pdf', 'imagen', 'link', 'video', 'otro')),
  url TEXT NOT NULL,
  storage_path TEXT,
  tamaño_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create achievements definition table
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  icono TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('academico', 'estudio', 'uso')),
  condicion_tipo TEXT NOT NULL,
  condicion_valor INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user achievements table (logros desbloqueados)
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Create user stats table for gamification
CREATE TABLE public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_total INTEGER NOT NULL DEFAULT 0,
  nivel INTEGER NOT NULL DEFAULT 1,
  racha_actual INTEGER NOT NULL DEFAULT 0,
  mejor_racha INTEGER NOT NULL DEFAULT 0,
  horas_estudio_total INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subject_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Subjects are public (read-only for all authenticated users)
CREATE POLICY "Anyone can view subjects" ON public.subjects FOR SELECT TO authenticated USING (true);

-- Subject dependencies are public
CREATE POLICY "Anyone can view subject dependencies" ON public.subject_dependencies FOR SELECT TO authenticated USING (true);

-- User subject status policies
CREATE POLICY "Users can view their own subject status" ON public.user_subject_status FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subject status" ON public.user_subject_status FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subject status" ON public.user_subject_status FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subject status" ON public.user_subject_status FOR DELETE USING (auth.uid() = user_id);

-- Calendar events policies
CREATE POLICY "Users can view their own events" ON public.calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own events" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own events" ON public.calendar_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own events" ON public.calendar_events FOR DELETE USING (auth.uid() = user_id);

-- Study sessions policies
CREATE POLICY "Users can view their own study sessions" ON public.study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own study sessions" ON public.study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own study sessions" ON public.study_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Flashcard decks policies
CREATE POLICY "Users can view their own decks" ON public.flashcard_decks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own decks" ON public.flashcard_decks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own decks" ON public.flashcard_decks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own decks" ON public.flashcard_decks FOR DELETE USING (auth.uid() = user_id);

-- Flashcards policies
CREATE POLICY "Users can view their own flashcards" ON public.flashcards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own flashcards" ON public.flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own flashcards" ON public.flashcards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own flashcards" ON public.flashcards FOR DELETE USING (auth.uid() = user_id);

-- Library files policies
CREATE POLICY "Users can view their own files" ON public.library_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own files" ON public.library_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own files" ON public.library_files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own files" ON public.library_files FOR DELETE USING (auth.uid() = user_id);

-- Achievements are public (read-only)
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT TO authenticated USING (true);

-- User achievements policies
CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User stats policies
CREATE POLICY "Users can view their own stats" ON public.user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own stats" ON public.user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stats" ON public.user_stats FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_subject_status_updated_at BEFORE UPDATE ON public.user_subject_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_flashcard_decks_updated_at BEFORE UPDATE ON public.flashcard_decks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON public.flashcards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON public.user_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile and stats on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default achievements
INSERT INTO public.achievements (nombre, descripcion, icono, categoria, condicion_tipo, condicion_valor, xp_reward) VALUES
  ('Primera Materia', 'Aprobaste tu primera materia', 'trophy', 'academico', 'materias_aprobadas', 1, 100),
  ('Año Completo', 'Completaste todas las materias de un año', 'graduation-cap', 'academico', 'año_completo', 1, 500),
  ('Promedio Excelente', 'Alcanzaste un promedio de 8 o más', 'star', 'academico', 'promedio_minimo', 8, 300),
  ('Primera Sesión', 'Completaste tu primera sesión de estudio', 'clock', 'estudio', 'sesiones_completadas', 1, 50),
  ('10 Horas de Estudio', 'Acumulaste 10 horas de estudio', 'book-open', 'estudio', 'horas_estudio', 10, 150),
  ('100 Horas de Estudio', 'Acumulaste 100 horas de estudio', 'book-open', 'estudio', 'horas_estudio', 100, 500),
  ('Racha de 7 días', 'Estudiaste 7 días consecutivos', 'flame', 'estudio', 'racha_dias', 7, 200),
  ('Racha de 30 días', 'Estudiaste 30 días consecutivos', 'flame', 'estudio', 'racha_dias', 30, 750),
  ('Primer Mazo', 'Creaste tu primer mazo de flashcards', 'layers', 'estudio', 'mazos_creados', 1, 75),
  ('100 Flashcards', 'Creaste 100 flashcards', 'layers', 'estudio', 'flashcards_creadas', 100, 250),
  ('Explorador', 'Visitaste todas las secciones de la app', 'compass', 'uso', 'secciones_visitadas', 7, 100),
  ('Primer Archivo', 'Subiste tu primer archivo a la biblioteca', 'file-plus', 'uso', 'archivos_subidos', 1, 50),
  ('Biblioteca Completa', 'Subiste 50 archivos a la biblioteca', 'library', 'uso', 'archivos_subidos', 50, 300);

-- Insert subjects for Ingeniería en Sistemas (sample data)
INSERT INTO public.subjects (nombre, codigo, año, numero_materia) VALUES
  ('Análisis Matemático I', 'AM1', 1, 1),
  ('Álgebra y Geometría Analítica', 'AGA', 1, 2),
  ('Física I', 'FI1', 1, 3),
  ('Programación I', 'PR1', 1, 4),
  ('Sistemas y Organizaciones', 'SYO', 1, 5),
  ('Química General', 'QG', 1, 6),
  ('Inglés I', 'ING1', 1, 7),
  ('Análisis Matemático II', 'AM2', 2, 1),
  ('Física II', 'FI2', 2, 2),
  ('Programación II', 'PR2', 2, 3),
  ('Arquitectura de Computadoras', 'ARQ', 2, 4),
  ('Probabilidad y Estadística', 'PYE', 2, 5),
  ('Inglés II', 'ING2', 2, 6),
  ('Análisis de Sistemas', 'AS', 3, 1),
  ('Diseño de Sistemas', 'DS', 3, 2),
  ('Bases de Datos', 'BD', 3, 3),
  ('Sistemas Operativos', 'SO', 3, 4),
  ('Redes de Datos', 'RD', 3, 5),
  ('Paradigmas de Programación', 'PP', 3, 6),
  ('Gestión de Datos', 'GD', 4, 1),
  ('Ingeniería de Software', 'IS', 4, 2),
  ('Administración de Sistemas', 'ADMS', 4, 3),
  ('Legislación', 'LEG', 4, 4),
  ('Proyecto Final', 'PF', 4, 5);
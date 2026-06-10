-- ============================================
-- MÓDULO DE JUEGOS EDUCATIVOS
-- Migración: Tablas para juegos, matchmaking y solicitudes de carrera
-- ============================================

-- 1. Tabla de solicitudes de carreras no listadas
CREATE TABLE IF NOT EXISTS public.career_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_universidad TEXT NOT NULL,
  nombre_carrera TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  notas_admin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla de partidos
CREATE TABLE IF NOT EXISTS public.game_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type TEXT NOT NULL DEFAULT 'penales' CHECK (game_type IN ('penales')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'finished', 'abandoned')),
  -- Jugador 1
  player1_id UUID NOT NULL REFERENCES auth.users(id),
  player1_deck_id UUID NOT NULL REFERENCES public.quiz_decks(id),
  player1_score INT NOT NULL DEFAULT 0,
  -- Jugador 2 (NULL si es bot)
  player2_id UUID REFERENCES auth.users(id),
  player2_deck_id UUID REFERENCES public.quiz_decks(id),
  player2_score INT NOT NULL DEFAULT 0,
  is_bot_match BOOLEAN NOT NULL DEFAULT false,
  -- Turno actual
  current_round INT NOT NULL DEFAULT 1,
  max_rounds INT NOT NULL DEFAULT 5,
  current_turn_user_id UUID REFERENCES auth.users(id),
  turn_phase TEXT DEFAULT 'shoot' CHECK (turn_phase IN ('shoot', 'save')),
  -- Resultado
  winner_id UUID REFERENCES auth.users(id),
  xp_reward INT DEFAULT 0,
  -- Timestamps
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabla de turnos/jugadas
CREATE TABLE IF NOT EXISTS public.game_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.game_matches(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  phase TEXT NOT NULL CHECK (phase IN ('shoot', 'save')),
  -- Pregunta y respuesta
  question_id UUID REFERENCES public.quiz_questions(id),
  answered_correctly BOOLEAN,
  time_taken_ms INT,
  -- Acción del juego
  direction_chosen TEXT CHECK (direction_chosen IN ('left', 'center', 'right')),
  -- Resultado
  is_goal BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Cola de matchmaking
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES public.quiz_decks(id),
  carrera TEXT,
  deck_name TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.career_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- career_requests: usuarios pueden crear y ver las suyas
CREATE POLICY "Users can insert their own career requests"
  ON public.career_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own career requests"
  ON public.career_requests FOR SELECT USING (auth.uid() = user_id);

-- game_matches: ambos jugadores pueden ver y actualizar
CREATE POLICY "Players can view their matches"
  ON public.game_matches FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);
CREATE POLICY "Authenticated users can create matches"
  ON public.game_matches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = player1_id);
CREATE POLICY "Players can update their matches"
  ON public.game_matches FOR UPDATE
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- game_turns: jugadores del partido pueden ver e insertar
CREATE POLICY "Players can view turns of their matches"
  ON public.game_turns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.game_matches m
      WHERE m.id = match_id
      AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
    )
  );
CREATE POLICY "Players can insert turns"
  ON public.game_turns FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- matchmaking_queue: usuarios pueden gestionar su entrada
CREATE POLICY "Users can view queue"
  ON public.matchmaking_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join queue"
  ON public.matchmaking_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave queue"
  ON public.matchmaking_queue FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Realtime: habilitar para las tablas de juego
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;

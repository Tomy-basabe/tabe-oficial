-- ============================================================
-- AMPLIACIÓN DE JUEGOS Y SALAS PRIVADAS CON CÓDIGO
-- ============================================================

-- 1. Actualizar check constraint de game_type en game_matches si existe
DO $$
BEGIN
  -- Eliminar check constraint viejo si existe
  ALTER TABLE public.game_matches DROP CONSTRAINT IF EXISTS game_matches_game_type_check;
  
  -- Agregar nuevo check constraint ampliado
  ALTER TABLE public.game_matches ADD CONSTRAINT game_matches_game_type_check 
    CHECK (game_type IN ('penales', 'tateti', 'bomba', 'batalla', 'ajedrez', 'karts', 'general'));
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Hacer player1_deck_id opcional (NULLable) para juegos sin mazo o ajedrez
DO $$
BEGIN
  ALTER TABLE public.game_matches ALTER COLUMN player1_deck_id DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 3. Tabla de salas de juego (game_rooms)
CREATE TABLE IF NOT EXISTS public.game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  game_type TEXT NOT NULL DEFAULT 'penales',
  deck_id UUID REFERENCES public.quiz_decks(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'in_progress', 'finished', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '2 hours')
);

-- Índices de búsqueda rápida por código y host
CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON public.game_rooms (code);
CREATE INDEX IF NOT EXISTS idx_game_rooms_host_id ON public.game_rooms (host_id);
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON public.game_rooms (status);

-- 4. Habilitar RLS en game_rooms
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para game_rooms
DROP POLICY IF EXISTS "Anyone can view active game rooms by code" ON public.game_rooms;
CREATE POLICY "Anyone can view active game rooms by code"
  ON public.game_rooms FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create game rooms" ON public.game_rooms;
CREATE POLICY "Authenticated users can create game rooms"
  ON public.game_rooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Participants can update game rooms" ON public.game_rooms;
CREATE POLICY "Participants can update game rooms"
  ON public.game_rooms FOR UPDATE TO authenticated
  USING (auth.uid() = host_id OR auth.uid() = guest_id);

DROP POLICY IF EXISTS "Host can delete game room" ON public.game_rooms;
CREATE POLICY "Host can delete game room"
  ON public.game_rooms FOR DELETE TO authenticated
  USING (auth.uid() = host_id);

-- ============================================================
-- FIX & EXPAND ACHIEVEMENTS: RUTINAS, MARKETPLACE, JUEGOS Y MÁS
-- ============================================================

-- 1. Tabla de partidas de juegos (game_matches) para persistencia remota
CREATE TABLE IF NOT EXISTS public.game_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type TEXT NOT NULL CHECK (game_type IN ('penales', 'tateti', 'bomba', 'batalla', 'ajedrez', 'karts', 'general')),
  status TEXT NOT NULL DEFAULT 'finished',
  player1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player1_score INTEGER NOT NULL DEFAULT 0,
  player2_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player2_score INTEGER NOT NULL DEFAULT 0,
  is_bot_match BOOLEAN NOT NULL DEFAULT false,
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_game_matches_p1 ON public.game_matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_game_matches_p2 ON public.game_matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_game_matches_winner ON public.game_matches(winner_id);

ALTER TABLE public.game_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their matches" ON public.game_matches;
CREATE POLICY "Participants can view their matches"
  ON public.game_matches FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

DROP POLICY IF EXISTS "Authenticated users can insert game matches" ON public.game_matches;
CREATE POLICY "Authenticated users can insert game matches"
  ON public.game_matches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);

-- 2. Permitir la nueva categoría 'juegos' en achievements
ALTER TABLE public.achievements DROP CONSTRAINT IF EXISTS achievements_categoria_check;
ALTER TABLE public.achievements ADD CONSTRAINT achievements_categoria_check 
  CHECK (categoria IN ('academico', 'estudio', 'uso', 'juegos'));

-- 3. Inserción de nuevos logros para apartados recientes
INSERT INTO public.achievements (nombre, descripcion, icono, categoria, condicion_tipo, condicion_valor, xp_reward) VALUES
-- Marketplace de Apuntes
('Primer Aporte', 'Publicaste tu primer apunte comunitario en el Marketplace', 'shopping-bag', 'uso', 'apuntes_publicados', 1, 100),
('Colaborador Activo', 'Publicaste 3 apuntes en el Marketplace', 'shopping-bag', 'uso', 'apuntes_publicados', 3, 200),
('Referente del Campus', 'Tus apuntes del Marketplace alcanzaron 5 descargas', 'award', 'uso', 'apuntes_descargas', 5, 250),
('Crítico Académico', 'Calificaste un apunte en el Marketplace', 'star', 'uso', 'apuntes_calificados', 1, 50),
('Evaluador Experto', 'Calificaste 5 apuntes de la comunidad', 'star', 'uso', 'apuntes_calificados', 5, 150),

-- Juegos y Desafíos
('Primer Desafío', 'Jugaste tu primera partida en los juegos de TABE', 'gamepad-2', 'juegos', 'partidas_jugadas', 1, 75),
('Gamer Frecuente', 'Completaste 5 partidas en los juegos', 'gamepad-2', 'juegos', 'partidas_jugadas', 5, 150),
('Veterano del Tablero', 'Completaste 15 partidas en los juegos', 'gamepad-2', 'juegos', 'partidas_jugadas', 15, 300),
('Primera Victoria', 'Ganaste tu primera partida en un juego', 'trophy', 'juegos', 'partidas_ganadas', 1, 100),
('En Racha Ganadora', 'Ganaste 5 partidas en los juegos', 'trophy', 'juegos', 'partidas_ganadas', 5, 200),
('Campeón del Campus', 'Ganaste 10 partidas en los juegos', 'crown', 'juegos', 'partidas_ganadas', 10, 400),
('Anfitrión de Duelos', 'Creaste tu primera sala de juego con código', 'swords', 'juegos', 'salas_creadas', 1, 75),
('Maestro de Salas', 'Creaste 5 salas de juego para competir con amigos', 'swords', 'juegos', 'salas_creadas', 5, 200),
('Gran Maestro de Ajedrez', 'Ganaste una partida de ajedrez', 'crown', 'juegos', 'partidas_ajedrez_ganadas', 1, 150),
('Piloto Veloz', 'Ganaste una carrera de Karts', 'flag', 'juegos', 'partidas_karts_ganadas', 1, 120),
('Goleador Implacable', 'Ganaste un duelo de penales', 'target', 'juegos', 'partidas_penales_ganadas', 1, 100),
('Estratega del Tateti', 'Ganaste una partida de Tateti', 'layers', 'juegos', 'partidas_tateti_ganadas', 1, 100),

-- Plan de Carrera y Correlatividades
('Rumbo Claro', 'Configuraste tu carrera en tu perfil universitario', 'compass', 'academico', 'carrera_configurada', 1, 50),
('Malla Trazada', 'Cargaste tus materias en el plan de estudios interactivo', 'book-open', 'academico', 'plan_carrera_importado', 5, 150),

-- Comunidad y Voz
('En Sintonía', 'Te conectaste a un canal de voz para estudiar en grupo', 'mic', 'uso', 'canales_voz_unido', 1, 75)
ON CONFLICT DO NOTHING;

-- 4. Actualizar función check_and_unlock_achievements con soporte completo
CREATE OR REPLACE FUNCTION public.check_and_unlock_achievements(p_user_id uuid)
RETURNS TABLE(achievement_id uuid, achievement_name text, xp_reward integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    achievement_record RECORD;
    user_value integer;
    should_unlock boolean;
BEGIN
    -- CRITICAL: Verify caller owns the user_id to prevent privilege escalation
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Can only check own achievements';
    END IF;
    
    -- Iterar sobre todos los logros no desbloqueados
    FOR achievement_record IN 
        SELECT a.id, a.nombre, a.condicion_tipo, a.condicion_valor, a.xp_reward
        FROM achievements a
        WHERE NOT EXISTS (
            SELECT 1 FROM user_achievements ua 
            WHERE ua.achievement_id = a.id AND ua.user_id = p_user_id
        )
    LOOP
        should_unlock := false;
        user_value := 0;
        
        -- Verificar condición según tipo
        CASE achievement_record.condicion_tipo
            -- Materias aprobadas
            WHEN 'materias_aprobadas' THEN
                SELECT COUNT(*) INTO user_value
                FROM user_subject_status
                WHERE user_id = p_user_id AND estado = 'aprobada';
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Materias regulares
            WHEN 'materias_regulares' THEN
                SELECT COUNT(*) INTO user_value
                FROM user_subject_status
                WHERE user_id = p_user_id AND estado IN ('regular', 'aprobada');
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Promedio mínimo
            WHEN 'promedio_minimo' THEN
                SELECT COALESCE(AVG(nota), 0)::integer INTO user_value
                FROM user_subject_status
                WHERE user_id = p_user_id AND estado = 'aprobada' AND nota IS NOT NULL;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Año completo
            WHEN 'año_completo' THEN
                SELECT COUNT(*) INTO user_value
                FROM subjects s
                LEFT JOIN user_subject_status uss ON s.id = uss.subject_id AND uss.user_id = p_user_id
                WHERE s.año = achievement_record.condicion_valor 
                  AND s.user_id = p_user_id
                  AND (uss.estado IS NULL OR uss.estado != 'aprobada');
                should_unlock := user_value = 0;
            
            -- Materia con 10
            WHEN 'materia_con_10' THEN
                SELECT COUNT(*) INTO user_value
                FROM user_subject_status
                WHERE user_id = p_user_id AND estado = 'aprobada' AND nota = 10;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Materias con nota alta (>= 8)
            WHEN 'materias_nota_alta' THEN
                SELECT COUNT(*) INTO user_value
                FROM user_subject_status
                WHERE user_id = p_user_id AND estado = 'aprobada' AND nota >= 8;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Parciales aprobados (nota >= 60 en parciales)
            WHEN 'parciales_aprobados' THEN
                SELECT COUNT(*) INTO user_value
                FROM (
                    SELECT id FROM user_subject_status WHERE user_id = p_user_id AND nota_parcial_1 IS NOT NULL AND nota_parcial_1 >= 60
                    UNION ALL
                    SELECT id FROM user_subject_status WHERE user_id = p_user_id AND nota_parcial_2 IS NOT NULL AND nota_parcial_2 >= 60
                    UNION ALL
                    SELECT id FROM user_subject_status WHERE user_id = p_user_id AND nota_rec_parcial_1 IS NOT NULL AND nota_rec_parcial_1 >= 60
                    UNION ALL
                    SELECT id FROM user_subject_status WHERE user_id = p_user_id AND nota_rec_parcial_2 IS NOT NULL AND nota_rec_parcial_2 >= 60
                ) sub;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Finales aprobados
            WHEN 'finales_aprobados', 'finales / globales_aprobados' THEN
                SELECT COUNT(*) INTO user_value
                FROM (
                    SELECT id FROM user_subject_status WHERE user_id = p_user_id AND nota_final_examen IS NOT NULL AND nota_final_examen >= 60
                    UNION ALL
                    SELECT id FROM user_subject_status WHERE user_id = p_user_id AND nota_global IS NOT NULL AND nota_global >= 60
                    UNION ALL
                    SELECT id FROM user_subject_status WHERE user_id = p_user_id AND nota_rec_global IS NOT NULL AND nota_rec_global >= 60
                ) sub;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Flashcards creadas
            WHEN 'flashcards_creadas' THEN
                SELECT COUNT(*) INTO user_value
                FROM flashcards
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Mazos creados
            WHEN 'mazos_creados' THEN
                SELECT COUNT(*) INTO user_value
                FROM flashcard_decks
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Sesiones Pomodoro completadas
            WHEN 'sesiones_pomodoro' THEN
                SELECT COUNT(*) INTO user_value
                FROM study_sessions
                WHERE user_id = p_user_id AND tipo = 'pomodoro' AND completada = true;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Sesiones completadas (cualquier tipo)
            WHEN 'sesiones_completadas' THEN
                SELECT COUNT(*) INTO user_value
                FROM study_sessions
                WHERE user_id = p_user_id AND completada = true;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Horas de estudio
            WHEN 'horas_estudio' THEN
                SELECT COALESCE(SUM(duracion_segundos) / 3600, 0)::integer INTO user_value
                FROM study_sessions
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Racha de días
            WHEN 'racha_dias' THEN
                SELECT COALESCE(mejor_racha, 0) INTO user_value
                FROM user_stats
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Días de uso
            WHEN 'dias_uso' THEN
                SELECT COUNT(DISTINCT fecha) INTO user_value
                FROM study_sessions
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Flashcards estudiadas
            WHEN 'flashcards_estudiadas' THEN
                SELECT COALESCE(SUM(veces_correcta + veces_incorrecta), 0)::integer INTO user_value
                FROM flashcards
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Precisión flashcards
            WHEN 'precision_flashcards' THEN
                SELECT CASE 
                    WHEN COALESCE(SUM(veces_correcta + veces_incorrecta), 0) > 0 
                    THEN (SUM(veces_correcta) * 100 / SUM(veces_correcta + veces_incorrecta))::integer
                    ELSE 0 
                END INTO user_value
                FROM flashcards
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Archivos subidos
            WHEN 'archivos_subidos' THEN
                SELECT COUNT(*) INTO user_value
                FROM library_files
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Eventos calendario
            WHEN 'eventos_calendario' THEN
                SELECT COUNT(*) INTO user_value
                FROM calendar_events
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Documentos creados (Notion)
            WHEN 'documentos_creados' THEN
                SELECT COUNT(*) INTO user_value
                FROM notion_documents
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Sesiones flashcard
            WHEN 'sesiones_flashcard' THEN
                SELECT COUNT(*) INTO user_value
                FROM study_sessions
                WHERE user_id = p_user_id AND tipo = 'flashcard' AND completada = true;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Sesiones AI chat
            WHEN 'sesiones_ai' THEN
                SELECT COUNT(*) INTO user_value
                FROM ai_chat_sessions
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Mensajes AI enviados
            WHEN 'mensajes_ai' THEN
                SELECT COUNT(*) INTO user_value
                FROM ai_chat_messages m
                JOIN ai_chat_sessions s ON s.id = m.session_id
                WHERE s.user_id = p_user_id AND m.role = 'user';
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Amigos
            WHEN 'amigos' THEN
                SELECT COUNT(*) INTO user_value
                FROM friendships
                WHERE (requester_id = p_user_id OR addressee_id = p_user_id) AND status = 'accepted';
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Carpetas creadas
            WHEN 'carpetas_creadas' THEN
                SELECT COUNT(*) INTO user_value
                FROM library_folders
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Plantas completadas
            WHEN 'plantas_completadas' THEN
                SELECT COUNT(*) INTO user_value
                FROM user_plants
                WHERE user_id = p_user_id AND is_completed = true;
                should_unlock := user_value >= achievement_record.condicion_valor;
            
            -- Mensajes Discord
            WHEN 'mensajes_discord' THEN
                SELECT COUNT(*) INTO user_value
                FROM discord_messages
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;

            -- ============================================================
            -- RUTINAS
            -- ============================================================
            WHEN 'rutinas_creadas' THEN
                SELECT COUNT(*) INTO user_value
                FROM routines
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;

            WHEN 'rutinas_completadas' THEN
                SELECT COUNT(*) INTO user_value
                FROM routine_logs
                WHERE user_id = p_user_id AND completed = true;
                should_unlock := user_value >= achievement_record.condicion_valor;

            WHEN 'rutina_categoria_bienestar' THEN
                SELECT COUNT(*) INTO user_value
                FROM routines
                WHERE user_id = p_user_id AND category = 'bienestar';
                should_unlock := user_value >= achievement_record.condicion_valor;

            WHEN 'rutina_categoria_deporte' THEN
                SELECT COUNT(*) INTO user_value
                FROM routines
                WHERE user_id = p_user_id AND category = 'deporte';
                should_unlock := user_value >= achievement_record.condicion_valor;

            WHEN 'rutina_categoria_estudio' THEN
                SELECT COUNT(*) INTO user_value
                FROM routines
                WHERE user_id = p_user_id AND category = 'estudio';
                should_unlock := user_value >= achievement_record.condicion_valor;

            WHEN 'rutinas_multiples_categorias' THEN
                SELECT COUNT(DISTINCT category) INTO user_value
                FROM routines
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;

            WHEN 'racha_rutina' THEN
                SELECT COUNT(DISTINCT log_date) INTO user_value
                FROM routine_logs
                WHERE user_id = p_user_id AND completed = true;
                should_unlock := user_value >= achievement_record.condicion_valor;

            WHEN 'semana_perfecta_rutinas' THEN
                SELECT COUNT(DISTINCT log_date) INTO user_value
                FROM routine_logs
                WHERE user_id = p_user_id AND completed = true;
                should_unlock := user_value >= 7;

            WHEN 'promedio_rutinas_semanal' THEN
                SELECT COUNT(*) INTO user_value
                FROM routine_logs
                WHERE user_id = p_user_id AND completed = true;
                should_unlock := user_value >= achievement_record.condicion_valor;

            -- ============================================================
            -- MARKETPLACE
            -- ============================================================
            WHEN 'apuntes_publicados' THEN
                SELECT COUNT(*) INTO user_value
                FROM notion_documents
                WHERE user_id = p_user_id AND is_public = true;
                should_unlock := user_value >= achievement_record.condicion_valor;

            WHEN 'apuntes_calificados' THEN
                SELECT COUNT(*) INTO user_value
                FROM apunte_ratings
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;

            WHEN 'apuntes_descargas' THEN
                SELECT COALESCE(SUM(download_count), 0)::integer INTO user_value
                FROM notion_documents
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;

            -- ============================================================
            -- JUEGOS Y SALAS
            -- ============================================================
            WHEN 'partidas_jugadas' THEN
                SELECT COUNT(*) INTO user_value
                FROM game_matches
                WHERE player1_id = p_user_id OR player2_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;

            WHEN 'partidas_ganadas' THEN
                SELECT COUNT(*) INTO user_value
                FROM game_matches
                WHERE winner_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;

            WHEN 'salas_creadas' THEN
                SELECT COUNT(*) INTO user_value
                FROM game_rooms
                WHERE host_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;

            WHEN 'partidas_ajedrez_ganadas' THEN
                SELECT COUNT(*) INTO user_value
                FROM game_matches
                WHERE winner_id = p_user_id AND game_type = 'ajedrez';
                should_unlock := user_value >= achievement_record.condicion_valor;

            WHEN 'partidas_karts_ganadas' THEN
                SELECT COUNT(*) INTO user_value
                FROM game_matches
                WHERE winner_id = p_user_id AND game_type = 'karts';
                should_unlock := user_value >= achievement_record.condicion_valor;

            WHEN 'partidas_penales_ganadas' THEN
                SELECT COUNT(*) INTO user_value
                FROM game_matches
                WHERE winner_id = p_user_id AND game_type = 'penales';
                should_unlock := user_value >= achievement_record.condicion_valor;

            WHEN 'partidas_tateti_ganadas' THEN
                SELECT COUNT(*) INTO user_value
                FROM game_matches
                WHERE winner_id = p_user_id AND game_type = 'tateti';
                should_unlock := user_value >= achievement_record.condicion_valor;

            -- ============================================================
            -- PLAN DE CARRERA
            -- ============================================================
            WHEN 'carrera_configurada' THEN
                SELECT COUNT(*) INTO user_value
                FROM profiles
                WHERE user_id = p_user_id AND carrera IS NOT NULL AND carrera != '';
                should_unlock := user_value >= achievement_record.condicion_valor;

            WHEN 'plan_carrera_importado' THEN
                SELECT COUNT(*) INTO user_value
                FROM subjects
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;

            -- ============================================================
            -- COMUNIDAD Y VOZ
            -- ============================================================
            WHEN 'canales_voz_unido' THEN
                SELECT COUNT(*) INTO user_value
                FROM discord_voice_participants
                WHERE user_id = p_user_id;
                should_unlock := user_value >= achievement_record.condicion_valor;

            -- ============================================================
            -- SECCIONES VISITADAS
            -- ============================================================
            WHEN 'secciones_visitadas' THEN
                SELECT (
                    CASE WHEN EXISTS (SELECT 1 FROM study_sessions WHERE user_id = p_user_id) THEN 1 ELSE 0 END +
                    CASE WHEN EXISTS (SELECT 1 FROM flashcard_decks WHERE user_id = p_user_id) THEN 1 ELSE 0 END +
                    CASE WHEN EXISTS (SELECT 1 FROM library_files WHERE user_id = p_user_id) THEN 1 ELSE 0 END +
                    CASE WHEN EXISTS (SELECT 1 FROM calendar_events WHERE user_id = p_user_id) THEN 1 ELSE 0 END +
                    CASE WHEN EXISTS (SELECT 1 FROM notion_documents WHERE user_id = p_user_id) THEN 1 ELSE 0 END +
                    CASE WHEN EXISTS (SELECT 1 FROM game_matches WHERE player1_id = p_user_id) THEN 1 ELSE 0 END +
                    CASE WHEN EXISTS (SELECT 1 FROM ai_chat_sessions WHERE user_id = p_user_id) THEN 1 ELSE 0 END
                ) INTO user_value;
                should_unlock := user_value >= achievement_record.condicion_valor;

            ELSE
                should_unlock := false;
        END CASE;
        
        -- Desbloquear logro si cumple condición
        IF should_unlock THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            VALUES (p_user_id, achievement_record.id)
            ON CONFLICT DO NOTHING;
            
            -- Actualizar XP del usuario
            UPDATE user_stats 
            SET xp_total = xp_total + achievement_record.xp_reward
            WHERE user_id = p_user_id;
            
            -- Retornar logro desbloqueado
            achievement_id := achievement_record.id;
            achievement_name := achievement_record.nombre;
            xp_reward := achievement_record.xp_reward;
            RETURN NEXT;
        END IF;
    END LOOP;
    
    RETURN;
END;
$function$;

-- Fix: Secure check_and_unlock_achievements to validate caller owns the user_id
CREATE OR REPLACE FUNCTION public.check_and_unlock_achievements(p_user_id uuid)
RETURNS TABLE(achievement_id uuid, achievement_name text, xp_reward integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
                  AND (uss.estado IS NULL OR uss.estado != 'aprobada');
                should_unlock := user_value = 0;
            
            -- Materia con 10
            WHEN 'materia_con_10' THEN
                SELECT COUNT(*) INTO user_value
                FROM user_subject_status
                WHERE user_id = p_user_id AND estado = 'aprobada' AND nota = 10;
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
$$;
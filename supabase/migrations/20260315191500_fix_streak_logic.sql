-- Fix: handle_streak_update trigger to prevent multiple increments on the same day
-- This migration ensures that study streaks only increment once per calendar day.

CREATE OR REPLACE FUNCTION public.handle_streak_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    last_session_date DATE;
    current_streak INTEGER;
    current_freezes INTEGER;
    days_diff INTEGER;
BEGIN
    -- Ensure user_stats row exists (INSERT if not)
    INSERT INTO public.user_stats (user_id, xp_total, nivel, racha_actual, mejor_racha, horas_estudio_total)
    VALUES (NEW.user_id, 0, 1, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- CRITICAL FIX: Only update streak once per day
    -- If there's already another session today (excluding the current one), skip update
    IF EXISTS (
        SELECT 1 FROM public.study_sessions 
        WHERE user_id = NEW.user_id 
        AND fecha = NEW.fecha 
        AND id != NEW.id
    ) THEN
        RETURN NEW;
    END IF;

    -- Get current stats
    SELECT racha_actual, streak_freezes 
    INTO current_streak, current_freezes
    FROM public.user_stats
    WHERE user_id = NEW.user_id;

    current_streak := COALESCE(current_streak, 0);
    current_freezes := COALESCE(current_freezes, 0);

    -- Get date of last session BEFORE today
    SELECT MAX(fecha) INTO last_session_date
    FROM public.study_sessions
    WHERE user_id = NEW.user_id
    AND fecha < NEW.fecha;

    -- If no previous session on a different day
    IF last_session_date IS NULL THEN
        -- First session ever, or first session on a new day after having none before
        IF current_streak = 0 THEN
            UPDATE public.user_stats
            SET racha_actual = 1,
                mejor_racha = GREATEST(COALESCE(mejor_racha, 0), 1),
                updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;
        RETURN NEW;
    END IF;

    days_diff := NEW.fecha - last_session_date;

    IF days_diff = 1 THEN
        -- Perfect streak (consecutive day)
        UPDATE public.user_stats
        SET racha_actual = current_streak + 1,
            mejor_racha = GREATEST(COALESCE(mejor_racha, 0), current_streak + 1),
            updated_at = now()
        WHERE user_id = NEW.user_id;
        
    ELSIF days_diff > 1 THEN
        -- Missed days
        IF current_freezes > 0 THEN
            UPDATE public.user_stats
            SET racha_actual = current_streak + 1,
                mejor_racha = GREATEST(COALESCE(mejor_racha, 0), current_streak + 1),
                streak_freezes = current_freezes - 1,
                updated_at = now()
            WHERE user_id = NEW.user_id;
        ELSE
            UPDATE public.user_stats
            SET racha_actual = 1,
                updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Migration: Rewrite streak trigger to be robust against out-of-order inserts
-- Created on 2026-03-21

CREATE OR REPLACE FUNCTION public.handle_streak_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    r RECORD;
    curr_streak INTEGER := 0;
    best_streak INTEGER := 0;
    last_date DATE := NULL;
    days_diff INTEGER;
BEGIN
    -- Ensure user_stats row exists (INSERT if not)
    INSERT INTO public.user_stats (user_id, xp_total, nivel, racha_actual, mejor_racha, horas_estudio_total)
    VALUES (NEW.user_id, 0, 1, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- CRITICAL FIX: Only update streak once per day to save performance if there's multiple sessions today.
    -- Wait, if we recalculate we don't necessarily NEED this, but it still saves CPU.
    IF EXISTS (
        SELECT 1 FROM public.study_sessions 
        WHERE user_id = NEW.user_id 
        AND fecha = NEW.fecha 
        AND id != NEW.id
    ) THEN
        RETURN NEW;
    END IF;

    -- Recalculate streak from scratch for the user to guarantee accuracy
    FOR r IN (
        SELECT DISTINCT fecha::DATE AS session_date
        FROM public.study_sessions 
        WHERE user_id = NEW.user_id 
        ORDER BY session_date ASC
    )
    LOOP
        IF last_date IS NULL THEN
            curr_streak := 1;
            best_streak := 1;
        ELSE
            days_diff := r.session_date - last_date;
            IF days_diff = 1 THEN
                curr_streak := curr_streak + 1;
                IF curr_streak > best_streak THEN
                    best_streak := curr_streak;
                END IF;
            ELSIF days_diff > 1 THEN
                -- Streak broken 
                curr_streak := 1;
            END IF;
        END IF;
        last_date := r.session_date;
    END LOOP;

    -- Update user_stats
    UPDATE public.user_stats
    SET racha_actual = curr_streak,
        mejor_racha = GREATEST(COALESCE(mejor_racha, 0), best_streak),
        updated_at = now()
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$function$;

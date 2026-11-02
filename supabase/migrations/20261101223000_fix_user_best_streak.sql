-- ==============================================================================
-- Migration: Corregir mejor_racha anómala y función de cálculo de racha máxima
-- Fecha: 2026-11-01
-- ==============================================================================

-- 1. Función para calcular la racha más larga de días consecutivos reales (islands & gaps)
CREATE OR REPLACE FUNCTION public.compute_real_user_best_streak(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_max_streak integer := 0;
BEGIN
  WITH user_dates AS (
    SELECT DISTINCT fecha::date AS f
    FROM public.study_sessions
    WHERE user_id = p_user_id AND fecha IS NOT NULL
  ),
  ranked AS (
    SELECT f, f - (ROW_NUMBER() OVER (ORDER BY f))::int * INTERVAL '1 day' AS grp
    FROM user_dates
  ),
  streaks AS (
    SELECT COUNT(*) AS streak_len
    FROM ranked
    GROUP BY grp
  )
  SELECT COALESCE(MAX(streak_len), 0) INTO v_max_streak FROM streaks;

  RETURN GREATEST(v_max_streak, 0);
END;
$$;

-- 2. Corregir el valor anómalo (104 que correspondía a total de sesiones no consecutivas) a la mejor racha real de 11
UPDATE public.user_stats
SET mejor_racha = 11
WHERE mejor_racha = 104;

-- 3. Para cualquier otro usuario cuya mejor_racha haya sido inflada por encima del conteo de fechas consecutivas
UPDATE public.user_stats us
SET mejor_racha = GREATEST(
  public.compute_real_user_streak(us.user_id),
  public.compute_real_user_best_streak(us.user_id),
  11 -- Asegura mantener al menos la mejor racha histórica del usuario
)
WHERE us.mejor_racha = 104;

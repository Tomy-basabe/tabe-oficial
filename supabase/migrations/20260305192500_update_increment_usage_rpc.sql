-- Update increment_usage to handle daily and monthly periods
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id uuid,
  p_feature text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period_start date;
  v_count integer;
BEGIN
  -- Determine period_start based on feature
  -- ia_daily uses a daily period
  -- others use a monthly period
  IF p_feature = 'ia_daily' THEN
    v_period_start := CURRENT_DATE;
  ELSE
    v_period_start := DATE_TRUNC('month', CURRENT_DATE)::date;
  END IF;

  INSERT INTO public.user_usage (user_id, feature, period_start, count)
  VALUES (p_user_id, p_feature, v_period_start, 1)
  ON CONFLICT (user_id, feature, period_start)
  DO UPDATE SET count = user_usage.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

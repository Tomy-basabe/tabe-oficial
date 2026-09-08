-- Per-user AI token budgets with an atomic rolling window.
-- The local TABE Base model does not use this table.
CREATE TABLE IF NOT EXISTS public.ai_token_budgets (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  task TEXT NOT NULL DEFAULT 'chat',
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  tokens_used BIGINT NOT NULL DEFAULT 0 CHECK (tokens_used >= 0),
  PRIMARY KEY (user_id, model_id, task)
);

ALTER TABLE public.ai_token_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own AI token budgets" ON public.ai_token_budgets;
CREATE POLICY "Users can view own AI token budgets"
  ON public.ai_token_budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.consume_ai_token_budget(
  p_user_id UUID,
  p_model_id TEXT,
  p_task TEXT,
  p_requested_tokens BIGINT,
  p_token_limit BIGINT,
  p_window_hours INTEGER DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_start TIMESTAMPTZ;
  current_used BIGINT;
  next_used BIGINT;
  account_plan TEXT;
  effective_limit BIGINT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF public.has_role(p_user_id, 'admin'::public.app_role) THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'unlimited', true,
      'tokens_used', 0,
      'tokens_remaining', NULL
    );
  END IF;

  SELECT COALESCE(plan, 'free')
    INTO account_plan
    FROM public.profiles
   WHERE user_id = p_user_id;

  -- Premium/Pro gets more capacity, but never unlimited usage.
  effective_limit := CASE
    WHEN account_plan IN ('premium', 'pro') THEN p_token_limit * 3
    ELSE p_token_limit
  END;

  IF p_requested_tokens <= 0 OR p_token_limit <= 0 OR p_window_hours <= 0 THEN
    RETURN jsonb_build_object('allowed', true, 'tokens_used', 0, 'tokens_remaining', effective_limit);
  END IF;

  INSERT INTO public.ai_token_budgets (user_id, model_id, task)
  VALUES (p_user_id, p_model_id, p_task)
  ON CONFLICT (user_id, model_id, task) DO NOTHING;

  SELECT window_start, tokens_used
    INTO current_start, current_used
    FROM public.ai_token_budgets
   WHERE user_id = p_user_id AND model_id = p_model_id AND task = p_task
   FOR UPDATE;

  IF current_start <= now() - make_interval(hours => p_window_hours) THEN
    current_start := now();
    current_used := 0;
  END IF;

  next_used := current_used + p_requested_tokens;
  IF next_used > effective_limit THEN
    UPDATE public.ai_token_budgets
       SET window_start = current_start, tokens_used = current_used
     WHERE user_id = p_user_id AND model_id = p_model_id AND task = p_task;
    RETURN jsonb_build_object(
      'allowed', false,
      'tokens_used', current_used,
      'tokens_remaining', GREATEST(effective_limit - current_used, 0),
      'window_start', current_start
    );
  END IF;

  UPDATE public.ai_token_budgets
     SET window_start = current_start, tokens_used = next_used
   WHERE user_id = p_user_id AND model_id = p_model_id AND task = p_task;

  RETURN jsonb_build_object(
    'allowed', true,
    'tokens_used', next_used,
    'tokens_remaining', GREATEST(effective_limit - next_used, 0),
    'window_start', current_start
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_token_budget(UUID, TEXT, TEXT, BIGINT, BIGINT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_ai_token_budget(UUID, TEXT, TEXT, BIGINT, BIGINT, INTEGER) TO authenticated;

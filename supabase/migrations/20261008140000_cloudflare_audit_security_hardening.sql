-- ==============================================================================
-- MIGRATION: 20261008140000_cloudflare_audit_security_hardening.sql
-- COMPREHENSIVE SECURITY HARDENING (CLOUDFLARE AUDIT REMEDIATION)
-- ==============================================================================

-- 1. HARDEN user_bots TABLE WITH ROW LEVEL SECURITY
CREATE TABLE IF NOT EXISTS public.user_bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    telegram_id TEXT,
    whatsapp_number TEXT,
    linking_code TEXT,
    linking_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_bots_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.user_bots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_bots_select_own" ON public.user_bots;
DROP POLICY IF EXISTS "user_bots_insert_own" ON public.user_bots;
DROP POLICY IF EXISTS "user_bots_update_own" ON public.user_bots;
DROP POLICY IF EXISTS "user_bots_delete_own" ON public.user_bots;

CREATE POLICY "user_bots_select_own"
ON public.user_bots FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "user_bots_insert_own"
ON public.user_bots FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_bots_update_own"
ON public.user_bots FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_bots_delete_own"
ON public.user_bots FOR DELETE
USING (auth.uid() = user_id);

-- 2. ENSURE PREREQUISITE TABLES & COLUMNS EXIST SAFELY
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT user_inventory_user_item_unique UNIQUE (user_id, item_type, item_id)
);

ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  period_start DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_usage_user_feature_period_key UNIQUE (user_id, feature, period_start)
);

ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- Ensure columns exist in user_stats before adding check constraints or running RPCs
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS xp_multiplier NUMERIC DEFAULT 1.0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS xp_multiplier_ends_at TIMESTAMPTZ;

-- Ensure columns exist in user_plants
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_plants') THEN
    ALTER TABLE public.user_plants ADD COLUMN IF NOT EXISTS fertilizer_ends_at TIMESTAMPTZ;
    ALTER TABLE public.user_plants ADD COLUMN IF NOT EXISTS growth_multiplier NUMERIC DEFAULT 1.0;
    ALTER TABLE public.user_plants ADD COLUMN IF NOT EXISTS last_watered_at TIMESTAMPTZ;
    ALTER TABLE public.user_plants ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;
    ALTER TABLE public.user_plants ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Prevent negative credits constraint on user_stats
ALTER TABLE public.user_stats
DROP CONSTRAINT IF EXISTS chk_user_stats_credits_non_negative;

ALTER TABLE public.user_stats
ADD CONSTRAINT chk_user_stats_credits_non_negative
CHECK (credits IS NULL OR credits >= 0);

-- 3. HARDEN purchase_item RPC (PREVENT INFINITE CREDITS EXPLOIT)
CREATE OR REPLACE FUNCTION public.purchase_item(
  p_item_type text,
  p_item_id text,
  p_cost int,
  p_plant_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_credits int;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Usuario no autenticado');
  END IF;

  -- High-severity fix: Prevent negative or invalid cost (Infinite Credits Exploit)
  IF p_cost < 0 THEN
    RETURN json_build_object('success', false, 'message', 'Costo de compra inválido');
  END IF;

  -- Check Credits
  SELECT credits INTO v_current_credits FROM user_stats WHERE user_id = v_user_id;

  IF v_current_credits IS NULL OR v_current_credits < p_cost THEN
    RETURN json_build_object('success', false, 'message', 'No tienes suficientes créditos');
  END IF;

  -- Deduct Credits
  UPDATE user_stats SET credits = credits - p_cost WHERE user_id = v_user_id;

  -- Record purchase in inventory
  IF EXISTS (SELECT 1 FROM user_inventory WHERE user_id = v_user_id AND item_type = p_item_type AND item_id = p_item_id) THEN
    UPDATE user_inventory SET quantity = quantity + 1 
    WHERE user_id = v_user_id AND item_type = p_item_type AND item_id = p_item_id;
  ELSE
    INSERT INTO user_inventory (user_id, item_type, item_id, quantity)
    VALUES (v_user_id, p_item_type, p_item_id, 1);
  END IF;

  RETURN json_build_object(
    'success', true, 
    'message', 'Compra realizada con éxito',
    'new_credits', (v_current_credits - p_cost)
  );
END;
$$;

-- 4. HARDEN use_inventory_item WITH search_path & auth.uid() VALIDATION
CREATE OR REPLACE FUNCTION public.use_inventory_item(
  p_item_type text,
  p_item_id text,
  p_plant_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_quantity int;
  v_inventory_id uuid;
  v_plant_id uuid;
  v_current_growth int;
  v_new_growth int;
  v_random_credits int;
  v_random_xp int;
  v_best_streak int;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Usuario no autenticado');
  END IF;

  -- Get item from inventory
  SELECT id, quantity INTO v_inventory_id, v_quantity
  FROM user_inventory
  WHERE user_id = v_user_id AND item_type = p_item_type AND item_id = p_item_id
  LIMIT 1;

  IF v_inventory_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'No tienes este objeto en tu inventario');
  END IF;

  -- Logic per item type
  IF p_item_type = 'fertilizer' THEN
    IF p_item_id = 'super_fertilizer_3x' THEN
        IF p_plant_id IS NOT NULL THEN v_plant_id := p_plant_id; ELSE
           SELECT id INTO v_plant_id FROM user_plants WHERE user_id = v_user_id AND is_alive = true AND is_completed = false LIMIT 1;
        END IF;

        IF v_plant_id IS NOT NULL THEN
          UPDATE user_plants SET fertilizer_ends_at = (now() + interval '24 hours'), growth_multiplier = 3.0 WHERE id = v_plant_id;
          UPDATE user_inventory SET quantity = quantity - 1 WHERE id = v_inventory_id;
          IF v_quantity - 1 <= 0 THEN DELETE FROM user_inventory WHERE id = v_inventory_id; END IF;
          RETURN json_build_object('success', true, 'message', '¡Fertilizante Maestro (x3) aplicado!');
        ELSE
          RETURN json_build_object('success', false, 'message', 'No tienes una planta activa');
        END IF;
    ELSE
        IF p_plant_id IS NOT NULL THEN v_plant_id := p_plant_id; ELSE
           SELECT id INTO v_plant_id FROM user_plants WHERE user_id = v_user_id AND is_alive = true AND is_completed = false LIMIT 1;
        END IF;

        IF v_plant_id IS NOT NULL THEN
          UPDATE user_plants SET fertilizer_ends_at = (now() + interval '24 hours'), growth_multiplier = 2.0 WHERE id = v_plant_id;
          UPDATE user_inventory SET quantity = quantity - 1 WHERE id = v_inventory_id;
          IF v_quantity - 1 <= 0 THEN DELETE FROM user_inventory WHERE id = v_inventory_id; END IF;
          RETURN json_build_object('success', true, 'message', 'Fertilizante (x2) aplicado');
        ELSE
          RETURN json_build_object('success', false, 'message', 'No tienes una planta activa');
        END IF;
    END IF;

  ELSIF p_item_type = 'instant_grow' THEN
    IF p_plant_id IS NOT NULL THEN v_plant_id := p_plant_id; ELSE
       SELECT id, growth_percentage INTO v_plant_id, v_current_growth FROM user_plants WHERE user_id = v_user_id AND is_alive = true AND is_completed = false LIMIT 1;
    END IF;

    IF v_plant_id IS NOT NULL THEN
      v_new_growth := LEAST(v_current_growth + 35, 100);
      UPDATE user_plants SET growth_percentage = v_new_growth, last_watered_at = now(), is_completed = (v_new_growth >= 100), completed_at = CASE WHEN v_new_growth >= 100 THEN now() ELSE null END WHERE id = v_plant_id;
      UPDATE user_inventory SET quantity = quantity - 1 WHERE id = v_inventory_id;
      IF v_quantity - 1 <= 0 THEN DELETE FROM user_inventory WHERE id = v_inventory_id; END IF;
      RETURN json_build_object('success', true, 'message', '¡Poción aplicada! Tu planta ha crecido.');
    ELSE
      RETURN json_build_object('success', false, 'message', 'No tienes una planta activa');
    END IF;

  ELSIF p_item_type = 'xp_boost' THEN
    UPDATE user_stats SET xp_multiplier = 2.0, xp_multiplier_ends_at = now() + interval '1 hour' WHERE user_id = v_user_id;
    UPDATE user_inventory SET quantity = quantity - 1 WHERE id = v_inventory_id;
    IF v_quantity - 1 <= 0 THEN DELETE FROM user_inventory WHERE id = v_inventory_id; END IF;
    RETURN json_build_object('success', true, 'message', '¡Potenciador de XP activado! (x2 por 1h)');

  ELSIF p_item_type = 'mystery_box' THEN
    v_random_credits := floor(random() * (5000 - 0 + 1) + 0);
    UPDATE user_stats SET credits = credits + v_random_credits WHERE user_id = v_user_id;
    UPDATE user_inventory SET quantity = quantity - 1 WHERE id = v_inventory_id;
    IF v_quantity - 1 <= 0 THEN DELETE FROM user_inventory WHERE id = v_inventory_id; END IF;
    RETURN json_build_object('success', true, 'message', '¡Has encontrado ' || v_random_credits || ' créditos!', 'new_credits', (SELECT credits FROM user_stats WHERE user_id = v_user_id));

  ELSIF p_item_type = 'xp_chest' THEN
    v_random_xp := floor(random() * (5000 - 1000 + 1) + 1000);
    UPDATE user_stats SET xp_total = xp_total + v_random_xp WHERE user_id = v_user_id;
    UPDATE user_inventory SET quantity = quantity - 1 WHERE id = v_inventory_id;
    IF v_quantity - 1 <= 0 THEN DELETE FROM user_inventory WHERE id = v_inventory_id; END IF;
    RETURN json_build_object('success', true, 'message', '¡Has encontrado ' || v_random_xp || ' XP!', 'new_xp', (SELECT xp_total FROM user_stats WHERE user_id = v_user_id));

  ELSIF p_item_type = 'streak_repair' THEN
    SELECT mejor_racha INTO v_best_streak FROM user_stats WHERE user_id = v_user_id;
    UPDATE user_stats SET racha_actual = COALESCE(v_best_streak, 1) WHERE user_id = v_user_id;
    UPDATE user_inventory SET quantity = quantity - 1 WHERE id = v_inventory_id;
    IF v_quantity - 1 <= 0 THEN DELETE FROM user_inventory WHERE id = v_inventory_id; END IF;
    RETURN json_build_object('success', true, 'message', '¡Racha restaurada a ' || v_best_streak || '!', 'new_streak', v_best_streak);

  ELSE
    RETURN json_build_object('success', false, 'message', 'Este objeto no se puede usar directamente.');
  END IF;
END;
$$;

-- 5. HARDEN increment_usage RPC TO PREVENT QUOTA EXHAUSTION ATTACKS ON OTHER USERS
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id uuid,
  p_feature text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start date;
  v_count integer;
BEGIN
  -- Strict Authorization: Only own user or admin can increment usage
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT (
    public.has_role(auth.uid(), 'admin') OR auth.uid() = '47c2a694-d1f2-4a4b-b37f-45e37ea010c6'::uuid
  )) THEN
    RAISE EXCEPTION 'Unauthorized: Can only increment own usage';
  END IF;

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

-- 6. HARDEN rate_community_resource WITH search_path = public
CREATE OR REPLACE FUNCTION public.rate_community_resource(
  p_type text,
  p_resource_id uuid,
  p_rating int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_new_sum numeric := 0;
  v_new_count int := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'La calificación debe estar entre 1 y 5';
  END IF;

  IF p_type = 'deck' THEN
    INSERT INTO public.deck_ratings (deck_id, user_id, rating)
    VALUES (p_resource_id, v_user_id, p_rating)
    ON CONFLICT (deck_id, user_id) DO UPDATE SET rating = EXCLUDED.rating;

    SELECT COALESCE(SUM(rating), 0), COUNT(*)
    INTO v_new_sum, v_new_count
    FROM public.deck_ratings WHERE deck_id = p_resource_id;

    UPDATE public.flashcard_decks
    SET rating_sum = v_new_sum, rating_count = v_new_count
    WHERE id = p_resource_id;

  ELSIF p_type = 'quiz' THEN
    INSERT INTO public.quiz_ratings (quiz_deck_id, user_id, rating)
    VALUES (p_resource_id, v_user_id, p_rating)
    ON CONFLICT (quiz_deck_id, user_id) DO UPDATE SET rating = EXCLUDED.rating;

    SELECT COALESCE(SUM(rating), 0), COUNT(*)
    INTO v_new_sum, v_new_count
    FROM public.quiz_ratings WHERE quiz_deck_id = p_resource_id;

    UPDATE public.quiz_decks
    SET rating_sum = v_new_sum, rating_count = v_new_count
    WHERE id = p_resource_id;

  ELSIF p_type = 'apunte' THEN
    INSERT INTO public.apunte_ratings (apunte_id, user_id, rating)
    VALUES (p_resource_id, v_user_id, p_rating)
    ON CONFLICT (apunte_id, user_id) DO UPDATE SET rating = EXCLUDED.rating;

    SELECT COALESCE(SUM(rating), 0), COUNT(*)
    INTO v_new_sum, v_new_count
    FROM public.apunte_ratings WHERE apunte_id = p_resource_id;

    UPDATE public.notion_documents
    SET rating_sum = v_new_sum, rating_count = v_new_count
    WHERE id = p_resource_id;

  ELSE
    RAISE EXCEPTION 'Tipo de recurso no válido: %', p_type;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'rating_sum', v_new_sum,
    'rating_count', v_new_count,
    'user_rating', p_rating
  );
END;
$$;

-- 7. HARDEN discord_server_invites RLS POLICIES
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'discord_server_invites') THEN
    DROP POLICY IF EXISTS "Authenticated users can create invites" ON public.discord_server_invites;
    DROP POLICY IF EXISTS "Authenticated users can update invites" ON public.discord_server_invites;
    DROP POLICY IF EXISTS "discord_server_invites_insert_authorized" ON public.discord_server_invites;
    DROP POLICY IF EXISTS "discord_server_invites_update_authorized" ON public.discord_server_invites;

    CREATE POLICY "discord_server_invites_insert_authorized"
    ON public.discord_server_invites FOR INSERT
    WITH CHECK (
        auth.uid() = created_by AND (
            EXISTS (
                SELECT 1 FROM public.discord_servers ds
                WHERE ds.id = server_id AND ds.owner_id = auth.uid()
            ) OR public.is_server_member(server_id, auth.uid())
        )
    );

    CREATE POLICY "discord_server_invites_update_authorized"
    ON public.discord_server_invites FOR UPDATE
    USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.discord_servers ds
            WHERE ds.id = server_id AND ds.owner_id = auth.uid()
        )
    );
  END IF;
END $$;

-- 8. HARDEN notion-images STORAGE BUCKET POLICIES
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notion-images',
  'notion-images',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

DROP POLICY IF EXISTS "Public can view notion images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload notion images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update notion images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete notion images" ON storage.objects;

CREATE POLICY "Public can view notion images"
ON storage.objects FOR SELECT
USING (bucket_id = 'notion-images');

CREATE POLICY "Authenticated users can upload notion images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'notion-images');

CREATE POLICY "Authenticated users can update notion images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'notion-images')
WITH CHECK (bucket_id = 'notion-images');

CREATE POLICY "Authenticated users can delete notion images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'notion-images');

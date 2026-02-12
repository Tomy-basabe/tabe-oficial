
-- Update use_inventory_item with all new functional items
CREATE OR REPLACE FUNCTION use_inventory_item(
  p_item_type text,
  p_item_id text,
  p_plant_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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
    -- Detectar si es el x3 o el normal (el anterior era growth_multiplier = 2.0)
    IF p_item_id = 'super_fertilizer_3x' THEN
        -- Aplicar x3
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
        -- Normal fertilizante (x2)
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

-- Inject Credits to tomi@tabe.com (Case-insensitive check)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Intentar match exacto
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'tomi@tabe.com';
  
  -- Si no, intentar match parcial (ILIKE)
  IF v_user_id IS NULL THEN
      SELECT id INTO v_user_id FROM auth.users WHERE email ILIKE 'tomi@tabe%' LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL THEN
    UPDATE user_stats SET credits = credits + 100000 WHERE user_id = v_user_id;
  END IF;
END $$;

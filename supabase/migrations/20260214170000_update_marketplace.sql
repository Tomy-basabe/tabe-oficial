
-- Add XP Multiplier columns to user_stats
ALTER TABLE public.user_stats 
ADD COLUMN IF NOT EXISTS xp_multiplier NUMERIC DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS xp_multiplier_ends_at TIMESTAMPTZ;

-- Update use_inventory_item to handle new items
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
    -- [Existing Logic: 2x Growth]
    -- For now, just consume it and return success message (functionality might be in frontend or other RPCs)
    -- In a real app, we'd set a 'fertilizer_active_until' timestamps in user_plants
    -- Let's assume it's just a visual effect for now or handled elsewhere
     UPDATE user_inventory SET quantity = quantity - 1 WHERE id = v_inventory_id;
     IF v_quantity - 1 <= 0 THEN DELETE FROM user_inventory WHERE id = v_inventory_id; END IF;
     RETURN json_build_object('success', true, 'message', '¡Fertilizante aplicado! Tu planta crecerá más rápido.');

  ELSIF p_item_type = 'instant_grow' THEN
    -- [Existing Logic: Jump Stage]
    IF p_plant_id IS NOT NULL THEN
       v_plant_id := p_plant_id;
    ELSE
       SELECT id, growth_percentage INTO v_plant_id, v_current_growth 
       FROM user_plants WHERE user_id = v_user_id AND is_alive = true AND is_completed = false LIMIT 1;
    END IF;

    IF v_plant_id IS NOT NULL THEN
      -- Add 35% growth (guarantees jumping at least one visual stage usually)
      v_new_growth := LEAST(v_current_growth + 35, 100);
      
      UPDATE user_plants 
      SET growth_percentage = v_new_growth,
          last_watered_at = now(),
          is_completed = (v_new_growth >= 100),
          completed_at = CASE WHEN v_new_growth >= 100 THEN now() ELSE null END
      WHERE id = v_plant_id;

      -- Consume item
      UPDATE user_inventory SET quantity = quantity - 1 WHERE id = v_inventory_id;
      IF v_quantity - 1 <= 0 THEN DELETE FROM user_inventory WHERE id = v_inventory_id; END IF;

      RETURN json_build_object('success', true, 'message', '¡Poción aplicada! Tu planta ha crecido instantáneamente.');
    ELSE
      RETURN json_build_object('success', false, 'message', 'No tienes una planta activa');
    END IF;

  ELSIF p_item_type = 'xp_boost' THEN
    -- [New Logic: XP Multiplier]
    UPDATE user_stats 
    SET xp_multiplier = 2.0,
        xp_multiplier_ends_at = now() + interval '1 hour'
    WHERE user_id = v_user_id;

    -- Consume item
    UPDATE user_inventory SET quantity = quantity - 1 WHERE id = v_inventory_id;
    IF v_quantity - 1 <= 0 THEN DELETE FROM user_inventory WHERE id = v_inventory_id; END IF;

    RETURN json_build_object('success', true, 'message', '¡Potenciador de XP activado! Ganarás doble XP por 1 hora.');

  ELSIF p_item_type = 'mystery_box' THEN
    -- [New Logic: Random Credits]
    v_random_credits := floor(random() * (5000 - 500 + 1) + 500);
    
    UPDATE user_stats 
    SET credits = credits + v_random_credits
    WHERE user_id = v_user_id;

    -- Consume item
    UPDATE user_inventory SET quantity = quantity - 1 WHERE id = v_inventory_id;
    IF v_quantity - 1 <= 0 THEN DELETE FROM user_inventory WHERE id = v_inventory_id; END IF;

    RETURN json_build_object('success', true, 'message', '¡Has encontrado ' || v_random_credits || ' créditos en la caja!');

  ELSE
    RETURN json_build_object('success', false, 'message', 'Este objeto no se puede usar directamente.');
  END IF;
END;
$$;

-- Inject Credits to tomi@tabe.com (and fallback to tomi@tabe@gmail.com just in case)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Try to find tomi@tabe.com
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'tomi@tabe.com';
  
  IF v_user_id IS NOT NULL THEN
    UPDATE user_stats SET credits = credits + 100000 WHERE user_id = v_user_id;
  END IF;

  -- Try to find tomi@tabe@gmail.com (previous request)
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'tomi@tabe@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    UPDATE user_stats SET credits = credits + 100000 WHERE user_id = v_user_id;
  END IF;
END $$;

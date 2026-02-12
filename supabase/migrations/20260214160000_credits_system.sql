-- Add credits column to user_stats
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;

-- Update valid item types constraint if it exists, or just ensure we handle the new type in logic
-- (No strict enum constraint found in previous file, so we just proceed)

-- Update Purchase Item to use Credits instead of XP
CREATE OR REPLACE FUNCTION purchase_item(
  p_item_type text,
  p_item_id text,
  p_cost int,
  p_plant_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_current_credits int;
  v_plant_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Check Credits
  SELECT credits INTO v_current_credits FROM user_stats WHERE user_id = v_user_id;
  
  IF v_current_credits < p_cost THEN
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
  
  -- Apply Immediate Effects if any (mostly for consumables that auto-apply, but we want manual use for most)
  -- For now, all items go to inventory to be used/equipped manually.
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Compra realizada con éxito',
    'new_credits', (v_current_credits - p_cost)
  );
END;
$$;

-- Update Use Item to handle Instant Grow (Saltar Etapa)
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
  v_inventory_id uuid;
  v_quantity int;
  v_plant_id uuid;
  v_current_growth float;
  v_new_growth float;
BEGIN
  v_user_id := auth.uid();
  
  -- Check inventory
  SELECT id, quantity INTO v_inventory_id, v_quantity 
  FROM user_inventory 
  WHERE user_id = v_user_id AND item_type = p_item_type AND item_id = p_item_id;
  
  IF v_inventory_id IS NULL OR v_quantity <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'No tienes este objeto en tu inventario');
  END IF;
  
  -- Logic per item type
  IF p_item_type = 'fertilizer' THEN
    -- [Existing Logic]
    IF p_plant_id IS NOT NULL THEN
       v_plant_id := p_plant_id;
    ELSE
       SELECT id INTO v_plant_id FROM user_plants WHERE user_id = v_user_id AND is_alive = true AND is_completed = false LIMIT 1;
    END IF;
    
    IF v_plant_id IS NOT NULL THEN
      UPDATE user_plants 
      SET fertilizer_ends_at = (now() + interval '24 hours'),
          growth_multiplier = 2.0
      WHERE id = v_plant_id;
      
      -- Consume item
      UPDATE user_inventory SET quantity = quantity - 1 WHERE id = v_inventory_id;
      IF v_quantity - 1 <= 0 THEN DELETE FROM user_inventory WHERE id = v_inventory_id; END IF;
      
      RETURN json_build_object('success', true, 'message', 'Fertilizante aplicado con éxito');
    ELSE
      RETURN json_build_object('success', false, 'message', 'No tienes una planta activa');
    END IF;

  ELSIF p_item_type = 'instant_grow' THEN
    -- [New Logic: Jump Stage]
    IF p_plant_id IS NOT NULL THEN
       v_plant_id := p_plant_id;
    ELSE
       SELECT id, growth_percentage INTO v_plant_id, v_current_growth 
       FROM user_plants WHERE user_id = v_user_id AND is_alive = true AND is_completed = false LIMIT 1;
    END IF;

    IF v_plant_id IS NOT NULL THEN
      -- Add 34% growth (guarantees jumping at least one visual stage usually)
      v_new_growth := LEAST(v_current_growth + 34, 100);
      
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
    
  ELSIF p_item_type = 'streak_freeze' THEN
    -- [Existing Logic]
    UPDATE user_stats 
    SET streak_freezes = COALESCE(streak_freezes, 0) + 1
    WHERE user_id = v_user_id;
    
    -- Consume item
    UPDATE user_inventory SET quantity = quantity - 1 WHERE id = v_inventory_id;
    IF v_quantity - 1 <= 0 THEN DELETE FROM user_inventory WHERE id = v_inventory_id; END IF;
    
    RETURN json_build_object('success', true, 'message', 'Congelador de racha añadido');
  
  ELSE
    RETURN json_build_object('success', false, 'message', 'Este objeto no se puede usar manualmente todavía');
  END IF;
END;
$$;

-- Inject Credits to Test User
DO $$
DECLARE
    v_test_user_id UUID;
BEGIN
    SELECT id INTO v_test_user_id FROM auth.users WHERE email = 'tomi@tabe@gmail.com';
    
    IF v_test_user_id IS NOT NULL THEN
        -- Give 100,000 credits
        UPDATE public.user_stats 
        SET credits = 100000,
            xp_total = xp_total + 1000 -- Give some XP too just in case
        WHERE user_id = v_test_user_id;
    END IF;
END $$;

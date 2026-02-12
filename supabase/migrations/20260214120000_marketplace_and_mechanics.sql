-- Add columns
ALTER TABLE public.user_plants ADD COLUMN IF NOT EXISTS fertilizer_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.user_plants ADD COLUMN IF NOT EXISTS growth_multiplier DOUBLE PRECISION DEFAULT 1.0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS streak_freezes INTEGER DEFAULT 0;

-- Create inventory table
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own inventory') THEN
        CREATE POLICY "Users can view their own inventory" ON public.user_inventory FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own inventory') THEN
        CREATE POLICY "Users can update their own inventory" ON public.user_inventory FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own inventory') THEN
        CREATE POLICY "Users can insert their own inventory" ON public.user_inventory FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Function to handle streak updates and freezes
CREATE OR REPLACE FUNCTION public.handle_streak_update()
RETURNS TRIGGER AS $$
DECLARE
    last_session_date DATE;
    current_streak INTEGER;
    current_freezes INTEGER;
    days_diff INTEGER;
BEGIN
    -- Get current stats
    SELECT racha_actual, streak_freezes 
    INTO current_streak, current_freezes
    FROM public.user_stats
    WHERE user_id = NEW.user_id;

    -- Handle nulls
    current_streak := COALESCE(current_streak, 0);
    current_freezes := COALESCE(current_freezes, 0);

    -- Get date of last session (excluding current one if it exists)
    SELECT fecha INTO last_session_date
    FROM public.study_sessions
    WHERE user_id = NEW.user_id
    AND fecha < NEW.fecha
    ORDER BY fecha DESC
    LIMIT 1;

    -- If no previous session, set streak to 1
    IF last_session_date IS NULL THEN
        UPDATE public.user_stats
        SET racha_actual = 1,
            mejor_racha = GREATEST(mejor_racha, 1),
            updated_at = now()
        WHERE user_id = NEW.user_id;
        RETURN NEW;
    END IF;

    days_diff := NEW.fecha - last_session_date;

    IF days_diff = 1 THEN
        -- Perfect streak (consecutive day)
        UPDATE public.user_stats
        SET racha_actual = current_streak + 1,
            mejor_racha = GREATEST(mejor_racha, current_streak + 1),
            updated_at = now()
        WHERE user_id = NEW.user_id;
        
    ELSIF days_diff > 1 THEN
        -- Missed days
        IF current_freezes > 0 THEN
            -- Use freeze: Keep streak (incremented for today), consume freeze
            UPDATE public.user_stats
            SET racha_actual = current_streak + 1,
                mejor_racha = GREATEST(mejor_racha, current_streak + 1),
                streak_freezes = current_freezes - 1,
                updated_at = now()
            WHERE user_id = NEW.user_id;
        ELSE
            -- No freezes, reset streak
            UPDATE public.user_stats
            SET racha_actual = 1,
                updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    -- If days_diff = 0 (same day), do nothing
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS update_streak_trigger ON public.study_sessions;
CREATE TRIGGER update_streak_trigger
AFTER INSERT ON public.study_sessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_streak_update();

-- Purchase Item RPC
DROP FUNCTION IF EXISTS purchase_item(text, text, integer, uuid);

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
  v_current_xp int;
  v_plant_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Check XP
  SELECT xp_total INTO v_current_xp FROM user_stats WHERE user_id = v_user_id;
  
  IF v_current_xp < p_cost THEN
    RETURN json_build_object('success', false, 'message', 'No tienes suficiente XP');
  END IF;
  
  -- Deduct XP
  UPDATE user_stats SET xp_total = xp_total - p_cost WHERE user_id = v_user_id;
  
  -- Record purchase in inventory
  IF EXISTS (SELECT 1 FROM user_inventory WHERE user_id = v_user_id AND item_type = p_item_type AND item_id = p_item_id) THEN
    UPDATE user_inventory SET quantity = quantity + 1 
    WHERE user_id = v_user_id AND item_type = p_item_type AND item_id = p_item_id;
  ELSE
    INSERT INTO user_inventory (user_id, item_type, item_id, quantity)
    VALUES (v_user_id, p_item_type, p_item_id, 1);
  END IF;
  
  -- Apply Effects
  IF p_item_type = 'fertilizer' THEN
    -- Update active plant
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
    END IF;
    
  ELSIF p_item_type = 'streak_freeze' THEN
    UPDATE user_stats 
    SET streak_freezes = COALESCE(streak_freezes, 0) + 1
    WHERE user_id = v_user_id;
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Compra realizada con éxito',
    'new_xp', (v_current_xp - p_cost)
  );
END;
$$;

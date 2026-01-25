-- Prevent newly planted plants from being marked dead within the first 7 days
CREATE OR REPLACE FUNCTION public.enforce_plant_death_grace_period()
RETURNS trigger AS $$
BEGIN
  -- Only enforce when transitioning to dead
  IF (NEW.is_alive = false) AND (OLD.is_alive = true) THEN
    -- If plant is younger than 7 days, block the update
    IF (now() - OLD.planted_at) < interval '7 days' THEN
      RAISE EXCEPTION 'Plant cannot die within 7 days of planting';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_plant_death_grace_period ON public.user_plants;
CREATE TRIGGER trg_enforce_plant_death_grace_period
BEFORE UPDATE OF is_alive ON public.user_plants
FOR EACH ROW
EXECUTE FUNCTION public.enforce_plant_death_grace_period();
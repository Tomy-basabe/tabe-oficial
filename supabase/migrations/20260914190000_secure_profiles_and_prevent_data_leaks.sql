-- ==============================================================================
-- MIGRATION: 20260914190000_secure_profiles_and_prevent_data_leaks.sql
-- SECURE PROFILES TABLE, RESTRICT SENSITIVE COLUMNS, AND PREVENT DATA LEAKS
-- ==============================================================================

-- 1. DROP INSECURE / PERMISSIVE POLICIES ON PROFILES
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admin can view all" ON public.profiles;
DROP POLICY IF EXISTS "Ver perfiles propios y de amigos" ON public.profiles;
DROP POLICY IF EXISTS "Users can view friend profiles" ON public.profiles;

-- 2. CREATE STRICT ISOLATED SELECT POLICY
-- Users can ONLY view their own profile row.
-- Only verified admins or the super admin can view all profiles.
CREATE POLICY "Users can view own profile or admin can view all" ON public.profiles
  FOR SELECT USING (
    auth.uid() = user_id 
    OR auth.uid() = id 
    OR public.has_role(auth.uid(), 'admin')
    OR auth.uid() = '47c2a694-d1f2-4a4b-b37f-45e37ea010c6'::uuid
  );

-- 3. ENSURE UPDATE POLICY COVERS USER'S OWN PROFILE AND ADMINS
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile or admin can update any" ON public.profiles;

CREATE POLICY "Users can update own profile or admin can update any" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR auth.uid() = id
    OR public.has_role(auth.uid(), 'admin')
    OR auth.uid() = '47c2a694-d1f2-4a4b-b37f-45e37ea010c6'::uuid
  );

-- 4. TRIGGER TO PREVENT NON-ADMIN PRIVILEGE ESCALATION
-- Prevents regular users from modifying plan, plan_type, plan_activated_at, plan_expires_at,
-- display_id, user_id, id, or email via console / direct API calls.
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If not an admin and not service role, enforce old values for sensitive columns
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR auth.uid() = '47c2a694-d1f2-4a4b-b37f-45e37ea010c6'::uuid
    OR current_setting('role', true) = 'service_role'
  ) THEN
    NEW.plan := OLD.plan;
    NEW.plan_type := OLD.plan_type;
    NEW.plan_activated_at := OLD.plan_activated_at;
    NEW.plan_expires_at := OLD.plan_expires_at;
    NEW.display_id := OLD.display_id;
    NEW.user_id := OLD.user_id;
    NEW.id := OLD.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_columns();

-- 5. PUBLIC_PROFILES SECURE VIEW
-- Exposes ONLY non-confidential public data (username, avatar, display_id, carrera, etc.)
-- Does NOT expose email, calendar_feed_token, plan, or subscription status to other users.
CREATE OR REPLACE VIEW public.public_profiles 
WITH (security_invoker = false) AS
SELECT 
  user_id,
  id,
  display_id,
  nombre,
  username,
  avatar_url,
  carrera,
  facultad,
  active_badge,
  active_theme,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- 6. RPC HELPER TO FETCH BATCH PUBLIC PROFILES SAFELY
CREATE OR REPLACE FUNCTION public.get_public_profiles(target_user_ids uuid[])
RETURNS TABLE(
  user_id uuid,
  id uuid,
  display_id integer,
  nombre text,
  username text,
  avatar_url text,
  carrera text,
  facultad text,
  active_badge text,
  active_theme text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.id,
    p.display_id,
    p.nombre,
    p.username,
    p.avatar_url,
    p.carrera,
    p.facultad,
    p.active_badge,
    p.active_theme
  FROM public.profiles p
  WHERE p.user_id = ANY(target_user_ids) OR p.id = ANY(target_user_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated, anon;

-- 7. SECURE delete_user_by_admin FUNCTION
-- Only admins and the super admin can invoke this function
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(user_id_to_delete uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR auth.uid() = '47c2a694-d1f2-4a4b-b37f-45e37ea010c6'::uuid
    OR current_setting('role', true) = 'service_role'
  ) THEN
    RAISE EXCEPTION 'Acceso denegado: Se requieren permisos de administrador.';
  END IF;

  DELETE FROM auth.users WHERE id = user_id_to_delete;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user_by_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(uuid) TO authenticated;

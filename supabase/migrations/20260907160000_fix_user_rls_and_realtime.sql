-- ============================================================
-- FIX USER RLS & REALTIME POLICIES
-- Resolves permission blocks that caused constant refetching/reconnect loops for non-admin users
-- ============================================================

-- 1. FIX USER_USAGE RLS POLICIES
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage" ON public.user_usage;
DROP POLICY IF EXISTS "Users can insert own usage" ON public.user_usage;
DROP POLICY IF EXISTS "Users can update own usage" ON public.user_usage;

CREATE POLICY "Users can view own usage" ON public.user_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON public.user_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON public.user_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. FIX USER_ROLES RLS POLICIES (ALLOW USERS TO CHECK THEIR OWN ROLE)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 3. ENSURE USER_PLANTS RLS POLICIES ARE INTACT
ALTER TABLE public.user_plants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own plants" ON public.user_plants;
DROP POLICY IF EXISTS "Users can insert their own plants" ON public.user_plants;
DROP POLICY IF EXISTS "Users can update their own plants" ON public.user_plants;
DROP POLICY IF EXISTS "Users can delete their own plants" ON public.user_plants;

CREATE POLICY "Users can view their own plants" ON public.user_plants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plants" ON public.user_plants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plants" ON public.user_plants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plants" ON public.user_plants
  FOR DELETE USING (auth.uid() = user_id);

-- 4. ENSURE USER_STATS RLS POLICIES ARE INTACT
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_stats;

CREATE POLICY "Users can view their own stats" ON public.user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats" ON public.user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" ON public.user_stats
  FOR UPDATE USING (auth.uid() = user_id);

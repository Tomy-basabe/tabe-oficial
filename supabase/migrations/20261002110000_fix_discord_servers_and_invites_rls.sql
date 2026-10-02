-- Fix Discord servers RLS and ensure discord_server_invites table and policies exist

-- 1. Ensure discord_server_invites table exists
CREATE TABLE IF NOT EXISTS public.discord_server_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES public.discord_servers(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    created_by UUID NOT NULL,
    max_uses INTEGER,
    uses INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on discord_server_invites
ALTER TABLE public.discord_server_invites ENABLE ROW LEVEL SECURITY;

-- Index on code for fast lookups
CREATE INDEX IF NOT EXISTS idx_discord_server_invites_code ON public.discord_server_invites(code);

-- 2. RLS policies for discord_server_invites
DROP POLICY IF EXISTS "Authenticated users can view invites" ON public.discord_server_invites;
CREATE POLICY "Authenticated users can view invites"
ON public.discord_server_invites FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can create invites" ON public.discord_server_invites;
CREATE POLICY "Authenticated users can create invites"
ON public.discord_server_invites FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update invites" ON public.discord_server_invites;
CREATE POLICY "Authenticated users can update invites"
ON public.discord_server_invites FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- 3. Fix SELECT policy on discord_servers so owners can always view their newly inserted server
DROP POLICY IF EXISTS "Users can view servers they are members of" ON public.discord_servers;
DROP POLICY IF EXISTS "Users can view servers they are members of or own" ON public.discord_servers;
CREATE POLICY "Users can view servers they are members of or own"
ON public.discord_servers FOR SELECT
USING (owner_id = auth.uid() OR is_server_member(id, auth.uid()));

-- 4. Ensure authenticated users can join servers in discord_server_members
DROP POLICY IF EXISTS "Server owners/admins can add members" ON public.discord_server_members;
CREATE POLICY "Server owners/admins can add members"
ON public.discord_server_members FOR INSERT
WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
        SELECT 1 FROM discord_server_members dsm
        WHERE dsm.server_id = discord_server_members.server_id
        AND dsm.user_id = auth.uid()
        AND dsm.role IN ('owner', 'admin')
    )
);

-- Fix discord_servers RLS: Allow owners to see their own servers (not just members)
DROP POLICY IF EXISTS "Users can view servers they are members of" ON discord_servers;

CREATE POLICY "Users can view their servers" 
ON discord_servers FOR SELECT 
USING (owner_id = auth.uid() OR is_server_member(id, auth.uid()));
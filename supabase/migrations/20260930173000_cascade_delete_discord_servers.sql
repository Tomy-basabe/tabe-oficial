-- Migration: Garantizar borrado en cascada para servidores, canales, miembros y mensajes de Tabetalk (Discord)

-- 1. Canales pertenecientes a servidores
ALTER TABLE IF EXISTS public.discord_channels 
DROP CONSTRAINT IF EXISTS discord_channels_server_id_fkey,
ADD CONSTRAINT discord_channels_server_id_fkey 
    FOREIGN KEY (server_id) 
    REFERENCES public.discord_servers(id) 
    ON DELETE CASCADE;

-- 2. Miembros pertenecientes a servidores
ALTER TABLE IF EXISTS public.discord_server_members 
DROP CONSTRAINT IF EXISTS discord_server_members_server_id_fkey,
ADD CONSTRAINT discord_server_members_server_id_fkey 
    FOREIGN KEY (server_id) 
    REFERENCES public.discord_servers(id) 
    ON DELETE CASCADE;

-- 3. Mensajes pertenecientes a canales
ALTER TABLE IF EXISTS public.discord_messages 
DROP CONSTRAINT IF EXISTS discord_messages_channel_id_fkey,
ADD CONSTRAINT discord_messages_channel_id_fkey 
    FOREIGN KEY (channel_id) 
    REFERENCES public.discord_channels(id) 
    ON DELETE CASCADE;

-- 4. Participantes de voz pertenecientes a canales
ALTER TABLE IF EXISTS public.discord_voice_participants 
DROP CONSTRAINT IF EXISTS discord_voice_participants_channel_id_fkey,
ADD CONSTRAINT discord_voice_participants_channel_id_fkey 
    FOREIGN KEY (channel_id) 
    REFERENCES public.discord_channels(id) 
    ON DELETE CASCADE;

-- 5. Asegurar política de eliminación para dueños de servidores
DROP POLICY IF EXISTS "Owners can delete their servers" ON public.discord_servers;
CREATE POLICY "Owners can delete their servers"
ON public.discord_servers FOR DELETE
USING (auth.uid() = owner_id);

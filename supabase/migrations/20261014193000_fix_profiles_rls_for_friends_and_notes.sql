-- ==============================================================================
-- MIGRATION: 20261014193000_fix_profiles_rls_for_friends_and_notes.sql
-- PERMITIR A LOS USUARIOS VER PERFILES DE SUS AMIGOS Y APUNTES COMPARTIDOS
-- ==============================================================================

-- 1. Actualizar la política de SELECT en public.profiles para que usuarios no-admin
-- puedan ver los datos de perfil de sus amigos mutuos y de colaboradores de apuntes.
DROP POLICY IF EXISTS "Users can view own profile or admin can view all" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile, friends or admin can view all" ON public.profiles;
DROP POLICY IF EXISTS "Ver perfiles propios y de amigos" ON public.profiles;
DROP POLICY IF EXISTS "Users can view friend profiles" ON public.profiles;

CREATE POLICY "Users can view own profile, friends or admin can view all" ON public.profiles
  FOR SELECT USING (
    auth.uid() = user_id 
    OR auth.uid() = id 
    OR public.has_role(auth.uid(), 'admin')
    OR auth.uid() = '47c2a694-d1f2-4a4b-b37f-45e37ea010c6'::uuid
    -- Amigos aceptados en la plataforma
    OR EXISTS (
      SELECT 1 FROM public.friendships 
      WHERE status = 'accepted' AND (
        (requester_id = auth.uid() AND (addressee_id = profiles.id OR addressee_id = profiles.user_id)) OR 
        (addressee_id = auth.uid() AND (requester_id = profiles.id OR requester_id = profiles.user_id))
      )
    )
    -- Colaboradores mutuos en apuntes de Notion
    OR EXISTS (
      SELECT 1 FROM public.notion_document_collaborators ndc
      JOIN public.notion_documents nd ON nd.id = ndc.document_id
      WHERE (ndc.user_id = auth.uid() AND (nd.user_id = profiles.id OR nd.user_id = profiles.user_id))
         OR (nd.user_id = auth.uid() AND (ndc.user_id = profiles.id OR ndc.user_id = profiles.user_id))
    )
  );

-- 2. Asegurar permisos de lectura en la vista public_profiles y RPC get_public_profiles
GRANT SELECT ON public.public_profiles TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated, anon;

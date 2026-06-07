-- Migración Definitiva para Acceso a Apuntes de Amigos
-- Unifica relaciones y establece políticas de RLS robustas

-- 1. Unificar relaciones en notion_documents
ALTER TABLE public.notion_documents 
DROP CONSTRAINT IF EXISTS notion_documents_user_id_fkey;

ALTER TABLE public.notion_documents 
ADD CONSTRAINT notion_documents_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Unificar relaciones en friendships
ALTER TABLE public.friendships 
DROP CONSTRAINT IF EXISTS friendships_requester_id_fkey,
DROP CONSTRAINT IF EXISTS friendships_addressee_id_fkey;

ALTER TABLE public.friendships 
ADD CONSTRAINT friendships_requester_id_fkey 
FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD CONSTRAINT friendships_addressee_id_fkey 
FOREIGN KEY (addressee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Política de seguridad para documentos
DROP POLICY IF EXISTS "Acceso total a apuntes propios y de amigos" ON public.notion_documents;
DROP POLICY IF EXISTS "Users can view own and friends documents" ON public.notion_documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.notion_documents;

CREATE POLICY "Acceso total a apuntes propios y de amigos"
ON public.notion_documents FOR SELECT
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE status = 'accepted' AND (
      (requester_id = auth.uid() AND addressee_id = notion_documents.user_id) OR 
      (addressee_id = auth.uid() AND requester_id = notion_documents.user_id)
    )
  )
);

-- 4. Política de seguridad para perfiles
DROP POLICY IF EXISTS "Ver perfiles propios y de amigos" ON public.profiles;
DROP POLICY IF EXISTS "Users can view friend profiles" ON public.profiles;

CREATE POLICY "Ver perfiles propios y de amigos" ON public.profiles
FOR SELECT USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE status = 'accepted' AND (
      (requester_id = auth.uid() AND addressee_id = profiles.id) OR 
      (addressee_id = auth.uid() AND requester_id = profiles.id)
    )
  )
);

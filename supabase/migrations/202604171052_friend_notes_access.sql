-- Actualizar políticas de RLS para permitir acceso a apuntes de amigos

-- 0. Asegurar que existe la relación para poder hacer joins
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notion_documents_user_id_fkey') THEN
        ALTER TABLE public.notion_documents 
        ADD CONSTRAINT notion_documents_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 1. Permitir ver perfiles de amigos
DROP POLICY IF EXISTS "Users can view friend profiles" ON public.profiles;
CREATE POLICY "Users can view friend profiles" ON public.profiles
FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM friendships 
    WHERE status = 'accepted' AND (
      (requester_id = auth.uid() AND addressee_id = profiles.user_id) OR 
      (addressee_id = auth.uid() AND requester_id = profiles.user_id)
    )
  )
);

-- 2. Actualizar política de visualización de documentos de Notion
DROP POLICY IF EXISTS "Users can view their own documents" ON public.notion_documents;
DROP POLICY IF EXISTS "Users can view own and friends documents" ON public.notion_documents;

CREATE POLICY "Users can view own and friends documents"
ON public.notion_documents FOR SELECT
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM friendships 
    WHERE status = 'accepted' AND (
      (requester_id = auth.uid() AND addressee_id = notion_documents.user_id) OR 
      (addressee_id = auth.uid() AND requester_id = notion_documents.user_id)
    )
  )
);

-- Nota: Las políticas de INSERT, UPDATE y DELETE permanecen restringidas al dueño (auth.uid() = user_id)

-- ==============================================================================
-- MIGRATION: 20261104103000_fix_notion_friends_access.sql
-- RESTAURAR Y GARANTIZAR ACCESO COMPLETO DE LECTURA E IMPORTACIÓN A APUNTES DE AMIGOS
-- ==============================================================================

-- 1. Actualizar función can_access_notion_document para incluir amigos aceptados
CREATE OR REPLACE FUNCTION public.can_access_notion_document(p_doc_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.notion_documents d
    WHERE d.id = p_doc_id
      AND (
        d.user_id = p_user_id
        OR d.is_public = true
        OR EXISTS (
          SELECT 1
          FROM public.notion_document_collaborators c
          WHERE c.document_id = d.id
            AND c.user_id = p_user_id
        )
        OR (
          d.parent_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.notion_document_collaborators cp
            WHERE cp.document_id = d.parent_id
              AND cp.user_id = p_user_id
          )
        )
        OR EXISTS (
          SELECT 1
          FROM public.friendships f
          WHERE f.status = 'accepted'
            AND (
              (f.requester_id = p_user_id AND (f.addressee_id = d.user_id OR EXISTS (SELECT 1 FROM public.profiles pd WHERE pd.user_id = d.user_id AND pd.id = f.addressee_id)))
              OR
              (f.addressee_id = p_user_id AND (f.requester_id = d.user_id OR EXISTS (SELECT 1 FROM public.profiles pd WHERE pd.user_id = d.user_id AND pd.id = f.requester_id)))
            )
        )
      )
  );
$$;

-- 2. Asegurar política de SELECT en notion_documents para incluir amigos directamente
DROP POLICY IF EXISTS "Users can view accessible documents" ON public.notion_documents;
DROP POLICY IF EXISTS "Acceso total a apuntes propios y de amigos" ON public.notion_documents;
DROP POLICY IF EXISTS "Users can view own and friends documents" ON public.notion_documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.notion_documents;
DROP POLICY IF EXISTS "Users can view own and public documents" ON public.notion_documents;
DROP POLICY IF EXISTS "Users can view own or shared documents" ON public.notion_documents;

CREATE POLICY "Users can view accessible documents"
ON public.notion_documents FOR SELECT
USING (
  auth.uid() = user_id
  OR is_public = true
  OR EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted' AND (
      (f.requester_id = auth.uid() AND (f.addressee_id = notion_documents.user_id OR EXISTS (SELECT 1 FROM public.profiles pd WHERE pd.user_id = notion_documents.user_id AND pd.id = f.addressee_id)))
      OR
      (f.addressee_id = auth.uid() AND (f.requester_id = notion_documents.user_id OR EXISTS (SELECT 1 FROM public.profiles pd WHERE pd.user_id = notion_documents.user_id AND pd.id = f.requester_id)))
    )
  )
  OR public.can_access_notion_document(id, auth.uid())
);

-- 3. Índices optimizados para que la verificación de amistad sea inmediata (0ms)
CREATE INDEX IF NOT EXISTS idx_friendships_status_requester_addressee
ON public.friendships (status, requester_id, addressee_id)
WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_friendships_status_addressee_requester
ON public.friendships (status, addressee_id, requester_id)
WHERE status = 'accepted';

-- 4. Permisos de lectura en PostgREST
GRANT SELECT ON public.notion_documents TO authenticated, anon;

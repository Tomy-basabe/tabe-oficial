-- Migration: Notion Cooperative Sharing by Link
-- Created at: 2026-09-26 14:00:00

-- 1. Agregar columnas a notion_documents para soporte de enlaces compartidos
ALTER TABLE public.notion_documents 
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS share_permission TEXT DEFAULT 'view',
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- Asegurar restricción de valores para share_permission
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notion_documents_share_permission_check'
  ) THEN
    ALTER TABLE public.notion_documents 
    ADD CONSTRAINT notion_documents_share_permission_check 
    CHECK (share_permission IN ('view', 'edit'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notion_documents_share_token 
ON public.notion_documents(share_token) 
WHERE share_token IS NOT NULL;

-- 2. Crear tabla de colaboradores registrados en un apunte
CREATE TABLE IF NOT EXISTS public.notion_document_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.notion_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(document_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notion_collaborators_user_id 
ON public.notion_document_collaborators(user_id);

CREATE INDEX IF NOT EXISTS idx_notion_collaborators_document_id 
ON public.notion_document_collaborators(document_id);

-- 3. Habilitar RLS en notion_document_collaborators
ALTER TABLE public.notion_document_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collaborators and owners can view collaborator records" ON public.notion_document_collaborators;
CREATE POLICY "Collaborators and owners can view collaborator records" 
ON public.notion_document_collaborators FOR SELECT 
USING (
    auth.uid() = user_id 
    OR EXISTS (
        SELECT 1 FROM public.notion_documents 
        WHERE id = notion_document_collaborators.document_id AND user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Authenticated users can join shared documents as collaborators" ON public.notion_document_collaborators;
CREATE POLICY "Authenticated users can join shared documents as collaborators" 
ON public.notion_document_collaborators FOR INSERT 
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM public.notion_documents 
        WHERE id = notion_document_collaborators.document_id AND is_shared = true
    )
);

DROP POLICY IF EXISTS "Owners can update collaborator permissions" ON public.notion_document_collaborators;
CREATE POLICY "Owners can update collaborator permissions" 
ON public.notion_document_collaborators FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.notion_documents 
        WHERE id = notion_document_collaborators.document_id AND user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Owners or self can leave or remove collaborators" ON public.notion_document_collaborators;
CREATE POLICY "Owners or self can leave or remove collaborators" 
ON public.notion_document_collaborators FOR DELETE 
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.notion_documents 
        WHERE id = notion_document_collaborators.document_id AND user_id = auth.uid()
    )
);

-- 4. Actualizar políticas RLS de notion_documents para soportar colaboración por enlace
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notion_documents') THEN
    DROP POLICY IF EXISTS "Users can view own and public documents" ON public.notion_documents;
    DROP POLICY IF EXISTS "Users can update own documents" ON public.notion_documents;

    -- Política SELECT: dueño, público, amigos, enlace compartido activo o colaborador registrado
    CREATE POLICY "Users can view own and public documents" ON public.notion_documents
      FOR SELECT USING (
        auth.uid() = user_id 
        OR is_public = true
        OR is_shared = true
        OR EXISTS (
          SELECT 1 FROM public.friendships 
          WHERE status = 'accepted' AND (
            (requester_id = auth.uid() AND addressee_id = notion_documents.user_id) OR 
            (addressee_id = auth.uid() AND requester_id = notion_documents.user_id)
          )
        )
        OR EXISTS (
          SELECT 1 FROM public.notion_document_collaborators 
          WHERE document_id = notion_documents.id AND user_id = auth.uid()
        )
      );

    -- Política UPDATE: dueño O colaboradores con permiso de edición
    CREATE POLICY "Users can update own documents" ON public.notion_documents
      FOR UPDATE USING (
        auth.uid() = user_id
        OR (is_shared = true AND share_permission = 'edit')
        OR EXISTS (
          SELECT 1 FROM public.notion_document_collaborators 
          WHERE document_id = notion_documents.id AND user_id = auth.uid() AND permission = 'edit'
        )
      );
  END IF;
END $$;

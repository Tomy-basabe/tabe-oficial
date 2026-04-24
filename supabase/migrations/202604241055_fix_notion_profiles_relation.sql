-- Corregir la relación entre notion_documents y profiles para permitir joins en PostgREST
-- Esto soluciona el error "Error al cargar documentos"

-- 1. Eliminar la restricción anterior que apuntaba a auth.users
ALTER TABLE public.notion_documents 
DROP CONSTRAINT IF EXISTS notion_documents_user_id_fkey;

-- 2. Crear la nueva restricción apuntando a public.profiles
-- Usamos public.profiles(id) ya que es la clave primaria y coincide con el UUID de auth
ALTER TABLE public.notion_documents 
ADD CONSTRAINT notion_documents_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Opcional: Asegurar que friendships también tiene relaciones para integridad
ALTER TABLE public.friendships 
DROP CONSTRAINT IF EXISTS friendships_requester_id_fkey,
DROP CONSTRAINT IF EXISTS friendships_addressee_id_fkey;

ALTER TABLE public.friendships 
ADD CONSTRAINT friendships_requester_id_fkey 
FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD CONSTRAINT friendships_addressee_id_fkey 
FOREIGN KEY (addressee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

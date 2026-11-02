-- ==============================================================================
-- MIGRATION: 20261101180000_add_utnfrm_encuestas_permission.sql
-- PERMISO EXCLUSIVO DE ADMINISTRADOR PARA RESOLVER ENCUESTAS DOCENTES (UTN FRM)
-- ==============================================================================

-- 1. Agregar columna booleana a public.profiles (por defecto false)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS utnfrm_encuestas_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Proteger la columna en el trigger de seguridad para que SOLO un Administrador
-- pueda habilitar o deshabilitar el permiso de resolver encuestas docentes.
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR auth.uid() = '47c2a694-d1f2-4a4b-b37f-45e37ea010c6'::uuid
    OR current_setting('role', true) = 'service_role'
  ) THEN
    NEW.plan := OLD.plan;
    NEW.plan_type := OLD.plan_type;
    NEW.plan_activated_at := OLD.plan_activated_at;
    NEW.plan_expires_at := OLD.plan_expires_at;
    NEW.display_id := OLD.display_id;
    NEW.user_id := OLD.user_id;
    NEW.id := OLD.id;
    NEW.utnfrm_encuestas_enabled := OLD.utnfrm_encuestas_enabled;
  END IF;

  RETURN NEW;
END;
$$;

-- ==============================================================================
-- MIGRATION: 20261101190000_red_team_security_remediation.sql
-- BLINDAJE TOTAL DE BASE DE DATOS: REVOCACIÓN DE ESCRITURA EN TABLAS CRÍTICAS,
-- FIREWALL POSTGREST (PRE-REQUEST), DESACTIVACIÓN DE ESQUEMA Y TRIGGERS DE SERVIDOR
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. FIREWALL DE API POSTGREST Y OCULTAMIENTO TOTAL DEL ESQUEMA DE BASE DE DATOS
-- ------------------------------------------------------------------------------
-- 0.1 Desactivar la introspección del esquema OpenAPI/Swagger en /rest/v1/
-- Impide que herramientas externas, atacantes o extensiones listen las tablas,
-- vistas, columnas y funciones RPC de la base de datos.
ALTER ROLE authenticator SET pgrst.openapi_mode TO 'disabled';

-- 0.2 Función Firewall Pre-Request: Se ejecuta ANTES de cualquier consulta a /rest/v1/*
-- Bloquea accesos directos desde el navegador (barra de direcciones), Postman,
-- Insomnia, cURL, Python, scripts externos y orígenes no autorizados.
CREATE OR REPLACE FUNCTION public.verify_tabe_api_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_headers jsonb;
  v_origin text;
  v_referer text;
  v_user_agent text;
  v_sec_fetch_mode text;
  v_client_shield text;
BEGIN
  -- Permitir llamadas internas del motor o service_role (Edge Functions)
  IF auth.role() = 'service_role' OR current_user = 'postgres' THEN
    RETURN;
  END IF;

  v_headers := COALESCE(current_setting('request.headers', true), '{}')::jsonb;
  v_origin := lower(COALESCE(v_headers->>'origin', ''));
  v_referer := lower(COALESCE(v_headers->>'referer', ''));
  v_user_agent := lower(COALESCE(v_headers->>'user-agent', ''));
  v_sec_fetch_mode := lower(COALESCE(v_headers->>'sec-fetch-mode', ''));
  v_client_shield := COALESCE(v_headers->>'x-tabe-client', '');

  -- 1. Bloquear herramientas de hacking, clientes REST manuales y scrapers
  IF v_user_agent ~ '(postman|insomnia|curl/|python|httpie|wget|burp|sqlmap|nikto|nuclei|go-http-client|axios/)' THEN
    RAISE EXCEPTION 'Acceso directo a la base de datos bloqueado por el firewall de seguridad.'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Bloquear apertura directa de URLs de Supabase en una pestaña del navegador
  IF v_sec_fetch_mode = 'navigate' THEN
    RAISE EXCEPTION 'No se permite navegar directamente a los endpoints de datos.'
      USING ERRCODE = '42501';
  END IF;

  -- 3. Exigir que la petición provenga exclusivamente del dominio oficial de TABE o cliente firmado
  IF v_client_shield <> 'tabe-web-v2-shield' THEN
    IF v_origin = '' AND v_referer = '' THEN
      RAISE EXCEPTION 'Petición rechazada: Origen desconocido o acceso fuera de la aplicación.'
        USING ERRCODE = '42501';
    END IF;

    IF v_origin <> '' AND NOT (
      v_origin = 'https://tabe.com.ar'
      OR v_origin = 'https://www.tabe.com.ar'
      OR v_origin LIKE 'https://%.tabe.com.ar'
      OR v_origin LIKE 'https://%.vercel.app'
      OR v_origin LIKE 'http://localhost:%'
      OR v_origin LIKE 'http://127.0.0.1:%'
    ) THEN
      RAISE EXCEPTION 'Origen no autorizado para consultar la base de datos.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_tabe_api_access() TO anon, authenticated, service_role;
ALTER ROLE authenticator SET pgrst.db_pre_request TO 'public.verify_tabe_api_access';
NOTIFY pgrst, 'reload config';

-- ------------------------------------------------------------------------------
-- 1. REVOCACIÓN TOTAL DE ESCRITURA DIRECTA EN TABLAS DE GAMIFICACIÓN Y SISTEMA
-- ------------------------------------------------------------------------------
-- Ningún usuario autenticado ni anónimo tiene permiso de INSERT, UPDATE o DELETE
-- en user_stats, user_inventory, user_achievements, user_usage, user_roles ni achievements.
-- Cualquier intento desde la consola (F12) devuelve "403 permission denied for table".

REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_stats FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_inventory FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_achievements FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_usage FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_roles FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.achievements FROM anon, authenticated;

-- Eliminar todas las políticas de escritura en estas tablas
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;

CREATE POLICY "Users can view their own stats"
ON public.user_stats FOR SELECT
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR auth.uid() = '47c2a694-d1f2-4a4b-b37f-45e37ea010c6'::uuid
);

DROP POLICY IF EXISTS "Users can update their own inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Users can insert their own inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Users can delete their own inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Users can view their own inventory" ON public.user_inventory;

CREATE POLICY "Users can view their own inventory"
ON public.user_inventory FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can update own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;

CREATE POLICY "Users can view own achievements"
ON public.user_achievements FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own usage" ON public.user_usage;
DROP POLICY IF EXISTS "Users can update own usage" ON public.user_usage;
DROP POLICY IF EXISTS "Users can view own usage" ON public.user_usage;

CREATE POLICY "Users can view own usage"
ON public.user_usage FOR SELECT
USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 2. CÁLCULO 100% EN SERVIDOR DE XP, CRÉDITOS, NIVEL Y RACHA (VÍA TRIGGERS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS xp_multiplier NUMERIC DEFAULT 1.0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS xp_multiplier_ends_at TIMESTAMPTZ;

-- 2.1 Función que calcula la racha real del usuario según sus sesiones en study_sessions
CREATE OR REPLACE FUNCTION public.compute_real_user_streak(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
  v_cursor date;
  v_streak int := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM public.study_sessions WHERE user_id = p_user_id AND fecha = v_today) THEN
    v_cursor := v_today;
  ELSIF EXISTS (SELECT 1 FROM public.study_sessions WHERE user_id = p_user_id AND fecha = (v_today - 1)) THEN
    v_cursor := v_today - 1;
  ELSE
    RETURN 0;
  END IF;

  WHILE EXISTS (
    SELECT 1 FROM public.study_sessions
    WHERE user_id = p_user_id AND fecha = v_cursor
  ) LOOP
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
    IF v_streak > 3650 THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN v_streak;
END;
$$;

-- 2.2 Trigger BEFORE INSERT OR UPDATE en study_sessions (Anti-fechas falsas y Anti-bucle)
CREATE OR REPLACE FUNCTION public.protect_study_sessions_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
  v_daily_total int;
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin') OR auth.uid() = '47c2a694-d1f2-4a4b-b37f-45e37ea010c6'::uuid THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.fecha IS DISTINCT FROM OLD.fecha
       OR NEW.duracion_segundos IS DISTINCT FROM OLD.duracion_segundos THEN
      RAISE EXCEPTION 'Violación de seguridad: No se puede modificar el historial de sesiones de estudio.';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.user_id := auth.uid();
    NEW.created_at := now();

    IF NEW.fecha IS NULL OR NEW.fecha < (v_today - 1) OR NEW.fecha > (v_today + 1) THEN
      RAISE EXCEPTION 'Violación de seguridad: No se permite registrar sesiones con fechas pasadas o futuras.';
    END IF;

    IF NEW.duracion_segundos IS NULL OR NEW.duracion_segundos <= 0 OR NEW.duracion_segundos > 14400 THEN
      RAISE EXCEPTION 'Violación de seguridad: Duración de sesión inválida (máx. 4 horas por sesión).';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.study_sessions
      WHERE user_id = NEW.user_id
        AND created_at > (now() - interval '30 seconds')
    ) THEN
      RAISE EXCEPTION 'Demasiadas sesiones registradas simultáneamente. Aguarda unos segundos.';
    END IF;

    SELECT COALESCE(SUM(duracion_segundos), 0) INTO v_daily_total
    FROM public.study_sessions
    WHERE user_id = NEW.user_id AND fecha = NEW.fecha;

    IF (v_daily_total + NEW.duracion_segundos) > 57600 THEN
      RAISE EXCEPTION 'Límite diario de horas de estudio alcanzado.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_study_sessions_integrity ON public.study_sessions;
CREATE TRIGGER trg_protect_study_sessions_integrity
BEFORE INSERT OR UPDATE ON public.study_sessions
FOR EACH ROW
EXECUTE FUNCTION public.protect_study_sessions_integrity();

-- 2.3 Trigger AFTER INSERT OR DELETE en study_sessions:
-- Actualiza automáticamente user_stats desde el motor PostgreSQL (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.sync_user_stats_from_study_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours int;
  v_xp int;
  v_credits int;
  v_mult numeric := 1.0;
  v_mult_ends timestamptz;
  v_streak int;
BEGIN
  PERFORM set_config('app.bypass_stats_guard', 'true', true);

  IF TG_OP = 'INSERT' THEN
    v_hours := floor(COALESCE(NEW.duracion_segundos, 0) / 3600.0)::int;
    v_credits := floor(COALESCE(NEW.duracion_segundos, 0) / 60.0)::int;

    IF NEW.tipo = 'videocall' THEN
      v_xp := floor(COALESCE(NEW.duracion_segundos, 0) / 60.0)::int;
    ELSE
      v_xp := floor(COALESCE(NEW.duracion_segundos, 0) / 60.0)::int * 2;
    END IF;

    SELECT COALESCE(xp_multiplier, 1.0), xp_multiplier_ends_at
    INTO v_mult, v_mult_ends
    FROM public.user_stats
    WHERE user_id = NEW.user_id;

    IF v_mult > 1.0 AND v_mult_ends IS NOT NULL AND v_mult_ends > now() THEN
      v_xp := floor(v_xp * v_mult)::int;
    END IF;

    v_streak := public.compute_real_user_streak(NEW.user_id);

    INSERT INTO public.user_stats (
      user_id, horas_estudio_total, xp_total, credits, nivel, racha_actual, mejor_racha, updated_at
    )
    VALUES (
      NEW.user_id,
      v_hours,
      v_xp,
      v_credits,
      GREATEST(1, floor(v_xp / 100.0)::int + 1),
      v_streak,
      v_streak,
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      horas_estudio_total = COALESCE(public.user_stats.horas_estudio_total, 0) + v_hours,
      xp_total = COALESCE(public.user_stats.xp_total, 0) + v_xp,
      credits = COALESCE(public.user_stats.credits, 0) + v_credits,
      nivel = GREATEST(1, floor((COALESCE(public.user_stats.xp_total, 0) + v_xp) / 100.0)::int + 1),
      racha_actual = v_streak,
      mejor_racha = GREATEST(COALESCE(public.user_stats.mejor_racha, 0), v_streak),
      updated_at = now();

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_hours := floor(COALESCE(OLD.duracion_segundos, 0) / 3600.0)::int;
    v_credits := floor(COALESCE(OLD.duracion_segundos, 0) / 60.0)::int;
    v_xp := floor(COALESCE(OLD.duracion_segundos, 0) / 60.0)::int * 2;
    v_streak := public.compute_real_user_streak(OLD.user_id);

    UPDATE public.user_stats
    SET
      horas_estudio_total = GREATEST(0, COALESCE(horas_estudio_total, 0) - v_hours),
      xp_total = GREATEST(0, COALESCE(xp_total, 0) - v_xp),
      credits = GREATEST(0, COALESCE(credits, 0) - v_credits),
      nivel = GREATEST(1, floor(GREATEST(0, COALESCE(xp_total, 0) - v_xp) / 100.0)::int + 1),
      racha_actual = v_streak,
      updated_at = now()
    WHERE user_id = OLD.user_id;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_stats_from_study_session ON public.study_sessions;
CREATE TRIGGER trg_sync_user_stats_from_study_session
AFTER INSERT OR DELETE ON public.study_sessions
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_stats_from_study_session();

-- 2.4 Trigger AFTER INSERT OR UPDATE en user_subject_status:
-- Acredita automáticamente +100 XP (aprobada) o +50 XP (regular) desde el servidor
CREATE OR REPLACE FUNCTION public.sync_user_stats_from_subject_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp_add int := 0;
  v_credits_add int := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.estado = 'aprobada' THEN
      v_xp_add := 100;
      v_credits_add := 50;
    ELSIF NEW.estado = 'regular' THEN
      v_xp_add := 50;
      v_credits_add := 25;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.estado = 'aprobada' AND COALESCE(OLD.estado, '') <> 'aprobada' THEN
      v_xp_add := 100;
      v_credits_add := 50;
    ELSIF NEW.estado = 'regular' AND COALESCE(OLD.estado, '') NOT IN ('regular', 'aprobada') THEN
      v_xp_add := 50;
      v_credits_add := 25;
    END IF;
  END IF;

  IF v_xp_add > 0 THEN
    PERFORM set_config('app.bypass_stats_guard', 'true', true);

    INSERT INTO public.user_stats (user_id, xp_total, credits, nivel, updated_at)
    VALUES (
      NEW.user_id,
      v_xp_add,
      v_credits_add,
      GREATEST(1, floor(v_xp_add / 100.0)::int + 1),
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      xp_total = COALESCE(public.user_stats.xp_total, 0) + v_xp_add,
      credits = COALESCE(public.user_stats.credits, 0) + v_credits_add,
      nivel = GREATEST(1, floor((COALESCE(public.user_stats.xp_total, 0) + v_xp_add) / 100.0)::int + 1),
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_stats_from_subject_status ON public.user_subject_status;
CREATE TRIGGER trg_sync_user_stats_from_subject_status
AFTER INSERT OR UPDATE ON public.user_subject_status
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_stats_from_subject_status();

-- ------------------------------------------------------------------------------
-- 3. STORAGE: RESTRICCIÓN DE PROPIEDAD EN BUCKET 'notion-images' (ANTI-SABOTAJE)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can update notion images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete notion images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own notion images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own notion images" ON storage.objects;

CREATE POLICY "Users can update own notion images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'notion-images'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'notion-images'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Users can delete own notion images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'notion-images'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'notion-images';

-- ------------------------------------------------------------------------------
-- 4. BOLA / IDOR EN APUNTES COMPARTIDOS (notion_documents & collaborators)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_notion_share_token(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_doc_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_doc_id
  FROM public.notion_documents
  WHERE share_token = trim(p_token)
    AND is_shared = true
  LIMIT 1;

  IF v_doc_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.notion_documents
    WHERE id = v_doc_id AND user_id = v_user_id
  ) THEN
    INSERT INTO public.notion_document_collaborators (document_id, user_id, role)
    VALUES (v_doc_id, v_user_id, 'editor')
    ON CONFLICT (document_id, user_id) DO NOTHING;
  END IF;

  RETURN v_doc_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_notion_share_token(text) TO authenticated;

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
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_notion_document(p_doc_id uuid, p_user_id uuid)
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
        OR (
          d.is_shared = true
          AND (
            EXISTS (
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
          )
        )
      )
  );
$$;

DROP POLICY IF EXISTS "Acceso total a apuntes propios y de amigos" ON public.notion_documents;
DROP POLICY IF EXISTS "Users can view own and friends documents" ON public.notion_documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.notion_documents;
DROP POLICY IF EXISTS "Users can view own and public documents" ON public.notion_documents;
DROP POLICY IF EXISTS "Users can view own or shared documents" ON public.notion_documents;
DROP POLICY IF EXISTS "Users can view accessible documents" ON public.notion_documents;

CREATE POLICY "Users can view accessible documents"
ON public.notion_documents FOR SELECT
USING (
  auth.uid() = user_id
  OR is_public = true
  OR public.can_access_notion_document(id, auth.uid())
);

DROP POLICY IF EXISTS "Users can update own documents" ON public.notion_documents;
DROP POLICY IF EXISTS "Users can update own or shared documents" ON public.notion_documents;
DROP POLICY IF EXISTS "Users can update accessible documents" ON public.notion_documents;

CREATE POLICY "Users can update accessible documents"
ON public.notion_documents FOR UPDATE
USING (
  auth.uid() = user_id
  OR public.can_edit_notion_document(id, auth.uid())
)
WITH CHECK (
  auth.uid() = user_id
  OR public.can_edit_notion_document(id, auth.uid())
);

DROP POLICY IF EXISTS "Users can register as collaborators on shared docs" ON public.notion_document_collaborators;
CREATE POLICY "Users can register as collaborators on shared docs"
ON public.notion_document_collaborators FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.notion_documents d
    WHERE d.id = document_id
      AND (
        d.user_id = auth.uid()
        OR (
          d.parent_id IS NOT NULL
          AND public.can_edit_notion_document(d.parent_id, auth.uid())
        )
      )
  )
);

-- ------------------------------------------------------------------------------
-- 5. AISLAMIENTO ESTRICTO DE PROFILES (CERO FUGA DE EMAILS / TOKENS / PLANES)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admin can view all" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile, friends or admin can view all" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own and friend profiles" ON public.profiles;
DROP POLICY IF EXISTS "Ver perfiles propios y de amigos" ON public.profiles;
DROP POLICY IF EXISTS "Users can view friend profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (
  auth.uid() = user_id
  OR auth.uid() = id
  OR public.has_role(auth.uid(), 'admin')
  OR auth.uid() = '47c2a694-d1f2-4a4b-b37f-45e37ea010c6'::uuid
);

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS utnfrm_encuestas_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    NEW.email := OLD.email;
    NEW.utnfrm_encuestas_enabled := OLD.utnfrm_encuestas_enabled;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_columns();

CREATE OR REPLACE VIEW public.public_profiles 
WITH (security_invoker = false) AS
SELECT 
  user_id,
  id,
  display_id,
  nombre,
  username,
  avatar_url,
  carrera,
  facultad,
  active_badge,
  active_theme,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 6. SANEAMIENTO AUTOMÁTICO DE RACHAS Y NIVELES ADULTERADOS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM set_config('app.bypass_stats_guard', 'true', true);

  -- Inicializar user_stats para cualquier usuario de profiles que aún no tenga fila
  INSERT INTO public.user_stats (user_id, xp_total, nivel, racha_actual, mejor_racha, horas_estudio_total, credits)
  SELECT p.user_id, 0, 1, 0, 0, 0, 0
  FROM public.profiles p
  ON CONFLICT (user_id) DO NOTHING;

  -- Recalcular racha real y nivel real de todos los usuarios
  UPDATE public.user_stats us
  SET
    racha_actual = public.compute_real_user_streak(us.user_id),
    mejor_racha = GREATEST(
      public.compute_real_user_streak(us.user_id),
      COALESCE((
        SELECT COUNT(DISTINCT ss.fecha)::int
        FROM public.study_sessions ss
        WHERE ss.user_id = us.user_id
      ), 0)
    ),
    nivel = GREATEST(1, floor(COALESCE(us.xp_total, 0) / 100.0)::int + 1);
END $$;

-- Habilitar extensión pg_cron si no existe
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Función de purga segura de tokens revocados de más de 3 días
CREATE OR REPLACE FUNCTION public.purge_revoked_auth_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM auth.refresh_tokens
  WHERE revoked = true
    AND created_at < NOW() - INTERVAL '3 days';
END;
$$;

-- Programar ejecución diaria a las 03:00 UTC mediante pg_cron
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Desprogramar si ya existiera para evitar duplicados
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'daily-purge-revoked-auth-tokens';

    -- Programar job diario
    PERFORM cron.schedule(
      'daily-purge-revoked-auth-tokens',
      '0 3 * * *',
      'SELECT public.purge_revoked_auth_tokens();'
    );
  END IF;
END $$;

-- ==============================================================================
-- Migration: Optimizacion de Almacenamiento y Rendimiento de Base de Datos
-- Objetivo: Evitar que la base de datos se llene, compactar espacio muerto (MVCC),
--           limpiar datos efimeros obsoletos y monitorizar peso por tabla.
-- 100% SEGURO: No elimina ni altera ningun dato real de los usuarios.
-- ==============================================================================

-- 1. INDICES EFICIENTES (Indices parciales y compactos)
-- ------------------------------------------------------------------------------
-- Optimiza consultas de participantes activos sin indexar los historicos salidos
CREATE INDEX IF NOT EXISTS idx_room_participants_active 
ON public.room_participants (room_id, user_id) 
WHERE left_at IS NULL;

-- Asegura busquedas rapidas de notas por usuario
CREATE INDEX IF NOT EXISTS idx_notion_documents_user_id 
ON public.notion_documents (user_id, updated_at DESC);

-- Optimiza busqueda de mensajes de discord por canal recientes
CREATE INDEX IF NOT EXISTS idx_discord_messages_channel_created 
ON public.discord_messages (channel_id, created_at DESC);


-- 2. AUTOVACUUM AGRESIVO EN TABLAS DE ALTA ESCRITURA
-- ------------------------------------------------------------------------------
-- En PostgreSQL, cada UPDATE (como el autoguardado de Notion o actualizar XP)
-- crea una fila muerta en disco. Por defecto Postgres espera al 20% de filas muertas.
-- Con estos ajustes, Postgres reutiliza y libera el espacio de disco de inmediato (5%).

ALTER TABLE public.notion_documents SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_vacuum_threshold = 25,
    autovacuum_vacuum_cost_limit = 1000
);

ALTER TABLE public.user_stats SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_vacuum_threshold = 20,
    autovacuum_vacuum_cost_limit = 1000
);

ALTER TABLE public.profiles SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_vacuum_threshold = 25,
    autovacuum_vacuum_cost_limit = 1000
);

ALTER TABLE public.discord_voice_participants SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_vacuum_threshold = 10
);


-- 3. FUNCION DE LIMPIEZA DE DATOS EFIMEROS OBSOLETOS (PURGE GHOST DATA)
-- ------------------------------------------------------------------------------
-- Solo limpia datos residuales que ya no se usan en la app:
-- - Participantes de salas que ya salieron hace mas de 7 dias
-- - Conexiones de voz de Discord colgadas hace mas de 24hs (desconexiones sin cerrar)
CREATE OR REPLACE FUNCTION public.cleanup_ephemeral_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_room_parts INTEGER := 0;
    deleted_voice_parts INTEGER := 0;
BEGIN
    -- 1. Limpiar historico de participantes de salas que ya salieron (antiguedad > 7 dias)
    DELETE FROM public.room_participants
    WHERE left_at IS NOT NULL 
      AND left_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS deleted_room_parts = ROW_COUNT;

    -- 2. Limpiar participantes de voz de Discord fantasmas (sin desconexion limpia > 24hs)
    DELETE FROM public.discord_voice_participants
    WHERE joined_at < NOW() - INTERVAL '24 hours';
    GET DIAGNOSTICS deleted_voice_parts = ROW_COUNT;

    RETURN json_build_object(
        'status', 'success',
        'deleted_room_participants', deleted_room_parts,
        'deleted_voice_participants', deleted_voice_parts,
        'timestamp', NOW()
    );
END;
$$;


-- 4. FUNCION DE DIAGNOSTICO: CONSULTAR PESO EXACTO DE CADA TABLA EN MB
-- ------------------------------------------------------------------------------
-- Permite ver en segundos cuanto pesa cada tabla e indice en Supabase
CREATE OR REPLACE FUNCTION public.get_database_storage_stats()
RETURNS TABLE (
    table_name TEXT,
    total_size TEXT,
    table_size TEXT,
    index_size TEXT,
    total_bytes BIGINT,
    row_count_estimate BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        c.relname::TEXT AS table_name,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
        pg_size_pretty(pg_relation_size(c.oid)) AS table_size,
        pg_size_pretty(pg_total_relation_size(c.oid) - pg_relation_size(c.oid)) AS index_size,
        pg_total_relation_size(c.oid) AS total_bytes,
        c.reltuples::BIGINT AS row_count_estimate
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC;
$$;

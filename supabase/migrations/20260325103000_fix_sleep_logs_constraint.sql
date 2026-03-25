-- Remove duplicate records, keeping only the most recent one for each (user_id, fecha)
DELETE FROM sleep_logs
WHERE id NOT IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY user_id, fecha ORDER BY created_at DESC, id DESC) as rn
        FROM sleep_logs
    ) sub
    WHERE rn = 1
);

-- Add unique constraint to enable upsert (onConflict: 'user_id,fecha')
ALTER TABLE sleep_logs ADD CONSTRAINT sleep_logs_user_id_fecha_key UNIQUE (user_id, fecha);

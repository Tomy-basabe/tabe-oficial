-- Migration: Agregar soporte para 5 islas temáticas en el módulo Forest
ALTER TABLE public.user_plants 
ADD COLUMN IF NOT EXISTS island_id TEXT DEFAULT 'classic';

-- Índices para optimizar consultas por usuario e isla
CREATE INDEX IF NOT EXISTS idx_user_plants_island_id 
ON public.user_plants (user_id, island_id);

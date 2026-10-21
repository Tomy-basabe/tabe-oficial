-- Migración: Eliminar TabeGochi y todos los objetos asociados
-- Elimina la tabla tabegochi_pets y políticas RLS asociadas
DROP TABLE IF EXISTS public.tabegochi_pets CASCADE;

-- Limpieza preventiva de inventario en caso de que existan registros heredados
DELETE FROM public.user_inventory WHERE item_type = 'tabegochi_save';

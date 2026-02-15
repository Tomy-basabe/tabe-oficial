-- Migration to expand calendar_events types
ALTER TABLE public.calendar_events DROP CONSTRAINT IF EXISTS calendar_events_tipo_examen_check;
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_tipo_examen_check CHECK (tipo_examen IN ('P1', 'P2', 'Global', 'Final', 'Recuperatorio P1', 'Recuperatorio P2', 'Recuperatorio Global', 'Estudio', 'TP', 'Entrega', 'Clase', 'Otro'));

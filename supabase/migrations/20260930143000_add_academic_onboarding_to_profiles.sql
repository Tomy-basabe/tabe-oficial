-- Migration: Agregar campos para onboarding académico en profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS academic_onboarding_dismissed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS academic_profile_completed BOOLEAN DEFAULT false;

-- Si el usuario ya tiene carrera asignada, marcar academic_profile_completed como true
UPDATE public.profiles
SET academic_profile_completed = true
WHERE carrera IS NOT NULL AND carrera != '';

-- Add index to study_sessions to optimize streak updates and prevent timeouts
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON public.study_sessions (user_id, fecha);

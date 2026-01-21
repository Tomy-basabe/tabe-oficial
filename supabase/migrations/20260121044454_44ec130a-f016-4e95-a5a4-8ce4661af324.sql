-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subject_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.flashcard_decks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.flashcards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;
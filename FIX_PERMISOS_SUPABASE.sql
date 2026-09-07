-- ============================================================
-- TABE COMPREHENSIVE RLS & ACCESS FIX
-- Corrige todos los bloqueos de permisos RLS que causaban:
-- 1. Demoras extremas / bucles de reconexión realtime en todos los apartados
-- 2. "Pomodoro, Rutinas y Métricas se quedan cargando"
-- 3. "Amigos, Logros y Marketplace no cargan"
-- 4. "Apuntes, Flashcards, Cuestionarios y Biblioteca con respuesta muy tardía"
-- ============================================================

-- 1. PERFILES (PROFILES)
-- Esencial para amigos, ranking, creadores del marketplace y AuthContext
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver perfiles propios y de amigos" ON public.profiles;
DROP POLICY IF EXISTS "Users can view friend profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = id);

-- 2. RUTINAS (ROUTINES, ROUTINE_OVERRIDES, ROUTINE_LOGS)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'routines') THEN
    ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view own routines" ON public.routines;
    DROP POLICY IF EXISTS "Users can insert own routines" ON public.routines;
    DROP POLICY IF EXISTS "Users can update own routines" ON public.routines;
    DROP POLICY IF EXISTS "Users can delete own routines" ON public.routines;
    CREATE POLICY "Users can view own routines" ON public.routines FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own routines" ON public.routines FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own routines" ON public.routines FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete own routines" ON public.routines FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'routine_overrides') THEN
    ALTER TABLE public.routine_overrides ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view own routine overrides" ON public.routine_overrides;
    DROP POLICY IF EXISTS "Users can insert own routine overrides" ON public.routine_overrides;
    DROP POLICY IF EXISTS "Users can update own routine overrides" ON public.routine_overrides;
    DROP POLICY IF EXISTS "Users can delete own routine overrides" ON public.routine_overrides;
    CREATE POLICY "Users can view own routine overrides" ON public.routine_overrides FOR SELECT 
      USING (EXISTS (SELECT 1 FROM public.routines WHERE routines.id = routine_overrides.routine_id AND routines.user_id = auth.uid()));
    CREATE POLICY "Users can insert own routine overrides" ON public.routine_overrides FOR INSERT 
      WITH CHECK (EXISTS (SELECT 1 FROM public.routines WHERE routines.id = routine_overrides.routine_id AND routines.user_id = auth.uid()));
    CREATE POLICY "Users can update own routine overrides" ON public.routine_overrides FOR UPDATE 
      USING (EXISTS (SELECT 1 FROM public.routines WHERE routines.id = routine_overrides.routine_id AND routines.user_id = auth.uid()));
    CREATE POLICY "Users can delete own routine overrides" ON public.routine_overrides FOR DELETE 
      USING (EXISTS (SELECT 1 FROM public.routines WHERE routines.id = routine_overrides.routine_id AND routines.user_id = auth.uid()));
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'routine_logs') THEN
    ALTER TABLE public.routine_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view own routine logs" ON public.routine_logs;
    DROP POLICY IF EXISTS "Users can insert own routine logs" ON public.routine_logs;
    DROP POLICY IF EXISTS "Users can update own routine logs" ON public.routine_logs;
    DROP POLICY IF EXISTS "Users can delete own routine logs" ON public.routine_logs;
    CREATE POLICY "Users can view own routine logs" ON public.routine_logs FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own routine logs" ON public.routine_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own routine logs" ON public.routine_logs FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete own routine logs" ON public.routine_logs FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. BIBLIOTECA (LIBRARY_FILES, LIBRARY_FOLDERS)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'library_files') THEN
    ALTER TABLE public.library_files ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public library files are viewable by everyone" ON public.library_files;
    DROP POLICY IF EXISTS "Allow individual update for library_files" ON public.library_files;
    DROP POLICY IF EXISTS "Users can view own and public library files" ON public.library_files;
    DROP POLICY IF EXISTS "Users can insert own library files" ON public.library_files;
    DROP POLICY IF EXISTS "Users can update own library files" ON public.library_files;
    DROP POLICY IF EXISTS "Users can delete own library files" ON public.library_files;
    CREATE POLICY "Users can view own and public library files" ON public.library_files FOR SELECT USING (auth.uid() = user_id OR is_public = true);
    CREATE POLICY "Users can insert own library files" ON public.library_files FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own library files" ON public.library_files FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete own library files" ON public.library_files FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'library_folders') THEN
    ALTER TABLE public.library_folders ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public library folders are viewable by everyone" ON public.library_folders;
    DROP POLICY IF EXISTS "Allow individual update for library_folders" ON public.library_folders;
    DROP POLICY IF EXISTS "Users can view own and public library folders" ON public.library_folders;
    DROP POLICY IF EXISTS "Users can insert own library folders" ON public.library_folders;
    DROP POLICY IF EXISTS "Users can update own library folders" ON public.library_folders;
    DROP POLICY IF EXISTS "Users can delete own library folders" ON public.library_folders;
    CREATE POLICY "Users can view own and public library folders" ON public.library_folders FOR SELECT USING (auth.uid() = user_id OR is_public = true);
    CREATE POLICY "Users can insert own library folders" ON public.library_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own library folders" ON public.library_folders FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete own library folders" ON public.library_folders FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. APUNTES (NOTION_DOCUMENTS)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notion_documents') THEN
    ALTER TABLE public.notion_documents ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Acceso total a apuntes propios y de amigos" ON public.notion_documents;
    DROP POLICY IF EXISTS "Users can view own and friends documents" ON public.notion_documents;
    DROP POLICY IF EXISTS "Users can view their own documents" ON public.notion_documents;
    DROP POLICY IF EXISTS "Users can view own and public documents" ON public.notion_documents;
    DROP POLICY IF EXISTS "Users can insert own documents" ON public.notion_documents;
    DROP POLICY IF EXISTS "Users can update own documents" ON public.notion_documents;
    DROP POLICY IF EXISTS "Users can delete own documents" ON public.notion_documents;

    CREATE POLICY "Users can view own and public documents" ON public.notion_documents
      FOR SELECT USING (
        auth.uid() = user_id 
        OR is_public = true
        OR EXISTS (
          SELECT 1 FROM public.friendships 
          WHERE status = 'accepted' AND (
            (requester_id = auth.uid() AND addressee_id = notion_documents.user_id) OR 
            (addressee_id = auth.uid() AND requester_id = notion_documents.user_id)
          )
        )
      );

    CREATE POLICY "Users can insert own documents" ON public.notion_documents
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own documents" ON public.notion_documents
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete own documents" ON public.notion_documents
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. CUESTIONARIOS (QUIZ_DECKS, QUIZ_QUESTIONS)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quiz_decks') THEN
    ALTER TABLE public.quiz_decks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view own and public quiz decks" ON public.quiz_decks;
    DROP POLICY IF EXISTS "Users can insert own quiz decks" ON public.quiz_decks;
    DROP POLICY IF EXISTS "Users can update own quiz decks" ON public.quiz_decks;
    DROP POLICY IF EXISTS "Users can delete own quiz decks" ON public.quiz_decks;
    CREATE POLICY "Users can view own and public quiz decks" ON public.quiz_decks FOR SELECT USING (auth.uid() = user_id OR is_public = true);
    CREATE POLICY "Users can insert own quiz decks" ON public.quiz_decks FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own quiz decks" ON public.quiz_decks FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete own quiz decks" ON public.quiz_decks FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quiz_questions') THEN
    ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view own and public quiz questions" ON public.quiz_questions;
    DROP POLICY IF EXISTS "Users can insert own quiz questions" ON public.quiz_questions;
    DROP POLICY IF EXISTS "Users can update own quiz questions" ON public.quiz_questions;
    DROP POLICY IF EXISTS "Users can delete own quiz questions" ON public.quiz_questions;
    CREATE POLICY "Users can view own and public quiz questions" ON public.quiz_questions FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.quiz_decks WHERE quiz_decks.id = quiz_questions.deck_id AND (quiz_decks.user_id = auth.uid() OR quiz_decks.is_public = true))
    );
    CREATE POLICY "Users can insert own quiz questions" ON public.quiz_questions FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.quiz_decks WHERE quiz_decks.id = quiz_questions.deck_id AND quiz_decks.user_id = auth.uid())
    );
    CREATE POLICY "Users can update own quiz questions" ON public.quiz_questions FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.quiz_decks WHERE quiz_decks.id = quiz_questions.deck_id AND quiz_decks.user_id = auth.uid())
    );
    CREATE POLICY "Users can delete own quiz questions" ON public.quiz_questions FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.quiz_decks WHERE quiz_decks.id = quiz_questions.deck_id AND quiz_decks.user_id = auth.uid())
    );
  END IF;
END $$;

-- 6. FLASHCARDS (FLASHCARD_DECKS, FLASHCARDS)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'flashcard_decks') THEN
    ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Anyone can view public decks" ON public.flashcard_decks;
    DROP POLICY IF EXISTS "Users can view their own decks" ON public.flashcard_decks;
    DROP POLICY IF EXISTS "Users can view own and public decks" ON public.flashcard_decks;
    DROP POLICY IF EXISTS "Users can insert their own decks" ON public.flashcard_decks;
    DROP POLICY IF EXISTS "Users can update their own decks" ON public.flashcard_decks;
    DROP POLICY IF EXISTS "Users can delete their own decks" ON public.flashcard_decks;

    CREATE POLICY "Users can view own and public decks" ON public.flashcard_decks
      FOR SELECT USING (auth.uid() = user_id OR is_public = true);

    CREATE POLICY "Users can insert their own decks" ON public.flashcard_decks
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own decks" ON public.flashcard_decks
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own decks" ON public.flashcard_decks
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'flashcards') THEN
    ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view their own flashcards" ON public.flashcards;
    DROP POLICY IF EXISTS "Users can view own and public flashcards" ON public.flashcards;
    DROP POLICY IF EXISTS "Users can insert their own flashcards" ON public.flashcards;
    DROP POLICY IF EXISTS "Users can update their own flashcards" ON public.flashcards;
    DROP POLICY IF EXISTS "Users can delete their own flashcards" ON public.flashcards;

    CREATE POLICY "Users can view own and public flashcards" ON public.flashcards
      FOR SELECT USING (
        auth.uid() = user_id 
        OR EXISTS (SELECT 1 FROM public.flashcard_decks WHERE flashcard_decks.id = flashcards.deck_id AND (flashcard_decks.user_id = auth.uid() OR flashcard_decks.is_public = true))
      );

    CREATE POLICY "Users can insert their own flashcards" ON public.flashcards
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own flashcards" ON public.flashcards
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own flashcards" ON public.flashcards
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 7. LOGROS (ACHIEVEMENTS, USER_ACHIEVEMENTS)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'achievements') THEN
    ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
    CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_achievements') THEN
    ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
    DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;
    DROP POLICY IF EXISTS "Users can update own achievements" ON public.user_achievements;
    CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own achievements" ON public.user_achievements FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 8. AMISTADES (FRIENDSHIPS)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'friendships') THEN
    ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
    DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
    DROP POLICY IF EXISTS "Users can update friendships they are part of" ON public.friendships;
    DROP POLICY IF EXISTS "Users can delete their own friend requests" ON public.friendships;

    CREATE POLICY "Users can view their own friendships" ON public.friendships
      FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

    CREATE POLICY "Users can send friend requests" ON public.friendships
      FOR INSERT WITH CHECK (auth.uid() = requester_id);

    CREATE POLICY "Users can update friendships they are part of" ON public.friendships
      FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

    CREATE POLICY "Users can delete their own friend requests" ON public.friendships
      FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
  END IF;
END $$;

-- 9. MARKETPLACE & ITEMS
DO $$
DECLARE
  t text;
  cat_tables text[] := ARRAY['items', 'item_mechanics', 'boxes', 'marketplace_items', 'deck_ratings', 'item_inventory'];
BEGIN
  FOREACH t IN ARRAY cat_tables
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS "public_read_%I" ON public.%I;', t, t);
      EXECUTE format('CREATE POLICY "public_read_%I" ON public.%I FOR SELECT USING (true);', t, t);
    END IF;
  END LOOP;
END $$;

-- 10. USER_STATS, USER_USAGE, USER_PLANTS, STUDY_SESSIONS, CALENDAR_EVENTS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_stats;
CREATE POLICY "Users can view their own stats" ON public.user_stats FOR SELECT USING (true); -- Public read allows leaderboard & rankings
CREATE POLICY "Users can insert their own stats" ON public.user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stats" ON public.user_stats FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own usage" ON public.user_usage;
DROP POLICY IF EXISTS "Users can insert own usage" ON public.user_usage;
DROP POLICY IF EXISTS "Users can update own usage" ON public.user_usage;
CREATE POLICY "Users can view own usage" ON public.user_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage" ON public.user_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own usage" ON public.user_usage FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.user_plants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own plants" ON public.user_plants;
DROP POLICY IF EXISTS "Users can insert their own plants" ON public.user_plants;
DROP POLICY IF EXISTS "Users can update their own plants" ON public.user_plants;
DROP POLICY IF EXISTS "Users can delete their own plants" ON public.user_plants;
CREATE POLICY "Users can view their own plants" ON public.user_plants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own plants" ON public.user_plants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plants" ON public.user_plants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plants" ON public.user_plants FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own study sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can insert their own study sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can update their own study sessions" ON public.study_sessions;
DROP POLICY IF EXISTS "Users can delete their own study sessions" ON public.study_sessions;
CREATE POLICY "Users can view their own study sessions" ON public.study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own study sessions" ON public.study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own study sessions" ON public.study_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own study sessions" ON public.study_sessions FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can insert their own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.calendar_events;
CREATE POLICY "Users can view their own events" ON public.calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own events" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own events" ON public.calendar_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own events" ON public.calendar_events FOR DELETE USING (auth.uid() = user_id);

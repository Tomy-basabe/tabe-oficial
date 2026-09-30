-- ============================================================================
-- MIGRATION: DERECHO DE SUPRESIÓN Y ELIMINACIÓN DE CUENTA (LEY 25.326 / RGPD)
-- ============================================================================
-- Permite a cualquier usuario autenticado eliminar irreversiblemente su cuenta
-- y todos los datos personales asociados (perfil, archivos en Storage, apuntes,
-- tareas, flashcards, eventos y credenciales de acceso).

CREATE OR REPLACE FUNCTION public.delete_own_account(confirmation_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- 1. Validar autenticación activa
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autorizado: Debes haber iniciado sesión para ejecutar esta acción.';
  END IF;

  -- 2. Doble factor de confirmación textual estricto
  IF confirmation_code IS NULL OR UPPER(TRIM(confirmation_code)) <> 'ELIMINAR' THEN
    RAISE EXCEPTION 'Confirmación inválida: Debes escribir la palabra exacta "ELIMINAR" para proceder.';
  END IF;

  -- 3. Limpiar almacenamiento de archivos en Storage asociados al usuario
  DELETE FROM storage.objects 
  WHERE bucket_id IN ('library-files', 'avatars', 'notes', 'user_uploads')
    AND ((storage.foldername(name))[1] = v_uid::text OR owner = v_uid::text);

  -- 4. Limpiar datos en tablas públicas explícitamente (garantiza purga aun sin CASCADE)
  DELETE FROM public.study_routines WHERE user_id = v_uid;
  DELETE FROM public.routine_logs WHERE user_id = v_uid;
  DELETE FROM public.routine_overrides WHERE user_id = v_uid;
  DELETE FROM public.routines WHERE user_id = v_uid;
  DELETE FROM public.pomodoro_sessions WHERE user_id = v_uid;
  DELETE FROM public.study_tasks WHERE user_id = v_uid;
  DELETE FROM public.notion_document_collaborators WHERE user_id = v_uid;
  DELETE FROM public.notion_documents WHERE user_id = v_uid;
  DELETE FROM public.library_files WHERE user_id = v_uid;
  DELETE FROM public.library_folders WHERE user_id = v_uid;
  DELETE FROM public.flashcards WHERE user_id = v_uid;
  DELETE FROM public.flashcard_decks WHERE user_id = v_uid;
  DELETE FROM public.deck_ratings WHERE user_id = v_uid;
  DELETE FROM public.quiz_ratings WHERE user_id = v_uid;
  DELETE FROM public.quiz_decks WHERE user_id = v_uid;
  DELETE FROM public.apunte_ratings WHERE user_id = v_uid;
  DELETE FROM public.user_plants WHERE user_id = v_uid;
  DELETE FROM public.user_inventory WHERE user_id = v_uid;
  DELETE FROM public.user_reviews WHERE user_id = v_uid;
  DELETE FROM public.user_usage WHERE user_id = v_uid;
  DELETE FROM public.user_stats WHERE user_id = v_uid;
  DELETE FROM public.user_achievements WHERE user_id = v_uid;
  DELETE FROM public.calendar_events WHERE user_id = v_uid;
  DELETE FROM public.study_sessions WHERE user_id = v_uid;
  DELETE FROM public.user_subject_status WHERE user_id = v_uid;
  DELETE FROM public.ai_chat_messages WHERE user_id = v_uid;
  DELETE FROM public.ai_chat_sessions WHERE user_id = v_uid;
  DELETE FROM public.push_subscriptions WHERE user_id = v_uid;
  DELETE FROM public.discord_voice_participants WHERE user_id = v_uid;
  DELETE FROM public.discord_messages WHERE user_id = v_uid;
  DELETE FROM public.discord_server_members WHERE user_id = v_uid;
  DELETE FROM public.room_participants WHERE user_id = v_uid;
  DELETE FROM public.friendships WHERE user_id = v_uid OR friend_id = v_uid;
  DELETE FROM public.user_roles WHERE user_id = v_uid;
  DELETE FROM public.profiles WHERE user_id = v_uid;

  -- 5. Eliminar la cuenta del usuario en auth.users (purga credenciales, sesiones y tokens)
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

-- Permisos de ejecución: solo usuarios autenticados pueden solicitar borrar su propia cuenta
REVOKE EXECUTE ON FUNCTION public.delete_own_account(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account(text) TO authenticated;

-- Attach mark_hie_dirty trigger to all user-activity tables (idempotent)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'custom_activity_logs',
    'performance_sessions',
    'folder_item_completions',
    'physio_daily_reports',
    'vault_focus_quizzes',
    'session_start_moods'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_mark_hie_dirty ON public.%I', t);
      EXECUTE format('CREATE TRIGGER trg_mark_hie_dirty AFTER INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.mark_hie_dirty()', t);
    END IF;
  END LOOP;
END $$;
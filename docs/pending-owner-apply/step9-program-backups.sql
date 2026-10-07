-- Step 9 archive prep — OWNER APPLIES. Copies only: no drops, no deletes, no changes to live tables.
-- Snapshot tables are read-only for app users (RLS on, no policies) and keep every row as of today.
CREATE TABLE IF NOT EXISTS public._archive_speed_sessions_20261007 AS SELECT * FROM public.speed_sessions;
CREATE TABLE IF NOT EXISTS public._archive_speed_goals_20261007 AS SELECT * FROM public.speed_goals;
CREATE TABLE IF NOT EXISTS public._archive_speed_partner_timings_20261007 AS SELECT * FROM public.speed_partner_timings;
CREATE TABLE IF NOT EXISTS public._archive_sub_module_progress_20261007 AS SELECT * FROM public.sub_module_progress;
CREATE TABLE IF NOT EXISTS public._archive_training_blocks_20261007 AS SELECT * FROM public.training_blocks;
CREATE TABLE IF NOT EXISTS public._archive_block_workouts_20261007 AS SELECT * FROM public.block_workouts;
CREATE TABLE IF NOT EXISTS public._archive_block_exercises_20261007 AS SELECT * FROM public.block_exercises;
CREATE TABLE IF NOT EXISTS public._archive_block_workout_metrics_20261007 AS SELECT * FROM public.block_workout_metrics;
CREATE TABLE IF NOT EXISTS public._archive_user_blocks_20261007 AS SELECT * FROM public.user_blocks;
CREATE TABLE IF NOT EXISTS public._archive_workout_blocks_20261007 AS SELECT * FROM public.workout_blocks;
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '\_archive\_%\_20261007' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('COMMENT ON TABLE public.%I IS %L', t, 'Step 9 program archive snapshot (2026-10-07). Read-only backup; do not use in app code.');
  END LOOP;
END $$;

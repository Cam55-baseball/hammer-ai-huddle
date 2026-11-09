-- Release 0b: the backfill skips (and counts) source rows whose athlete account no longer exists, instead of
-- failing them one by one into the owner's System checks on every re-run. Still idempotent.
CREATE OR REPLACE FUNCTION public.ledger_backfill_all() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET statement_timeout = '300s' AS $$
DECLARE t text; j jsonb; ok boolean; n int; rws int; gone int; per jsonb := '{}'::jsonb; v_before jsonb; v_after jsonb; v record; f record; r record; nb int := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'owner'::app_role) THEN RAISE EXCEPTION 'owner only' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(jsonb_object_agg(s, c), '{}'::jsonb) INTO v_before FROM (SELECT source || '/' || engine_version s, count(*) c FROM public.athlete_metric_observations GROUP BY 1) x;
  PERFORM set_config('ledger.r0_hidden', 'on', true);
  PERFORM set_config('ledger.backfill', 'on', true);
  FOREACH t IN ARRAY ARRAY['vault_performance_tests', 'vault_focus_quizzes', 'wearable_metrics', 'cv_velocity_measurements', 'throwing_reps',
      'catching_reps', 'gp_at_bats', 'gp_pitches', 'defensive_plays', 'athlete_height_checks', 'weight_entries', 'speed_partner_timings', 'custom_activity_logs',
      'combine_results', 'baserunning_splits', 'sprint_analyses', 'delaycam_reps', 'block_workout_metrics', 'athlete_load_tracking', 'athlete_daily_log', 'hie_snapshots'] LOOP
    n := 0; rws := 0; gone := 0;
    FOR j, ok IN EXECUTE format('SELECT to_jsonb(x), EXISTS (SELECT 1 FROM auth.users u WHERE u.id = x.user_id) FROM public.%I x', t) LOOP
      rws := rws + 1;
      IF NOT ok THEN gone := gone + 1; CONTINUE; END IF;
      IF t IN ('combine_results', 'baserunning_splits', 'sprint_analyses', 'delaycam_reps', 'block_workout_metrics', 'athlete_load_tracking', 'athlete_daily_log', 'hie_snapshots')
        THEN n := n + public.ledger_mirror_legacy(t, j);
        ELSE n := n + public.ledger_mirror_row_any(t, j);
      END IF;
    END LOOP;
    per := per || jsonb_build_object(t, jsonb_build_object('rows', rws, 'values', n, 'account_deleted_rows', gone));
  END LOOP;
  n := 0; rws := 0;
  FOR v IN SELECT id, ai_analysis FROM public.videos x WHERE jsonb_typeof(ai_analysis) = 'object' AND temporary_until IS NULL
      AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = x.user_id) LOOP
    FOR f IN SELECT key, value FROM jsonb_each(v.ai_analysis) WHERE key LIKE '%\_tiles\_deterministic' LOOP
      rws := rws + 1; n := n + public.ledger_record_tiles(v.id, f.key, f.value);
    END LOOP;
  END LOOP;
  per := per || jsonb_build_object('videos', jsonb_build_object('rows', rws, 'values', n));
  PERFORM set_config('ledger.r0_hidden', 'off', true);
  PERFORM set_config('ledger.backfill', 'off', true);
  FOR r IN SELECT DISTINCT user_id, canonical_key, context_key FROM public.athlete_metric_observations WHERE canonical_key IS NOT NULL AND legacy_hidden LOOP
    PERFORM public.ledger_baseline_update(r.user_id, r.canonical_key, r.context_key); nb := nb + 1;
  END LOOP;
  SELECT COALESCE(jsonb_object_agg(s, c), '{}'::jsonb) INTO v_after FROM (SELECT source || '/' || engine_version s, count(*) c FROM public.athlete_metric_observations GROUP BY 1) x;
  RETURN jsonb_build_object('sources', per, 'before', v_before, 'after', v_after, 'baselines_updated', nb);
END $$;
REVOKE ALL ON FUNCTION public.ledger_backfill_all() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ledger_backfill_all() TO service_role;
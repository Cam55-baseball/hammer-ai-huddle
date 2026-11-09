-- Nov 9 owner decision (c): physically impossible stored values are parked here (exact before-state, kept for audit)
-- and read as unknown everywhere. Private: server only, no app access.
CREATE TABLE public._snapshot_implausible_measurements_20261109 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_table text NOT NULL,
  source_row_id uuid NOT NULL,
  field text NOT NULL,
  raw_value jsonb,
  metric_key text,
  allowed_range text,
  action text NOT NULL,
  row_before jsonb NOT NULL,
  parked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_table, source_row_id, field)
);
GRANT ALL ON public._snapshot_implausible_measurements_20261109 TO service_role;
ALTER TABLE public._snapshot_implausible_measurements_20261109 ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public._snapshot_implausible_measurements_20261109 IS 'Private owner-authorized before-state of physically impossible stored measurements (Nov 9). Raw values kept for audit; the live rows read as unknown. No client access.';

CREATE OR REPLACE FUNCTION public.ledger_project_row(_table text, j jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE v_user uuid; v_id text; m jsonb; c record; v_res jsonb; k record; v_prev jsonb; v_srid text; v_src text;
  v_base text; v_side text; v_rest text;
BEGIN
  IF j IS NULL OR jsonb_typeof(j) <> 'object' THEN RETURN j; END IF;
  v_user := NULLIF(j->>'user_id', '')::uuid; v_id := j->>'id';
  IF v_user IS NULL OR v_id IS NULL THEN RETURN j; END IF;
  v_src := CASE _table WHEN 'vault_performance_tests' THEN 'six_week' WHEN 'vault_focus_quizzes' THEN 'checkin' WHEN 'wearable_metrics' THEN 'healthkit'
     WHEN 'cv_velocity_measurements' THEN 'cv_velocity' WHEN 'throwing_reps' THEN 'throwing' WHEN 'catching_reps' THEN 'catching'
     WHEN 'gp_at_bats' THEN 'game' WHEN 'gp_pitches' THEN 'game' WHEN 'defensive_plays' THEN 'game'
     WHEN 'athlete_height_checks' THEN 'body' WHEN 'weight_entries' THEN 'body'
     WHEN 'speed_partner_timings' THEN 'practice' WHEN 'custom_activity_logs' THEN 'practice'
     WHEN 'combine_results' THEN 'combine' WHEN 'baserunning_splits' THEN 'baserunning' WHEN 'hie_snapshots' THEN 'readiness'
     WHEN 'athlete_load_tracking' THEN 'workload' WHEN 'athlete_daily_log' THEN 'workload' WHEN 'block_workout_metrics' THEN 'lifting' END;
  IF v_src IS NULL THEN RETURN j; END IF;
  v_srid := CASE WHEN _table = 'wearable_metrics' THEN COALESCE(j->>'sample_id', v_id) ELSE v_id END;
  SELECT COALESCE(jsonb_object_agg(o.metric_key || '#' || o.source_row_id, to_jsonb(o.value)), '{}'::jsonb) INTO m
    FROM public.athlete_metric_observations o
    WHERE o.user_id = v_user AND o.source = v_src
      AND (o.engine_version = _table OR _table IN ('wearable_metrics', 'cv_velocity_measurements'))
      AND o.source_row_id IN (v_srid, v_id || ':any', v_id || ':left', v_id || ':right')
      AND o.physics_ok IS NOT FALSE;  -- Nov 9: physically impossible values read as unknown

  IF _table = 'vault_performance_tests' THEN
    IF jsonb_typeof(j->'results') = 'object' THEN
      v_res := '{}'::jsonb;
      FOR k IN SELECT key, value FROM jsonb_each(j->'results') LOOP
        CONTINUE WHEN jsonb_typeof(k.value) = 'number' AND k.key NOT LIKE '\_%';  -- measurements come from the ledger only
        v_res := v_res || jsonb_build_object(k.key, k.value);
      END LOOP;
      FOR k IN SELECT key, value FROM jsonb_each(m) WHERE key LIKE 'six\_week.%' LOOP
        v_base := substring(split_part(k.key, '#', 1) FROM 10);
        v_rest := split_part(k.key, '#', 2);
        v_side := split_part(v_rest, ':', 2);
        v_res := v_res || jsonb_build_object(v_base || CASE WHEN v_side IN ('left', 'right') THEN '_' || v_side ELSE '' END, k.value);
      END LOOP;
      j := jsonb_set(j, '{results}', v_res);
    END IF;
    -- The comparison column: the previous test's results (same type and sport, saved before this one), from the ledger.
    IF jsonb_typeof(j->'previous_results') = 'object' AND j ? 'test_type' AND j ? 'created_at' THEN
      SELECT to_jsonb(p) - 'previous_results' INTO v_prev FROM public.vault_performance_tests p
        WHERE p.user_id = v_user AND p.test_type = j->>'test_type' AND p.sport IS NOT DISTINCT FROM j->>'sport'
          AND p.id::text <> v_id AND p.created_at < (j->>'created_at')::timestamptz
        ORDER BY p.test_date DESC, p.created_at DESC LIMIT 1;
      j := jsonb_set(j, '{previous_results}', COALESCE(public.ledger_project_row(_table, v_prev)->'results', 'null'::jsonb));
    END IF;
    RETURN j;
  END IF;

  FOR c IN SELECT * FROM (VALUES
      ('vault_focus_quizzes', 'stress_level', 'checkin.stress_level'), ('vault_focus_quizzes', 'hours_slept', 'checkin.hours_slept'),
      ('vault_focus_quizzes', 'sleep_quality', 'checkin.sleep_quality'), ('vault_focus_quizzes', 'perceived_recovery', 'checkin.perceived_recovery'),
      ('vault_focus_quizzes', 'physical_readiness', 'checkin.physical_readiness'), ('vault_focus_quizzes', 'mental_readiness', 'checkin.mental_readiness'),
      ('vault_focus_quizzes', 'mood_level', 'checkin.mood_level'), ('vault_focus_quizzes', 'mental_energy', 'checkin.mental_energy'),
      ('vault_focus_quizzes', 'pain_scale', 'checkin.pain_scale'), ('vault_focus_quizzes', 'resting_hr', 'checkin.resting_hr'),
      ('vault_focus_quizzes', 'reaction_time_ms', 'checkin.reaction_time_ms'), ('vault_focus_quizzes', 'balance_left_seconds', 'checkin.balance_left_seconds'),
      ('vault_focus_quizzes', 'balance_right_seconds', 'checkin.balance_right_seconds'), ('vault_focus_quizzes', 'weight_lbs', 'checkin.weight_lbs'),
      ('gp_at_bats', 'exit_velo', 'game.exit_velo'), ('gp_at_bats', 'launch_angle', 'game.launch_angle'), ('gp_at_bats', 'h1_time_sec', 'game.home_to_first'),
      ('defensive_plays', 'throw_velo', 'game.throw_velo'), ('defensive_plays', 'hang_time_sec', 'game.hang_time'), ('defensive_plays', 'total_play_time_sec', 'game.play_time'),
      ('athlete_height_checks', 'inches', 'body.height_in'),
      ('weight_entries', 'weight_lbs', 'body.weight_lbs'), ('weight_entries', 'body_fat_percent', 'body.body_fat_percent'),
      ('hie_snapshots', 'readiness_score', 'readiness.readiness_score'), ('hie_snapshots', 'training_readiness_score', 'readiness.training_readiness_score'),
      ('athlete_load_tracking', 'cns_load_total', 'workload.cns_load_total'), ('athlete_load_tracking', 'volume_load', 'workload.volume_load'),
      ('athlete_load_tracking', 'intensity_avg', 'workload.intensity_avg'), ('athlete_load_tracking', 'recovery_debt', 'workload.recovery_debt'),
      ('athlete_daily_log', 'cns_load_actual', 'workload.cns_load_actual'), ('block_workout_metrics', 'rpe', 'lifting.session_rpe')
    ) x(t, col, mk) WHERE x.t = _table LOOP
    IF j ? c.col THEN j := jsonb_set(j, ARRAY[c.col], COALESCE(m->(c.mk || '#' || v_srid), 'null'::jsonb)); END IF;
  END LOOP;

  IF _table = 'wearable_metrics' THEN
    v_rest := CASE j->>'metric' WHEN 'hrv_sdnn' THEN 'hrv_ms' WHEN 'resting_hr' THEN 'rhr_bpm' WHEN 'sleep_asleep' THEN 'sleep_min' WHEN 'sleep_in_bed' THEN 'in_bed_min' END;
    IF v_rest IS NOT NULL AND j ? v_rest THEN j := jsonb_set(j, ARRAY[v_rest], COALESCE(m->('healthkit.' || (j->>'metric') || '#' || v_srid), 'null'::jsonb)); END IF;
  ELSIF _table = 'cv_velocity_measurements' AND j->>'status' = 'measured' AND j ? 'velocity_mph' THEN
    j := jsonb_set(j, '{velocity_mph}', COALESCE(m->('cv.pitch_velocity_mph#' || v_id), 'null'::jsonb));
  ELSIF _table IN ('throwing_reps', 'catching_reps') AND j ? 'value' AND j ? 'metric' AND j->>'missing_reason' IS NULL THEN
    j := jsonb_set(j, '{value}', COALESCE(m->(v_src || '.' || (j->>'metric') || '#' || v_id), 'null'::jsonb));
  ELSIF _table = 'gp_pitches' AND j->>'perspective' = 'pitcher' AND j ? 'pitch_velo' THEN
    j := jsonb_set(j, '{pitch_velo}', COALESCE(m->('game.pitch_velo#' || v_id), 'null'::jsonb));
  ELSIF _table IN ('combine_results', 'baserunning_splits') AND j ? 'value' AND j ? 'event' AND j->>'missing_reason' IS NULL THEN
    j := jsonb_set(j, '{value}', COALESCE(m->(v_src || '.' || (j->>'event') || '#' || v_id), 'null'::jsonb));
  ELSIF _table = 'speed_partner_timings' AND j ? 'time_seconds' AND (j->>'distance') ~ '^[0-9]+y$' THEN
    j := jsonb_set(j, '{time_seconds}', COALESCE(m->('practice.sprint_' || (j->>'distance') || '#' || v_id), 'null'::jsonb));
  ELSIF _table = 'custom_activity_logs' AND jsonb_typeof(j->'performance_data') = 'object' AND (j->'performance_data') ? 'rpe' THEN
    j := jsonb_set(j, '{performance_data,rpe}', COALESCE(m->('practice.session_rpe#' || v_id), 'null'::jsonb));
  END IF;
  RETURN j;
END $function$;
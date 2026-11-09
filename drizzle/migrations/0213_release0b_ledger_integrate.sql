-- Release 0b (owner-approved Nov 9; scope already approved as Release 0): finish "integrate everything".
-- Additive only. Nothing anyone sees changes while ledger_unify_v1 stays off:
--  * rows written by the Release 0 mirror or the backfill carry legacy_hidden = true, and every legacy
--    reader of the ledger (coach Trends, the anonymous training store, the old per-metric baselines that
--    feed the plan builder) skips them;
--  * the ledger-backed reader paths (ledger_project_row / ledger_project_rows and the coach/org/identity
--    functions below) only switch for athletes inside ledger_unify_v1.

-- ── 1. Mark Release 0 rows so legacy readers stay exactly as they are ──
ALTER TABLE public.athlete_metric_observations ADD COLUMN IF NOT EXISTS legacy_hidden boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.athlete_metric_observations.legacy_hidden IS
  'TRUE = written by the Release 0 mirror or backfill. Legacy readers (coach Trends, anonymous store, athlete_baseline_history) skip these rows so nothing changes until ledger_unify_v1 opens for that athlete.';

-- ── 2. THE save function: hidden mode (set by the mirror/backfill) skips the old per-metric baseline,
--       batch mode (backfill) defers the new baselines to one pass at the end. ──
CREATE OR REPLACE FUNCTION public.ledger_save(_p jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := NULLIF(_p->>'user_id', '')::uuid;
  v_key text := _p->>'metric_key';
  v_source text := COALESCE(_p->>'source', 'manual');
  v_value double precision;
  v_ctx jsonb := COALESCE(_p->'capture_context', '{}'::jsonb);
  v_ckey text; v_id uuid; v_canon text; v_cunit text; v_cval double precision; v_alias_unit text; v_unit text := _p->>'unit';
  v_def public.measurement_definitions%ROWTYPE; v_phys boolean; v_kind text := _p->>'source_kind'; v_priv text;
  v_try int := 0; v_err text; v_state text;
  v_hidden boolean := COALESCE(current_setting('ledger.r0_hidden', true), '') = 'on';
  v_batch boolean := COALESCE(current_setting('ledger.backfill', true), '') = 'on';
BEGIN
  IF jsonb_typeof(_p->'value') IS DISTINCT FROM 'number' THEN RETURN NULL; END IF;  -- missing beats fabricated: nothing to save
  v_value := (_p->>'value')::double precision;
  IF v_user IS NULL OR v_key IS NULL OR v_value = 'NaN'::double precision
     OR v_value IN ('Infinity'::double precision, '-Infinity'::double precision) THEN RETURN NULL; END IF;
  v_ckey := COALESCE(v_ctx->>'view', 'any') || '|' || COALESCE(v_ctx->>'side', 'any');

  SELECT * INTO v_def FROM public.measurement_definitions WHERE metric_key = v_key AND is_canonical;
  IF FOUND THEN v_canon := v_def.metric_key;
  ELSE
    SELECT a.canonical_key, a.alias_unit INTO v_canon, v_alias_unit FROM public.metric_aliases a WHERE a.alias_key = v_key;
    IF v_canon IS NOT NULL THEN SELECT * INTO v_def FROM public.measurement_definitions WHERE metric_key = v_canon; END IF;
  END IF;
  IF v_canon IS NOT NULL THEN
    v_cunit := v_def.unit;
    v_cval := public.metric_convert(v_value, COALESCE(NULLIF(v_unit, ''), v_alias_unit, v_def.unit), v_cunit);
    v_phys := CASE WHEN v_cval IS NULL OR v_def.physical_min IS NULL OR v_def.physical_max IS NULL THEN NULL
                   ELSE v_cval BETWEEN v_def.physical_min AND v_def.physical_max END;
  END IF;
  v_kind := COALESCE(v_kind, CASE WHEN v_source IN ('video_tile', 'delaycam', 'sprint') THEN 'cv_measured'
    WHEN v_source IN ('readiness', 'workload') THEN 'derived' WHEN v_source = 'healthkit' THEN 'healthkit'
    WHEN v_source IN ('combine', 'baserunning') AND v_ctx->>'source' IN ('video_detected', 'cv', 'camera') THEN 'cv_measured' ELSE 'manual' END);
  v_priv := COALESCE(_p->>'privacy_class', v_def.privacy_class, CASE WHEN v_key = 'mental_load' THEN 'health' ELSE 'training' END);

  -- G3 at save: a camera number that is physically impossible is never stored as truth.
  IF v_kind = 'cv_measured' AND v_phys IS FALSE THEN
    PERFORM public.ledger_log_failure(_p, 'physics', 'outside ' || v_def.physical_min || '–' || v_def.physical_max || ' ' || v_cunit, 1);
    RETURN NULL;
  END IF;

  LOOP
    v_try := v_try + 1;
    BEGIN
      INSERT INTO public.athlete_metric_observations(user_id, video_id, source, metric_key, value, engine_version, recorded_at,
        unit, session_id, source_row_id, capture_context, context_key, confidence, noise_floor,
        device_model, capture_fps, capture_conditions, source_kind, rep_index, app_build, platform, attested,
        canonical_key, canonical_value, canonical_unit, physics_ok, privacy_class, legacy_hidden)
      VALUES (v_user, NULLIF(_p->>'video_id', '')::uuid, v_source, v_key, v_value, COALESCE(_p->>'engine_version', 'unknown'),
        COALESCE(NULLIF(_p->>'recorded_at', '')::timestamptz, now()), v_unit, NULLIF(_p->>'session_id', '')::uuid, _p->>'source_row_id',
        v_ctx, v_ckey, CASE WHEN jsonb_typeof(_p->'confidence') = 'number' THEN (_p->>'confidence')::double precision END,
        CASE WHEN jsonb_typeof(_p->'noise_floor') = 'number' THEN (_p->>'noise_floor')::double precision END,
        _p->>'device_model', CASE WHEN jsonb_typeof(_p->'capture_fps') = 'number' AND (_p->>'capture_fps')::double precision > 0 THEN (_p->>'capture_fps')::double precision END,
        CASE WHEN jsonb_typeof(_p->'capture_conditions') = 'object' THEN _p->'capture_conditions' END, v_kind,
        CASE WHEN jsonb_typeof(_p->'rep_index') = 'number' THEN (_p->>'rep_index')::int END, _p->>'app_build',
        CASE WHEN _p->>'platform' IN ('ios', 'web') THEN _p->>'platform' END, COALESCE((_p->>'attested')::boolean, false),
        v_canon, v_cval, v_cunit, v_phys, v_priv, v_hidden)
      ON CONFLICT (user_id, source, source_row_id, metric_key, engine_version) WHERE source_row_id IS NOT NULL
      DO UPDATE SET value = EXCLUDED.value, unit = EXCLUDED.unit, capture_context = EXCLUDED.capture_context,
        context_key = EXCLUDED.context_key, confidence = EXCLUDED.confidence, noise_floor = EXCLUDED.noise_floor,
        recorded_at = EXCLUDED.recorded_at, canonical_key = EXCLUDED.canonical_key, canonical_value = EXCLUDED.canonical_value,
        canonical_unit = EXCLUDED.canonical_unit, physics_ok = EXCLUDED.physics_ok
      WHERE public.athlete_metric_observations.value IS DISTINCT FROM EXCLUDED.value
      RETURNING id INTO v_id;
      IF v_id IS NOT NULL AND v_source <> 'validation_lab' THEN
        IF NOT v_hidden THEN PERFORM public.baseline_recompute(v_id); END IF;
        IF v_canon IS NOT NULL AND NOT v_batch THEN PERFORM public.ledger_baseline_update(v_user, v_canon, v_ckey); END IF;
      END IF;
      RETURN v_id;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT, v_state = RETURNED_SQLSTATE;
      IF v_try < 3 AND v_state IN ('40001', '40P01', '55P03') THEN
        PERFORM pg_sleep(0.05 * v_try);
        CONTINUE;
      END IF;
      PERFORM public.ledger_log_failure(_p, 'save_failed', v_state || ' ' || v_err, v_try);
      RETURN NULL;
    END;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.ledger_save(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ledger_save(jsonb) TO service_role;

-- ── 3. Release 0 source mirror: one mapping, used by the gated triggers AND the backfill ──
CREATE OR REPLACE FUNCTION public.ledger_mirror_row_any(_table text, j jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k record; v_base text; v_side text; v_src text; v_at timestamptz; v_user uuid := NULLIF(j->>'user_id', '')::uuid; n int := 0;
  v_id text := j->>'id'; v_ts timestamptz := NULLIF(j->>'created_at', '')::timestamptz; v_val jsonb;
BEGIN
  IF v_user IS NULL OR v_id IS NULL THEN RETURN 0; END IF;
  IF _table = 'vault_performance_tests' THEN
    v_at := COALESCE(NULLIF(j->>'test_date', '')::timestamptz, v_ts);
    FOR k IN SELECT key, value FROM jsonb_each(CASE WHEN jsonb_typeof(j->'results') = 'object' THEN j->'results' ELSE '{}'::jsonb END)
        WHERE jsonb_typeof(value) = 'number' AND key NOT LIKE '\_%' LOOP
      v_side := substring(k.key FROM '_(left|right)$');
      v_base := regexp_replace(k.key, '_(left|right)$', '');
      PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', 'six_week', 'metric_key', 'six_week.' || v_base,
        'value', k.value, 'source_row_id', v_id || ':' || COALESCE(v_side, 'any'), 'engine_version', 'vault_performance_tests',
        'recorded_at', v_at, 'source_kind', 'manual',
        'capture_context', jsonb_strip_nulls(jsonb_build_object('side', v_side, 'test_type', j->>'test_type', 'sport', j->>'sport', 'module', j->>'module'))));
      n := n + 1;
    END LOOP;
  ELSIF _table = 'vault_focus_quizzes' THEN
    v_at := COALESCE(v_ts, NULLIF(j->>'entry_date', '')::timestamptz);
    FOR k IN SELECT key, value FROM jsonb_each(j) WHERE jsonb_typeof(value) = 'number' AND key IN
      ('stress_level', 'hours_slept', 'sleep_quality', 'perceived_recovery', 'physical_readiness', 'mental_readiness', 'mood_level',
       'mental_energy', 'pain_scale', 'resting_hr', 'reaction_time_ms', 'balance_left_seconds', 'balance_right_seconds', 'weight_lbs') LOOP
      PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', 'checkin', 'metric_key', 'checkin.' || k.key,
        'value', k.value, 'source_row_id', v_id, 'engine_version', 'vault_focus_quizzes', 'recorded_at', v_at,
        'source_kind', 'manual', 'privacy_class', 'health',
        'capture_context', jsonb_strip_nulls(jsonb_build_object('quiz_type', j->>'quiz_type', 'entry_date', j->>'entry_date',
          'side', CASE k.key WHEN 'balance_left_seconds' THEN 'left' WHEN 'balance_right_seconds' THEN 'right' END))));
      n := n + 1;
    END LOOP;
  ELSIF _table = 'wearable_metrics' THEN
    v_val := CASE j->>'metric' WHEN 'hrv_sdnn' THEN j->'hrv_ms' WHEN 'resting_hr' THEN j->'rhr_bpm' WHEN 'sleep_asleep' THEN j->'sleep_min'
        WHEN 'sleep_in_bed' THEN j->'in_bed_min' END;
    IF jsonb_typeof(v_val) = 'number' THEN
      PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', 'healthkit', 'metric_key', 'healthkit.' || (j->>'metric'),
        'value', v_val, 'source_row_id', COALESCE(j->>'sample_id', v_id), 'engine_version', 'apple_health', 'recorded_at', j->>'captured_at',
        'source_kind', 'healthkit', 'platform', 'ios', 'device_model', j->>'device_name', 'privacy_class', 'health'));
      n := 1;
    END IF;
  ELSIF _table = 'cv_velocity_measurements' THEN
    IF j->>'status' = 'measured' AND jsonb_typeof(j->'velocity_mph') = 'number' THEN
      PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', 'cv_velocity', 'metric_key', 'cv.pitch_velocity_mph',
        'value', j->'velocity_mph', 'unit', 'mph', 'video_id', j->>'video_id', 'source_row_id', v_id,
        'engine_version', COALESCE(j->>'model_id', j->>'method', 'cv_velocity'), 'recorded_at', v_ts, 'source_kind', 'cv_measured',
        'confidence', j->'confidence',
        'capture_fps', CASE WHEN j->>'capture_fps_source' = 'capture' THEN j->'capture_fps' END,
        'capture_context', jsonb_strip_nulls(jsonb_build_object('sport', j->>'sport', 'fps_source', j->>'capture_fps_source'))));
      n := 1;
    END IF;
  ELSIF _table IN ('throwing_reps', 'catching_reps') THEN
    IF j->>'missing_reason' IS NULL AND jsonb_typeof(j->'value') = 'number' THEN
      v_src := CASE WHEN _table = 'throwing_reps' THEN 'throwing' ELSE 'catching' END;
      PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', v_src, 'metric_key', v_src || '.' || (j->>'metric'),
        'value', j->'value', 'unit', j->>'unit', 'source_row_id', v_id, 'engine_version', _table, 'recorded_at', v_ts,
        'confidence', j->'confidence', 'capture_context', jsonb_strip_nulls(jsonb_build_object('source', j->>'source', 'sport', j->>'sport',
          'position', j->>'position_context'))));
      n := 1;
    END IF;
  ELSIF _table = 'gp_at_bats' THEN
    FOR k IN SELECT * FROM (VALUES ('game.exit_velo', 'exit_velo', 'mph'), ('game.launch_angle', 'launch_angle', 'deg'),
        ('game.home_to_first', 'h1_time_sec', 's')) x(mk, col, u) LOOP
      CONTINUE WHEN jsonb_typeof(j->k.col) IS DISTINCT FROM 'number';
      PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', 'game', 'metric_key', k.mk, 'value', j->k.col, 'unit', k.u,
        'source_row_id', v_id, 'engine_version', 'gp_at_bats', 'recorded_at', v_ts, 'source_kind', 'manual',
        'capture_context', jsonb_build_object('context', 'game')));
      n := n + 1;
    END LOOP;
  ELSIF _table = 'gp_pitches' THEN
    -- Only the athlete's OWN pitches; a hitter's log of the opposing pitcher's speed is not the athlete's measurement.
    IF j->>'perspective' = 'pitcher' AND jsonb_typeof(j->'pitch_velo') = 'number' THEN
      PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', 'game', 'metric_key', 'game.pitch_velo', 'value', j->'pitch_velo', 'unit', 'mph',
        'source_row_id', v_id, 'engine_version', 'gp_pitches', 'recorded_at', v_ts, 'source_kind', 'manual', 'capture_context', jsonb_build_object('context', 'game')));
      n := 1;
    END IF;
  ELSIF _table = 'defensive_plays' THEN
    FOR k IN SELECT * FROM (VALUES ('game.throw_velo', 'throw_velo', 'mph'), ('game.hang_time', 'hang_time_sec', 's'),
        ('game.play_time', 'total_play_time_sec', 's')) x(mk, col, u) LOOP
      CONTINUE WHEN jsonb_typeof(j->k.col) IS DISTINCT FROM 'number';
      PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', 'game', 'metric_key', k.mk, 'value', j->k.col, 'unit', k.u,
        'source_row_id', v_id, 'engine_version', 'defensive_plays', 'recorded_at', v_ts, 'confidence', j->'confidence',
        'capture_context', jsonb_strip_nulls(jsonb_build_object('context', 'game', 'source', j->>'source'))));
      n := n + 1;
    END LOOP;
  ELSIF _table = 'athlete_height_checks' THEN
    IF jsonb_typeof(j->'inches') = 'number' THEN
      PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', 'body', 'metric_key', 'body.height_in', 'value', j->'inches', 'unit', 'in',
        'source_row_id', v_id, 'engine_version', 'athlete_height_checks', 'recorded_at', COALESCE(NULLIF(j->>'measured_on', '')::timestamptz, v_ts), 'source_kind', 'manual'));
      n := 1;
    END IF;
  ELSIF _table = 'weight_entries' THEN
    FOR k IN SELECT * FROM (VALUES ('body.weight_lbs', 'weight_lbs', 'lb'), ('body.body_fat_percent', 'body_fat_percent', 'pct')) x(mk, col, u) LOOP
      CONTINUE WHEN jsonb_typeof(j->k.col) IS DISTINCT FROM 'number';
      PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', 'body', 'metric_key', k.mk, 'value', j->k.col, 'unit', k.u,
        'source_row_id', v_id, 'engine_version', 'weight_entries', 'recorded_at', COALESCE(NULLIF(j->>'entry_date', '')::timestamptz, v_ts),
        'source_kind', 'manual', 'privacy_class', 'health'));
      n := n + 1;
    END LOOP;
  ELSIF _table = 'speed_partner_timings' THEN
    -- Practice: partner/self-timed sprint at a stated distance ("10y", "30y", "60y").
    IF jsonb_typeof(j->'time_seconds') = 'number' AND (j->>'distance') ~ '^[0-9]+y$' THEN
      PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', 'practice', 'metric_key', 'practice.sprint_' || (j->>'distance'),
        'value', j->'time_seconds', 'unit', 's', 'source_row_id', v_id, 'engine_version', 'speed_partner_timings', 'recorded_at', v_ts,
        'source_kind', 'manual', 'session_id', j->>'session_id', 'capture_context', jsonb_strip_nulls(jsonb_build_object('timed_by', j->>'timed_by'))));
      n := 1;
    END IF;
  ELSIF _table = 'custom_activity_logs' THEN
    -- Practice: the athlete's own "how hard was it" answer (0–10) on a logged activity.
    IF jsonb_typeof(j->'performance_data') = 'object' AND jsonb_typeof(j->'performance_data'->'rpe') = 'number' THEN
      PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', 'practice', 'metric_key', 'practice.session_rpe',
        'value', j->'performance_data'->'rpe', 'unit', 'rpe', 'source_row_id', v_id, 'engine_version', 'custom_activity_logs',
        'recorded_at', COALESCE(NULLIF(j->>'completed_at', '')::timestamptz, NULLIF(j->>'entry_date', '')::date::timestamptz, v_ts),
        'source_kind', 'manual', 'capture_context', jsonb_strip_nulls(jsonb_build_object('entry_date', j->>'entry_date', 'template_id', j->>'template_id'))));
      n := 1;
    END IF;
  END IF;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.ledger_mirror_row_any(text, jsonb) FROM PUBLIC, anon, authenticated;

-- Gated mirror (live triggers): only athletes inside ledger_unify_v1; rows are written hidden from legacy readers.
CREATE OR REPLACE FUNCTION public.ledger_mirror_row(_table text, j jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := NULLIF(j->>'user_id', '')::uuid; v_prev text := COALESCE(current_setting('ledger.r0_hidden', true), ''); n int;
BEGIN
  IF v_user IS NULL OR NOT public.switch_on_for('ledger_unify_v1', v_user) THEN RETURN 0; END IF;
  PERFORM set_config('ledger.r0_hidden', 'on', true);
  n := public.ledger_mirror_row_any(_table, j);
  PERFORM set_config('ledger.r0_hidden', v_prev, true);
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.ledger_mirror_row(text, jsonb) FROM PUBLIC, anon, authenticated;

-- Practice writers (gated like every Release 0 mirror).
DROP TRIGGER IF EXISTS ledger_r0_speed_timings ON public.speed_partner_timings;
CREATE TRIGGER ledger_r0_speed_timings AFTER INSERT OR UPDATE OF time_seconds, distance ON public.speed_partner_timings FOR EACH ROW EXECUTE FUNCTION public.ledger_from_release0();
DROP TRIGGER IF EXISTS ledger_r0_custom_rpe ON public.custom_activity_logs;
CREATE TRIGGER ledger_r0_custom_rpe AFTER INSERT OR UPDATE OF performance_data ON public.custom_activity_logs FOR EACH ROW EXECUTE FUNCTION public.ledger_from_release0();

-- ── 4. Pre-Release-0 source writers: the same mapping as a jsonb function, so the live trigger and the
--       backfill share it (one mapping). Behavior of the live trigger is unchanged. ──
CREATE OR REPLACE FUNCTION public.ledger_mirror_legacy(_table text, j jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k record; n int := 0; v_user uuid := NULLIF(j->>'user_id', '')::uuid; v_id text := j->>'id';
  v_ts timestamptz := NULLIF(j->>'created_at', '')::timestamptz;
BEGIN
  IF v_user IS NULL OR v_id IS NULL THEN RETURN 0; END IF;
  IF _table = 'combine_results' THEN
    IF jsonb_typeof(j->'value') = 'number' AND j->>'missing_reason' IS NULL THEN
      PERFORM public.ledger_record(v_user, 'combine', 'combine.' || (j->>'event'), (j->>'value')::double precision, j->>'unit', NULL,
        NULLIF(j->>'session_id', '')::uuid, v_id, jsonb_build_object('source', j->'source'), (j->>'confidence')::double precision, NULL, 'combine_results', v_ts);
      n := 1;
    END IF;
  ELSIF _table = 'baserunning_splits' THEN
    IF jsonb_typeof(j->'value') = 'number' AND j->>'missing_reason' IS NULL THEN
      PERFORM public.ledger_record(v_user, 'baserunning', 'baserunning.' || (j->>'event'), (j->>'value')::double precision, j->>'unit', NULL, NULL, v_id,
        jsonb_build_object('side', j->'batter_hand', 'source', j->'source'), (j->>'confidence')::double precision, NULL, 'baserunning_splits', v_ts);
      n := 1;
    END IF;
  ELSIF _table = 'sprint_analyses' THEN
    IF jsonb_typeof(j->'total_time_sec') = 'number' AND COALESCE(j->>'validation_status', '') NOT IN ('rejected', 'invalid', 'failed') THEN
      PERFORM public.ledger_record(v_user, 'sprint', 'sprint.' || COALESCE(j->>'distance_key', 'unknown') || '.total_time_sec', (j->>'total_time_sec')::double precision, 'seconds',
        NULL, NULLIF(j->>'session_id', '')::uuid, v_id, jsonb_build_object('source', j->'ai_model'), (j->>'confidence_score')::double precision, NULL, COALESCE(j->>'ai_model', 'sprint'), v_ts);
      n := 1;
    END IF;
  ELSIF _table = 'delaycam_reps' THEN
    FOR k IN SELECT key, value FROM jsonb_each(CASE WHEN jsonb_typeof(j->'metrics') = 'object' THEN j->'metrics' ELSE '{}'::jsonb END) WHERE jsonb_typeof(value) = 'number' LOOP
      PERFORM public.ledger_record(v_user, 'delaycam', 'delaycam.' || k.key, (k.value #>> '{}')::double precision, NULL, NULL, NULLIF(j->>'session_id', '')::uuid,
        v_id, jsonb_build_object('fps_tier', j->'fps_tier', 'fps', j->'fps_measured'), (j->>'boundary_confidence')::double precision, NULL,
        COALESCE(j->>'engine_version', 'delaycam'), v_ts);
      n := n + 1;
    END LOOP;
  ELSIF _table = 'block_workout_metrics' THEN
    IF jsonb_typeof(j->'rpe') = 'number' THEN
      PERFORM public.ledger_record(v_user, 'lifting', 'lifting.session_rpe', (j->>'rpe')::double precision, 'rpe', NULL, NULLIF(j->>'workout_id', '')::uuid, v_id,
        '{}'::jsonb, NULL, NULL, 'block_workout_metrics', v_ts);
      n := 1;
    END IF;
  ELSIF _table = 'athlete_load_tracking' THEN
    FOR k IN SELECT * FROM (VALUES ('workload.cns_load_total', 'cns_load_total', 'load'), ('workload.volume_load', 'volume_load', 'load'),
        ('workload.intensity_avg', 'intensity_avg', 'intensity'), ('workload.recovery_debt', 'recovery_debt', 'load')) x(mk, col, u) LOOP
      CONTINUE WHEN jsonb_typeof(j->k.col) IS DISTINCT FROM 'number';
      PERFORM public.ledger_record(v_user, 'workload', k.mk, (j->>k.col)::double precision, k.u, NULL, NULL, v_id, '{}'::jsonb, NULL, NULL,
        'athlete_load_tracking', (j->>'entry_date')::date::timestamptz);
      n := n + 1;
    END LOOP;
  ELSIF _table = 'athlete_daily_log' THEN
    IF jsonb_typeof(j->'cns_load_actual') = 'number' THEN
      PERFORM public.ledger_record(v_user, 'workload', 'workload.cns_load_actual', (j->>'cns_load_actual')::double precision, 'load', NULL, NULL, v_id, '{}'::jsonb,
        NULL, NULL, 'athlete_daily_log', (j->>'entry_date')::date::timestamptz);
      n := 1;
    END IF;
  ELSIF _table = 'hie_snapshots' THEN
    FOR k IN SELECT * FROM (VALUES ('readiness.readiness_score', 'readiness_score'), ('readiness.training_readiness_score', 'training_readiness_score')) x(mk, col) LOOP
      CONTINUE WHEN jsonb_typeof(j->k.col) IS DISTINCT FROM 'number';
      PERFORM public.ledger_record(v_user, 'readiness', k.mk, (j->>k.col)::double precision, 'score', NULL, NULL, v_id, '{}'::jsonb, NULL, NULL,
        'hie_snapshots', NULLIF(j->>'computed_at', '')::timestamptz);
      n := n + 1;
    END LOOP;
  END IF;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.ledger_mirror_legacy(text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ledger_from_sources()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
 BEGIN
  PERFORM public.ledger_mirror_legacy(TG_TABLE_NAME, to_jsonb(NEW));
 EXCEPTION WHEN OTHERS THEN
  PERFORM public.ledger_log_failure(jsonb_build_object('user_id', NEW.user_id, 'source', TG_TABLE_NAME, 'source_row_id', NEW.id), 'trigger_failed', SQLERRM, 1);
 END;
 RETURN NEW;
END; $function$;

-- ── 5. Gate 1 truth: capture_fps is filled only from COUNTED frame rates, never file metadata. ──
CREATE OR REPLACE FUNCTION public.ledger_record(p_user uuid, p_source text, p_key text, p_value double precision, p_unit text, p_video uuid, p_session uuid, p_source_row text, p_ctx jsonb, p_conf double precision, p_floor double precision, p_engine text, p_at timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_ctx jsonb := COALESCE(p_ctx, '{}'::jsonb);
BEGIN
  IF p_user IS NULL OR p_key IS NULL OR p_value IS NULL OR p_value = 'NaN'::double precision
     OR p_value IN ('Infinity'::double precision, '-Infinity'::double precision) THEN RETURN NULL; END IF;
  RETURN public.ledger_save(jsonb_strip_nulls(jsonb_build_object(
    'user_id', p_user, 'source', p_source, 'metric_key', p_key, 'value', p_value, 'unit', p_unit, 'video_id', p_video,
    'session_id', p_session, 'source_row_id', p_source_row, 'capture_context', v_ctx, 'confidence', p_conf,
    'noise_floor', p_floor, 'engine_version', p_engine, 'recorded_at', p_at,
    'capture_fps', CASE WHEN jsonb_typeof(v_ctx->'fps') = 'number' AND COALESCE(v_ctx->>'fps_source', 'measured') = 'measured' THEN v_ctx->'fps' END)));
END $function$;

CREATE OR REPLACE FUNCTION public.ledger_record_tiles(p_video uuid, p_field text, p_tiles jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v record; t record; vv record; n int := 0; v_root jsonb; v_tile jsonb; v_key text; v_view text; v_side text; v_ctx jsonb;
  v_conf double precision; v_engine text; v_prefix text;
BEGIN
  SELECT id, user_id, module, sport, batting_side, throwing_hand, capture_fps_tier, fps_true, capture_fps_source, session_date, created_at, ai_analysis
    INTO v FROM public.videos WHERE id = p_video;
  IF NOT FOUND OR p_tiles IS NULL THEN RETURN 0; END IF;
  v_root := CASE WHEN jsonb_typeof(p_tiles->'tiles') IN ('object','array') THEN p_tiles->'tiles' ELSE p_tiles END;
  v_prefix := regexp_replace(p_field, '_tiles_deterministic$', '');
  v_engine := COALESCE(p_tiles->>'version', p_tiles->>'engine_version', v.ai_analysis->>'metric_engine_version', 'unknown');
  v_side := CASE WHEN v.module = 'hitting' THEN v.batting_side ELSE v.throwing_hand END;
  FOR t IN
    SELECT CASE WHEN jsonb_typeof(v_root) = 'array' THEN e->>'key' ELSE k END AS key, e AS tile
    FROM (SELECT NULL::text k, x e FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_root)='array' THEN v_root ELSE '[]'::jsonb END) x
          UNION ALL SELECT k, x FROM jsonb_each(CASE WHEN jsonb_typeof(v_root)='object' THEN v_root ELSE '{}'::jsonb END) AS j(k, x)) s
    WHERE jsonb_typeof(e) = 'object'
  LOOP
    v_tile := t.tile;
    CONTINUE WHEN t.key IS NULL;
    CONTINUE WHEN jsonb_typeof(v_tile->'missingness') = 'object' OR jsonb_typeof(v_tile->'missing_reason') = 'string';
    v_view := COALESCE(v_tile->>'view', v_tile->'lineage'->>'view', p_tiles->>'view');
    v_ctx := jsonb_build_object('view', v_view, 'side', v_side, 'fps_tier', v.capture_fps_tier, 'fps', v.fps_true, 'fps_source', COALESCE(v.capture_fps_source, 'unknown'), 'module', v.module, 'sport', v.sport);
    v_conf := CASE WHEN jsonb_typeof(v_tile->'confidence'->'value') = 'number' THEN (v_tile->'confidence'->>'value')::double precision
                   WHEN jsonb_typeof(v_tile->'confidence') = 'number' THEN (v_tile->>'confidence')::double precision END;
    IF jsonb_typeof(v_tile->'value') = 'number' THEN
      PERFORM public.ledger_record(v.user_id, 'video_tile', v_prefix || '.' || t.key, (v_tile->>'value')::double precision, v_tile->>'unit',
        v.id, NULL, v.id::text, v_ctx, v_conf,
        CASE WHEN jsonb_typeof(v_tile->'uncertainty') = 'number' THEN (v_tile->>'uncertainty')::double precision END,
        v_engine, COALESCE(v.session_date::timestamptz, v.created_at));
      n := n + 1;
    END IF;
    IF jsonb_typeof(v_tile->'values') = 'object' THEN
      FOR vv IN SELECT key, value FROM jsonb_each(v_tile->'values') WHERE jsonb_typeof(value) = 'number' LOOP
        PERFORM public.ledger_record(v.user_id, 'video_tile', v_prefix || '.' || t.key || '.' || vv.key, (vv.value #>> '{}')::double precision, NULL,
          v.id, NULL, v.id::text, v_ctx, v_conf, NULL, v_engine, COALESCE(v.session_date::timestamptz, v.created_at));
        n := n + 1;
      END LOOP;
    END IF;
  END LOOP;
  RETURN n;
END; $function$;

-- ── 6. Legacy readers skip Release 0 rows (unchanged numbers while the switch is off). ──
CREATE OR REPLACE FUNCTION public.baseline_recompute(p_obs uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  o public.athlete_metric_observations%ROWTYPE;
  d public.measurement_definitions%ROWTYPE;
  v_min_conf double precision;
  v_vals double precision[];
  v_n int; v_med double precision; v_q1 double precision; v_q3 double precision;
  v_floor double precision; v_rsd double precision; v_z double precision;
  v_status text := 'still_learning'; v_trend text := null;
  v_recent double precision[]; v_before double precision[];
  v_bmed double precision; v_bq1 double precision; v_bq3 double precision; v_brsd double precision; v_rmed double precision;
  v_alertable boolean;
  c_ver constant text := 'athlete_baseline@2.0.0-2026-09-30-median-iqr';
BEGIN
  SELECT * INTO o FROM public.athlete_metric_observations WHERE id = p_obs;
  IF NOT FOUND OR o.legacy_hidden THEN RETURN; END IF;
  SELECT * INTO d FROM public.measurement_definitions WHERE metric_key = o.metric_key;
  v_min_conf := COALESCE(d.min_confidence, 0.5);

  -- prior in-context history, newest 20, confident only, never the current clip
  SELECT array_agg(value ORDER BY recorded_at, source_row_id, id) INTO v_vals FROM (
    SELECT value, recorded_at, source_row_id, id FROM public.athlete_metric_observations
    WHERE user_id = o.user_id AND metric_key = o.metric_key AND context_key = o.context_key
      AND id <> o.id AND NOT legacy_hidden AND (recorded_at, id) < (o.recorded_at, o.id)
      AND (confidence IS NULL OR confidence >= v_min_conf)
    ORDER BY recorded_at DESC, source_row_id DESC, id DESC LIMIT 20) h;
  v_n := COALESCE(array_length(v_vals,1),0);

  SELECT GREATEST(COALESCE(d.noise_floor,0), COALESCE(MAX(noise_floor),0)) INTO v_floor
  FROM public.athlete_metric_observations
  WHERE user_id = o.user_id AND metric_key = o.metric_key AND context_key = o.context_key AND NOT legacy_hidden;

  IF v_n >= 8 THEN
    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY x), percentile_cont(0.25) WITHIN GROUP (ORDER BY x), percentile_cont(0.75) WITHIN GROUP (ORDER BY x)
      INTO v_med, v_q1, v_q3 FROM unnest(v_vals) x;
    v_rsd := GREATEST((v_q3 - v_q1)/1.349, v_floor);
    IF v_rsd <= 0 THEN
      v_status := 'usual';
    ELSE
      v_z := (o.value - v_med)/v_rsd;
      v_status := CASE WHEN v_z <= -2 THEN 'well_below' WHEN v_z < -1 THEN 'below'
                       WHEN v_z >= 2 THEN 'well_above' WHEN v_z > 1 THEN 'above' ELSE 'usual' END;
    END IF;

    -- sustained drift: the last 4 (incl. current) all sit on one side of the baseline
    -- built from what came BEFORE them, and their median is outside that band.
    v_recent := v_vals[GREATEST(v_n-2,1):v_n] || o.value;
    v_before := v_vals[1:GREATEST(v_n-3,0)];
    IF array_length(v_recent,1) = 4 AND COALESCE(array_length(v_before,1),0) >= 8 THEN
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY x), percentile_cont(0.25) WITHIN GROUP (ORDER BY x), percentile_cont(0.75) WITHIN GROUP (ORDER BY x)
        INTO v_bmed, v_bq1, v_bq3 FROM unnest(v_before) x;
      v_brsd := GREATEST((v_bq3 - v_bq1)/1.349, v_floor);
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY x) INTO v_rmed FROM unnest(v_recent) x;
      IF v_brsd > 0 AND abs(v_rmed - v_bmed) > v_brsd
         AND ((SELECT bool_and(x > v_bmed) FROM unnest(v_recent) x) OR (SELECT bool_and(x < v_bmed) FROM unnest(v_recent) x)) THEN
        v_trend := CASE WHEN v_rmed > v_bmed THEN 'rising' ELSE 'falling' END;
      ELSE
        v_trend := 'steady';
      END IF;
    END IF;
  END IF;

  INSERT INTO public.athlete_baseline_history(user_id, metric_key, context_key, observation_id, n_used, median, q1, q3, robust_sd,
    band_lo, band_hi, noise_floor, status, trend, version)
  VALUES (o.user_id, o.metric_key, o.context_key, o.id, v_n, v_med, v_q1, v_q3, v_rsd,
    v_med - v_rsd, v_med + v_rsd, v_floor, v_status, v_trend, c_ver);

  -- Alerts: a noise floor must be declared (never alert on an undeclared noise level),
  -- confidence must clear the bar, the context must be known, policy must include baseline.
  v_alertable := v_floor > 0
    AND (o.confidence IS NULL OR o.confidence >= v_min_conf)
    AND o.context_key <> 'unknown'
    AND COALESCE(d.policy,'baseline') IN ('baseline','both');
  IF v_alertable AND v_status IN ('well_below','well_above') THEN
    INSERT INTO public.athlete_baseline_alerts(user_id, metric_key, context_key, observation_id, kind, direction, version)
    VALUES (o.user_id, o.metric_key, o.context_key, o.id, 'outlier', CASE WHEN v_status='well_below' THEN 'below' ELSE 'above' END, c_ver)
    ON CONFLICT (observation_id, kind) DO NOTHING;
  END IF;
  IF v_alertable AND v_trend IN ('rising','falling') THEN
    INSERT INTO public.athlete_baseline_alerts(user_id, metric_key, context_key, observation_id, kind, direction, version)
    VALUES (o.user_id, o.metric_key, o.context_key, o.id, 'drift', CASE WHEN v_trend='falling' THEN 'below' ELSE 'above' END, c_ver)
    ON CONFLICT (observation_id, kind) DO NOTHING;
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.anon_training_refresh(_user uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_pid text; n int := 0;
BEGIN
  IF NOT anon_training_eligible(_user) THEN
    PERFORM anon_training_remove(_user);
    RETURN 0;
  END IF;
  v_pid := anon_pid(_user);
  DELETE FROM anon_training_records WHERE pid = v_pid;

  WITH prof AS (
    SELECT p.id, p.date_of_birth, ac.sport_primary, ac.lifting_age_years, ac.position_primary,
      CASE WHEN EXISTS (SELECT 1 FROM unnest(COALESCE(p.positions, ARRAY[]::text[])) x WHERE x ~* '^(p|rhp|lhp|sp|rp)$|pitch')
                AND EXISTS (SELECT 1 FROM unnest(COALESCE(p.positions, ARRAY[]::text[])) x WHERE x !~* '^(p|rhp|lhp|sp|rp)$|pitch') THEN 'two_way'
           WHEN EXISTS (SELECT 1 FROM unnest(COALESCE(p.positions, ARRAY[]::text[])) x WHERE x ~* '^(p|rhp|lhp|sp|rp)$|pitch') THEN 'pitcher'
           ELSE 'position' END AS role
    FROM profiles p LEFT JOIN athlete_context ac ON ac.user_id = p.id WHERE p.id = _user
  ),
  meas AS (
    SELECT date_trunc('week', recorded_at)::date AS wk, metric_key, avg(value) AS v
    FROM athlete_metric_observations
    WHERE user_id = _user AND NOT legacy_hidden AND source NOT IN ('workload','readiness','lifting') AND value IS NOT NULL
    GROUP BY 1, 2
  ),
  meas_wk AS (SELECT wk, jsonb_object_agg(metric_key, round(v::numeric, 3)) AS m FROM meas GROUP BY wk),
  ready AS (
    SELECT date_trunc('week', recorded_at)::date AS wk, avg(value) AS v FROM athlete_metric_observations
    WHERE user_id = _user AND metric_key = 'readiness.readiness_score' AND NOT legacy_hidden GROUP BY 1
  ),
  rx AS (
    SELECT r.*, date_trunc('week', r.plan_date)::date AS wk,
      COALESCE((SELECT sum(COALESCE(cardinality(l.reps_completed), l.sets_completed, 0)) FROM wk_session_logs l WHERE l.prescription_id = r.id), 0) AS logged_sets,
      (SELECT jsonb_build_object('sets', sum(l.sets_completed), 'reps', sum(COALESCE(l.total_reps_completed, 0)), 'load', max(l.load_used),
              'seconds', sum(l.duration_seconds_completed), 'feet', sum(l.distance_feet_completed))
         FROM wk_session_logs l WHERE l.prescription_id = r.id) AS logged,
      EXISTS (SELECT 1 FROM wk_session_logs l WHERE l.prescription_id = r.id) AS has_log,
      EXISTS (SELECT 1 FROM hammer_daily_task_completions c WHERE c.user_id = r.user_id AND c.plan_date = r.plan_date AND c.task_id = r.id::text AND c.completed IS TRUE) AS checked,
      (SELECT COALESCE(jsonb_agg(DISTINCT s.rule), '[]'::jsonb) FROM wk_final_check_swaps s WHERE s.user_id = r.user_id AND s.plan_date = r.plan_date) AS day_rules
    FROM wk_prescriptions r WHERE r.user_id = _user
  )
  INSERT INTO anon_training_records (pid, week_start, age_band, sport, role, season_phase, training_age_band, growth_mode, readiness_band,
    card_type, movement_slug, dose, rules, outcome, logged, measures, delta_2w, delta_4w, delta_8w)
  SELECT v_pid, rx.wk,
    anon_age_band(date_part('year', age(rx.plan_date, prof.date_of_birth))::int),
    prof.sport_primary, prof.role, rx.phase,
    CASE WHEN prof.lifting_age_years IS NULL THEN NULL WHEN prof.lifting_age_years < 1 THEN 'beginner' WHEN prof.lifting_age_years < 4 THEN 'intermediate'
         WHEN prof.lifting_age_years < 6 THEN 'advanced' ELSE 'elite' END,
    COALESCE((SELECT max(h.inches) - min(h.inches) >= 0.75 FROM athlete_height_checks h WHERE h.user_id = _user AND h.measured_on BETWEEN rx.plan_date - 92 AND rx.plan_date), false),
    (SELECT CASE WHEN rd.v < 40 THEN 'low' WHEN rd.v < 70 THEN 'moderate' ELSE 'high' END FROM ready rd WHERE rd.wk = rx.wk),
    rx.slot, rx.movement_slug,
    jsonb_strip_nulls(jsonb_build_object('sets', rx.sets, 'reps', rx.reps, 'total_reps', rx.total_reps, 'load_pct', rx.load_pct, 'distance_feet', rx.distance_feet,
      'duration_seconds', rx.duration_seconds, 'intensity', rx.intensity_mode, 'rir_low', rx.rir_low, 'rir_high', rx.rir_high, 'unit', rx.dosage_unit, 'tempo', rx.tempo)),
    jsonb_strip_nulls(jsonb_build_object('adaptation', rx.adaptation, 'intent', rx.intent_tag, 'cns_clamped', rx.cns_clamped,
      'substituted', rx.substituted_from_slug IS NOT NULL, 'day_rules', rx.day_rules)),
    CASE WHEN rx.checked OR (rx.has_log AND (rx.sets IS NULL OR rx.sets <= 0 OR rx.logged_sets >= rx.sets)) THEN 'done'
         WHEN rx.has_log THEN 'cut_short'
         WHEN rx.status = 'missed' OR rx.plan_date < current_date THEN 'missed'
         ELSE 'pending' END,
    COALESCE(jsonb_strip_nulls(rx.logged), '{}'::jsonb),
    COALESCE((SELECT m FROM meas_wk WHERE meas_wk.wk = rx.wk), '{}'::jsonb),
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb
  FROM rx CROSS JOIN prof;
  GET DIAGNOSTICS n = ROW_COUNT;

  -- What worked: change in each measure from the prescription week to 2, 4 and 8 weeks later.
  UPDATE anon_training_records a SET
    delta_2w = COALESCE((SELECT jsonb_object_agg(m0.metric_key, round((m1.v - m0.v)::numeric, 3)) FROM (
        SELECT metric_key, avg(value) v FROM athlete_metric_observations WHERE user_id = _user AND NOT legacy_hidden AND source NOT IN ('workload','readiness','lifting')
          AND date_trunc('week', recorded_at)::date = a.week_start GROUP BY 1) m0
      JOIN (SELECT metric_key, avg(value) v FROM athlete_metric_observations WHERE user_id = _user AND NOT legacy_hidden AND source NOT IN ('workload','readiness','lifting')
          AND date_trunc('week', recorded_at)::date = a.week_start + 14 GROUP BY 1) m1 USING (metric_key)), '{}'::jsonb),
    delta_4w = COALESCE((SELECT jsonb_object_agg(m0.metric_key, round((m1.v - m0.v)::numeric, 3)) FROM (
        SELECT metric_key, avg(value) v FROM athlete_metric_observations WHERE user_id = _user AND NOT legacy_hidden AND source NOT IN ('workload','readiness','lifting')
          AND date_trunc('week', recorded_at)::date = a.week_start GROUP BY 1) m0
      JOIN (SELECT metric_key, avg(value) v FROM athlete_metric_observations WHERE user_id = _user AND NOT legacy_hidden AND source NOT IN ('workload','readiness','lifting')
          AND date_trunc('week', recorded_at)::date = a.week_start + 28 GROUP BY 1) m1 USING (metric_key)), '{}'::jsonb),
    delta_8w = COALESCE((SELECT jsonb_object_agg(m0.metric_key, round((m1.v - m0.v)::numeric, 3)) FROM (
        SELECT metric_key, avg(value) v FROM athlete_metric_observations WHERE user_id = _user AND NOT legacy_hidden AND source NOT IN ('workload','readiness','lifting')
          AND date_trunc('week', recorded_at)::date = a.week_start GROUP BY 1) m0
      JOIN (SELECT metric_key, avg(value) v FROM athlete_metric_observations WHERE user_id = _user AND NOT legacy_hidden AND source NOT IN ('workload','readiness','lifting')
          AND date_trunc('week', recorded_at)::date = a.week_start + 56 GROUP BY 1) m1 USING (metric_key)), '{}'::jsonb)
  WHERE a.pid = v_pid;

  INSERT INTO anon_training_refresh_state (user_id, refreshed_at) VALUES (_user, now())
  ON CONFLICT (user_id) DO UPDATE SET refreshed_at = now();
  RETURN n;
END $function$;

-- ── 7b. Coach / org / identity readers: ledger-backed path for athletes inside ledger_unify_v1. ──
CREATE OR REPLACE FUNCTION public.coach_athlete_trends(_athlete uuid)
 RETURNS TABLE(metric_key text, unit text, n_used integer, baseline_median double precision, band_lo double precision, band_hi double precision, trend text, computed_at timestamp with time zone, recent jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (auth.uid() = _athlete OR public.is_coach_of(auth.uid(), _athlete) OR public.is_linked_coach(auth.uid(), _athlete)) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH latest_baseline AS (
    SELECT DISTINCT ON (h.metric_key)
      h.metric_key, h.n_used, h.median, h.band_lo, h.band_hi, h.trend, h.computed_at
    FROM public.athlete_baseline_history h
    WHERE h.user_id = _athlete
    ORDER BY h.metric_key, h.computed_at DESC
  ),
  recent_obs AS (
    SELECT o.metric_key,
           jsonb_agg(jsonb_build_object('value', o.value, 'unit', o.unit, 'recorded_at', o.recorded_at, 'source', o.source) ORDER BY o.recorded_at DESC) AS recent,
           (array_agg(o.unit ORDER BY o.recorded_at DESC))[1] AS unit
    FROM (
      SELECT * FROM public.athlete_metric_observations o2
      WHERE o2.user_id = _athlete
        -- Release 0b: legacy view skips Release 0 rows; ledger path (ledger_unify_v1) shows them, health answers only through the check-in gate.
        AND CASE WHEN public.switch_on_for('ledger_unify_v1', _athlete)
          THEN (o2.privacy_class = 'training' OR auth.uid() = _athlete OR public._coach_checkin_access(_athlete))
          ELSE NOT o2.legacy_hidden END
      ORDER BY o2.recorded_at DESC
      LIMIT 200
    ) o
    GROUP BY o.metric_key
  )
  SELECT COALESCE(b.metric_key, r.metric_key) AS metric_key,
         r.unit,
         b.n_used,
         b.median AS baseline_median,
         b.band_lo,
         b.band_hi,
         b.trend,
         b.computed_at,
         COALESCE(r.recent, '[]'::jsonb) AS recent
  FROM latest_baseline b
  FULL OUTER JOIN recent_obs r ON r.metric_key = b.metric_key
  ORDER BY COALESCE(b.metric_key, r.metric_key);
END;
$function$;

CREATE OR REPLACE FUNCTION public.coach_athlete_tests(_athlete uuid)
 RETURNS TABLE(id uuid, test_date date, test_type text, sport text, results jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT (auth.uid() = _athlete OR public.is_coach_of(auth.uid(), _athlete) OR public.is_linked_coach(auth.uid(), _athlete)) THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT u.id, u.test_date, u.test_type, u.sport, u.results FROM (
      SELECT t.id, t.test_date::date AS test_date, t.test_type, t.sport,
        CASE WHEN public.switch_on_for('ledger_unify_v1', _athlete) THEN public.ledger_project_row('vault_performance_tests', to_jsonb(t))->'results' ELSE t.results END AS results, t.created_at
      FROM vault_performance_tests t WHERE t.user_id = _athlete
      UNION ALL
      SELECT r.id, COALESCE(s.completed_at, r.created_at)::date AS test_date, 'combine'::text AS test_type, s.sport,
             jsonb_build_object(r.event, CASE WHEN public.switch_on_for('ledger_unify_v1', _athlete) THEN public.ledger_project_row('combine_results', to_jsonb(r))->'value' ELSE to_jsonb(r.value) END, '_unit', r.unit, '_source', COALESCE(r.source,'combine')) AS results,
             r.created_at
      FROM combine_results r JOIN combine_sessions s ON s.id = r.session_id
      WHERE r.user_id = _athlete AND r.value IS NOT NULL
    ) u ORDER BY u.test_date DESC, u.created_at DESC LIMIT 20;
END $function$;

CREATE OR REPLACE FUNCTION public.coach_athlete_checkins_28(_athlete uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _rows jsonb; _logs jsonb; _load jsonb; _on boolean := public.switch_on_for('ledger_unify_v1', _athlete);
BEGIN
  IF NOT public._coach_checkin_access(_athlete) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'entry_date', q.entry_date, 'quiz_type', q.quiz_type, 'readiness', CASE WHEN _on THEN lp.j->'physical_readiness' ELSE to_jsonb(q.physical_readiness) END,
    'hours_slept', CASE WHEN _on THEN lp.j->'hours_slept' ELSE to_jsonb(q.hours_slept) END, 'sleep_quality', CASE WHEN _on THEN lp.j->'sleep_quality' ELSE to_jsonb(q.sleep_quality) END,
    'energy', CASE WHEN _on THEN lp.j->'mental_energy' ELSE to_jsonb(q.mental_energy) END,
    'soreness_locations', q.soreness_locations, 'soreness_scales', q.soreness_scales,
    'pain_location', q.pain_location, 'pain_scale', CASE WHEN _on THEN lp.j->'pain_scale' ELSE to_jsonb(q.pain_scale) END, 'pain_scales', q.pain_scales)
    ORDER BY q.entry_date DESC, q.created_at DESC), '[]'::jsonb)
  INTO _rows FROM public.vault_focus_quizzes q
  CROSS JOIN LATERAL (SELECT CASE WHEN _on THEN public.ledger_project_row('vault_focus_quizzes', to_jsonb(q)) END AS j) lp
  WHERE q.user_id = _athlete AND q.entry_date >= current_date - 27;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('entry_date', d.entry_date, 'injury_mode', d.injury_mode,
    'injury_body_region', d.injury_body_region, 'day_status', d.day_status) ORDER BY d.entry_date DESC), '[]'::jsonb)
  INTO _logs FROM public.athlete_daily_log d WHERE d.user_id = _athlete AND d.entry_date >= current_date - 27;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('plan_date', s.plan_date, 'items', s.n) ORDER BY s.plan_date DESC), '[]'::jsonb)
  INTO _load FROM (SELECT l.plan_date, count(*)::int n FROM public.wk_session_logs l
    WHERE l.user_id = _athlete AND l.plan_date BETWEEN current_date - 27 AND current_date GROUP BY 1) s;
  RETURN jsonb_build_object('shared', true, 'checkins', _rows, 'daily_logs', _logs, 'load', _load, 'today', current_date);
END $function$;

CREATE OR REPLACE FUNCTION public.coach_team_readiness_today()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _me uuid := auth.uid(); _ids uuid[];
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  SELECT array_agg(DISTINCT c) INTO _ids FROM (
    SELECT user_id c FROM athlete_mpi_settings WHERE primary_coach_id = _me OR _me = ANY(coalesce(secondary_coach_ids,'{}'))
    UNION SELECT player_id FROM scout_follows WHERE scout_id = _me AND status='accepted'
    UNION SELECT athlete_user_id FROM org_athlete_assignments WHERE coach_user_id = _me AND revoked_at IS NULL
    UNION SELECT om.user_id FROM organization_members om WHERE om.status='active' AND om.role_in_org='player' AND public.is_org_admin(_me, om.organization_id)
  ) s WHERE c <> _me AND public._coach_checkin_access(c);
  RETURN COALESCE((
    SELECT jsonb_agg(x ORDER BY x->>'name') FROM (
      SELECT jsonb_build_object(
          'athlete_id', u, 'name', coalesce(p.full_name, 'Player'), 'shared', true,
          'readiness', (SELECT CASE WHEN public.switch_on_for('ledger_unify_v1', u) THEN public.ledger_project_row('vault_focus_quizzes', to_jsonb(q))->'physical_readiness' ELSE to_jsonb(q.physical_readiness) END FROM vault_focus_quizzes q WHERE q.user_id = u AND q.entry_date = current_date AND q.physical_readiness IS NOT NULL ORDER BY q.created_at DESC LIMIT 1),
          'checked_in', EXISTS (SELECT 1 FROM vault_focus_quizzes q WHERE q.user_id = u AND q.entry_date = current_date)) x
      FROM unnest(coalesce(_ids, '{}')) u JOIN profiles p ON p.id = u
      WHERE coalesce(p.is_system_account, false) = false AND p.suspended_at IS NULL AND p.account_paused_at IS NULL
    ) t), '[]'::jsonb);
END $function$;

CREATE OR REPLACE FUNCTION public.org_test_ranking(_org uuid, _test text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _staff boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated' USING errcode = '42501'; END IF;
  _staff := public.is_org_staff(_uid, _org);
  IF NOT _staff AND NOT EXISTS (SELECT 1 FROM org_athlete_assignments a WHERE a.organization_id = _org AND a.coach_user_id = _uid AND a.revoked_at IS NULL) THEN
    RAISE EXCEPTION 'not allowed' USING errcode = '42501';
  END IF;
  RETURN jsonb_build_object(
    'tests', coalesce((
      SELECT jsonb_agg(DISTINCT k.key ORDER BY k.key)
      FROM organization_members m
      CROSS JOIN LATERAL (
        SELECT j.key FROM vault_performance_tests t CROSS JOIN LATERAL jsonb_each(coalesce(t.results,'{}'::jsonb)) j
        WHERE t.user_id = m.user_id AND left(j.key,1) <> '_' AND jsonb_typeof(j.value) = 'number'
        UNION
        SELECT r.event FROM combine_results r WHERE r.user_id = m.user_id AND r.value IS NOT NULL
      ) k
      WHERE m.organization_id = _org AND m.role_in_org = 'player' AND m.status = 'active'
        AND EXISTS (SELECT 1 FROM profiles sp WHERE sp.id = m.user_id AND coalesce(sp.is_system_account,false) = false AND sp.suspended_at IS NULL AND sp.account_paused_at IS NULL)
        AND (_staff OR EXISTS (SELECT 1 FROM org_athlete_assignments a WHERE a.organization_id = _org AND a.coach_user_id = _uid AND a.athlete_user_id = m.user_id AND a.revoked_at IS NULL))
    ), '[]'::jsonb),
    'rows', coalesce((
      SELECT jsonb_agg(row_to_json(x))
      FROM (
        SELECT m.user_id AS athlete_id,
          coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), nullif(trim(p.full_name), ''), 'Player') AS name,
          ms.primary_position, ms.league_tier,
          coalesce(ms.date_of_birth, p.date_of_birth) AS date_of_birth,
          lt.value, lt.test_date, lt.verified
        FROM organization_members m
        LEFT JOIN profiles p ON p.id = m.user_id
        LEFT JOIN athlete_mpi_settings ms ON ms.user_id = m.user_id
        CROSS JOIN LATERAL (
          SELECT u.value, u.test_date, u.verified FROM (
            SELECT ((CASE WHEN public.switch_on_for('ledger_unify_v1', t.user_id) THEN public.ledger_project_row('vault_performance_tests', to_jsonb(t))->'results' ELSE t.results END) ->> _test)::numeric AS value, coalesce(t.test_date, t.created_at::date) AS test_date,
                   (t.results ->> '_verified') = 'in_person' AS verified, t.created_at
            FROM vault_performance_tests t
            WHERE t.user_id = m.user_id AND jsonb_typeof(t.results -> _test) = 'number'
            UNION ALL
            SELECT CASE WHEN public.switch_on_for('ledger_unify_v1', r.user_id) THEN (public.ledger_project_row('combine_results', to_jsonb(r))->>'value')::numeric ELSE r.value END, COALESCE(s.completed_at, r.created_at)::date, true, r.created_at
            FROM combine_results r JOIN combine_sessions s ON s.id = r.session_id
            WHERE r.user_id = m.user_id AND r.event = _test AND r.value IS NOT NULL
          ) u ORDER BY u.test_date DESC, u.created_at DESC LIMIT 1
        ) lt
        WHERE m.organization_id = _org AND m.role_in_org = 'player' AND m.status = 'active' AND _test IS NOT NULL
          AND EXISTS (SELECT 1 FROM profiles sp WHERE sp.id = m.user_id AND coalesce(sp.is_system_account,false) = false AND sp.suspended_at IS NULL AND sp.account_paused_at IS NULL)
          AND (_staff OR EXISTS (SELECT 1 FROM org_athlete_assignments a WHERE a.organization_id = _org AND a.coach_user_id = _uid AND a.athlete_user_id = m.user_id AND a.revoked_at IS NULL))
      ) x
    ), '[]'::jsonb)
  );
END $function$;

CREATE OR REPLACE FUNCTION public.mastery_identity_sources(p_sport text, p_date date, p_athlete uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE athlete uuid:=coalesce(p_athlete,auth.uid()); answer jsonb; BEGIN IF auth.uid() IS NULL OR p_sport NOT IN ('baseball','softball') OR p_date IS NULL OR NOT public._coach_training_access(athlete) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF; IF athlete<>auth.uid() AND NOT EXISTS(SELECT 1 FROM public.athlete_context WHERE user_id=athlete AND sport_primary=p_sport) THEN RAISE EXCEPTION 'sport not shared' USING ERRCODE='42501'; END IF; SELECT jsonb_build_object('atBats',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'result',a.result,'date',g.game_date,'game_id',g.id,'order',coalesce(a.inning,0)*10000+coalesce(a.ab_order,0),'source',coalesce(a.entry_source,'Source not recorded')) ORDER BY g.game_date,g.id,a.inning,a.ab_order,a.id) FROM public.gp_at_bats a JOIN public.gp_games g ON g.id=a.game_id WHERE a.user_id=athlete AND g.user_id=athlete AND g.sport=p_sport AND g.deleted_at IS NULL AND g.ignored_for_training=false AND g.status IN ('completed','final') AND g.game_date<p_date),'[]'::jsonb),'tests',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'date',t.test_date,'type',t.test_type,'results',CASE WHEN public.switch_on_for('ledger_unify_v1',athlete) THEN public.ledger_project_row('vault_performance_tests',to_jsonb(t))->'results' ELSE t.results END) ORDER BY t.test_date,t.id) FROM public.vault_performance_tests t WHERE t.user_id=athlete AND t.sport=p_sport AND t.test_date<p_date),'[]'::jsonb),'sprints',coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'date',s.plan_date,'metrics',s.metrics,'distance',s.distance_feet_completed) ORDER BY s.plan_date,s.id) FROM public.wk_session_logs s WHERE s.user_id=athlete AND s.metrics->>'sport'=p_sport AND s.metrics->>'kind'='sprint_time' AND s.plan_date<p_date),'[]'::jsonb),'runs',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'date',g.game_date,'type',r.event_type,'seconds',r.run_time_sec,'lead_steps',r.lead_steps,'source',coalesce(r.entry_source,'Source not recorded')) ORDER BY g.game_date,r.id) FROM public.gp_baserun_events r JOIN public.gp_games g ON g.id=r.game_id WHERE r.user_id=athlete AND g.user_id=athlete AND g.sport=p_sport AND g.deleted_at IS NULL AND g.ignored_for_training=false AND g.status IN ('completed','final') AND g.game_date<p_date),'[]'::jsonb),'homeFirst',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'date',g.game_date,'seconds',CASE WHEN public.switch_on_for('ledger_unify_v1',athlete) THEN public.ledger_project_row('gp_at_bats',to_jsonb(a))->'h1_time_sec' ELSE to_jsonb(a.h1_time_sec) END,'side',a.batting_side,'source',coalesce(a.entry_source,'Source not recorded')) ORDER BY g.game_date,a.id) FROM public.gp_at_bats a JOIN public.gp_games g ON g.id=a.game_id WHERE a.user_id=athlete AND g.user_id=athlete AND g.sport=p_sport AND a.h1_time_sec IS NOT NULL AND g.deleted_at IS NULL AND g.ignored_for_training=false AND g.status IN ('completed','final') AND g.game_date<p_date),'[]'::jsonb),'royal',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'date',r.created_at,'timers',r.timer_data) ORDER BY r.created_at,r.id) FROM public.royal_timing_sessions r WHERE r.user_id=athlete AND r.sport=p_sport AND r.created_at::date<p_date),'[]'::jsonb),'defense',coalesce((SELECT jsonb_agg(jsonb_build_object('id',d.id,'date',g.game_date,'game_id',g.id,'position',d.position,'error',d.error_flag,'assist',d.assist,'putout',d.putout,'source',d.entry_source) ORDER BY g.game_date,g.id,d.inning,d.created_at,d.id) FROM public.gp_defense_plays d JOIN public.gp_games g ON g.id=d.game_id WHERE d.user_id=athlete AND g.user_id=athlete AND g.sport=p_sport AND g.deleted_at IS NULL AND g.ignored_for_training=false AND g.status IN ('completed','final') AND g.game_date<p_date),'[]'::jsonb),'pitching',jsonb_build_object('battersFacedAvailable',false,'reason','Pitch logs do not record completed batters faced; pitch counts cannot substitute.')) INTO answer; RETURN answer; END $function$;

-- ── 7. Ledger-backed reader path: rebuild a legacy row's measurement fields from the ledger. ──
-- Non-measurement fields (dates, notes, locations) stay as stored; every measurement number comes from the
-- ledger's recorded value for that source row, or is empty when the ledger has none (missing beats fabricated).
-- SECURITY INVOKER: a player sees only their own ledger rows, coaches only what the ledger policies allow.
CREATE OR REPLACE FUNCTION public.ledger_project_row(_table text, j jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path = public AS $$
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
      AND o.source_row_id IN (v_srid, v_id || ':any', v_id || ':left', v_id || ':right');

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
END $$;
REVOKE ALL ON FUNCTION public.ledger_project_row(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ledger_project_row(text, jsonb) TO authenticated, service_role;

-- Batch form for app and edge readers: rows of athletes outside ledger_unify_v1 come back untouched.
CREATE OR REPLACE FUNCTION public.ledger_project_rows(_table text, _rows jsonb) RETURNS jsonb
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(CASE WHEN public.switch_on_for('ledger_unify_v1', NULLIF(e->>'user_id', '')::uuid)
      THEN public.ledger_project_row(_table, e) ELSE e END ORDER BY i), '[]'::jsonb)
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(_rows) = 'array' THEN _rows ELSE '[]'::jsonb END) WITH ORDINALITY AS x(e, i)
$$;
REVOKE ALL ON FUNCTION public.ledger_project_rows(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ledger_project_rows(text, jsonb) TO authenticated, service_role;

-- ── 8. Backfill every legacy source into the ledger (owner/server only, idempotent: re-running adds nothing). ──
CREATE OR REPLACE FUNCTION public.ledger_backfill_all() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET statement_timeout = '300s' AS $$
DECLARE t text; j jsonb; n int; rws int; per jsonb := '{}'::jsonb; v_before jsonb; v_after jsonb; v record; f record; r record; nb int := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'owner'::app_role) THEN RAISE EXCEPTION 'owner only' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(jsonb_object_agg(s, c), '{}'::jsonb) INTO v_before FROM (SELECT source || '/' || engine_version s, count(*) c FROM public.athlete_metric_observations GROUP BY 1) x;
  PERFORM set_config('ledger.r0_hidden', 'on', true);
  PERFORM set_config('ledger.backfill', 'on', true);
  FOREACH t IN ARRAY ARRAY['vault_performance_tests', 'vault_focus_quizzes', 'wearable_metrics', 'cv_velocity_measurements', 'throwing_reps',
      'catching_reps', 'gp_at_bats', 'gp_pitches', 'defensive_plays', 'athlete_height_checks', 'weight_entries', 'speed_partner_timings', 'custom_activity_logs'] LOOP
    n := 0; rws := 0;
    FOR j IN EXECUTE format('SELECT to_jsonb(x) FROM public.%I x', t) LOOP rws := rws + 1; n := n + public.ledger_mirror_row_any(t, j); END LOOP;
    per := per || jsonb_build_object(t, jsonb_build_object('rows', rws, 'values', n));
  END LOOP;
  FOREACH t IN ARRAY ARRAY['combine_results', 'baserunning_splits', 'sprint_analyses', 'delaycam_reps', 'block_workout_metrics',
      'athlete_load_tracking', 'athlete_daily_log', 'hie_snapshots'] LOOP
    n := 0; rws := 0;
    FOR j IN EXECUTE format('SELECT to_jsonb(x) FROM public.%I x', t) LOOP rws := rws + 1; n := n + public.ledger_mirror_legacy(t, j); END LOOP;
    per := per || jsonb_build_object(t, jsonb_build_object('rows', rws, 'values', n));
  END LOOP;
  n := 0; rws := 0;
  FOR v IN SELECT id, ai_analysis FROM public.videos WHERE jsonb_typeof(ai_analysis) = 'object' AND temporary_until IS NULL LOOP
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

-- ── 9. Parity check (read-only, owner/server only): legacy value vs ledger-path value, every athlete, every field. ──
CREATE OR REPLACE FUNCTION public.ledger_parity_fields()
RETURNS TABLE(source_table text, field text, compared bigint, matched bigint, mismatched bigint, examples jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public SET statement_timeout = '300s' AS $$
DECLARE t text;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'owner'::app_role) THEN RAISE EXCEPTION 'owner only' USING ERRCODE = '42501'; END IF;
  FOREACH t IN ARRAY ARRAY['vault_performance_tests', 'vault_focus_quizzes', 'wearable_metrics', 'cv_velocity_measurements', 'throwing_reps',
      'catching_reps', 'gp_at_bats', 'gp_pitches', 'defensive_plays', 'athlete_height_checks', 'weight_entries', 'speed_partner_timings',
      'custom_activity_logs', 'combine_results', 'baserunning_splits', 'hie_snapshots', 'athlete_load_tracking', 'athlete_daily_log', 'block_workout_metrics'] LOOP
    RETURN QUERY EXECUTE format($q$
      WITH src AS (SELECT to_jsonb(x) AS l FROM public.%1$I x),
      pr AS (SELECT l, public.ledger_project_row(%2$L, l) AS p FROM src),
      cells AS (
        SELECT l->>'id' AS id, l->>'user_id' AS uid, fld, lv, pv FROM pr,
        LATERAL (
          SELECT 'results.' || key AS fld, value AS lv, (p->'results')->key AS pv FROM jsonb_each(CASE WHEN jsonb_typeof(l->'results') = 'object' THEN l->'results' ELSE '{}' END)
            WHERE jsonb_typeof(value) = 'number' AND key NOT LIKE '\_%%'
          UNION ALL
          SELECT 'results.' || key, (l->'results')->key, value FROM jsonb_each(CASE WHEN jsonb_typeof(p->'results') = 'object' THEN p->'results' ELSE '{}' END)
            WHERE jsonb_typeof(value) = 'number' AND key NOT LIKE '\_%%' AND NOT ((l->'results') ? key)
          UNION ALL
          SELECT 'previous_results.' || key, value, (p->'previous_results')->key FROM jsonb_each(CASE WHEN jsonb_typeof(l->'previous_results') = 'object' THEN l->'previous_results' ELSE '{}' END)
            WHERE jsonb_typeof(value) = 'number' AND key NOT LIKE '\_%%'
          UNION ALL
          SELECT 'previous_results.' || key, (l->'previous_results')->key, value FROM jsonb_each(CASE WHEN jsonb_typeof(p->'previous_results') = 'object' THEN p->'previous_results' ELSE '{}' END)
            WHERE jsonb_typeof(value) = 'number' AND key NOT LIKE '\_%%' AND NOT (COALESCE(l->'previous_results', '{}') ? key)
          UNION ALL
          SELECT 'performance_data.rpe', l->'performance_data'->'rpe', p->'performance_data'->'rpe' WHERE jsonb_typeof(l->'performance_data') = 'object' AND (l->'performance_data') ? 'rpe'
          UNION ALL
          SELECT key, value, p->key FROM jsonb_each(l) WHERE key NOT IN ('results', 'previous_results', 'performance_data') AND (p->key) IS DISTINCT FROM value
          UNION ALL
          SELECT key, value, p->key FROM jsonb_each(l) WHERE key IN (
            'stress_level','hours_slept','sleep_quality','perceived_recovery','physical_readiness','mental_readiness','mood_level','mental_energy','pain_scale',
            'resting_hr','reaction_time_ms','balance_left_seconds','balance_right_seconds','weight_lbs','exit_velo','launch_angle','h1_time_sec','throw_velo',
            'hang_time_sec','total_play_time_sec','inches','body_fat_percent','readiness_score','training_readiness_score','cns_load_total','volume_load',
            'intensity_avg','recovery_debt','cns_load_actual','rpe','hrv_ms','rhr_bpm','sleep_min','in_bed_min','velocity_mph','value','pitch_velo','time_seconds')
            AND jsonb_typeof(value) = 'number' AND (p->key) IS NOT DISTINCT FROM value
        ) c
      )
      SELECT %1$L::text, fld, count(*)::bigint, count(*) FILTER (WHERE lv IS NOT DISTINCT FROM pv)::bigint,
        count(*) FILTER (WHERE lv IS DISTINCT FROM pv)::bigint,
        COALESCE(to_jsonb(((array_agg(jsonb_build_object('id', id, 'user_id', uid, 'legacy', lv, 'ledger', pv) ORDER BY id) FILTER (WHERE lv IS DISTINCT FROM pv))[1:5])), '[]'::jsonb)
      FROM cells GROUP BY fld ORDER BY fld
    $q$, t, t);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.ledger_parity_fields() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ledger_parity_fields() TO service_role;

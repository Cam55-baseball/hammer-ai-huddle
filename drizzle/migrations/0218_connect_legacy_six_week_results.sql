-- Owner Nov 9 (round 3), additive: connect the four old six-week results and add the measurable versions.
--  * 6 new dictionary keys (3 opinions never graded, 3 proposed measurable versions) + 7 aliases (incl. the catching rep names).
--  * ledger_save resolves six_week.<base> through six_week.<test_type>.<base> (the old "velocity").
--  * The 4 stored legacy values get their canonical key; the velocity one is marked "needs review".
--  * New System checks key measurement_review (never pushed).
INSERT INTO public.measurement_definitions (metric_key, unit, athlete_label, display_name, definition, published_source, source_status, sport, higher_is_better,
  physical_min, physical_max, gt_tolerance, gt_device, required_fps, category, privacy_class, in_app_only, is_canonical, notes)
SELECT k, u, l, l, d, s, CASE WHEN s IS NULL THEN 'proposed' ELSE 'published' END, sp, h, mn, mx, gt, gd, fps, c, p, ia, true, 'Release 0 dictionary'
FROM jsonb_to_recordset('[{"k":"arm_feel_self_0_10","u":"score_0_10","l":"Arm feel (self-rating 0–10)","d":"The athlete''s own 0–10 rating of how their throwing arm feels. An opinion, not a measurement: no device check, never graded.","s":null,"sp":"both","h":true,"mn":0,"mx":10,"gt":null,"gd":null,"fps":null,"c":"self_rating","p":"health","ia":false},{"k":"command_self_0_10","u":"score_0_10","l":"Command (self-rating 0–10)","d":"The athlete''s own 0–10 rating of their pitching command. An opinion, not a measurement: no device check, never graded.","s":null,"sp":"both","h":true,"mn":0,"mx":10,"gt":null,"gd":null,"fps":null,"c":"self_rating","p":"training","ia":false},{"k":"accuracy_self_0_10","u":"score_0_10","l":"Throwing accuracy (self-rating 0–10)","d":"The athlete''s own 0–10 rating of their throwing accuracy. An opinion, not a measurement: no device check, never graded.","s":null,"sp":"both","h":true,"mn":0,"mx":10,"gt":null,"gd":null,"fps":null,"c":"self_rating","p":"training","ia":false},{"k":"shoulder_trom_deficit_deg","u":"deg","l":"Shoulder total rotation deficit","d":"Non-throwing shoulder''s total rotation (internal + external) minus the throwing shoulder''s. Caution flag only (Release 4), never graded. Wilk et al. 2011 linked a deficit over 5° to shoulder injury; range and tolerance proposed.","s":null,"sp":"both","h":false,"mn":-30,"mx":60,"gt":5,"gd":"Goniometer","fps":null,"c":"mobility","p":"training","ia":false},{"k":"strike_pct_20","u":"pct","l":"Strike % (20 fastballs)","d":"Strikes out of 20 fastballs thrown from the mound, as a percentage (the standard strike-percentage stat). Pitching programs. Tolerance ±1 pitch (5 points), proposed.","s":null,"sp":"both","h":true,"mn":0,"mx":100,"gt":5,"gd":"Second observer, or Rapsodo/TrackMan zone call","fps":null,"c":"pitching_command","p":"training","ia":false},{"k":"throw_target_pct_10","u":"pct","l":"Target hits (10 throws)","d":"Throws out of 10 that hit a chest-high target from the player''s position distance, as a percentage. Throwing programs. No published standard; tolerance ±1 throw (10 points), proposed.","s":null,"sp":"both","h":true,"mn":0,"mx":100,"gt":10,"gd":"Video count by a second person","fps":null,"c":"fielding","p":"training","ia":false}]'::jsonb) AS r(k text, u text, l text, d text, s text, sp text, h boolean, mn double precision, mx double precision,
  gt double precision, gd text, fps integer, c text, p text, ia boolean)
ON CONFLICT (metric_key) DO NOTHING;
INSERT INTO public.metric_aliases (alias_key, canonical_key, alias_unit, naming_system, note) SELECT a, k, u, s, n
FROM jsonb_to_recordset('[{"a":"six_week.arm_health","k":"arm_feel_self_0_10","u":"score_0_10","s":"six_week","n":null},{"a":"six_week.command_score","k":"command_self_0_10","u":"score_0_10","s":"six_week","n":null},{"a":"six_week.accuracy_score","k":"accuracy_self_0_10","u":"score_0_10","s":"six_week","n":null},{"a":"six_week.throwing.velocity","k":"position_throw_velo_mph","u":"mph","s":"six_week","n":null},{"a":"six_week.pitching.velocity","k":"pitch_velo_mph","u":"mph","s":"six_week","n":null},{"a":"catching.pop_time_sec","k":"pop_time_s","u":"s","s":"game_log","n":null},{"a":"catching.throw_velo_mph","k":"position_throw_velo_mph","u":"mph","s":"game_log","n":null}]'::jsonb) AS r(a text, k text, u text, s text, n text)
ON CONFLICT (alias_key) DO NOTHING;

UPDATE public.measurement_definitions SET notes = 'Opinion (self-rating), not a measurement: no device gate, never graded. Owner Nov 9.'
  WHERE metric_key IN ('arm_feel_self_0_10', 'command_self_0_10', 'accuracy_self_0_10');
UPDATE public.measurement_definitions SET notes = 'Proposed measurable version, owner Nov 9. Caution flag only (Release 4), never graded; no data yet.'
  WHERE metric_key = 'shoulder_trom_deficit_deg';
UPDATE public.measurement_definitions SET notes = 'Proposed measurable version, owner Nov 9; not on the six-week form.'
  WHERE metric_key IN ('strike_pct_20', 'throw_target_pct_10');

CREATE OR REPLACE FUNCTION public.ledger_save(_p jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Owner Nov 9: some six-week names mean different things per test (the old "velocity"):
    -- six_week.<base> resolves through six_week.<test_type>.<base> when that alias exists.
    IF v_canon IS NULL AND v_key LIKE 'six\_week.%' AND COALESCE(v_ctx->>'test_type', '') <> '' THEN
      SELECT a.canonical_key, a.alias_unit INTO v_canon, v_alias_unit FROM public.metric_aliases a
        WHERE a.alias_key = 'six_week.' || (v_ctx->>'test_type') || '.' || substring(v_key FROM 10);
    END IF;
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
  v_priv := COALESCE(_p->>'privacy_class', v_def.privacy_class, 'training');

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
END $function$;
REVOKE ALL ON FUNCTION public.ledger_save(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ledger_save(jsonb) TO service_role;

-- Backfill: the stored legacy six-week values (owner-approved mapping; never converted).
UPDATE public.athlete_metric_observations o
   SET canonical_key = a.canonical_key, canonical_unit = d.unit,
       canonical_value = public.metric_convert(o.value, COALESCE(NULLIF(o.unit, ''), a.alias_unit, d.unit), d.unit),
       physics_ok = public.metric_convert(o.value, COALESCE(NULLIF(o.unit, ''), a.alias_unit, d.unit), d.unit) BETWEEN d.physical_min AND d.physical_max
  FROM public.metric_aliases a JOIN public.measurement_definitions d ON d.metric_key = a.canonical_key
 WHERE o.source = 'six_week' AND o.canonical_key IS NULL
   AND a.alias_key = CASE WHEN o.metric_key = 'six_week.velocity' AND COALESCE(o.capture_context->>'test_type', '') <> ''
                          THEN 'six_week.' || (o.capture_context->>'test_type') || '.velocity' ELSE o.metric_key END;
UPDATE public.athlete_metric_observations
   SET capture_context = capture_context || jsonb_build_object('review', 'needs review: the same test row shows exit velocity 75 (possible mix-up)')
 WHERE source = 'six_week' AND metric_key = 'six_week.velocity' AND value = 75 AND canonical_key = 'position_throw_velo_mph'
   AND source_row_id = '1c13c3f8-7107-4da2-91f5-d7299f8daa81:any';
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT user_id, canonical_key, context_key FROM public.athlete_metric_observations
     WHERE source = 'six_week' AND source_row_id = '1c13c3f8-7107-4da2-91f5-d7299f8daa81:any'
       AND canonical_key IN ('position_throw_velo_mph', 'arm_feel_self_0_10', 'command_self_0_10', 'accuracy_self_0_10') LOOP
    PERFORM public.ledger_baseline_update(r.user_id, r.canonical_key, r.context_key);
  END LOOP;
END $$;

ALTER TABLE public.plan_check_failures DROP CONSTRAINT IF EXISTS plan_check_failures_check_key_check;
ALTER TABLE public.plan_check_failures ADD CONSTRAINT plan_check_failures_check_key_check
  CHECK (check_key IN ('analysis_findings', 'drill_choice', 'practice_history', 'measurement_save', 'apple_health', 'measurement_review'));

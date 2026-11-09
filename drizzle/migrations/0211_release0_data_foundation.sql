-- Release 0 (owner-approved Nov 8): data foundation + Release A follow-ups. Additive only:
-- no history moved or deleted, no existing column renamed. Ledger column names stay
-- (user_id = athlete, recorded_at = captured_at) so the live web app and older iPhone builds keep working.

-- ── 1. Ledger: capture facts on every measurement ──
ALTER TABLE public.athlete_metric_observations
  ADD COLUMN IF NOT EXISTS device_model text,
  ADD COLUMN IF NOT EXISTS capture_fps double precision,
  ADD COLUMN IF NOT EXISTS capture_conditions jsonb,
  ADD COLUMN IF NOT EXISTS source_kind text,
  ADD COLUMN IF NOT EXISTS rep_index integer,
  ADD COLUMN IF NOT EXISTS app_build text,
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS attested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS canonical_key text,
  ADD COLUMN IF NOT EXISTS canonical_value double precision,
  ADD COLUMN IF NOT EXISTS canonical_unit text,
  ADD COLUMN IF NOT EXISTS physics_ok boolean,
  ADD COLUMN IF NOT EXISTS privacy_class text NOT NULL DEFAULT 'training';
COMMENT ON COLUMN public.athlete_metric_observations.user_id IS 'Athlete (Release 0 athlete_id).';
COMMENT ON COLUMN public.athlete_metric_observations.recorded_at IS 'When the measurement was captured (Release 0 captured_at).';
COMMENT ON COLUMN public.athlete_metric_observations.capture_fps IS 'Real frames per second counted from the capture, never file metadata. NULL = not a camera measurement or unknown.';
COMMENT ON COLUMN public.athlete_metric_observations.attested IS 'TRUE only when an iPhone App Attest assertion was verified for the write.';
COMMENT ON COLUMN public.athlete_metric_observations.physics_ok IS 'G3: canonical value inside the dictionary physical min/max. NULL = no bounds or no canonical value.';
COMMENT ON COLUMN public.athlete_metric_observations.privacy_class IS 'health = check-in/Apple Health/mental load: coaches read only through the check-in sharing gate.';

UPDATE public.athlete_metric_observations SET source_kind = CASE
    WHEN source IN ('video_tile', 'delaycam', 'sprint') THEN 'cv_measured'
    WHEN source IN ('readiness', 'workload') THEN 'derived'
    WHEN source IN ('combine', 'baserunning') AND capture_context->>'source' IN ('video_detected', 'cv', 'camera') THEN 'cv_measured'
    ELSE 'manual' END
  WHERE source_kind IS NULL;
UPDATE public.athlete_metric_observations SET capture_fps = (capture_context->>'fps')::double precision
  WHERE capture_fps IS NULL AND source_kind = 'cv_measured' AND jsonb_typeof(capture_context->'fps') = 'number'
    AND (capture_context->>'fps')::double precision > 0;
UPDATE public.athlete_metric_observations SET privacy_class = 'health' WHERE metric_key = 'mental_load' AND privacy_class <> 'health';

ALTER TABLE public.athlete_metric_observations
  ADD CONSTRAINT amo_source_kind_check CHECK (source_kind IS NULL OR source_kind IN ('cv_measured', 'manual', 'healthkit', 'derived')),
  ADD CONSTRAINT amo_platform_check CHECK (platform IS NULL OR platform IN ('ios', 'web')),
  ADD CONSTRAINT amo_privacy_check CHECK (privacy_class IN ('training', 'health')),
  ADD CONSTRAINT amo_fps_check CHECK (capture_fps IS NULL OR capture_fps > 0);
CREATE INDEX IF NOT EXISTS amo_user_metric_time_idx ON public.athlete_metric_observations (user_id, metric_key, recorded_at);
CREATE INDEX IF NOT EXISTS amo_user_canonical_time_idx ON public.athlete_metric_observations (user_id, canonical_key, recorded_at) WHERE canonical_key IS NOT NULL;

DROP POLICY IF EXISTS "Linked coaches read athlete observations" ON public.athlete_metric_observations;
CREATE POLICY "Linked coaches read athlete observations" ON public.athlete_metric_observations FOR SELECT TO authenticated
  USING (public.is_coach_of(auth.uid(), user_id) AND (privacy_class = 'training' OR public._coach_checkin_access(user_id)));

ALTER TABLE public.athlete_baseline_history ADD COLUMN IF NOT EXISTS privacy_class text NOT NULL DEFAULT 'training';
CREATE OR REPLACE FUNCTION public.baseline_history_privacy() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT o.privacy_class INTO NEW.privacy_class FROM public.athlete_metric_observations o WHERE o.id = NEW.observation_id;
  NEW.privacy_class := COALESCE(NEW.privacy_class, 'training');
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.baseline_history_privacy() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER baseline_history_privacy BEFORE INSERT ON public.athlete_baseline_history FOR EACH ROW EXECUTE FUNCTION public.baseline_history_privacy();
DROP POLICY IF EXISTS "Own baseline history" ON public.athlete_baseline_history;
CREATE POLICY "Own baseline history" ON public.athlete_baseline_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'::app_role)
    OR (public.is_coach_of(auth.uid(), user_id) AND (privacy_class = 'training' OR public._coach_checkin_access(user_id))));

-- ── 2. One metric dictionary (rows seeded from _shared/ledger/metricDictionary.ts) ──
ALTER TABLE public.measurement_definitions
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS definition text,
  ADD COLUMN IF NOT EXISTS published_source text,
  ADD COLUMN IF NOT EXISTS source_status text NOT NULL DEFAULT 'proposed',
  ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS higher_is_better boolean,
  ADD COLUMN IF NOT EXISTS physical_min double precision,
  ADD COLUMN IF NOT EXISTS physical_max double precision,
  ADD COLUMN IF NOT EXISTS gt_tolerance double precision,
  ADD COLUMN IF NOT EXISTS gt_device text,
  ADD COLUMN IF NOT EXISTS required_fps integer,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS privacy_class text NOT NULL DEFAULT 'training',
  ADD COLUMN IF NOT EXISTS in_app_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_canonical boolean NOT NULL DEFAULT false;
ALTER TABLE public.measurement_definitions
  ADD CONSTRAINT md_source_status_check CHECK (source_status IN ('published', 'proposed')),
  ADD CONSTRAINT md_sport_check CHECK (sport IN ('both', 'baseball', 'softball')),
  ADD CONSTRAINT md_privacy_check CHECK (privacy_class IN ('training', 'health'));

CREATE TABLE public.metric_aliases (
  alias_key text PRIMARY KEY,
  canonical_key text NOT NULL REFERENCES public.measurement_definitions(metric_key),
  alias_unit text,
  naming_system text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.metric_aliases TO authenticated;
GRANT ALL ON public.metric_aliases TO service_role;
ALTER TABLE public.metric_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read aliases" ON public.metric_aliases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner manages aliases" ON public.metric_aliases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));

CREATE TABLE public.metric_unit_conversions (
  to_unit text NOT NULL,
  from_unit text NOT NULL,
  factor double precision NOT NULL,
  PRIMARY KEY (to_unit, from_unit)
);
GRANT SELECT ON public.metric_unit_conversions TO authenticated;
GRANT ALL ON public.metric_unit_conversions TO service_role;
ALTER TABLE public.metric_unit_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read conversions" ON public.metric_unit_conversions FOR SELECT TO authenticated USING (true);

-- ── 3. Personal baselines (rolling 4 / 12 weeks, season best = calendar year, proposed) ──
CREATE TABLE public.athlete_metric_baselines (
  user_id uuid NOT NULL,
  canonical_key text NOT NULL,
  context_key text NOT NULL DEFAULT 'any|any',
  n_4w integer NOT NULL DEFAULT 0,
  mean_4w double precision,
  sd_4w double precision,
  n_12w integer NOT NULL DEFAULT 0,
  mean_12w double precision,
  sd_12w double precision,
  season_year integer,
  season_best double precision,
  season_best_at timestamptz,
  season_best_observation_id uuid,
  as_of timestamptz,
  privacy_class text NOT NULL DEFAULT 'training',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, canonical_key, context_key)
);
GRANT SELECT ON public.athlete_metric_baselines TO authenticated;
GRANT ALL ON public.athlete_metric_baselines TO service_role;
ALTER TABLE public.athlete_metric_baselines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or linked baselines" ON public.athlete_metric_baselines FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'::app_role)
    OR (public.is_coach_of(auth.uid(), user_id) AND (privacy_class = 'training' OR public._coach_checkin_access(user_id))));

-- ── 4. No silent drops: failed saves are kept for the owner's System checks card ──
CREATE TABLE public.ledger_write_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  source text,
  metric_key text,
  value double precision,
  reason text NOT NULL,
  error text,
  attempts integer NOT NULL DEFAULT 1,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX ledger_write_failures_created_idx ON public.ledger_write_failures (created_at DESC);
GRANT SELECT ON public.ledger_write_failures TO authenticated;
GRANT ALL ON public.ledger_write_failures TO service_role;
ALTER TABLE public.ledger_write_failures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads ledger failures" ON public.ledger_write_failures FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.plan_check_failures DROP CONSTRAINT IF EXISTS plan_check_failures_check_key_check;
ALTER TABLE public.plan_check_failures ADD CONSTRAINT plan_check_failures_check_key_check
  CHECK (check_key IN ('analysis_findings', 'drill_choice', 'practice_history', 'measurement_save'));

-- ── 5. Switch helper (same semantics as _shared/wic/flags/featureSwitches.ts) ──
CREATE OR REPLACE FUNCTION public.switch_on_for(_key text, _user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT s.mode = 'all' OR (s.mode = 'pilot' AND _user = ANY(COALESCE(s.allowlist, '{}'::uuid[])))
      OR (s.mode = 'self' AND s.updated_by = _user)
    FROM public.wk_feature_switches s WHERE s.feature_key = _key), false) AND _user IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.switch_on_for(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.switch_on_for(text, uuid) TO authenticated, service_role;

-- ── 6. THE save function. Every measurement writer goes through ledger_save. ──
CREATE OR REPLACE FUNCTION public.metric_convert(_value double precision, _from text, _to text) RETURNS double precision
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE WHEN _value IS NULL OR _to IS NULL THEN NULL
    WHEN COALESCE(lower(trim(_from)), '') IN ('', lower(_to)) THEN _value
    ELSE (SELECT _value * c.factor FROM public.metric_unit_conversions c WHERE c.to_unit = _to AND c.from_unit = lower(trim(_from))) END
$$;

CREATE OR REPLACE FUNCTION public.ledger_baseline_update(_user uuid, _key text, _ctx text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.measurement_definitions%ROWTYPE; v_asof timestamptz; v_min_conf double precision; v_priv text;
  r4 record; r12 record; b record; v_year int;
BEGIN
  SELECT * INTO d FROM public.measurement_definitions WHERE metric_key = _key;
  v_min_conf := COALESCE(d.min_confidence, 0.5);
  SELECT max(recorded_at) INTO v_asof FROM public.athlete_metric_observations
    WHERE user_id = _user AND canonical_key = _key AND context_key = _ctx;
  IF v_asof IS NULL THEN RETURN; END IF;
  v_year := extract(year FROM v_asof)::int;
  SELECT count(*)::int n, avg(canonical_value) m, stddev_samp(canonical_value) s INTO r4 FROM public.athlete_metric_observations
    WHERE user_id = _user AND canonical_key = _key AND context_key = _ctx AND canonical_value IS NOT NULL AND source <> 'validation_lab'
      AND physics_ok IS NOT FALSE AND (confidence IS NULL OR confidence >= v_min_conf) AND recorded_at > v_asof - interval '28 days';
  SELECT count(*)::int n, avg(canonical_value) m, stddev_samp(canonical_value) s INTO r12 FROM public.athlete_metric_observations
    WHERE user_id = _user AND canonical_key = _key AND context_key = _ctx AND canonical_value IS NOT NULL AND source <> 'validation_lab'
      AND physics_ok IS NOT FALSE AND (confidence IS NULL OR confidence >= v_min_conf) AND recorded_at > v_asof - interval '84 days';
  SELECT o.id, o.canonical_value v, o.recorded_at at INTO b FROM public.athlete_metric_observations o
    WHERE o.user_id = _user AND o.canonical_key = _key AND o.context_key = _ctx AND o.canonical_value IS NOT NULL AND o.source <> 'validation_lab'
      AND o.physics_ok IS NOT FALSE AND (o.confidence IS NULL OR o.confidence >= v_min_conf) AND d.higher_is_better IS NOT NULL
      AND extract(year FROM o.recorded_at)::int = v_year
    ORDER BY CASE WHEN d.higher_is_better THEN -o.canonical_value ELSE o.canonical_value END, o.recorded_at LIMIT 1;
  v_priv := COALESCE(d.privacy_class, 'training');
  INSERT INTO public.athlete_metric_baselines AS t (user_id, canonical_key, context_key, n_4w, mean_4w, sd_4w, n_12w, mean_12w, sd_12w,
      season_year, season_best, season_best_at, season_best_observation_id, as_of, privacy_class, updated_at)
    VALUES (_user, _key, _ctx, COALESCE(r4.n, 0), r4.m, r4.s, COALESCE(r12.n, 0), r12.m, r12.s, v_year, b.v, b.at, b.id, v_asof, v_priv, now())
  ON CONFLICT (user_id, canonical_key, context_key) DO UPDATE SET n_4w = EXCLUDED.n_4w, mean_4w = EXCLUDED.mean_4w, sd_4w = EXCLUDED.sd_4w,
    n_12w = EXCLUDED.n_12w, mean_12w = EXCLUDED.mean_12w, sd_12w = EXCLUDED.sd_12w, season_year = EXCLUDED.season_year,
    season_best = EXCLUDED.season_best, season_best_at = EXCLUDED.season_best_at, season_best_observation_id = EXCLUDED.season_best_observation_id,
    as_of = EXCLUDED.as_of, privacy_class = EXCLUDED.privacy_class, updated_at = now();
END $$;
REVOKE ALL ON FUNCTION public.ledger_baseline_update(uuid, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ledger_log_failure(_p jsonb, _reason text, _error text, _attempts int) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := NULLIF(_p->>'user_id', '')::uuid;
BEGIN
  BEGIN
    INSERT INTO public.ledger_write_failures (user_id, source, metric_key, value, reason, error, attempts, payload)
    VALUES (v_user, _p->>'source', _p->>'metric_key',
      CASE WHEN jsonb_typeof(_p->'value') = 'number' THEN (_p->>'value')::double precision END, _reason, left(_error, 500), _attempts, _p);
    IF v_user IS NOT NULL THEN
      INSERT INTO public.plan_check_failures (user_id, check_key, error)
      VALUES (v_user, 'measurement_save', left(_reason || ': ' || COALESCE(_p->>'metric_key', '?') || ' — ' || COALESCE(_error, ''), 500));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[ledger] failure log failed: %', SQLERRM;
  END;
END $$;
REVOKE ALL ON FUNCTION public.ledger_log_failure(jsonb, text, text, int) FROM PUBLIC, anon, authenticated;

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
        canonical_key, canonical_value, canonical_unit, physics_ok, privacy_class)
      VALUES (v_user, NULLIF(_p->>'video_id', '')::uuid, v_source, v_key, v_value, COALESCE(_p->>'engine_version', 'unknown'),
        COALESCE(NULLIF(_p->>'recorded_at', '')::timestamptz, now()), v_unit, NULLIF(_p->>'session_id', '')::uuid, _p->>'source_row_id',
        v_ctx, v_ckey, CASE WHEN jsonb_typeof(_p->'confidence') = 'number' THEN (_p->>'confidence')::double precision END,
        CASE WHEN jsonb_typeof(_p->'noise_floor') = 'number' THEN (_p->>'noise_floor')::double precision END,
        _p->>'device_model', CASE WHEN jsonb_typeof(_p->'capture_fps') = 'number' AND (_p->>'capture_fps')::double precision > 0 THEN (_p->>'capture_fps')::double precision END,
        CASE WHEN jsonb_typeof(_p->'capture_conditions') = 'object' THEN _p->'capture_conditions' END, v_kind,
        CASE WHEN jsonb_typeof(_p->'rep_index') = 'number' THEN (_p->>'rep_index')::int END, _p->>'app_build',
        CASE WHEN _p->>'platform' IN ('ios', 'web') THEN _p->>'platform' END, COALESCE((_p->>'attested')::boolean, false),
        v_canon, v_cval, v_cunit, v_phys, v_priv)
      ON CONFLICT (user_id, source, source_row_id, metric_key, engine_version) WHERE source_row_id IS NOT NULL
      DO UPDATE SET value = EXCLUDED.value, unit = EXCLUDED.unit, capture_context = EXCLUDED.capture_context,
        context_key = EXCLUDED.context_key, confidence = EXCLUDED.confidence, noise_floor = EXCLUDED.noise_floor,
        recorded_at = EXCLUDED.recorded_at, canonical_key = EXCLUDED.canonical_key, canonical_value = EXCLUDED.canonical_value,
        canonical_unit = EXCLUDED.canonical_unit, physics_ok = EXCLUDED.physics_ok
      WHERE public.athlete_metric_observations.value IS DISTINCT FROM EXCLUDED.value
      RETURNING id INTO v_id;
      IF v_id IS NOT NULL AND v_source <> 'validation_lab' THEN
        PERFORM public.baseline_recompute(v_id);
        IF v_canon IS NOT NULL THEN PERFORM public.ledger_baseline_update(v_user, v_canon, v_ckey); END IF;
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

CREATE OR REPLACE FUNCTION public.ledger_record(p_user uuid, p_source text, p_key text, p_value double precision, p_unit text,
  p_video uuid, p_session uuid, p_source_row text, p_ctx jsonb, p_conf double precision, p_floor double precision, p_engine text, p_at timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ctx jsonb := COALESCE(p_ctx, '{}'::jsonb);
BEGIN
  IF p_user IS NULL OR p_key IS NULL OR p_value IS NULL OR p_value = 'NaN'::double precision
     OR p_value IN ('Infinity'::double precision, '-Infinity'::double precision) THEN RETURN NULL; END IF;
  RETURN public.ledger_save(jsonb_strip_nulls(jsonb_build_object(
    'user_id', p_user, 'source', p_source, 'metric_key', p_key, 'value', p_value, 'unit', p_unit, 'video_id', p_video,
    'session_id', p_session, 'source_row_id', p_source_row, 'capture_context', v_ctx, 'confidence', p_conf,
    'noise_floor', p_floor, 'engine_version', p_engine, 'recorded_at', p_at,
    'capture_fps', CASE WHEN jsonb_typeof(v_ctx->'fps') = 'number' THEN v_ctx->'fps' END)));
END $$;

-- ── 7. New writers (each source row stays the record; the ledger mirrors it 1:1, idempotent) ──
-- Only for athletes inside ledger_unify_v1, so nobody's displays or plan inputs change until the owner opens it.
CREATE OR REPLACE FUNCTION public.ledger_mirror_row(_table text, j jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k record; v_base text; v_side text; v_src text; v_at timestamptz; v_user uuid := NULLIF(j->>'user_id', '')::uuid; n int := 0;
  v_id text := j->>'id'; v_ts timestamptz := NULLIF(j->>'created_at', '')::timestamptz;
BEGIN
  IF v_user IS NULL OR NOT public.switch_on_for('ledger_unify_v1', v_user) THEN RETURN 0; END IF;
  IF _table = 'vault_performance_tests' THEN
    v_at := COALESCE(NULLIF(j->>'test_date', '')::timestamptz, v_ts);
    FOR k IN SELECT key, value FROM jsonb_each(COALESCE(j->'results', '{}'::jsonb)) WHERE jsonb_typeof(value) = 'number' AND key NOT LIKE '\_%' LOOP
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
    PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', 'healthkit', 'metric_key', 'healthkit.' || (j->>'metric'),
      'value', CASE j->>'metric' WHEN 'hrv_sdnn' THEN j->'hrv_ms' WHEN 'resting_hr' THEN j->'rhr_bpm' WHEN 'sleep_asleep' THEN j->'sleep_min'
        WHEN 'sleep_in_bed' THEN j->'in_bed_min' END,
      'source_row_id', COALESCE(j->>'sample_id', v_id), 'engine_version', 'apple_health', 'recorded_at', j->>'captured_at',
      'source_kind', 'healthkit', 'platform', 'ios', 'device_model', j->>'device_name', 'privacy_class', 'health'));
    n := 1;
  ELSIF _table = 'cv_velocity_measurements' THEN
    IF j->>'status' = 'measured' THEN
      PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', 'cv_velocity', 'metric_key', 'cv.pitch_velocity_mph',
        'value', j->'velocity_mph', 'unit', 'mph', 'video_id', j->>'video_id', 'source_row_id', v_id,
        'engine_version', COALESCE(j->>'model_id', j->>'method', 'cv_velocity'), 'recorded_at', v_ts, 'source_kind', 'cv_measured',
        'confidence', j->'confidence',
        'capture_fps', CASE WHEN j->>'capture_fps_source' = 'capture' THEN j->'capture_fps' END,
        'capture_context', jsonb_strip_nulls(jsonb_build_object('sport', j->>'sport', 'fps_source', j->>'capture_fps_source'))));
      n := 1;
    END IF;
  ELSIF _table IN ('throwing_reps', 'catching_reps') THEN
    IF j->>'missing_reason' IS NULL THEN
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
      PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', 'game', 'metric_key', k.mk, 'value', j->k.col, 'unit', k.u,
        'source_row_id', v_id, 'engine_version', 'gp_at_bats', 'recorded_at', v_ts, 'source_kind', 'manual',
        'capture_context', jsonb_build_object('context', 'game')));
      n := n + 1;
    END LOOP;
  ELSIF _table = 'gp_pitches' THEN
    IF j->>'perspective' = 'pitcher' THEN
      PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', 'game', 'metric_key', 'game.pitch_velo', 'value', j->'pitch_velo', 'unit', 'mph',
        'source_row_id', v_id, 'engine_version', 'gp_pitches', 'recorded_at', v_ts, 'source_kind', 'manual', 'capture_context', jsonb_build_object('context', 'game')));
      n := 1;
    END IF;
  ELSIF _table = 'defensive_plays' THEN
    FOR k IN SELECT * FROM (VALUES ('game.throw_velo', 'throw_velo', 'mph'), ('game.hang_time', 'hang_time_sec', 's'),
        ('game.play_time', 'total_play_time_sec', 's')) x(mk, col, u) LOOP
      PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', 'game', 'metric_key', k.mk, 'value', j->k.col, 'unit', k.u,
        'source_row_id', v_id, 'engine_version', 'defensive_plays', 'recorded_at', v_ts, 'confidence', j->'confidence',
        'capture_context', jsonb_strip_nulls(jsonb_build_object('context', 'game', 'source', j->>'source'))));
      n := n + 1;
    END LOOP;
  ELSIF _table = 'athlete_height_checks' THEN
    PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', 'body', 'metric_key', 'body.height_in', 'value', j->'inches', 'unit', 'in',
      'source_row_id', v_id, 'engine_version', 'athlete_height_checks', 'recorded_at', COALESCE(NULLIF(j->>'measured_on', '')::timestamptz, v_ts), 'source_kind', 'manual'));
    n := 1;
  ELSIF _table = 'weight_entries' THEN
    FOR k IN SELECT * FROM (VALUES ('body.weight_lbs', 'weight_lbs', 'lb'), ('body.body_fat_percent', 'body_fat_percent', 'pct')) x(mk, col, u) LOOP
      PERFORM public.ledger_save(jsonb_build_object('user_id', v_user, 'source', 'body', 'metric_key', k.mk, 'value', j->k.col, 'unit', k.u,
        'source_row_id', v_id, 'engine_version', 'weight_entries', 'recorded_at', COALESCE(NULLIF(j->>'entry_date', '')::timestamptz, v_ts),
        'source_kind', 'manual', 'privacy_class', 'health'));
      n := n + 1;
    END LOOP;
  END IF;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.ledger_mirror_row(text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ledger_from_release0() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    PERFORM public.ledger_mirror_row(TG_TABLE_NAME, to_jsonb(NEW));
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.ledger_log_failure(jsonb_build_object('user_id', NEW.user_id, 'source', TG_TABLE_NAME, 'source_row_id', NEW.id), 'trigger_failed', SQLERRM, 1);
  END;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.ledger_from_release0() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER ledger_r0_vault_tests AFTER INSERT OR UPDATE OF results ON public.vault_performance_tests FOR EACH ROW EXECUTE FUNCTION public.ledger_from_release0();
CREATE TRIGGER ledger_r0_checkins AFTER INSERT OR UPDATE ON public.vault_focus_quizzes FOR EACH ROW EXECUTE FUNCTION public.ledger_from_release0();
CREATE TRIGGER ledger_r0_wearables AFTER INSERT OR UPDATE ON public.wearable_metrics FOR EACH ROW EXECUTE FUNCTION public.ledger_from_release0();
CREATE TRIGGER ledger_r0_cv_velocity AFTER INSERT OR UPDATE OF status, velocity_mph ON public.cv_velocity_measurements FOR EACH ROW EXECUTE FUNCTION public.ledger_from_release0();
CREATE TRIGGER ledger_r0_throwing AFTER INSERT OR UPDATE OF value ON public.throwing_reps FOR EACH ROW EXECUTE FUNCTION public.ledger_from_release0();
CREATE TRIGGER ledger_r0_catching AFTER INSERT OR UPDATE OF value ON public.catching_reps FOR EACH ROW EXECUTE FUNCTION public.ledger_from_release0();
CREATE TRIGGER ledger_r0_at_bats AFTER INSERT OR UPDATE OF exit_velo, launch_angle, h1_time_sec ON public.gp_at_bats FOR EACH ROW EXECUTE FUNCTION public.ledger_from_release0();
CREATE TRIGGER ledger_r0_pitches AFTER INSERT OR UPDATE OF pitch_velo, perspective ON public.gp_pitches FOR EACH ROW EXECUTE FUNCTION public.ledger_from_release0();
CREATE TRIGGER ledger_r0_defense AFTER INSERT OR UPDATE OF throw_velo, hang_time_sec, total_play_time_sec ON public.defensive_plays FOR EACH ROW EXECUTE FUNCTION public.ledger_from_release0();
CREATE TRIGGER ledger_r0_height AFTER INSERT OR UPDATE OF inches ON public.athlete_height_checks FOR EACH ROW EXECUTE FUNCTION public.ledger_from_release0();
CREATE TRIGGER ledger_r0_weight AFTER INSERT OR UPDATE OF weight_lbs, body_fat_percent ON public.weight_entries FOR EACH ROW EXECUTE FUNCTION public.ledger_from_release0();

CREATE OR REPLACE FUNCTION public.ledger_from_sources()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE k record;
BEGIN
 BEGIN
  IF TG_TABLE_NAME = 'combine_results' THEN
    IF NEW.value IS NOT NULL AND NEW.missing_reason IS NULL THEN
      PERFORM public.ledger_record(NEW.user_id, 'combine', 'combine.' || NEW.event, NEW.value, NEW.unit, NULL, NEW.session_id, NEW.id::text,
        jsonb_build_object('source', NEW.source), NEW.confidence, NULL, 'combine_results', NEW.created_at);
    END IF;
  ELSIF TG_TABLE_NAME = 'baserunning_splits' THEN
    IF NEW.value IS NOT NULL AND NEW.missing_reason IS NULL THEN
      PERFORM public.ledger_record(NEW.user_id, 'baserunning', 'baserunning.' || NEW.event, NEW.value, NEW.unit, NULL, NULL, NEW.id::text,
        jsonb_build_object('side', NEW.batter_hand, 'source', NEW.source), NEW.confidence, NULL, 'baserunning_splits', NEW.created_at);
    END IF;
  ELSIF TG_TABLE_NAME = 'sprint_analyses' THEN
    IF NEW.total_time_sec IS NOT NULL AND COALESCE(NEW.validation_status,'') NOT IN ('rejected','invalid','failed') THEN
      PERFORM public.ledger_record(NEW.user_id, 'sprint', 'sprint.' || COALESCE(NEW.distance_key,'unknown') || '.total_time_sec', NEW.total_time_sec, 'seconds',
        NULL, NEW.session_id, NEW.id::text, jsonb_build_object('source', NEW.ai_model), NEW.confidence_score, NULL, COALESCE(NEW.ai_model,'sprint'), NEW.created_at);
    END IF;
  ELSIF TG_TABLE_NAME = 'delaycam_reps' THEN
    FOR k IN SELECT key, value FROM jsonb_each(COALESCE(NEW.metrics,'{}'::jsonb)) WHERE jsonb_typeof(value) = 'number' LOOP
      PERFORM public.ledger_record(NEW.user_id, 'delaycam', 'delaycam.' || k.key, (k.value #>> '{}')::double precision, NULL, NULL, NEW.session_id,
        NEW.id::text, jsonb_build_object('fps_tier', NEW.fps_tier, 'fps', NEW.fps_measured), NEW.boundary_confidence, NULL,
        COALESCE(NEW.engine_version,'delaycam'), NEW.created_at);
    END LOOP;
  ELSIF TG_TABLE_NAME = 'block_workout_metrics' THEN
    IF NEW.rpe IS NOT NULL THEN
      PERFORM public.ledger_record(NEW.user_id, 'lifting', 'lifting.session_rpe', NEW.rpe, 'rpe', NULL, NEW.workout_id, NEW.id::text,
        '{}'::jsonb, NULL, NULL, 'block_workout_metrics', NEW.created_at);
    END IF;
  ELSIF TG_TABLE_NAME = 'athlete_load_tracking' THEN
    PERFORM public.ledger_record(NEW.user_id, 'workload', 'workload.cns_load_total', NEW.cns_load_total, 'load', NULL, NULL, NEW.id::text, '{}'::jsonb, NULL, NULL, 'athlete_load_tracking', NEW.entry_date::timestamptz);
    PERFORM public.ledger_record(NEW.user_id, 'workload', 'workload.volume_load', NEW.volume_load, 'load', NULL, NULL, NEW.id::text, '{}'::jsonb, NULL, NULL, 'athlete_load_tracking', NEW.entry_date::timestamptz);
    PERFORM public.ledger_record(NEW.user_id, 'workload', 'workload.intensity_avg', NEW.intensity_avg, 'intensity', NULL, NULL, NEW.id::text, '{}'::jsonb, NULL, NULL, 'athlete_load_tracking', NEW.entry_date::timestamptz);
    PERFORM public.ledger_record(NEW.user_id, 'workload', 'workload.recovery_debt', NEW.recovery_debt, 'load', NULL, NULL, NEW.id::text, '{}'::jsonb, NULL, NULL, 'athlete_load_tracking', NEW.entry_date::timestamptz);
  ELSIF TG_TABLE_NAME = 'athlete_daily_log' THEN
    PERFORM public.ledger_record(NEW.user_id, 'workload', 'workload.cns_load_actual', NEW.cns_load_actual, 'load', NULL, NULL, NEW.id::text, '{}'::jsonb, NULL, NULL, 'athlete_daily_log', NEW.entry_date::timestamptz);
  ELSIF TG_TABLE_NAME = 'hie_snapshots' THEN
    PERFORM public.ledger_record(NEW.user_id, 'readiness', 'readiness.readiness_score', NEW.readiness_score, 'score', NULL, NULL, NEW.id::text, '{}'::jsonb, NULL, NULL, 'hie_snapshots', NEW.computed_at);
    PERFORM public.ledger_record(NEW.user_id, 'readiness', 'readiness.training_readiness_score', NEW.training_readiness_score, 'score', NULL, NULL, NEW.id::text, '{}'::jsonb, NULL, NULL, 'hie_snapshots', NEW.computed_at);
  END IF;
 EXCEPTION WHEN OTHERS THEN
  PERFORM public.ledger_log_failure(jsonb_build_object('user_id', NEW.user_id, 'source', TG_TABLE_NAME, 'source_row_id', NEW.id), 'trigger_failed', SQLERRM, 1);
 END;
 RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.ledger_from_videos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE f record; just_saved boolean;
BEGIN
  IF NEW.ai_analysis IS NULL OR NEW.temporary_until IS NOT NULL THEN RETURN NEW; END IF;
  just_saved := TG_OP = 'UPDATE' AND OLD.temporary_until IS NOT NULL;
  BEGIN
    FOR f IN SELECT key, value FROM jsonb_each(NEW.ai_analysis) WHERE key LIKE '%\_tiles\_deterministic' LOOP
      IF TG_OP = 'INSERT' OR just_saved OR OLD.ai_analysis IS NULL OR (OLD.ai_analysis->f.key) IS DISTINCT FROM f.value THEN
        PERFORM public.ledger_record_tiles(NEW.id, f.key, f.value);
      END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.ledger_log_failure(jsonb_build_object('user_id', NEW.user_id, 'source', 'videos', 'source_row_id', NEW.id), 'trigger_failed', SQLERRM, 1);
  END;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.ledger_backfill_athlete(_user uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_before bigint; v_after bigint; r record; t text; j jsonb; per jsonb := '{}'::jsonb; n int;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'owner'::app_role) THEN RAISE EXCEPTION 'owner only' USING ERRCODE = '42501'; END IF;
  IF NOT public.switch_on_for('ledger_unify_v1', _user) THEN RETURN jsonb_build_object('skipped', 'ledger_unify_v1 is off for this athlete'); END IF;
  SELECT count(*) INTO v_before FROM public.athlete_metric_observations WHERE user_id = _user;
  FOREACH t IN ARRAY ARRAY['vault_performance_tests', 'vault_focus_quizzes', 'wearable_metrics', 'cv_velocity_measurements', 'throwing_reps',
      'catching_reps', 'gp_at_bats', 'gp_pitches', 'defensive_plays', 'athlete_height_checks', 'weight_entries'] LOOP
    n := 0;
    FOR j IN EXECUTE format('SELECT to_jsonb(x) FROM public.%I x WHERE x.user_id = $1', t) USING _user LOOP
      n := n + public.ledger_mirror_row(t, j);
    END LOOP;
    per := per || jsonb_build_object(t, n);
  END LOOP;
  UPDATE public.athlete_metric_observations o SET canonical_key = a.canonical_key, canonical_unit = d.unit,
      canonical_value = public.metric_convert(o.value, COALESCE(NULLIF(o.unit, ''), a.alias_unit, d.unit), d.unit)
    FROM public.metric_aliases a JOIN public.measurement_definitions d ON d.metric_key = a.canonical_key
    WHERE o.user_id = _user AND o.canonical_key IS NULL AND a.alias_key = o.metric_key;
  UPDATE public.athlete_metric_observations o SET physics_ok = o.canonical_value BETWEEN d.physical_min AND d.physical_max
    FROM public.measurement_definitions d WHERE o.user_id = _user AND d.metric_key = o.canonical_key AND o.physics_ok IS NULL
      AND o.canonical_value IS NOT NULL AND d.physical_min IS NOT NULL AND d.physical_max IS NOT NULL;
  FOR r IN SELECT DISTINCT canonical_key, context_key FROM public.athlete_metric_observations WHERE user_id = _user AND canonical_key IS NOT NULL LOOP
    PERFORM public.ledger_baseline_update(_user, r.canonical_key, r.context_key);
  END LOOP;
  SELECT count(*) INTO v_after FROM public.athlete_metric_observations WHERE user_id = _user;
  RETURN jsonb_build_object('before', v_before, 'after', v_after, 'added', v_after - v_before, 'source_values_seen', per);
END $$;
REVOKE ALL ON FUNCTION public.ledger_backfill_athlete(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ledger_backfill_athlete(uuid) TO authenticated, service_role;

CREATE VIEW public.athlete_measurements WITH (security_invoker = true) AS
  SELECT o.id, o.user_id AS athlete_id, o.canonical_key AS metric_key, o.canonical_value AS value, o.canonical_unit AS unit,
    o.metric_key AS recorded_as, o.value AS recorded_value, o.unit AS recorded_unit, o.recorded_at AS captured_at,
    o.source, o.source_kind, o.source_row_id, o.session_id, o.rep_index, o.device_model, o.capture_fps, o.capture_conditions,
    o.capture_context, o.confidence, o.physics_ok, o.attested, o.platform, o.app_build, o.privacy_class, o.engine_version
  FROM public.athlete_metric_observations o
  WHERE o.canonical_key IS NOT NULL AND o.source <> 'validation_lab';
GRANT SELECT ON public.athlete_measurements TO authenticated;
GRANT SELECT ON public.athlete_measurements TO service_role;

-- ── 8. Validation Lab (owner-only) ──
CREATE TABLE public.validation_trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL REFERENCES public.measurement_definitions(metric_key),
  device_name text NOT NULL,
  device_value double precision,
  app_value double precision,
  measured_fps double precision,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected boolean NOT NULL,
  consistency_group text,
  app_build text NOT NULL,
  subject_user_id uuid,
  observation_id uuid,
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT validation_trials_fps_check CHECK (measured_fps IS NULL OR measured_fps > 0)
);
CREATE INDEX validation_trials_metric_build_idx ON public.validation_trials (metric_key, app_build, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.validation_trials TO authenticated;
GRANT ALL ON public.validation_trials TO service_role;
ALTER TABLE public.validation_trials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner only validation trials" ON public.validation_trials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));

CREATE TABLE public.validation_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL REFERENCES public.measurement_definitions(metric_key),
  app_build text NOT NULL,
  device_name text,
  gates jsonb NOT NULL,
  ready_to_open boolean NOT NULL,
  trial_count integer NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.validation_scorecards TO authenticated;
GRANT ALL ON public.validation_scorecards TO service_role;
ALTER TABLE public.validation_scorecards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner only scorecards" ON public.validation_scorecards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role));

CREATE OR REPLACE FUNCTION public.validation_trial_to_ledger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.app_value IS NOT NULL AND NEW.observation_id IS NULL THEN
    NEW.observation_id := public.ledger_save(jsonb_build_object('user_id', COALESCE(NEW.subject_user_id, NEW.created_by), 'source', 'validation_lab',
      'metric_key', NEW.metric_key, 'value', NEW.app_value, 'source_row_id', NEW.id::text, 'engine_version', 'validation_lab:' || NEW.app_build,
      'recorded_at', NEW.created_at, 'source_kind', 'manual', 'app_build', NEW.app_build, 'capture_fps', to_jsonb(NEW.measured_fps),
      'capture_conditions', NEW.conditions, 'capture_context', jsonb_build_object('device', NEW.device_name, 'detected', NEW.detected)));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validation_trial_to_ledger() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER validation_trial_to_ledger BEFORE INSERT ON public.validation_trials FOR EACH ROW EXECUTE FUNCTION public.validation_trial_to_ledger();

-- ── 9. App Attest (app_attest_v1) ──
CREATE TABLE public.app_attest_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key_id text NOT NULL UNIQUE,
  public_key_spki text NOT NULL,
  sign_count bigint NOT NULL DEFAULT 0,
  environment text NOT NULL CHECK (environment IN ('production', 'development')),
  app_build text,
  receipt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX app_attest_keys_user_idx ON public.app_attest_keys (user_id);
GRANT SELECT ON public.app_attest_keys TO authenticated;
GRANT ALL ON public.app_attest_keys TO service_role;
ALTER TABLE public.app_attest_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own attest keys" ON public.app_attest_keys FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.app_attest_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '5 minutes',
  used_at timestamptz
);
GRANT ALL ON public.app_attest_challenges TO service_role;
ALTER TABLE public.app_attest_challenges ENABLE ROW LEVEL SECURITY;

-- ── 10. Movement-data consent (movement_consent_v1, lawyer-approved text) ──
CREATE TABLE public.movement_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  version text NOT NULL,
  text_sha256 text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'pending_parent', 'declined', 'revoked')),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  parent_user_id uuid,
  parent_decided_at timestamptz,
  revoked_at timestamptz,
  platform text,
  app_build text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX movement_consents_user_idx ON public.movement_consents (user_id, created_at DESC);
GRANT SELECT ON public.movement_consents TO authenticated;
GRANT ALL ON public.movement_consents TO service_role;
ALTER TABLE public.movement_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own movement consent" ON public.movement_consents FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_authorizing_parent(auth.uid(), user_id) OR public.has_role(auth.uid(), 'owner'::app_role));

CREATE TABLE public.measurement_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid,
  details jsonb
);
GRANT SELECT ON public.measurement_deletion_requests TO authenticated;
GRANT ALL ON public.measurement_deletion_requests TO service_role;
ALTER TABLE public.measurement_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or owner deletion requests" ON public.measurement_deletion_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR requested_by = auth.uid() OR public.has_role(auth.uid(), 'owner'::app_role));

CREATE OR REPLACE FUNCTION public.movement_consent_state(_user uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT status FROM public.movement_consents WHERE user_id = _user ORDER BY created_at DESC, id DESC LIMIT 1), 'none')
$$;
REVOKE ALL ON FUNCTION public.movement_consent_state(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.movement_consent_state(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.movement_consent_status() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r public.movement_consents%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT * INTO r FROM public.movement_consents WHERE user_id = v_uid ORDER BY created_at DESC, id DESC LIMIT 1;
  RETURN jsonb_build_object('on', public.switch_on_for('movement_consent_v1', v_uid), 'status', COALESCE(r.status, 'none'),
    'version', r.version, 'accepted_at', r.accepted_at, 'minor', public.is_minor(v_uid),
    'deletion_pending', EXISTS (SELECT 1 FROM public.measurement_deletion_requests d WHERE d.user_id = v_uid AND d.status = 'pending'));
END $$;
REVOKE ALL ON FUNCTION public.movement_consent_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.movement_consent_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.movement_consent_agree(_version text, _text_sha256 text, _platform text, _app_build text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_status text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF NOT public.switch_on_for('movement_consent_v1', v_uid) THEN RAISE EXCEPTION 'movement consent is not on for this account'; END IF;
  IF _version IS NULL OR length(_text_sha256) <> 64 THEN RAISE EXCEPTION 'bad consent version'; END IF;
  v_status := CASE WHEN public.is_minor(v_uid) THEN 'pending_parent' ELSE 'active' END;
  INSERT INTO public.movement_consents (user_id, version, text_sha256, status, platform, app_build)
  VALUES (v_uid, _version, _text_sha256, v_status, CASE WHEN _platform IN ('ios', 'web') THEN _platform END, left(_app_build, 40));
  RETURN jsonb_build_object('status', v_status);
END $$;
REVOKE ALL ON FUNCTION public.movement_consent_agree(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.movement_consent_agree(text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.movement_consent_parent_decide(_athlete uuid, _approve boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r public.movement_consents%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF NOT public.is_authorizing_parent(v_uid, _athlete) THEN RAISE EXCEPTION 'not this player''s parent' USING ERRCODE = '42501'; END IF;
  SELECT * INTO r FROM public.movement_consents WHERE user_id = _athlete ORDER BY created_at DESC, id DESC LIMIT 1;
  IF r.id IS NULL OR r.status <> 'pending_parent' THEN RAISE EXCEPTION 'nothing waiting for a parent'; END IF;
  INSERT INTO public.movement_consents (user_id, version, text_sha256, status, parent_user_id, parent_decided_at, platform, app_build)
  VALUES (_athlete, r.version, r.text_sha256, CASE WHEN _approve THEN 'active' ELSE 'declined' END, v_uid, now(), r.platform, r.app_build);
  RETURN jsonb_build_object('status', CASE WHEN _approve THEN 'active' ELSE 'declined' END);
END $$;
REVOKE ALL ON FUNCTION public.movement_consent_parent_decide(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.movement_consent_parent_decide(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.movement_consent_revoke(_athlete uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_target uuid := COALESCE(_athlete, auth.uid()); r public.movement_consents%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF v_target <> v_uid AND NOT public.is_authorizing_parent(v_uid, v_target) THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
  SELECT * INTO r FROM public.movement_consents WHERE user_id = v_target ORDER BY created_at DESC, id DESC LIMIT 1;
  IF r.id IS NULL OR r.status = 'revoked' THEN RETURN jsonb_build_object('status', COALESCE(r.status, 'none')); END IF;
  INSERT INTO public.movement_consents (user_id, version, text_sha256, status, revoked_at, parent_user_id)
  VALUES (v_target, r.version, r.text_sha256, 'revoked', now(), CASE WHEN v_target <> v_uid THEN v_uid END);
  RETURN jsonb_build_object('status', 'revoked');
END $$;
REVOKE ALL ON FUNCTION public.movement_consent_revoke(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.movement_consent_revoke(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_measurement_deletion(_athlete uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_target uuid := COALESCE(_athlete, auth.uid()); v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF v_target <> v_uid AND NOT public.is_authorizing_parent(v_uid, v_target) THEN RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501'; END IF;
  SELECT id INTO v_id FROM public.measurement_deletion_requests WHERE user_id = v_target AND status = 'pending' LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.measurement_deletion_requests (user_id, requested_by) VALUES (v_target, v_uid) RETURNING id INTO v_id;
  END IF;
  RETURN jsonb_build_object('request_id', v_id, 'status', 'pending');
END $$;
REVOKE ALL ON FUNCTION public.request_measurement_deletion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_measurement_deletion(uuid) TO authenticated;

-- ── 11. Release A follow-ups: scout applications push to owners; untouched push setting ──
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS push_set_at timestamptz;
COMMENT ON COLUMN public.notification_preferences.push_set_at IS 'When the person last chose the Push switch themselves. NULL = never touched: push follows the phone permission (owner Nov 8).';

CREATE OR REPLACE FUNCTION public.push_enqueue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.wk_feature_switches WHERE feature_key = 'native_push_v1' AND mode IN ('self', 'pilot', 'all')) THEN
      RETURN NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.push_device_tokens WHERE disabled_at IS NULL) THEN
      RETURN NULL;
    END IF;
    IF TG_TABLE_NAME IN ('connection_requests', 'addon_parent_requests', 'scout_applications') AND NEW.status IS DISTINCT FROM 'pending' THEN
      RETURN NULL;
    END IF;
    INSERT INTO public.push_outbox (source_table, source_id)
    VALUES (TG_TABLE_NAME, NEW.id)
    ON CONFLICT (source_table, source_id) DO NOTHING
    RETURNING id INTO v_id;
    IF v_id IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://wysikbsjalfvjwqzkihj.supabase.co/functions/v1/send-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5c2lrYnNqYWxmdmp3cXpraWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5OTYyNjAsImV4cCI6MjA3NjU3MjI2MH0.TzgAEk17xlK_qAC4uRHFJTd9SoG5jRNInCUBIuEgA7A'
        ),
        body := jsonb_build_object('outbox_id', v_id),
        timeout_milliseconds := 15000
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'push_enqueue skipped for %: %', TG_TABLE_NAME, SQLERRM;
  END;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.push_enqueue() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER push_enqueue_scout_applications AFTER INSERT ON public.scout_applications FOR EACH ROW EXECUTE FUNCTION public.push_enqueue();
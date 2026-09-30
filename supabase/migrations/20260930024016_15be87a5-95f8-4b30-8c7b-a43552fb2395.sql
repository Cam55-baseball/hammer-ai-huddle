
ALTER TABLE public.athlete_metric_observations
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS session_id uuid,
  ADD COLUMN IF NOT EXISTS source_row_id text,
  ADD COLUMN IF NOT EXISTS capture_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS context_key text NOT NULL DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS confidence double precision,
  ADD COLUMN IF NOT EXISTS noise_floor double precision;
CREATE UNIQUE INDEX IF NOT EXISTS amo_source_row_uniq
  ON public.athlete_metric_observations(user_id, source, source_row_id, metric_key, engine_version)
  WHERE source_row_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS amo_user_key_ctx_idx
  ON public.athlete_metric_observations(user_id, metric_key, context_key, recorded_at);

CREATE TABLE public.measurement_definitions (
  metric_key text PRIMARY KEY,
  unit text,
  noise_floor double precision,
  policy text NOT NULL DEFAULT 'baseline' CHECK (policy IN ('baseline','population','both','neither')),
  min_confidence double precision NOT NULL DEFAULT 0.5,
  athlete_label text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.measurement_definitions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.measurement_definitions TO authenticated;
GRANT ALL ON public.measurement_definitions TO service_role;
ALTER TABLE public.measurement_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read definitions" ON public.measurement_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner manages definitions" ON public.measurement_definitions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'owner')) WITH CHECK (public.has_role(auth.uid(),'owner'));

CREATE TABLE public.athlete_baseline_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  metric_key text NOT NULL,
  context_key text NOT NULL,
  observation_id uuid NOT NULL REFERENCES public.athlete_metric_observations(id) ON DELETE CASCADE,
  n_used integer NOT NULL,
  median double precision,
  q1 double precision,
  q3 double precision,
  robust_sd double precision,
  band_lo double precision,
  band_hi double precision,
  noise_floor double precision,
  status text NOT NULL,
  trend text,
  version text NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX abh_user_key_idx ON public.athlete_baseline_history(user_id, metric_key, context_key, computed_at);
GRANT SELECT ON public.athlete_baseline_history TO authenticated;
GRANT ALL ON public.athlete_baseline_history TO service_role;
ALTER TABLE public.athlete_baseline_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own baseline history" ON public.athlete_baseline_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_coach_of(auth.uid(), user_id) OR public.has_role(auth.uid(),'owner'));

CREATE TABLE public.athlete_baseline_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  metric_key text NOT NULL,
  context_key text NOT NULL,
  observation_id uuid NOT NULL REFERENCES public.athlete_metric_observations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('outlier','drift')),
  direction text NOT NULL CHECK (direction IN ('below','above')),
  version text NOT NULL,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (observation_id, kind)
);
CREATE INDEX aba_user_idx ON public.athlete_baseline_alerts(user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.athlete_baseline_alerts TO authenticated;
GRANT ALL ON public.athlete_baseline_alerts TO service_role;
ALTER TABLE public.athlete_baseline_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own or coached alerts" ON public.athlete_baseline_alerts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_coach_of(auth.uid(), user_id) OR public.has_role(auth.uid(),'owner'));
CREATE POLICY "Athlete dismisses own alerts" ON public.athlete_baseline_alerts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_measurement_definitions_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER measurement_definitions_updated_at BEFORE UPDATE ON public.measurement_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_measurement_definitions_updated_at();

-- ── Baseline engine (mirrors src/lib/biomech/baseline/athleteBaseline.ts) ──
-- median + IQR (robust SD = IQR/1.349), >= 8 in-context observations, last 20,
-- band = median ± 1 robust SD, strong = ± 2, band never narrower than the noise floor.
CREATE OR REPLACE FUNCTION public.baseline_recompute(p_obs uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO d FROM public.measurement_definitions WHERE metric_key = o.metric_key;
  v_min_conf := COALESCE(d.min_confidence, 0.5);

  -- prior in-context history, newest 20, confident only, never the current clip
  SELECT array_agg(value ORDER BY recorded_at, source_row_id, id) INTO v_vals FROM (
    SELECT value, recorded_at, source_row_id, id FROM public.athlete_metric_observations
    WHERE user_id = o.user_id AND metric_key = o.metric_key AND context_key = o.context_key
      AND id <> o.id AND (recorded_at, id) < (o.recorded_at, o.id)
      AND (confidence IS NULL OR confidence >= v_min_conf)
    ORDER BY recorded_at DESC, source_row_id DESC, id DESC LIMIT 20) h;
  v_n := COALESCE(array_length(v_vals,1),0);

  SELECT GREATEST(COALESCE(d.noise_floor,0), COALESCE(MAX(noise_floor),0)) INTO v_floor
  FROM public.athlete_metric_observations
  WHERE user_id = o.user_id AND metric_key = o.metric_key AND context_key = o.context_key;

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
END; $$;

-- ── The one writer. Every source goes through here. ──
CREATE OR REPLACE FUNCTION public.ledger_record(
  p_user uuid, p_source text, p_key text, p_value double precision, p_unit text,
  p_video uuid, p_session uuid, p_source_row text, p_ctx jsonb, p_conf double precision,
  p_floor double precision, p_engine text, p_at timestamptz
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_ctx jsonb := COALESCE(p_ctx,'{}'::jsonb); v_ckey text;
BEGIN
  IF p_user IS NULL OR p_key IS NULL OR p_value IS NULL OR p_value = 'NaN'::double precision
     OR p_value IN ('Infinity'::double precision,'-Infinity'::double precision) THEN RETURN NULL; END IF;
  -- Material capture context: camera view + side. Frame rate is recorded, not keyed.
  v_ckey := COALESCE(v_ctx->>'view','any') || '|' || COALESCE(v_ctx->>'side','any');
  INSERT INTO public.athlete_metric_observations(user_id, video_id, source, metric_key, value, engine_version, recorded_at,
    unit, session_id, source_row_id, capture_context, context_key, confidence, noise_floor)
  VALUES (p_user, p_video, p_source, p_key, p_value, COALESCE(p_engine,'unknown'), COALESCE(p_at, now()),
    p_unit, p_session, p_source_row, v_ctx, v_ckey, p_conf, p_floor)
  ON CONFLICT (user_id, source, source_row_id, metric_key, engine_version) WHERE source_row_id IS NOT NULL
  DO UPDATE SET value = EXCLUDED.value, unit = EXCLUDED.unit, capture_context = EXCLUDED.capture_context,
    context_key = EXCLUDED.context_key, confidence = EXCLUDED.confidence, noise_floor = EXCLUDED.noise_floor,
    recorded_at = EXCLUDED.recorded_at
  WHERE public.athlete_metric_observations.value IS DISTINCT FROM EXCLUDED.value
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN PERFORM public.baseline_recompute(v_id); END IF;
  RETURN v_id;
END; $$;

-- Generic tile walker: any ai_analysis field named *_tiles_deterministic joins the ledger
-- with no extra work. A tile = {value:number, missingness/missing_reason null} or {values:{k:number}}.
CREATE OR REPLACE FUNCTION public.ledger_record_tiles(p_video uuid, p_field text, p_tiles jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v record; t record; vv record; n int := 0; v_root jsonb; v_tile jsonb; v_key text; v_view text; v_side text; v_ctx jsonb;
  v_conf double precision; v_engine text; v_prefix text;
BEGIN
  SELECT id, user_id, module, sport, batting_side, throwing_hand, capture_fps_tier, fps_true, session_date, created_at, ai_analysis
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
    v_ctx := jsonb_build_object('view', v_view, 'side', v_side, 'fps_tier', v.capture_fps_tier, 'fps', v.fps_true, 'module', v.module, 'sport', v.sport);
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
END; $$;

-- ── Source triggers ──
CREATE OR REPLACE FUNCTION public.ledger_from_videos() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f record;
BEGIN
  IF NEW.ai_analysis IS NULL THEN RETURN NEW; END IF;
  FOR f IN SELECT key, value FROM jsonb_each(NEW.ai_analysis) WHERE key LIKE '%\_tiles\_deterministic' LOOP
    IF TG_OP = 'INSERT' OR OLD.ai_analysis IS NULL OR (OLD.ai_analysis->f.key) IS DISTINCT FROM f.value THEN
      PERFORM public.ledger_record_tiles(NEW.id, f.key, f.value);
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;
CREATE TRIGGER ledger_videos AFTER INSERT OR UPDATE OF ai_analysis ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.ledger_from_videos();

CREATE OR REPLACE FUNCTION public.ledger_from_sources() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k record;
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
  RETURN NEW;
END; $$;

CREATE TRIGGER ledger_combine AFTER INSERT OR UPDATE ON public.combine_results FOR EACH ROW EXECUTE FUNCTION public.ledger_from_sources();
CREATE TRIGGER ledger_baserunning AFTER INSERT OR UPDATE ON public.baserunning_splits FOR EACH ROW EXECUTE FUNCTION public.ledger_from_sources();
CREATE TRIGGER ledger_sprint AFTER INSERT OR UPDATE ON public.sprint_analyses FOR EACH ROW EXECUTE FUNCTION public.ledger_from_sources();
CREATE TRIGGER ledger_delaycam AFTER INSERT OR UPDATE ON public.delaycam_reps FOR EACH ROW EXECUTE FUNCTION public.ledger_from_sources();
CREATE TRIGGER ledger_lifting AFTER INSERT OR UPDATE ON public.block_workout_metrics FOR EACH ROW EXECUTE FUNCTION public.ledger_from_sources();
CREATE TRIGGER ledger_workload AFTER INSERT OR UPDATE ON public.athlete_load_tracking FOR EACH ROW EXECUTE FUNCTION public.ledger_from_sources();
CREATE TRIGGER ledger_dailylog AFTER INSERT OR UPDATE ON public.athlete_daily_log FOR EACH ROW EXECUTE FUNCTION public.ledger_from_sources();
CREATE TRIGGER ledger_readiness AFTER INSERT OR UPDATE ON public.hie_snapshots FOR EACH ROW EXECUTE FUNCTION public.ledger_from_sources();

REVOKE ALL ON FUNCTION public.ledger_record(uuid,text,text,double precision,text,uuid,uuid,text,jsonb,double precision,double precision,text,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_record_tiles(uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.baseline_recompute(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ledger_record(uuid,text,text,double precision,text,uuid,uuid,text,jsonb,double precision,double precision,text,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.ledger_record_tiles(uuid,text,jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.ledger_from_videos() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_from_sources() FROM PUBLIC, anon, authenticated;

-- Direct client inserts would bypass the one writer.
DROP POLICY IF EXISTS "Athletes insert own observations" ON public.athlete_metric_observations;
REVOKE INSERT, UPDATE, DELETE ON public.athlete_metric_observations FROM authenticated, anon;

-- Correlation pairs: same athlete, same clip, or same day when either side has no clip.
CREATE VIEW public.athlete_metric_pairs WITH (security_invoker = on) AS
SELECT a.user_id, a.metric_key AS key_a, b.metric_key AS key_b, a.value AS value_a, b.value AS value_b,
  CASE WHEN a.video_id IS NOT NULL AND a.video_id = b.video_id THEN 'clip' ELSE 'day' END AS pairing,
  (a.recorded_at AT TIME ZONE 'UTC')::date AS day, a.id AS obs_a, b.id AS obs_b, a.context_key AS context_a, b.context_key AS context_b
FROM public.athlete_metric_observations a
JOIN public.athlete_metric_observations b
  ON a.user_id = b.user_id AND a.metric_key < b.metric_key
 AND ((a.video_id IS NOT NULL AND a.video_id = b.video_id)
   OR ((a.video_id IS NULL OR b.video_id IS NULL) AND (a.recorded_at AT TIME ZONE 'UTC')::date = (b.recorded_at AT TIME ZONE 'UTC')::date));
GRANT SELECT ON public.athlete_metric_pairs TO authenticated;

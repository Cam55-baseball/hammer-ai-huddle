-- Release A2 (owner-approved Nov 8): optional "How mentally draining was it?" rating after non-exercise cards.
-- Stored on the activity row and, when minutes are known, in the measurement ledger (metric mental_load, source manual).
ALTER TABLE public.mind_item_logs
  ADD COLUMN IF NOT EXISTS mental_drain_rating smallint,
  ADD COLUMN IF NOT EXISTS mental_minutes numeric,
  ADD COLUMN IF NOT EXISTS mental_minutes_source text,
  ADD COLUMN IF NOT EXISTS mental_load numeric,
  ADD COLUMN IF NOT EXISTS mental_rated_at timestamptz;
ALTER TABLE public.royal_timing_sessions
  ADD COLUMN IF NOT EXISTS mental_drain_rating smallint,
  ADD COLUMN IF NOT EXISTS mental_minutes numeric,
  ADD COLUMN IF NOT EXISTS mental_minutes_source text,
  ADD COLUMN IF NOT EXISTS mental_load numeric,
  ADD COLUMN IF NOT EXISTS mental_rated_at timestamptz;
ALTER TABLE public.baserunning_daily_attempts
  ADD COLUMN IF NOT EXISTS mental_drain_rating smallint,
  ADD COLUMN IF NOT EXISTS mental_minutes numeric,
  ADD COLUMN IF NOT EXISTS mental_minutes_source text,
  ADD COLUMN IF NOT EXISTS mental_load numeric,
  ADD COLUMN IF NOT EXISTS mental_rated_at timestamptz;

COMMENT ON COLUMN public.mind_item_logs.mental_load IS 'Rating (1-10) x minutes (tracked, else owner-prescribed). NULL = unknown (skipped or minutes unknown); never guessed.';

CREATE OR REPLACE FUNCTION public.record_mental_load(
  _activity text, _activity_id uuid, _rating integer, _minutes numeric, _minutes_source text, _activity_date date
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_on boolean;
  v_found boolean := false;
  v_minutes numeric := NULL;
  v_source text := NULL;
  v_load numeric := NULL;
  v_ledger uuid := NULL;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  SELECT (s.mode = 'all' OR (s.mode = 'pilot' AND v_uid = ANY(COALESCE(s.allowlist, '{}'::uuid[]))) OR (s.mode = 'self' AND s.updated_by = v_uid))
    INTO v_on FROM public.wk_feature_switches s WHERE s.feature_key = 'mental_load_v1';
  IF NOT COALESCE(v_on, false) THEN RAISE EXCEPTION 'mental load is not on for this account'; END IF;
  IF _rating IS NULL OR _rating < 1 OR _rating > 10 THEN RAISE EXCEPTION 'rating must be 1 to 10'; END IF;
  IF _activity_date IS NULL THEN RAISE EXCEPTION 'activity date required'; END IF;
  IF _minutes IS NOT NULL AND _minutes > 0 AND _minutes <= 600 AND _minutes_source IN ('tracked', 'prescribed') THEN
    v_minutes := round(_minutes, 2); v_source := _minutes_source; v_load := round(_rating * v_minutes, 2);
  END IF;

  IF _activity = 'mind_item' THEN
    UPDATE public.mind_item_logs SET mental_drain_rating = _rating, mental_minutes = v_minutes, mental_minutes_source = v_source,
      mental_load = v_load, mental_rated_at = now() WHERE id = _activity_id AND user_id = v_uid;
    v_found := FOUND;
  ELSIF _activity = 'royal_timing' THEN
    UPDATE public.royal_timing_sessions SET mental_drain_rating = _rating, mental_minutes = v_minutes, mental_minutes_source = v_source,
      mental_load = v_load, mental_rated_at = now() WHERE id = _activity_id AND user_id = v_uid;
    v_found := FOUND;
  ELSIF _activity = 'baserunning_iq' THEN
    UPDATE public.baserunning_daily_attempts SET mental_drain_rating = _rating, mental_minutes = v_minutes, mental_minutes_source = v_source,
      mental_load = v_load, mental_rated_at = now() WHERE id = _activity_id AND user_id = v_uid;
    v_found := FOUND;
  ELSE
    RAISE EXCEPTION 'unknown activity';
  END IF;
  IF NOT v_found THEN RAISE EXCEPTION 'activity not found'; END IF;

  IF v_load IS NOT NULL THEN
    v_ledger := public.ledger_record(v_uid, 'manual', 'mental_load', v_load::double precision, 'rating_x_minutes', NULL, NULL,
      'mental_load:' || _activity || ':' || _activity_id::text,
      jsonb_build_object('activity', _activity, 'activity_date', _activity_date, 'rating', _rating, 'minutes', v_minutes, 'minutes_source', v_source),
      NULL, NULL, 'mental_load_v1', now());
    IF v_ledger IS NULL THEN
      -- The value is unchanged or the ledger write failed: say so instead of pretending it saved.
      IF NOT EXISTS (SELECT 1 FROM public.athlete_metric_observations WHERE user_id = v_uid AND source = 'manual'
          AND metric_key = 'mental_load' AND source_row_id = 'mental_load:' || _activity || ':' || _activity_id::text AND value = v_load) THEN
        RETURN jsonb_build_object('saved', true, 'mental_load', v_load, 'ledger', 'failed');
      END IF;
    END IF;
  END IF;
  RETURN jsonb_build_object('saved', true, 'mental_load', v_load, 'ledger', CASE WHEN v_load IS NULL THEN 'unknown_minutes' ELSE 'saved' END);
END $$;
REVOKE ALL ON FUNCTION public.record_mental_load(text, uuid, integer, numeric, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_mental_load(text, uuid, integer, numeric, text, date) TO authenticated;
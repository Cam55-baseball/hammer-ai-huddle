CREATE OR REPLACE FUNCTION public.coach_athlete_trends(_athlete uuid)
RETURNS TABLE(
  metric_key text,
  unit text,
  n_used integer,
  baseline_median double precision,
  band_lo double precision,
  band_hi double precision,
  trend text,
  computed_at timestamptz,
  recent jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.coach_athlete_trends(uuid) TO authenticated;
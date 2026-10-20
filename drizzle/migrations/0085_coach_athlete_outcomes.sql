CREATE OR REPLACE FUNCTION public.coach_athlete_outcomes(_athlete uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _viewer uuid := auth.uid();
  _health boolean;
BEGIN
  IF _viewer IS NULL THEN
    RETURN jsonb_build_object('state', 'denied');
  END IF;
  IF _viewer <> _athlete AND NOT public.is_coach_of(_viewer, _athlete) THEN
    RETURN jsonb_build_object('state', 'denied');
  END IF;

  _health := _viewer = _athlete OR public.resolve_recruiting_scope(_athlete, 'health');

  RETURN jsonb_build_object(
    'state', 'ok',
    'outcomes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'area', r.area,
               'do_this', r.do_this,
               'baseline_value', r.baseline_value,
               'recheck_value', r.recheck_value,
               'followed_at', r.followed_at,
               'checked_at', r.checked_at,
               'created_at', r.created_at
             ) ORDER BY r.checked_at DESC NULLS LAST)
      FROM (
        SELECT r.*
        FROM public.intelligence_recommendations r
        WHERE r.user_id = _athlete
          AND r.followed = true
          AND r.outcome IS NOT NULL
          AND (_health OR NOT public._plan_line_is_health(COALESCE(r.do_this, '')))
        ORDER BY r.checked_at DESC NULLS LAST
        LIMIT 6
      ) AS r
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.coach_athlete_outcomes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_athlete_outcomes(uuid) TO authenticated;
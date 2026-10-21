CREATE OR REPLACE FUNCTION public.coach_athlete_plan(_athlete uuid, _date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _viewer uuid := auth.uid();
  _row public.athlete_plan_snapshots%ROWTYPE;
  _health boolean;
  _blocks jsonb;
BEGIN
  IF NOT public._coach_training_access(_athlete) THEN
    RETURN jsonb_build_object('state', 'denied');
  END IF;

  SELECT s.* INTO _row
  FROM public.athlete_plan_snapshots s
  JOIN public.athlete_context c ON c.user_id = s.user_id AND c.sport_primary = s.sport
  WHERE s.user_id = _athlete AND s.plan_date = _date
  ORDER BY s.updated_at DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('state', 'unavailable');
  END IF;

  _health := _viewer = _athlete OR public.resolve_recruiting_scope(_athlete, 'health');

  IF _health THEN
    _blocks := COALESCE(_row.payload->'blocks', '[]'::jsonb);
  ELSE
    SELECT COALESCE(jsonb_agg(b), '[]'::jsonb) INTO _blocks
    FROM (
      SELECT jsonb_set(
               b,
               '{because}',
               COALESCE(
                 (SELECT jsonb_agg(x)
                  FROM jsonb_array_elements_text(COALESCE(b->'because', '[]'::jsonb)) AS x
                  WHERE NOT public._plan_line_is_health(x)),
                 '[]'::jsonb),
               true
             ) || jsonb_build_object(
               'roadmapReason',
               CASE WHEN public._plan_line_is_health(COALESCE(b->>'roadmapReason', ''))
                    THEN '' ELSE COALESCE(b->>'roadmapReason', '') END
             ) AS b
      FROM jsonb_array_elements(COALESCE(_row.payload->'blocks', '[]'::jsonb)) AS b
    ) AS sub;
  END IF;

  RETURN jsonb_build_object(
    'state', 'ok',
    'sport', _row.sport,
    'plan_date', _row.plan_date,
    'engine_version', _row.engine_version,
    'updated_at', _row.updated_at,
    'health_shared', _health,
    'blocks', _blocks
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.coach_athlete_plan(uuid,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_athlete_plan(uuid,date) TO authenticated;
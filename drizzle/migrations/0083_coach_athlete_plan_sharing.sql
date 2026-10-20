CREATE TABLE public.athlete_plan_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  sport text NOT NULL,
  engine_version text,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date, sport)
);

GRANT SELECT, INSERT, UPDATE ON public.athlete_plan_snapshots TO authenticated;
GRANT ALL ON public.athlete_plan_snapshots TO service_role;

ALTER TABLE public.athlete_plan_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes read their own plan snapshots"
  ON public.athlete_plan_snapshots FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Athletes save their own plan snapshots"
  ON public.athlete_plan_snapshots FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Athletes update their own plan snapshots"
  ON public.athlete_plan_snapshots FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public._plan_line_is_health(_t text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(_t, '') ~* 'pain|sore|readiness|sleep|slept|check-?in|injur|fatigue|tired|mood|stress|energy|hurt';
$$;

CREATE OR REPLACE FUNCTION public.coach_athlete_plan(_athlete uuid, _date date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _viewer uuid := auth.uid();
  _row public.athlete_plan_snapshots%ROWTYPE;
  _health boolean;
  _blocks jsonb;
BEGIN
  IF _viewer IS NULL THEN
    RETURN jsonb_build_object('state', 'denied');
  END IF;
  IF _viewer <> _athlete AND NOT public.is_coach_of(_viewer, _athlete) THEN
    RETURN jsonb_build_object('state', 'denied');
  END IF;

  SELECT * INTO _row
  FROM public.athlete_plan_snapshots
  WHERE user_id = _athlete AND plan_date = _date
  ORDER BY updated_at DESC
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
$$;

REVOKE ALL ON FUNCTION public.coach_athlete_plan(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_athlete_plan(uuid, date) TO authenticated;
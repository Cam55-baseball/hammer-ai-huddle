-- 1. Plan "Because" lines about pain, soreness and injury progress: shown to connected staff.
CREATE OR REPLACE FUNCTION public.coach_athlete_plan(_athlete uuid, _date date)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
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
  _health := _viewer = _athlete OR public._coach_checkin_access(_athlete);
  IF _health THEN
    _blocks := COALESCE(_row.payload->'blocks', '[]'::jsonb);
  ELSE
    SELECT COALESCE(jsonb_agg(b), '[]'::jsonb) INTO _blocks
    FROM (
      SELECT jsonb_set(b, '{because}',
               COALESCE((SELECT jsonb_agg(x) FROM jsonb_array_elements_text(COALESCE(b->'because', '[]'::jsonb)) AS x
                         WHERE NOT public._plan_line_is_health(x)), '[]'::jsonb), true)
             || jsonb_build_object('roadmapReason',
               CASE WHEN public._plan_line_is_health(COALESCE(b->>'roadmapReason', '')) THEN '' ELSE COALESCE(b->>'roadmapReason', '') END) AS b
      FROM jsonb_array_elements(COALESCE(_row.payload->'blocks', '[]'::jsonb)) AS b
    ) AS sub;
  END IF;
  RETURN jsonb_build_object('state', 'ok', 'sport', _row.sport, 'plan_date', _row.plan_date,
    'engine_version', _row.engine_version, 'updated_at', _row.updated_at, 'health_shared', _health, 'blocks', _blocks);
END;
$function$;

-- 2. Readiness, recovery, pain and soreness in the days after a start: shown to connected staff.
CREATE OR REPLACE FUNCTION public.bullpen_before_start_followups(_athlete uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _health boolean;
BEGIN
  IF NOT public._coach_training_access(_athlete) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  _health := auth.uid() = _athlete OR public._coach_checkin_access(_athlete);
  RETURN jsonb_build_object(
    'health_shared', _health,
    'tracked', coalesce((SELECT jsonb_agg(public._start_followup(_athlete, e.start_date, _health) || jsonb_build_object('bullpen_date', e.bullpen_date) ORDER BY e.start_date DESC)
      FROM public.pitching_tracked_events e WHERE e.user_id=_athlete AND e.event_type='bullpen_before_start'), '[]'::jsonb),
    'other_starts', coalesce((SELECT jsonb_agg(public._start_followup(_athlete, o.actual_date, _health) ORDER BY o.actual_date DESC)
      FROM (SELECT DISTINCT o.actual_date FROM public.pitcher_outings o WHERE o.user_id=_athlete AND o.outing_type='start' AND o.status='thrown'
              AND o.actual_date <= current_date
              AND NOT EXISTS (SELECT 1 FROM public.pitching_tracked_events e WHERE e.user_id=_athlete AND e.start_date=o.actual_date)) o), '[]'::jsonb)
  );
END $function$;

-- 3. Training load (throws and pitches): organization staff included, same as check-ins.
CREATE OR REPLACE FUNCTION public.coach_athlete_load(_athlete uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _from date := (current_date - 6);
  _arm jsonb;
  _pitches jsonb;
  _games jsonb;
BEGIN
  IF NOT (auth.uid() = _athlete OR public.is_coach_of(auth.uid(), _athlete) OR public.is_linked_coach(auth.uid(), _athlete)
          OR public._coach_checkin_access(_athlete)) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('entry_date', e.entry_date, 'throw_type', e.throw_type, 'count', e.count, 'status', e.status)
      ORDER BY e.entry_date DESC, e.throw_type), '[]'::jsonb)
  INTO _arm FROM public.arm_ledger_entries e WHERE e.user_id = _athlete AND e.entry_date >= _from;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('plan_date', d.plan_date, 'pitches', d.pitches) ORDER BY d.plan_date DESC), '[]'::jsonb)
  INTO _pitches
  FROM (
    SELECT l.plan_date,
           SUM(COALESCE((SELECT SUM(NULLIF(r->>'pitches', '')::numeric)
                         FROM jsonb_array_elements(COALESCE(l.metrics->'rounds', '[]'::jsonb)) r), 0))::int AS pitches
    FROM public.wk_session_logs l
    WHERE l.user_id = _athlete AND l.plan_date >= _from AND l.movement_slug IN ('bullpen_pitching', 'pitching_outing')
    GROUP BY l.plan_date
  ) d WHERE d.pitches > 0;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('game_date', d.game_date, 'pitches', d.pitches) ORDER BY d.game_date DESC), '[]'::jsonb)
  INTO _games
  FROM (
    SELECT g.game_date, COUNT(p.id)::int AS pitches
    FROM public.gp_games g JOIN public.gp_pitches p ON p.game_id = g.id AND p.perspective = 'pitcher'
    WHERE g.user_id = _athlete AND g.deleted_at IS NULL AND g.game_date >= _from
    GROUP BY g.game_date
  ) d;
  RETURN jsonb_build_object('arm_entries', _arm, 'pitch_logs', _pitches, 'game_pitches', _games, 'from', _from);
END;
$function$;
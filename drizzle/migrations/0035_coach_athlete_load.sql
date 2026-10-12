CREATE OR REPLACE FUNCTION public.coach_athlete_load(_athlete uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _from date := (current_date - 6);
  _arm jsonb;
  _pitches jsonb;
  _games jsonb;
BEGIN
  IF NOT (auth.uid() = _athlete OR public.is_coach_of(auth.uid(), _athlete) OR public.is_linked_coach(auth.uid(), _athlete)) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'entry_date', e.entry_date, 'throw_type', e.throw_type, 'count', e.count, 'status', e.status)
      ORDER BY e.entry_date DESC, e.throw_type), '[]'::jsonb)
  INTO _arm
  FROM public.arm_ledger_entries e
  WHERE e.user_id = _athlete AND e.entry_date >= _from;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('plan_date', d.plan_date, 'pitches', d.pitches)
      ORDER BY d.plan_date DESC), '[]'::jsonb)
  INTO _pitches
  FROM (
    SELECT l.plan_date,
           SUM(COALESCE((SELECT SUM(NULLIF(r->>'pitches', '')::numeric)
                         FROM jsonb_array_elements(COALESCE(l.metrics->'rounds', '[]'::jsonb)) r), 0))::int AS pitches
    FROM public.wk_session_logs l
    WHERE l.user_id = _athlete
      AND l.plan_date >= _from
      AND l.template_id IN ('bullpen_pitching', 'pitching_outing')
    GROUP BY l.plan_date
  ) d
  WHERE d.pitches > 0;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('game_date', d.game_date, 'pitches', d.pitches)
      ORDER BY d.game_date DESC), '[]'::jsonb)
  INTO _games
  FROM (
    SELECT g.game_date, COUNT(p.id)::int AS pitches
    FROM public.gp_games g
    JOIN public.gp_pitches p ON p.game_id = g.id AND p.perspective = 'pitcher'
    WHERE g.user_id = _athlete AND g.deleted_at IS NULL AND g.game_date >= _from
    GROUP BY g.game_date
  ) d;

  RETURN jsonb_build_object('arm_entries', _arm, 'pitch_logs', _pitches, 'game_pitches', _games, 'from', _from);
END;
$$;

GRANT EXECUTE ON FUNCTION public.coach_athlete_load(uuid) TO authenticated;
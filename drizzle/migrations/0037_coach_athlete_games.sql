CREATE OR REPLACE FUNCTION public.coach_athlete_games(_athlete uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _games jsonb;
BEGIN
  IF NOT (auth.uid() = _athlete OR public.is_coach_of(auth.uid(), _athlete) OR public.is_linked_coach(auth.uid(), _athlete)) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'game_date' DESC), '[]'::jsonb) INTO _games FROM (
    SELECT jsonb_build_object(
      'game_id', g.id, 'game_date', g.game_date, 'opponent', g.opponent_team,
      'my_score', g.my_score, 'opp_score', g.opp_score,
      'results', COALESCE((SELECT jsonb_agg(a.result) FROM public.gp_at_bats a WHERE a.game_id = g.id AND a.result IS NOT NULL), '[]'::jsonb),
      'rbi', COALESCE((SELECT SUM(a.rbi) FROM public.gp_at_bats a WHERE a.game_id = g.id), 0),
      'pitches', (SELECT COUNT(*) FROM public.gp_pitches p WHERE p.game_id = g.id AND p.perspective = 'pitcher')
    ) AS x
    FROM public.gp_games g
    WHERE g.user_id = _athlete AND g.deleted_at IS NULL
    ORDER BY g.game_date DESC LIMIT 10
  ) s;
  RETURN jsonb_build_object('games', _games);
END;
$$;
REVOKE ALL ON FUNCTION public.coach_athlete_games(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_athlete_games(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.scout_can_view_scope(_viewer uuid, _athlete uuid, _scope text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _viewer IS NOT NULL AND _athlete IS NOT NULL AND _viewer <> _athlete
    AND (public.user_has_role(_viewer, 'scout'::app_role) OR public.user_has_role(_viewer, 'recruiter'::app_role))
    AND EXISTS (SELECT 1 FROM public.scout_follows sf
                WHERE sf.scout_id = _viewer AND sf.player_id = _athlete AND sf.status = 'accepted')
    AND NOT EXISTS (SELECT 1 FROM public.user_blocks b
                    WHERE (b.blocker_id = _viewer AND b.blocked_id = _athlete)
                       OR (b.blocker_id = _athlete AND b.blocked_id = _viewer))
    AND public.resolve_recruiting_scope(_athlete, _scope);
$$;
REVOKE ALL ON FUNCTION public.scout_can_view_scope(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.scout_can_view_scope(uuid, uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.scout_athlete_game_play(_athlete uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _games jsonb; _pitches jsonb; _spray jsonb;
BEGIN
  IF NOT public.scout_can_view_scope(auth.uid(), _athlete, 'metrics') THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'game_date' DESC), '[]'::jsonb) INTO _games FROM (
    SELECT jsonb_build_object(
      'game_id', g.id, 'game_date', g.game_date, 'opponent', g.opponent_team,
      'my_score', g.my_score, 'opp_score', g.opp_score,
      'verified_at', g.verified_at, 'verified_role', g.verified_role,
      'results', COALESCE((SELECT jsonb_agg(a.result) FROM public.gp_at_bats a WHERE a.game_id = g.id AND a.result IS NOT NULL), '[]'::jsonb),
      'rbi', COALESCE((SELECT SUM(a.rbi) FROM public.gp_at_bats a WHERE a.game_id = g.id), 0),
      'steals', (SELECT COUNT(*) FROM public.gp_baserun_events e WHERE e.game_id = g.id AND e.event_type = 'steal' AND e.success = true),
      'steal_logs', (SELECT COUNT(*) FROM public.gp_baserun_events e WHERE e.game_id = g.id),
      'pitches', COALESCE(g.pitch_count, (SELECT COUNT(*) FROM public.gp_pitches p WHERE p.game_id = g.id AND p.perspective = 'pitcher')),
      'top_velo', (SELECT MAX(p.pitch_velo) FROM public.gp_pitches p WHERE p.game_id = g.id AND p.perspective = 'pitcher'),
      'putouts', (SELECT COUNT(*) FILTER (WHERE d.putout) FROM public.gp_defense_plays d WHERE d.game_id = g.id),
      'assists', (SELECT COUNT(*) FILTER (WHERE d.assist) FROM public.gp_defense_plays d WHERE d.game_id = g.id),
      'errors', (SELECT COUNT(*) FILTER (WHERE d.error_flag) FROM public.gp_defense_plays d WHERE d.game_id = g.id),
      'defense_logs', (SELECT COUNT(*) FROM public.gp_defense_plays d WHERE d.game_id = g.id)
    ) AS x
    FROM public.gp_games g
    WHERE g.user_id = _athlete AND g.deleted_at IS NULL
    ORDER BY g.game_date DESC LIMIT 10
  ) s;
  SELECT COALESCE(jsonb_agg(p.location), '[]'::jsonb) INTO _pitches
    FROM public.gp_pitches p JOIN public.gp_games g ON g.id = p.game_id
    WHERE g.user_id = _athlete AND g.deleted_at IS NULL AND p.perspective = 'pitcher' AND p.location IS NOT NULL;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('exit_direction', a.exit_direction, 'batted_ball_type', a.contact_quality)), '[]'::jsonb) INTO _spray
    FROM public.gp_at_bats a JOIN public.gp_games g ON g.id = a.game_id
    WHERE g.user_id = _athlete AND g.deleted_at IS NULL AND a.exit_direction IS NOT NULL;
  RETURN jsonb_build_object('games', _games, 'pitch_locations', _pitches, 'batted_balls', _spray);
END; $$;
REVOKE ALL ON FUNCTION public.scout_athlete_game_play(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.scout_athlete_game_play(uuid) TO authenticated, service_role;
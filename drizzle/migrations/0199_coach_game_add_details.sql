CREATE OR REPLACE FUNCTION public.coach_game_add_details(_entries uuid[], _details jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _me uuid := auth.uid(); _e uuid; _row record; _k text; _v jsonb; _n int := 0;
  _ints text[] := ARRAY['lineup_slot','innings_caught','batters_faced','pitcher_outs','pitcher_innings','pitcher_strikeouts','pitcher_walks','pitcher_hits','pitcher_home_runs','pitcher_at_bats_against','pitcher_runs','pitcher_earned_runs','pitcher_first_pitch_strikes','pitcher_two_ball_batters','pitcher_runners_on','pitcher_runners_stranded','pitcher_sb_allowed','pitcher_steal_attempts','pitcher_pickoffs','pitcher_pickoff_attempts','pitcher_pfp_chances','pitcher_pfp_errors'];
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE='42501'; END IF;
  IF _entries IS NULL OR cardinality(_entries) = 0 OR cardinality(_entries) > 60 THEN RAISE EXCEPTION 'Pick the saved game first'; END IF;
  IF jsonb_typeof(_details) <> 'object' THEN RAISE EXCEPTION 'details must be an object'; END IF;
  FOR _k, _v IN SELECT * FROM jsonb_each(_details) LOOP
    IF _k = ANY(_ints) THEN
      IF jsonb_typeof(_v) <> 'number' OR (_v)::text::numeric <> trunc((_v)::text::numeric) OR (_v)::text::numeric < 0 OR (_v)::text::numeric > 300 THEN RAISE EXCEPTION '% must be a whole number 0–300', _k; END IF;
      IF _k = 'lineup_slot' AND ((_v)::text::int < 1 OR (_v)::text::int > 12) THEN RAISE EXCEPTION 'Lineup spot must be 1–12'; END IF;
      IF _k = 'innings_caught' AND (_v)::text::int > 30 THEN RAISE EXCEPTION 'Innings caught must be 0–30'; END IF;
    ELSIF _k = 'innings_played' THEN
      IF jsonb_typeof(_v) <> 'number' OR (_v)::text::numeric < 0 OR (_v)::text::numeric > 30 THEN RAISE EXCEPTION 'Innings played must be 0–30'; END IF;
    ELSIF _k = 'my_positions' THEN
      IF jsonb_typeof(_v) <> 'array' OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(_v) p WHERE p NOT IN ('P','C','1B','2B','3B','SS','LF','CF','RF','DH','DP','FLEX')) THEN RAISE EXCEPTION 'Unknown position'; END IF;
    ELSIF _k = 'home_away' THEN
      IF (_v #>> '{}') NOT IN ('home','away','neutral') THEN RAISE EXCEPTION 'Home/away must be home, away or neutral'; END IF;
    ELSIF _k = 'game_type' THEN
      IF (_v #>> '{}') NOT IN ('regular_season','tournament','scrimmage','showcase','playoff') THEN RAISE EXCEPTION 'Unknown game type'; END IF;
    ELSIF _k = 'venue' THEN
      IF jsonb_typeof(_v) <> 'string' OR length(_v #>> '{}') > 120 THEN RAISE EXCEPTION 'Field name is too long'; END IF;
    ELSIF _k = 'general_notes' THEN
      IF jsonb_typeof(_v) <> 'string' OR length(_v #>> '{}') > 2000 THEN RAISE EXCEPTION 'Notes are too long'; END IF;
    ELSE RAISE EXCEPTION 'Unknown detail %', _k; END IF;
  END LOOP;
  FOREACH _e IN ARRAY _entries LOOP
    SELECT athlete_id, gp_game_id INTO _row FROM coach_logged_entries
     WHERE id = _e AND coach_id = _me AND status <> 'undone' AND kind = 'game' AND gp_game_id IS NOT NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'Not your saved game' USING ERRCODE='42501'; END IF;
    IF NOT public.coach_connected_to(_me, _row.athlete_id) THEN RAISE EXCEPTION 'A connection with this player is required' USING ERRCODE='42501'; END IF;
    UPDATE gp_games g SET
      lineup_slot = COALESCE((_details->>'lineup_slot')::int, g.lineup_slot),
      innings_caught = COALESCE((_details->>'innings_caught')::int, g.innings_caught),
      innings_played = COALESCE((_details->>'innings_played')::numeric, g.innings_played),
      batters_faced = COALESCE((_details->>'batters_faced')::int, g.batters_faced),
      pitcher_outs = COALESCE((_details->>'pitcher_outs')::int, g.pitcher_outs),
      pitcher_innings = COALESCE((_details->>'pitcher_innings')::int, g.pitcher_innings),
      pitcher_strikeouts = COALESCE((_details->>'pitcher_strikeouts')::int, g.pitcher_strikeouts),
      pitcher_walks = COALESCE((_details->>'pitcher_walks')::int, g.pitcher_walks),
      pitcher_hits = COALESCE((_details->>'pitcher_hits')::int, g.pitcher_hits),
      pitcher_home_runs = COALESCE((_details->>'pitcher_home_runs')::int, g.pitcher_home_runs),
      pitcher_at_bats_against = COALESCE((_details->>'pitcher_at_bats_against')::int, g.pitcher_at_bats_against),
      pitcher_runs = COALESCE((_details->>'pitcher_runs')::int, g.pitcher_runs),
      pitcher_earned_runs = COALESCE((_details->>'pitcher_earned_runs')::int, g.pitcher_earned_runs),
      pitcher_first_pitch_strikes = COALESCE((_details->>'pitcher_first_pitch_strikes')::int, g.pitcher_first_pitch_strikes),
      pitcher_two_ball_batters = COALESCE((_details->>'pitcher_two_ball_batters')::int, g.pitcher_two_ball_batters),
      pitcher_runners_on = COALESCE((_details->>'pitcher_runners_on')::int, g.pitcher_runners_on),
      pitcher_runners_stranded = COALESCE((_details->>'pitcher_runners_stranded')::int, g.pitcher_runners_stranded),
      pitcher_sb_allowed = COALESCE((_details->>'pitcher_sb_allowed')::int, g.pitcher_sb_allowed),
      pitcher_steal_attempts = COALESCE((_details->>'pitcher_steal_attempts')::int, g.pitcher_steal_attempts),
      pitcher_pickoffs = COALESCE((_details->>'pitcher_pickoffs')::int, g.pitcher_pickoffs),
      pitcher_pickoff_attempts = COALESCE((_details->>'pitcher_pickoff_attempts')::int, g.pitcher_pickoff_attempts),
      pitcher_pfp_chances = COALESCE((_details->>'pitcher_pfp_chances')::int, g.pitcher_pfp_chances),
      pitcher_pfp_errors = COALESCE((_details->>'pitcher_pfp_errors')::int, g.pitcher_pfp_errors),
      my_positions = CASE WHEN _details ? 'my_positions' THEN ARRAY(SELECT jsonb_array_elements_text(_details->'my_positions')) ELSE g.my_positions END,
      home_away = COALESCE(_details->>'home_away', g.home_away),
      game_type = COALESCE(_details->>'game_type', g.game_type),
      venue = COALESCE(nullif(trim(_details->>'venue'),''), g.venue),
      general_notes = COALESCE(nullif(trim(_details->>'general_notes'),''), g.general_notes),
      updated_at = now()
    WHERE g.id = _row.gp_game_id AND g.user_id = _row.athlete_id;
    _n := _n + 1;
  END LOOP;
  RETURN jsonb_build_object('updated', _n);
END $function$;
REVOKE ALL ON FUNCTION public.coach_game_add_details(uuid[], jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_game_add_details(uuid[], jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.coach_log_general_game(_athletes uuid[], _date date, _opponent text, _my_score integer DEFAULT NULL::integer, _opp_score integer DEFAULT NULL::integer, _notes text DEFAULT NULL::text, _parent_present boolean DEFAULT false, _lineup uuid DEFAULT NULL::uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _me uuid := auth.uid(); _a uuid; _dob date; _name text; _label text; _sport text; _game uuid; _id uuid; _n int := 0; _summary jsonb; _ids uuid[] := '{}';
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE='42501'; END IF;
  IF _athletes IS NULL OR cardinality(_athletes) = 0 THEN RAISE EXCEPTION 'Pick a team or your roster first'; END IF;
  IF cardinality(_athletes) > 60 THEN RAISE EXCEPTION 'Too many players for one game'; END IF;
  IF _date IS NULL OR _date > current_date + 1 OR _date < current_date - 365 THEN RAISE EXCEPTION 'Pick a date in the last year'; END IF;
  IF (_my_score IS NOT NULL AND (_my_score < 0 OR _my_score > 99)) OR (_opp_score IS NOT NULL AND (_opp_score < 0 OR _opp_score > 99)) THEN
    RAISE EXCEPTION 'Scores must be 0–99';
  END IF;
  IF length(coalesce(_notes,'')) > 2000 THEN RAISE EXCEPTION 'Notes are too long'; END IF;
  IF _lineup IS NOT NULL AND NOT EXISTS (SELECT 1 FROM coach_lineups WHERE id = _lineup AND coach_id = _me) THEN
    RAISE EXCEPTION 'Not your lineup' USING ERRCODE='42501';
  END IF;
  FOREACH _a IN ARRAY _athletes LOOP
    IF NOT public.coach_connected_to(_me, _a) THEN RAISE EXCEPTION 'A connection with every player is required' USING ERRCODE='42501'; END IF;
    IF _lineup IS NOT NULL AND NOT EXISTS (SELECT 1 FROM coach_lineup_players WHERE lineup_id = _lineup AND athlete_id = _a) THEN
      RAISE EXCEPTION 'Wrong player: not on this team' USING ERRCODE='42501';
    END IF;
    SELECT date_of_birth INTO _dob FROM profiles WHERE id = _a;
    IF (_dob IS NULL OR age(_dob) < interval '13 years') AND NOT coalesce(_parent_present,false) THEN
      RAISE EXCEPTION 'Under 13 on this team: the parent must be present and agree' USING ERRCODE='42501';
    END IF;
  END LOOP;
  SELECT coalesce(nullif(trim(full_name),''),'Coach') INTO _name FROM profiles WHERE id = _me;
  _label := 'Coach-entered · ' || _name || ' · ' || to_char(_date,'Mon DD, YYYY');
  _summary := jsonb_build_object('coach_label', _label, 'general_game', true, 'stats', '{}'::jsonb);
  FOREACH _a IN ARRAY (SELECT array_agg(DISTINCT x) FROM unnest(_athletes) x) LOOP
    SELECT COALESCE(ms.sport, ac.sport_primary, 'baseball') INTO _sport
    FROM profiles p LEFT JOIN athlete_mpi_settings ms ON ms.user_id = p.id LEFT JOIN athlete_context ac ON ac.user_id = p.id
    WHERE p.id = _a;
    INSERT INTO gp_games (user_id, game_date, sport, opponent_team, status, entry_source, ignored_for_training, my_score, opp_score, general_notes, game_summary)
    VALUES (_a, _date, coalesce(_sport,'baseball'), nullif(trim(coalesce(_opponent,'')),''), 'final', 'coach', true,
            _my_score, _opp_score, nullif(trim(coalesce(_notes,'')),''), _summary)
    RETURNING id INTO _game;
    INSERT INTO coach_logged_entries (athlete_id, coach_id, coach_label, mode, lineup_id, kind, entry_date, opponent, stats, parent_present_confirmed_at, gp_game_id)
    VALUES (_a, _me, _label, CASE WHEN _lineup IS NULL THEN 'single' ELSE 'lineup' END, _lineup, 'game', _date,
            nullif(trim(coalesce(_opponent,'')),''), '{}'::jsonb, CASE WHEN _parent_present THEN now() END, _game)
    RETURNING id INTO _id;
    _ids := _ids || _id;
    INSERT INTO coach_messages (athlete_id, coach_id, body, parent_copied)
    VALUES (_a, _me, _name || ' logged a team game on ' || to_char(_date,'Mon DD') || '. Open My games to see it.', true);
    _n := _n + 1;
  END LOOP;
  RETURN jsonb_build_object('saved', _n, 'label', _label, 'entries', to_jsonb(_ids));
END $function$;
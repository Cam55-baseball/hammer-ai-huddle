-- Owner Nov 5 #3: coach "General game" — date, opponent, score, notes for a team or the roster,
-- with no per-player stats. Each connected player gets their own game record (History / The General /
-- week calendar) through the same coach entry table; any non-connected player blocks the whole save.
CREATE OR REPLACE FUNCTION public.coach_log_general_game(_athletes uuid[], _date date, _opponent text,
  _my_score integer DEFAULT NULL, _opp_score integer DEFAULT NULL, _notes text DEFAULT NULL,
  _parent_present boolean DEFAULT false, _lineup uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _a uuid; _dob date; _name text; _label text; _sport text; _game uuid; _id uuid; _n int := 0; _summary jsonb;
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
    INSERT INTO coach_messages (athlete_id, coach_id, body, parent_copied)
    VALUES (_a, _me, _name || ' logged a team game on ' || to_char(_date,'Mon DD') || '. Open My games to see it.', true);
    _n := _n + 1;
  END LOOP;
  RETURN jsonb_build_object('saved', _n, 'label', _label);
END $$;

REVOKE ALL ON FUNCTION public.coach_log_general_game(uuid[],date,text,integer,integer,text,boolean,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_log_general_game(uuid[],date,text,integer,integer,text,boolean,uuid) TO authenticated;
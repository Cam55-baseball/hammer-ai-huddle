-- Data-unity fixes (owner-authorized Oct 24):
-- 1. Coach-entered game logs also create a gp_games row so they reach History and Coach Games.
--    The row is marked entry_source='coach' and ignored_for_training=true because the arm
--    ledger already carries the throw load via _coach_log_throws (no double-counting).
-- 2. Coach/scout/org test RPCs also read combine_results.
-- 3. Coach readiness and org facility board attendance also count athlete_daily_log check-ins.

-- ---------- 1. Coach-entered games -> gp_games ----------
ALTER TABLE public.coach_logged_entries ADD COLUMN gp_game_id uuid REFERENCES public.gp_games(id);

CREATE OR REPLACE FUNCTION public.coach_log_entry(_athlete uuid, _confirm_athlete uuid, _kind text, _date date, _opponent text,
  _stats jsonb, _parent_present boolean DEFAULT false, _lineup uuid DEFAULT NULL, _jersey text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _dob date; _name text; _k text; _v jsonb; _id uuid; _label text; _sport text; _game uuid;
BEGIN
  IF _athlete IS NULL OR _confirm_athlete IS DISTINCT FROM _athlete THEN
    RAISE EXCEPTION 'Wrong player: the confirmed player does not match' USING ERRCODE='42501';
  END IF;
  IF NOT public.coach_connected_to(_me, _athlete) THEN RAISE EXCEPTION 'A connection with this player is required' USING ERRCODE='42501'; END IF;
  IF _lineup IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM coach_lineups WHERE id = _lineup AND coach_id = _me) THEN RAISE EXCEPTION 'Not your lineup' USING ERRCODE='42501'; END IF;
    IF NOT EXISTS (SELECT 1 FROM coach_lineup_players WHERE lineup_id = _lineup AND athlete_id = _athlete AND jersey = _jersey) THEN
      RAISE EXCEPTION 'Wrong player: jersey % is not this player', _jersey USING ERRCODE='42501';
    END IF;
  END IF;
  IF _kind NOT IN ('game','practice') THEN RAISE EXCEPTION 'kind must be game or practice'; END IF;
  IF _date IS NULL OR _date > current_date + 1 OR _date < current_date - 365 THEN RAISE EXCEPTION 'Pick a date in the last year'; END IF;
  IF jsonb_typeof(_stats) <> 'object' THEN RAISE EXCEPTION 'stats must be an object'; END IF;
  FOR _k, _v IN SELECT * FROM jsonb_each(_stats) LOOP
    IF _k NOT IN ('ab','hits','rbi','bb','so','runs','sb','pitches','strikes','innings_outs','position_throws') THEN RAISE EXCEPTION 'Unknown stat %', _k; END IF;
    IF jsonb_typeof(_v) <> 'number' OR (_v)::text::numeric < 0 OR (_v)::text::numeric > 300 OR (_v)::text::numeric <> trunc((_v)::text::numeric) THEN RAISE EXCEPTION 'Stat % must be a whole number 0–300', _k; END IF;
  END LOOP;
  IF coalesce((_stats->>'hits')::int,0) > coalesce((_stats->>'ab')::int,0) THEN RAISE EXCEPTION 'Hits cannot be more than at-bats'; END IF;
  SELECT date_of_birth INTO _dob FROM profiles WHERE id = _athlete;
  IF (_dob IS NULL OR age(_dob) < interval '13 years') AND NOT coalesce(_parent_present,false) THEN
    RAISE EXCEPTION 'Under 13: the parent must be present and agree' USING ERRCODE='42501';
  END IF;
  SELECT coalesce(nullif(trim(full_name),''),'Coach') INTO _name FROM profiles WHERE id = _me;
  _label := 'Coach-entered · ' || _name || ' · ' || to_char(_date,'Mon DD, YYYY');

  -- A coach-entered game is a real game: mirror it into gp_games so it reaches the
  -- player's History game list and the Coach Games tab. ignored_for_training stays
  -- true because the arm ledger already carries this game's throw load.
  IF _kind = 'game' THEN
    SELECT COALESCE(ms.sport, ac.sport_primary, 'baseball') INTO _sport
    FROM profiles p
    LEFT JOIN athlete_mpi_settings ms ON ms.user_id = p.id
    LEFT JOIN athlete_context ac ON ac.user_id = p.id
    WHERE p.id = _athlete;
    INSERT INTO gp_games (user_id, game_date, sport, opponent_team, status, entry_source, ignored_for_training, pitch_count, game_summary)
    VALUES (_athlete, _date, coalesce(_sport,'baseball'), nullif(trim(coalesce(_opponent,'')),''), 'final', 'coach', true,
            nullif(coalesce((_stats->>'pitches')::int,0),0),
            jsonb_build_object('coach_label', _label, 'stats', _stats))
    RETURNING id INTO _game;
  END IF;

  INSERT INTO coach_logged_entries (athlete_id, coach_id, coach_label, mode, lineup_id, jersey, kind, entry_date, opponent, stats, parent_present_confirmed_at, gp_game_id)
  VALUES (_athlete, _me, _label, CASE WHEN _lineup IS NULL THEN 'single' ELSE 'lineup' END, _lineup, _jersey, _kind, _date,
          nullif(trim(coalesce(_opponent,'')),''), _stats, CASE WHEN _parent_present THEN now() END, _game)
  RETURNING id INTO _id;
  PERFORM public._coach_log_throws(_athlete, _date, _stats, 1);
  INSERT INTO coach_messages (athlete_id, coach_id, body, parent_copied)
  VALUES (_athlete, _me, _name || ' logged your ' || _kind || ' on ' || to_char(_date,'Mon DD') || '. Open My games to confirm it or flag it if something is wrong.', true);
  RETURN jsonb_build_object('id', _id, 'label', _label);
END $$;

CREATE OR REPLACE FUNCTION public.coach_undo_entry(_entry uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e coach_logged_entries;
BEGIN
  SELECT * INTO e FROM coach_logged_entries WHERE id = _entry AND coach_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Nothing to undo' USING ERRCODE='42501'; END IF;
  IF now() - e.created_at > interval '15 seconds' THEN RAISE EXCEPTION 'Undo time has passed'; END IF;
  UPDATE coach_logged_entries SET status = 'undone', resolved_at = now() WHERE id = _entry;
  PERFORM public._coach_log_throws(e.athlete_id, e.entry_date, e.stats, -1);
  IF e.gp_game_id IS NOT NULL THEN UPDATE gp_games SET deleted_at = now(), updated_at = now() WHERE id = e.gp_game_id AND deleted_at IS NULL; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.player_resolve_coach_entry(_entry uuid, _confirm boolean, _reason text DEFAULT NULL, _note text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e coach_logged_entries;
BEGIN
  SELECT * INTO e FROM coach_logged_entries WHERE id = _entry AND status IN ('pending','flagged')
    AND (athlete_id = auth.uid() OR public.is_parent_of(auth.uid(), athlete_id));
  IF NOT FOUND THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  IF _confirm THEN
    UPDATE coach_logged_entries SET status = 'confirmed', resolved_at = now(), flag_reason = NULL WHERE id = _entry;
  ELSE
    IF _reason NOT IN ('not_me','wrong_numbers','other') THEN RAISE EXCEPTION 'Pick a reason'; END IF;
    UPDATE coach_logged_entries SET status = 'flagged', flag_reason = _reason, flag_note = left(_note, 500), resolved_at = NULL WHERE id = _entry;
    IF _reason = 'not_me' AND e.status = 'pending' THEN
      PERFORM public._coach_log_throws(e.athlete_id, e.entry_date, e.stats, -1);
      IF e.gp_game_id IS NOT NULL THEN UPDATE gp_games SET deleted_at = now(), updated_at = now() WHERE id = e.gp_game_id AND deleted_at IS NULL; END IF;
    END IF;
  END IF;
END $$;

-- ---------- 2. Combine results in coach/scout/org test reads ----------
CREATE OR REPLACE FUNCTION public.coach_athlete_tests(_athlete uuid)
RETURNS TABLE(id uuid, test_date date, test_type text, sport text, results jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (auth.uid() = _athlete OR public.is_coach_of(auth.uid(), _athlete) OR public.is_linked_coach(auth.uid(), _athlete)) THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT u.id, u.test_date, u.test_type, u.sport, u.results FROM (
      SELECT t.id, t.test_date::date AS test_date, t.test_type, t.sport, t.results, t.created_at
      FROM vault_performance_tests t WHERE t.user_id = _athlete
      UNION ALL
      SELECT r.id, COALESCE(s.completed_at, r.created_at)::date AS test_date, 'combine'::text AS test_type, s.sport,
             jsonb_build_object(r.event, r.value, '_unit', r.unit, '_source', COALESCE(r.source,'combine')) AS results,
             r.created_at
      FROM combine_results r JOIN combine_sessions s ON s.id = r.session_id
      WHERE r.user_id = _athlete AND r.value IS NOT NULL
    ) u ORDER BY u.test_date DESC, u.created_at DESC LIMIT 20;
END $$;

CREATE OR REPLACE FUNCTION public.org_test_ranking(_org uuid, _test text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _staff boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated' USING errcode = '42501'; END IF;
  _staff := public.is_org_staff(_uid, _org);
  IF NOT _staff AND NOT EXISTS (SELECT 1 FROM org_athlete_assignments a WHERE a.organization_id = _org AND a.coach_user_id = _uid AND a.revoked_at IS NULL) THEN
    RAISE EXCEPTION 'not allowed' USING errcode = '42501';
  END IF;
  RETURN jsonb_build_object(
    'tests', coalesce((
      SELECT jsonb_agg(DISTINCT k.key ORDER BY k.key)
      FROM organization_members m
      CROSS JOIN LATERAL (
        SELECT j.key FROM vault_performance_tests t CROSS JOIN LATERAL jsonb_each(coalesce(t.results,'{}'::jsonb)) j
        WHERE t.user_id = m.user_id AND left(j.key,1) <> '_' AND jsonb_typeof(j.value) = 'number'
        UNION
        SELECT r.event FROM combine_results r WHERE r.user_id = m.user_id AND r.value IS NOT NULL
      ) k
      WHERE m.organization_id = _org AND m.role_in_org = 'player' AND m.status = 'active'
        AND (_staff OR EXISTS (SELECT 1 FROM org_athlete_assignments a WHERE a.organization_id = _org AND a.coach_user_id = _uid AND a.athlete_user_id = m.user_id AND a.revoked_at IS NULL))
    ), '[]'::jsonb),
    'rows', coalesce((
      SELECT jsonb_agg(row_to_json(x))
      FROM (
        SELECT m.user_id AS athlete_id,
          coalesce(nullif(trim(p.first_name || ' ' || p.last_name), ''), nullif(trim(p.full_name), ''), 'Player') AS name,
          ms.primary_position, ms.league_tier,
          coalesce(ms.date_of_birth, p.date_of_birth) AS date_of_birth,
          lt.value, lt.test_date, lt.verified
        FROM organization_members m
        LEFT JOIN profiles p ON p.id = m.user_id
        LEFT JOIN athlete_mpi_settings ms ON ms.user_id = m.user_id
        CROSS JOIN LATERAL (
          SELECT u.value, u.test_date, u.verified FROM (
            SELECT (t.results ->> _test)::numeric AS value, coalesce(t.test_date, t.created_at::date) AS test_date,
                   (t.results ->> '_verified') = 'in_person' AS verified, t.created_at
            FROM vault_performance_tests t
            WHERE t.user_id = m.user_id AND jsonb_typeof(t.results -> _test) = 'number'
            UNION ALL
            SELECT r.value, COALESCE(s.completed_at, r.created_at)::date, true, r.created_at
            FROM combine_results r JOIN combine_sessions s ON s.id = r.session_id
            WHERE r.user_id = m.user_id AND r.event = _test AND r.value IS NOT NULL
          ) u ORDER BY u.test_date DESC, u.created_at DESC LIMIT 1
        ) lt
        WHERE m.organization_id = _org AND m.role_in_org = 'player' AND m.status = 'active' AND _test IS NOT NULL
          AND (_staff OR EXISTS (SELECT 1 FROM org_athlete_assignments a WHERE a.organization_id = _org AND a.coach_user_id = _uid AND a.athlete_user_id = m.user_id AND a.revoked_at IS NULL))
      ) x
    ), '[]'::jsonb)
  );
END $$;

CREATE OR REPLACE FUNCTION public.scout_athlete_profile(_athlete uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v uuid := auth.uid();
  sp boolean; sm boolean; sv boolean; sa boolean;
  _overview jsonb; _academics jsonb; _tests jsonb; _reports jsonb; _recap jsonb; _grades jsonb; _club jsonb;
BEGIN
  sp := public.scout_can_view_scope(v, _athlete, 'profile');
  sm := public.scout_can_view_scope(v, _athlete, 'metrics');
  sv := public.scout_can_view_scope(v, _athlete, 'video');
  sa := public.scout_can_view_scope(v, _athlete, 'academics');
  IF NOT (sp OR sm OR sv OR sa) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF sp THEN
    SELECT jsonb_build_object(
      'full_name', p.full_name, 'sport', m.sport,
      'primary_position', COALESCE(m.primary_position::text, p.position::text), 'secondary_position', m.secondary_position,
      'bats', COALESCE(p.primary_batting_side::text, p.batting_side::text), 'throws', COALESCE(m.primary_throwing_hand::text, p.primary_throwing_hand::text, p.throwing_hand::text),
      'level', p.experience_level, 'team', p.team_affiliation, 'region', p.state,
      'grad_year', COALESCE(p.high_school_grad_year::text, p.graduation_year::text, p.college_grad_year::text),
      'recruiting_status', p.commitment_status)
    INTO _overview
    FROM public.profiles p LEFT JOIN public.athlete_mpi_settings m ON m.user_id = p.id
    WHERE p.id = _athlete LIMIT 1;
  END IF;

  IF sa THEN
    SELECT jsonb_build_object('gpa', p.gpa, 'sat', p.sat_score, 'act', p.act_score,
      'transcript_status', (SELECT t.status FROM public.academic_transcripts t WHERE t.athlete_id = _athlete ORDER BY t.uploaded_at DESC LIMIT 1),
      'transcript_reviewed_at', (SELECT t.reviewed_at FROM public.academic_transcripts t WHERE t.athlete_id = _athlete ORDER BY t.uploaded_at DESC LIMIT 1))
    INTO _academics FROM public.profiles p WHERE p.id = _athlete;
  END IF;

  IF sm THEN
    SELECT COALESCE(jsonb_agg(u.x ORDER BY u.x->>'test_date' DESC), '[]'::jsonb)
    INTO _tests FROM (
      SELECT jsonb_build_object('test_date', t.test_date, 'test_type', t.test_type, 'results', t.results) AS x
      FROM (SELECT * FROM public.vault_performance_tests WHERE user_id = _athlete ORDER BY test_date DESC LIMIT 20) t
      UNION ALL
      SELECT jsonb_build_object('test_date', COALESCE(s.completed_at, r.created_at)::date, 'test_type', 'combine',
        'results', jsonb_build_object(r.event, r.value, '_unit', r.unit, '_source', COALESCE(r.source,'combine'))) AS x
      FROM public.combine_results r JOIN public.combine_sessions s ON s.id = r.session_id
      WHERE r.user_id = _athlete AND r.value IS NOT NULL
      LIMIT 40
    ) u;
    SELECT jsonb_build_object('period_start', r.recap_period_start, 'period_end', r.recap_period_end,
      'strength_change_percent', r.strength_change_percent, 'total_weight_lifted', r.total_weight_lifted)
    INTO _recap FROM public.vault_recaps r WHERE r.user_id = _athlete ORDER BY r.recap_period_end DESC LIMIT 1;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('graded_at', g.graded_at, 'grade_type', g.grade_type, 'grade_source', g.grade_source,
      'overall_grade', g.overall_grade, 'position_evaluated', g.position_evaluated) ORDER BY g.graded_at DESC NULLS LAST), '[]'::jsonb)
    INTO _grades FROM (SELECT * FROM public.vault_scout_grades WHERE user_id = _athlete ORDER BY graded_at DESC NULLS LAST LIMIT 10) g;
  END IF;

  IF sv THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('created_at', q.created_at, 'module', q.module, 'efficiency_score', q.efficiency_score) ORDER BY q.created_at DESC), '[]'::jsonb)
    INTO _reports FROM (SELECT * FROM public.videos WHERE user_id = _athlete AND ai_analysis IS NOT NULL ORDER BY created_at DESC LIMIT 10) q;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('created_at', q.created_at, 'title', q.library_title, 'module', q.module) ORDER BY q.created_at DESC), '[]'::jsonb)
    INTO _club FROM (SELECT * FROM public.videos WHERE user_id = _athlete AND library_title IS NOT NULL ORDER BY created_at DESC LIMIT 20) q;
  END IF;

  RETURN jsonb_build_object(
    'shared', jsonb_build_object('profile', sp, 'metrics', sm, 'video', sv, 'academics', sa),
    'overview', _overview, 'academics', _academics, 'tests', _tests, 'recap', _recap,
    'grades', _grades, 'reports', _reports, 'players_club', _club);
END; $$;

-- ---------- 3. Daily-log check-ins in coach readiness and org attendance ----------
CREATE OR REPLACE FUNCTION public.coach_athlete_readiness(_athlete uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _rows jsonb; _done jsonb; _self boolean := (auth.uid() = _athlete); _shared boolean;
BEGIN
  IF NOT (_self OR public.is_coach_of(auth.uid(), _athlete) OR public.is_linked_coach(auth.uid(), _athlete)) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  -- Attendance (which check-ins were done, and when) is always visible to connected staff.
  -- Both check-in systems count: focus quizzes and the daily log.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('entry_date', c.entry_date, 'quiz_type', c.quiz_type, 'completed_at', c.completed_at)
         ORDER BY c.entry_date DESC, c.completed_at DESC), '[]'::jsonb)
  INTO _done FROM (
    SELECT q.entry_date, q.quiz_type, q.created_at AS completed_at FROM public.vault_focus_quizzes q
    WHERE q.user_id = _athlete AND q.entry_date >= current_date - 27
    UNION ALL
    SELECT d.entry_date, 'daily_log'::text, d.created_at FROM public.athlete_daily_log d
    WHERE d.user_id = _athlete AND d.entry_date >= current_date - 27
  ) c;
  -- Contents are health data: only with health sharing ON (parent too, for minors).
  _shared := _self OR public.resolve_recruiting_scope(_athlete, 'health');
  IF NOT _shared THEN
    RETURN jsonb_build_object('shared', false, 'checkins', '[]'::jsonb, 'completed', _done);
  END IF;
  SELECT COALESCE(jsonb_agg(u.x ORDER BY u.x->>'entry_date' DESC), '[]'::jsonb)
  INTO _rows FROM (
    SELECT jsonb_build_object(
      'entry_date', q.entry_date, 'quiz_type', q.quiz_type,
      'physical_readiness', q.physical_readiness, 'perceived_recovery', q.perceived_recovery,
      'hours_slept', q.hours_slept, 'sleep_quality', q.sleep_quality, 'mental_energy', q.mental_energy,
      'mood_level', q.mood_level, 'stress_level', q.stress_level,
      'pain_location', q.pain_location, 'pain_scale', q.pain_scale,
      'soreness_locations', q.soreness_locations,
      'note', NULLIF(concat_ws(' · ', q.reflection_did_well, q.reflection_improve), '')) AS x
    FROM public.vault_focus_quizzes q
    WHERE q.user_id = _athlete AND q.entry_date >= current_date - 6
    UNION ALL
    SELECT jsonb_build_object(
      'entry_date', d.entry_date, 'quiz_type', 'daily_log',
      'day_status', d.day_status, 'rest_reason', d.rest_reason,
      'injury_mode', d.injury_mode, 'injury_body_region', d.injury_body_region,
      'game_logged', d.game_logged,
      'note', NULLIF(d.notes, '')) AS x
    FROM public.athlete_daily_log d
    WHERE d.user_id = _athlete AND d.entry_date >= current_date - 6
  ) u;
  RETURN jsonb_build_object('shared', true, 'checkins', _rows, 'completed', _done);
END;
$function$;

CREATE OR REPLACE FUNCTION public.org_facility_board(_org uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE today date := (now() at time zone 'utc')::date;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_org_staff(auth.uid(), _org) THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'athlete_id', m.user_id,
      'name', p.full_name,
      'team_id', tm.team_id,
      'team_name', t.name,
      'coach_id', a.coach_user_id,
      'coach_name', cp.full_name,
      'today_planned', (SELECT count(*) FROM wk_prescriptions w WHERE w.user_id=m.user_id AND w.plan_date=today),
      'today_done', (SELECT count(*) FROM wk_prescriptions w WHERE w.user_id=m.user_id AND w.plan_date=today AND w.status='completed'),
      'week_planned', (SELECT count(*) FROM wk_prescriptions w WHERE w.user_id=m.user_id AND w.plan_date BETWEEN today-6 AND today),
      'week_done', (SELECT count(*) FROM wk_prescriptions w WHERE w.user_id=m.user_id AND w.plan_date BETWEEN today-6 AND today AND w.status='completed'),
      'missed_days', (SELECT count(DISTINCT w.plan_date) FROM wk_prescriptions w WHERE w.user_id=m.user_id AND w.plan_date BETWEEN today-6 AND today-1 AND w.status<>'completed'),
      'latest_test', (SELECT jsonb_build_object('test_type',v.test_type,'test_date',v.test_date,'next_entry_date',v.next_entry_date) FROM vault_performance_tests v WHERE v.user_id=m.user_id ORDER BY v.test_date DESC, v.created_at DESC LIMIT 1),
      'top_alert', (SELECT jsonb_build_object('metric_key',al.metric_key,'kind',al.kind,'at',al.created_at) FROM athlete_baseline_alerts al WHERE al.user_id=m.user_id AND al.dismissed_at IS NULL ORDER BY al.created_at DESC LIMIT 1),
      'checkins_7d', (SELECT count(DISTINCT c.entry_date) FROM (
                        SELECT q.entry_date FROM vault_focus_quizzes q WHERE q.user_id=m.user_id AND q.entry_date BETWEEN today-6 AND today
                        UNION
                        SELECT d.entry_date FROM athlete_daily_log d WHERE d.user_id=m.user_id AND d.entry_date BETWEEN today-6 AND today
                      ) c),
      'last_active', (SELECT max(d) FROM (SELECT max(w.updated_at)::date AS d FROM wk_prescriptions w WHERE w.user_id=m.user_id AND w.status='completed' UNION ALL SELECT max(v.test_date) FROM vault_performance_tests v WHERE v.user_id=m.user_id) s)
    ) ORDER BY p.full_name)
    FROM organization_members m
    JOIN profiles p ON p.id = m.user_id
    LEFT JOIN org_team_members tm ON tm.user_id = m.user_id AND tm.removed_at IS NULL
    LEFT JOIN org_teams t ON t.id = tm.team_id
    LEFT JOIN LATERAL (SELECT coach_user_id FROM org_athlete_assignments x WHERE x.organization_id=_org AND x.athlete_user_id=m.user_id AND x.revoked_at IS NULL LIMIT 1) a ON true
    LEFT JOIN profiles cp ON cp.id = a.coach_user_id
    WHERE m.organization_id = _org AND m.status = 'active' AND m.role_in_org = 'player'
  ), '[]'::jsonb);
END $function$;

-- Restate execute grants (CREATE OR REPLACE preserves them; restated for clarity).
GRANT EXECUTE ON FUNCTION public.coach_log_entry(uuid,uuid,text,date,text,jsonb,boolean,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.coach_undo_entry(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_resolve_coach_entry(uuid,boolean,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.coach_athlete_tests(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_test_ranking(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.scout_athlete_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.coach_athlete_readiness(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_facility_board(uuid) TO authenticated;
-- Owner Nov 6 r2 #1: connected coaches and assigned org staff always see check-ins/readiness.
CREATE OR REPLACE FUNCTION public._coach_checkin_access(_athlete uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND (auth.uid() = _athlete
    OR public._coach_training_access(_athlete)
    OR (public.is_coach_of(auth.uid(), _athlete)
        AND NOT public.user_has_role(auth.uid(), 'scout'::public.app_role)
        AND NOT public.user_has_role(auth.uid(), 'recruiter'::public.app_role)))
$$;
REVOKE ALL ON FUNCTION public._coach_checkin_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._coach_checkin_access(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.coach_athlete_checkins_28(_athlete uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _rows jsonb; _logs jsonb; _load jsonb;
BEGIN
  IF NOT public._coach_checkin_access(_athlete) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'entry_date', q.entry_date, 'quiz_type', q.quiz_type, 'readiness', q.physical_readiness,
    'hours_slept', q.hours_slept, 'sleep_quality', q.sleep_quality, 'energy', q.mental_energy,
    'soreness_locations', q.soreness_locations, 'soreness_scales', q.soreness_scales,
    'pain_location', q.pain_location, 'pain_scale', q.pain_scale, 'pain_scales', q.pain_scales)
    ORDER BY q.entry_date DESC, q.created_at DESC), '[]'::jsonb)
  INTO _rows FROM public.vault_focus_quizzes q
  WHERE q.user_id = _athlete AND q.entry_date >= current_date - 27;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('entry_date', d.entry_date, 'injury_mode', d.injury_mode,
    'injury_body_region', d.injury_body_region, 'day_status', d.day_status) ORDER BY d.entry_date DESC), '[]'::jsonb)
  INTO _logs FROM public.athlete_daily_log d WHERE d.user_id = _athlete AND d.entry_date >= current_date - 27;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('plan_date', s.plan_date, 'items', s.n) ORDER BY s.plan_date DESC), '[]'::jsonb)
  INTO _load FROM (SELECT l.plan_date, count(*)::int n FROM public.wk_session_logs l
    WHERE l.user_id = _athlete AND l.plan_date BETWEEN current_date - 27 AND current_date GROUP BY 1) s;
  RETURN jsonb_build_object('shared', true, 'checkins', _rows, 'daily_logs', _logs, 'load', _load, 'today', current_date);
END $function$;

CREATE OR REPLACE FUNCTION public.coach_athlete_readiness(_athlete uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _rows jsonb; _done jsonb;
BEGIN
  IF NOT public._coach_checkin_access(_athlete) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('entry_date', c.entry_date, 'quiz_type', c.quiz_type, 'completed_at', c.completed_at)
         ORDER BY c.entry_date DESC, c.completed_at DESC), '[]'::jsonb)
  INTO _done FROM (
    SELECT q.entry_date, q.quiz_type, q.created_at AS completed_at FROM public.vault_focus_quizzes q
    WHERE q.user_id = _athlete AND q.entry_date >= current_date - 27
    UNION ALL
    SELECT d.entry_date, 'daily_log'::text, d.created_at FROM public.athlete_daily_log d
    WHERE d.user_id = _athlete AND d.entry_date >= current_date - 27
  ) c;
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
END $function$;

CREATE OR REPLACE FUNCTION public.coach_team_readiness_today()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _me uuid := auth.uid(); _ids uuid[];
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  SELECT array_agg(DISTINCT c) INTO _ids FROM (
    SELECT user_id c FROM athlete_mpi_settings WHERE primary_coach_id = _me OR _me = ANY(coalesce(secondary_coach_ids,'{}'))
    UNION SELECT player_id FROM scout_follows WHERE scout_id = _me AND status='accepted'
    UNION SELECT athlete_user_id FROM org_athlete_assignments WHERE coach_user_id = _me AND revoked_at IS NULL
    UNION SELECT om.user_id FROM organization_members om WHERE om.status='active' AND om.role_in_org='player' AND public.is_org_admin(_me, om.organization_id)
  ) s WHERE c <> _me AND public._coach_checkin_access(c);
  RETURN COALESCE((
    SELECT jsonb_agg(x ORDER BY x->>'name') FROM (
      SELECT jsonb_build_object(
          'athlete_id', u, 'name', coalesce(p.full_name, 'Player'), 'shared', true,
          'readiness', (SELECT q.physical_readiness FROM vault_focus_quizzes q WHERE q.user_id = u AND q.entry_date = current_date AND q.physical_readiness IS NOT NULL ORDER BY q.created_at DESC LIMIT 1),
          'checked_in', EXISTS (SELECT 1 FROM vault_focus_quizzes q WHERE q.user_id = u AND q.entry_date = current_date)) x
      FROM unnest(coalesce(_ids, '{}')) u JOIN profiles p ON p.id = u
      WHERE coalesce(p.is_system_account, false) = false AND p.suspended_at IS NULL AND p.account_paused_at IS NULL
    ) t), '[]'::jsonb);
END $function$;

-- Owner Nov 6 r2 #3: the player is a testing-day recipient too.
CREATE OR REPLACE FUNCTION public._testing_day_recipients(_td testing_days)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT DISTINCT u FROM (
    SELECT coach_user_id u FROM athlete_head_coach WHERE athlete_user_id = _td.athlete_id
    UNION SELECT coach_user_id FROM org_athlete_assignments WHERE organization_id = _td.organization_id AND athlete_user_id = _td.athlete_id AND revoked_at IS NULL
    UNION SELECT _td.created_by
    UNION SELECT _td.athlete_id
  ) x WHERE u IS NOT NULL
$function$;

-- Due 3-day / day-of reminders for testing days this user is part of (no cron: runs when they open the app).
CREATE OR REPLACE FUNCTION public.send_my_testing_day_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE td public.testing_days; n int := 0; _me uuid := auth.uid();
BEGIN
  IF _me IS NULL THEN RETURN 0; END IF;
  FOR td IN SELECT t.* FROM testing_days t WHERE t.status = 'scheduled' AND t.scheduled_for = current_date AND t.reminded_day_at IS NULL
      AND _me IN (SELECT public._testing_day_recipients(t)) FOR UPDATE SKIP LOCKED LOOP
    PERFORM public._testing_day_notify(td, 'Testing day is today');
    UPDATE testing_days SET reminded_day_at = now(), reminded_3d_at = coalesce(reminded_3d_at, now()) WHERE id = td.id; n := n + 1;
  END LOOP;
  FOR td IN SELECT t.* FROM testing_days t WHERE t.status = 'scheduled' AND t.scheduled_for BETWEEN current_date + 1 AND current_date + 3 AND t.reminded_3d_at IS NULL
      AND _me IN (SELECT public._testing_day_recipients(t)) FOR UPDATE SKIP LOCKED LOOP
    PERFORM public._testing_day_notify(td, 'Testing day in ' || (td.scheduled_for - current_date) || ' day' || CASE WHEN td.scheduled_for - current_date = 1 THEN '' ELSE 's' END);
    UPDATE testing_days SET reminded_3d_at = now() WHERE id = td.id; n := n + 1;
  END LOOP;
  RETURN n;
END $function$;
REVOKE ALL ON FUNCTION public.send_my_testing_day_reminders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_my_testing_day_reminders() TO authenticated;
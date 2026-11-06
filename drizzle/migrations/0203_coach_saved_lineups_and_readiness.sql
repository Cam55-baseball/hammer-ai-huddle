GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_lineups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_lineup_players TO authenticated;
GRANT ALL ON public.coach_lineups TO service_role;
GRANT ALL ON public.coach_lineup_players TO service_role;

CREATE POLICY "coach inserts own lineups" ON public.coach_lineups FOR INSERT TO authenticated WITH CHECK (coach_id = auth.uid());
CREATE POLICY "coach updates own lineups" ON public.coach_lineups FOR UPDATE TO authenticated USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
CREATE POLICY "coach deletes own lineups" ON public.coach_lineups FOR DELETE TO authenticated USING (coach_id = auth.uid());

CREATE POLICY "coach inserts own lineup players" ON public.coach_lineup_players FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.coach_lineups l WHERE l.id = lineup_id AND l.coach_id = auth.uid())
              AND public.coach_connected_to(auth.uid(), athlete_id));
CREATE POLICY "coach updates own lineup players" ON public.coach_lineup_players FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.coach_lineups l WHERE l.id = lineup_id AND l.coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.coach_lineups l WHERE l.id = lineup_id AND l.coach_id = auth.uid())
              AND public.coach_connected_to(auth.uid(), athlete_id));
CREATE POLICY "coach deletes own lineup players" ON public.coach_lineup_players FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.coach_lineups l WHERE l.id = lineup_id AND l.coach_id = auth.uid()));

-- Coach "Check-ins & readiness": 28 days of check-in answers, injury lines and load, only when the
-- player shares health (parent rule for minors via resolve_recruiting_scope). Not shared = no data.
CREATE OR REPLACE FUNCTION public.coach_athlete_checkins_28(_athlete uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _me uuid := auth.uid(); _rows jsonb; _logs jsonb; _load jsonb;
BEGIN
  IF _me IS NULL OR NOT (_me = _athlete OR public.is_coach_of(_me, _athlete) OR public.is_linked_coach(_me, _athlete)) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF NOT (_me = _athlete OR public.resolve_recruiting_scope(_athlete, 'health')) THEN
    RETURN jsonb_build_object('shared', false);
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
END $$;
REVOKE ALL ON FUNCTION public.coach_athlete_checkins_28(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_athlete_checkins_28(uuid) TO authenticated;

-- Coach Dashboard "Today's readiness": every connected player; readiness only when shared.
CREATE OR REPLACE FUNCTION public.coach_team_readiness_today()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _me uuid := auth.uid(); _ids uuid[];
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  SELECT array_agg(DISTINCT c) INTO _ids FROM (
    SELECT user_id c FROM athlete_mpi_settings WHERE primary_coach_id = _me OR _me = ANY(coalesce(secondary_coach_ids,'{}'))
    UNION SELECT player_id FROM scout_follows WHERE scout_id = _me AND status='accepted'
    UNION SELECT athlete_user_id FROM org_athlete_assignments WHERE coach_user_id = _me AND revoked_at IS NULL
    UNION SELECT om.user_id FROM organization_members om WHERE om.status='active' AND om.role_in_org='player' AND public.is_org_admin(_me, om.organization_id)
  ) s WHERE c <> _me AND (public.is_coach_of(_me, c) OR public.is_linked_coach(_me, c));
  RETURN COALESCE((
    SELECT jsonb_agg(x ORDER BY x->>'name') FROM (
      SELECT CASE WHEN public.resolve_recruiting_scope(u, 'health') THEN jsonb_build_object(
          'athlete_id', u, 'name', coalesce(p.full_name, 'Player'), 'shared', true,
          'readiness', (SELECT q.physical_readiness FROM vault_focus_quizzes q WHERE q.user_id = u AND q.entry_date = current_date AND q.physical_readiness IS NOT NULL ORDER BY q.created_at DESC LIMIT 1),
          'checked_in', EXISTS (SELECT 1 FROM vault_focus_quizzes q WHERE q.user_id = u AND q.entry_date = current_date))
        ELSE jsonb_build_object('athlete_id', u, 'name', coalesce(p.full_name, 'Player'), 'shared', false) END x
      FROM unnest(coalesce(_ids, '{}')) u JOIN profiles p ON p.id = u
      WHERE coalesce(p.is_system_account, false) = false AND p.suspended_at IS NULL AND p.account_paused_at IS NULL
    ) t), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.coach_team_readiness_today() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_team_readiness_today() TO authenticated;
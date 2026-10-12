-- Plan 4 C team and organization summary: per connected player, work done vs set (7 / 28 days),
-- missed days (28) and logging consistency (28). _org NULL = the coach's own connected players;
-- _org set = that organization's players (org admins only).
CREATE OR REPLACE FUNCTION public.team_discipline_summary(_org uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _ids uuid[];
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  IF _org IS NOT NULL THEN
    IF NOT public.is_org_admin(_me, _org) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
    SELECT array_agg(DISTINCT user_id) INTO _ids FROM organization_members
      WHERE organization_id = _org AND status='active' AND role_in_org='player' AND removed_at IS NULL;
  ELSE
    SELECT array_agg(DISTINCT c) INTO _ids FROM (
      SELECT user_id c FROM athlete_mpi_settings WHERE primary_coach_id = _me OR _me = ANY(coalesce(secondary_coach_ids,'{}'))
      UNION SELECT player_id FROM scout_follows WHERE scout_id = _me AND status='accepted'
      UNION SELECT athlete_user_id FROM org_athlete_assignments WHERE coach_user_id = _me AND revoked_at IS NULL
    ) s WHERE public.is_coach_of(_me, c) OR public.is_linked_coach(_me, c);
  END IF;
  RETURN coalesce((
    WITH rx AS (
      SELECT p.user_id, p.plan_date, EXISTS (SELECT 1 FROM wk_session_logs l WHERE l.prescription_id = p.id) done
      FROM wk_prescriptions p
      WHERE p.user_id = ANY(coalesce(_ids,'{}')) AND p.plan_date BETWEEN current_date - 28 AND current_date - 1
    ), d AS (
      SELECT user_id, plan_date, count(*) n, count(*) FILTER (WHERE done) k FROM rx GROUP BY 1,2
    )
    SELECT jsonb_agg(jsonb_build_object(
      'athlete_id', u, 'name', coalesce(pr.full_name,'Player'),
      'set_7', (SELECT sum(n) FROM d WHERE user_id=u AND plan_date >= current_date-7),
      'done_7', (SELECT sum(k) FROM d WHERE user_id=u AND plan_date >= current_date-7),
      'set_28', (SELECT sum(n) FROM d WHERE user_id=u), 'done_28', (SELECT sum(k) FROM d WHERE user_id=u),
      'days_set_28', (SELECT count(*) FROM d WHERE user_id=u),
      'days_logged_28', (SELECT count(*) FROM d WHERE user_id=u AND k>0),
      'missed_28', (SELECT count(*) FROM d WHERE user_id=u AND k=0)) ORDER BY pr.full_name)
    FROM unnest(coalesce(_ids,'{}')) u LEFT JOIN profiles pr ON pr.id = u
  ), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.team_discipline_summary(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.team_discipline_summary(uuid) TO authenticated;
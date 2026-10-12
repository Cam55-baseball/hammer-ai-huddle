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
      'checkins_7d', (SELECT count(DISTINCT q.entry_date) FROM vault_focus_quizzes q WHERE q.user_id=m.user_id AND q.entry_date BETWEEN today-6 AND today),
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
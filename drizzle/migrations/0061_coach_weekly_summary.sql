CREATE OR REPLACE FUNCTION public.coach_weekly_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _me uuid := auth.uid(); _ids uuid[];
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  SELECT array_agg(DISTINCT c) INTO _ids FROM (
    SELECT user_id c FROM athlete_mpi_settings WHERE primary_coach_id = _me OR _me = ANY(coalesce(secondary_coach_ids,'{}'))
    UNION SELECT player_id FROM scout_follows WHERE scout_id = _me AND status='accepted'
    UNION SELECT athlete_user_id FROM org_athlete_assignments WHERE coach_user_id = _me AND revoked_at IS NULL
    UNION SELECT om.user_id FROM organization_members om WHERE om.status='active' AND om.role_in_org='player' AND public.is_org_admin(_me, om.organization_id)
  ) s WHERE public.is_coach_of(_me, c) OR public.is_linked_coach(_me, c);
  _ids := coalesce(_ids, '{}');
  RETURN jsonb_build_object(
    'players', cardinality(_ids),
    'from', current_date - 7, 'to', current_date - 1,
    'this_week', (SELECT jsonb_build_object('set', count(*), 'done', count(*) FILTER (WHERE EXISTS (SELECT 1 FROM wk_session_logs l WHERE l.prescription_id = p.id)))
       FROM wk_prescriptions p WHERE p.user_id = ANY(_ids) AND p.plan_date BETWEEN current_date - 7 AND current_date - 1),
    'last_week', (SELECT jsonb_build_object('set', count(*), 'done', count(*) FILTER (WHERE EXISTS (SELECT 1 FROM wk_session_logs l WHERE l.prescription_id = p.id)))
       FROM wk_prescriptions p WHERE p.user_id = ANY(_ids) AND p.plan_date BETWEEN current_date - 14 AND current_date - 8),
    'issues', coalesce((SELECT jsonb_agg(x ORDER BY (x->>'players')::int DESC, (x->>'times')::int DESC) FROM (
       SELECT jsonb_build_object('fault_key', f.fault_key, 'correction_key', max(f.correction_key), 'skill', max(f.skill_domain),
         'players', count(DISTINCT f.user_id), 'times', count(*)) x
       FROM analysis_fault_findings f WHERE f.user_id = ANY(_ids) AND f.created_at >= now() - interval '7 days'
       GROUP BY f.fault_key ORDER BY count(DISTINCT f.user_id) DESC, count(*) DESC LIMIT 5) t), '[]'::jsonb)
  );
END $$;
REVOKE ALL ON FUNCTION public.coach_weekly_summary() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.coach_weekly_summary() TO authenticated;
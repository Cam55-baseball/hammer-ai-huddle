CREATE OR REPLACE FUNCTION public.coach_athlete_glance(_athlete uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; today date := (now() at time zone 'utc')::date;
BEGIN
  IF auth.uid() IS NULL OR NOT (auth.uid() = _athlete OR public.is_coach_of(auth.uid(), _athlete) OR public.is_linked_coach(auth.uid(), _athlete)) THEN
    RAISE EXCEPTION 'not_allowed' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'today_planned', (SELECT count(*) FROM wk_prescriptions WHERE user_id=_athlete AND plan_date=today),
    'today_done', (SELECT count(*) FROM wk_prescriptions WHERE user_id=_athlete AND plan_date=today AND status='completed'),
    'week_planned', (SELECT count(*) FROM wk_prescriptions WHERE user_id=_athlete AND plan_date BETWEEN today-6 AND today),
    'week_done', (SELECT count(*) FROM wk_prescriptions WHERE user_id=_athlete AND plan_date BETWEEN today-6 AND today AND status='completed'),
    'top_alert', (SELECT jsonb_build_object('metric_key',metric_key,'direction',direction,'kind',kind,'at',created_at) FROM athlete_baseline_alerts WHERE user_id=_athlete AND dismissed_at IS NULL ORDER BY created_at DESC LIMIT 1),
    'latest_test', (SELECT jsonb_build_object('test_type',test_type,'test_date',test_date,'next_entry_date',next_entry_date) FROM vault_performance_tests WHERE user_id=_athlete ORDER BY test_date DESC, created_at DESC LIMIT 1),
    'head_coach', (SELECT jsonb_build_object('coach_id',h.coach_user_id,'name',p.full_name) FROM athlete_head_coach h LEFT JOIN profiles p ON p.id=h.coach_user_id WHERE h.athlete_user_id=_athlete LIMIT 1)
  ) INTO r;
  RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.coach_athlete_glance(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.coach_athlete_glance(uuid) TO authenticated;
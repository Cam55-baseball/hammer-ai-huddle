CREATE OR REPLACE FUNCTION public.bullpen_before_start_followups(_athlete uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _health boolean;
BEGIN
  IF NOT public._coach_training_access(_athlete) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  _health := auth.uid() = _athlete OR public.resolve_recruiting_scope(_athlete, 'health');
  RETURN jsonb_build_object(
    'health_shared', _health,
    'tracked', coalesce((SELECT jsonb_agg(public._start_followup(_athlete, e.start_date, _health) || jsonb_build_object('bullpen_date', e.bullpen_date) ORDER BY e.start_date DESC)
      FROM public.pitching_tracked_events e WHERE e.user_id=_athlete AND e.event_type='bullpen_before_start'), '[]'::jsonb),
    'other_starts', coalesce((SELECT jsonb_agg(public._start_followup(_athlete, o.actual_date, _health) ORDER BY o.actual_date DESC)
      FROM (SELECT DISTINCT o.actual_date FROM public.pitcher_outings o WHERE o.user_id=_athlete AND o.outing_type='start' AND o.status='thrown'
              AND o.actual_date <= current_date
              AND NOT EXISTS (SELECT 1 FROM public.pitching_tracked_events e WHERE e.user_id=_athlete AND e.start_date=o.actual_date)) o), '[]'::jsonb)
  );
END $$;
REVOKE ALL ON FUNCTION public.bullpen_before_start_followups(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bullpen_before_start_followups(uuid) TO authenticated;
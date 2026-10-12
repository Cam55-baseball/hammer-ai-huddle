CREATE OR REPLACE FUNCTION public.coach_athlete_readiness(_athlete uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _rows jsonb; _self boolean := (auth.uid() = _athlete);
BEGIN
  IF NOT (_self OR public.is_coach_of(auth.uid(), _athlete) OR public.is_linked_coach(auth.uid(), _athlete)) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  -- Health data reaches a coach only when the player (and a parent, for minors) shared Health.
  IF NOT _self AND NOT public.resolve_recruiting_scope(_athlete, 'health') THEN
    RETURN jsonb_build_object('shared', false, 'checkins', '[]'::jsonb);
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'entry_date', q.entry_date, 'quiz_type', q.quiz_type,
      'physical_readiness', q.physical_readiness, 'perceived_recovery', q.perceived_recovery,
      'hours_slept', q.hours_slept, 'pain_location', q.pain_location, 'pain_scale', q.pain_scale,
      'soreness_locations', q.soreness_locations)
      ORDER BY q.entry_date DESC, q.created_at DESC), '[]'::jsonb)
  INTO _rows
  FROM public.vault_focus_quizzes q
  WHERE q.user_id = _athlete AND q.entry_date >= current_date - 6;
  RETURN jsonb_build_object('shared', true, 'checkins', _rows);
END;
$$;
REVOKE ALL ON FUNCTION public.coach_athlete_readiness(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.coach_athlete_readiness(uuid) TO authenticated;
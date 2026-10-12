CREATE OR REPLACE FUNCTION public.coach_athlete_readiness(_athlete uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _rows jsonb; _done jsonb; _self boolean := (auth.uid() = _athlete); _shared boolean;
BEGIN
  IF NOT (_self OR public.is_coach_of(auth.uid(), _athlete) OR public.is_linked_coach(auth.uid(), _athlete)) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  -- Attendance (which check-ins were done, and when) is always visible to connected staff.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('entry_date', q.entry_date, 'quiz_type', q.quiz_type, 'completed_at', q.created_at)
         ORDER BY q.entry_date DESC, q.created_at DESC), '[]'::jsonb)
  INTO _done FROM public.vault_focus_quizzes q
  WHERE q.user_id = _athlete AND q.entry_date >= current_date - 27;
  -- Contents are health data: only with health sharing ON (parent too, for minors).
  _shared := _self OR public.resolve_recruiting_scope(_athlete, 'health');
  IF NOT _shared THEN
    RETURN jsonb_build_object('shared', false, 'checkins', '[]'::jsonb, 'completed', _done);
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'entry_date', q.entry_date, 'quiz_type', q.quiz_type,
      'physical_readiness', q.physical_readiness, 'perceived_recovery', q.perceived_recovery,
      'hours_slept', q.hours_slept, 'sleep_quality', q.sleep_quality, 'mental_energy', q.mental_energy,
      'mood_level', q.mood_level, 'stress_level', q.stress_level,
      'pain_location', q.pain_location, 'pain_scale', q.pain_scale,
      'soreness_locations', q.soreness_locations,
      'note', NULLIF(concat_ws(' · ', q.reflection_did_well, q.reflection_improve), ''))
      ORDER BY q.entry_date DESC, q.created_at DESC), '[]'::jsonb)
  INTO _rows FROM public.vault_focus_quizzes q
  WHERE q.user_id = _athlete AND q.entry_date >= current_date - 6;
  RETURN jsonb_build_object('shared', true, 'checkins', _rows, 'completed', _done);
END;
$function$;
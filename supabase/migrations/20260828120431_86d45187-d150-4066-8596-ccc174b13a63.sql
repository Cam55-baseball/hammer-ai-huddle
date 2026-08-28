CREATE OR REPLACE FUNCTION public.dispatch_standard_match_pings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_org_sent int := 0;
  v_athlete_sent int := 0;
  r record;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  FOR r IN
    SELECT m.id,
           m.athlete_user_id,
           m.matched_at,
           m.notified_org,
           m.notified_athlete,
           s.id   AS standard_id,
           s.label,
           s.org_name,
           s.sport,
           s.org_user_id,
           COALESCE(p.full_name, 'An athlete') AS athlete_name
      FROM public.standard_matches m
      JOIN public.org_standards s ON s.id = m.standard_id
      LEFT JOIN public.profiles p ON p.id = m.athlete_user_id
     WHERE s.org_user_id = v_caller
       AND s.active = true
       AND (m.notified_org = false OR m.notified_athlete = false)
     ORDER BY m.matched_at ASC
     FOR UPDATE OF m
  LOOP
    IF r.notified_org = false THEN
      INSERT INTO public.coach_notifications
        (coach_user_id, sender_user_id, notification_type, title, message, template_snapshot)
      VALUES (
        r.org_user_id,
        v_caller,
        'standard_match_org',
        r.athlete_name || ' meets "' || r.label || '"',
        r.athlete_name || ' met every criterion of your ' || r.sport || ' standard "' || r.label
          || '" on ' || to_char(r.matched_at AT TIME ZONE 'UTC', 'Mon DD, YYYY')
          || '. Match evaluated on camera-measured and coach-evaluated results only.',
        jsonb_build_object(
          'kind', 'standard_match_org',
          'standard_id', r.standard_id,
          'standard_label', r.label,
          'org_name', r.org_name,
          'sport', r.sport,
          'athlete_user_id', r.athlete_user_id,
          'athlete_name', r.athlete_name,
          'matched_at', r.matched_at
        )
      );
      v_org_sent := v_org_sent + 1;
    END IF;

    IF r.notified_athlete = false THEN
      INSERT INTO public.coach_notifications
        (coach_user_id, sender_user_id, notification_type, title, message, template_snapshot)
      VALUES (
        r.athlete_user_id,
        v_caller,
        'standard_match_athlete',
        'You meet ' || r.org_name || '''s "' || r.label || '" standard',
        'On ' || to_char(r.matched_at AT TIME ZONE 'UTC', 'Mon DD, YYYY') || ', your verified results met every criterion of '
          || r.org_name || '''s ' || r.sport || ' standard "' || r.label
          || '". Only camera-measured and coach-evaluated results count toward this — self-reported numbers are never used.',
        jsonb_build_object(
          'kind', 'standard_match_athlete',
          'standard_id', r.standard_id,
          'standard_label', r.label,
          'org_name', r.org_name,
          'sport', r.sport,
          'matched_at', r.matched_at
        )
      );
      v_athlete_sent := v_athlete_sent + 1;
    END IF;

    UPDATE public.standard_matches
       SET notified_org = true,
           notified_athlete = true
     WHERE id = r.id;
  END LOOP;

  RETURN jsonb_build_object('org_pings', v_org_sent, 'athlete_pings', v_athlete_sent);
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_standard_match_pings() FROM public;
GRANT EXECUTE ON FUNCTION public.dispatch_standard_match_pings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_standard_match_pings() TO service_role;
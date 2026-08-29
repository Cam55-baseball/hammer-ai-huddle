ALTER TABLE public.vault_scout_grades
  ADD COLUMN IF NOT EXISTS player_rejected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS player_rejected_at timestamptz;

COMMENT ON COLUMN public.vault_scout_grades.player_rejected IS
  'Athlete stated they were NOT present at this event. Terminal state: player_confirmed stays false forever, so existing RLS keeps the report author-only.';

-- Reject: mirror of confirm_evaluation_attendance. Never sets player_confirmed,
-- so the "player_confirmed = true" clause in every reader policy keeps this
-- report invisible to the athlete and to their followers, permanently.
CREATE OR REPLACE FUNCTION public.reject_evaluation_attendance(p_evaluation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_rows int;
BEGIN
  UPDATE public.vault_scout_grades
  SET player_rejected = true,
      player_rejected_at = now()
  WHERE id = p_evaluation_id
    AND user_id = auth.uid()
    AND grade_source = 'coach_evaluated'
    AND player_confirmed = false
    AND player_rejected = false;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.reject_evaluation_attendance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_evaluation_attendance(uuid) TO authenticated;

-- A rejected report is closed out: drop it from the athlete's pending prompts.
CREATE OR REPLACE FUNCTION public.get_pending_evaluations()
RETURNS TABLE(id uuid, graded_at timestamp with time zone, evaluation_context text, event_description text, grade_type text, evaluator_id uuid, evaluator_name text, evaluator_role text, evaluator_organization text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT g.id,
         g.graded_at,
         g.evaluation_context,
         g.event_description,
         g.grade_type,
         g.evaluator_id,
         COALESCE(p.full_name, 'Unnamed evaluator'),
         (SELECT ur.role::text FROM public.user_roles ur
           WHERE ur.user_id = g.evaluator_id
             AND ur.role::text IN ('scout','coach')
             AND ur.status = 'active'
           ORDER BY ur.created_at LIMIT 1),
         (SELECT o.name FROM public.organization_members om
            JOIN public.organizations o ON o.id = om.organization_id
           WHERE om.user_id = g.evaluator_id AND om.status = 'active'
           ORDER BY om.joined_at LIMIT 1)
  FROM public.vault_scout_grades g
  LEFT JOIN public.profiles p ON p.id = g.evaluator_id
  WHERE g.user_id = auth.uid()
    AND g.grade_source = 'coach_evaluated'
    AND g.player_confirmed = false
    AND g.player_rejected = false
  ORDER BY g.graded_at DESC;
$function$;

-- Match dispatch: attach the athlete's email to the org-side ping only.
CREATE OR REPLACE FUNCTION public.dispatch_standard_match_pings_v2(p_message text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_org_sent int := 0;
  v_athlete_sent int := 0;
  v_payloads jsonb := '[]'::jsonb;
  v_contact record;
  v_org_email text;
  v_athlete_email text;
  v_message text := NULLIF(btrim(COALESCE(p_message, '')), '');
  v_effective_message text;
  r record;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO v_contact FROM public.recruiter_contacts WHERE user_id = v_caller;
  SELECT email INTO v_org_email FROM auth.users WHERE id = v_caller;

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
           s.outreach_message,
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
    v_effective_message := COALESCE(v_message, NULLIF(btrim(COALESCE(r.outreach_message, '')), ''));
    SELECT email INTO v_athlete_email FROM auth.users WHERE id = r.athlete_user_id;

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
          || '. Match evaluated on camera-measured and coach-evaluated results only.'
          || COALESCE(E'\nContact: ' || v_athlete_email, ''),
        jsonb_build_object(
          'kind', 'standard_match_org',
          'standard_id', r.standard_id,
          'standard_label', r.label,
          'org_name', r.org_name,
          'sport', r.sport,
          'athlete_user_id', r.athlete_user_id,
          'athlete_name', r.athlete_name,
          'athlete_email', v_athlete_email,
          'matched_at', r.matched_at
        )
      );
      v_org_sent := v_org_sent + 1;

      v_payloads := v_payloads || jsonb_build_object(
        'side', 'org',
        'to', v_org_email,
        'athlete_user_id', r.athlete_user_id,
        'athlete_name', r.athlete_name,
        'athlete_email', v_athlete_email,
        'org_name', r.org_name,
        'standard_label', r.label,
        'sport', r.sport,
        'matched_at', r.matched_at
      );
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
          || '". Only camera-measured and coach-evaluated results count toward this — self-reported numbers are never used.'
          || COALESCE(E'\n\nMessage from ' || r.org_name || ': ' || v_effective_message, ''),
        jsonb_build_object(
          'kind', 'standard_match_athlete',
          'standard_id', r.standard_id,
          'standard_label', r.label,
          'org_name', r.org_name,
          'sport', r.sport,
          'matched_at', r.matched_at,
          'personal_message', v_effective_message
        )
      );
      v_athlete_sent := v_athlete_sent + 1;

      v_payloads := v_payloads || jsonb_build_object(
        'side', 'athlete',
        'to', v_athlete_email,
        'athlete_name', r.athlete_name,
        'org_name', r.org_name,
        'standard_label', r.label,
        'sport', r.sport,
        'matched_at', r.matched_at,
        'personal_message', v_effective_message,
        'contact_name', v_contact.contact_name,
        'contact_title', v_contact.contact_title,
        'contact_email', COALESCE(v_contact.contact_email, NULL),
        'contact_phone', v_contact.contact_phone
      );
    END IF;

    UPDATE public.standard_matches
       SET notified_org = true,
           notified_athlete = true
     WHERE id = r.id;
  END LOOP;

  RETURN jsonb_build_object(
    'org_pings', v_org_sent,
    'athlete_pings', v_athlete_sent,
    'deliveries', v_payloads
  );
END;
$function$;
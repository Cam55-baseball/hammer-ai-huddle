-- Recruiter contact card (optional, encouraged) --------------------------------
CREATE TABLE IF NOT EXISTS public.recruiter_contacts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_name text,
  contact_email text,
  contact_phone text,
  contact_title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruiter_contacts TO authenticated;
GRANT ALL ON public.recruiter_contacts TO service_role;

ALTER TABLE public.recruiter_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters manage their own contact card"
  ON public.recruiter_contacts FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER recruiter_contacts_touch
  BEFORE UPDATE ON public.recruiter_contacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Per-standard default outreach message ----------------------------------------
ALTER TABLE public.org_standards
  ADD COLUMN IF NOT EXISTS outreach_message text;

-- Email-capable dispatcher ------------------------------------------------------
-- Same one-pass semantics as v1 (flip notified_* and write the in-app
-- notifications atomically), but also returns the delivery payloads so the
-- edge function can send real email. Never returns anything for a match the
-- caller does not own.
CREATE OR REPLACE FUNCTION public.dispatch_standard_match_pings_v2(p_message text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

      v_payloads := v_payloads || jsonb_build_object(
        'side', 'org',
        'to', v_org_email,
        'athlete_user_id', r.athlete_user_id,
        'athlete_name', r.athlete_name,
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
$$;

REVOKE ALL ON FUNCTION public.dispatch_standard_match_pings_v2(text) FROM public;
GRANT EXECUTE ON FUNCTION public.dispatch_standard_match_pings_v2(text) TO authenticated;
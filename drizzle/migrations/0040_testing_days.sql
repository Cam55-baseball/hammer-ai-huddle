CREATE TABLE public.testing_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  athlete_id uuid NOT NULL,
  scheduled_for date NOT NULL,
  tests text[] NOT NULL CHECK (cardinality(tests) BETWEEN 1 AND 12),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','done','skipped')),
  skip_reason text,
  created_by uuid NOT NULL,
  verified_by uuid,
  verified_at timestamptz,
  video_url text,
  result_test_id uuid,
  reminded_3d_at timestamptz,
  reminded_day_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.testing_days TO authenticated;
GRANT ALL ON public.testing_days TO service_role;
ALTER TABLE public.testing_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testing days visible to athlete, staff, coaches" ON public.testing_days FOR SELECT TO authenticated
USING (athlete_id = auth.uid() OR public.is_org_staff(auth.uid(), organization_id) OR public.is_coach_of(auth.uid(), athlete_id));
CREATE INDEX testing_days_org_date ON public.testing_days(organization_id, scheduled_for);

-- Coaches to notify: head coach + active assigned org coaches + scheduler
CREATE OR REPLACE FUNCTION public._testing_day_recipients(_td public.testing_days)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT u FROM (
    SELECT coach_user_id u FROM athlete_head_coach WHERE athlete_user_id = _td.athlete_id
    UNION SELECT coach_user_id FROM org_athlete_assignments WHERE organization_id = _td.organization_id AND athlete_user_id = _td.athlete_id AND revoked_at IS NULL
    UNION SELECT _td.created_by
  ) x WHERE u IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public._testing_day_can_manage(_org uuid, _athlete uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND auth.uid() <> _athlete
    AND EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = _org AND m.user_id = _athlete AND m.status = 'active' AND m.role_in_org = 'player')
    AND (public.is_org_staff(auth.uid(), _org)
         OR EXISTS (SELECT 1 FROM org_athlete_assignments a WHERE a.organization_id = _org AND a.athlete_user_id = _athlete AND a.coach_user_id = auth.uid() AND a.revoked_at IS NULL))
$$;

CREATE OR REPLACE FUNCTION public._testing_day_notify(_td public.testing_days, _title text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r uuid; nm text;
BEGIN
  SELECT coalesce(full_name,'A player') INTO nm FROM profiles WHERE id = _td.athlete_id;
  FOR r IN SELECT * FROM public._testing_day_recipients(_td) LOOP
    INSERT INTO coach_notifications(coach_user_id, sender_user_id, notification_type, title, message)
    VALUES (r, coalesce(auth.uid(), _td.created_by), 'testing_day', _title,
      coalesce(nm,'A player') || ' — testing day ' || to_char(_td.scheduled_for,'YYYY-MM-DD') || '. Tests: ' || array_to_string(_td.tests, ', '));
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.schedule_testing_day(_org uuid, _athlete uuid, _date date, _tests text[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE td public.testing_days;
BEGIN
  IF NOT public._testing_day_can_manage(_org, _athlete) THEN RAISE EXCEPTION 'not authorized' USING errcode = '42501'; END IF;
  IF _date < current_date THEN RAISE EXCEPTION 'Pick today or a later date' USING errcode = '22023'; END IF;
  INSERT INTO testing_days(organization_id, athlete_id, scheduled_for, tests, created_by)
  VALUES (_org, _athlete, _date, (SELECT array_agg(left(btrim(t),60)) FROM unnest(_tests) t WHERE btrim(t) <> ''), auth.uid())
  RETURNING * INTO td;
  PERFORM public._testing_day_notify(td, 'Testing day scheduled');
  RETURN td.id;
END $$;

CREATE OR REPLACE FUNCTION public.reschedule_testing_day(_id uuid, _date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE td public.testing_days;
BEGIN
  SELECT * INTO td FROM testing_days WHERE id = _id;
  IF td.id IS NULL OR NOT public._testing_day_can_manage(td.organization_id, td.athlete_id) THEN RAISE EXCEPTION 'not authorized' USING errcode = '42501'; END IF;
  IF td.status <> 'scheduled' THEN RAISE EXCEPTION 'This testing day is already finished' USING errcode = '22023'; END IF;
  IF _date < current_date THEN RAISE EXCEPTION 'Pick today or a later date' USING errcode = '22023'; END IF;
  UPDATE testing_days SET scheduled_for = _date, reminded_3d_at = NULL, reminded_day_at = NULL, updated_at = now() WHERE id = _id RETURNING * INTO td;
  PERFORM public._testing_day_notify(td, 'Testing day moved');
END $$;

CREATE OR REPLACE FUNCTION public.skip_testing_day(_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE td public.testing_days;
BEGIN
  SELECT * INTO td FROM testing_days WHERE id = _id;
  IF td.id IS NULL OR NOT public._testing_day_can_manage(td.organization_id, td.athlete_id) THEN RAISE EXCEPTION 'not authorized' USING errcode = '42501'; END IF;
  IF td.status <> 'scheduled' THEN RAISE EXCEPTION 'This testing day is already finished' USING errcode = '22023'; END IF;
  UPDATE testing_days SET status = 'skipped', skip_reason = left(nullif(btrim(_reason),''),300), updated_at = now() WHERE id = _id RETURNING * INTO td;
  PERFORM public._testing_day_notify(td, 'Testing day skipped');
END $$;

-- Records results; verified in person by the staff member who ran it.
CREATE OR REPLACE FUNCTION public.record_testing_day(_id uuid, _results jsonb, _video_url text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE td public.testing_days; sp text; tid uuid;
BEGIN
  SELECT * INTO td FROM testing_days WHERE id = _id;
  IF td.id IS NULL OR NOT public._testing_day_can_manage(td.organization_id, td.athlete_id) THEN RAISE EXCEPTION 'not authorized' USING errcode = '42501'; END IF;
  IF td.status <> 'scheduled' THEN RAISE EXCEPTION 'This testing day is already finished' USING errcode = '22023'; END IF;
  IF td.scheduled_for > current_date THEN RAISE EXCEPTION 'Results can be entered on or after the testing day' USING errcode = '22023'; END IF;
  IF _results IS NULL OR jsonb_typeof(_results) <> 'object' OR _results = '{}'::jsonb THEN RAISE EXCEPTION 'Enter at least one result' USING errcode = '22023'; END IF;
  IF _video_url IS NOT NULL AND _video_url <> '' AND _video_url !~ '^https://' THEN RAISE EXCEPTION 'Video link must start with https://' USING errcode = '22023'; END IF;
  SELECT coalesce(sport::text,'baseball') INTO sp FROM profiles WHERE id = td.athlete_id;
  INSERT INTO vault_performance_tests(user_id, test_date, test_type, sport, module, results)
  VALUES (td.athlete_id, current_date, 'testing_day', coalesce(sp,'baseball'), 'testing_day',
    _results || jsonb_build_object('_verified','in_person','_verified_by',auth.uid(),'_organization',td.organization_id,'_testing_day',td.id))
  RETURNING id INTO tid;
  UPDATE testing_days SET status = 'done', verified_by = auth.uid(), verified_at = now(), video_url = nullif(_video_url,''), result_test_id = tid, updated_at = now() WHERE id = _id;
  RETURN tid;
END $$;

-- Sends due reminders (3 days ahead, and on the day) for one org; idempotent. Called when staff open the org page.
CREATE OR REPLACE FUNCTION public.send_testing_day_reminders(_org uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE td public.testing_days; n int := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_org_staff(auth.uid(), _org) THEN RAISE EXCEPTION 'not authorized' USING errcode = '42501'; END IF;
  FOR td IN SELECT * FROM testing_days WHERE organization_id = _org AND status = 'scheduled' AND scheduled_for = current_date AND reminded_day_at IS NULL LOOP
    PERFORM public._testing_day_notify(td, 'Testing day is today');
    UPDATE testing_days SET reminded_day_at = now(), reminded_3d_at = coalesce(reminded_3d_at, now()) WHERE id = td.id; n := n + 1;
  END LOOP;
  FOR td IN SELECT * FROM testing_days WHERE organization_id = _org AND status = 'scheduled' AND scheduled_for BETWEEN current_date + 1 AND current_date + 3 AND reminded_3d_at IS NULL LOOP
    PERFORM public._testing_day_notify(td, 'Testing day in ' || (td.scheduled_for - current_date) || ' day' || CASE WHEN td.scheduled_for - current_date = 1 THEN '' ELSE 's' END);
    UPDATE testing_days SET reminded_3d_at = now() WHERE id = td.id; n := n + 1;
  END LOOP;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public._testing_day_recipients(public.testing_days), public._testing_day_can_manage(uuid,uuid), public._testing_day_notify(public.testing_days,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.schedule_testing_day(uuid,uuid,date,text[]), public.reschedule_testing_day(uuid,date), public.skip_testing_day(uuid,text), public.record_testing_day(uuid,jsonb,text), public.send_testing_day_reminders(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.schedule_testing_day(uuid,uuid,date,text[]), public.reschedule_testing_day(uuid,date), public.skip_testing_day(uuid,text), public.record_testing_day(uuid,jsonb,text), public.send_testing_day_reminders(uuid) TO authenticated, service_role;
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
  sp := coalesce(
    (SELECT v.sport::text FROM videos v WHERE v.user_id = td.athlete_id ORDER BY v.created_at DESC LIMIT 1),
    (SELECT t.sport FROM vault_performance_tests t WHERE t.user_id = td.athlete_id ORDER BY t.created_at DESC LIMIT 1),
    'unknown');
  INSERT INTO vault_performance_tests(user_id, test_date, test_type, sport, module, results)
  VALUES (td.athlete_id, current_date, 'testing_day', sp, 'testing_day',
    _results || jsonb_build_object('_verified','in_person','_verified_by',auth.uid(),'_organization',td.organization_id,'_testing_day',td.id))
  RETURNING id INTO tid;
  UPDATE testing_days SET status = 'done', verified_by = auth.uid(), verified_at = now(), video_url = nullif(_video_url,''), result_test_id = tid, updated_at = now() WHERE id = _id;
  RETURN tid;
END $$;
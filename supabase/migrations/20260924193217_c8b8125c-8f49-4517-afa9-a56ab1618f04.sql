CREATE OR REPLACE FUNCTION public.tell_hammers_save(
  p_tag text, p_start date, p_end date, p_dates date[], p_source text, p_payload jsonb, p_summary text, p_linked_ref text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.schedule_timeline_entries;
  v_merged boolean := false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_uid::text || ':' || p_tag || ':' || p_source));
  -- v1.2 §A: one pain record per body part. PAIN merges on the same body part
  -- regardless of which screen reported it; other tags keep the v1 rule.
  SELECT * INTO v_row FROM public.schedule_timeline_entries
   WHERE user_id = v_uid AND tag = p_tag AND undone_at IS NULL
     AND start_date <= p_end AND end_date >= p_start
     AND (
       (p_tag = 'PAIN' AND coalesce(payload->>'region','') = coalesce(p_payload->>'region',''))
       OR (p_tag <> 'PAIN' AND source = p_source)
     )
   ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    UPDATE public.schedule_timeline_entries SET
      start_date = LEAST(start_date, p_start),
      end_date = GREATEST(end_date, p_end),
      dates = CASE WHEN dates IS NULL AND p_dates IS NULL THEN NULL
                   ELSE (SELECT array_agg(DISTINCT d ORDER BY d) FROM unnest(coalesce(dates,'{}'::date[]) || coalesce(p_dates,'{}'::date[])) d) END,
      payload = payload || coalesce(p_payload,'{}'::jsonb),
      summary = p_summary,
      linked_ref = coalesce(linked_ref, p_linked_ref),
      updated_at = now(),
      created_at = now()
    WHERE id = v_row.id RETURNING * INTO v_row;
    v_merged := true;
  ELSE
    INSERT INTO public.schedule_timeline_entries (user_id, tag, start_date, end_date, dates, source, payload, summary, linked_ref)
    VALUES (v_uid, p_tag, p_start, p_end, p_dates, p_source, coalesce(p_payload,'{}'::jsonb), p_summary, p_linked_ref)
    RETURNING * INTO v_row;
  END IF;
  RETURN jsonb_build_object('merged', v_merged, 'entry', to_jsonb(v_row));
END $$;
GRANT EXECUTE ON FUNCTION public.tell_hammers_save(text, date, date, date[], text, jsonb, text, text) TO authenticated;